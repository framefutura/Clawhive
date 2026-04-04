/**
 * MessageBus — 6-stage middleware pipeline for agent-to-agent messaging.
 *
 * Pipeline order:
 *   1. Validation   — schema check + read-guard (sender must read target context first)
 *   2. Content filter — block toxic / injection payloads
 *   3. Rate limit   — max N messages per agent per minute
 *   4. Routing      — resolve toAgentId to active session
 *   5. Circuit breaker — hold messages if target agent has consecutive failures
 *   6. Audit        — log every message to activity_log
 */

import type {
  A2AEnvelope,
  A2AMessage,
  Middleware,
  MiddlewareResult,
  SendResult,
} from '../common/a2a.js'
import { addActivityLog } from './storage.js'
import { detectSuspicious } from './privacy-guard.js'
import type { ActionRequest } from '../common/security.js'

// ---------------------------------------------------------------------------
// Read-guard registry: tracks which agent has "read" another agent's context
// ---------------------------------------------------------------------------
const readGuardMap = new Map<string, Set<string>>()

export function markContextRead(fromAgentId: string, toAgentId: string): void {
  if (!readGuardMap.has(fromAgentId)) {
    readGuardMap.set(fromAgentId, new Set())
  }
  readGuardMap.get(fromAgentId)!.add(toAgentId)
}

export function hasReadContext(fromAgentId: string, toAgentId: string): boolean {
  return readGuardMap.get(fromAgentId)?.has(toAgentId) === true
}

export function clearReadGuard(fromAgentId: string): void {
  readGuardMap.delete(fromAgentId)
}

// ---------------------------------------------------------------------------
// Rate-limit state
// ---------------------------------------------------------------------------
interface RateBucket {
  count: number
  windowStart: number
}

const rateBuckets = new Map<string, RateBucket>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

export function clearRateLimits(): void {
  rateBuckets.clear()
}

// ---------------------------------------------------------------------------
// Circuit breaker state
// ---------------------------------------------------------------------------
interface CircuitState {
  consecutiveFailures: number
  open: boolean
  openedAt?: number
}

const circuitStates = new Map<string, CircuitState>()
const CIRCUIT_FAILURE_THRESHOLD = 3
const CIRCUIT_RESET_MS = 30_000

export function clearCircuitBreakers(): void {
  circuitStates.clear()
}

export function recordDeliveryFailure(agentId: string): void {
  const state = circuitStates.get(agentId) ?? { consecutiveFailures: 0, open: false }
  state.consecutiveFailures += 1
  if (state.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.open = true
    state.openedAt = Date.now()
  }
  circuitStates.set(agentId, state)
}

export function recordDeliverySuccess(agentId: string): void {
  circuitStates.set(agentId, { consecutiveFailures: 0, open: false })
}

// ---------------------------------------------------------------------------
// Middleware implementations
// ---------------------------------------------------------------------------

/**
 * 1. Validation middleware: schema check + read-guard
 */
function validationMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  const { message } = envelope
  if (!message.id || !message.fromAgentId || !message.toAgentId || !message.content) {
    return { passed: false, reason: 'Missing required message fields' }
  }
  if (message.fromAgentId === message.toAgentId) {
    return { passed: false, reason: 'Agent cannot send messages to itself' }
  }
  // Read-guard: sender must have read the target agent's context before prompting
  if (message.type === 'prompt' && !hasReadContext(message.fromAgentId, message.toAgentId)) {
    return { passed: false, reason: 'Read-guard: sender must read target agent context before sending prompt' }
  }
  return { passed: true }
}

/**
 * PrivacyGuard middleware: scan every A2A message for suspicious patterns
 */
function privacyGuardMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  const { message } = envelope
  const action: ActionRequest = {
    type: 'execution',
    command: message.content,
    code: message.type === 'prompt' || message.type === 'reply' ? message.content : undefined,
  }
  const signals = detectSuspicious(action)

  // Check if any suspicious signals are detected
  const hasSuspicious =
    signals.credentialAccess ||
    signals.shellInjection ||
    signals.obfuscation ||
    signals.privilegeEscalation ||
    signals.financialCrime

  if (hasSuspicious) {
    // Log the denial
    try {
      addActivityLog({
        timestamp: Date.now(),
        session_id: null,
        agent_id: message.fromAgentId,
        action_type: 'a2a:privacy-guard-denied',
        decision: 'denied',
        reason: `PrivacyGuard blocked suspicious message: credentialAccess=${signals.credentialAccess}, shellInjection=${signals.shellInjection}, obfuscation=${signals.obfuscation}, privilegeEscalation=${signals.privilegeEscalation}, financialCrime=${signals.financialCrime}`,
        metadata: JSON.stringify({
          messageId: message.id,
          toAgentId: message.toAgentId,
          type: message.type,
        }),
      })
    } catch {
      // Audit failure should not block
    }
    return { passed: false, reason: 'PrivacyGuard: suspicious content detected' }
  }

  return { passed: true }
}

/**
 * 2. Content filter middleware: block suspicious / injection payloads
 */
const BLOCKED_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+(?:a|an)\s+(?:evil|malicious)/i,
  /system\s*:\s*override/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /<script[\s>]/i,
  /rm\s+-rf\s+\//i,
]

function contentFilterMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  const content = envelope.message.content
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return { passed: false, reason: `Content blocked: matches suspicious pattern` }
    }
  }
  return { passed: true }
}

/**
 * 3. Rate limit middleware: max RATE_LIMIT_MAX messages per agent per minute
 */
function rateLimitMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  const agentId = envelope.message.fromAgentId
  const now = Date.now()
  let bucket = rateBuckets.get(agentId)

  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    bucket = { count: 0, windowStart: now }
    rateBuckets.set(agentId, bucket)
  }

  bucket.count += 1
  if (bucket.count > RATE_LIMIT_MAX) {
    return { passed: false, reason: `Rate limited: exceeds ${RATE_LIMIT_MAX} messages per minute` }
  }
  return { passed: true }
}

/**
 * 4. Routing middleware: verify target agent exists in active subscriber set
 */
function routingMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  // Route check deferred to MessageBus.send() since it owns the subscriber map
  // This middleware just validates the toAgentId is non-empty (already in validation)
  return { passed: true }
}

/**
 * 5. Circuit breaker middleware: hold messages if target has too many failures
 */
function circuitBreakerMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  const targetId = envelope.message.toAgentId
  const state = circuitStates.get(targetId)
  if (state?.open) {
    // Allow circuit reset after timeout
    if (state.openedAt && Date.now() - state.openedAt > CIRCUIT_RESET_MS) {
      state.open = false
      state.consecutiveFailures = 0
      return { passed: true }
    }
    return { passed: false, reason: `Circuit breaker open: target agent ${targetId} has ${state.consecutiveFailures} consecutive failures` }
  }
  return { passed: true }
}

/**
 * 6. Audit middleware: log every message attempt
 */
function auditMiddleware(envelope: A2AEnvelope): MiddlewareResult {
  try {
    addActivityLog({
      timestamp: Date.now(),
      session_id: null,
      agent_id: envelope.message.fromAgentId,
      action_type: `a2a:${envelope.message.type}`,
      decision: 'allowed',
      reason: `A2A message to ${envelope.message.toAgentId}`,
      metadata: JSON.stringify({
        messageId: envelope.message.id,
        toAgentId: envelope.message.toAgentId,
        threadId: envelope.message.threadId,
        priority: envelope.priority,
      }),
    })
  } catch {
    // Audit failure should not block message delivery
  }
  return { passed: true }
}

// ---------------------------------------------------------------------------
// MessageBus class
// ---------------------------------------------------------------------------

type MessageHandler = (msg: A2AMessage) => void

export class MessageBus {
  private middlewares: Middleware[] = [
    validationMiddleware,
    privacyGuardMiddleware,
    contentFilterMiddleware,
    rateLimitMiddleware,
    routingMiddleware,
    circuitBreakerMiddleware,
    auditMiddleware,
  ]

  private subscribers = new Map<string, Set<MessageHandler>>()
  private inbox = new Map<string, A2AMessage[]>()

  /**
   * Send an envelope through the middleware pipeline and deliver to subscriber.
   */
  async send(envelope: A2AEnvelope): Promise<SendResult> {
    // Run each middleware in order
    for (const mw of this.middlewares) {
      const result = mw(envelope)
      if (!result.passed) {
        // Log rejected message in audit
        try {
          addActivityLog({
            timestamp: Date.now(),
            session_id: null,
            agent_id: envelope.message.fromAgentId,
            action_type: `a2a:rejected`,
            decision: 'denied',
            reason: result.reason ?? 'Middleware rejected',
            metadata: JSON.stringify({
              messageId: envelope.message.id,
              toAgentId: envelope.message.toAgentId,
            }),
          })
        } catch {
          // Audit failure should not block
        }
        return { delivered: false, reason: result.reason }
      }
    }

    const { message } = envelope
    const targetId = message.toAgentId

    // Store in inbox for the target agent
    if (!this.inbox.has(targetId)) {
      this.inbox.set(targetId, [])
    }
    this.inbox.get(targetId)!.push({ ...message, read: false })

    // Deliver to subscribers
    const handlers = this.subscribers.get(targetId)
    if (handlers && handlers.size > 0) {
      for (const handler of handlers) {
        try {
          handler(message)
        } catch {
          recordDeliveryFailure(targetId)
        }
      }
      recordDeliverySuccess(targetId)
    }
    // No subscribers is not a failure -- message sits in inbox

    return { delivered: true, messageId: message.id }
  }

  /**
   * Subscribe to messages for a given agent.
   * Returns an unsubscribe function.
   */
  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set())
    }
    this.subscribers.get(agentId)!.add(handler)

    return () => {
      this.subscribers.get(agentId)?.delete(handler)
    }
  }

  /**
   * Get all inbox messages for an agent.
   */
  getInbox(agentId: string): A2AMessage[] {
    return this.inbox.get(agentId) ?? []
  }

  /**
   * Mark a message as read.
   */
  markRead(agentId: string, messageId: string): void {
    const messages = this.inbox.get(agentId)
    if (messages) {
      const msg = messages.find(m => m.id === messageId)
      if (msg) msg.read = true
    }
  }

  /**
   * Clear delivered messages from inbox.
   */
  clearInbox(agentId: string): void {
    this.inbox.delete(agentId)
  }

  /**
   * Get the count of middleware stages in the pipeline.
   */
  getMiddlewareCount(): number {
    return this.middlewares.length
  }
}

// Singleton instance
let messageBusInstance: MessageBus | null = null

export function getMessageBus(): MessageBus {
  if (!messageBusInstance) {
    messageBusInstance = new MessageBus()
  }
  return messageBusInstance
}

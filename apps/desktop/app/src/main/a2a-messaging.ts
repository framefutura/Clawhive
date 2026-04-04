/**
 * A2AMessaging — High-level agent-to-agent prompt delegation.
 *
 * Wraps the MessageBus to provide:
 * - sendPrompt / replyTo for structured A2A conversations
 * - Read-guard enforcement (must readContext before sendPrompt)
 * - Inbox management (getInbox, markRead)
 * - Integration points for heartbeat scheduler and active session injection
 */

import type { A2AMessage, A2AEnvelope, EscalationMeta } from '../common/a2a.js'
import {
  MessageBus,
  getMessageBus,
  markContextRead,
  hasReadContext,
} from './message-bus.js'
import { getPrivacyGuard, evaluateSuspiciousSignals, type SuspiciousSignals } from './privacy-guard.js'
import type { ActionRequest } from '../common/security.js'

/**
 * Context snapshot for an agent -- what another agent "reads" before sending a prompt.
 * In the MVP this is a summary string; future versions may include vector embeddings.
 */
export interface AgentContextSnapshot {
  agentId: string
  summary: string
  status: string
  lastActiveAt?: number
  retrievedAt: number
}

// In-memory store of the latest context snapshot per agent
const contextSnapshots = new Map<string, AgentContextSnapshot>()

/**
 * Store a context snapshot for an agent (called when agent state changes).
 */
export function updateAgentContextSnapshot(
  agentId: string,
  summary: string,
  status: string,
  lastActiveAt?: number
): void {
  contextSnapshots.set(agentId, {
    agentId,
    summary,
    status,
    lastActiveAt,
    retrievedAt: Date.now(),
  })
}

// In-memory map of original message ids to their sender agent ids (for reply routing)
const replyRoutingTable = new Map<string, string>()

// Pending prompts for idle agents -- can be picked up by heartbeat scheduler
const pendingTasks = new Map<string, A2AMessage[]>()

// Active agent session set -- agents currently in an active chat session
const activeAgents = new Set<string>()

// Leader chain resolver function (injected from agent-registry)
type LeaderResolver = (agentId: string) => string | undefined
let leaderResolver: LeaderResolver | null = null

// CEO fallback configuration: 'secretary' or 'user'
let ceoFallbackTarget: 'secretary' | 'user' = 'secretary'

// Coaching and self-improvement archive
interface CoachingArchiveEntry {
  id: string
  fromAgentId: string
  toAgentId: string
  content: string
  type: 'coaching' | 'self-improvement'
  timestamp: number
  threadId?: string
}
const coachingArchive = new Map<string, CoachingArchiveEntry[]>()

// Escalation tracking
interface EscalationRecord {
  id: string
  originAgentId: string
  currentLeaderId: string
  chain: string[]
  content: string
  status: 'pending' | 'approved' | 'denied' | 'escalated'
  timestamp: number
  resolvedAt?: number
}
const escalationRecords = new Map<string, EscalationRecord>()

/**
 * Set the leader chain resolver function.
 * Called during initialization with agent registry lookup.
 */
export function setLeaderChainResolver(resolver: LeaderResolver): void {
  leaderResolver = resolver
}

/**
 * Set the CEO fallback target for escalations.
 */
export function setCeoFallbackTarget(target: 'secretary' | 'user'): void {
  ceoFallbackTarget = target
}

/**
 * Get the immediate leader for an agent.
 */
function getImmediateLeader(agentId: string): string | undefined {
  return leaderResolver?.(agentId)
}

/**
 * Climb the leader chain to find a handler.
 * Returns the first leader in the chain that can handle the request.
 */
function climbLeaderChain(agentId: string, chain: string[] = []): string | undefined {
  const leader = getImmediateLeader(agentId)
  if (!leader) return undefined
  if (chain.includes(leader)) return undefined // Cycle detection
  return leader
}

/**
 * Archive a coaching or self-improvement message.
 */
function archiveCoachingEntry(entry: CoachingArchiveEntry): void {
  const targetArchive = coachingArchive.get(entry.toAgentId) ?? []
  targetArchive.push(entry)
  coachingArchive.set(entry.toAgentId, targetArchive)
}

/**
 * Get coaching archive for an agent.
 */
export function getCoachingArchive(agentId: string): CoachingArchiveEntry[] {
  return coachingArchive.get(agentId) ?? []
}

/**
 * Get all escalation records.
 */
export function getEscalationRecords(): EscalationRecord[] {
  return Array.from(escalationRecords.values())
}

/**
 * Get pending escalations for a leader.
 */
export function getPendingEscalationsForLeader(leaderId: string): EscalationRecord[] {
  return Array.from(escalationRecords.values()).filter(
    r => r.currentLeaderId === leaderId && r.status === 'pending'
  )
}

/**
 * Reset all A2A state (for testing).
 */
export function resetA2AState(): void {
  contextSnapshots.clear()
  replyRoutingTable.clear()
  pendingTasks.clear()
  activeAgents.clear()
  coachingArchive.clear()
  escalationRecords.clear()
}

export function setAgentActive(agentId: string): void {
  activeAgents.add(agentId)
}

export function setAgentIdle(agentId: string): void {
  activeAgents.delete(agentId)
}

export function isAgentActive(agentId: string): boolean {
  return activeAgents.has(agentId)
}

/**
 * Get pending tasks for an idle agent (consumed by heartbeat scheduler).
 */
export function getPendingTasks(agentId: string): A2AMessage[] {
  return pendingTasks.get(agentId) ?? []
}

/**
 * Remove a pending task after it has been picked up.
 */
export function consumePendingTask(agentId: string, messageId: string): void {
  const tasks = pendingTasks.get(agentId)
  if (tasks) {
    const idx = tasks.findIndex(t => t.id === messageId)
    if (idx !== -1) tasks.splice(idx, 1)
    if (tasks.length === 0) pendingTasks.delete(agentId)
  }
}

export class A2AMessaging {
  constructor(
    private bus: MessageBus = getMessageBus(),
  ) {}

  /**
   * Read the context of a target agent (read-guard requirement).
   * Must be called before sendPrompt to that agent.
   */
  readContext(fromAgentId: string, toAgentId: string): AgentContextSnapshot | null {
    const snapshot = contextSnapshots.get(toAgentId) ?? null
    // Mark that fromAgentId has read toAgentId's context
    markContextRead(fromAgentId, toAgentId)
    return snapshot
  }

  /**
   * Check if sender has already read target's context.
   */
  hasReadContext(fromAgentId: string, toAgentId: string): boolean {
    return hasReadContext(fromAgentId, toAgentId)
  }

  /**
   * Send a prompt from one agent to another.
   * Enforces read-guard: caller should have called readContext first.
   *
   * If target is idle, the prompt becomes a pending task for heartbeat pickup.
   * If target is active, it is delivered immediately via the bus.
   */
  async sendPrompt(
    fromAgentId: string,
    toAgentId: string,
    prompt: string,
    context?: string
  ): Promise<string> {
    const messageId = crypto.randomUUID()
    const message: A2AMessage = {
      id: messageId,
      fromAgentId,
      toAgentId,
      content: prompt,
      type: 'prompt',
      contextSnapshot: context,
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message,
      priority: 1,
    }

    // Track for reply routing
    replyRoutingTable.set(messageId, fromAgentId)

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send prompt: ${result.reason}`)
    }

    // If agent is idle, add to pending tasks for heartbeat pickup
    if (!isAgentActive(toAgentId)) {
      if (!pendingTasks.has(toAgentId)) {
        pendingTasks.set(toAgentId, [])
      }
      pendingTasks.get(toAgentId)!.push(message)
    }

    return messageId
  }

  /**
   * Reply to a previously received message.
   * The reply is routed back to the original sender.
   */
  async replyTo(
    fromAgentId: string,
    messageId: string,
    content: string
  ): Promise<void> {
    const originalSender = replyRoutingTable.get(messageId)
    if (!originalSender) {
      throw new Error(`No reply route found for message ${messageId}`)
    }

    const replyMessage: A2AMessage = {
      id: crypto.randomUUID(),
      fromAgentId,
      toAgentId: originalSender,
      threadId: messageId,
      content,
      type: 'reply',
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message: replyMessage,
      replyTo: messageId,
      priority: 1,
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send reply: ${result.reason}`)
    }
  }

  /**
   * Get all inbox messages for an agent.
   */
  getInbox(agentId: string): A2AMessage[] {
    return this.bus.getInbox(agentId)
  }

  /**
   * Mark a message as read.
   */
  markRead(agentId: string, messageId: string): void {
    this.bus.markRead(agentId, messageId)
  }

  /**
   * Get unread count for an agent.
   */
  getUnreadCount(agentId: string): number {
    return this.bus.getInbox(agentId).filter(m => !m.read).length
  }

  /**
   * Send an approval request to the immediate leader.
   * If the leader doesn't respond, it can escalate up the chain.
   */
  async sendApprovalRequest(
    fromAgentId: string,
    content: string,
    escalation?: EscalationMeta
  ): Promise<string> {
    const leaderId = getImmediateLeader(fromAgentId)

    if (!leaderId) {
      // No leader found - route to CEO fallback
      const fallbackId = ceoFallbackTarget === 'secretary' ? 'secretary' : 'user'
      return this.sendEscalationMessage(fromAgentId, fallbackId, content, 'escalation', escalation)
    }

    return this.sendEscalationMessage(fromAgentId, leaderId, content, 'approval-request', escalation)
  }

  /**
   * Send an approval decision back down the chain.
   */
  async sendApprovalDecision(
    fromAgentId: string,
    originAgentId: string,
    requestId: string,
    approved: boolean,
    reason?: string
  ): Promise<void> {
    const decisionContent = JSON.stringify({ approved, reason, requestId })
    const message: A2AMessage = {
      id: crypto.randomUUID(),
      fromAgentId,
      toAgentId: originAgentId,
      content: decisionContent,
      type: 'approval-decision',
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message,
      priority: 2, // Higher priority for decisions
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send approval decision: ${result.reason}`)
    }

    // Update escalation record if exists
    const record = escalationRecords.get(requestId)
    if (record) {
      record.status = approved ? 'approved' : 'denied'
      record.resolvedAt = Date.now()
    }
  }

  /**
   * Send a guidance request to the parent/immediate leader.
   */
  async sendGuidanceRequest(
    fromAgentId: string,
    content: string
  ): Promise<string> {
    const leaderId = getImmediateLeader(fromAgentId)

    if (!leaderId) {
      throw new Error('No parent/leader found for guidance request')
    }

    // Ensure read-guard is satisfied
    if (!hasReadContext(fromAgentId, leaderId)) {
      this.readContext(fromAgentId, leaderId)
    }

    const messageId = crypto.randomUUID()
    const message: A2AMessage = {
      id: messageId,
      fromAgentId,
      toAgentId: leaderId,
      content,
      type: 'guidance-request',
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message,
      priority: 1,
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send guidance request: ${result.reason}`)
    }

    return messageId
  }

  /**
   * Send a guidance response back to the requesting agent.
   */
  async sendGuidanceResponse(
    fromAgentId: string,
    toAgentId: string,
    requestMessageId: string,
    content: string
  ): Promise<void> {
    const message: A2AMessage = {
      id: crypto.randomUUID(),
      fromAgentId,
      toAgentId,
      threadId: requestMessageId,
      content,
      type: 'guidance-response',
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message,
      replyTo: requestMessageId,
      priority: 1,
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send guidance response: ${result.reason}`)
    }
  }

  /**
   * Send a coaching message from leader to subordinate.
   * These messages are archived for later review.
   */
  async sendCoaching(
    fromAgentId: string,
    toAgentId: string,
    content: string
  ): Promise<string> {
    const messageId = crypto.randomUUID()
    const message: A2AMessage = {
      id: messageId,
      fromAgentId,
      toAgentId,
      content,
      type: 'coaching',
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message,
      priority: 1,
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send coaching message: ${result.reason}`)
    }

    // Archive the coaching message
    archiveCoachingEntry({
      id: messageId,
      fromAgentId,
      toAgentId,
      content,
      type: 'coaching',
      timestamp: Date.now(),
    })

    return messageId
  }

  /**
   * Send a self-improvement message.
   * These messages are archived for leader review.
   */
  async sendSelfImprovement(
    fromAgentId: string,
    toLeaderId: string,
    content: string
  ): Promise<string> {
    const messageId = crypto.randomUUID()
    const message: A2AMessage = {
      id: messageId,
      fromAgentId,
      toAgentId: toLeaderId,
      content,
      type: 'self-improvement',
      timestamp: Date.now(),
    }

    const envelope: A2AEnvelope = {
      message,
      priority: 1,
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send self-improvement message: ${result.reason}`)
    }

    // Archive the self-improvement message for leader review
    archiveCoachingEntry({
      id: messageId,
      fromAgentId,
      toAgentId: toLeaderId,
      content,
      type: 'self-improvement',
      timestamp: Date.now(),
    })

    return messageId
  }

  /**
   * Internal helper to send escalation messages.
   */
  private async sendEscalationMessage(
    fromAgentId: string,
    toAgentId: string,
    content: string,
    type: 'escalation' | 'approval-request',
    escalationMeta?: EscalationMeta
  ): Promise<string> {
    const messageId = crypto.randomUUID()

    // Build escalation chain
    const chain = escalationMeta?.chain ?? []
    if (!chain.includes(fromAgentId)) {
      chain.push(fromAgentId)
    }

    const message: A2AMessage = {
      id: messageId,
      fromAgentId,
      toAgentId,
      content,
      type,
      timestamp: Date.now(),
      escalationChain: chain,
      originAgentId: escalationMeta?.originAgentId ?? fromAgentId,
    }

    const envelope: A2AEnvelope = {
      message,
      priority: 2, // Higher priority for escalations
      escalation: {
        chain,
        originAgentId: escalationMeta?.originAgentId ?? fromAgentId,
        ceoFallback: ceoFallbackTarget,
      },
    }

    const result = await this.bus.send(envelope)
    if (!result.delivered) {
      throw new Error(`Failed to send escalation: ${result.reason}`)
    }

    // Track escalation record
    escalationRecords.set(messageId, {
      id: messageId,
      originAgentId: escalationMeta?.originAgentId ?? fromAgentId,
      currentLeaderId: toAgentId,
      chain,
      content,
      status: 'pending',
      timestamp: Date.now(),
    })

    return messageId
  }

  /**
   * Escalate an existing request to the next superior.
   */
  async escalateToNextSuperior(
    currentLeaderId: string,
    requestId: string
  ): Promise<string | null> {
    const record = escalationRecords.get(requestId)
    if (!record) return null

    const nextLeader = climbLeaderChain(currentLeaderId, record.chain)
    if (!nextLeader) {
      // No more leaders - route to CEO fallback
      const fallbackId = ceoFallbackTarget === 'secretary' ? 'secretary' : 'user'
      record.currentLeaderId = fallbackId
      record.status = 'escalated'

      return this.sendEscalationMessage(
        currentLeaderId,
        fallbackId,
        record.content,
        'escalation',
        {
          chain: record.chain,
          originAgentId: record.originAgentId,
        }
      )
    }

    record.currentLeaderId = nextLeader
    record.status = 'escalated'
    record.chain.push(currentLeaderId)

    return this.sendEscalationMessage(
      currentLeaderId,
      nextLeader,
      record.content,
      'escalation',
      {
        chain: record.chain,
        originAgentId: record.originAgentId,
      }
    )
  }
}

// Singleton
let a2aInstance: A2AMessaging | null = null

export function getA2AMessaging(): A2AMessaging {
  if (!a2aInstance) {
    a2aInstance = new A2AMessaging()
  }
  return a2aInstance
}

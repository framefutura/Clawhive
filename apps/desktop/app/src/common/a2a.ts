/**
 * Agent-to-Agent (A2A) messaging protocol types.
 *
 * Every inter-agent message flows through the MessageBus middleware pipeline:
 * validation -> content filter -> rate limit -> routing -> circuit breaker -> audit
 */

export type A2AMessageType =
  | 'prompt'
  | 'reply'
  | 'system'
  | 'handoff'
  | 'discussion'
  | 'suggestion'
  | 'escalation'
  | 'approval_request'
  | 'approval-request'
  | 'approval-decision'
  | 'guidance-request'
  | 'guidance-response'
  | 'coaching'
  | 'self-improvement'

export interface A2AMessage {
  id: string
  fromAgentId: string
  toAgentId: string
  threadId?: string
  content: string
  type: A2AMessageType
  contextSnapshot?: string
  timestamp: number
  read?: boolean
  /** Escalation chain metadata */
  escalationChain?: string[]
  /** Original requester for escalated messages */
  originAgentId?: string
}

export interface EscalationMeta {
  /** Agent IDs in the escalation chain so far */
  chain: string[]
  /** Original requesting agent */
  originAgentId: string
  /** Where to route if CEO cannot handle: 'secretary' | 'user' */
  ceoFallback?: 'secretary' | 'user'
}

export interface A2AEnvelope {
  message: A2AMessage
  /** Message ID this envelope is replying to */
  replyTo?: string
  priority: number
  expiresAt?: number
  /** Escalation metadata for approval/guidance routing */
  escalation?: EscalationMeta
}

export interface MiddlewareResult {
  passed: boolean
  reason?: string
}

export type Middleware = (envelope: A2AEnvelope) => MiddlewareResult

export interface SendResult {
  delivered: boolean
  reason?: string
  messageId?: string
}

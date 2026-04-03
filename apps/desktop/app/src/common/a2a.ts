/**
 * Agent-to-Agent (A2A) messaging protocol types.
 *
 * Every inter-agent message flows through the MessageBus middleware pipeline:
 * validation -> content filter -> rate limit -> routing -> circuit breaker -> audit
 */

export type A2AMessageType = 'prompt' | 'reply' | 'system' | 'approval_request'

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
}

export interface A2AEnvelope {
  message: A2AMessage
  /** Message ID this envelope is replying to */
  replyTo?: string
  priority: number
  expiresAt?: number
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

/**
 * A2AMessaging — High-level agent-to-agent prompt delegation.
 *
 * Wraps the MessageBus to provide:
 * - sendPrompt / replyTo for structured A2A conversations
 * - Read-guard enforcement (must readContext before sendPrompt)
 * - Inbox management (getInbox, markRead)
 * - Integration points for heartbeat scheduler and active session injection
 */

import type { A2AMessage, A2AEnvelope } from '../common/a2a.js'
import {
  MessageBus,
  getMessageBus,
  markContextRead,
  hasReadContext,
} from './message-bus.js'

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

/**
 * Reset all A2A state (for testing).
 */
export function resetA2AState(): void {
  contextSnapshots.clear()
  replyRoutingTable.clear()
  pendingTasks.clear()
  activeAgents.clear()
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
}

// Singleton
let a2aInstance: A2AMessaging | null = null

export function getA2AMessaging(): A2AMessaging {
  if (!a2aInstance) {
    a2aInstance = new A2AMessaging()
  }
  return a2aInstance
}

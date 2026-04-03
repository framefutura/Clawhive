import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock storage module to avoid DB initialization requirement
vi.mock('./storage.js', () => ({
  addActivityLog: vi.fn(() => 'mock-id'),
}))

import { MessageBus, clearReadGuard, clearRateLimits, clearCircuitBreakers } from './message-bus.js'
import {
  A2AMessaging,
  setAgentActive,
  setAgentIdle,
  getPendingTasks,
  consumePendingTask,
  updateAgentContextSnapshot,
  resetA2AState,
} from './a2a-messaging.js'

describe('A2AMessaging', () => {
  let bus: MessageBus
  let messaging: A2AMessaging

  beforeEach(() => {
    bus = new MessageBus()
    messaging = new A2AMessaging(bus)
    clearReadGuard('agent-a')
    clearReadGuard('agent-b')
    clearRateLimits()
    clearCircuitBreakers()
    resetA2AState()
  })

  describe('readContext + sendPrompt', () => {
    it('sendPrompt succeeds after readContext', async () => {
      messaging.readContext('agent-a', 'agent-b')
      const msgId = await messaging.sendPrompt('agent-a', 'agent-b', 'Please analyze this data')
      expect(msgId).toBeTruthy()
    })

    it('sendPrompt fails without readContext (read-guard)', async () => {
      await expect(
        messaging.sendPrompt('agent-a', 'agent-b', 'Do something')
      ).rejects.toThrow('Read-guard')
    })

    it('readContext returns stored snapshot', () => {
      updateAgentContextSnapshot('agent-b', 'Data analyst for marketing', 'idle', Date.now())
      const snapshot = messaging.readContext('agent-a', 'agent-b')
      expect(snapshot).not.toBeNull()
      expect(snapshot!.summary).toBe('Data analyst for marketing')
    })

    it('readContext returns null for unknown agent', () => {
      const snapshot = messaging.readContext('agent-a', 'unknown-agent')
      expect(snapshot).toBeNull()
    })

    it('hasReadContext reflects read-guard state', () => {
      expect(messaging.hasReadContext('agent-a', 'agent-b')).toBe(false)
      messaging.readContext('agent-a', 'agent-b')
      expect(messaging.hasReadContext('agent-a', 'agent-b')).toBe(true)
    })
  })

  describe('prompt routing for idle vs active agents', () => {
    it('adds pending task when target is idle', async () => {
      setAgentIdle('agent-b')
      messaging.readContext('agent-a', 'agent-b')
      await messaging.sendPrompt('agent-a', 'agent-b', 'Review this document')

      const pending = getPendingTasks('agent-b')
      expect(pending).toHaveLength(1)
      expect(pending[0].content).toBe('Review this document')
    })

    it('does not add pending task when target is active', async () => {
      setAgentActive('agent-b')
      messaging.readContext('agent-a', 'agent-b')
      await messaging.sendPrompt('agent-a', 'agent-b', 'Quick question')

      const pending = getPendingTasks('agent-b')
      expect(pending).toHaveLength(0)
    })

    it('consumePendingTask removes the task', async () => {
      setAgentIdle('agent-b')
      messaging.readContext('agent-a', 'agent-b')
      const msgId = await messaging.sendPrompt('agent-a', 'agent-b', 'Task for you')

      expect(getPendingTasks('agent-b')).toHaveLength(1)
      consumePendingTask('agent-b', msgId)
      expect(getPendingTasks('agent-b')).toHaveLength(0)
    })
  })

  describe('replyTo', () => {
    it('routes reply back to original sender', async () => {
      messaging.readContext('agent-a', 'agent-b')
      const msgId = await messaging.sendPrompt('agent-a', 'agent-b', 'Can you help?')

      // agent-b replies
      await messaging.replyTo('agent-b', msgId, 'Sure, I can help!')

      // Check agent-a inbox for the reply
      const inbox = messaging.getInbox('agent-a')
      expect(inbox).toHaveLength(1)
      expect(inbox[0].type).toBe('reply')
      expect(inbox[0].content).toBe('Sure, I can help!')
      expect(inbox[0].threadId).toBe(msgId)
    })

    it('throws for unknown message id', async () => {
      await expect(
        messaging.replyTo('agent-b', 'nonexistent-id', 'Hello')
      ).rejects.toThrow('No reply route')
    })
  })

  describe('inbox management', () => {
    it('getInbox returns delivered messages', async () => {
      messaging.readContext('agent-a', 'agent-b')
      await messaging.sendPrompt('agent-a', 'agent-b', 'Message 1')
      await messaging.sendPrompt('agent-a', 'agent-b', 'Message 2')

      const inbox = messaging.getInbox('agent-b')
      expect(inbox).toHaveLength(2)
    })

    it('markRead updates message state', async () => {
      messaging.readContext('agent-a', 'agent-b')
      const msgId = await messaging.sendPrompt('agent-a', 'agent-b', 'Check this')

      expect(messaging.getUnreadCount('agent-b')).toBe(1)
      messaging.markRead('agent-b', msgId)
      expect(messaging.getUnreadCount('agent-b')).toBe(0)
    })

    it('getUnreadCount returns correct count', async () => {
      messaging.readContext('agent-a', 'agent-b')
      await messaging.sendPrompt('agent-a', 'agent-b', 'Msg 1')
      await messaging.sendPrompt('agent-a', 'agent-b', 'Msg 2')

      expect(messaging.getUnreadCount('agent-b')).toBe(2)
    })
  })
})

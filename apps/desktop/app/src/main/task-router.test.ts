import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock storage to avoid DB initialization
vi.mock('./storage.js', () => ({
  addActivityLog: vi.fn(() => 'mock-id'),
}))

// Mock a2a-messaging exports used by task-router
vi.mock('./a2a-messaging.js', () => {
  const activeSessions = new Set<string>()
  const pendingMap = new Map<string, unknown[]>()
  return {
    isAgentActive: (id: string) => activeSessions.has(id),
    getPendingTasks: (id: string) => pendingMap.get(id) ?? [],
    consumePendingTask: vi.fn(),
    setAgentActive: (id: string) => activeSessions.add(id),
    setAgentIdle: (id: string) => activeSessions.delete(id),
    _activeSessions: activeSessions,
    _pendingMap: pendingMap,
  }
})

import type { AgentRecord } from '../common/agent.js'
import type { TaskRouteRequest, TaskSecurityLevel } from '../common/task-router.js'
import { TaskRouter } from './task-router.js'
import { AgentRegistry } from './agent-registry.js'

// Helpers to control mock state
function getA2AMock() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./a2a-messaging.js') as {
    _activeSessions: Set<string>
    _pendingMap: Map<string, unknown[]>
    setAgentActive: (id: string) => void
    setAgentIdle: (id: string) => void
  }
  return mod
}

function makeAgent(overrides: Partial<AgentRecord> & { id: string; name: string; role: AgentRecord['role'] }): AgentRecord {
  return {
    genes: [],
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    allowedTools: [],
    defaultSecurityLevel: 'medium',
    status: 'idle',
    lifecycle: 'persistent',
    docs: { soul: '', heartbeat: '', tools: '', agents: '', interaction: '' },
    customizations: { skills: [], knowledgeDocs: [], mcpServers: [], cliTools: [], documentRefs: [], toolRefs: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

// Stub registry that returns canned agents and hierarchy
function createStubRegistry(agents: AgentRecord[]): AgentRegistry {
  const registry = {
    listAgents: () => agents,
    getHierarchy: () => [],
    getDescendants: (parentId: string) =>
      agents.filter(a => a.parentId === parentId),
    getAgent: (id: string) => agents.find(a => a.id === id),
  } as unknown as AgentRegistry
  return registry
}

describe('TaskRouter', () => {
  let router: TaskRouter
  const ceo = makeAgent({ id: 'ceo-1', name: 'CEO', role: 'CEO', defaultSecurityLevel: 'high' })
  const lead = makeAgent({ id: 'lead-1', name: 'Team Lead', role: 'Team Leader', parentId: 'ceo-1', defaultSecurityLevel: 'medium' })
  const worker1 = makeAgent({ id: 'w1', name: 'Worker 1', role: 'Individual Agent', parentId: 'lead-1', defaultSecurityLevel: 'low' })
  const worker2 = makeAgent({ id: 'w2', name: 'Worker 2', role: 'Individual Agent', parentId: 'lead-1', defaultSecurityLevel: 'medium' })

  beforeEach(() => {
    const a2a = getA2AMock()
    a2a._activeSessions.clear()
    a2a._pendingMap.clear()
    const registry = createStubRegistry([ceo, lead, worker1, worker2])
    router = new TaskRouter(registry)
  })

  describe('heartbeat skip-if-busy', () => {
    it('skips a busy agent tick and does not consume pending work', () => {
      const a2a = getA2AMock()
      a2a.setAgentActive('w1')
      router.setHeartbeat('w1', 5000)

      const result = router.tickAgent('w1')
      expect(result.skippedBecauseBusy).toBe(true)
    })

    it('processes an idle agent tick normally', () => {
      router.setHeartbeat('w1', 5000)
      const result = router.tickAgent('w1')
      expect(result.skippedBecauseBusy).toBe(false)
    })
  })

  describe('auto-delegation picks child with lowest workload', () => {
    it('delegates to the child with the smallest active task count', () => {
      // Give worker1 some existing workload
      router.enqueueTask({
        taskId: 'existing-1',
        content: 'task',
        originatingSecurityLevel: 'medium',
        mode: 'auto',
        parentAgentId: 'lead-1',
      })

      // Now route a second task — should go to worker2 (lower workload)
      const decision = router.routeTask({
        taskId: 'task-2',
        content: 'another task',
        originatingSecurityLevel: 'medium',
        mode: 'auto',
        parentAgentId: 'lead-1',
      })

      expect(decision.assignedAgentId).toBe('w2')
      expect(decision.workloadCount).toBeDefined()
    })
  })

  describe('user override routing', () => {
    it('routes to an explicit agent when mode is agent', () => {
      const decision = router.routeTask({
        taskId: 'task-override',
        content: 'do this',
        originatingSecurityLevel: 'high',
        mode: 'agent',
        assignedAgentId: 'w2',
      })

      expect(decision.assignedAgentId).toBe('w2')
      expect(decision.mode).toBe('agent')
    })

    it('routes to a team when mode is team', () => {
      const decision = router.routeTask({
        taskId: 'task-team',
        content: 'team work',
        originatingSecurityLevel: 'medium',
        mode: 'team',
        assignedTeamId: 'team-alpha',
        assignedAgentId: 'lead-1',
      })

      expect(decision.assignedTeamId).toBe('team-alpha')
      expect(decision.mode).toBe('team')
    })

    it('returns error when explicit agent target is missing', () => {
      const decision = router.routeTask({
        taskId: 'task-bad',
        content: 'no target',
        originatingSecurityLevel: 'medium',
        mode: 'agent',
        // assignedAgentId intentionally omitted
      })

      expect(decision.error).toBeDefined()
    })

    it('override wins over auto-delegation', () => {
      const decision = router.routeTask({
        taskId: 'task-force',
        content: 'force to w1',
        originatingSecurityLevel: 'medium',
        mode: 'agent',
        assignedAgentId: 'w1',
        parentAgentId: 'lead-1',
      })

      expect(decision.assignedAgentId).toBe('w1')
    })
  })

  describe('security level propagation', () => {
    it('carries originatingSecurityLevel through delegation', () => {
      const decision = router.routeTask({
        taskId: 'sec-task',
        content: 'secure work',
        originatingSecurityLevel: 'high',
        mode: 'auto',
        parentAgentId: 'lead-1',
      })

      expect(decision.originatingSecurityLevel).toBe('high')
    })

    it('effectiveSecurityLevel = min(parent, child)', () => {
      // parent (lead-1) is medium, worker1 is low => effective should be low
      const decision = router.routeTask({
        taskId: 'sec-min',
        content: 'min check',
        originatingSecurityLevel: 'medium',
        mode: 'agent',
        assignedAgentId: 'w1',
      })

      expect(decision.effectiveSecurityLevel).toBe('low')
    })

    it('effectiveSecurityLevel does not exceed originating level', () => {
      // originating is low, worker2 is medium => effective should be low
      const decision = router.routeTask({
        taskId: 'sec-cap',
        content: 'cap check',
        originatingSecurityLevel: 'low',
        mode: 'agent',
        assignedAgentId: 'w2',
      })

      expect(decision.effectiveSecurityLevel).toBe('low')
    })
  })

  describe('snapshot', () => {
    it('returns current router state', () => {
      router.setHeartbeat('w1', 3000)
      router.enqueueTask({
        taskId: 'snap-task',
        content: 'test',
        originatingSecurityLevel: 'medium',
        mode: 'auto',
        parentAgentId: 'lead-1',
      })

      const snapshot = router.getSnapshot()
      expect(snapshot.heartbeats.size).toBeGreaterThanOrEqual(1)
      expect(snapshot.activeTasks.size).toBeGreaterThanOrEqual(1)
    })
  })
})

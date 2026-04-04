/**
 * TaskRouter — main-process orchestrator for multi-agent task delegation.
 *
 * Provides: heartbeat scheduling with skip-if-busy guard, hierarchy-based
 * auto-delegation, explicit user override, workload balancing by active
 * task count, and delegation chain security propagation.
 */

import type { AgentRecord } from '../common/agent.js'
import type {
  TaskRouteRequest,
  TaskRouteDecision,
  TaskSecurityLevel,
  HeartbeatConfig,
  TaskRouterSnapshot,
  TaskRouterSnapshotDTO,
} from '../common/task-router.js'
import { isAgentActive, getPendingTasks, consumePendingTask } from './a2a-messaging.js'
import type { AgentRegistry } from './agent-registry.js'

const SECURITY_RANK: Record<TaskSecurityLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

function minSecurityLevel(a: TaskSecurityLevel, b: TaskSecurityLevel): TaskSecurityLevel {
  return SECURITY_RANK[a] <= SECURITY_RANK[b] ? a : b
}

export class TaskRouter {
  private heartbeats = new Map<string, HeartbeatConfig>()
  private activeTasks = new Map<string, TaskRouteDecision>()
  private agentWorkloads = new Map<string, number>()

  constructor(private registry: AgentRegistry) {}

  /** Configure per-agent heartbeat interval. */
  setHeartbeat(agentId: string, heartbeatIntervalMs: number): void {
    this.heartbeats.set(agentId, { agentId, heartbeatIntervalMs })
  }

  /**
   * Tick an agent's heartbeat. If the agent is busy, skip and return
   * a decision with skippedBecauseBusy=true. Otherwise process pending work.
   */
  tickAgent(agentId: string): TaskRouteDecision {
    if (isAgentActive(agentId)) {
      return {
        taskId: '',
        assignedAgentId: agentId,
        mode: 'auto',
        originatingSecurityLevel: 'medium',
        effectiveSecurityLevel: 'medium',
        workloadCount: this.agentWorkloads.get(agentId) ?? 0,
        skippedBecauseBusy: true,
      }
    }

    // Process first pending task if any
    const pending = getPendingTasks(agentId)
    if (pending.length > 0) {
      const task = pending[0]
      consumePendingTask(agentId, task.id)
    }

    return {
      taskId: '',
      assignedAgentId: agentId,
      mode: 'auto',
      originatingSecurityLevel: 'medium',
      effectiveSecurityLevel: 'medium',
      workloadCount: this.agentWorkloads.get(agentId) ?? 0,
      skippedBecauseBusy: false,
    }
  }

  /**
   * Enqueue a task — routes it and tracks the assignment.
   * Returns the routing decision.
   */
  enqueueTask(request: TaskRouteRequest): TaskRouteDecision {
    const decision = this.routeTask(request)
    if (!decision.error) {
      this.activeTasks.set(request.taskId, decision)
      const current = this.agentWorkloads.get(decision.assignedAgentId) ?? 0
      this.agentWorkloads.set(decision.assignedAgentId, current + 1)
    }
    return decision
  }

  /**
   * Route a task based on mode: auto, agent, or team.
   * Does NOT track the task — use enqueueTask for that.
   */
  routeTask(request: TaskRouteRequest): TaskRouteDecision {
    switch (request.mode) {
      case 'agent':
        return this.routeToAgent(request)
      case 'team':
        return this.routeToTeam(request)
      case 'auto':
      default:
        return this.routeAuto(request)
    }
  }

  /** Return current router state snapshot. */
  getSnapshot(): TaskRouterSnapshot {
    return {
      activeTasks: new Map(this.activeTasks),
      heartbeats: new Map(this.heartbeats),
      agentWorkloads: new Map(this.agentWorkloads),
    }
  }

  /** Serializable snapshot for IPC transport. */
  getSnapshotDTO(): TaskRouterSnapshotDTO {
    return {
      activeTasks: Object.fromEntries(this.activeTasks),
      heartbeats: Object.fromEntries(this.heartbeats),
      agentWorkloads: Object.fromEntries(this.agentWorkloads),
    }
  }

  // --- Private routing strategies ---

  private routeToAgent(request: TaskRouteRequest): TaskRouteDecision {
    if (!request.assignedAgentId) {
      return this.errorDecision(request, 'Explicit agent mode requires assignedAgentId')
    }

    const agent = this.registry.getAgent(request.assignedAgentId)
    const agentLevel = (agent?.defaultSecurityLevel ?? 'medium') as TaskSecurityLevel
    const effective = minSecurityLevel(request.originatingSecurityLevel, agentLevel)

    return {
      taskId: request.taskId,
      assignedAgentId: request.assignedAgentId,
      mode: 'agent',
      originatingSecurityLevel: request.originatingSecurityLevel,
      effectiveSecurityLevel: effective,
      workloadCount: this.agentWorkloads.get(request.assignedAgentId) ?? 0,
      skippedBecauseBusy: false,
    }
  }

  private routeToTeam(request: TaskRouteRequest): TaskRouteDecision {
    if (!request.assignedTeamId) {
      return this.errorDecision(request, 'Team mode requires assignedTeamId')
    }

    const agentId = request.assignedAgentId ?? request.parentAgentId ?? ''
    const agent = agentId ? this.registry.getAgent(agentId) : undefined
    const agentLevel = (agent?.defaultSecurityLevel ?? 'medium') as TaskSecurityLevel
    const effective = minSecurityLevel(request.originatingSecurityLevel, agentLevel)

    return {
      taskId: request.taskId,
      assignedAgentId: agentId,
      assignedTeamId: request.assignedTeamId,
      mode: 'team',
      originatingSecurityLevel: request.originatingSecurityLevel,
      effectiveSecurityLevel: effective,
      workloadCount: this.agentWorkloads.get(agentId) ?? 0,
      skippedBecauseBusy: false,
    }
  }

  private routeAuto(request: TaskRouteRequest): TaskRouteDecision {
    const parentId = request.parentAgentId
    if (!parentId) {
      return this.errorDecision(request, 'Auto-delegation requires parentAgentId')
    }

    const children = this.registry.getDescendants(parentId)
    if (children.length === 0) {
      return this.errorDecision(request, `No descendants found for agent ${parentId}`)
    }

    // Pick child with lowest workload (not busy)
    let bestAgent: AgentRecord | null = null
    let bestWorkload = Infinity

    for (const child of children) {
      if (isAgentActive(child.id)) continue
      const workload = this.agentWorkloads.get(child.id) ?? 0
      if (workload < bestWorkload) {
        bestWorkload = workload
        bestAgent = child
      }
    }

    if (!bestAgent) {
      // All children busy — pick first child anyway
      bestAgent = children[0]
      bestWorkload = this.agentWorkloads.get(bestAgent.id) ?? 0
    }

    const childLevel = (bestAgent.defaultSecurityLevel ?? 'medium') as TaskSecurityLevel
    const effective = minSecurityLevel(request.originatingSecurityLevel, childLevel)

    return {
      taskId: request.taskId,
      assignedAgentId: bestAgent.id,
      mode: 'auto',
      originatingSecurityLevel: request.originatingSecurityLevel,
      effectiveSecurityLevel: effective,
      workloadCount: bestWorkload,
      skippedBecauseBusy: false,
    }
  }

  private errorDecision(request: TaskRouteRequest, error: string): TaskRouteDecision {
    return {
      taskId: request.taskId,
      assignedAgentId: '',
      mode: request.mode,
      originatingSecurityLevel: request.originatingSecurityLevel,
      effectiveSecurityLevel: request.originatingSecurityLevel,
      workloadCount: 0,
      skippedBecauseBusy: false,
      error,
    }
  }
}

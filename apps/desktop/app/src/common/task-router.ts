/**
 * Task Router contracts — shared types used by main, preload, and renderer.
 *
 * Covers: heartbeat scheduling, hierarchy delegation, user override,
 * workload balancing, and delegation chain security propagation.
 */

export type TaskSecurityLevel = 'high' | 'medium' | 'low'

export type TaskAssignmentMode = 'auto' | 'agent' | 'team'

export interface HeartbeatConfig {
  agentId: string
  heartbeatIntervalMs: number
}

export interface TaskRouteRequest {
  taskId: string
  content: string
  originatingSecurityLevel: TaskSecurityLevel
  mode: TaskAssignmentMode
  /** Set when mode is 'agent' */
  assignedAgentId?: string
  /** Set when mode is 'team' */
  assignedTeamId?: string
  /** Parent agent requesting delegation */
  parentAgentId?: string
}

export interface TaskRouteDecision {
  taskId: string
  assignedAgentId: string
  assignedTeamId?: string
  mode: TaskAssignmentMode
  originatingSecurityLevel: TaskSecurityLevel
  effectiveSecurityLevel: TaskSecurityLevel
  workloadCount: number
  skippedBecauseBusy: boolean
  error?: string
}

export interface TaskRouterSnapshot {
  activeTasks: Map<string, TaskRouteDecision>
  heartbeats: Map<string, HeartbeatConfig>
  agentWorkloads: Map<string, number>
}

/** Serializable version of TaskRouterSnapshot for IPC transport */
export interface TaskRouterSnapshotDTO {
  activeTasks: Record<string, TaskRouteDecision>
  heartbeats: Record<string, HeartbeatConfig>
  agentWorkloads: Record<string, number>
}

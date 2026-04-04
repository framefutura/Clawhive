/**
 * Team system types shared between main process and renderer.
 * Extends the base team contracts with coaching, OKR, and security-level fields.
 */

export type SharedMemoryType = 'conversation' | 'file' | 'note' | 'task_result'

export interface TeamRecord {
  id: string
  name: string
  leaderId: string
  department?: string
  workspaceId?: string
  createdAt: number
}

export interface SharedMemory {
  id: string
  teamId?: string
  agentId?: string
  type: SharedMemoryType
  content: string
  tags: string[]
  minSecurityLevel: string
  sharedScope: 'team' | 'private'
  sharedAt: number
}

export interface TeamMember {
  teamId: string
  agentId: string
  joinedAt: number
}

export interface CoachingEntry {
  id: string
  teamId: string
  leaderId: string
  agentId: string
  note: string
  createdAt: number
}

export interface TeamOkr {
  id: string
  teamId: string
  leaderId: string
  objective: string
  keyResults: string[]
  reviewCadence: 'weekly' | 'biweekly' | 'monthly'
  createdAt: number
}

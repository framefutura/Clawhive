/**
 * Team system types shared between main process and renderer
 */

export interface TeamRecord {
  id: string
  name: string
  leaderId: string
  department?: string
  workspaceId?: string
  createdAt: number
}

export type SharedMemoryType = 'conversation' | 'file' | 'note' | 'task_result'

export interface SharedMemory {
  id: string
  teamId?: string
  agentId?: string
  type: SharedMemoryType
  content: string
  tags: string[]
  sharedAt: number
}

export interface TeamMember {
  teamId: string
  agentId: string
  joinedAt: number
}

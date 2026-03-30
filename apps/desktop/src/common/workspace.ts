// Shared workspace types used by both main process and renderer
import type { GeneCategory } from '../renderer/types'

export type AgentStatus = 'idle' | 'working' | 'error' | 'paused'

export interface ActiveGene {
  category: GeneCategory
  name: string
}

export interface WorkspaceRecord {
  id: string
  name: string
  activeTask?: string
  agentStatus: AgentStatus
  activeGenes: ActiveGene[]
  geneScore: number
  createdAt: number
  updatedAt: number
}

// Partial type for updates
export type WorkspaceUpdate = Partial<Omit<WorkspaceRecord, 'id' | 'createdAt'>>

// Workspace directory structure subdirectories
export const WORKSPACE_SUBDIRS = ['files', 'output', 'cache', 'memory'] as const
export type WorkspaceSubdir = typeof WORKSPACE_SUBDIRS[number]

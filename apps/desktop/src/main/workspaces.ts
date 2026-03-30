// Workspace database operations for main process
import path from 'node:path'
import fs from 'node:fs/promises'
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  type DbWorkspace,
} from './storage.js'
import { WORKSPACE_SUBDIRS } from '../common/workspace.js'
import type { WorkspaceRecord, AgentStatus, WorkspaceUpdate, ActiveGene } from '../common/workspace.js'

// Convert DB row to WorkspaceRecord
function dbToWorkspaceRecord(row: DbWorkspace): WorkspaceRecord {
  let activeGenes: ActiveGene[] = []
  try {
    activeGenes = JSON.parse(row.active_genes || '[]')
  } catch {
    activeGenes = []
  }

  return {
    id: row.id,
    name: row.name,
    activeTask: row.active_task ?? undefined,
    agentStatus: row.agent_status as AgentStatus,
    activeGenes,
    geneScore: row.gene_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class WorkspaceDb {
  private dataPath: string | null = null

  setDataPath(dataPath: string) {
    this.dataPath = dataPath
  }

  /**
   * Get the workspace directory path
   */
  getWorkspaceDir(workspaceId: string): string {
    if (!this.dataPath) {
      throw new Error('Data path not configured')
    }
    return path.join(this.dataPath, 'workspaces', workspaceId)
  }

  /**
   * Ensure workspace directory tree exists
   */
  async ensureWorkspaceDir(workspaceId: string): Promise<void> {
    const baseDir = this.getWorkspaceDir(workspaceId)

    // Create base workspace directory
    await fs.mkdir(baseDir, { recursive: true })

    // Create subdirectories
    for (const subdir of WORKSPACE_SUBDIRS) {
      await fs.mkdir(path.join(baseDir, subdir), { recursive: true })
    }
  }

  /**
   * List all workspaces ordered by creation time
   */
  list(): WorkspaceRecord[] {
    const rows = listWorkspaces()
    return rows.map(dbToWorkspaceRecord)
  }

  /**
   * Get a workspace by ID
   */
  get(id: string): WorkspaceRecord | null {
    const row = getWorkspace(id)
    return row ? dbToWorkspaceRecord(row) : null
  }

  /**
   * Create a new workspace with directory structure
   */
  async create(name?: string): Promise<WorkspaceRecord> {
    const id = crypto.randomUUID()
    const workspaceName = name || `Workspace ${Date.now().toString(36)}`
    const now = Date.now()

    // Create database record
    createWorkspace({
      id,
      name: workspaceName,
      active_task: null,
      agent_status: 'idle',
    })

    // Create directory structure
    await this.ensureWorkspaceDir(id)

    return {
      id,
      name: workspaceName,
      activeTask: undefined,
      agentStatus: 'idle',
      activeGenes: [],
      geneScore: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Update workspace fields
   */
  update(id: string, updates: WorkspaceUpdate): WorkspaceRecord | null {
    const existing = getWorkspace(id)
    if (!existing) return null

    // Convert to DbWorkspace update format
    const dbUpdates: Partial<DbWorkspace> = {}

    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.activeTask !== undefined) dbUpdates.active_task = updates.activeTask
    if (updates.agentStatus !== undefined) dbUpdates.agent_status = updates.agentStatus
    if (updates.activeGenes !== undefined) dbUpdates.active_genes = JSON.stringify(updates.activeGenes)
    if (updates.geneScore !== undefined) dbUpdates.gene_score = updates.geneScore

    updateWorkspace(id, dbUpdates)

    // Return updated workspace
    const updated = getWorkspace(id)
    return updated ? dbToWorkspaceRecord(updated) : null
  }

  /**
   * Delete a workspace and its directory
   */
  async delete(id: string): Promise<void> {
    const workspaceDir = this.getWorkspaceDir(id)

    // Delete from database
    deleteWorkspace(id)

    // Delete directory (best effort, ignore errors)
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true })
    } catch {
      // Directory may not exist or already deleted
    }
  }
}

// Singleton instance
export const workspaceDb = new WorkspaceDb()

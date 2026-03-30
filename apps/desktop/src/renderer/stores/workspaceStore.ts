import { useState, useEffect, useCallback } from 'react'
import type { WorkspaceRecord, AgentStatus, ActiveGene } from '../../common/workspace'

interface WorkspaceStore {
  workspaces: WorkspaceRecord[]
  activeWorkspaceId: string | null
  loadWorkspaces: () => Promise<void>
  createWorkspace: (name?: string) => Promise<WorkspaceRecord>
  updateWorkspace: (id: string, updates: Partial<Omit<WorkspaceRecord, 'id' | 'createdAt'>>) => Promise<void>
  setActiveWorkspace: (id: string) => void
  getWorkspace: (id: string) => WorkspaceRecord | undefined
}

export function useWorkspaceStore(): WorkspaceStore {
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)

  // Subscribe to workspace changes from main process
  useEffect(() => {
    const loadInitialWorkspaces = async () => {
      try {
        const loadedWorkspaces = await window.clawhive.listWorkspaces()
        setWorkspaces(loadedWorkspaces)
        if (loadedWorkspaces.length > 0 && !activeWorkspaceId) {
          // Set active to first workspace if none set
          setActiveWorkspaceId(loadedWorkspaces[0].id)
        }
      } catch (err) {
        console.error('Failed to load workspaces:', err)
      }
    }

    loadInitialWorkspaces()

    const cleanup = window.clawhive.onWorkspacesChange((newWorkspaces) => {
      setWorkspaces(newWorkspaces)
      // Validate activeWorkspaceId still exists
      if (activeWorkspaceId && !newWorkspaces.find(w => w.id === activeWorkspaceId)) {
        if (newWorkspaces.length > 0) {
          setActiveWorkspaceId(newWorkspaces[0].id)
        } else {
          setActiveWorkspaceId(null)
        }
      }
    })

    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadWorkspaces = useCallback(async () => {
    const loadedWorkspaces = await window.clawhive.listWorkspaces()
    setWorkspaces(loadedWorkspaces)
  }, [])

  const createWorkspace = useCallback(async (name?: string): Promise<WorkspaceRecord> => {
    const newWorkspace = await window.clawhive.createWorkspace(name)
    // The onWorkspacesChange handler will update local state
    setActiveWorkspaceId(newWorkspace.id)
    return newWorkspace
  }, [])

  const updateWorkspace = useCallback(async (
    id: string,
    updates: Partial<Omit<WorkspaceRecord, 'id' | 'createdAt'>>
  ) => {
    await window.clawhive.updateWorkspace(id, updates)
    // The onWorkspacesChange handler will update local state
  }, [])

  const setActiveWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id)
  }, [])

  const getWorkspace = useCallback((id: string): WorkspaceRecord | undefined => {
    return workspaces.find(w => w.id === id)
  }, [workspaces])

  return {
    workspaces,
    activeWorkspaceId,
    loadWorkspaces,
    createWorkspace,
    updateWorkspace,
    setActiveWorkspace,
    getWorkspace,
  }
}

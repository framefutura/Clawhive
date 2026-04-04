import { useMemo, useRef, useState, useCallback } from 'react'

interface ReparentableAgent {
  id: string
  parentId?: string
}

export interface DropResult {
  canDrop: boolean
  draggedAgentId?: string
  newParentId?: string
  reason?: string
}

export function wouldCreateCycle(
  agents: ReparentableAgent[],
  dragId: string,
  newParentId?: string
): boolean {
  if (!newParentId) {
    return false
  }

  if (dragId === newParentId) {
    return true
  }

  const parentById = new Map(agents.map((agent) => [agent.id, agent.parentId]))
  const visited = new Set<string>()
  let currentId: string | undefined = newParentId

  while (currentId) {
    if (currentId === dragId) {
      return true
    }

    if (visited.has(currentId)) {
      return true
    }

    visited.add(currentId)
    currentId = parentById.get(currentId)
  }

  return false
}

/**
 * Mutable drag-state object for non-React test contexts.
 * Tracks dragged agent, hover target, and cycle-safe drop validation.
 */
export function createDragState(agents: ReparentableAgent[]) {
  const state = {
    draggedAgentId: undefined as string | undefined,
    hoverParentId: undefined as string | undefined,
    canDrop: false,

    startDrag(agentId: string) {
      state.draggedAgentId = agentId
      state.hoverParentId = undefined
      state.canDrop = false
    },

    setHoverParent(parentId: string | undefined) {
      state.hoverParentId = parentId
      if (!state.draggedAgentId) {
        state.canDrop = false
        return
      }
      state.canDrop = !wouldCreateCycle(agents, state.draggedAgentId, parentId)
    },

    completeDrop(newParentId: string | undefined): DropResult {
      if (!state.draggedAgentId) {
        return { canDrop: false, reason: 'No drag in progress' }
      }
      const dragId = state.draggedAgentId
      const cycle = wouldCreateCycle(agents, dragId, newParentId)
      // Reset state after drop attempt
      state.draggedAgentId = undefined
      state.hoverParentId = undefined
      state.canDrop = false
      if (cycle) {
        return { canDrop: false, draggedAgentId: dragId, reason: 'Circular reference detected' }
      }
      return { canDrop: true, draggedAgentId: dragId, newParentId }
    },

    cancelDrag() {
      state.draggedAgentId = undefined
      state.hoverParentId = undefined
      state.canDrop = false
    },
  }
  return state
}

/**
 * React hook wrapping createDragState with useState for re-renders.
 */
export function useDragReparent(agents: ReparentableAgent[]) {
  const agentsRef = useRef(agents)
  agentsRef.current = agents

  const [draggedAgentId, setDraggedAgentId] = useState<string | undefined>()
  const [hoverParentId, setHoverParentId] = useState<string | undefined>()
  const [canDrop, setCanDrop] = useState(false)

  const startDrag = useCallback((agentId: string) => {
    setDraggedAgentId(agentId)
    setHoverParentId(undefined)
    setCanDrop(false)
  }, [])

  const setHoverParentCb = useCallback((parentId: string | undefined) => {
    setHoverParentId(parentId)
    setCanDrop((prev) => {
      const current = agentsRef.current
      const dragId = draggedAgentId
      if (!dragId) return false
      return !wouldCreateCycle(current, dragId, parentId)
    })
  }, [draggedAgentId])

  const completeDrop = useCallback((newParentId: string | undefined): DropResult => {
    const dragId = draggedAgentId
    if (!dragId) {
      return { canDrop: false, reason: 'No drag in progress' }
    }
    const cycle = wouldCreateCycle(agentsRef.current, dragId, newParentId)
    setDraggedAgentId(undefined)
    setHoverParentId(undefined)
    setCanDrop(false)
    if (cycle) {
      return { canDrop: false, draggedAgentId: dragId, reason: 'Circular reference detected' }
    }
    return { canDrop: true, draggedAgentId: dragId, newParentId }
  }, [draggedAgentId])

  const cancelDrag = useCallback(() => {
    setDraggedAgentId(undefined)
    setHoverParentId(undefined)
    setCanDrop(false)
  }, [])

  return useMemo(
    () => ({
      draggedAgentId,
      hoverParentId,
      canDrop,
      startDrag,
      setHoverParent: setHoverParentCb,
      completeDrop,
      cancelDrag,
      wouldCreateCycle: (dragId: string, newParentId?: string) =>
        wouldCreateCycle(agents, dragId, newParentId),
    }),
    [agents, draggedAgentId, hoverParentId, canDrop, startDrag, setHoverParentCb, completeDrop, cancelDrag]
  )
}

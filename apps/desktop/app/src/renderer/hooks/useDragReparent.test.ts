import { describe, expect, it } from 'vitest'
import { wouldCreateCycle, createDragState } from './useDragReparent'

const agents = [
  { id: 'a', parentId: undefined },
  { id: 'b', parentId: 'a' },
  { id: 'c', parentId: 'b' },
  { id: 'd', parentId: 'a' },
]

describe('wouldCreateCycle', () => {
  it('blocks moving an agent under its own descendant', () => {
    expect(wouldCreateCycle(agents, 'a', 'c')).toBe(true)
  })

  it('allows moving an agent under its sibling', () => {
    expect(wouldCreateCycle(agents, 'b', 'd')).toBe(false)
  })

  it('blocks moving an agent under itself', () => {
    expect(wouldCreateCycle(agents, 'b', 'b')).toBe(true)
  })

  it('blocks moving the root of a three-level chain under the leaf', () => {
    expect(wouldCreateCycle(agents, 'a', 'c')).toBe(true)
  })
})

describe('createDragState', () => {
  it('dropping an agent onto itself returns blocked with cycle reason', () => {
    const state = createDragState(agents)
    state.startDrag('b')
    const result = state.completeDrop('b')
    expect(result.canDrop).toBe(false)
    expect(result.reason).toBe('Circular reference detected')
  })

  it('dropping an agent onto a descendant returns blocked with cycle reason', () => {
    const state = createDragState(agents)
    state.startDrag('a')
    const result = state.completeDrop('c')
    expect(result.canDrop).toBe(false)
    expect(result.reason).toBe('Circular reference detected')
  })

  it('dropping an agent onto a valid new parent returns allowed with newParentId', () => {
    const state = createDragState(agents)
    state.startDrag('c')
    const result = state.completeDrop('d')
    expect(result.canDrop).toBe(true)
    expect(result.newParentId).toBe('d')
    expect(result.draggedAgentId).toBe('c')
  })

  it('clearing drag state resets hovered drop target', () => {
    const state = createDragState(agents)
    state.startDrag('b')
    state.setHoverParent('d')
    expect(state.hoverParentId).toBe('d')
    state.cancelDrag()
    expect(state.hoverParentId).toBeUndefined()
    expect(state.draggedAgentId).toBeUndefined()
  })

  it('setHoverParent updates the current hover target', () => {
    const state = createDragState(agents)
    state.startDrag('b')
    state.setHoverParent('d')
    expect(state.hoverParentId).toBe('d')
    expect(state.canDrop).toBe(true)
    state.setHoverParent('c')
    expect(state.hoverParentId).toBe('c')
    // b -> c is a cycle (c is a descendant of b)
    expect(state.canDrop).toBe(false)
  })

  it('completeDrop without startDrag returns blocked', () => {
    const state = createDragState(agents)
    const result = state.completeDrop('d')
    expect(result.canDrop).toBe(false)
  })

  it('dropping onto undefined (root) returns allowed', () => {
    const state = createDragState(agents)
    state.startDrag('c')
    const result = state.completeDrop(undefined)
    expect(result.canDrop).toBe(true)
    expect(result.newParentId).toBeUndefined()
    expect(result.draggedAgentId).toBe('c')
  })
})

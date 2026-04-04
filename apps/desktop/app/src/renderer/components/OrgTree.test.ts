import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('OrgTree Wave 2 hierarchy modes', () => {
  const filePath = path.resolve(import.meta.dirname, './OrgTree.tsx')
  const source = fs.readFileSync(filePath, 'utf8')

  it('accepts all three hierarchy view modes', () => {
    expect(source).toContain("viewMode: 'hierarchy' | 'org-chart' | 'teams'")
  })

  it('implements distinct hierarchy, org-chart, and teams render branches', () => {
    expect(source).toContain("viewMode === 'hierarchy'")
    expect(source).toContain("viewMode === 'org-chart'")
    expect(source).toContain("viewMode === 'teams'")
  })

  it('uses live AgentRecord.status values instead of hard-coded demo status', () => {
    expect(source).not.toContain("const status: 'idle' | 'working' | 'error' = 'idle'")
    expect(source).toContain('status: AgentStatus')
    expect(source).toContain('waiting-for-leader')
    expect(source).toContain('waiting-for-user')
    expect(source).toContain('blocked')
  })

  it('includes hover preview content for name, role, status, and summary', () => {
    expect(source).toContain('summary')
    expect(source).toContain('status')
    expect(source).toContain('Tooltip')
  })

  it('gives Secretary and CEO distinct visual treatment', () => {
    expect(source).toContain("Secretary")
    expect(source).toContain("CEO")
    expect(source).toContain('bridge')
    expect(source).toContain('overseer')
  })
})

describe('OrgTree drag-drop reparenting', () => {
  const filePath = path.resolve(import.meta.dirname, './OrgTree.tsx')
  const source = fs.readFileSync(filePath, 'utf8')

  it('renders draggable attribute on agent rows', () => {
    expect(source).toContain('draggable')
  })

  it('has onDragStart handler on agent rows', () => {
    expect(source).toContain('onDragStart')
  })

  it('has onDrop handler on agent rows', () => {
    expect(source).toContain('onDrop')
  })

  it('has onDragOver handler on agent rows', () => {
    expect(source).toContain('onDragOver')
  })

  it('does not contain the inert onChange noop', () => {
    expect(source).not.toContain('onChange={() => {}}')
  })

  it('does not render an internal HierarchyViewSwitcher', () => {
    // The inner switcher should be removed; only the outer one in App.tsx remains
    expect(source).not.toContain('<HierarchyViewSwitcher')
  })

  it('uses the drag reparent hook or createDragState', () => {
    const usesDragHelper = source.includes('useDragReparent') || source.includes('createDragState') || source.includes('wouldCreateCycle')
    expect(usesDragHelper).toBe(true)
  })
})

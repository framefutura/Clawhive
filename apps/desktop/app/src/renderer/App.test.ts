import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function indexOfOrThrow(source: string, needle: string): number {
  const index = source.indexOf(needle)
  expect(index).toBeGreaterThanOrEqual(0)
  return index
}

describe('App Wave 1 registry shell', () => {
  const filePath = path.resolve(import.meta.dirname, './App.tsx')
  const source = fs.readFileSync(filePath, 'utf8')

  it('removes the placeholder default agent state', () => {
    expect(source).not.toContain("id: 'default'")
  })

  it('tracks real agent registry and right-panel seam state', () => {
    expect(source).toContain('useState<AgentRecord[]>([])')
    expect(source).toContain('selectedSubjectId')
    expect(source).toContain('rightPanelPinned')
    expect(source).toContain('rightPanelSubjectId')
  })

  it('loads agents from the preload bridge', () => {
    expect(source).toContain('window.clawhive.getAgents()')
  })

  it('declares loadAgents before using it in callbacks', () => {
    const loadAgentsDeclaration = indexOfOrThrow(source, 'const loadAgents = useCallback(')
    const firstLaunchHandler = indexOfOrThrow(source, 'const handleFirstLaunchComplete = useCallback(')

    expect(loadAgentsDeclaration).toBeLessThan(firstLaunchHandler)
  })

  it('renders the right pane via AgentDetailPanel component', () => {
    expect(source).toContain('const rightPanelAgent = rightPanelSubjectId')
    expect(source).toContain('<AgentDetailPanel')
    expect(source).toContain('agent={rightPanelAgent}')
  })

  it('tracks hierarchy view mode and renders the switcher component', () => {
    expect(source).toContain("useState<'hierarchy' | 'org-chart' | 'teams'>('hierarchy')")
    expect(source).toContain('<HierarchyViewSwitcher')
    expect(source).toContain('onChange={setHierarchyViewMode}')
  })

  it('passes hierarchy view mode into OrgTree', () => {
    expect(source).toContain('hierarchyViewMode')
    expect(source).toContain('viewMode={hierarchyViewMode}')
  })

  it('wires delete agent through the preload bridge', () => {
    expect(source).toContain('window.clawhive.deleteAgent(')
    expect(source).not.toContain('Delete agent not implemented yet')
  })

  it('wires doc save through onSaveAgentDoc callback', () => {
    expect(source).toContain('onSaveAgentDoc={async (agentId, docKey, content)')
    expect(source).toContain('window.clawhive.updateAgent(agentId, { docs: nextDocs })')
  })
})

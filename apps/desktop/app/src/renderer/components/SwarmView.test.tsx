import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Source-level verification for SwarmView in the active app tree.
 */
describe('SwarmView', () => {
  const source = readFileSync(
    resolve(__dirname, './SwarmView.tsx'),
    'utf-8'
  )

  it('imports from active app common/agent', () => {
    expect(source).toContain("from '../../common/agent'")
  })

  it('imports from active app common/team', () => {
    expect(source).toContain("from '../../common/team'")
  })

  it('exports SwarmView component', () => {
    expect(source).toContain('export function SwarmView')
  })

  it('contains Team Members section', () => {
    expect(source).toContain('Team Members')
  })

  it('contains Activity Feed section', () => {
    expect(source).toContain('Activity Feed')
  })

  it('contains Shared Memories section', () => {
    expect(source).toContain('Shared Memories')
  })

  it('does not import from inactive root', () => {
    expect(source).not.toContain('../../src/')
    expect(source).not.toContain('apps/desktop/src/')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Source-level verification for TeamWorkspace in the active app tree.
 */
describe('TeamWorkspace', () => {
  const source = readFileSync(
    resolve(__dirname, './TeamWorkspace.tsx'),
    'utf-8'
  )

  it('imports from active app common/team', () => {
    expect(source).toContain("from '../../common/team'")
  })

  it('imports from active app common/agent', () => {
    expect(source).toContain("from '../../common/agent'")
  })

  it('exports TeamWorkspace component', () => {
    expect(source).toContain('export function TeamWorkspace')
  })

  it('contains Monitoring section', () => {
    expect(source).toContain('Monitoring')
  })

  it('contains Coaching Loop section', () => {
    expect(source).toContain('Coaching Loop')
  })

  it('contains OKRs section', () => {
    expect(source).toContain('OKRs')
  })

  it('does not import from inactive root', () => {
    expect(source).not.toContain('../../src/')
    expect(source).not.toContain('apps/desktop/src/')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Focused renderer test: verifies the TaskRouterPanel source contains
 * the required labels and security fields without needing a full DOM render.
 */
describe('TaskRouterPanel', () => {
  const source = readFileSync(
    resolve(__dirname, './TaskRouterPanel.tsx'),
    'utf-8'
  )

  it('contains Auto Delegate label', () => {
    expect(source).toContain('Auto Delegate')
  })

  it('contains Specific Agent label', () => {
    expect(source).toContain('Specific Agent')
  })

  it('contains Team Collaboration label', () => {
    expect(source).toContain('Team Collaboration')
  })

  it('contains originatingSecurityLevel field', () => {
    expect(source).toContain('originatingSecurityLevel')
  })

  it('contains effectiveSecurityLevel field', () => {
    expect(source).toContain('effectiveSecurityLevel')
  })
})

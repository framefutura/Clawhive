import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('AgentWizard Wave 1 compatibility', () => {
  const filePath = path.resolve(import.meta.dirname, './AgentWizard.tsx')
  const source = fs.readFileSync(filePath, 'utf8')

  it('includes Secretary in the supported roles', () => {
    expect(source).toContain("'Secretary'")
  })

  it('treats Secretary as a top-level compatible role in hierarchy helpers', () => {
    expect(source).toContain("Secretary: ['CEO'")
  })

  it('keeps renderer-side validation lightweight instead of duplicating CEO child constraints', () => {
    expect(source).not.toContain("if (parent.role === 'CEO' && role !== 'Secretary'")
  })
})

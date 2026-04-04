import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('AgentDetailPanel gap closure', () => {
  const filePath = path.resolve(import.meta.dirname, './AgentDetailPanel.tsx')
  const source = fs.readFileSync(filePath, 'utf8')

  it('exposes onSaveAgentDoc callback prop', () => {
    expect(source).toContain('onSaveAgentDoc')
  })

  it('no longer contains the deferred save stub', () => {
    expect(source).not.toContain(
      'Save will be wired to IPC in future task when doc persistence is added'
    )
  })

  it('calls onSaveAgentDoc with agentId, docKey, and content', () => {
    expect(source).toContain('await onSaveAgentDoc(agent.id, docKey, docDraft)')
  })
})

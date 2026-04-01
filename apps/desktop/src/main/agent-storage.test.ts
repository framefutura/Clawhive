import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => tmpDir),
  },
}))

let tmpDir: string

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `clawhive-test-${Date.now()}`)
  await fs.mkdir(tmpDir, { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('agent-storage', () => {
  it('createAgentStorageDir creates the agent directory', async () => {
    const { createAgentStorageDir, getAgentStoragePath } = await import('./agent-storage.js')
    await createAgentStorageDir('agent-123')
    const dir = getAgentStoragePath('agent-123')
    const stat = await fs.stat(dir)
    expect(stat.isDirectory()).toBe(true)
  })

  it('createTeamStorageDir creates team dir with subdirs', async () => {
    const { createTeamStorageDir, getTeamStoragePath, TEAM_SUBDIRS } = await import('./agent-storage.js')
    await createTeamStorageDir('team-456')
    const base = getTeamStoragePath('team-456')
    const stat = await fs.stat(base)
    expect(stat.isDirectory()).toBe(true)
    for (const sub of TEAM_SUBDIRS) {
      const subStat = await fs.stat(path.join(base, sub))
      expect(subStat.isDirectory()).toBe(true)
    }
  })

  it('deleteAgentStorageDir removes the agent directory', async () => {
    const { createAgentStorageDir, deleteAgentStorageDir, getAgentStoragePath } = await import('./agent-storage.js')
    await createAgentStorageDir('agent-del')
    const dir = getAgentStoragePath('agent-del')
    await deleteAgentStorageDir('agent-del')
    await expect(fs.access(dir)).rejects.toThrow()
  })
})

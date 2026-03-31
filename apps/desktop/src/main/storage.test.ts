import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

// Mock electron before importing modules that use it
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp/clawhive-test-userdata',
    isPackaged: false,
  },
}))

// Import after mocking
const {
  loadDatabase,
  closeDatabase,
  createSession,
  getSessions,
  deleteSession,
  addMessage,
  getMessages,
  createAgent,
  getAgents,
  loadGene,
  getAgentGenes,
  getConfig,
  setConfig,
  updateSessionSecurity,
} = await import('./storage.js')

describe('Storage Module', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clawhive-test-'))
    await loadDatabase({ dataPath: tempDir })
  })

  afterEach(async () => {
    closeDatabase()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  it('should create and retrieve sessions', () => {
    const session = {
      id: 'test-session-1',
      agent_id: 'agent-1',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
    }

    createSession(session)
    const sessions = getSessions()

    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe(session.id)
    expect(sessions[0].agent_id).toBe(session.agent_id)
  })

  it('should delete sessions', () => {
    createSession({
      id: 'session-to-delete',
      agent_id: 'agent-1',
      provider: 'openai',
      model: 'gpt-4',
    })

    deleteSession('session-to-delete')
    const sessions = getSessions()

    expect(sessions).toHaveLength(0)
  })

  it('should add and retrieve messages', () => {
    const sessionId = 'msg-test-session'
    createSession({
      id: sessionId,
      agent_id: 'agent-1',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
    })

    addMessage({
      id: 'msg-1',
      session_id: sessionId,
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    })

    const messages = getMessages(sessionId)
    expect(messages).toHaveLength(1)
    expect(messages[0].content).toBe('Hello')
    expect(messages[0].role).toBe('user')
  })

  it('should create and retrieve agents', () => {
    createAgent({
      id: 'agent-1',
      name: 'Test Agent',
      role: 'Assistant',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
    })

    const agents = getAgents()
    expect(agents).toHaveLength(1)
    expect(agents[0].name).toBe('Test Agent')
    expect(agents[0].role).toBe('Assistant')
  })

  it('should load and retrieve agent genes', () => {
    createAgent({
      id: 'agent-with-genes',
      name: 'Gene Agent',
      role: 'Coder',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
    })

    loadGene('agent-with-genes', 'code-write')
    loadGene('agent-with-genes', 'data-analysis')

    const genes = getAgentGenes('agent-with-genes')
    expect(genes).toHaveLength(2)
    expect(genes).toContain('code-write')
    expect(genes).toContain('data-analysis')
  })

  it('should store and retrieve config values', () => {
    setConfig('test-key', 'test-value')
    const value = getConfig('test-key')
    expect(value).toBe('test-value')
  })

  it('should return null for missing config', () => {
    const value = getConfig('non-existent-key')
    expect(value).toBeNull()
  })

  it('should persist data to encrypted file', async () => {
    // Create session and save
    createSession({
      id: 'persist-test',
      agent_id: 'agent-1',
      provider: 'anthropic',
      model: 'claude',
    })

    // Close and reopen database
    closeDatabase()
    await loadDatabase({ dataPath: tempDir })

    // Verify data persisted
    const sessions = getSessions()
    expect(sessions.some(s => s.id === 'persist-test')).toBe(true)
  })

  it('should update session security level and role', () => {
    createSession({
      id: 'security-test-session',
      agent_id: 'agent-1',
      provider: 'anthropic',
      model: 'claude-sonnet-4',
      security_level: 'medium',
      role_name: null,
    })

    updateSessionSecurity('security-test-session', 'high', 'CEO Agent')

    const sessions = getSessions()
    const updated = sessions.find(s => s.id === 'security-test-session')
    expect(updated?.security_level).toBe('high')
    expect(updated?.role_name).toBe('CEO Agent')
  })

  it('should persist session security after reload', async () => {
    createSession({
      id: 'security-persist-test',
      agent_id: 'agent-1',
      provider: 'anthropic',
      model: 'claude',
      security_level: 'medium',
      role_name: null,
    })

    updateSessionSecurity('security-persist-test', 'low', 'Individual Agent')

    // Reload database
    closeDatabase()
    await loadDatabase({ dataPath: tempDir })

    const sessions = getSessions()
    const reloaded = sessions.find(s => s.id === 'security-persist-test')
    expect(reloaded?.security_level).toBe('low')
    expect(reloaded?.role_name).toBe('Individual Agent')
  })
})

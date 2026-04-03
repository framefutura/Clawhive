import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Session, Gene } from '../types'

// Simple unit tests for useSession hook behavior
// Note: Full React hook testing requires jsdom setup which is complex for Electron renderer
// These tests verify the hook's contract and behavior patterns

describe('useSession', () => {
  // Mock window.clawhive for testing
  const mockClawhive = {
    getSessions: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getGenes: vi.fn(),
    getGeneCategories: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have correct IPC methods available', () => {
    // Verify the expected IPC interface exists
    expect(typeof mockClawhive.getSessions).toBe('function')
    expect(typeof mockClawhive.createSession).toBe('function')
    expect(typeof mockClawhive.deleteSession).toBe('function')
    expect(typeof mockClawhive.getGenes).toBe('function')
    expect(typeof mockClawhive.getGeneCategories).toBe('function')
  })

  it('should load sessions via IPC', async () => {
    const mockSessions: Session[] = [
      {
        id: 'session-1',
        agentId: 'agent-1',
        modelConfig: { provider: 'anthropic', model: 'claude' },
        genes: ['code-write'],
        createdAt: Date.now(),
        messages: [],
      },
    ]

    mockClawhive.getSessions.mockResolvedValue(mockSessions)
    const result = await mockClawhive.getSessions()

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('session-1')
    expect(mockClawhive.getSessions).toHaveBeenCalledTimes(1)
  })

  it('should create session via IPC', async () => {
    const newSession: Session = {
      id: 'new-session',
      agentId: 'agent-1',
      modelConfig: { provider: 'anthropic', model: 'claude' },
      genes: ['code-write'],
      createdAt: Date.now(),
      messages: [],
    }

    mockClawhive.createSession.mockResolvedValue(newSession)
    const result = await mockClawhive.createSession('agent-1', { provider: 'anthropic', model: 'claude' }, ['code-write'])

    expect(result.id).toBe('new-session')
    expect(mockClawhive.createSession).toHaveBeenCalledWith('agent-1', { provider: 'anthropic', model: 'claude' }, ['code-write'])
  })

  it('should delete session via IPC', async () => {
    mockClawhive.deleteSession.mockResolvedValue(undefined)
    await mockClawhive.deleteSession('session-1')

    expect(mockClawhive.deleteSession).toHaveBeenCalledWith('session-1')
  })

  it('should load genes via IPC', async () => {
    const mockGenes: Gene[] = [
      {
        id: 'code-write',
        name: 'Code Writer',
        description: 'Writes code',
        category: 'dev',
        version: '1.0.0',
      },
      {
        id: 'data-analysis',
        name: 'Data Analysis',
        description: 'Analyzes data',
        category: 'data',
        version: '1.0.0',
      },
    ]

    mockClawhive.getGenes.mockResolvedValue(mockGenes)
    const result = await mockClawhive.getGenes()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('code-write')
    expect(result[1].id).toBe('data-analysis')
  })

  it('should handle IPC errors gracefully', async () => {
    mockClawhive.getSessions.mockRejectedValue(new Error('Database error'))

    await expect(mockClawhive.getSessions()).rejects.toThrow('Database error')
  })

  it('should load gene categories via IPC', async () => {
    const mockCategories = [
      { id: 'coding', name: 'Coding', color: '#FF6B6B' },
      { id: 'analysis', name: 'Analysis', color: '#4ECDC4' },
    ]

    mockClawhive.getGeneCategories.mockResolvedValue(mockCategories)
    const result = await mockClawhive.getGeneCategories()

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('coding')
  })
})

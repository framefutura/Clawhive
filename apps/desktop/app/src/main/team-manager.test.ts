import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use vi.hoisted so the mock object is available when vi.mock factory runs
const mockDb = vi.hoisted(() => ({
  createTeam: vi.fn(),
  getTeam: vi.fn(),
  listTeams: vi.fn(() => []),
  deleteTeam: vi.fn(),
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  listTeamMembers: vi.fn(() => []),
  listAgentTeams: vi.fn(() => []),
  getAgentById: vi.fn(),
  createSharedMemory: vi.fn(),
  listTeamMemories: vi.fn(() => []),
  listAgentMemories: vi.fn(() => []),
  queryTeamMemories: vi.fn(() => []),
  deleteSharedMemory: vi.fn(),
  createCoachingEntry: vi.fn(),
  listCoachingEntries: vi.fn(() => []),
  createOkr: vi.fn(),
  listOkrs: vi.fn(() => []),
}))

vi.mock('./storage.js', () => mockDb)

// Mock agent-storage
vi.mock('./agent-storage.js', () => ({
  createTeamStorageDir: vi.fn(async () => {}),
  deleteTeamStorageDir: vi.fn(async () => {}),
  addAgentToTeamStorage: vi.fn(async () => {}),
}))

import { TeamManager } from './team-manager.js'
import type { AgentRecord } from '../common/agent.js'

function makeAgent(overrides: Partial<AgentRecord> & { id: string; name: string; role: AgentRecord['role'] }): AgentRecord {
  return {
    genes: [],
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    allowedTools: [],
    defaultSecurityLevel: 'medium',
    status: 'idle',
    lifecycle: 'persistent',
    docs: { soul: '', heartbeat: '', tools: '', agents: '', interaction: '' },
    customizations: { skills: [], knowledgeDocs: [], mcpServers: [], cliTools: [], documentRefs: [], toolRefs: [] },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

describe('TeamManager', () => {
  let tm: TeamManager

  beforeEach(() => {
    vi.clearAllMocks()
    tm = new TeamManager()
  })

  // Test 1: team creation creates shared storage and leader membership
  describe('createTeam', () => {
    it('creates team with shared storage and auto-adds leader as member', async () => {
      const leader = makeAgent({ id: 'leader-1', name: 'Alice', role: 'Team Leader' })
      mockDb.getAgentById.mockReturnValue(leader)
      mockDb.getTeam.mockReturnValue({
        id: 'team-1',
        name: 'Alpha',
        leader_id: 'leader-1',
        department: null,
        workspace_id: 'team-1',
        created_at: Date.now(),
      })

      const team = await tm.createTeam('Alpha', 'leader-1', 'Engineering')

      expect(team.name).toBe('Alpha')
      expect(team.leaderId).toBe('leader-1')
      expect(mockDb.createTeam).toHaveBeenCalledOnce()
      expect(mockDb.addTeamMember).toHaveBeenCalledOnce()
    })
  })

  // Test 2: shared/private memory queries distinguish team-shared from agent-private
  describe('memory queries', () => {
    it('shareMemory creates a team-shared record with minSecurityLevel', () => {
      mockDb.getTeam.mockReturnValue({ id: 'team-1', leader_id: 'leader-1' })
      mockDb.listTeamMembers.mockReturnValue(['leader-1', 'agent-2'])

      const mem = tm.shareMemory('team-1', 'agent-2', {
        type: 'conversation',
        content: 'hello world',
        tags: ['test'],
        minSecurityLevel: 'high',
        sharedScope: 'team',
      })

      expect(mem.teamId).toBe('team-1')
      expect(mem.sharedScope).toBe('team')
      expect(mem.minSecurityLevel).toBe('high')
      expect(mockDb.createSharedMemory).toHaveBeenCalledOnce()
    })

    it('queryMemory returns team memories via DB search', () => {
      mockDb.queryTeamMemories.mockReturnValue([
        {
          id: 'mem-1',
          team_id: 'team-1',
          agent_id: 'agent-2',
          type: 'note',
          content: 'shared note',
          tags: '["test"]',
          min_security_level: 'medium',
          shared_scope: 'team',
          shared_at: Date.now(),
        },
      ])

      const results = tm.queryMemory('team-1', 'shared')
      expect(results).toHaveLength(1)
      expect(results[0].sharedScope).toBe('team')
    })
  })

  // Test 3: coaching notes and OKR entries
  describe('coaching and OKRs', () => {
    it('createCoachingEntry stores a coaching note for a team member', () => {
      mockDb.getTeam.mockReturnValue({ id: 'team-1', leader_id: 'leader-1' })
      mockDb.createCoachingEntry.mockReturnValue(undefined)

      const entry = tm.createCoachingEntry('team-1', 'leader-1', 'agent-2', 'Great progress on task X')

      expect(entry.teamId).toBe('team-1')
      expect(entry.leaderId).toBe('leader-1')
      expect(entry.agentId).toBe('agent-2')
      expect(entry.note).toBe('Great progress on task X')
      expect(mockDb.createCoachingEntry).toHaveBeenCalledOnce()
    })

    it('listCoachingEntries returns entries for a team', () => {
      mockDb.listCoachingEntries.mockReturnValue([
        {
          id: 'c-1',
          team_id: 'team-1',
          leader_id: 'leader-1',
          agent_id: 'agent-2',
          note: 'Good work',
          created_at: Date.now(),
        },
      ])

      const entries = tm.listCoachingEntries('team-1')
      expect(entries).toHaveLength(1)
      expect(entries[0].note).toBe('Good work')
    })

    it('createOkr stores an OKR with key results and review cadence', () => {
      mockDb.getTeam.mockReturnValue({ id: 'team-1', leader_id: 'leader-1' })
      mockDb.createOkr.mockReturnValue(undefined)

      const okr = tm.createOkr('team-1', 'leader-1', {
        objective: 'Ship v2',
        keyResults: ['Complete API', 'Pass all tests'],
        reviewCadence: 'weekly',
      })

      expect(okr.teamId).toBe('team-1')
      expect(okr.objective).toBe('Ship v2')
      expect(okr.keyResults).toEqual(['Complete API', 'Pass all tests'])
      expect(okr.reviewCadence).toBe('weekly')
      expect(mockDb.createOkr).toHaveBeenCalledOnce()
    })

    it('listOkrs returns OKRs for a team', () => {
      mockDb.listOkrs.mockReturnValue([
        {
          id: 'okr-1',
          team_id: 'team-1',
          leader_id: 'leader-1',
          objective: 'Ship v2',
          key_results: '["Complete API","Pass all tests"]',
          review_cadence: 'weekly',
          created_at: Date.now(),
        },
      ])

      const okrs = tm.listOkrs('team-1')
      expect(okrs).toHaveLength(1)
      expect(okrs[0].objective).toBe('Ship v2')
      expect(okrs[0].keyResults).toEqual(['Complete API', 'Pass all tests'])
    })
  })
})

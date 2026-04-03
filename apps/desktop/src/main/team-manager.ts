/**
 * Team Manager - manages team lifecycle, membership, and shared memory
 *
 * Provides team creation with workspace isolation, member management,
 * and shared memory with full-text search and tag filtering.
 */

import type { AgentRecord } from '../common/agent.js'
import type { TeamRecord, SharedMemory } from '../common/team.js'
import {
  createTeam as createTeamDb,
  getTeam,
  listTeams as listTeamsDb,
  deleteTeam as deleteTeamDb,
  addTeamMember as addTeamMemberDb,
  removeTeamMember as removeTeamMemberDb,
  listTeamMembers as listTeamMembersDb,
  listAgentTeams as listAgentTeamsDb,
  getAgentById,
  createSharedMemory as createSharedMemoryDb,
  listTeamMemories as listTeamMemoriesDb,
  listAgentMemories as listAgentMemoriesDb,
  queryTeamMemories as queryTeamMemoriesDb,
  deleteSharedMemory as deleteSharedMemoryDb,
  type DbSharedMemory,
  type DbTeam,
} from './storage.js'
import {
  createTeamStorageDir,
  deleteTeamStorageDir,
  addAgentToTeamStorage,
} from './agent-storage.js'

/** Convert DB team record to app TeamRecord */
function toTeamRecord(dbTeam: DbTeam): TeamRecord {
  return {
    id: dbTeam.id,
    name: dbTeam.name,
    leaderId: dbTeam.leader_id,
    department: dbTeam.department ?? undefined,
    workspaceId: dbTeam.workspace_id ?? undefined,
    createdAt: dbTeam.created_at,
  }
}

/** Convert DB shared memory to app SharedMemory */
function toSharedMemory(dbMem: DbSharedMemory): SharedMemory {
  let tags: string[] = []
  try {
    tags = JSON.parse(dbMem.tags)
  } catch {
    tags = []
  }
  return {
    id: dbMem.id,
    teamId: dbMem.team_id ?? undefined,
    agentId: dbMem.agent_id ?? undefined,
    type: dbMem.type,
    content: dbMem.content,
    tags,
    sharedAt: dbMem.shared_at,
  }
}

export class TeamManager {
  /**
   * Create a new team with workspace directory isolation.
   * The leader is automatically added as a team member.
   */
  async createTeam(name: string, leaderId: string, department?: string): Promise<TeamRecord> {
    // Validate leader exists
    const leader = getAgentById(leaderId)
    if (!leader) {
      throw new Error(`Leader agent not found: ${leaderId}`)
    }

    const id = crypto.randomUUID()
    const workspaceId = id // team workspace ID matches team ID

    createTeamDb({
      id,
      name,
      leader_id: leaderId,
      department: department ?? undefined,
      workspace_id: workspaceId,
    })

    // Create workspace directory structure
    await createTeamStorageDir(id)

    // Auto-add leader as member
    addTeamMemberDb(id, leaderId)
    await addAgentToTeamStorage(id, leaderId)

    const dbTeam = getTeam(id)
    if (!dbTeam) {
      throw new Error('Team creation failed')
    }

    return toTeamRecord(dbTeam)
  }

  /**
   * Add a member to an existing team.
   * Creates a private agent directory within the team workspace.
   */
  async addMember(teamId: string, agentId: string): Promise<void> {
    const team = getTeam(teamId)
    if (!team) {
      throw new Error(`Team not found: ${teamId}`)
    }

    const agent = getAgentById(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    addTeamMemberDb(teamId, agentId)
    await addAgentToTeamStorage(teamId, agentId)
  }

  /**
   * Remove a member from a team.
   * Leaders cannot be removed (delete team instead).
   */
  removeMember(teamId: string, agentId: string): void {
    const team = getTeam(teamId)
    if (!team) {
      throw new Error(`Team not found: ${teamId}`)
    }

    if (team.leader_id === agentId) {
      throw new Error('Cannot remove team leader. Delete the team instead.')
    }

    removeTeamMemberDb(teamId, agentId)
  }

  /**
   * List all teams, optionally filtered by agent membership.
   */
  listTeams(agentId?: string): TeamRecord[] {
    if (agentId) {
      const teamIds = listAgentTeamsDb(agentId)
      return teamIds
        .map((id) => getTeam(id))
        .filter((t): t is DbTeam => t !== null)
        .map(toTeamRecord)
    }
    return listTeamsDb().map(toTeamRecord)
  }

  /**
   * List all member agents of a team.
   */
  listMembers(teamId: string): AgentRecord[] {
    const memberIds = listTeamMembersDb(teamId)
    return memberIds
      .map((id) => getAgentById(id))
      .filter((a): a is AgentRecord => a !== undefined && a !== null)
  }

  /**
   * Delete a team and its workspace directory.
   */
  async deleteTeam(teamId: string): Promise<void> {
    deleteTeamDb(teamId)
    await deleteTeamStorageDir(teamId)
  }

  /**
   * Share a memory item to a team.
   * Any team member can share. Content is tagged for filtering.
   */
  shareMemory(
    teamId: string,
    agentId: string,
    memory: Omit<SharedMemory, 'id' | 'sharedAt' | 'teamId' | 'agentId'>
  ): SharedMemory {
    const team = getTeam(teamId)
    if (!team) {
      throw new Error(`Team not found: ${teamId}`)
    }

    // Verify agent is a team member
    const members = listTeamMembersDb(teamId)
    if (!members.includes(agentId)) {
      throw new Error(`Agent ${agentId} is not a member of team ${teamId}`)
    }

    const id = crypto.randomUUID()

    createSharedMemoryDb({
      id,
      team_id: teamId,
      agent_id: agentId,
      type: memory.type,
      content: memory.content,
      tags: JSON.stringify(memory.tags),
    })

    return {
      id,
      teamId,
      agentId,
      type: memory.type,
      content: memory.content,
      tags: memory.tags,
      sharedAt: Date.now(),
    }
  }

  /**
   * Query team shared memories with full-text search and optional tag filtering.
   * MVP: simple LIKE-based search. Future: vector/semantic search.
   */
  queryMemory(teamId: string, query: string, tags?: string[]): SharedMemory[] {
    return queryTeamMemoriesDb(teamId, query, tags).map(toSharedMemory)
  }

  /**
   * Get all shared memories for a specific agent (across all teams).
   */
  getAgentMemory(agentId: string): SharedMemory[] {
    return listAgentMemoriesDb(agentId).map(toSharedMemory)
  }

  /**
   * Get all shared memories for a team.
   */
  getTeamMemories(teamId: string): SharedMemory[] {
    return listTeamMemoriesDb(teamId).map(toSharedMemory)
  }

  /**
   * Delete a shared memory record.
   */
  deleteMemory(memoryId: string): void {
    deleteSharedMemoryDb(memoryId)
  }
}

/**
 * Team Manager - manages team lifecycle, membership, shared memory,
 * coaching entries, and OKRs in the active app root.
 */

import type { AgentRecord } from '../common/agent.js'
import type { TeamRecord, SharedMemory, CoachingEntry, TeamOkr } from '../common/team.js'
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
  createCoachingEntry as createCoachingEntryDb,
  listCoachingEntries as listCoachingEntriesDb,
  createOkr as createOkrDb,
  listOkrs as listOkrsDb,
  type DbSharedMemory,
  type DbTeam,
  type DbCoachingEntry,
  type DbTeamOkr,
} from './storage.js'
import {
  createTeamStorageDir,
  deleteTeamStorageDir,
  addAgentToTeamStorage,
} from './agent-storage.js'

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
    minSecurityLevel: dbMem.min_security_level,
    sharedScope: dbMem.shared_scope as 'team' | 'private',
    sharedAt: dbMem.shared_at,
  }
}

function toCoachingEntry(db: DbCoachingEntry): CoachingEntry {
  return {
    id: db.id,
    teamId: db.team_id,
    leaderId: db.leader_id,
    agentId: db.agent_id,
    note: db.note,
    createdAt: db.created_at,
  }
}

function toTeamOkr(db: DbTeamOkr): TeamOkr {
  let keyResults: string[] = []
  try {
    keyResults = JSON.parse(db.key_results)
  } catch {
    keyResults = []
  }
  return {
    id: db.id,
    teamId: db.team_id,
    leaderId: db.leader_id,
    objective: db.objective,
    keyResults,
    reviewCadence: db.review_cadence as 'weekly' | 'biweekly' | 'monthly',
    createdAt: db.created_at,
  }
}

export class TeamManager {
  async createTeam(name: string, leaderId: string, department?: string): Promise<TeamRecord> {
    const leader = getAgentById(leaderId)
    if (!leader) {
      throw new Error(`Leader agent not found: ${leaderId}`)
    }

    const id = crypto.randomUUID()
    const workspaceId = id

    createTeamDb({
      id,
      name,
      leader_id: leaderId,
      department: department ?? undefined,
      workspace_id: workspaceId,
    })

    await createTeamStorageDir(id)
    addTeamMemberDb(id, leaderId)
    await addAgentToTeamStorage(id, leaderId)

    const dbTeam = getTeam(id)
    if (!dbTeam) {
      throw new Error('Team creation failed')
    }

    return toTeamRecord(dbTeam)
  }

  async addMember(teamId: string, agentId: string): Promise<void> {
    const team = getTeam(teamId)
    if (!team) throw new Error(`Team not found: ${teamId}`)
    const agent = getAgentById(agentId)
    if (!agent) throw new Error(`Agent not found: ${agentId}`)
    addTeamMemberDb(teamId, agentId)
    await addAgentToTeamStorage(teamId, agentId)
  }

  removeMember(teamId: string, agentId: string): void {
    const team = getTeam(teamId)
    if (!team) throw new Error(`Team not found: ${teamId}`)
    if (team.leader_id === agentId) {
      throw new Error('Cannot remove team leader. Delete the team instead.')
    }
    removeTeamMemberDb(teamId, agentId)
  }

  listTeams(agentId?: string): TeamRecord[] {
    if (agentId) {
      return listAgentTeamsDb(agentId)
        .map((id) => getTeam(id))
        .filter((t): t is DbTeam => t !== null)
        .map(toTeamRecord)
    }
    return listTeamsDb().map(toTeamRecord)
  }

  listMembers(teamId: string): AgentRecord[] {
    return listTeamMembersDb(teamId)
      .map((id) => getAgentById(id))
      .filter((a): a is AgentRecord => a !== undefined && a !== null)
  }

  async deleteTeam(teamId: string): Promise<void> {
    deleteTeamDb(teamId)
    await deleteTeamStorageDir(teamId)
  }

  shareMemory(
    teamId: string,
    agentId: string,
    memory: Omit<SharedMemory, 'id' | 'sharedAt' | 'teamId' | 'agentId'>
  ): SharedMemory {
    const team = getTeam(teamId)
    if (!team) throw new Error(`Team not found: ${teamId}`)
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
      min_security_level: memory.minSecurityLevel,
      shared_scope: memory.sharedScope,
    })

    return {
      id,
      teamId,
      agentId,
      type: memory.type,
      content: memory.content,
      tags: memory.tags,
      minSecurityLevel: memory.minSecurityLevel,
      sharedScope: memory.sharedScope,
      sharedAt: Date.now(),
    }
  }

  queryMemory(teamId: string, query: string, tags?: string[]): SharedMemory[] {
    return queryTeamMemoriesDb(teamId, query, tags).map(toSharedMemory)
  }

  getAgentMemory(agentId: string): SharedMemory[] {
    return listAgentMemoriesDb(agentId).map(toSharedMemory)
  }

  getTeamMemories(teamId: string): SharedMemory[] {
    return listTeamMemoriesDb(teamId).map(toSharedMemory)
  }

  deleteMemory(memoryId: string): void {
    deleteSharedMemoryDb(memoryId)
  }

  createCoachingEntry(teamId: string, leaderId: string, agentId: string, note: string): CoachingEntry {
    const team = getTeam(teamId)
    if (!team) throw new Error(`Team not found: ${teamId}`)

    const id = crypto.randomUUID()
    createCoachingEntryDb({ id, team_id: teamId, leader_id: leaderId, agent_id: agentId, note })

    return { id, teamId, leaderId, agentId, note, createdAt: Date.now() }
  }

  listCoachingEntries(teamId: string): CoachingEntry[] {
    return listCoachingEntriesDb(teamId).map(toCoachingEntry)
  }

  createOkr(
    teamId: string,
    leaderId: string,
    okr: { objective: string; keyResults: string[]; reviewCadence: 'weekly' | 'biweekly' | 'monthly' }
  ): TeamOkr {
    const team = getTeam(teamId)
    if (!team) throw new Error(`Team not found: ${teamId}`)

    const id = crypto.randomUUID()
    createOkrDb({
      id,
      team_id: teamId,
      leader_id: leaderId,
      objective: okr.objective,
      key_results: JSON.stringify(okr.keyResults),
      review_cadence: okr.reviewCadence,
    })

    return {
      id,
      teamId,
      leaderId,
      objective: okr.objective,
      keyResults: okr.keyResults,
      reviewCadence: okr.reviewCadence,
      createdAt: Date.now(),
    }
  }

  listOkrs(teamId: string): TeamOkr[] {
    return listOkrsDb(teamId).map(toTeamOkr)
  }
}

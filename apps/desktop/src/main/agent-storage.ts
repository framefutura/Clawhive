import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export const TEAM_SUBDIRS = ['shared_files', 'memory', 'output'] as const
export const AGENT_IN_TEAM_SUBDIR = 'agent_private' as const

function getUserDataPath(): string {
  if (typeof app !== 'undefined' && app.getPath) {
    return app.getPath('userData')
  }
  return path.join(process.env.HOME || process.env.USERPROFILE || '.', '.clawhive')
}

export function getAgentStoragePath(agentId: string): string {
  return path.join(getUserDataPath(), 'agents', agentId)
}

export function getTeamStoragePath(teamId: string): string {
  return path.join(getUserDataPath(), 'teams', teamId)
}

export function getAgentInTeamPath(teamId: string, agentId: string): string {
  return path.join(getTeamStoragePath(teamId), AGENT_IN_TEAM_SUBDIR, agentId)
}

export async function createAgentStorageDir(agentId: string): Promise<void> {
  const dir = getAgentStoragePath(agentId)
  await fs.mkdir(dir, { recursive: true })
}

export async function createTeamStorageDir(teamId: string): Promise<void> {
  const base = getTeamStoragePath(teamId)
  await fs.mkdir(base, { recursive: true })
  for (const sub of TEAM_SUBDIRS) {
    await fs.mkdir(path.join(base, sub), { recursive: true })
  }
}

export async function addAgentToTeamStorage(teamId: string, agentId: string): Promise<void> {
  await createTeamStorageDir(teamId)
  const agentDir = getAgentInTeamPath(teamId, agentId)
  await fs.mkdir(agentDir, { recursive: true })
}

export async function deleteAgentStorageDir(agentId: string): Promise<void> {
  const dir = getAgentStoragePath(agentId)
  await fs.rm(dir, { recursive: true, force: true })
}

export async function deleteTeamStorageDir(teamId: string): Promise<void> {
  const dir = getTeamStoragePath(teamId)
  await fs.rm(dir, { recursive: true, force: true })
}

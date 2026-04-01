import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import type { AgentRecord, AgentRole } from '../common/agent.js'
import {
  createAgent as createAgentDb,
  updateAgent as updateAgentDb,
  deleteAgent as deleteAgentDb,
  getAgentById,
  getAgents as getAgentsDb,
} from './storage.js'

export interface TreeNode<T> {
  data: T
  children: TreeNode<T>[]
}

const HIERARCHY_RULES: Record<AgentRole, AgentRole[] | null> = {
  CEO: ['Department Head', 'COO'],
  CFO: ['Department Head'],
  COO: ['Department Head'],
  'Department Head': ['Team Leader'],
  'Team Leader': ['Individual Agent'],
  'Individual Agent': null,
}

function getUserDataPath(): string {
  if (typeof app !== 'undefined' && app.getPath) {
    return app.getPath('userData')
  }
  return path.join(process.env.HOME || process.env.USERPROFILE || '.', '.clawhive')
}

function getAgentStoragePath(agentId: string): string {
  return path.join(getUserDataPath(), 'agents', agentId)
}

export async function createAgentStorageDir(agentId: string): Promise<void> {
  const dir = getAgentStoragePath(agentId)
  await fs.mkdir(dir, { recursive: true })
}

export class AgentRegistry {
  createAgent(agent: Omit<AgentRecord, 'id' | 'createdAt' | 'updatedAt'>): AgentRecord {
    const id = crypto.randomUUID()
    const now = Date.now()

    const validation = this.validateHierarchy(agent.parentId, agent.role)
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid hierarchy')
    }

    const record: AgentRecord = {
      ...agent,
      id,
      genes: agent.genes ?? [],
      allowedTools: agent.allowedTools ?? [],
      defaultSecurityLevel: agent.defaultSecurityLevel ?? 'medium',
      createdAt: now,
      updatedAt: now,
    }

    createAgentDb(record)
    createAgentStorageDir(id).catch(console.error)

    return record
  }

  updateAgent(id: string, updates: Partial<AgentRecord>): AgentRecord {
    const existing = getAgentById(id)
    if (!existing) {
      throw new Error(`Agent not found: ${id}`)
    }

    if (updates.parentId !== undefined || updates.role !== undefined) {
      const parentId = updates.parentId !== undefined ? updates.parentId : existing.parentId
      const role = updates.role !== undefined ? updates.role : existing.role
      const validation = this.validateHierarchy(parentId, role, id)
      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid hierarchy')
      }
    }

    updateAgentDb(id, updates)
    const updated = getAgentById(id)
    if (!updated) {
      throw new Error(`Agent disappeared during update: ${id}`)
    }
    return updated
  }

  deleteAgent(id: string): void {
    deleteAgentDb(id)
  }

  getAgent(id: string): AgentRecord | undefined {
    return getAgentById(id) ?? undefined
  }

  listAgents(): AgentRecord[] {
    return getAgentsDb()
  }

  getHierarchy(): TreeNode<AgentRecord>[] {
    const agents = this.listAgents()
    const map = new Map<string, TreeNode<AgentRecord>>()

    for (const agent of agents) {
      map.set(agent.id, { data: agent, children: [] })
    }

    const roots: TreeNode<AgentRecord>[] = []
    for (const node of map.values()) {
      if (node.data.parentId) {
        const parent = map.get(node.data.parentId)
        if (parent) {
          parent.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    }

    return roots
  }

  getDescendants(agentId: string): AgentRecord[] {
    const result: AgentRecord[] = []
    const agents = this.listAgents()
    const map = new Map<string, string[]>()

    for (const agent of agents) {
      if (!map.has(agent.id)) {
        map.set(agent.id, [])
      }
      if (agent.parentId) {
        const siblings = map.get(agent.parentId) ?? []
        siblings.push(agent.id)
        map.set(agent.parentId, siblings)
      }
    }

    const queue = [...(map.get(agentId) ?? [])]
    while (queue.length > 0) {
      const currentId = queue.shift()!
      const child = agents.find(a => a.id === currentId)
      if (child) {
        result.push(child)
        queue.push(...(map.get(currentId) ?? []))
      }
    }

    return result
  }

  validateHierarchy(
    parentId: string | undefined,
    role: AgentRole,
    excludeId?: string
  ): { valid: boolean; reason?: string } {
    // Rule 1: Only one CEO allowed
    if (role === 'CEO') {
      if (parentId) {
        return { valid: false, reason: 'CEO cannot have a parent' }
      }
      const agents = this.listAgents()
      const existingCeo = agents.find(a => a.role === 'CEO' && a.id !== excludeId)
      if (existingCeo) {
        return { valid: false, reason: 'Only one CEO is allowed' }
      }
    }

    // Role-specific parent requirements
    if (role !== 'CEO' && !parentId) {
      return { valid: false, reason: `${role} must have a parent` }
    }

    if (parentId) {
      const parent = getAgentById(parentId)
      if (!parent) {
        return { valid: false, reason: 'Parent agent not found' }
      }

      // Rule 3: Individual Agent cannot have children (enforced when someone tries to parent under it)
      if (parent.role === 'Individual Agent') {
        return { valid: false, reason: 'Individual Agent cannot have subordinates' }
      }

      // Rule 4: Team Leader can only parent Individual Agent
      if (parent.role === 'Team Leader' && role !== 'Individual Agent') {
        return { valid: false, reason: 'Team Leader can only manage Individual Agents' }
      }

      // Rule 5: Department Head can only parent Team Leader
      if (parent.role === 'Department Head' && role !== 'Team Leader') {
        return { valid: false, reason: 'Department Head can only manage Team Leaders' }
      }

      // CFO and COO can only parent Department Heads
      if ((parent.role === 'CFO' || parent.role === 'COO') && role !== 'Department Head') {
        return { valid: false, reason: `${parent.role} can only manage Department Heads` }
      }

      // Rule 2: No circular references
      let current = parent
      while (current.parentId) {
        if (current.parentId === excludeId) {
          return { valid: false, reason: 'Circular reference detected' }
        }
        const next = getAgentById(current.parentId)
        if (!next) break
        current = next
      }
    }

    return { valid: true }
  }
}

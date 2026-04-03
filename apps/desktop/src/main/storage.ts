import initSqlJs from 'sql.js'
import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { encryptData, decryptData, encryptString, decryptString } from './crypto.js'
import type { GeneCategory } from './session.js'

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null
let db: InstanceType<NonNullable<typeof SQL>['Database']> | null = null
let dbPath: string | null = null

const DEFAULT_DB_NAME = 'clawhive.db'

export interface StorageConfig {
  dataPath: string
}

/**
 * Initialize sql.js WASM
 */
async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => {
        // sql.js WASM file location in Electron
        if (typeof app !== 'undefined' && app.isPackaged) {
          return path.join(process.resourcesPath, file)
        }
        // In development/test, resolve from sql.js package
        try {
          const sqlJsPath = require.resolve('sql.js')
          return path.join(path.dirname(sqlJsPath), '..', 'dist', file)
        } catch {
          return file
        }
      }
    })
  }
  return SQL
}

/**
 * Initialize database with schema
 */
function initSchema(database: typeof db) {
  if (!database) return

  database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      security_level TEXT NOT NULL DEFAULT 'medium' CHECK(security_level IN ('high', 'medium', 'low')),
      role_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('CEO', 'CFO', 'COO', 'Department Head', 'Team Leader', 'Individual Agent')),
      parentId TEXT REFERENCES agents(id) ON DELETE SET NULL,
      department TEXT,
      team TEXT,
      genes TEXT NOT NULL DEFAULT '[]',
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      apiKey TEXT,
      allowedTools TEXT NOT NULL DEFAULT '[]',
      defaultSecurityLevel TEXT NOT NULL DEFAULT 'medium',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(createdAt);
    CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parentId);

    -- DeskClaw Gene System Tables
    CREATE TABLE IF NOT EXISTS agent_genes (
      agent_id TEXT NOT NULL,
      gene_id TEXT NOT NULL,
      loaded_at INTEGER NOT NULL,
      PRIMARY KEY (agent_id, gene_id),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_agent_genes_agent ON agent_genes(agent_id);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Tab System Tables
    CREATE TABLE IF NOT EXISTS tabs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('chat', 'browser', 'file', 'workspace', 'settings')),
      content_ref TEXT,
      workspace_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_tabs_sort ON tabs(sort_order);
    CREATE INDEX IF NOT EXISTS idx_tabs_workspace ON tabs(workspace_id);

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active_task TEXT,
      agent_status TEXT NOT NULL DEFAULT 'idle',
      active_genes TEXT NOT NULL DEFAULT '[]',
      gene_score REAL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);

    -- Security Core: Roles table
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_level TEXT NOT NULL CHECK(default_level IN ('high', 'medium', 'low')),
      permissions TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

    -- Privacy Guard: Activity log table
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      session_id TEXT,
      agent_id TEXT,
      action_type TEXT NOT NULL,
      decision TEXT NOT NULL, -- allowed, denied, prompted
      reason TEXT,
      metadata TEXT -- JSON string for additional context
    );

    CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_activity_log_agent ON activity_log(agent_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_decision ON activity_log(decision);

    -- Privacy Guard: Safe zones configuration
    CREATE TABLE IF NOT EXISTS privacy_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Team System Tables
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      leader_id TEXT NOT NULL,
      department TEXT,
      workspace_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);

    CREATE TABLE IF NOT EXISTS team_members (
      team_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY (team_id, agent_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_agent ON team_members(agent_id);

    -- Shared Memory System
    CREATE TABLE IF NOT EXISTS shared_memories (
      id TEXT PRIMARY KEY,
      team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
      agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('conversation', 'file', 'note', 'task_result')),
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      shared_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_shared_memories_team ON shared_memories(team_id);
    CREATE INDEX IF NOT EXISTS idx_shared_memories_agent ON shared_memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_shared_memories_type ON shared_memories(type);

    -- Sensitive Data Authorization: Authorization requests
    CREATE TABLE IF NOT EXISTS sensitive_auth_requests (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      sensitive_types TEXT NOT NULL,
      purpose TEXT,
      tools_involved TEXT NOT NULL,
      privacy_risk TEXT,
      malware_check TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      approved_by TEXT,
      approved_at INTEGER,
      denied_by TEXT,
      denied_at INTEGER,
      denied_reason TEXT,
      request_data TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sensitive_auth_agent ON sensitive_auth_requests(agent_id);
    CREATE INDEX IF NOT EXISTS idx_sensitive_auth_status ON sensitive_auth_requests(status);

    -- Execution Reports
    CREATE TABLE IF NOT EXISTS execution_reports (
      id TEXT PRIMARY KEY,
      auth_request_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      action_summary TEXT NOT NULL,
      sensitive_types TEXT NOT NULL,
      tools_used TEXT NOT NULL,
      data_access_log TEXT NOT NULL,
      tool_execution_log TEXT NOT NULL,
      risk_events TEXT,
      warnings TEXT,
      data_wiped INTEGER NOT NULL DEFAULT 0,
      wiped_at INTEGER,
      summary TEXT NOT NULL,
      duration INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_execution_reports_request ON execution_reports(auth_request_id);
    CREATE INDEX IF NOT EXISTS idx_execution_reports_agent ON execution_reports(agent_id);

    -- Sensitive Type Registry
    CREATE TABLE IF NOT EXISTS sensitive_type_registry (
      id TEXT PRIMARY KEY,
      type_name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)

  // Seed default roles if table is empty
  seedDefaultRoles(database)
}

/**
 * Seed default roles into the database
 */
function seedDefaultRoles(database: typeof db) {
  if (!database) return

  const count = database.exec('SELECT COUNT(*) as count FROM roles')[0]?.values[0]?.[0] as number
  if (count > 0) return

  const defaultRoles = [
    {
      id: 'ceo-agent',
      name: 'CEO Agent',
      default_level: 'medium',
      permissions: JSON.stringify({
        tools: {
          'fs.read': 'allow',
          'fs.write': 'allow',
          'fs.unlink': 'prompt',
          'child_process.spawn': 'prompt',
          'http.request': 'allow',
          'agent.delegate': 'allow',
          'task.create': 'allow',
          'task.assign': 'allow',
        },
        files: { read: ['~/.clawhive/workspaces/*', '~/Documents/*'], write: ['~/.clawhive/workspaces/*'], deny: ['~/.ssh/*', '~/.aws/*', '~/.clawhive/secrets/*'] },
        network: { allowHosts: ['*'], denyHosts: [] },
        execution: { shell: 'prompt', code: 'allow' },
      }),
    },
    {
      id: 'cfo-agent',
      name: 'CFO Agent',
      default_level: 'medium',
      permissions: JSON.stringify({
        tools: {
          'fs.read': 'allow',
          'fs.write': 'allow',
          'fs.unlink': 'deny',
          'child_process.spawn': 'deny',
          'http.request': 'allow',
          'spreadsheet.read': 'allow',
          'spreadsheet.write': 'allow',
          'budget.query': 'allow',
          'cost.report': 'allow',
        },
        files: { read: ['~/.clawhive/workspaces/*', '~/Documents/*', '~/Downloads/*'], write: ['~/.clawhive/workspaces/*/reports/*'], deny: ['~/.ssh/*', '~/.aws/*', '~/.clawhive/secrets/*'] },
        network: { allowHosts: ['api.stripe.com', 'api.quickbooks.com', '*.freshbooks.com'], denyHosts: [] },
        execution: { shell: 'deny', code: 'allow' },
      }),
    },
    {
      id: 'security-agent',
      name: 'Security Agent',
      default_level: 'high',
      permissions: JSON.stringify({
        tools: {
          'fs.read': 'allow',
          'fs.write': 'prompt',
          'fs.unlink': 'prompt',
          'child_process.spawn': 'prompt',
          'http.request': 'prompt',
          'audit.log': 'allow',
          'security.scan': 'allow',
          'policy.check': 'allow',
        },
        files: { read: ['~/.clawhive/*', '/var/log/*'], write: ['~/.clawhive/audit/*'], deny: [] },
        network: { allowHosts: [], denyHosts: ['*.internal', 'localhost:*'] },
        execution: { shell: 'prompt', code: 'prompt' },
      }),
    },
    {
      id: 'individual-agent',
      name: 'Individual Agent',
      default_level: 'medium',
      permissions: JSON.stringify({
        tools: {
          'fs.read': 'allow',
          'fs.write': 'prompt',
          'fs.unlink': 'deny',
          'child_process.spawn': 'deny',
          'http.request': 'allow',
          'chat.send': 'allow',
          'task.update': 'allow',
        },
        files: { read: ['~/.clawhive/workspaces/*'], write: ['~/.clawhive/workspaces/*'], deny: ['~/.ssh/*', '~/.aws/*', '~/.clawhive/secrets/*'] },
        network: { allowHosts: ['api.anthropic.com', 'api.openai.com', 'localhost:11434'], denyHosts: [] },
        execution: { shell: 'deny', code: 'allow' },
      }),
    },
  ]

  for (const role of defaultRoles) {
    database.run(
      'INSERT INTO roles (id, name, default_level, permissions) VALUES (?, ?, ?, ?)',
      [role.id, role.name, role.default_level, role.permissions]
    )
  }
}

/**
 * Load or create encrypted database
 */
export async function loadDatabase(config: StorageConfig): Promise<void> {
  await initSQL()

  dbPath = path.join(config.dataPath, DEFAULT_DB_NAME)

  // Ensure directory exists
  await fs.mkdir(config.dataPath, { recursive: true })

  let data: Uint8Array | null = null

  try {
    // Try to load existing encrypted database
    const encrypted = await fs.readFile(dbPath, 'utf-8')
    data = decryptData(encrypted)
  } catch {
    // New database
    data = null
  }

  // Create or load database
  db = new SQL!.Database(data ?? undefined)
  initSchema(db)
}

/**
 * Save encrypted database to disk
 */
export async function saveDatabase(): Promise<void> {
  if (!db || !dbPath) throw new Error('Database not initialized')

  const data = db.export()
  const encrypted = encryptData(data)
  await fs.writeFile(dbPath, encrypted, 'utf-8')
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Session operations
export interface DbSession {
  id: string
  agent_id: string
  provider: string
  model: string
  security_level: 'high' | 'medium' | 'low'
  role_name: string | null
  created_at: number
  updated_at: number
}

export function createSession(session: Omit<DbSession, 'created_at' | 'updated_at'>): void {
  if (!db) throw new Error('Database not initialized')

  const now = Date.now()
  db.run(
    'INSERT INTO sessions (id, agent_id, provider, model, security_level, role_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [session.id, session.agent_id, session.provider, session.model, session.security_level ?? 'medium', session.role_name ?? null, now, now]
  )

  // Auto-save after write
  saveDatabase().catch(console.error)
}

export function getSessions(): DbSession[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC')
  const results: DbSession[] = []

  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbSession)
  }
  stmt.free()

  return results
}

export function updateSessionSecurity(
  sessionId: string,
  securityLevel: 'high' | 'medium' | 'low',
  roleName: string
): void {
  if (!db) throw new Error('Database not initialized')

  db.run(
    'UPDATE sessions SET security_level = ?, role_name = ?, updated_at = ? WHERE id = ?',
    [securityLevel, roleName, Date.now(), sessionId]
  )

  saveDatabase().catch(console.error)
}

export function deleteSession(id: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM sessions WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

// Message operations
export interface DbMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export function addMessage(message: DbMessage): void {
  if (!db) throw new Error('Database not initialized')

  db.run(
    'INSERT INTO messages (id, session_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
    [message.id, message.session_id, message.role, message.content, message.timestamp]
  )

  // Update session updated_at
  db.run('UPDATE sessions SET updated_at = ? WHERE id = ?', [Date.now(), message.session_id])

  saveDatabase().catch(console.error)
}

export function getMessages(sessionId: string): DbMessage[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC')
  stmt.bind([sessionId])

  const results: DbMessage[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbMessage)
  }
  stmt.free()

  return results
}

// Agent operations
export interface DbAgent {
  id: string
  name: string
  role: string
  parentId?: string
  department?: string
  team?: string
  genes: string[]
  provider: string
  model: string
  apiKey?: string
  allowedTools: string[]
  defaultSecurityLevel: string
  createdAt: number
  updatedAt: number
}

export function createAgent(agent: Omit<DbAgent, 'createdAt' | 'updatedAt'>): void {
  if (!db) throw new Error('Database not initialized')

  const now = Date.now()
  db.run(
    'INSERT INTO agents (id, name, role, parentId, department, team, genes, provider, model, apiKey, allowedTools, defaultSecurityLevel, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      agent.id,
      agent.name,
      agent.role,
      agent.parentId ?? null,
      agent.department ?? null,
      agent.team ?? null,
      JSON.stringify(agent.genes ?? []),
      agent.provider,
      agent.model,
      agent.apiKey ? encryptString(agent.apiKey) : null,
      JSON.stringify(agent.allowedTools ?? []),
      agent.defaultSecurityLevel ?? 'medium',
      now,
      now,
    ]
  )

  saveDatabase().catch(console.error)
}

export function updateAgent(id: string, updates: Partial<Omit<DbAgent, 'id'>>): void {
  if (!db) throw new Error('Database not initialized')

  const fields: string[] = []
  const values: (string | null)[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.role !== undefined) {
    fields.push('role = ?')
    values.push(updates.role)
  }
  if (updates.parentId !== undefined) {
    fields.push('parentId = ?')
    values.push(updates.parentId)
  }
  if (updates.department !== undefined) {
    fields.push('department = ?')
    values.push(updates.department)
  }
  if (updates.team !== undefined) {
    fields.push('team = ?')
    values.push(updates.team)
  }
  if (updates.genes !== undefined) {
    fields.push('genes = ?')
    values.push(JSON.stringify(updates.genes))
  }
  if (updates.provider !== undefined) {
    fields.push('provider = ?')
    values.push(updates.provider)
  }
  if (updates.model !== undefined) {
    fields.push('model = ?')
    values.push(updates.model)
  }
  if (updates.apiKey !== undefined) {
    fields.push('apiKey = ?')
    values.push(updates.apiKey ? encryptString(updates.apiKey) : null)
  }
  if (updates.allowedTools !== undefined) {
    fields.push('allowedTools = ?')
    values.push(JSON.stringify(updates.allowedTools))
  }
  if (updates.defaultSecurityLevel !== undefined) {
    fields.push('defaultSecurityLevel = ?')
    values.push(updates.defaultSecurityLevel)
  }

  if (fields.length === 0) return

  fields.push('updatedAt = ?')
  values.push(Date.now().toString())
  values.push(id)

  db.run(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`, values)
  saveDatabase().catch(console.error)
}

export function deleteAgent(id: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM agents WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

export function getAgentById(id: string): DbAgent | null {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM agents WHERE id = ?')
  stmt.bind([id])

  let result: DbAgent | null = null
  if (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    result = {
      id: row.id as string,
      name: row.name as string,
      role: row.role as string,
      parentId: row.parentId as string | undefined,
      department: row.department as string | undefined,
      team: row.team as string | undefined,
      genes: JSON.parse((row.genes as string) || '[]'),
      provider: row.provider as string,
      model: row.model as string,
      apiKey: row.apiKey ? decryptString(row.apiKey as string) : undefined,
      allowedTools: JSON.parse((row.allowedTools as string) || '[]'),
      defaultSecurityLevel: (row.defaultSecurityLevel as string) || 'medium',
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    }
  }
  stmt.free()

  return result
}

export function getAgents(): DbAgent[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM agents ORDER BY createdAt DESC')
  const results: DbAgent[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    results.push({
      id: row.id as string,
      name: row.name as string,
      role: row.role as string,
      parentId: row.parentId as string | undefined,
      department: row.department as string | undefined,
      team: row.team as string | undefined,
      genes: JSON.parse((row.genes as string) || '[]'),
      provider: row.provider as string,
      model: row.model as string,
      apiKey: row.apiKey ? decryptString(row.apiKey as string) : undefined,
      allowedTools: JSON.parse((row.allowedTools as string) || '[]'),
      defaultSecurityLevel: (row.defaultSecurityLevel as string) || 'medium',
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    })
  }
  stmt.free()

  return results
}

// Team operations
export interface DbTeam {
  id: string
  name: string
  leader_id: string
  department?: string
  workspace_id?: string
  created_at: number
}

export interface DbTeamMember {
  team_id: string
  agent_id: string
  joined_at: number
}

export function createTeam(team: Omit<DbTeam, 'created_at'>): void {
  if (!db) throw new Error('Database not initialized')
  const now = Date.now()
  db.run(
    'INSERT INTO teams (id, name, leader_id, department, workspace_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [team.id, team.name, team.leader_id, team.department ?? null, team.workspace_id ?? null, now]
  )
  saveDatabase().catch(console.error)
}

export function getTeam(id: string): DbTeam | null {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM teams WHERE id = ?')
  stmt.bind([id])
  let result: DbTeam | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as DbTeam
  }
  stmt.free()
  return result
}

export function listTeams(): DbTeam[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM teams ORDER BY created_at DESC')
  const results: DbTeam[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbTeam)
  }
  stmt.free()
  return results
}

export function deleteTeam(id: string): void {
  if (!db) throw new Error('Database not initialized')
  db.run('DELETE FROM teams WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

export function addTeamMember(teamId: string, agentId: string): void {
  if (!db) throw new Error('Database not initialized')
  db.run(
    'INSERT OR IGNORE INTO team_members (team_id, agent_id, joined_at) VALUES (?, ?, ?)',
    [teamId, agentId, Date.now()]
  )
  saveDatabase().catch(console.error)
}

export function removeTeamMember(teamId: string, agentId: string): void {
  if (!db) throw new Error('Database not initialized')
  db.run('DELETE FROM team_members WHERE team_id = ? AND agent_id = ?', [teamId, agentId])
  saveDatabase().catch(console.error)
}

export function listTeamMembers(teamId: string): string[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT agent_id FROM team_members WHERE team_id = ?')
  stmt.bind([teamId])
  const results: string[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject().agent_id as string)
  }
  stmt.free()
  return results
}

export function listAgentTeams(agentId: string): string[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT team_id FROM team_members WHERE agent_id = ?')
  stmt.bind([agentId])
  const results: string[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject().team_id as string)
  }
  stmt.free()
  return results
}

// Shared Memory operations
export type SharedMemoryType = 'conversation' | 'file' | 'note' | 'task_result'

export interface DbSharedMemory {
  id: string
  team_id: string | null
  agent_id: string | null
  type: SharedMemoryType
  content: string
  tags: string // JSON array string
  shared_at: number
}

export function createSharedMemory(memory: Omit<DbSharedMemory, 'shared_at'>): void {
  if (!db) throw new Error('Database not initialized')
  const now = Date.now()
  db.run(
    'INSERT INTO shared_memories (id, team_id, agent_id, type, content, tags, shared_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [memory.id, memory.team_id ?? null, memory.agent_id ?? null, memory.type, memory.content, memory.tags, now]
  )
  saveDatabase().catch(console.error)
}

export function getSharedMemory(id: string): DbSharedMemory | null {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM shared_memories WHERE id = ?')
  stmt.bind([id])
  let result: DbSharedMemory | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as DbSharedMemory
  }
  stmt.free()
  return result
}

export function listTeamMemories(teamId: string): DbSharedMemory[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM shared_memories WHERE team_id = ? ORDER BY shared_at DESC')
  stmt.bind([teamId])
  const results: DbSharedMemory[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbSharedMemory)
  }
  stmt.free()
  return results
}

export function listAgentMemories(agentId: string): DbSharedMemory[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM shared_memories WHERE agent_id = ? ORDER BY shared_at DESC')
  stmt.bind([agentId])
  const results: DbSharedMemory[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbSharedMemory)
  }
  stmt.free()
  return results
}

export function queryTeamMemories(teamId: string, query: string, tags?: string[]): DbSharedMemory[] {
  if (!db) throw new Error('Database not initialized')

  let sql = 'SELECT * FROM shared_memories WHERE team_id = ? AND content LIKE ?'
  const params: (string | null)[] = [teamId, `%${query}%`]

  if (tags && tags.length > 0) {
    // Filter by tags -- each tag must appear in the JSON array
    for (const tag of tags) {
      sql += ' AND tags LIKE ?'
      params.push(`%${JSON.stringify(tag).slice(1, -1)}%`)
    }
  }

  sql += ' ORDER BY shared_at DESC'

  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results: DbSharedMemory[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbSharedMemory)
  }
  stmt.free()
  return results
}

export function deleteSharedMemory(id: string): void {
  if (!db) throw new Error('Database not initialized')
  db.run('DELETE FROM shared_memories WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

// Gene operations (DeskClaw gene system)
export interface DbAgentGene {
  agent_id: string
  gene_id: string
  loaded_at: number
}

export function loadGene(agentId: string, geneId: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run(
    'INSERT OR REPLACE INTO agent_genes (agent_id, gene_id, loaded_at) VALUES (?, ?, ?)',
    [agentId, geneId, Date.now()]
  )

  saveDatabase().catch(console.error)
}

export function unloadGene(agentId: string, geneId: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM agent_genes WHERE agent_id = ? AND gene_id = ?', [agentId, geneId])
  saveDatabase().catch(console.error)
}

export function getAgentGenes(agentId: string): string[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT gene_id FROM agent_genes WHERE agent_id = ?')
  stmt.bind([agentId])

  const results: string[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject().gene_id as string)
  }
  stmt.free()

  return results
}

// Config operations
export function getConfig(key: string): string | null {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT value FROM config WHERE key = ?')
  stmt.bind([key])

  let value: string | null = null
  if (stmt.step()) {
    value = stmt.getAsObject().value as string
  }
  stmt.free()

  return value
}

export function setConfig(key: string, value: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run(
    'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)',
    [key, value, Date.now()]
  )

  saveDatabase().catch(console.error)
}

// Get current data path
export function getDataPath(): string | null {
  return dbPath ? path.dirname(dbPath) : null
}

// Migration helper for future schema changes
export async function runMigrations(): Promise<void> {
  if (!db) throw new Error('Database not initialized')

  // Get current schema version
  const version = getConfig('schema_version') || '0'
  const currentVersion = parseInt(version, 10)

  if (currentVersion < 1) {
    // Migration 1: Add security_level and role_name to sessions table
    const sessionColumns = db.exec('PRAGMA table_info(sessions)')[0]?.values ?? []
    const hasSecurityLevel = sessionColumns.some((column) => column[1] === 'security_level')
    const hasRoleName = sessionColumns.some((column) => column[1] === 'role_name')

    if (!hasSecurityLevel) {
      db.run(
        "ALTER TABLE sessions ADD COLUMN security_level TEXT NOT NULL DEFAULT 'medium' CHECK(security_level IN ('high', 'medium', 'low'))"
      )
    }

    if (!hasRoleName) {
      db.run('ALTER TABLE sessions ADD COLUMN role_name TEXT')
    }
  }

  if (currentVersion < 2) {
    // Migration 2: Expand agents table for hierarchy and permissions
    const agentColumns = db.exec('PRAGMA table_info(agents)')[0]?.values ?? []
    const hasParentId = agentColumns.some((column) => column[1] === 'parentId')
    const hasApiKey = agentColumns.some((column) => column[1] === 'apiKey')

    if (!hasParentId && !hasApiKey) {
      // Old schema with snake_case columns; migrate to new schema
      db.run('PRAGMA foreign_keys = OFF')
      db.run(`
        CREATE TABLE agents_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('CEO', 'CFO', 'COO', 'Department Head', 'Team Leader', 'Individual Agent')),
          parentId TEXT REFERENCES agents_new(id) ON DELETE SET NULL,
          department TEXT,
          team TEXT,
          genes TEXT NOT NULL DEFAULT '[]',
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          apiKey TEXT,
          allowedTools TEXT NOT NULL DEFAULT '[]',
          defaultSecurityLevel TEXT NOT NULL DEFAULT 'medium',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `)
      db.run(`
        INSERT INTO agents_new
        SELECT id, name, role, NULL, NULL, NULL, '[]', provider, model, api_key_encrypted, '[]', 'medium', created_at, updated_at
        FROM agents
      `)
      db.run('DROP TABLE agents')
      db.run('ALTER TABLE agents_new RENAME TO agents')
      db.run('CREATE INDEX idx_agents_created ON agents(createdAt)')
      db.run('CREATE INDEX idx_agents_parent ON agents(parentId)')
      db.run('PRAGMA foreign_keys = ON')
    } else if (!hasParentId) {
      // Partial new schema; add missing columns
      db.run("ALTER TABLE agents ADD COLUMN parentId TEXT REFERENCES agents(id) ON DELETE SET NULL")
      db.run('ALTER TABLE agents ADD COLUMN department TEXT')
      db.run('ALTER TABLE agents ADD COLUMN team TEXT')
      db.run("ALTER TABLE agents ADD COLUMN genes TEXT NOT NULL DEFAULT '[]'")
      db.run("ALTER TABLE agents ADD COLUMN allowedTools TEXT NOT NULL DEFAULT '[]'")
      db.run("ALTER TABLE agents ADD COLUMN defaultSecurityLevel TEXT NOT NULL DEFAULT 'medium'")
      db.run('CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parentId)')
    }
  }

  setConfig('schema_version', '2')
}

// Tab operations
export interface DbTab {
  id: string
  title: string
  type: string
  content_ref: string
  workspace_id: string | null
  created_at: number
  updated_at: number
  sort_order: number
}

export function listTabs(): DbTab[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM tabs ORDER BY sort_order ASC')
  const results: DbTab[] = []

  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbTab)
  }
  stmt.free()

  return results
}

export function createTab(tab: Omit<DbTab, 'created_at' | 'updated_at'>): void {
  if (!db) throw new Error('Database not initialized')

  const now = Date.now()
  db.run(
    'INSERT INTO tabs (id, title, type, content_ref, workspace_id, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [tab.id, tab.title, tab.type, tab.content_ref ?? null, tab.workspace_id ?? null, now, now, tab.sort_order]
  )

  saveDatabase().catch(console.error)
}

export function updateTab(id: string, updates: Partial<DbTab>): void {
  if (!db) throw new Error('Database not initialized')

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title)
  }
  if (updates.type !== undefined) {
    fields.push('type = ?')
    values.push(updates.type)
  }
  if (updates.content_ref !== undefined) {
    fields.push('content_ref = ?')
    values.push(updates.content_ref)
  }
  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?')
    values.push(updates.sort_order)
  }
  if (updates.workspace_id !== undefined) {
    fields.push('workspace_id = ?')
    values.push(updates.workspace_id)
  }

  fields.push('updated_at = ?')
  values.push(Date.now())
  values.push(id)

  db.run(`UPDATE tabs SET ${fields.join(', ')} WHERE id = ?`, values)
  saveDatabase().catch(console.error)
}

export function deleteTab(id: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM tabs WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

export function reorderTabs(orderedIds: string[]): void {
  if (!db) throw new Error('Database not initialized')

  orderedIds.forEach((id, index) => {
    db!.run('UPDATE tabs SET sort_order = ?, updated_at = ? WHERE id = ?', [index, Date.now(), id])
  })

  saveDatabase().catch(console.error)
}

// Workspace operations
export interface DbWorkspace {
  id: string
  name: string
  active_task: string | null
  agent_status: string
  active_genes: string // JSON array
  gene_score: number
  created_at: number
  updated_at: number
}

export function listWorkspaces(): DbWorkspace[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC')
  const results: DbWorkspace[] = []

  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbWorkspace)
  }
  stmt.free()

  return results
}

export function getWorkspace(id: string): DbWorkspace | null {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM workspaces WHERE id = ?')
  stmt.bind([id])

  let result: DbWorkspace | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as DbWorkspace
  }
  stmt.free()

  return result
}

export function createWorkspace(workspace: Omit<DbWorkspace, 'active_genes' | 'gene_score' | 'created_at' | 'updated_at'>): void {
  if (!db) throw new Error('Database not initialized')

  const now = Date.now()
  db.run(
    'INSERT INTO workspaces (id, name, active_task, agent_status, active_genes, gene_score, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [workspace.id, workspace.name, workspace.active_task ?? null, workspace.agent_status, '[]', 0, now, now]
  )

  saveDatabase().catch(console.error)
}

export function updateWorkspace(id: string, updates: Partial<DbWorkspace>): void {
  if (!db) throw new Error('Database not initialized')

  const fields: string[] = []
  const values: (string | number | null)[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.active_task !== undefined) {
    fields.push('active_task = ?')
    values.push(updates.active_task)
  }
  if (updates.agent_status !== undefined) {
    fields.push('agent_status = ?')
    values.push(updates.agent_status)
  }
  if (updates.active_genes !== undefined) {
    fields.push('active_genes = ?')
    values.push(updates.active_genes)
  }
  if (updates.gene_score !== undefined) {
    fields.push('gene_score = ?')
    values.push(updates.gene_score)
  }

  if (fields.length === 0) return

  fields.push('updated_at = ?')
  values.push(Date.now())
  values.push(id)

  db.run(`UPDATE workspaces SET ${fields.join(', ')} WHERE id = ?`, values)
  saveDatabase().catch(console.error)
}

export function deleteWorkspace(id: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM workspaces WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

// Role operations (Security Core)
export interface DbRole {
  id: string
  name: string
  default_level: 'high' | 'medium' | 'low'
  permissions: string // JSON string
}

export function listRoles(): DbRole[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM roles ORDER BY name ASC')
  const results: DbRole[] = []

  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as DbRole)
  }
  stmt.free()

  return results
}

export function getRole(id: string): DbRole | null {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM roles WHERE id = ?')
  stmt.bind([id])

  let result: DbRole | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as DbRole
  }
  stmt.free()

  return result
}

export function getRoleByName(name: string): DbRole | null {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM roles WHERE name = ?')
  stmt.bind([name])

  let result: DbRole | null = null
  if (stmt.step()) {
    result = stmt.getAsObject() as unknown as DbRole
  }
  stmt.free()

  return result
}

export function createRole(role: DbRole): void {
  if (!db) throw new Error('Database not initialized')

  db.run(
    'INSERT INTO roles (id, name, default_level, permissions) VALUES (?, ?, ?, ?)',
    [role.id, role.name, role.default_level, role.permissions]
  )

  saveDatabase().catch(console.error)
}

export function updateRole(id: string, updates: Partial<Omit<DbRole, 'id'>>): void {
  if (!db) throw new Error('Database not initialized')

  const fields: string[] = []
  const values: (string | null)[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.default_level !== undefined) {
    fields.push('default_level = ?')
    values.push(updates.default_level)
  }
  if (updates.permissions !== undefined) {
    fields.push('permissions = ?')
    values.push(updates.permissions)
  }

  if (fields.length === 0) return

  db.run(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, [...values, id])
  saveDatabase().catch(console.error)
}

export function deleteRole(id: string): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM roles WHERE id = ?', [id])
  saveDatabase().catch(console.error)
}

// Activity Log operations (Privacy Guard)
export interface DbActivityLog {
  id: string
  timestamp: number
  session_id: string | null
  agent_id: string | null
  action_type: string
  decision: 'allowed' | 'denied' | 'prompted'
  reason: string | null
  metadata: string | null // JSON string
}

export function addActivityLog(entry: Omit<DbActivityLog, 'id'>): string {
  if (!db) throw new Error('Database not initialized')

  const id = crypto.randomUUID()
  db.run(
    'INSERT INTO activity_log (id, timestamp, session_id, agent_id, action_type, decision, reason, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id,
      entry.timestamp,
      entry.session_id ?? null,
      entry.agent_id ?? null,
      entry.action_type,
      entry.decision,
      entry.reason ?? null,
      entry.metadata ?? null,
    ]
  )

  saveDatabase().catch(console.error)
  return id
}

export function getActivityLog(
  options: {
    limit?: number
    offset?: number
    decision?: 'allowed' | 'denied' | 'prompted'
    agentId?: string
  } = {}
): DbActivityLog[] {
  if (!db) throw new Error('Database not initialized')

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options.decision) {
    conditions.push('decision = ?')
    params.push(options.decision)
  }

  if (options.agentId) {
    conditions.push('agent_id = ?')
    params.push(options.agentId)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const stmt = db.prepare(
    `SELECT * FROM activity_log ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
  )
  stmt.bind([...params, limit, offset])

  const results: DbActivityLog[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    results.push({
      id: row.id as string,
      timestamp: row.timestamp as number,
      session_id: row.session_id as string | null,
      agent_id: row.agent_id as string | null,
      action_type: row.action_type as string,
      decision: row.decision as 'allowed' | 'denied' | 'prompted',
      reason: row.reason as string | null,
      metadata: row.metadata as string | null,
    })
  }
  stmt.free()

  return results
}

export function getActivityLogCount(
  options: {
    decision?: 'allowed' | 'denied' | 'prompted'
    agentId?: string
  } = {}
): number {
  if (!db) throw new Error('Database not initialized')

  const conditions: string[] = []
  const params: string[] = []

  if (options.decision) {
    conditions.push('decision = ?')
    params.push(options.decision)
  }

  if (options.agentId) {
    conditions.push('agent_id = ?')
    params.push(options.agentId)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const stmt = db.prepare(`SELECT COUNT(*) as count FROM activity_log ${whereClause}`)
  if (params.length > 0) {
    stmt.bind(params)
  }

  let count = 0
  if (stmt.step()) {
    count = stmt.getAsObject().count as number
  }
  stmt.free()

  return count
}

export function clearActivityLog(): void {
  if (!db) throw new Error('Database not initialized')

  db.run('DELETE FROM activity_log')
  saveDatabase().catch(console.error)
}

// Privacy Settings operations
export interface PrivacySettings {
  safeZones: string[]
  sensitiveDataTypes?: Record<string, boolean>
}

export function getPrivacySettings(): PrivacySettings {
  const safeZonesValue = getConfig('privacy_safe_zones')
  const sensitiveTypesValue = getConfig('privacy_sensitive_types')
  return {
    safeZones: safeZonesValue ? JSON.parse(safeZonesValue) : [],
    sensitiveDataTypes: sensitiveTypesValue ? JSON.parse(sensitiveTypesValue) : undefined,
  }
}

export function setPrivacySettings(settings: PrivacySettings): void {
  setConfig('privacy_safe_zones', JSON.stringify(settings.safeZones))
  if (settings.sensitiveDataTypes !== undefined) {
    setConfig('privacy_sensitive_types', JSON.stringify(settings.sensitiveDataTypes))
  }
}

export function addSafeZone(safeZone: string): void {
  const settings = getPrivacySettings()
  const normalized = path.resolve(safeZone)
  if (!settings.safeZones.includes(normalized)) {
    settings.safeZones.push(normalized)
    setPrivacySettings(settings)
  }
}

export function removeSafeZone(safeZone: string): void {
  const settings = getPrivacySettings()
  const normalized = path.resolve(safeZone)
  settings.safeZones = settings.safeZones.filter(z => z !== normalized)
  setPrivacySettings(settings)
}

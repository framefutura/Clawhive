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
      role TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      api_key_encrypted TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at);

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
  provider: string
  model: string
  api_key?: string
  created_at: number
  updated_at: number
}

export function createAgent(agent: Omit<DbAgent, 'created_at' | 'updated_at'>): void {
  if (!db) throw new Error('Database not initialized')

  const now = Date.now()
  db.run(
    'INSERT INTO agents (id, name, role, provider, model, api_key_encrypted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      agent.id,
      agent.name,
      agent.role,
      agent.provider,
      agent.model,
      agent.api_key ? encryptString(agent.api_key) : null,
      now,
      now,
    ]
  )

  saveDatabase().catch(console.error)
}

export function getAgents(): DbAgent[] {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare('SELECT * FROM agents ORDER BY created_at DESC')
  const results: DbAgent[] = []

  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    results.push({
      id: row.id as string,
      name: row.name as string,
      role: row.role as string,
      provider: row.provider as string,
      model: row.model as string,
      api_key: row.api_key_encrypted ? decryptString(row.api_key_encrypted as string) : undefined,
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
    })
  }
  stmt.free()

  return results
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

  setConfig('schema_version', '1')
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
}

export function getPrivacySettings(): PrivacySettings {
  const safeZonesValue = getConfig('privacy_safe_zones')
  return {
    safeZones: safeZonesValue ? JSON.parse(safeZonesValue) : [],
  }
}

export function setPrivacySettings(settings: PrivacySettings): void {
  setConfig('privacy_safe_zones', JSON.stringify(settings.safeZones))
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

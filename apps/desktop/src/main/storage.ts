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
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_tabs_sort ON tabs(sort_order);
  `)
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
  created_at: number
  updated_at: number
}

export function createSession(session: Omit<DbSession, 'created_at' | 'updated_at'>): void {
  if (!db) throw new Error('Database not initialized')

  const now = Date.now()
  db.run(
    'INSERT INTO sessions (id, agent_id, provider, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [session.id, session.agent_id, session.provider, session.model, now, now]
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

  // Future migrations go here
  // if (currentVersion < 1) { ... }

  setConfig('schema_version', '1')
}

// Tab operations
export interface DbTab {
  id: string
  title: string
  type: string
  content_ref: string
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
    'INSERT INTO tabs (id, title, type, content_ref, created_at, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [tab.id, tab.title, tab.type, tab.content_ref, now, now, tab.sort_order]
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

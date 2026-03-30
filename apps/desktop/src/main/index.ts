import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron'
import path from 'node:path'
import { GatewayManager } from './gateway.js'
import { sessionStore, DEFAULT_GENES, type ModelConfig, type Gene, type GeneCategory } from './session.js'
import {
  loadDatabase,
  saveDatabase,
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
  getConfig as getDbConfig,
  setConfig as setDbConfig,
  getDataPath,
  type StorageConfig,
} from './storage.js'
import { tabDb } from './tabs.js'
import { workspaceDb } from './workspaces.js'
import { autoNameTab } from './tab-naming.js'
import type { TabRecord, TabType } from './common/tab.js'
import type { WorkspaceRecord, WorkspaceUpdate } from './common/workspace.js'
import Store from 'electron-store'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let gatewayManager: GatewayManager | null = null

// Config store for non-encrypted settings
const store = new Store<{
  dataPath: string | null
  theme: 'dark' | 'light' | 'system'
  firstLaunchComplete: boolean
}>({
  defaults: {
    dataPath: null,
    theme: 'system',
    firstLaunchComplete: false,
  }
})

// Initialize database on startup
async function initStorage() {
  const dataPath = store.get('dataPath')
  if (!dataPath) {
    // First launch - will show wizard
    return false
  }

  await loadDatabase({ dataPath })

  // Set workspace data path
  workspaceDb.setDataPath(dataPath)

  // Load sessions from database into memory
  const dbSessions = getSessions()
  for (const s of dbSessions) {
    sessionStore.create(s.agent_id, {
      provider: s.provider as ModelConfig['provider'],
      model: s.model,
    })
  }

  return true
}

// IPC Handlers - Storage
ipcMain.handle('storage:getPath', () => {
  return getDataPath()
})

ipcMain.handle('storage:selectDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Data Storage Location',
    message: 'Choose where ClawHive will store your encrypted data',
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('storage:setPath', async (_, newPath: string) => {
  // Close current database if open
  closeDatabase()

  // Open at new location
  await loadDatabase({ dataPath: newPath })
  store.set('dataPath', newPath)

  return newPath
})

// IPC Handlers - First Launch
ipcMain.handle('firstLaunch:check', () => {
  return {
    complete: store.get('firstLaunchComplete'),
    hasDataPath: !!store.get('dataPath'),
  }
})

ipcMain.handle('firstLaunch:complete', () => {
  store.set('firstLaunchComplete', true)
  return true
})

// IPC Handlers - Gateway
ipcMain.handle('gateway:connect', async (_, gatewayUrl: string) => {
  const port = parseInt(new URL(gatewayUrl).port || '18792')
  gatewayManager = new GatewayManager({ port })
  gatewayManager.on('event', (event) => {
    mainWindow?.webContents.send('gateway:event', event)
  })
  await gatewayManager.start()
})

ipcMain.handle('gateway:disconnect', () => {
  gatewayManager?.stop()
  gatewayManager = null
})

// IPC Handlers - Session (now backed by database)
ipcMain.handle('session:create', (_, agentId: string, modelConfig: ModelConfig, genes?: string[]) => {
  const session = sessionStore.create(agentId, modelConfig, genes)

  // Also save to database
  createSession({
    id: session.id,
    agent_id: agentId,
    provider: modelConfig.provider,
    model: modelConfig.model,
  })

  return session
})

ipcMain.handle('session:list', () => {
  return sessionStore.list()
})

ipcMain.handle('session:delete', (_, sessionId: string) => {
  sessionStore.delete(sessionId)
  deleteSession(sessionId)
})

// IPC Handlers - Chat (persist messages)
ipcMain.handle('chat:send', async (_, sessionId: string, content: string) => {
  // Add user message to memory and database
  sessionStore.addMessage(sessionId, { role: 'user', content })
  addMessage({
    id: crypto.randomUUID(),
    session_id: sessionId,
    role: 'user',
    content,
    timestamp: Date.now(),
  })

  // Send to gateway for streaming response
  if (gatewayManager) {
    const session = sessionStore.get(sessionId)
    if (session) {
      await gatewayManager.heartbeatRun(sessionId, content, session.genes)
    }
  }

  // Emit event that agent is working
  mainWindow?.webContents.send('chat:working', { sessionId })
})

// IPC Handlers - Genes (DeskClaw gene system)
ipcMain.handle('genes:list', (): Gene[] => {
  return DEFAULT_GENES
})

ipcMain.handle('genes:byCategory', (_, category: GeneCategory): Gene[] => {
  return DEFAULT_GENES.filter(g => g.category === category)
})

ipcMain.handle('genes:categories', (): { id: GeneCategory; name: string; color: string }[] => {
  return [
    { id: 'dev', name: 'Development', color: '#10B981' },
    { id: 'data', name: 'Data', color: '#3B82F6' },
    { id: 'ops', name: 'Operations', color: '#F59E0B' },
    { id: 'network', name: 'Network', color: '#8B5CF6' },
    { id: 'creative', name: 'Creative', color: '#EC4899' },
    { id: 'comm', name: 'Communication', color: '#06B6D4' },
    { id: 'security', name: 'Security', color: '#EF4444' },
    { id: 'efficiency', name: 'Efficiency', color: '#84CC16' },
  ]
})

// IPC Handlers - Agents
ipcMain.handle('agent:create', (_, agent: {
  name: string
  role: string
  provider: string
  model: string
  apiKey?: string
  genes?: string[]
}) => {
  const id = crypto.randomUUID()
  createAgent({
    id,
    name: agent.name,
    role: agent.role,
    provider: agent.provider,
    model: agent.model,
    api_key: agent.apiKey,
  })

  // Load genes if provided
  if (agent.genes) {
    for (const geneId of agent.genes) {
      loadGene(id, geneId)
    }
  }

  return { id, ...agent }
})

ipcMain.handle('agent:list', () => {
  return getAgents()
})

ipcMain.handle('agent:genes', (_, agentId: string) => {
  return getAgentGenes(agentId)
})

// IPC Handlers - Config (persist to both store and database)
ipcMain.handle('config:get', () => {
  return {
    dataPath: store.get('dataPath'),
    theme: store.get('theme'),
    firstLaunchComplete: store.get('firstLaunchComplete'),
  }
})

ipcMain.handle('config:set', (_, config: Record<string, unknown>) => {
  if (config.theme) store.set('theme', config.theme as 'dark' | 'light' | 'system')
  if (config.dataPath) store.set('dataPath', config.dataPath as string)
  if (config.firstLaunchComplete !== undefined) {
    store.set('firstLaunchComplete', config.firstLaunchComplete as boolean)
  }

  return true
})

// IPC Handlers - Theme
ipcMain.handle('theme:get', () => {
  return store.get('theme')
})

ipcMain.handle('theme:set', (_, theme: 'dark' | 'light' | 'system') => {
  store.set('theme', theme)
  nativeTheme.themeSource = theme === 'system' ? 'system' : theme
  return theme
})

// Helper to broadcast tab changes to renderer
function broadcastTabsChanged() {
  const tabs = tabDb.listTabs()
  mainWindow?.webContents.send('tabs:changed', tabs)
}

// IPC Handlers - Tabs
ipcMain.handle('tabs:list', (): TabRecord[] => {
  return tabDb.listTabs()
})

ipcMain.handle('tabs:create', (_, type: TabType, contentRef?: string, title?: string, workspaceId?: string): TabRecord => {
  const tab = tabDb.createTab({
    title: title || autoNameTab(type),
    type,
    contentRef: contentRef || '',
    workspaceId,
    sortOrder: tabDb.listTabs().length,
  })
  broadcastTabsChanged()
  return tab
})

ipcMain.handle('tabs:close', (_, id: string): void => {
  tabDb.closeTab(id)
  broadcastTabsChanged()
})

ipcMain.handle('tabs:rename', (_, id: string, newTitle: string): TabRecord | null => {
  const updated = tabDb.updateTab(id, { title: newTitle })
  broadcastTabsChanged()
  return updated
})

ipcMain.handle('tabs:update', (_, id: string, updates: Partial<TabRecord>): TabRecord | null => {
  const updated = tabDb.updateTab(id, updates)
  broadcastTabsChanged()
  return updated
})

ipcMain.handle('tabs:reorder', (_, orderedIds: string[]): void => {
  tabDb.reorderTabs(orderedIds)
  broadcastTabsChanged()
})

ipcMain.handle('tabs:autoName', (_, type: TabType, context: Record<string, unknown>): string => {
  return autoNameTab(type, context)
})

ipcMain.handle('tabs:updateTitle', (_, id: string, title: string): TabRecord | null => {
  const updated = tabDb.updateTab(id, { title })
  broadcastTabsChanged()
  return updated
})

// Helper to broadcast workspace changes to renderer
function broadcastWorkspacesChanged() {
  const workspaces = workspaceDb.list()
  mainWindow?.webContents.send('workspaces:changed', workspaces)
}

// IPC Handlers - Workspaces
ipcMain.handle('workspaces:list', (): WorkspaceRecord[] => {
  return workspaceDb.list()
})

ipcMain.handle('workspaces:create', async (_, name?: string): Promise<WorkspaceRecord> => {
  const workspace = await workspaceDb.create(name)
  broadcastWorkspacesChanged()
  return workspace
})

ipcMain.handle('workspaces:update', (_, id: string, updates: WorkspaceUpdate): WorkspaceRecord | null => {
  const updated = workspaceDb.update(id, updates)
  broadcastWorkspacesChanged()
  return updated
})

ipcMain.handle('workspaces:delete', async (_, id: string): Promise<void> => {
  await workspaceDb.delete(id)
  broadcastWorkspacesChanged()
})

ipcMain.handle('workspaces:get', (_, id: string): WorkspaceRecord | null => {
  return workspaceDb.get(id)
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 768,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// Initialize storage before creating window
app.on('ready', async () => {
  await initStorage()
  createWindow()
})

app.on('window-all-closed', async () => {
  gatewayManager?.stop()
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Save database before quit
app.on('before-quit', async () => {
  await saveDatabase().catch(() => {})
})

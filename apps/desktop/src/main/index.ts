import { app, BrowserWindow, ipcMain, dialog, nativeTheme, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
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
  getPrivacySettings,
  setPrivacySettings,
  addSafeZone as addDbSafeZone,
  removeSafeZone as removeDbSafeZone,
  getActivityLog,
  listRoles,
  updateSessionSecurity,
  type StorageConfig,
} from './storage.js'
import { tabDb } from './tabs.js'
import { workspaceDb } from './workspaces.js'
import { autoNameTab } from './tab-naming.js'
import { formatRegistry } from './format-registry.js'
import { markdownPlugin } from './formats/markdown.js'
import { pdfPlugin } from './formats/pdf.js'
import { docxPlugin } from './formats/docx.js'
import { xlsxPlugin } from './formats/xlsx.js'
import { BrowserManager } from './browser-manager.js'
import { PlaywrightBridge } from './playwright-bridge.js'
import { getPrivacyGuard } from './privacy-guard.js'
import { getSandboxedBridge } from './sandboxed-bridge.js'
import { getToolRegistry, type AgentToolPermission } from './tool-registry.js'
import { getSecurityManager } from './security-manager.js'
import type { TabRecord, TabType } from './common/tab.js'
import type { WorkspaceRecord, WorkspaceUpdate } from './common/workspace.js'
import Store from 'electron-store'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let gatewayManager: GatewayManager | null = null
let browserManager: BrowserManager | null = null
let playwrightBridge: PlaywrightBridge | null = null

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

  // Register format plugins
  formatRegistry.register(markdownPlugin)
  formatRegistry.register(pdfPlugin)
  formatRegistry.register(docxPlugin)
  formatRegistry.register(xlsxPlugin)

  // Initialize Privacy Guard with stored safe zones
  const privacySettings = getPrivacySettings()
  const guard = getPrivacyGuard()
  guard.setSafeZones(privacySettings.safeZones)

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

  // Also save to database with default security level
  createSession({
    id: session.id,
    agent_id: agentId,
    provider: modelConfig.provider,
    model: modelConfig.model,
    security_level: 'medium',
    role_name: null,
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

ipcMain.handle(
  'session:security:update',
  (_, sessionId: string, securityLevel: 'high' | 'medium' | 'low', roleName: string) => {
    updateSessionSecurity(sessionId, securityLevel, roleName)
    return true
  }
)

ipcMain.handle('security:roles:list', () => {
  return listRoles()
})

ipcMain.handle('security:approval-resolve', (_, approvalId: string, approved: boolean) => {
  getSecurityManager().resolveApproval(approvalId, approved)
  return true
})

// IPC Handlers - Sensitive Data Authorization
ipcMain.handle('sensitive:createAuthRequest', (_, agentId: string, action: import('./common/security.js').ActionRequest, purpose?: string) => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().createAuthRequest(action, agentId, undefined, purpose)
})

ipcMain.handle('sensitive:getRequest', (_, requestId: string) => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().getAuthRequest(requestId)
})

ipcMain.handle('sensitive:listPending', () => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().getPendingRequests()
})

ipcMain.handle('sensitive:approve', async (_, requestId: string, approverId: string) => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().approve(requestId, approverId)
})

ipcMain.handle('sensitive:deny', (_, requestId: string, deniedBy: string, reason: string) => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().deny(requestId, deniedBy, reason)
})

ipcMain.handle('sensitive:getReport', (_, reportId: string) => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().getExecutionReport(reportId)
})

ipcMain.handle('sensitive:getStats', () => {
  const { getAuthorizationManager } = require('./authorization-manager.js')
  return getAuthorizationManager().getStats()
})

// IPC Handlers - Threat Analysis
ipcMain.handle('threat:analyze', async (_, action: import('./common/security.js').ActionRequest) => {
  const { getThreatAnalyzer } = require('./threat-analyzer.js')
  return getThreatAnalyzer().analyzeActionSuspicion(action)
})

ipcMain.handle('threat:analyzeFile', async (_, filePath: string) => {
  const { getThreatAnalyzer } = require('./threat-analyzer.js')
  return getThreatAnalyzer().analyzeForMalware(filePath)
})

ipcMain.handle('threat:analyzeToolChain', (_, tools: string[]) => {
  const { getThreatAnalyzer } = require('./threat-analyzer.js')
  return getThreatAnalyzer().analyzeToolChain(tools)
})

// IPC Handlers - Sandbox Management
ipcMain.handle('sandbox:status', (_, sandboxId: string) => {
  const { getSandboxManager } = require('./sandbox-manager.js')
  return getSandboxManager().getSandboxStatus(sandboxId)
})

ipcMain.handle('sandbox:stats', () => {
  const { getSandboxManager } = require('./sandbox-manager.js')
  return getSandboxManager().getStats()
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
  tools?: AgentToolPermission[]
  parentId?: string
  department?: string
  team?: string
  defaultSecurityLevel?: string
}) => {
  const id = crypto.randomUUID()

  // Set tool permissions (deny-by-default with role presets)
  const toolRegistry = getToolRegistry()
  let permissions: AgentToolPermission[]

  if (agent.tools && agent.tools.length > 0) {
    permissions = agent.tools
  } else {
    permissions = toolRegistry.getRolePresetPermissions(agent.role)
  }
  toolRegistry.setAgentPermissions(id, permissions)

  const allowedTools = permissions.filter(p => p.allowed).map(p => p.toolId)

  createAgent({
    id,
    name: agent.name,
    role: agent.role,
    parentId: agent.parentId,
    department: agent.department,
    team: agent.team,
    genes: agent.genes ?? [],
    provider: agent.provider,
    model: agent.model,
    apiKey: agent.apiKey,
    allowedTools,
    defaultSecurityLevel: agent.defaultSecurityLevel ?? 'medium',
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

// IPC Handlers - Storage
import {
  createAgentStorageDir,
  createTeamStorageDir,
  deleteAgentStorageDir,
  deleteTeamStorageDir,
  addAgentToTeamStorage,
} from './agent-storage.js'

ipcMain.handle('storage:agent:create', (_, agentId: string) => {
  return createAgentStorageDir(agentId)
})

ipcMain.handle('storage:team:create', (_, teamId: string) => {
  return createTeamStorageDir(teamId)
})

ipcMain.handle('storage:team:addAgent', (_, teamId: string, agentId: string) => {
  return addAgentToTeamStorage(teamId, agentId)
})

ipcMain.handle('storage:agent:delete', (_, agentId: string) => {
  return deleteAgentStorageDir(agentId)
})

ipcMain.handle('storage:team:delete', (_, teamId: string) => {
  return deleteTeamStorageDir(teamId)
})

// IPC Handlers - Tool Registry
ipcMain.handle('tools:list', () => {
  const registry = getToolRegistry()
  return registry.getAllTools()
})

ipcMain.handle('tools:forPicker', (_, agentId?: string) => {
  const registry = getToolRegistry()
  return registry.getToolsForPicker(agentId)
})

ipcMain.handle('tools:getAgentPermissions', (_, agentId: string) => {
  const registry = getToolRegistry()
  return registry.getAgentPermissions(agentId)
})

ipcMain.handle('tools:enable', (_, agentId: string, toolName: string, permission: 'allow' | 'prompt' = 'allow') => {
  const registry = getToolRegistry()
  return registry.enableTool(agentId, toolName, permission)
})

ipcMain.handle('tools:disable', (_, agentId: string, toolName: string) => {
  const registry = getToolRegistry()
  return registry.disableTool(agentId, toolName)
})

ipcMain.handle('tools:canEnable', (_, agentId: string, toolName: string, securityLevel: 'high' | 'medium' | 'low', role: string) => {
  const registry = getToolRegistry()
  return registry.canEnableTool(agentId, toolName, securityLevel, role)
})

ipcMain.handle('tools:validateDangerous', (_, toolName: string, securityLevel: 'high' | 'medium' | 'low', userExplicitlyEnabled: boolean) => {
  const registry = getToolRegistry()
  return registry.validateDangerousToolEnablement(toolName, securityLevel, userExplicitlyEnabled)
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

// IPC Handlers - File System
ipcMain.handle('files:list', async (_, dirPath: string) => {
  return formatRegistry.buildFileTree(dirPath)
})

ipcMain.handle('files:create', async (_, filePath: string, formatId: string) => {
  const plugin = formatRegistry.getPlugin(formatId)
  if (!plugin || !plugin.create) {
    throw new Error(`Format plugin ${formatId} not found or cannot create files`)
  }
  await plugin.create(filePath)
  return true
})

ipcMain.handle('files:read', async (_, filePath: string) => {
  const plugin = formatRegistry.resolveByPath(filePath)
  if (!plugin || !plugin.read) {
    throw new Error(`No plugin found for file: ${filePath}`)
  }
  return plugin.read(filePath)
})

ipcMain.handle('files:delete', async (_, filePath: string) => {
  await fs.unlink(filePath)
  return true
})

ipcMain.handle('files:rename', async (_, oldPath: string, newPath: string) => {
  await fs.rename(oldPath, newPath)
  return true
})

ipcMain.handle('files:openExternal', async (_, filePath: string) => {
  await shell.openPath(filePath)
  return true
})

ipcMain.handle('files:listCreatableFormats', () => {
  return formatRegistry.listCreatable().map(p => ({
    id: p.id,
    name: p.name,
    extensions: p.extensions,
  }))
})

// IPC Handlers - Browser
ipcMain.handle('browser:create', (_, tabId: string, url?: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.createTab(tabId, url)
  return true
})

ipcMain.handle('browser:destroy', (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.destroyTab(tabId)
  return true
})

ipcMain.handle('browser:navigate', (_, tabId: string, url: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.navigate(tabId, url)
  return true
})

ipcMain.handle('browser:goBack', (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.goBack(tabId)
  return true
})

ipcMain.handle('browser:goForward', (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.goForward(tabId)
  return true
})

ipcMain.handle('browser:reload', (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.reload(tabId)
  return true
})

ipcMain.handle('browser:setVisible', (_, tabId: string, visible: boolean) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  browserManager.setVisible(tabId, visible)
  return true
})

ipcMain.handle('browser:captureText', async (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  return browserManager.capturePageText(tabId)
})

ipcMain.handle('browser:captureScreenshot', async (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  const buffer = await browserManager.captureScreenshot(tabId)
  return `data:image/png;base64,${buffer.toString('base64')}`
})

ipcMain.handle('browser:canGoBack', (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  return browserManager.canGoBack(tabId)
})

ipcMain.handle('browser:canGoForward', (_, tabId: string) => {
  if (!browserManager) throw new Error('BrowserManager not initialized')
  return browserManager.canGoForward(tabId)
})

// IPC Handlers - Automation (Playwright)
ipcMain.handle('automation:scrape', async (_, url: string) => {
  if (!playwrightBridge) {
    playwrightBridge = new PlaywrightBridge()
  }
  return playwrightBridge.scrapePage(url)
})

ipcMain.handle('automation:screenshot', async (_, url: string, selector?: string) => {
  if (!playwrightBridge) {
    playwrightBridge = new PlaywrightBridge()
  }
  const buffer = await playwrightBridge.screenshot(url, selector)
  return `data:image/png;base64,${buffer.toString('base64')}`
})

ipcMain.handle('automation:run', async (_, url: string, actions: unknown[]) => {
  if (!playwrightBridge) {
    playwrightBridge = new PlaywrightBridge()
  }
  return playwrightBridge.runAutomation(url, actions as Parameters<PlaywrightBridge['runAutomation']>[1])
})

// IPC Handlers - Privacy Guard
ipcMain.handle('privacy:settings:get', () => {
  return getPrivacySettings()
})

ipcMain.handle('privacy:settings:set', (_, settings: { safeZones: string[]; sensitiveDataTypes?: Record<string, boolean> }) => {
  setPrivacySettings(settings)
  // Update the privacy guard singleton
  const guard = getPrivacyGuard()
  guard.setSafeZones(settings.safeZones)
  return true
})

ipcMain.handle('privacy:safeZone:add', (_, safeZonePath: string) => {
  addDbSafeZone(safeZonePath)
  // Also update the runtime privacy guard
  const guard = getPrivacyGuard()
  guard.addSafeZone(safeZonePath)
  return true
})

ipcMain.handle('privacy:safeZone:remove', (_, safeZonePath: string) => {
  removeDbSafeZone(safeZonePath)
  // Also update the runtime privacy guard
  const guard = getPrivacyGuard()
  guard.removeSafeZone(safeZonePath)
  return true
})

ipcMain.handle('privacy:auditLog:list', (_, options?: { limit?: number; decision?: string }) => {
  const decision = options?.decision as 'allowed' | 'denied' | 'prompted' | undefined
  return getActivityLog({
    limit: options?.limit,
    decision,
  })
})

// IPC Handlers - Sandboxed Bridge (Circuit Breakers)
const sandboxedBridge = getSandboxedBridge()

// Forward sandbox events to renderer
sandboxedBridge.on('sandbox:paused', (data) => {
  mainWindow?.webContents.send('sandbox:paused', data)
})

sandboxedBridge.on('sandbox:resumed', (data) => {
  mainWindow?.webContents.send('sandbox:resumed', data)
})

ipcMain.handle('sandbox:canExecute', (_, sessionId: string, toolName: string, context: {
  level: 'high' | 'medium' | 'low'
  role: RoleProfile
  workspaceId: string
  workspacePath: string
}) => {
  return sandboxedBridge.canExecute(sessionId, toolName, context)
})

ipcMain.handle('sandbox:execute', async (_, sessionId: string, toolName: string, args: unknown, context: {
  level: 'high' | 'medium' | 'low'
  role: RoleProfile
  workspaceId: string
  workspacePath: string
}) => {
  return sandboxedBridge.execute(sessionId, toolName, args, context)
})

ipcMain.handle('sandbox:reset', (_, sessionId: string) => {
  sandboxedBridge.resetSession(sessionId)
  return true
})

ipcMain.handle('sandbox:resume', (_, sessionId: string) => {
  sandboxedBridge.resumeSession(sessionId)
  return true
})

ipcMain.handle('sandbox:getState', (_, sessionId: string) => {
  return sandboxedBridge.getSessionState(sessionId)
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

  // Initialize BrowserManager
  browserManager = new BrowserManager(mainWindow)

  // Wire SecurityManager approval flow to renderer
  const securityManager = getSecurityManager()
  securityManager.setApprovalEmitter((approvalRequest) => {
    mainWindow?.webContents.send('security:approval-requested', approvalRequest)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Clean up browser views when window closes
  mainWindow.on('closed', () => {
    browserManager?.destroyAll()
    browserManager = null
    mainWindow = null
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

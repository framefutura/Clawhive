import { contextBridge, ipcRenderer } from 'electron'
import type { TabRecord, TabType } from './common/tab.js'
import type { WorkspaceRecord, WorkspaceUpdate } from './common/workspace.js'

// Secure IPC bridge - renderer can ONLY call invoke channels defined here
const api = {
  // Gateway connection
  connect: (gatewayUrl: string) => ipcRenderer.invoke('gateway:connect', gatewayUrl),
  disconnect: () => ipcRenderer.invoke('gateway:disconnect'),
  onGatewayEvent: (callback: (event: unknown) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('gateway:event', listener)
    return () => ipcRenderer.removeListener('gateway:event', listener)
  },

  // Chat
  sendMessage: (sessionId: string, content: string) =>
    ipcRenderer.invoke('chat:send', sessionId, content),
  onMessage: (callback: (msg: unknown) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: unknown) => callback(data)
    ipcRenderer.on('chat:message', listener)
    return () => ipcRenderer.removeListener('chat:message', listener)
  },
  onWorking: (callback: (data: { sessionId: string }) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { sessionId: string }) => callback(data)
    ipcRenderer.on('chat:working', listener)
    return () => ipcRenderer.removeListener('chat:working', listener)
  },

  // Session
  createSession: (agentId: string, modelConfig: unknown, genes?: string[]) =>
    ipcRenderer.invoke('session:create', agentId, modelConfig, genes),
  getSessions: () => ipcRenderer.invoke('session:list'),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('session:delete', sessionId),

  // Genes (DeskClaw gene system)
  getGenes: () => ipcRenderer.invoke('genes:list'),
  getGenesByCategory: (category: string) => ipcRenderer.invoke('genes:byCategory', category),
  getGeneCategories: () => ipcRenderer.invoke('genes:categories'),

  // Agents
  createAgent: (agent: {
    name: string
    role: string
    provider: string
    model: string
    apiKey?: string
    genes?: string[]
  }) => ipcRenderer.invoke('agent:create', agent),
  getAgents: () => ipcRenderer.invoke('agent:list'),
  getAgentGenes: (agentId: string) => ipcRenderer.invoke('agent:genes', agentId),

  // First Launch
  checkFirstLaunch: () => ipcRenderer.invoke('firstLaunch:check'),
  completeFirstLaunch: () => ipcRenderer.invoke('firstLaunch:complete'),

  // Storage
  getStoragePath: () => ipcRenderer.invoke('storage:getPath'),
  setStoragePath: (path: string) => ipcRenderer.invoke('storage:setPath', path),
  selectDirectory: () => ipcRenderer.invoke('storage:selectDirectory'),

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config: unknown) => ipcRenderer.invoke('config:set', config),

  // Theme
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: 'dark' | 'light' | 'system') => ipcRenderer.invoke('theme:set', theme),
  onThemeChange: (callback: (theme: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, theme: string) => callback(theme)
    ipcRenderer.on('theme:change', listener)
    return () => ipcRenderer.removeListener('theme:change', listener)
  },

  // Tabs
  listTabs: () => ipcRenderer.invoke('tabs:list'),
  createTab: (type: TabType, contentRef?: string, title?: string, workspaceId?: string) =>
    ipcRenderer.invoke('tabs:create', type, contentRef, title, workspaceId),
  closeTab: (id: string) => ipcRenderer.invoke('tabs:close', id),
  renameTab: (id: string, title: string) => ipcRenderer.invoke('tabs:rename', id, title),
  updateTab: (id: string, updates: Partial<TabRecord>) =>
    ipcRenderer.invoke('tabs:update', id, updates),
  reorderTabs: (orderedIds: string[]) => ipcRenderer.invoke('tabs:reorder', orderedIds),
  autoNameTab: (type: TabType, context: Record<string, unknown>) =>
    ipcRenderer.invoke('tabs:autoName', type, context),
  updateTabTitle: (id: string, title: string) =>
    ipcRenderer.invoke('tabs:updateTitle', id, title),
  onTabsChange: (callback: (tabs: TabRecord[]) => void) => {
    const listener = (_: Electron.IpcRendererEvent, tabs: TabRecord[]) => callback(tabs)
    ipcRenderer.on('tabs:changed', listener)
    return () => ipcRenderer.removeListener('tabs:changed', listener)
  },

  // Workspaces
  listWorkspaces: () => ipcRenderer.invoke('workspaces:list'),
  createWorkspace: (name?: string) => ipcRenderer.invoke('workspaces:create', name),
  updateWorkspace: (id: string, updates: WorkspaceUpdate) =>
    ipcRenderer.invoke('workspaces:update', id, updates),
  deleteWorkspace: (id: string) => ipcRenderer.invoke('workspaces:delete', id),
  getWorkspace: (id: string) => ipcRenderer.invoke('workspaces:get', id),
  onWorkspacesChange: (callback: (workspaces: WorkspaceRecord[]) => void) => {
    const listener = (_: Electron.IpcRendererEvent, workspaces: WorkspaceRecord[]) => callback(workspaces)
    ipcRenderer.on('workspaces:changed', listener)
    return () => ipcRenderer.removeListener('workspaces:changed', listener)
  },

  // Files
  listFiles: (dirPath: string) => ipcRenderer.invoke('files:list', dirPath),
  createFile: (filePath: string, formatId: string) => ipcRenderer.invoke('files:create', filePath, formatId),
  readFile: (filePath: string) => ipcRenderer.invoke('files:read', filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('files:delete', filePath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('files:rename', oldPath, newPath),
  openFileExternal: (filePath: string) => ipcRenderer.invoke('files:openExternal', filePath),
  listCreatableFormats: () => ipcRenderer.invoke('files:listCreatableFormats'),

  // Browser
  browserCreate: (tabId: string, url?: string) =>
    ipcRenderer.invoke('browser:create', tabId, url),
  browserDestroy: (tabId: string) =>
    ipcRenderer.invoke('browser:destroy', tabId),
  browserNavigate: (tabId: string, url: string) =>
    ipcRenderer.invoke('browser:navigate', tabId, url),
  browserGoBack: (tabId: string) =>
    ipcRenderer.invoke('browser:goBack', tabId),
  browserGoForward: (tabId: string) =>
    ipcRenderer.invoke('browser:goForward', tabId),
  browserReload: (tabId: string) =>
    ipcRenderer.invoke('browser:reload', tabId),
  browserSetVisible: (tabId: string, visible: boolean) =>
    ipcRenderer.invoke('browser:setVisible', tabId, visible),
  browserCaptureText: (tabId: string) =>
    ipcRenderer.invoke('browser:captureText', tabId),
  browserCaptureScreenshot: (tabId: string) =>
    ipcRenderer.invoke('browser:captureScreenshot', tabId),
  browserCanGoBack: (tabId: string) =>
    ipcRenderer.invoke('browser:canGoBack', tabId),
  browserCanGoForward: (tabId: string) =>
    ipcRenderer.invoke('browser:canGoForward', tabId),
  onBrowserTitleChanged: (callback: (event: { tabId: string; title: string }) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { tabId: string; title: string }) => callback(data)
    ipcRenderer.on('browser:titleChanged', listener)
    return () => ipcRenderer.removeListener('browser:titleChanged', listener)
  },
  onBrowserUrlChanged: (callback: (event: { tabId: string; url: string }) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { tabId: string; url: string }) => callback(data)
    ipcRenderer.on('browser:urlChanged', listener)
    return () => ipcRenderer.removeListener('browser:urlChanged', listener)
  },

  // Automation (Playwright)
  automationScrape: (url: string) =>
    ipcRenderer.invoke('automation:scrape', url),
  automationScreenshot: (url: string, selector?: string) =>
    ipcRenderer.invoke('automation:screenshot', url, selector),
  automationRun: (url: string, actions: unknown[]) =>
    ipcRenderer.invoke('automation:run', url, actions),

  // Privacy Guard
  getPrivacySettings: () => ipcRenderer.invoke('privacy:settings:get'),
  setPrivacySettings: (settings: { safeZones: string[] }) =>
    ipcRenderer.invoke('privacy:settings:set', settings),
  addSafeZone: (path: string) => ipcRenderer.invoke('privacy:safeZone:add', path),
  removeSafeZone: (path: string) => ipcRenderer.invoke('privacy:safeZone:remove', path),
  getActivityLog: (options?: { limit?: number; decision?: string }) =>
    ipcRenderer.invoke('privacy:auditLog:list', options),
}

contextBridge.exposeInMainWorld('clawhive', api)

export type ClawHiveAPI = typeof api

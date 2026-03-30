import { contextBridge, ipcRenderer } from 'electron'

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
}

contextBridge.exposeInMainWorld('clawhive', api)

export type ClawHiveAPI = typeof api

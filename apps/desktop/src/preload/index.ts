import { contextBridge, ipcRenderer } from 'electron'

// Secure IPC bridge - renderer can ONLY call invoke channels defined here
// Following Paperclip's Gateway adapter pattern for WebSocket-like communication
const api = {
  // Gateway connection (Paperclip-inspired WebSocket pattern)
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
  createSession: (agentId: string, modelConfig: unknown) =>
    ipcRenderer.invoke('session:create', agentId, modelConfig),
  getSessions: () => ipcRenderer.invoke('session:list'),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('session:delete', sessionId),

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

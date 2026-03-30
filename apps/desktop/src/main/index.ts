import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { GatewayManager } from './gateway.js'
import { sessionStore, DEFAULT_GENES, type ModelConfig, type Gene, type GeneCategory } from './session.js'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let gatewayManager: GatewayManager | null = null

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

// IPC Handlers - Session
ipcMain.handle('session:create', (_, agentId: string, modelConfig: ModelConfig, genes?: string[]) => {
  return sessionStore.create(agentId, modelConfig, genes)
})

ipcMain.handle('session:list', () => {
  return sessionStore.list()
})

ipcMain.handle('session:delete', (_, sessionId: string) => {
  sessionStore.delete(sessionId)
})

// IPC Handlers - Chat (Paperclip heartbeat-run model)
ipcMain.handle('chat:send', async (_, sessionId: string, content: string) => {
  const session = sessionStore.get(sessionId)
  if (!session) throw new Error('Session not found')

  // Add user message
  sessionStore.addMessage(sessionId, { role: 'user', content })

  // Send to gateway using heartbeat-run (Paperclip pattern with DeskClaw genes)
  if (gatewayManager) {
    await gatewayManager.heartbeatRun(sessionId, content, session.genes)
  }

  // Emit event that agent is working (for glow effect)
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

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  gatewayManager?.stop()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

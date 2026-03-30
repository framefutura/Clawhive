/// <reference types="vite/client" />

interface ClawHiveAPI {
  // Gateway
  connect: (gatewayUrl: string) => Promise<void>
  disconnect: () => Promise<void>
  onGatewayEvent: (callback: (event: unknown) => void) => () => void

  // Chat
  sendMessage: (sessionId: string, content: string) => Promise<void>
  onMessage: (callback: (msg: unknown) => void) => () => void
  onWorking: (callback: (data: { sessionId: string }) => void) => () => void

  // Session
  createSession: (agentId: string, modelConfig: unknown, genes?: string[]) => Promise<unknown>
  getSessions: () => Promise<unknown[]>
  deleteSession: (sessionId: string) => Promise<void>

  // Genes (DeskClaw gene system)
  getGenes: () => Promise<unknown[]>
  getGenesByCategory: (category: string) => Promise<unknown[]>
  getGeneCategories: () => Promise<{ id: string; name: string; color: string }[]>

  // Storage
  getStoragePath: () => Promise<string>
  setStoragePath: (path: string) => Promise<void>
  selectDirectory: () => Promise<string | null>

  // Config
  getConfig: () => Promise<unknown>
  setConfig: (config: unknown) => Promise<void>

  // Theme
  getTheme: () => Promise<string>
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<void>
  onThemeChange: (callback: (theme: string) => void) => () => void
}

interface Window {
  clawhive: ClawHiveAPI
}

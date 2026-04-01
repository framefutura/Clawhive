/// <reference types="vite/client" />

import type { TabRecord, TabType } from '../common/tab'
import type { WorkspaceRecord, WorkspaceUpdate } from '../common/workspace'

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: TreeNode[]
}

interface CreatableFormat {
  id: string
  name: string
  extensions: string[]
}

interface ReadResult {
  type: 'text' | 'html' | 'binary'
  data: unknown
}

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

  // Agents
  createAgent: (agent: {
    name: string
    role: string
    provider: string
    model: string
    apiKey?: string
    genes?: string[]
    parentId?: string
    department?: string
    team?: string
    defaultSecurityLevel?: string
  }) => Promise<{ id: string }>
  getAgents: () => Promise<unknown[]>
  getAgentGenes: (agentId: string) => Promise<string[]>

  // First Launch
  checkFirstLaunch: () => Promise<{ complete: boolean; hasDataPath: boolean }>
  completeFirstLaunch: () => Promise<boolean>

  // Storage
  getStoragePath: () => Promise<string | null>
  setStoragePath: (path: string) => Promise<string>
  selectDirectory: () => Promise<string | null>

  // Config
  getConfig: () => Promise<{
    dataPath: string | null
    theme: 'dark' | 'light' | 'system'
    firstLaunchComplete: boolean
  }>
  setConfig: (config: Record<string, unknown>) => Promise<boolean>

  // Theme
  getTheme: () => Promise<'dark' | 'light' | 'system'>
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<'dark' | 'light' | 'system'>
  onThemeChange: (callback: (theme: string) => void) => () => void

  // Tabs
  listTabs: () => Promise<TabRecord[]>
  createTab: (type: TabType, contentRef?: string, title?: string, workspaceId?: string) => Promise<TabRecord>
  closeTab: (id: string) => Promise<void>
  renameTab: (id: string, title: string) => Promise<void>
  updateTab: (id: string, updates: Partial<TabRecord>) => Promise<void>
  reorderTabs: (orderedIds: string[]) => Promise<void>
  autoNameTab: (type: TabType, context: Record<string, unknown>) => Promise<string>
  updateTabTitle: (id: string, title: string) => Promise<void>
  onTabsChange: (callback: (tabs: TabRecord[]) => void) => () => void

  // Workspaces
  listWorkspaces: () => Promise<WorkspaceRecord[]>
  createWorkspace: (name?: string) => Promise<WorkspaceRecord>
  updateWorkspace: (id: string, updates: WorkspaceUpdate) => Promise<WorkspaceRecord | null>
  deleteWorkspace: (id: string) => Promise<void>
  getWorkspace: (id: string) => Promise<WorkspaceRecord | null>
  onWorkspacesChange: (callback: (workspaces: WorkspaceRecord[]) => void) => () => void

  // Files
  listFiles: (dirPath: string) => Promise<TreeNode[]>
  createFile: (filePath: string, formatId: string) => Promise<boolean>
  readFile: (filePath: string) => Promise<ReadResult>
  deleteFile: (filePath: string) => Promise<boolean>
  renameFile: (oldPath: string, newPath: string) => Promise<boolean>
  openFileExternal: (filePath: string) => Promise<boolean>
  listCreatableFormats: () => Promise<CreatableFormat[]>
}

interface Window {
  clawhive: ClawHiveAPI
}

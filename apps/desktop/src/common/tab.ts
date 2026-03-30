// Shared tab types used by both main process and renderer

export type TabType = 'chat' | 'browser' | 'file' | 'workspace' | 'settings'

export interface TabRecord {
  id: string
  title: string
  type: TabType
  contentRef: string
  createdAt: number
  updatedAt: number
  sortOrder: number
}

// Tab display model (subset of TabRecord for UI)
export interface TabDisplay {
  id: string
  title: string
  type: TabType
  isDirty?: boolean
}

// Color mapping for tab type indicators (gene category colors)
export const TAB_TYPE_COLORS: Record<TabType, string> = {
  chat: '#8B5CF6',      // network
  browser: '#3B82F6',    // data
  file: '#10B981',       // dev
  workspace: '#F59E0B',  // ops
  settings: '#71717A',   // neutral
}

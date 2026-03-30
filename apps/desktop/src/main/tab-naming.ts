// Auto-naming heuristics for tabs based on type and context
import type { TabType } from '../common/tab.js'
import path from 'node:path'

export interface NamingContext {
  firstMessage?: string
  pageTitle?: string
  path?: string
  taskName?: string
}

export function autoNameTab(type: TabType, context: NamingContext = {}): string {
  switch (type) {
    case 'chat': {
      const firstMessage = String(context.firstMessage || '').trim()
      if (!firstMessage) return 'New Chat'
      return firstMessage.length > 22 ? firstMessage.slice(0, 22) + '\u2026' : firstMessage
    }
    case 'browser': {
      const title = String(context.pageTitle || '').trim()
      return title || 'New Tab'
    }
    case 'file': {
      const filePath = String(context.path || '')
      return filePath ? path.basename(filePath) : 'Untitled'
    }
    case 'workspace':
      return String(context.taskName || 'Workspace')
    case 'settings':
      return 'Settings'
    default:
      return 'Untitled'
  }
}

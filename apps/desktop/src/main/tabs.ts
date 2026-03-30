// Tab database operations for main process
import type { TabRecord, TabType } from '../common/tab.js'
import {
  listTabs,
  createTab,
  updateTab,
  deleteTab,
  reorderTabs,
  type DbTab,
} from './storage.js'

// Convert DB row to TabRecord
function dbToTabRecord(row: DbTab): TabRecord {
  return {
    id: row.id,
    title: row.title,
    type: row.type as TabType,
    contentRef: row.content_ref || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sortOrder: row.sort_order,
  }
}

export class TabDb {
  /**
   * List all tabs ordered by sort_order
   */
  listTabs(): TabRecord[] {
    const rows = listTabs()
    return rows.map(dbToTabRecord)
  }

  /**
   * Create a new tab with auto-generated UUID and timestamps
   */
  createTab(partial: Omit<TabRecord, 'id' | 'createdAt' | 'updatedAt'>): TabRecord {
    const id = crypto.randomUUID()
    const now = Date.now()

    const tab: Omit<DbTab, 'created_at' | 'updated_at'> = {
      id,
      title: partial.title,
      type: partial.type,
      content_ref: partial.contentRef || '',
      sort_order: partial.sortOrder ?? 0,
    }

    createTab(tab)

    return {
      id,
      title: partial.title,
      type: partial.type,
      contentRef: partial.contentRef || '',
      createdAt: now,
      updatedAt: now,
      sortOrder: partial.sortOrder ?? 0,
    }
  }

  /**
   * Update a tab's fields
   */
  updateTab(id: string, updates: Partial<TabRecord>): TabRecord | null {
    const rows = listTabs()
    const existing = rows.find(r => r.id === id)
    if (!existing) return null

    const dbUpdates: Partial<DbTab> = {}
    if (updates.title !== undefined) dbUpdates.title = updates.title
    if (updates.type !== undefined) dbUpdates.type = updates.type
    if (updates.contentRef !== undefined) dbUpdates.content_ref = updates.contentRef
    if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder

    updateTab(id, dbUpdates)

    // Return updated tab
    const updated = listTabs().find(r => r.id === id)
    return updated ? dbToTabRecord(updated) : null
  }

  /**
   * Delete a tab
   */
  closeTab(id: string): void {
    deleteTab(id)
  }

  /**
   * Reorder tabs by new order
   */
  reorderTabs(orderedIds: string[]): void {
    reorderTabs(orderedIds)
  }
}

// Singleton instance
export const tabDb = new TabDb()

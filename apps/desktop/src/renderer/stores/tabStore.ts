import { useState, useEffect, useCallback } from 'react'
import type { TabRecord, TabType, TabDisplay } from '../../common/tab'

interface TabStore {
  tabs: TabRecord[]
  activeTabId: string | null
  loadTabs: () => Promise<void>
  createTab: (type: TabType, contentRef?: string, title?: string) => Promise<TabRecord>
  closeTab: (id: string) => Promise<void>
  renameTab: (id: string, title: string) => Promise<void>
  updateTab: (id: string, updates: Partial<TabRecord>) => Promise<void>
  switchTab: (id: string) => Promise<void>
  reorderTabs: (orderedIds: string[]) => Promise<void>
  getDisplayTabs: () => TabDisplay[]
}

export function useTabStore(): TabStore {
  const [tabs, setTabs] = useState<TabRecord[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // Subscribe to tab changes from main process
  useEffect(() => {
    const loadInitialTabs = async () => {
      try {
        const loadedTabs = await window.clawhive.listTabs()
        setTabs(loadedTabs)
        if (loadedTabs.length > 0 && !activeTabId) {
          // Set active to first tab if none set
          setActiveTabId(loadedTabs[0].id)
        }
      } catch (err) {
        console.error('Failed to load tabs:', err)
      }
    }

    loadInitialTabs()

    const cleanup = window.clawhive.onTabsChange((newTabs) => {
      setTabs(newTabs)
      // Validate activeTabId still exists
      if (activeTabId && !newTabs.find(t => t.id === activeTabId)) {
        // Switch to nearest tab
        const currentIndex = tabs.findIndex(t => t.id === activeTabId)
        if (newTabs.length > 0) {
          const newIndex = Math.min(currentIndex, newTabs.length - 1)
          setActiveTabId(newTabs[newIndex >= 0 ? newIndex : 0].id)
        } else {
          setActiveTabId(null)
        }
      }
    })

    return cleanup
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTabs = useCallback(async () => {
    const loadedTabs = await window.clawhive.listTabs()
    setTabs(loadedTabs)
  }, [])

  const createTab = useCallback(async (
    type: TabType,
    contentRef?: string,
    title?: string
  ): Promise<TabRecord> => {
    const newTab = await window.clawhive.createTab(type, contentRef, title)
    // The onTabsChange handler will update local state
    setActiveTabId(newTab.id)
    return newTab
  }, [])

  const closeTab = useCallback(async (id: string) => {
    await window.clawhive.closeTab(id)
    // The onTabsChange handler will update local state
    // If closing the active tab, switch to another
    if (activeTabId === id) {
      const remaining = tabs.filter(t => t.id !== id)
      if (remaining.length > 0) {
        const closedIndex = tabs.findIndex(t => t.id === id)
        const newIndex = Math.min(closedIndex, remaining.length - 1)
        setActiveTabId(remaining[newIndex >= 0 ? newIndex : 0].id)
      }
    }
  }, [activeTabId, tabs])

  const renameTab = useCallback(async (id: string, title: string) => {
    await window.clawhive.renameTab(id, title)
  }, [])

  const updateTab = useCallback(async (id: string, updates: Partial<TabRecord>) => {
    await window.clawhive.updateTab(id, updates)
  }, [])

  const switchTab = useCallback(async (id: string) => {
    setActiveTabId(id)
  }, [])

  const reorderTabs = useCallback(async (orderedIds: string[]) => {
    await window.clawhive.reorderTabs(orderedIds)
  }, [])

  const getDisplayTabs = useCallback((): TabDisplay[] => {
    return tabs.map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
    }))
  }, [tabs])

  return {
    tabs,
    activeTabId,
    loadTabs,
    createTab,
    closeTab,
    renameTab,
    updateTab,
    switchTab,
    reorderTabs,
    getDisplayTabs,
  }
}

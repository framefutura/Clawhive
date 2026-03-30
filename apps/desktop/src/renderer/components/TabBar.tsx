import React, { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabType, TabDisplay } from '../../common/tab'
import { TAB_TYPE_COLORS } from '../../common/tab'

interface TabBarProps {
  tabs: TabDisplay[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onAddTab: (type?: TabType) => void
  onRenameTab: (id: string, newTitle: string) => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tabId: string | null
}

export function TabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onRenameTab,
}: TabBarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    tabId: null,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingTabId])

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }))
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const handleDoubleClick = (tab: TabDisplay) => {
    setEditingTabId(tab.id)
    setEditingValue(tab.title)
  }

  const commitRename = () => {
    if (editingTabId && editingValue.trim()) {
      onRenameTab(editingTabId, editingValue.trim())
    }
    setEditingTabId(null)
    setEditingValue('')
  }

  const cancelRename = () => {
    setEditingTabId(null)
    setEditingValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitRename()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }

  const handleContextMenu = (e: React.MouseEvent, tab: TabDisplay) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      tabId: tab.id,
    })
  }

  const closeOthers = (keepId: string) => {
    tabs.forEach(t => {
      if (t.id !== keepId) {
        onCloseTab(t.id)
      }
    })
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  return (
    <div className="h-9 border-b bg-background flex items-center px-1 shrink-0">
      <div className="flex items-center overflow-x-auto flex-1 scrollbar-none">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              'group relative flex items-center h-9 px-3 text-sm cursor-pointer border-r transition-colors min-w-[120px] max-w-[200px]',
              activeTabId === tab.id
                ? 'bg-background border-b-2 border-b-primary'
                : 'hover:bg-muted/50 border-b-2 border-b-transparent'
            )}
            style={{
              borderLeftColor: TAB_TYPE_COLORS[tab.type],
              borderLeftWidth: '3px',
            }}
            onClick={() => onSelectTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab)}
          >
            {/* Tab title or input */}
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={commitRename}
                className="flex-1 bg-transparent border-none outline-none text-sm min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate"
                onDoubleClick={() => handleDoubleClick(tab)}
              >
                {tab.title}
                {tab.isDirty && <span className="ml-1 text-muted-foreground">*</span>}
              </span>
            )}

            {/* Close button */}
            <button
              className={cn(
                'ml-2 p-0.5 rounded hover:bg-muted-foreground/20',
                'opacity-0 group-hover:opacity-100',
                activeTabId === tab.id && 'opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* New Tab button */}
      <button
        className="flex items-center justify-center h-9 w-9 hover:bg-muted rounded transition-colors shrink-0"
        onClick={() => onAddTab()}
        title="New Tab"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.tabId && (
        <div
          className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={() => {
              const tab = tabs.find(t => t.id === contextMenu.tabId)
              if (tab) handleDoubleClick(tab)
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            Rename
          </button>
          <button
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={() => {
              const tab = tabs.find(t => t.id === contextMenu.tabId)
              if (tab) onAddTab(tab.type)
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            Duplicate
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={() => {
              if (contextMenu.tabId) onCloseTab(contextMenu.tabId)
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            Close
          </button>
          <button
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent"
            onClick={() => {
              if (contextMenu.tabId) closeOthers(contextMenu.tabId)
            }}
          >
            Close Others
          </button>
        </div>
      )}
    </div>
  )
}

import React, { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Plus, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentRecord } from '../../common/agent'

export interface TreeNode<T> {
  data: T
  children: TreeNode<T>[]
}

interface OrgTreeProps {
  nodes: TreeNode<AgentRecord>[]
  activeAgentId?: string
  onSelectAgent: (id: string) => void
  onCreateAgent: (parentId?: string) => void
  onEditAgent: (id: string) => void
  onDeleteAgent: (id: string) => void
}

const roleBadgeColors: Record<string, string> = {
  CEO: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  CFO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  COO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  'Department Head': 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
  'Team Leader': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200',
  'Individual Agent': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

function StatusDot({ status }: { status: 'idle' | 'working' | 'error' }) {
  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full',
        status === 'idle' && 'bg-green-500',
        status === 'working' && 'bg-blue-500 animate-pulse',
        status === 'error' && 'bg-red-500'
      )}
    />
  )
}

function OrgTreeNode({
  node,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  depth = 0,
}: {
  node: TreeNode<AgentRecord>
  activeAgentId?: string
  onSelectAgent: (id: string) => void
  onCreateAgent: (parentId?: string) => void
  onEditAgent: (id: string) => void
  onDeleteAgent: (id: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasChildren = node.children.length > 0

  const toggle = useCallback(() => {
    if (hasChildren) setExpanded((v) => !v)
  }, [hasChildren])

  // Derive a simple status for demo; real status would come from props
  const status: 'idle' | 'working' | 'error' = 'idle'

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-center gap-2 py-1.5 pr-2 cursor-pointer border-l-2 border-transparent transition-colors',
          activeAgentId === node.data.id
            ? 'bg-primary/10 border-l-2 border-primary'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectAgent(node.data.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          className={cn(
            'w-4 h-4 flex items-center justify-center text-muted-foreground',
            !hasChildren && 'invisible'
          )}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <StatusDot status={status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{node.data.name}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap',
                roleBadgeColors[node.data.role] || 'bg-muted text-muted-foreground'
              )}
            >
              {node.data.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs">{node.data.genes.length} genes</span>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((v) => !v)
              }}
              className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 bg-popover border rounded-md shadow-sm py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onEditAgent(node.data.id)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onCreateAgent(node.data.id)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Add Sub-Agent
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onDeleteAgent(node.data.id)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-muted"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.data.id}
              node={child}
              activeAgentId={activeAgentId}
              onSelectAgent={onSelectAgent}
              onCreateAgent={onCreateAgent}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function OrgTree({
  nodes,
  activeAgentId,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
}: OrgTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-sm text-muted-foreground mb-3">No agents in your organization</div>
        <button
          onClick={() => onCreateAgent(undefined)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create CEO Agent
        </button>
      </div>
    )
  }

  return (
    <div className="py-2">
      {nodes.map((node) => (
        <OrgTreeNode
          key={node.data.id}
          node={node}
          activeAgentId={activeAgentId}
          onSelectAgent={onSelectAgent}
          onCreateAgent={onCreateAgent}
          onEditAgent={onEditAgent}
          onDeleteAgent={onDeleteAgent}
        />
      ))}
    </div>
  )
}

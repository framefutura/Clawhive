import React, { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Plus, MoreVertical, ArrowRightLeft, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentRecord, AgentStatus, AgentRole } from '../../common/agent'
import { wouldCreateCycle } from '../hooks/useDragReparent'

export interface TreeNode<T> {
  data: T
  children: TreeNode<T>[]
}

interface ReparentState {
  agentId: string
  agentName: string
  agentRole: AgentRole
  currentParentId?: string
}

interface OrgTreeProps {
  nodes: TreeNode<AgentRecord>[]
  allAgents: AgentRecord[]
  activeAgentId?: string
  viewMode: 'hierarchy' | 'org-chart' | 'teams'
  onSelectAgent: (id: string) => void
  onCreateAgent: (parentId?: string) => void
  onEditAgent: (id: string) => void
  onDeleteAgent: (id: string) => void
  onReparentAgent: (agentId: string, newParentId: string | undefined, comment: string) => Promise<{ success: boolean; error?: string }>
}

const roleBadgeColors: Record<AgentRole, string> = {
  CEO: 'bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50',
  CFO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  COO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  'Department Head': 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
  'Team Leader': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200',
  'Individual Agent': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  Secretary: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
}

const statusDotColors: Record<AgentStatus, string> = {
  idle: 'bg-green-500',
  working: 'bg-blue-500 animate-pulse',
  error: 'bg-red-500',
  'waiting-for-leader': 'bg-amber-500',
  'waiting-for-user': 'bg-amber-400 ring-2 ring-amber-200 dark:ring-amber-900',
  blocked: 'bg-red-600 ring-2 ring-red-200 dark:ring-red-900',
}

function StatusDot({ status }: { status: AgentStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', statusDotColors[status])} />
      {status === 'working' ? <span className="h-1 w-4 rounded-full bg-blue-500/70" /> : null}
    </div>
  )
}

function roleMarker(role: AgentRole) {
  if (role === 'Secretary') {
    return 'bridge'
  }
  if (role === 'CEO') {
    return 'overseer'
  }
  return null
}

function CustomizationSummary({ agent }: { agent: AgentRecord }) {
  const c = agent.customizations
  const counts = [
    { label: 'Skills', value: c.skills.length },
    { label: 'Knowledge', value: c.knowledgeDocs.length },
    { label: 'MCP', value: c.mcpServers.length },
    { label: 'CLI Tools', value: c.cliTools.length },
  ]
  const hasAny = counts.some(({ value }) => value > 0)

  if (!hasAny) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {counts.filter(({ value }) => value > 0).map(({ label, value }) => (
        <span
          key={label}
          className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
        >
          {value} {label}
        </span>
      ))}
    </div>
  )
}

function AgentTooltip({ agent }: { agent: AgentRecord }) {
  return (
    <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-3 hidden min-w-56 -translate-y-1/2 rounded-md border bg-popover p-3 text-xs shadow-lg group-hover:block">
      <div className="font-semibold text-foreground">{agent.name}</div>
      <div className="text-muted-foreground">{agent.role}</div>
      <div className="mt-2 text-muted-foreground">status</div>
      <div className="capitalize text-foreground">{agent.status}</div>
      <div className="mt-2 text-muted-foreground">summary</div>
      <div className="text-foreground">{agent.summary ?? ''}</div>
      <CustomizationSummary agent={agent} />
    </div>
  )
}

function ReparentDialog({
  reparent,
  allAgents,
  onConfirm,
  onCancel,
}: {
  reparent: ReparentState
  allAgents: AgentRecord[]
  onConfirm: (newParentId: string | undefined, comment: string) => void
  onCancel: () => void
}) {
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(reparent.currentParentId)
  const [comment, setComment] = useState('')

  // Build the list of potential parents, excluding the agent itself
  const potentialParents = allAgents.filter(a => a.id !== reparent.agentId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 max-h-[70vh] flex flex-col rounded-lg border bg-popover shadow-lg">
        <div className="flex items-center gap-2 border-b p-4">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Move Agent</h3>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Moving</div>
            <div className="text-sm font-medium">{reparent.agentName}</div>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              roleBadgeColors[reparent.agentRole]
            )}>
              {reparent.agentRole}
            </span>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">New Parent</label>
            <select
              value={selectedParentId ?? ''}
              onChange={e => setSelectedParentId(e.target.value || undefined)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">No parent (root)</option>
              {potentialParents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              <MessageSquare className="inline h-3 w-3 mr-1" />
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Why are you moving this agent?"
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t p-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedParentId, comment)}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}

function ReparentResult({
  success,
  error,
  onDismiss,
}: {
  success: boolean
  error?: string
  onDismiss: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-lg border bg-popover p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          {success ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <h3 className="text-sm font-semibold">
            {success ? 'Agent Moved' : 'Move Failed'}
          </h3>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-muted-foreground mb-3">Agent hierarchy updated successfully.</p>
        )}
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentRow({
  agent,
  activeAgentId,
  allAgents,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onMoveAgent,
  onDropAgent,
  depth = 0,
  hasChildren = false,
  expanded = true,
  onToggle,
}: {
  agent: AgentRecord
  activeAgentId?: string
  allAgents: AgentRecord[]
  onSelectAgent: (id: string) => void
  onCreateAgent: (parentId?: string) => void
  onEditAgent: (id: string) => void
  onDeleteAgent: (id: string) => void
  onMoveAgent: (agent: AgentRecord) => void
  onDropAgent: (draggedId: string, targetId: string) => void
  depth?: number
  hasChildren?: boolean
  expanded?: boolean
  onToggle?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const marker = roleMarker(agent.role)

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', agent.id)
    e.dataTransfer.effectAllowed = 'move'
  }, [agent.id])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.types.includes('text/plain') ? 'pending' : ''
    if (draggedId) {
      setDragOver(true)
      e.dataTransfer.dropEffect = 'move'
    }
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== agent.id) {
      onDropAgent(draggedId, agent.id)
    }
  }, [agent.id, onDropAgent])

  return (
    <div
      className="group relative select-none"
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 pr-2 cursor-pointer border-l-2 border-transparent transition-colors rounded-r-md',
          activeAgentId === agent.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted',
          agent.role === 'Secretary' && 'ring-1 ring-purple-200 dark:ring-purple-900/50',
          agent.role === 'CEO' && 'ring-1 ring-amber-200 dark:ring-amber-900/50',
          dragOver && 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/30'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectAgent(agent.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.()
          }}
          className={cn('w-4 h-4 flex items-center justify-center text-muted-foreground', !hasChildren && 'invisible')}
        >
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <StatusDot status={agent.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{agent.name}</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap',
                roleBadgeColors[agent.role]
              )}
            >
              {agent.role}
            </span>
            {marker ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{marker}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs capitalize">{agent.status}</span>
          <span className="text-xs">{agent.genes.length} genes</span>

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
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 bg-popover border rounded-md shadow-sm py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onEditAgent(agent.id)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onCreateAgent(agent.id)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Add Sub-Agent
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onMoveAgent(agent)
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Move Agent
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onDeleteAgent(agent.id)
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

      <AgentTooltip agent={agent} />
    </div>
  )
}

function HierarchyNode({
  node,
  activeAgentId,
  allAgents,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onMoveAgent,
  onDropAgent,
  depth = 0,
}: {
  node: TreeNode<AgentRecord>
  activeAgentId?: string
  allAgents: AgentRecord[]
  onSelectAgent: (id: string) => void
  onCreateAgent: (parentId?: string) => void
  onEditAgent: (id: string) => void
  onDeleteAgent: (id: string) => void
  onMoveAgent: (agent: AgentRecord) => void
  onDropAgent: (draggedId: string, targetId: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div>
      <AgentRow
        agent={node.data}
        activeAgentId={activeAgentId}
        allAgents={allAgents}
        onSelectAgent={onSelectAgent}
        onCreateAgent={onCreateAgent}
        onEditAgent={onEditAgent}
        onDeleteAgent={onDeleteAgent}
        onMoveAgent={onMoveAgent}
        onDropAgent={onDropAgent}
        depth={depth}
        hasChildren={hasChildren}
        expanded={expanded}
        onToggle={() => {
          if (hasChildren) setExpanded((value) => !value)
        }}
      />
      {expanded && hasChildren ? (
        <div>
          {node.children.map((child) => (
            <HierarchyNode
              key={child.data.id}
              node={child}
              activeAgentId={activeAgentId}
              allAgents={allAgents}
              onSelectAgent={onSelectAgent}
              onCreateAgent={onCreateAgent}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              onMoveAgent={onMoveAgent}
              onDropAgent={onDropAgent}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function flattenNodes(nodes: TreeNode<AgentRecord>[]): AgentRecord[] {
  return nodes.flatMap((node) => [node.data, ...flattenNodes(node.children)])
}

function renderOrgChart(
  nodes: TreeNode<AgentRecord>[],
  allAgents: AgentRecord[],
  activeAgentId: string | undefined,
  onSelectAgent: (id: string) => void,
  onCreateAgent: (parentId?: string) => void,
  onEditAgent: (id: string) => void,
  onDeleteAgent: (id: string) => void,
  onMoveAgent: (agent: AgentRecord) => void,
  onDropAgent: (draggedId: string, targetId: string) => void
) {
  const rows: AgentRecord[][] = []
  let level = nodes

  while (level.length > 0) {
    rows.push(level.map((node) => node.data))
    level = level.flatMap((node) => node.children)
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(row.length, 1)}, minmax(0, 1fr))` }}>
          {row.map((agent) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              activeAgentId={activeAgentId}
              allAgents={allAgents}
              onSelectAgent={onSelectAgent}
              onCreateAgent={onCreateAgent}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              onMoveAgent={onMoveAgent}
              onDropAgent={onDropAgent}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function renderTeams(
  nodes: TreeNode<AgentRecord>[],
  allAgents: AgentRecord[],
  activeAgentId: string | undefined,
  onSelectAgent: (id: string) => void,
  onCreateAgent: (parentId?: string) => void,
  onEditAgent: (id: string) => void,
  onDeleteAgent: (id: string) => void,
  onMoveAgent: (agent: AgentRecord) => void,
  onDropAgent: (draggedId: string, targetId: string) => void
) {
  const grouped = flattenNodes(nodes).reduce<Record<string, AgentRecord[]>>((acc, agent) => {
    const key = `${agent.department ?? 'Unassigned'} / ${agent.team ?? 'General'}`
    acc[key] ??= []
    acc[key].push(agent)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, agents]) => (
        <section key={group} className="rounded-md border p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                activeAgentId={activeAgentId}
                allAgents={allAgents}
                onSelectAgent={onSelectAgent}
                onCreateAgent={onCreateAgent}
                onEditAgent={onEditAgent}
                onDeleteAgent={onDeleteAgent}
                onMoveAgent={onMoveAgent}
                onDropAgent={onDropAgent}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function OrgTree({
  nodes,
  allAgents,
  activeAgentId,
  viewMode,
  onSelectAgent,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onReparentAgent,
}: OrgTreeProps) {
  const [reparentState, setReparentState] = useState<ReparentState | null>(null)
  const [reparentResult, setReparentResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleMoveAgent = (agent: AgentRecord) => {
    setReparentState({
      agentId: agent.id,
      agentName: agent.name,
      agentRole: agent.role,
      currentParentId: agent.parentId,
    })
  }

  const handleConfirmMove = async (newParentId: string | undefined, comment: string) => {
    if (!reparentState) return
    const result = await onReparentAgent(reparentState.agentId, newParentId, comment)
    setReparentState(null)
    setReparentResult(result)
  }

  // Drag-drop handler: validate cycle then call reparent
  const handleDropAgent = useCallback(async (draggedId: string, targetId: string) => {
    if (wouldCreateCycle(allAgents, draggedId, targetId)) {
      setReparentResult({ success: false, error: 'Circular reference detected' })
      return
    }
    const result = await onReparentAgent(draggedId, targetId, '')
    setReparentResult(result)
  }, [allAgents, onReparentAgent])

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
    <div className="space-y-3 py-2">
      {viewMode === 'hierarchy' ? (
        <div>
          {nodes.map((node) => (
            <HierarchyNode
              key={node.data.id}
              node={node}
              activeAgentId={activeAgentId}
              allAgents={allAgents}
              onSelectAgent={onSelectAgent}
              onCreateAgent={onCreateAgent}
              onEditAgent={onEditAgent}
              onDeleteAgent={onDeleteAgent}
              onMoveAgent={handleMoveAgent}
              onDropAgent={handleDropAgent}
            />
          ))}
        </div>
      ) : null}
      {viewMode === 'org-chart' ? renderOrgChart(nodes, allAgents, activeAgentId, onSelectAgent, onCreateAgent, onEditAgent, onDeleteAgent, handleMoveAgent, handleDropAgent) : null}
      {viewMode === 'teams' ? renderTeams(nodes, allAgents, activeAgentId, onSelectAgent, onCreateAgent, onEditAgent, onDeleteAgent, handleMoveAgent, handleDropAgent) : null}

      {reparentState && (
        <ReparentDialog
          reparent={reparentState}
          allAgents={allAgents}
          onConfirm={handleConfirmMove}
          onCancel={() => setReparentState(null)}
        />
      )}

      {reparentResult && (
        <ReparentResult
          success={reparentResult.success}
          error={reparentResult.error}
          onDismiss={() => setReparentResult(null)}
        />
      )}
    </div>
  )
}

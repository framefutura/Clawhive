import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Users,
  Brain,
  Search,
  Tag,
  Clock,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Pause,
  X,
} from 'lucide-react'
import type { AgentRecord } from '../../common/agent'
import type { SharedMemory } from '../../common/team'

export type AgentStatus = 'idle' | 'working' | 'error' | 'paused'

export interface TaskInfo {
  id: string
  title: string
  status: 'running' | 'complete' | 'error'
}

export interface ActivityEvent {
  id: string
  type: 'task_start' | 'task_complete' | 'memory_share' | 'message' | 'error'
  agentId: string
  agentName: string
  description: string
  timestamp: number
  targetId?: string
}

export interface SwarmViewProps {
  teamId: string
  teamName: string
  members: AgentRecord[]
  agentStatuses: Record<string, AgentStatus>
  activeTasks: Record<string, TaskInfo>
  sharedMemories: SharedMemory[]
  activityFeed: ActivityEvent[]
  onNavigateToAgent?: (agentId: string) => void
  onNavigateToTask?: (taskId: string) => void
  onNavigateToMemory?: (memoryId: string) => void
  onFilterMemoryByTag?: (tag: string) => void
}

const STATUS_CONFIG: Record<AgentStatus, { color: string; icon: typeof Loader2; label: string }> = {
  idle: { color: 'bg-green-500', icon: CheckCircle, label: 'Idle' },
  working: { color: 'bg-blue-500 animate-pulse', icon: Loader2, label: 'Working' },
  error: { color: 'bg-red-500', icon: AlertCircle, label: 'Error' },
  paused: { color: 'bg-amber-500', icon: Pause, label: 'Paused' },
}

const MEMORY_TYPE_ICONS: Record<string, typeof MessageSquare> = {
  conversation: MessageSquare,
  file: FileText,
  note: Brain,
  task_result: CheckCircle,
}

const EVENT_TYPE_ICONS: Record<string, typeof MessageSquare> = {
  task_start: Loader2,
  task_complete: CheckCircle,
  memory_share: Brain,
  message: MessageSquare,
  error: AlertCircle,
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function AgentCard({
  agent,
  status,
  activeTask,
  onClick,
}: {
  agent: AgentRecord
  status: AgentStatus
  activeTask?: TaskInfo
  onClick?: () => void
}) {
  const statusCfg = STATUS_CONFIG[status]
  const StatusIcon = statusCfg.icon
  const geneColor = agent.genes.length > 0 ? 'border-primary' : 'border-muted-foreground/30'

  return (
    <button
      type="button"
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 bg-card',
        'hover:bg-accent/50 transition-colors cursor-pointer text-left w-full',
        geneColor
      )}
      onClick={onClick}
    >
      <div className="relative">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          'bg-muted text-muted-foreground font-semibold text-sm'
        )}>
          {agent.name.charAt(0).toUpperCase()}
        </div>
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
          statusCfg.color
        )} />
      </div>
      <div className="text-center min-w-0 w-full">
        <div className="text-xs font-medium truncate">{agent.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">{agent.role}</div>
      </div>
      {activeTask && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground w-full">
          <StatusIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{activeTask.title}</span>
        </div>
      )}
      <div className={cn(
        'flex items-center gap-1 text-[10px]',
        status === 'working' && 'text-blue-500',
        status === 'error' && 'text-red-500',
        status === 'idle' && 'text-green-500',
        status === 'paused' && 'text-amber-500',
      )}>
        <StatusIcon className="w-3 h-3" />
        <span>{statusCfg.label}</span>
      </div>
    </button>
  )
}

function MemoryCard({
  memory,
  onNavigate,
  onTagClick,
}: {
  memory: SharedMemory
  onNavigate?: () => void
  onTagClick?: (tag: string) => void
}) {
  const Icon = MEMORY_TYPE_ICONS[memory.type] || Brain

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors',
        onNavigate && 'cursor-pointer'
      )}
      onClick={onNavigate}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate?.()}
      role={onNavigate ? 'button' : undefined}
      tabIndex={onNavigate ? 0 : undefined}
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium capitalize">{memory.type.replace('_', ' ')}</div>
          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {memory.content.slice(0, 150)}
          </div>
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {memory.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTagClick?.(tag)
                  }}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-1">
            {formatRelativeTime(memory.sharedAt)}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActivityItem({
  event,
  onClick,
}: {
  event: ActivityEvent
  onClick?: () => void
}) {
  const Icon = EVENT_TYPE_ICONS[event.type] || MessageSquare

  return (
    <div
      className={cn(
        'flex items-start gap-2 py-1.5',
        onClick && 'cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1'
      )}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Icon className={cn(
        'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
        event.type === 'error' && 'text-red-500',
        event.type === 'task_complete' && 'text-green-500',
        event.type === 'task_start' && 'text-blue-500',
        event.type === 'memory_share' && 'text-violet-500',
        event.type === 'message' && 'text-muted-foreground',
      )} />
      <div className="min-w-0 flex-1">
        <div className="text-xs">
          <span className="font-medium">{event.agentName}</span>
          {' '}
          <span className="text-muted-foreground">{event.description}</span>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5" />
          {formatRelativeTime(event.timestamp)}
        </div>
      </div>
    </div>
  )
}

export function SwarmView({
  teamName,
  members,
  agentStatuses,
  activeTasks,
  sharedMemories,
  activityFeed,
  onNavigateToAgent,
  onNavigateToTask,
  onNavigateToMemory,
  onFilterMemoryByTag,
}: SwarmViewProps) {
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMemories = useMemo(() => {
    let result = sharedMemories
    if (tagFilter) {
      result = result.filter((m) => m.tags.includes(tagFilter))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((m) => m.content.toLowerCase().includes(q))
    }
    return result
  }, [sharedMemories, tagFilter, searchQuery])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const mem of sharedMemories) {
      for (const tag of mem.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [sharedMemories])

  const workingCount = members.filter((m) => agentStatuses[m.id] === 'working').length
  const errorCount = members.filter((m) => agentStatuses[m.id] === 'error').length

  return (
    <div className="flex flex-col h-full">
      {/* Monitoring header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-semibold">{teamName} Swarm</h2>
          <span className="text-xs text-muted-foreground">
            {members.length} members
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {workingCount > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              {workingCount} working
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-3 h-3" />
              {errorCount} errors
            </span>
          )}
        </div>
      </div>

      {/* 3-column layout: agents | activity | memories */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r overflow-y-auto p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Team Members</div>
          <div className="grid grid-cols-2 gap-2">
            {members.map((member) => (
              <AgentCard
                key={member.id}
                agent={member}
                status={agentStatuses[member.id] || 'idle'}
                activeTask={activeTasks[member.id]}
                onClick={() => onNavigateToAgent?.(member.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 border-r">
          <div className="text-xs font-medium text-muted-foreground mb-2">Activity Feed</div>
          {activityFeed.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">
              No activity yet
            </div>
          ) : (
            <div className="space-y-0.5">
              {activityFeed.map((event) => (
                <ActivityItem
                  key={event.id}
                  event={event}
                  onClick={
                    event.targetId
                      ? () => {
                          if (event.type === 'task_start' || event.type === 'task_complete') {
                            onNavigateToTask?.(event.targetId!)
                          } else if (event.type === 'memory_share') {
                            onNavigateToMemory?.(event.targetId!)
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-72 overflow-y-auto p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Shared Memories</div>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tagFilter && (
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20"
                  onClick={() => setTagFilter(null)}
                >
                  <X className="w-2.5 h-2.5" />
                  Clear
                </button>
              )}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full',
                    tagFilter === tag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => {
                    setTagFilter(tagFilter === tag ? null : tag)
                    onFilterMemoryByTag?.(tag)
                  }}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {filteredMemories.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                {searchQuery || tagFilter ? 'No matching memories' : 'No shared memories yet'}
              </div>
            ) : (
              filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onNavigate={() => onNavigateToMemory?.(memory.id)}
                  onTagClick={(tag) => setTagFilter(tag)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Plus,
  MessageSquare,
  FileText,
  Activity,
  Zap,
  Clock,
} from 'lucide-react'
import type { GeneCategory } from '../types'

interface BlackboardProps {
  workspaceId: string
  workspaceName: string
  activeGenes: { category: GeneCategory; name: string }[]
  currentTask?: string
  agentStatus: 'idle' | 'working' | 'error' | 'paused'
  recentMessages: { content: string; timestamp: number }[]
  onNewTask: () => void
  onOpenChat: () => void
  onViewLogs: () => void
}

const CATEGORY_COLORS: Record<GeneCategory, { bg: string; text: string; dot: string }> = {
  dev: { bg: 'bg-gene-dev/10', text: 'text-gene-dev', dot: 'bg-gene-dev' },
  data: { bg: 'bg-gene-data/10', text: 'text-gene-data', dot: 'bg-gene-data' },
  ops: { bg: 'bg-gene-ops/10', text: 'text-gene-ops', dot: 'bg-gene-ops' },
  network: { bg: 'bg-gene-network/10', text: 'text-gene-network', dot: 'bg-gene-network' },
  creative: { bg: 'bg-gene-creative/10', text: 'text-gene-creative', dot: 'bg-gene-creative' },
  comm: { bg: 'bg-gene-comm/10', text: 'text-gene-comm', dot: 'bg-gene-comm' },
  security: { bg: 'bg-gene-security/10', text: 'text-gene-security', dot: 'bg-gene-security' },
  efficiency: { bg: 'bg-gene-efficiency/10', text: 'text-gene-efficiency', dot: 'bg-gene-efficiency' },
}

const STATUS_CONFIG = {
  idle: { color: 'bg-muted-foreground', text: 'text-muted-foreground', label: 'Idle' },
  working: { color: 'bg-primary', text: 'text-primary', label: 'Working' },
  error: { color: 'bg-destructive', text: 'text-destructive', label: 'Error' },
  paused: { color: 'bg-amber-500', text: 'text-amber-500', label: 'Paused' },
}

// Gene Card Component
function GeneCard({
  category,
  name,
  isWorking,
}: {
  category: GeneCategory
  name: string
  isWorking?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const colors = CATEGORY_COLORS[category]

  return (
    <div
      className={cn(
        "relative p-3 rounded-lg border cursor-pointer transition-all duration-200",
        colors.bg,
        "border-transparent hover:border-current/30",
        isWorking && "animate-glow-pulse"
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
        <span className={cn("font-medium text-sm truncate", colors.text)}>{name}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg border whitespace-nowrap">
          {name} ({category})
          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-popover" />
        </div>
      )}
    </div>
  )
}

// Status Pill Component
function StatusPill({ status }: { status: BlackboardProps['agentStatus'] }) {
  const config = STATUS_CONFIG[status]

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border",
      status === 'working' && "animate-pulse",
      "bg-background border-border"
    )}>
      <span className={cn("w-2 h-2 rounded-full", config.color)} />
      <span className={config.text}>{config.label}</span>
    </div>
  )
}

// Current Task Banner Component
function TaskBanner({ task, isWorking }: { task?: string; isWorking: boolean }) {
  if (!task) {
    return (
      <div className="p-4 rounded-lg border border-dashed border-border bg-muted/50">
        <p className="text-sm text-muted-foreground">No active task</p>
      </div>
    )
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      "bg-accent/10 border-accent/20",
      isWorking && "animate-glow-pulse"
    )}>
      <div className="flex items-start gap-3">
        <Activity className={cn(
          "w-5 h-5 mt-0.5",
          isWorking ? "text-primary animate-pulse" : "text-accent"
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Current Task</p>
          <p className="text-sm text-muted-foreground mt-1 truncate">{task}</p>
        </div>
      </div>
    </div>
  )
}

// Message Item Component
function MessageItem({ content, timestamp }: { content: string; timestamp: number }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <Clock className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-sm text-foreground truncate">{content}</p>
      </div>
    </div>
  )
}

export function Blackboard({
  workspaceId,
  workspaceName,
  activeGenes,
  currentTask,
  agentStatus,
  recentMessages,
  onNewTask,
  onOpenChat,
  onViewLogs,
}: BlackboardProps) {
  const isWorking = agentStatus === 'working'

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Section: Workspace Name + Status */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{workspaceName}</h1>
          <span className="text-xs text-muted-foreground">({workspaceId.slice(0, 8)}...)</span>
        </div>
        <StatusPill status={agentStatus} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel (60%): Active Genes */}
        <div className="w-[60%] p-6 overflow-y-auto border-r">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Active Genes</h2>
            <span className="text-xs text-muted-foreground ml-auto">
              {activeGenes.length} loaded
            </span>
          </div>

          {activeGenes.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-lg">
              <p className="text-sm text-muted-foreground">No active genes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Genes will appear here when activated
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeGenes.map((gene, index) => (
                <GeneCard
                  key={`${gene.name}-${index}`}
                  category={gene.category}
                  name={gene.name}
                  isWorking={isWorking}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel (40%): Messages + Task */}
        <div className="w-[40%] flex flex-col">
          {/* Current Task Banner */}
          <div className="p-4 border-b shrink-0">
            <TaskBanner task={currentTask} isWorking={isWorking} />
          </div>

          {/* Recent Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">Recent Activity</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {recentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No recent messages</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chat activity will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentMessages.slice(-10).map((msg, index) => (
                    <MessageItem
                      key={index}
                      content={msg.content}
                      timestamp={msg.timestamp}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center gap-2 px-6 py-4 border-t shrink-0 bg-muted/30">
        <Button
          onClick={onNewTask}
          className="flex-1"
          variant="default"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
        <Button
          onClick={onOpenChat}
          className="flex-1"
          variant="outline"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Open Chat
        </Button>
        <Button
          onClick={onViewLogs}
          className="flex-1"
          variant="outline"
        >
          <FileText className="w-4 h-4 mr-2" />
          View Logs
        </Button>
      </div>
    </div>
  )
}

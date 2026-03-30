import React from 'react'
import { ClipboardList, Activity, MessageSquare, Zap } from 'lucide-react'
import { BlackboardCard } from './BlackboardCard'
import { GeneBadgeGroup } from './GeneBadge'
import type { GeneCategory } from '../types'

interface BlackboardProps {
  activeGenes: { category: GeneCategory; name: string }[]
  currentTask?: string
  agentStatus: 'idle' | 'working'
  recentMessages: { content: string; timestamp: number }[]
  onNewTask: () => void
  onOpenChat: () => void
  onViewLogs: () => void
}

export function Blackboard({
  activeGenes,
  currentTask,
  agentStatus,
  recentMessages,
  onNewTask,
  onOpenChat,
  onViewLogs,
}: BlackboardProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Blackboard</h2>
          <p className="text-sm text-muted-foreground">Your cyber workspace</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNewTask}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Task Card */}
        <BlackboardCard
          title="Current Task"
          icon={<ClipboardList className="h-4 w-4" />}
          status={agentStatus === 'working' ? 'working' : 'idle'}
          metric={currentTask || 'No active task'}
          metricLabel={agentStatus === 'working' ? 'In progress...' : 'Ready'}
          action={{ label: 'View Details', onClick: onViewLogs }}
        />

        {/* Active Genes Card */}
        <BlackboardCard
          title="Active Genes"
          icon={<Zap className="h-4 w-4" />}
          status="idle"
          metric={activeGenes.length}
          metricLabel="capabilities loaded"
        >
          <div className="mt-2">
            <GeneBadgeGroup genes={activeGenes} maxVisible={3} size="sm" />
          </div>
        </BlackboardCard>

        {/* Agent Status Card */}
        <BlackboardCard
          title="Agent Status"
          icon={<Activity className="h-4 w-4" />}
          status={agentStatus}
          metric={agentStatus === 'working' ? 'Working' : 'Idle'}
          metricLabel="Last active: just now"
          action={{ label: agentStatus === 'working' ? 'View Progress' : 'Start Task', onClick: onNewTask }}
        />
      </div>

      {/* Recent Activity */}
      <div className="boundary-panel p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Recent Activity</h3>
        </div>
        {recentMessages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentMessages.slice(0, 5).map((msg, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-muted-foreground text-xs mt-0.5">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-muted-foreground truncate">{msg.content}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onOpenChat}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Open Chat
        </button>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex gap-2">
        <button
          onClick={onNewTask}
          className="flex-1 px-4 py-3 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          New Task
        </button>
        <button
          onClick={onViewLogs}
          className="flex-1 px-4 py-3 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          View Logs
        </button>
        <button
          onClick={onOpenChat}
          className="flex-1 px-4 py-3 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          Open Chat
        </button>
      </div>
    </div>
  )
}

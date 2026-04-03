import React, { useState } from 'react'
import { Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdaptiveTabBar } from './detail/AdaptiveTabBar'
import type { AgentRecord } from '../../common/agent'

const AGENT_TABS = ['Profile', 'Files', 'History'] as const
type AgentTab = (typeof AGENT_TABS)[number]

interface AgentDetailPanelProps {
  agent: AgentRecord | null
  pinned: boolean
  onTogglePinned: () => void
}

export function AgentDetailPanel({ agent, pinned, onTogglePinned }: AgentDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<AgentTab>('Profile')

  if (!agent) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold">Details</h2>
          <button
            onClick={onTogglePinned}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label={pinned ? 'Unpin panel' : 'Pin panel'}
            title={pinned ? 'Unpin panel' : 'Pin panel'}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Select an agent to inspect its registry details.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header with agent info and pin */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{agent.name}</h2>
          <p className="text-xs text-muted-foreground">{agent.role}</p>
        </div>
        <button
          onClick={onTogglePinned}
          className={cn(
            'p-1.5 rounded hover:bg-muted transition-colors shrink-0',
            pinned && 'text-primary'
          )}
          aria-label={pinned ? 'Unpin panel' : 'Pin panel'}
          title={pinned ? 'Unpin panel' : 'Pin panel'}
        >
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      </div>

      {/* Adaptive tab bar */}
      <AdaptiveTabBar
        tabs={[...AGENT_TABS]}
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'Profile' && (
          <ProfileTabContent agent={agent} />
        )}
        {activeTab === 'Files' && (
          <FilesTabContent agent={agent} />
        )}
        {activeTab === 'History' && (
          <HistoryTabContent agent={agent} />
        )}
      </div>
    </div>
  )
}

/* ---------- Profile tab ---------- */

function ProfileTabContent({ agent }: { agent: AgentRecord }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border p-2">
          <div className="text-muted-foreground">Status</div>
          <div className="capitalize">{agent.status}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground">Lifecycle</div>
          <div className="capitalize">{agent.lifecycle}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border p-2">
          <div className="text-muted-foreground">Provider</div>
          <div>{agent.provider}</div>
        </div>
        <div className="rounded border p-2">
          <div className="text-muted-foreground">Model</div>
          <div className="truncate">{agent.model}</div>
        </div>
      </div>
      {agent.department && (
        <div className="text-xs">
          <span className="text-muted-foreground">Department: </span>{agent.department}
        </div>
      )}
      {agent.team && (
        <div className="text-xs">
          <span className="text-muted-foreground">Team: </span>{agent.team}
        </div>
      )}
    </div>
  )
}

/* ---------- Files tab (placeholder — enriched in Task 2) ---------- */

function FilesTabContent({ agent }: { agent: AgentRecord }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <p>Agent files surface coming in Task 2.</p>
    </div>
  )
}

/* ---------- History tab (placeholder — enriched in Task 2) ---------- */

function HistoryTabContent({ agent }: { agent: AgentRecord }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <p>Agent history surface coming in Task 2.</p>
    </div>
  )
}

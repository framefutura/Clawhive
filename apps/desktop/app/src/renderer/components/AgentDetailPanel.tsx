import React, { useState } from 'react'
import {
  Pin,
  PinOff,
  FileText,
  Server,
  Terminal,
  BookOpen,
  Wrench,
  Link,
  Clock,
  Quote,
  Eye,
  Pencil,
  X,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdaptiveTabBar } from './detail/AdaptiveTabBar'
import { AGENT_DOC_KEYS, type AgentRecord } from '../../common/agent'

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
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [docDraft, setDocDraft] = useState('')

  const DOC_FILES = ['soul.md', 'heartbeat.md', 'tools.md', 'agents.md', 'interaction.md'] as const

  const handleStartEdit = (docName: string) => {
    // Read current content via the doc key
    const key = docName.replace('.md', '') as keyof typeof agent.docs
    setDocDraft(agent.docs[key] || '')
    setEditingDoc(docName)
  }

  const handleCancelEdit = () => {
    setEditingDoc(null)
    setDocDraft('')
  }

  const handleSaveEdit = () => {
    // Save will be wired to IPC in future task when doc persistence is added
    setEditingDoc(null)
    setDocDraft('')
  }

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

      {/* Agent Docs */}
      <div className="pt-2 border-t">
        <div className="text-xs font-medium text-muted-foreground mb-2">Agent Docs</div>
        <div className="space-y-1.5">
          {DOC_FILES.map((docName) => (
            <div key={docName} className="group">
              {editingDoc === docName ? (
                <div className="rounded border p-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono">{docName}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Save"
                      >
                        <Save className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="w-full min-h-[80px] p-2 text-xs font-mono border rounded bg-background resize-y"
                    value={docDraft}
                    onChange={(e) => setDocDraft(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded border p-2 text-xs">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-mono">{docName}</span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(docName)}
                    className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    title={`Edit ${docName}`}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Files tab — subject-aware customization areas ---------- */

interface CustomizationRowProps {
  icon: React.ReactNode
  label: string
  count: number
}

function CustomizationRow({ icon, label, count }: CustomizationRowProps) {
  return (
    <div className="flex items-center gap-2 rounded border p-2 text-xs">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-muted-foreground tabular-nums">{count}</span>
    </div>
  )
}

function FilesTabContent({ agent }: { agent: AgentRecord }) {
  const c = agent.customizations
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground">Customization Areas</div>
      <div className="space-y-1.5">
        <CustomizationRow
          icon={<Wrench className="h-3.5 w-3.5" />}
          label="skills"
          count={c.skills.length}
        />
        <CustomizationRow
          icon={<BookOpen className="h-3.5 w-3.5" />}
          label="knowledgeDocs"
          count={c.knowledgeDocs.length}
        />
        <CustomizationRow
          icon={<Server className="h-3.5 w-3.5" />}
          label="mcpServers"
          count={c.mcpServers.length}
        />
        <CustomizationRow
          icon={<Terminal className="h-3.5 w-3.5" />}
          label="cliTools"
          count={c.cliTools.length}
        />
        <CustomizationRow
          icon={<FileText className="h-3.5 w-3.5" />}
          label="documentRefs"
          count={c.documentRefs.length}
        />
        <CustomizationRow
          icon={<Link className="h-3.5 w-3.5" />}
          label="toolRefs"
          count={c.toolRefs.length}
        />
      </div>

      {/* Per-item lists when populated */}
      {c.skills.length > 0 && (
        <div className="text-xs">
          <div className="text-muted-foreground mb-1 font-medium">Skills</div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {c.skills.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}
      {c.knowledgeDocs.length > 0 && (
        <div className="text-xs">
          <div className="text-muted-foreground mb-1 font-medium">Knowledge Docs</div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {c.knowledgeDocs.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      )}
      {c.mcpServers.length > 0 && (
        <div className="text-xs">
          <div className="text-muted-foreground mb-1 font-medium">MCP Servers</div>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
            {c.mcpServers.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ---------- History tab — placeholder with quick actions ---------- */

interface HistoryItem {
  id: string
  label: string
  timestamp: number
}

function HistoryTabContent({ agent }: { agent: AgentRecord }) {
  // Derive minimal history from available agent metadata
  const items: HistoryItem[] = []

  if (agent.createdAt) {
    items.push({ id: 'created', label: `${agent.name} created`, timestamp: agent.createdAt })
  }
  if (agent.lastActiveAt) {
    items.push({ id: 'last-active', label: 'Last active', timestamp: agent.lastActiveAt })
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground">History</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">No history entries yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-2 rounded border p-2 text-xs">
              <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.label}</div>
                <div className="text-muted-foreground">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Quote"
                >
                  <Quote className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title="Preview"
                >
                  <Eye className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

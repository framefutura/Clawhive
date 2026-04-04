import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type {
  TaskAssignmentMode,
  TaskSecurityLevel,
  TaskRouteRequest,
  TaskRouterSnapshotDTO,
} from '../../common/task-router'

interface TaskRouterPanelProps {
  agents: { id: string; name: string }[]
  activeAgentId?: string
  visible: boolean
  onClose: () => void
}

const MODE_LABELS: Record<TaskAssignmentMode, string> = {
  auto: 'Auto Delegate',
  agent: 'Specific Agent',
  team: 'Team Collaboration',
}

export function TaskRouterPanel({
  agents,
  activeAgentId,
  visible,
  onClose,
}: TaskRouterPanelProps) {
  const [mode, setMode] = useState<TaskAssignmentMode>('auto')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [heartbeatMs, setHeartbeatMs] = useState(5000)
  const [taskContent, setTaskContent] = useState('')
  const [securityLevel, setSecurityLevel] = useState<TaskSecurityLevel>('medium')
  const [snapshot, setSnapshot] = useState<TaskRouterSnapshotDTO | null>(null)
  const [lastDecision, setLastDecision] = useState<{
    originatingSecurityLevel: TaskSecurityLevel
    effectiveSecurityLevel: TaskSecurityLevel
    assignedAgentId: string
    error?: string
  } | null>(null)

  const refreshSnapshot = useCallback(async () => {
    try {
      const snap = await window.clawhive.taskRouterGetSnapshot()
      setSnapshot(snap)
    } catch {
      // Router not available yet
    }
  }, [])

  useEffect(() => {
    if (visible) refreshSnapshot()
  }, [visible, refreshSnapshot])

  const handleSetHeartbeat = async () => {
    if (!activeAgentId) return
    await window.clawhive.taskRouterSetHeartbeat(activeAgentId, heartbeatMs)
    await refreshSnapshot()
  }

  const handleSubmitTask = async () => {
    if (!taskContent.trim()) return

    const request: TaskRouteRequest = {
      taskId: crypto.randomUUID(),
      content: taskContent,
      originatingSecurityLevel: securityLevel,
      mode,
      parentAgentId: activeAgentId,
      ...(mode === 'agent' && selectedAgentId ? { assignedAgentId: selectedAgentId } : {}),
      ...(mode === 'team' && teamId ? { assignedTeamId: teamId } : {}),
    }

    try {
      const decision = await window.clawhive.taskRouterEnqueue(request)
      setLastDecision({
        originatingSecurityLevel: decision.originatingSecurityLevel,
        effectiveSecurityLevel: decision.effectiveSecurityLevel,
        assignedAgentId: decision.assignedAgentId,
        error: decision.error,
      })
      setTaskContent('')
      await refreshSnapshot()
    } catch (err) {
      console.error('Task routing failed:', err)
    }
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-sm">Task Router</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground"
            aria-label="Close task router panel"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-auto flex-1">
          {/* Mode selector */}
          <fieldset>
            <legend className="text-xs font-medium text-muted-foreground mb-2">
              Assignment Mode
            </legend>
            <div className="flex gap-2">
              {(['auto', 'agent', 'team'] as TaskAssignmentMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded border transition-colors',
                    mode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-muted'
                  )}
                >
                  {MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Agent picker (when mode is 'agent') */}
          {mode === 'agent' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Target Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full px-2 py-1.5 text-sm rounded border bg-background"
              >
                <option value="">Select agent...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Team picker (when mode is 'team') */}
          {mode === 'team' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Team ID
              </label>
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="Enter team identifier"
                className="w-full px-2 py-1.5 text-sm rounded border bg-background"
              />
            </div>
          )}

          {/* Security level */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Security Level
            </label>
            <select
              value={securityLevel}
              onChange={(e) => setSecurityLevel(e.target.value as TaskSecurityLevel)}
              className="w-full px-2 py-1.5 text-sm rounded border bg-background"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Heartbeat config */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Heartbeat Interval (ms)
              </label>
              <input
                type="number"
                value={heartbeatMs}
                onChange={(e) => setHeartbeatMs(Number(e.target.value))}
                min={1000}
                step={1000}
                className="w-full px-2 py-1.5 text-sm rounded border bg-background"
              />
            </div>
            <button
              onClick={handleSetHeartbeat}
              className="px-3 py-1.5 text-xs rounded bg-muted hover:bg-muted/80 border"
            >
              Set
            </button>
          </div>

          {/* Task content */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Task Content
            </label>
            <textarea
              value={taskContent}
              onChange={(e) => setTaskContent(e.target.value)}
              rows={3}
              placeholder="Describe the task to route..."
              className="w-full px-2 py-1.5 text-sm rounded border bg-background resize-none"
            />
          </div>

          <button
            onClick={handleSubmitTask}
            disabled={!taskContent.trim()}
            className="w-full px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Route Task
          </button>

          {/* Last decision */}
          {lastDecision && (
            <div className="p-3 rounded border bg-muted/30 text-xs space-y-1">
              <p className="font-medium">Last Routing Decision</p>
              {lastDecision.error ? (
                <p className="text-destructive">{lastDecision.error}</p>
              ) : (
                <>
                  <p>Assigned: {agents.find(a => a.id === lastDecision.assignedAgentId)?.name ?? lastDecision.assignedAgentId}</p>
                  <p>originatingSecurityLevel: {lastDecision.originatingSecurityLevel}</p>
                  <p>effectiveSecurityLevel: {lastDecision.effectiveSecurityLevel}</p>
                </>
              )}
            </div>
          )}

          {/* Workload snapshot */}
          {snapshot && Object.keys(snapshot.agentWorkloads).length > 0 && (
            <div className="p-3 rounded border bg-muted/30 text-xs space-y-1">
              <p className="font-medium">Agent Workloads</p>
              {Object.entries(snapshot.agentWorkloads).map(([agentId, count]) => (
                <p key={agentId}>
                  {agents.find(a => a.id === agentId)?.name ?? agentId}: {count} active
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

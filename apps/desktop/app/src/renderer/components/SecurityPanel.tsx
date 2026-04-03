import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { SecurityLevel, PermissionMatrix } from '../../common/security'

interface SecurityPanelProps {
  open: boolean
  onClose: () => void
  role: string
  level: SecurityLevel
  onChangeLevel: (level: SecurityLevel) => void
  permissions: PermissionMatrix
}

const SECURITY_LEVELS: { value: SecurityLevel; label: string; description: string; color: string }[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'Allow all non-denied actions without prompting',
    color: 'bg-green-500',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Prompt only for sensitive operations (file writes, shell commands)',
    color: 'bg-yellow-500',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Require approval for every action',
    color: 'bg-red-500',
  },
]

const PERMISSION_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  allow: { label: 'Allow', variant: 'default' },
  deny: { label: 'Deny', variant: 'destructive' },
  prompt: { label: 'Prompt', variant: 'secondary' },
}

export function SecurityPanel({
  open,
  onClose,
  role,
  level,
  onChangeLevel,
  permissions,
}: SecurityPanelProps) {
  const [selectedLevel, setSelectedLevel] = useState<SecurityLevel>(level)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideEnabled, setOverrideEnabled] = useState(false)

  useEffect(() => {
    setSelectedLevel(level)
  }, [level])

  const handleLevelChange = (newLevel: SecurityLevel) => {
    setSelectedLevel(newLevel)
    onChangeLevel(newLevel)
  }

  const currentLevelInfo = SECURITY_LEVELS.find(l => l.value === selectedLevel)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Security Settings
            <Badge variant="outline">{role}</Badge>
          </DialogTitle>
          <DialogDescription>
            Configure security level and review permissions for this task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Security Level Selector */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Security Level</h4>
            <div className="grid grid-cols-3 gap-3">
              {SECURITY_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => handleLevelChange(lvl.value)}
                  className={cn(
                    'relative p-4 rounded-lg border text-left transition-all',
                    selectedLevel === lvl.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('w-3 h-3 rounded-full', lvl.color)} />
                    <span className="font-medium text-sm">{lvl.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {lvl.description}
                  </p>
                  {selectedLevel === lvl.value && (
                    <div className="absolute top-2 right-2">
                      <svg
                        className="w-4 h-4 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {currentLevelInfo && (
              <p className="text-xs text-muted-foreground">
                Current: <span className="font-medium text-foreground">{currentLevelInfo.label}</span> — {currentLevelInfo.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Role Permissions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Role Permissions</h4>

            {/* Tools */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tools
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(permissions.tools) as [string, 'allow' | 'deny' | 'prompt'][]).map(([tool, permission]) => (
                  <div
                    key={tool}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                  >
                    <code className="text-xs">{tool}</code>
                    <Badge
                      variant={PERMISSION_BADGES[permission].variant}
                      className="text-xs"
                    >
                      {PERMISSION_BADGES[permission].label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* File Access */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                File Access
              </h5>
              <div className="space-y-2 text-sm">
                {permissions.files.read.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Read:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissions.files.read.map((path: string) => (
                        <code key={path} className="text-xs bg-green-500/10 text-green-700 px-2 py-0.5 rounded">
                          {path}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {permissions.files.write.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Write:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissions.files.write.map((path: string) => (
                        <code key={path} className="text-xs bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded">
                          {path}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {permissions.files.deny.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Denied:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissions.files.deny.map((path: string) => (
                        <code key={path} className="text-xs bg-red-500/10 text-red-700 px-2 py-0.5 rounded">
                          {path}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Network */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Network
              </h5>
              <div className="space-y-2 text-sm">
                {permissions.network.allowHosts.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Allowed hosts:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissions.network.allowHosts.map((host: string) => (
                        <code key={host} className="text-xs bg-green-500/10 text-green-700 px-2 py-0.5 rounded">
                          {host}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {permissions.network.denyHosts.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Denied hosts:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {permissions.network.denyHosts.map((host: string) => (
                        <code key={host} className="text-xs bg-red-500/10 text-red-700 px-2 py-0.5 rounded">
                          {host}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Execution */}
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Execution
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                  <span className="text-xs">Shell commands</span>
                  <Badge
                    variant={PERMISSION_BADGES[permissions.execution.shell].variant}
                    className="text-xs"
                  >
                    {PERMISSION_BADGES[permissions.execution.shell].label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                  <span className="text-xs">Code execution</span>
                  <Badge
                    variant={PERMISSION_BADGES[permissions.execution.code].variant}
                    className="text-xs"
                  >
                    {PERMISSION_BADGES[permissions.execution.code].label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Override Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Temporary Override</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverride(!showOverride)}
              >
                {showOverride ? 'Hide' : 'Show'}
              </Button>
            </div>
            {showOverride && (
              <div className="p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="override-toggle"
                    checked={overrideEnabled}
                    onChange={(e) => setOverrideEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="override-toggle" className="text-sm font-medium cursor-pointer">
                      Allow this operation once
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Temporarily bypass approval requirements for the next action only.
                      Use with caution.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ActivityLogEntry {
  id: string
  timestamp: number
  session_id: string | null
  agent_id: string | null
  action_type: string
  decision: 'allowed' | 'denied' | 'prompted'
  reason: string | null
  metadata: string | null
}

interface PrivacySettingsData {
  safeZones: string[]
}

interface PrivacySettingsProps {
  open: boolean
  onClose: () => void
}

const DEFAULT_BLOCKED_PATHS = [
  '~/.ssh/*',
  '~/Library/Keychains/*',
  '~/.aws/*',
  '~/.config/*chrome*/Default/Cookies',
  '~/.npmrc',
  '/etc/passwd',
  '/etc/shadow',
  '~/.git-credentials',
  '~/.docker/config.json',
  '~/.kube/config',
  '~/.clawhive/secrets/*',
]

const DECISION_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  allowed: { label: 'Allowed', variant: 'default' },
  denied: { label: 'Denied', variant: 'destructive' },
  prompted: { label: 'Prompted', variant: 'secondary' },
}

export function PrivacySettings({ open, onClose }: PrivacySettingsProps) {
  const [safeZones, setSafeZones] = useState<string[]>([])
  const [newSafeZone, setNewSafeZone] = useState('')
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [filterDecision, setFilterDecision] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadPrivacySettings()
      loadActivityLog()
    }
  }, [open])

  const loadPrivacySettings = async () => {
    try {
      const settings = await window.clawhive.getPrivacySettings()
      setSafeZones(settings.safeZones || [])
    } catch (error) {
      console.error('Failed to load privacy settings:', error)
    }
  }

  const loadActivityLog = async () => {
    try {
      const decision = filterDecision === 'all' ? undefined : filterDecision
      const log = await window.clawhive.getActivityLog({ limit: 50, decision })
      setActivityLog(log)
    } catch (error) {
      console.error('Failed to load activity log:', error)
    }
  }

  const handleAddSafeZone = async () => {
    if (!newSafeZone.trim()) return

    setIsLoading(true)
    try {
      await window.clawhive.addSafeZone(newSafeZone.trim())
      setNewSafeZone('')
      await loadPrivacySettings()
    } catch (error) {
      console.error('Failed to add safe zone:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveSafeZone = async (zone: string) => {
    setIsLoading(true)
    try {
      await window.clawhive.removeSafeZone(zone)
      await loadPrivacySettings()
    } catch (error) {
      console.error('Failed to remove safe zone:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportLog = async () => {
    try {
      const log = await window.clawhive.getActivityLog({ limit: 1000 })
      const dataStr = JSON.stringify(log, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `clawhive-audit-log-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export activity log:', error)
    }
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  }

  const formatActionType = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Privacy Settings
            <Badge variant="outline">Security</Badge>
          </DialogTitle>
          <DialogDescription>
            Configure safe zones and review security activity log.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-6 py-4 pr-4">
            {/* Blocked Paths Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                Default Blocked Paths
                <Badge variant="secondary" className="text-xs">Read-only</Badge>
              </h4>
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">
                  These sensitive paths are blocked by default for security:
                </p>
                <div className="flex flex-wrap gap-1">
                  {DEFAULT_BLOCKED_PATHS.map((path) => (
                    <code
                      key={path}
                      className="text-xs bg-red-500/10 text-red-700 px-2 py-0.5 rounded"
                    >
                      {path}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Safe Zones Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Safe Zones</h4>
              <p className="text-xs text-muted-foreground">
                Files in these directories are accessible regardless of other restrictions.
                Workspace directories are automatically safe zones.
              </p>

              {/* Add Safe Zone */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter directory path..."
                  value={newSafeZone}
                  onChange={(e) => setNewSafeZone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSafeZone()}
                  className="flex-1"
                />
                <Button onClick={handleAddSafeZone} disabled={isLoading || !newSafeZone.trim()}>
                  Add
                </Button>
              </div>

              {/* Safe Zones List */}
              <div className="space-y-2">
                {safeZones.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No custom safe zones defined. Only workspace directories are safe.
                  </p>
                ) : (
                  safeZones.map((zone) => (
                    <div
                      key={zone}
                      className="flex items-center justify-between p-2 rounded bg-muted/50"
                    >
                      <code className="text-xs text-green-700 truncate flex-1">{zone}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSafeZone(zone)}
                        disabled={isLoading}
                        className="h-6 px-2 text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator />

            {/* Activity Log Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Activity Log</h4>
                <div className="flex items-center gap-2">
                  <Select value={filterDecision} onValueChange={setFilterDecision}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="allowed">Allowed</SelectItem>
                      <SelectItem value="denied">Denied</SelectItem>
                      <SelectItem value="prompted">Prompted</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={loadActivityLog}>
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportLog}>
                    Export
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Recent security decisions (last 50 entries)
              </p>

              {/* Activity Log Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr,100px,120px] gap-2 p-2 bg-muted/50 text-xs font-medium border-b">
                  <span>Action</span>
                  <span>Decision</span>
                  <span>Time</span>
                </div>
                <ScrollArea className="h-[200px]">
                  {activityLog.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No activity log entries found.
                    </div>
                  ) : (
                    <div className="divide-y">
                      {activityLog.map((entry) => (
                        <div
                          key={entry.id}
                          className="grid grid-cols-[1fr,100px,120px] gap-2 p-2 text-sm items-center hover:bg-muted/30"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {formatActionType(entry.action_type)}
                            </div>
                            {entry.reason && (
                              <div className="text-xs text-muted-foreground truncate">
                                {entry.reason}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={DECISION_BADGES[entry.decision].variant}
                            className="w-fit text-xs"
                          >
                            {DECISION_BADGES[entry.decision].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(entry.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

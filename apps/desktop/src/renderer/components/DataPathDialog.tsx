import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderOpen, Shield, Database, Lock } from 'lucide-react'

interface DataPathDialogProps {
  open: boolean
  onComplete: (path: string) => void
}

export function DataPathDialog({ open, onComplete }: DataPathDialogProps) {
  const [path, setPath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  const handleSelectDirectory = async () => {
    setIsSelecting(true)
    try {
      const selected = await window.clawhive.selectDirectory()
      if (selected) {
        setPath(selected)
        setError(null)
      }
    } finally {
      setIsSelecting(false)
    }
  }

  const handleContinue = () => {
    if (!path) {
      setError('Please select a data storage location')
      return
    }
    onComplete(path)
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[500px]" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-xl">Welcome to ClawHive</DialogTitle>
          <DialogDescription className="pt-2">
            Your personal cyber workspace for AI agent collaboration.
            Let's set up your secure data storage.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Security Features */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-xs font-medium">Bank-Level</div>
              <div className="text-[10px] text-muted-foreground">Security</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Database className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-xs font-medium">Local-Only</div>
              <div className="text-[10px] text-muted-foreground">Storage</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Lock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-xs font-medium">AES-256</div>
              <div className="text-[10px] text-muted-foreground">Encrypted</div>
            </div>
          </div>

          {/* Data Path Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Data Storage Location</label>
            <div className="flex gap-2">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Select a folder..."
                className="flex-1"
                readOnly
              />
              <Button
                variant="outline"
                onClick={handleSelectDirectory}
                disabled={isSelecting}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your conversations, agent configs, and API keys will be stored here.
              You can change this later in Settings.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* What will be stored */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="font-medium text-sm">What will be stored:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Chat conversation history</li>
              <li>Agent configurations and genes</li>
              <li>Application settings</li>
              <li>API keys (encrypted)</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleContinue} disabled={!path}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import React from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { ModelPicker, type Provider } from './ModelPicker'

interface TopBarProps {
  selectedProvider: Provider
  selectedModel: string
  onProviderChange: (provider: Provider) => void
  onModelChange: (model: string) => void
  onOpenSettings: () => void
}

export function TopBar({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="h-12 border-b flex items-center justify-between px-4 bg-background shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm">ClawHive</span>
        <span className="text-xs text-muted-foreground">DeskClaw-inspired Cyber Workspace</span>
      </div>

      <ModelPicker
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={onProviderChange}
        onModelChange={onModelChange}
      />

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onOpenSettings}>
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

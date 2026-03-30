import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'

interface SettingsProps {
  open: boolean
  onClose: () => void
  storagePath: string
  onStoragePathChange: (path: string) => void
}

export function Settings({ open, onClose, storagePath, onStoragePathChange }: SettingsProps) {
  const { theme, setTheme } = useTheme()
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    ollama: '',
  })

  useEffect(() => {
    // Load saved API keys
    const loadKeys = async () => {
      const config = await window.clawhive.getConfig()
      setApiKeys({
        anthropic: config.anthropicApiKey || '',
        openai: config.openaiApiKey || '',
        ollama: config.ollamaBaseUrl || '',
      })
    }
    if (open) loadKeys()
  }, [open])

  const handleApiKeySave = async (provider: keyof typeof apiKeys) => {
    const key = apiKeys[provider]
    await window.clawhive.setConfig(
      provider === 'ollama' ? { ollamaBaseUrl: key } : { [`${provider}ApiKey`]: key }
    )
  }

  const handleSelectStoragePath = async () => {
    const path = await window.clawhive.selectDirectory()
    if (path) {
      await window.clawhive.setStoragePath(path)
      onStoragePathChange(path)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your API keys and preferences.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Keys */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">API Keys</h4>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Anthropic</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeys.anthropic}
                  onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                />
                <Button onClick={() => handleApiKeySave('anthropic')} size="sm">
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">OpenAI</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKeys.openai}
                  onChange={(e) => setApiKeys({ ...apiKeys, openai: e.target.value })}
                />
                <Button onClick={() => handleApiKeySave('openai')} size="sm">
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Ollama Base URL</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={apiKeys.ollama}
                  onChange={(e) => setApiKeys({ ...apiKeys, ollama: e.target.value })}
                />
                <Button onClick={() => handleApiKeySave('ollama')} size="sm">
                  Save
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Theme */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Theme</h4>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme(t)}
                  className="flex-1 capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Data Storage */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Data Storage</h4>
            <div className="flex gap-2">
              <Input value={storagePath} readOnly className="flex-1 text-xs" />
              <Button onClick={handleSelectStoragePath} size="sm">
                Change
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

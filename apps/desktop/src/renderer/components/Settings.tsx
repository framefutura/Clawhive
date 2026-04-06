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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTheme } from '@/hooks/useTheme'
import { useUnknownRoleBehavior } from '@/hooks/useUnknownRoleBehavior'
import type { CustomProviderConfig } from '../types'

interface SettingsProps {
  open: boolean
  onClose: () => void
  storagePath: string
  onStoragePathChange: (path: string) => void
  onOpenRepair?: () => void
}

export function Settings({ open, onClose, storagePath, onStoragePathChange, onOpenRepair }: SettingsProps) {
  const { theme, setTheme } = useTheme()
  const { unknownRoleBehavior, setUnknownRoleBehavior } = useUnknownRoleBehavior()
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    ollama: '',
  })
  const [customProvider, setCustomProvider] = useState<CustomProviderConfig>({
    baseURL: '',
    apiKey: '',
  })
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    // Load saved API keys
    const loadKeys = async () => {
      const config = await window.clawhive.getConfig()
      setApiKeys({
        anthropic: config.anthropicApiKey || '',
        openai: config.openaiApiKey || '',
        ollama: config.ollamaBaseUrl || '',
      })
      if (config.customProvider) {
        setCustomProvider(config.customProvider)
      }
    }
    if (open) loadKeys()
  }, [open])

  const handleApiKeySave = async (provider: keyof typeof apiKeys) => {
    const key = apiKeys[provider]
    await window.clawhive.setConfig(
      provider === 'ollama' ? { ollamaBaseUrl: key } : { [`${provider}ApiKey`]: key }
    )
  }

  const handleCustomProviderSave = async () => {
    await window.clawhive.setConfig({ customProvider })
    setConnectionStatus('idle')
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus('idle')
    try {
      const response = await fetch(`${customProvider.baseURL}/v1/models`, {
        headers: customProvider.apiKey
          ? { 'Authorization': `Bearer ${customProvider.apiKey}` }
          : {}
      })
      if (response.ok) {
        setConnectionStatus('success')
      } else {
        setConnectionStatus('error')
      }
    } catch {
      setConnectionStatus('error')
    } finally {
      setTestingConnection(false)
    }
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

            <Separator />

            {/* Custom Provider */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Custom LLM Provider</h4>
              <p className="text-xs text-muted-foreground">
                Connect to any OpenAI-compatible API (Ollama, LM Studio, etc.)
              </p>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Base URL</label>
                <Input
                  type="text"
                  placeholder="http://localhost:11434/v1"
                  value={customProvider.baseURL}
                  onChange={(e) => {
                    setCustomProvider({ ...customProvider, baseURL: e.target.value })
                    setConnectionStatus('idle')
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">API Key (optional)</label>
                <Input
                  type="password"
                  placeholder="Enter API key if required"
                  value={customProvider.apiKey || ''}
                  onChange={(e) => setCustomProvider({ ...customProvider, apiKey: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCustomProviderSave} 
                  size="sm"
                  className="flex-1"
                >
                  Save
                </Button>
                <Button
                  onClick={handleTestConnection}
                  size="sm"
                  variant="outline"
                  disabled={!customProvider.baseURL || testingConnection}
                >
                  {testingConnection ? 'Testing...' : 'Test'}
                </Button>
              </div>

              {connectionStatus === 'success' && (
                <p className="text-xs text-green-600">Connection successful!</p>
              )}
              {connectionStatus === 'error' && (
                <p className="text-xs text-red-600">Connection failed. Check URL and try again.</p>
              )}
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

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Unknown Agent Roles</h4>
            <p className="text-xs text-muted-foreground">
              Choose how saved agents with unrecognized roles should be treated.
            </p>
            <Select value={unknownRoleBehavior} onValueChange={(value) => setUnknownRoleBehavior(value as 'temporary' | 'persistent' | 'reject')}>
              <SelectTrigger>
                <SelectValue placeholder="Select behavior" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="temporary">Temporary fallback</SelectItem>
                <SelectItem value="persistent">Persistent specialized</SelectItem>
                <SelectItem value="reject">Reject unknown</SelectItem>
              </SelectContent>
            </Select>
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

          <Separator />

          {/* Repair & Reset */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Repair & Reset</h4>
            <p className="text-xs text-muted-foreground">
              修复应用问题或重置配置到初始状态
            </p>
            <Button variant="outline" size="sm" onClick={onOpenRepair} className="w-full">
              Open Repair Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

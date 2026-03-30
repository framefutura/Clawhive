import React, { useState } from 'react'
import { ChevronDown, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Provider = 'anthropic' | 'openai' | 'ollama'

const PROVIDER_CONFIG: Record<Provider, { name: string; color: string; defaultModel: string }> = {
  anthropic: {
    name: 'Anthropic',
    color: '#D97757',
    defaultModel: 'claude-sonnet-4-20250514'
  },
  openai: {
    name: 'OpenAI',
    color: '#10A37F',
    defaultModel: 'gpt-4o'
  },
  ollama: {
    name: 'Ollama',
    color: '#FF6B6B',
    defaultModel: 'llama3.2'
  },
}

const DEFAULT_MODELS: Record<Provider, string[]> = {
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-latest'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  ollama: ['llama3.2', 'llama3.1', 'codellama', 'mistral'],
}

interface ModelPickerProps {
  selectedProvider: Provider
  selectedModel: string
  onProviderChange: (provider: Provider) => void
  onModelChange: (model: string) => void
  detectedModels?: Record<Provider, string[] | undefined>
  ollamaDetected?: boolean
}

export function ModelPicker({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  detectedModels,
  ollamaDetected,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const provider = PROVIDER_CONFIG[selectedProvider]

  // Use detected models if available, otherwise fall back to defaults
  const getModelsForProvider = (prov: Provider): string[] => {
    if (detectedModels?.[prov]) {
      return detectedModels[prov]!
    }
    return DEFAULT_MODELS[prov]
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background",
          "hover:bg-muted transition-colors text-sm"
        )}
        aria-label="Select model"
      >
        <Bot className="h-4 w-4" style={{ color: provider.color }} />
        <span className="font-medium">{provider.name}</span>
        {ollamaDetected && selectedProvider === 'ollama' && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Local
          </span>
        )}
        <span className="text-muted-foreground">-</span>
        <span className="text-muted-foreground truncate max-w-[120px]">
          {selectedModel}
        </span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-72 bg-popover border rounded-lg shadow-lg z-50 py-1">
            {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((prov) => (
              <div key={prov} className="border-b last:border-0">
                <div
                  className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                  style={{ color: PROVIDER_CONFIG[prov].color }}
                >
                  {PROVIDER_CONFIG[prov].name}
                </div>
                <div className="px-1 pb-1">
                  {getModelsForProvider(prov).map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        onProviderChange(prov)
                        onModelChange(model)
                        setOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                        selectedProvider === prov && selectedModel === model
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

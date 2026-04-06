import React, { useState, useEffect } from 'react'
import { ChevronDown, Bot, Loader2, AlertCircle, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchCustomModels, CustomProviderConfig } from '@/hooks/useCustomProvider'

export type Provider = 'anthropic' | 'openai' | 'ollama' | 'custom'

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
  custom: {
    name: 'Custom',
    color: '#8B5CF6',
    defaultModel: ''
  },
}

const DEFAULT_MODELS: Record<Provider, string[]> = {
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-sonnet-latest'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  ollama: ['llama3.2', 'llama3.1', 'codellama', 'mistral'],
  custom: [],
}

interface ModelPickerProps {
  selectedProvider: Provider
  selectedModel: string
  onProviderChange: (provider: Provider) => void
  onModelChange: (model: string) => void
  detectedModels?: Record<Provider, string[] | undefined>
  ollamaDetected?: boolean
  customProviderConfig?: CustomProviderConfig
}

export function ModelPicker({
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  detectedModels,
  ollamaDetected,
  customProviderConfig,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [customModels, setCustomModels] = useState<string[]>([])
  const [loadingCustom, setLoadingCustom] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [manualMode, setManualMode] = useState(false)
  const [manualModel, setManualModel] = useState('')

  const provider = PROVIDER_CONFIG[selectedProvider]

  // Fetch models when custom provider is selected
  useEffect(() => {
    if (selectedProvider === 'custom' && customProviderConfig?.baseURL) {
      loadCustomModels()
    }
  }, [selectedProvider, customProviderConfig?.baseURL])

  const loadCustomModels = async () => {
    if (!customProviderConfig?.baseURL) {
      setCustomModels([])
      return
    }

    setLoadingCustom(true)
    setCustomError(null)
    try {
      const models = await fetchCustomModels(customProviderConfig)
      setCustomModels(models)
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Failed to fetch models')
      setCustomModels([])
    } finally {
      setLoadingCustom(false)
    }
  }

  const handleManualSubmit = () => {
    if (manualModel.trim()) {
      onModelChange(manualModel.trim())
      setManualMode(false)
      setOpen(false)
    }
  }

  // Use detected models if available, otherwise fall back to defaults
  const getModelsForProvider = (prov: Provider): string[] => {
    if (prov === 'custom') {
      return customModels.length > 0 ? customModels : []
    }
    if (detectedModels?.[prov]) {
      return detectedModels[prov]!
    }
    return DEFAULT_MODELS[prov]
  }

  const showManualEntry = selectedProvider === 'custom' && !loadingCustom && (customModels.length === 0 || manualMode)

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
        {selectedProvider === 'custom' && customProviderConfig?.baseURL && (
          <span className="text-xs text-muted-foreground">
            Custom
          </span>
        )}
        <span className="text-muted-foreground">-</span>
        <span className="text-muted-foreground truncate max-w-[120px]">
          {selectedModel || (selectedProvider === 'custom' ? 'Select model...' : '')}
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
                  {/* Show loading state for custom provider */}
                  {prov === 'custom' && loadingCustom && (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching models...
                    </div>
                  )}

                  {/* Show error state for custom provider */}
                  {prov === 'custom' && !loadingCustom && customError && !manualMode && (
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-red-500 mb-2">
                        <AlertCircle className="h-3 w-3" />
                        {customError}
                      </div>
                      <button
                        onClick={() => setManualMode(true)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Keyboard className="h-3 w-3" />
                        Enter model manually
                      </button>
                    </div>
                  )}

                  {/* Show models or manual entry */}
                  {prov === 'custom' && (showManualEntry || manualMode) ? (
                    <div className="px-2 py-1">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="e.g., llama3.2"
                          value={manualModel}
                          onChange={(e) => setManualModel(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                          className="flex-1 px-2 py-1 text-sm border rounded"
                          autoFocus
                        />
                        <button
                          onClick={handleManualSubmit}
                          className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
                        >
                          Add
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setManualMode(false)
                          loadCustomModels()
                        }}
                        className="text-xs text-muted-foreground mt-1 hover:text-foreground"
                      >
                        ← Back to auto-fetch
                      </button>
                    </div>
                  ) : (
                    getModelsForProvider(prov).map((model) => (
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
                    ))
                  )}

                  {/* Non-custom providers */}
                  {prov !== 'custom' && getModelsForProvider(prov).map((model) => (
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

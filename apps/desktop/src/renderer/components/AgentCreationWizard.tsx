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
import { GenePicker } from './GenePicker'
import { ModelPicker, type Provider } from './ModelPicker'
import type { Gene } from '../types'

interface AgentCreationWizardProps {
  open: boolean
  onComplete: (config: {
    name: string
    role: string
    provider: Provider
    model: string
    apiKey?: string
    genes: string[]
  }) => void
  availableGenes: Gene[]
}

type Step = 'identity' | 'model' | 'genes'

export function AgentCreationWizard({ open, onComplete, availableGenes }: AgentCreationWizardProps) {
  const [step, setStep] = useState<Step>('identity')
  const [name, setName] = useState('')
  const [role, setRole] = useState('General Assistant')
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [apiKey, setApiKey] = useState('')
  const [selectedGenes, setSelectedGenes] = useState<string[]>(['code-write', 'data-analysis'])

  const handleNext = () => {
    if (step === 'identity') setStep('model')
    else if (step === 'model') setStep('genes')
  }

  const handleBack = () => {
    if (step === 'model') setStep('identity')
    else if (step === 'genes') setStep('model')
  }

  const handleCreate = () => {
    onComplete({
      name,
      role,
      provider,
      model,
      apiKey: apiKey || undefined,
      genes: selectedGenes,
    })
  }

  const canProceed = () => {
    if (step === 'identity') return name.trim().length > 0
    if (step === 'model') return model.trim().length > 0
    return true
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[550px]" hideCloseButton>
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['identity', 'model', 'genes'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`h-2 rounded-full transition-all ${
                  step === s ? 'bg-primary w-6' : 'bg-muted w-2'
                }`}
              />
              {i < 2 && <div className="h-px w-4 bg-muted" />}
            </React.Fragment>
          ))}
        </div>

        {step === 'identity' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Create Your First Agent</DialogTitle>
              <DialogDescription className="pt-2">
                Give your AI agent a name and role. This helps define its personality and expertise.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., ClawHive Agent"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., General Assistant"
                />
                <p className="text-xs text-muted-foreground">
                  Describe what this agent specializes in.
                </p>
              </div>
            </div>
          </>
        )}

        {step === 'model' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Choose Model Provider</DialogTitle>
              <DialogDescription className="pt-2">
                Select which AI model provider and model to use for this agent.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <ModelPicker
                  selectedProvider={provider}
                  selectedModel={model}
                  onProviderChange={setProvider}
                  onModelChange={setModel}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key (optional)</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider} API key`}
                />
                <p className="text-xs text-muted-foreground">
                  You can also add this later in Settings.
                </p>
              </div>
            </div>
          </>
        )}

        {step === 'genes' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Load Genes</DialogTitle>
              <DialogDescription className="pt-2">
                Choose capabilities (genes) to load into your agent.
                These determine what your agent can do.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <GenePicker
                availableGenes={availableGenes}
                selectedGenes={selectedGenes}
                onChange={setSelectedGenes}
              />
            </div>
          </>
        )}

        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 'identity'}
          >
            Back
          </Button>
          {step !== 'genes' ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate}>
              Create Agent
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

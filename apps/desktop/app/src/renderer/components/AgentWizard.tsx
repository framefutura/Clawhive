import React, { useState, useMemo } from 'react'
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
import type { AgentRole } from '../../common/agent'

interface AgentWizardProps {
  open: boolean
  parentId?: string
  onComplete: (config: {
    name: string
    role: AgentRole
    parentId?: string
    department?: string
    team?: string
    provider: Provider
    model: string
    apiKey?: string
    genes: string[]
    allowedTools: string[]
    defaultSecurityLevel: string
  }) => void
  onCancel: () => void
  availableGenes: Gene[]
  existingAgents: { id: string; name: string; role: AgentRole }[]
}

type Step = 'role' | 'identity' | 'model' | 'genes' | 'security'

const ROLES: AgentRole[] = [
  'CEO',
  'CFO',
  'COO',
  'Department Head',
  'Team Leader',
  'Individual Agent',
  'Secretary',
]

const SECURITY_LEVELS = ['low', 'medium', 'high']

function getSuggestedParent(role: AgentRole, agents: { id: string; name: string; role: AgentRole }[]): string | undefined {
  if (role === 'CEO') return undefined
  const map: Record<AgentRole, AgentRole[]> = {
    CEO: [],
    CFO: ['CEO', 'COO'],
    COO: ['CEO'],
    'Department Head': ['CEO', 'CFO', 'COO'],
    'Team Leader': ['Department Head'],
    'Individual Agent': ['Team Leader'],
    Secretary: ['CEO'],
  }
  const validParents = map[role] || []
  const candidate = agents.find((a) => validParents.includes(a.role))
  return candidate?.id
}

function validateHierarchy(
  parentId: string | undefined,
  role: AgentRole,
  agents: { id: string; name: string; role: AgentRole; parentId?: string }[]
): string | null {
  if (role === 'CEO' && parentId) return 'CEO cannot have a parent'
  if (role !== 'CEO' && !parentId) return `${role} must have a parent`
  if (parentId) {
    const parent = agents.find((a) => a.id === parentId)
    if (!parent) return 'Parent agent not found'
    if (parent.role === 'Individual Agent') return 'Individual Agent cannot have subordinates'
    if (parent.role === 'Team Leader' && role !== 'Individual Agent') {
      return 'Team Leader can only manage Individual Agents'
    }
    if (parent.role === 'Department Head' && role !== 'Team Leader') {
      return 'Department Head can only manage Team Leaders'
    }
    if ((parent.role === 'CFO' || parent.role === 'COO') && role !== 'Department Head') {
      return `${parent.role} can only manage Department Heads`
    }
  }
  return null
}

export function AgentWizard({ open, parentId, onComplete, onCancel, availableGenes, existingAgents }: AgentWizardProps) {
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<AgentRole>('Individual Agent')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [team, setTeam] = useState('')
  const [selectedParent, setSelectedParent] = useState<string | undefined>(parentId)
  const [provider, setProvider] = useState<Provider>('anthropic')
  const [model, setModel] = useState('claude-sonnet-4-20250514')
  const [apiKey, setApiKey] = useState('')
  const [selectedGenes, setSelectedGenes] = useState<string[]>([])
  const [securityLevel, setSecurityLevel] = useState('medium')
  const [error, setError] = useState<string | null>(null)

  const agentsWithParents = useMemo(() => {
    return existingAgents.map((a) => ({ ...a, parentId: undefined as string | undefined }))
  }, [existingAgents])

  const suggestedParent = useMemo(() => getSuggestedParent(role, existingAgents), [role, existingAgents])

  const handleRoleChange = (r: AgentRole) => {
    setRole(r)
    if (!parentId) {
      setSelectedParent(getSuggestedParent(r, existingAgents))
    }
    setError(null)
  }

  const handleNext = () => {
    if (step === 'role') {
      const err = validateHierarchy(selectedParent, role, agentsWithParents)
      if (err) {
        setError(err)
        return
      }
      setStep('identity')
    } else if (step === 'identity') {
      if (!name.trim()) {
        setError('Name is required')
        return
      }
      setError(null)
      setStep('model')
    } else if (step === 'model') {
      setStep('genes')
    } else if (step === 'genes') {
      setStep('security')
    }
    setError(null)
  }

  const handleBack = () => {
    if (step === 'identity') setStep('role')
    else if (step === 'model') setStep('identity')
    else if (step === 'genes') setStep('model')
    else if (step === 'security') setStep('genes')
    setError(null)
  }

  const handleSubmit = () => {
    const err = validateHierarchy(selectedParent, role, agentsWithParents)
    if (err) {
      setError(err)
      return
    }
    onComplete({
      name: name.trim(),
      role,
      parentId: selectedParent,
      department: department.trim() || undefined,
      team: team.trim() || undefined,
      provider,
      model,
      apiKey: apiKey.trim() || undefined,
      genes: selectedGenes,
      allowedTools: [],
      defaultSecurityLevel: securityLevel,
    })
  }

  const canProceed = () => {
    if (step === 'role') return true
    if (step === 'identity') return name.trim().length > 0
    if (step === 'model') return model.trim().length > 0
    return true
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[550px]" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-xl">Create Agent</DialogTitle>
          <DialogDescription className="pt-2">
            Step {(['role', 'identity', 'model', 'genes', 'security'] as Step[]).indexOf(step) + 1} of 5
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-md">
            {error}
          </div>
        )}

        {step === 'role' && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`px-3 py-2 text-sm border rounded-md text-left transition-colors ${
                      role === r ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Parent</label>
              <select
                value={selectedParent || ''}
                onChange={(e) => setSelectedParent(e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="">None</option>
                {existingAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
              {suggestedParent && !selectedParent && (
                <p className="text-xs text-muted-foreground">
                  Suggested parent will be auto-selected.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'identity' && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Engineering" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g., Platform" />
            </div>
          </div>
        )}

        {step === 'model' && (
          <div className="py-4 space-y-4">
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
              <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={`${provider} API key`} />
            </div>
          </div>
        )}

        {step === 'genes' && (
          <div className="py-4">
            <GenePicker
              availableGenes={availableGenes}
              selectedGenes={selectedGenes}
              onChange={setSelectedGenes}
            />
          </div>
        )}

        {step === 'security' && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Security Level</label>
              <div className="flex gap-2">
                {SECURITY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSecurityLevel(lvl)}
                    className={`px-3 py-1.5 text-sm capitalize border rounded-md ${
                      securityLevel === lvl ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tool permissions will be set to deny-by-default with role presets.
            </p>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={step === 'role' ? onCancel : handleBack}>
            {step === 'role' ? 'Cancel' : 'Back'}
          </Button>
          {step !== 'security' ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit}>Create Agent</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

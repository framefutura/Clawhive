import React, { useState } from 'react'
import { DataPathDialog } from './DataPathDialog'
import { AgentCreationWizard } from './AgentCreationWizard'
import type { Provider } from './ModelPicker'
import type { Gene } from '../types'

interface FirstLaunchWizardProps {
  open: boolean
  onComplete: (config: {
    dataPath: string
    name: string
    role: string
    provider: Provider
    model: string
    apiKey?: string
    genes: string[]
  }) => void
  availableGenes: Gene[]
}

type WizardStep = 'datapath' | 'agent'

export function FirstLaunchWizard({ open, onComplete, availableGenes }: FirstLaunchWizardProps) {
  const [step, setStep] = useState<WizardStep>('datapath')
  const [dataPath, setDataPath] = useState('')

  const handleDataPathComplete = (path: string) => {
    setDataPath(path)
    setStep('agent')
  }

  const handleAgentComplete = (agentConfig: {
    name: string
    role: string
    provider: Provider
    model: string
    apiKey?: string
    genes: string[]
  }) => {
    onComplete({
      dataPath,
      ...agentConfig,
    })
  }

  if (step === 'datapath') {
    return <DataPathDialog open={open} onComplete={handleDataPathComplete} />
  }

  return (
    <AgentCreationWizard
      open={open}
      onComplete={handleAgentComplete}
      availableGenes={availableGenes}
    />
  )
}

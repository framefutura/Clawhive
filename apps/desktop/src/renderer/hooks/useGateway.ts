import { useState, useEffect, useCallback } from 'react'

export interface OllamaStatus {
  detected: boolean
  models: string[]
  baseUrl?: string
}

export interface CLIMissingError {
  type: 'cli-missing'
  message: string
  installInstructions: string
}

export function useGateway() {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cliError, setCliError] = useState<CLIMissingError | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ detected: false, models: [] })

  const connect = useCallback(async (gatewayUrl: string) => {
    try {
      setError(null)
      setCliError(null)
      await window.clawhive.connect(gatewayUrl)
      setConnected(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      setError(message)
      setConnected(false)

      // Check if this is a CLI missing error
      if (message.includes('OpenClaw CLI not found')) {
        setCliError({
          type: 'cli-missing',
          message,
          installInstructions: extractInstallInstructions(message)
        })
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    window.clawhive.disconnect()
    setConnected(false)
  }, [])

  useEffect(() => {
    const cleanup = window.clawhive.onGatewayEvent((event) => {
      const typed = event as { type: string; data?: unknown }
      if (typed.type === 'connected') setConnected(true)
      if (typed.type === 'disconnected') setConnected(false)
      if (typed.type === 'ollama-detected') {
        const data = typed.data as { models?: string[]; baseUrl?: string }
        setOllamaStatus({
          detected: true,
          models: data.models ?? [],
          baseUrl: data.baseUrl
        })
      }
      if (typed.type === 'cli-missing') {
        const data = typed.data as { message?: string }
        if (data.message) {
          setCliError({
            type: 'cli-missing',
            message: data.message,
            installInstructions: extractInstallInstructions(data.message)
          })
        }
      }
    })
    return cleanup
  }, [])

  return {
    connected,
    error,
    cliError,
    ollamaStatus,
    connect,
    disconnect
  }
}

function extractInstallInstructions(message: string): string {
  // Extract the install instructions portion from the error message
  const lines = message.split('\n')
  const installLines: string[] = []
  let inInstallSection = false

  for (const line of lines) {
    if (line.includes('npm install') || line.includes('brew install')) {
      inInstallSection = true
    }
    if (inInstallSection) {
      installLines.push(line)
    }
  }

  return installLines.join('\n') || 'npm install -g openclaw'
}

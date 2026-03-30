import { useState, useEffect, useCallback } from 'react'

export function useGateway() {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async (gatewayUrl: string) => {
    try {
      setError(null)
      await window.clawhive.connect(gatewayUrl)
      setConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setConnected(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    window.clawhive.disconnect()
    setConnected(false)
  }, [])

  useEffect(() => {
    const cleanup = window.clawhive.onGatewayEvent((event) => {
      const typed = event as { type: string }
      if (typed.type === 'connected') setConnected(true)
      if (typed.type === 'disconnected') setConnected(false)
    })
    return cleanup
  }, [])

  return { connected, error, connect, disconnect }
}

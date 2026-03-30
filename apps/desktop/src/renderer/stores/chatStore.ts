import { useState, useCallback, useEffect } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments?: File[]
}

export function useChatStore(sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isWorking, setIsWorking] = useState(false)

  // Listen for agent working state
  useEffect(() => {
    const cleanup = window.clawhive.onWorking((data) => {
      if (!sessionId || data.sessionId === sessionId) {
        setIsWorking(true)
      }
    })
    return cleanup
  }, [sessionId])

  // Listen for incoming messages
  useEffect(() => {
    const cleanup = window.clawhive.onMessage((msg) => {
      const typedMsg = msg as { id: string; role: 'user' | 'assistant'; content: string; sessionId?: string }

      // Only process messages for this session
      if (sessionId && typedMsg.sessionId !== sessionId) return

      setMessages(prev => {
        const last = prev[prev.length - 1]
        // Update streaming message if same ID
        if (last?.role === 'assistant' && last.id === typedMsg.id) {
          return [...prev.slice(0, -1), { ...last, content: typedMsg.content }]
        }
        // Add new message
        return [...prev, {
          id: typedMsg.id,
          role: typedMsg.role,
          content: typedMsg.content,
          timestamp: Date.now()
        }]
      })

      // Stop working indicator when assistant message completes
      if (typedMsg.role === 'assistant') {
        setIsWorking(false)
      }
    })
    return cleanup
  }, [sessionId])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !sessionId) return

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsWorking(true)

    try {
      await window.clawhive.sendMessage(sessionId, content)
    } catch (err) {
      setIsWorking(false)
      console.error('Failed to send message:', err)
    }
  }, [sessionId])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isWorking, sendMessage, clearMessages }
}

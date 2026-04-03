import { useState, useCallback, useEffect } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments?: File[]
}

export interface ShareResult {
  success: boolean
  memoryId?: string
  error?: string
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

  /**
   * Share the current conversation (or a range of messages) with a team.
   * Serializes messages to JSON and stores as a shared memory.
   *
   * @param teamId - Team to share with
   * @param tags - Optional tags for filtering
   * @param messageCount - Number of recent messages to share (default: all)
   */
  const shareConversation = useCallback(async (
    teamId: string,
    tags: string[] = [],
    messageCount?: number
  ): Promise<ShareResult> => {
    if (messages.length === 0) {
      return { success: false, error: 'No messages to share' }
    }

    const messagesToShare = messageCount
      ? messages.slice(-messageCount)
      : messages

    const content = JSON.stringify(
      messagesToShare.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      null,
      2
    )

    try {
      // Use a placeholder agentId derived from session context
      const agentId = sessionId || 'unknown'

      const result = await window.clawhive.shareTeamMemory(teamId, agentId, {
        type: 'conversation',
        content,
        tags,
      })

      return { success: true, memoryId: (result as { id: string })?.id }
    } catch (err) {
      console.error('Failed to share conversation:', err)
      return { success: false, error: String(err) }
    }
  }, [messages, sessionId])

  return { messages, isWorking, sendMessage, clearMessages, shareConversation }
}

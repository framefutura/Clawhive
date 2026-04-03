import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { InboxBadge, AgentInbox } from './AgentInbox'
import type { ChatMessage as ChatMessageType } from '../stores/chatStore'
import type { A2AMessage } from '../../common/a2a'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ChatViewProps {
  messages: ChatMessageType[]
  isWorking: boolean
  onSend: (content: string) => void
  /** A2A inbox messages for the current agent */
  a2aMessages?: A2AMessage[]
  /** Agent list for the inbox compose selector */
  agents?: { id: string; name: string }[]
  /** Current agent ID */
  agentId?: string
  /** Callbacks for inbox actions */
  onA2AReply?: (messageId: string, content: string) => void
  onA2AMarkRead?: (messageId: string) => void
  onA2ASendPrompt?: (toAgentId: string, content: string) => void
}

/**
 * Render incoming A2A prompts as inline system messages in the chat thread.
 */
function A2ASystemMessage({ message, agentName }: { message: A2AMessage; agentName: string }) {
  return (
    <div className="flex justify-center my-2">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 max-w-2xl">
        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
          Agent Messaging from: {agentName}
        </div>
        <p className="text-sm text-foreground">{message.content}</p>
      </div>
    </div>
  )
}

export function ChatView({
  messages,
  isWorking,
  onSend,
  a2aMessages = [],
  agents = [],
  agentId = '',
  onA2AReply,
  onA2AMarkRead,
  onA2ASendPrompt,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [inboxOpen, setInboxOpen] = useState(false)

  const unreadCount = a2aMessages.filter(m => !m.read).length

  // Filter only incoming prompt messages for inline display
  const incomingPrompts = a2aMessages.filter(
    m => m.type === 'prompt' && m.toAgentId === agentId
  )

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, incomingPrompts.length])

  const handleReply = useCallback(
    (messageId: string, content: string) => onA2AReply?.(messageId, content),
    [onA2AReply],
  )
  const handleMarkRead = useCallback(
    (messageId: string) => onA2AMarkRead?.(messageId),
    [onA2AMarkRead],
  )
  const handleSendPrompt = useCallback(
    (toAgentId: string, content: string) => onA2ASendPrompt?.(toAgentId, content),
    [onA2ASendPrompt],
  )

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 h-full">
        {/* Chat header with inbox badge */}
        {agentId && (
          <div className="flex items-center justify-end px-4 py-1 border-b">
            <InboxBadge
              unreadCount={unreadCount}
              onClick={() => setInboxOpen(!inboxOpen)}
            />
          </div>
        )}

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4 max-w-4xl mx-auto">
            {messages.length === 0 && incomingPrompts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Start a conversation
                </h2>
                <p className="text-sm">
                  Send a message to begin. Your conversations are stored locally and encrypted.
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {/* Incoming A2A prompts as system messages */}
            {incomingPrompts.map((a2aMsg) => (
              <A2ASystemMessage
                key={a2aMsg.id}
                message={a2aMsg}
                agentName={agents.find(a => a.id === a2aMsg.fromAgentId)?.name ?? a2aMsg.fromAgentId}
              />
            ))}
            {isWorking && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <ChatInput onSend={onSend} disabled={isWorking} isWorking={isWorking} />
      </div>

      {/* Inbox side panel */}
      {inboxOpen && agentId && (
        <div className="w-80 shrink-0">
          <AgentInbox
            agentId={agentId}
            messages={a2aMessages}
            agents={agents}
            onReply={handleReply}
            onMarkRead={handleMarkRead}
            onSendPrompt={handleSendPrompt}
            onClose={() => setInboxOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

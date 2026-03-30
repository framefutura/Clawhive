import React, { useRef, useEffect } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage as ChatMessageType } from '../stores/chatStore'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ChatViewProps {
  messages: ChatMessageType[]
  isWorking: boolean
  onSend: (content: string) => void
}

export function ChatView({ messages, isWorking, onSend }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
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
  )
}

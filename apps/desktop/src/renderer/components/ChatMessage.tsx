import React from 'react'
import type { ChatMessage as ChatMessageType } from '../stores/chatStore'

interface ChatMessageProps {
  message: ChatMessageType
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          message.role === 'user'
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {message.role === 'user' && (
          <div className="text-[10px] opacity-60 mt-1 text-right">
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}

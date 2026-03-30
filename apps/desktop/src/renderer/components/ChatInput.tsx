import React, { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
  isWorking?: boolean
}

export function ChatInput({ onSend, disabled, isWorking }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
      textareaRef.current?.focus()
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget
    target.style.height = 'auto'
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`
  }

  return (
    <div
      className={cn(
        "border-t bg-background p-4 transition-all duration-300",
        isWorking && "animate-glow-pulse border-primary/50"
      )}
    >
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 min-h-[44px] max-h-[120px] px-4 py-2.5 bg-muted rounded-xl border-0 resize-none focus:ring-2 focus:ring-primary/30 text-sm"
          aria-label="Chat message input"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim() || isWorking}
          className="h-11 w-11 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="max-w-4xl mx-auto mt-2 text-xs text-muted-foreground text-center">
        {isWorking ? (
          <span className="text-primary animate-pulse">Agent is working...</span>
        ) : (
          <span>Cmd+Enter to send</span>
        )}
      </div>
    </div>
  )
}

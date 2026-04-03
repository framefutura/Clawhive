import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage as ChatMessageType, ShareResult } from '../stores/chatStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Share2, ChevronDown, CheckCircle, Tag, X } from 'lucide-react'

interface TeamOption {
  id: string
  name: string
}

interface ChatViewProps {
  messages: ChatMessageType[]
  isWorking: boolean
  onSend: (content: string) => void
  teams?: TeamOption[]
  onShareConversation?: (teamId: string, tags: string[]) => Promise<ShareResult>
}

export function ChatView({ messages, isWorking, onSend, teams, onShareConversation }: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamOption | null>(null)
  const [shareTags, setShareTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [shareSuccess, setShareSuccess] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Close share menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false)
      }
    }
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showShareMenu])

  const handleShare = useCallback(async () => {
    if (!selectedTeam || !onShareConversation) return
    setIsSharing(true)
    try {
      const result = await onShareConversation(selectedTeam.id, shareTags)
      if (result.success) {
        setShareSuccess(true)
        setShowShareMenu(false)
        setShareTags([])
        setSelectedTeam(null)
        setTimeout(() => setShareSuccess(false), 3000)
      }
    } finally {
      setIsSharing(false)
    }
  }, [selectedTeam, shareTags, onShareConversation])

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      setShareTags((prev) => [...new Set([...prev, tagInput.trim()])])
      setTagInput('')
    }
  }

  const hasTeams = teams && teams.length > 0
  const canShare = hasTeams && messages.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Chat header with share button */}
      {canShare && (
        <div className="flex items-center justify-end px-4 py-1.5 border-b">
          <div className="relative" ref={shareMenuRef}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setShowShareMenu(!showShareMenu)}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share with Team
              <ChevronDown className="w-3 h-3" />
            </Button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border bg-popover shadow-lg z-50 p-3 space-y-2.5">
                {/* Team selector */}
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Select Team</label>
                  <div className="space-y-0.5">
                    {teams?.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        className={`w-full text-left text-xs px-2 py-1.5 rounded ${
                          selectedTeam?.id === team.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setSelectedTeam(team)}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag input */}
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">Tags (optional)</label>
                  <div className="flex flex-wrap gap-1 items-center p-1.5 border rounded-md bg-background min-h-[28px]">
                    {shareTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                        <button
                          type="button"
                          className="ml-0.5 hover:text-destructive"
                          onClick={() => setShareTags((prev) => prev.filter((t) => t !== tag))}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder={shareTags.length === 0 ? 'Press Enter to add' : ''}
                      className="flex-1 min-w-[60px] text-[10px] bg-transparent focus:outline-none px-1"
                    />
                  </div>
                </div>

                {/* Share button */}
                <Button
                  className="w-full h-7 text-xs"
                  disabled={!selectedTeam || isSharing}
                  onClick={handleShare}
                >
                  {isSharing ? 'Sharing...' : 'Share Conversation'}
                </Button>
              </div>
            )}
          </div>

          {/* Success toast */}
          {shareSuccess && (
            <div className="flex items-center gap-1 ml-2 text-xs text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              Shared
            </div>
          )}
        </div>
      )}

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

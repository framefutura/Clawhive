import React, { useState, useCallback } from 'react'
import { MessageSquare, Send, Check, Circle, ChevronDown, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { A2AMessage } from '../../common/a2a'

export interface AgentInboxProps {
  agentId: string
  messages: A2AMessage[]
  agents: { id: string; name: string }[]
  onReply: (messageId: string, content: string) => void
  onMarkRead: (messageId: string) => void
  onSendPrompt: (toAgentId: string, content: string) => void
  onClose?: () => void
}

interface ThreadGroup {
  senderId: string
  senderName: string
  messages: A2AMessage[]
  unreadCount: number
}

function groupByThread(messages: A2AMessage[], agents: { id: string; name: string }[]): ThreadGroup[] {
  const groups = new Map<string, A2AMessage[]>()

  for (const msg of messages) {
    const key = msg.threadId ?? msg.fromAgentId
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(msg)
  }

  const result: ThreadGroup[] = []
  for (const [, msgs] of groups) {
    const senderId = msgs[0].fromAgentId
    const senderName = agents.find(a => a.id === senderId)?.name ?? senderId
    result.push({
      senderId,
      senderName,
      messages: msgs.sort((a, b) => a.timestamp - b.timestamp),
      unreadCount: msgs.filter(m => !m.read).length,
    })
  }

  return result.sort((a, b) => {
    // Sort by most recent message timestamp descending
    const aLatest = a.messages[a.messages.length - 1].timestamp
    const bLatest = b.messages[b.messages.length - 1].timestamp
    return bLatest - aLatest
  })
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return date.toLocaleDateString()
}

function MessageCard({
  message,
  senderName,
  onReply,
  onMarkRead,
}: {
  message: A2AMessage
  senderName: string
  onReply: (messageId: string, content: string) => void
  onMarkRead: (messageId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)

  const handleReply = useCallback(() => {
    if (replyText.trim()) {
      onReply(message.id, replyText.trim())
      setReplyText('')
      setShowReply(false)
    }
  }, [replyText, message.id, onReply])

  const handleMarkRead = useCallback(() => {
    if (!message.read) {
      onMarkRead(message.id)
    }
  }, [message.id, message.read, onMarkRead])

  return (
    <div
      className={cn(
        'border rounded-lg p-3 transition-colors',
        !message.read && 'border-blue-500/50 bg-blue-50/5',
      )}
      onClick={handleMarkRead}
    >
      <div className="flex items-start gap-2">
        {/* Unread indicator */}
        {!message.read && (
          <Circle className="h-2.5 w-2.5 mt-1.5 fill-blue-500 text-blue-500 shrink-0" />
        )}
        {message.read && <div className="w-2.5 shrink-0" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium truncate">{senderName}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {message.type}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>

          {/* Content preview or full */}
          <button
            className="text-left w-full"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            <div className="flex items-center gap-1">
              {expanded
                ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              <p className={cn(
                'text-sm text-muted-foreground',
                !expanded && 'line-clamp-2'
              )}>
                {message.content}
              </p>
            </div>
          </button>

          {/* Reply area */}
          {expanded && message.type === 'prompt' && (
            <div className="mt-2">
              {!showReply ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowReply(true)
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Reply
                </Button>
              ) : (
                <div className="flex gap-2 mt-1" onClick={e => e.stopPropagation()}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleReply()
                      }
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="default" onClick={handleReply} disabled={!replyText.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setShowReply(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ComposeSection({
  agents,
  currentAgentId,
  onSendPrompt,
}: {
  agents: { id: string; name: string }[]
  currentAgentId: string
  onSendPrompt: (toAgentId: string, content: string) => void
}) {
  const [toAgentId, setToAgentId] = useState('')
  const [content, setContent] = useState('')

  const availableAgents = agents.filter(a => a.id !== currentAgentId)

  const handleSend = useCallback(() => {
    if (toAgentId && content.trim()) {
      onSendPrompt(toAgentId, content.trim())
      setContent('')
      setToAgentId('')
    }
  }, [toAgentId, content, onSendPrompt])

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="text-sm font-medium">Send Prompt</div>
      <select
        value={toAgentId}
        onChange={e => setToAgentId(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        <option value="">Select agent...</option>
        {availableAgents.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Type your prompt..."
        className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSend()
          }
        }}
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={!toAgentId || !content.trim()}
        className="w-full"
      >
        <Send className="h-3.5 w-3.5 mr-1" />
        Send Prompt
      </Button>
    </div>
  )
}

export function AgentInbox({
  agentId,
  messages,
  agents,
  onReply,
  onMarkRead,
  onSendPrompt,
  onClose,
}: AgentInboxProps) {
  const threads = groupByThread(messages, agents)
  const unreadTotal = messages.filter(m => !m.read).length

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-semibold">Agent Inbox</span>
          {unreadTotal > 0 && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              {unreadTotal}
            </Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Compose section */}
          <ComposeSection
            agents={agents}
            currentAgentId={agentId}
            onSendPrompt={onSendPrompt}
          />

          <Separator />

          {/* Message threads */}
          {threads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No messages yet
            </div>
          ) : (
            threads.map((thread) => (
              <div key={`${thread.senderId}-${thread.messages[0].id}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {thread.senderName}
                  </span>
                  {thread.unreadCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      {thread.unreadCount} new
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {thread.messages.map(msg => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      senderName={thread.senderName}
                      onReply={onReply}
                      onMarkRead={onMarkRead}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

/**
 * Inbox badge for chat header -- shows unread count.
 */
export function InboxBadge({
  unreadCount,
  onClick,
}: {
  unreadCount: number
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative"
    >
      <MessageSquare className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  )
}

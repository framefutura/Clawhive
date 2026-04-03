import React, { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  FolderOpen,
  Share2,
  Tag,
  Plus,
  X,
  FileText,
  MessageSquare,
  Brain,
  CheckCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import type { SharedMemory, SharedMemoryType } from '../../common/team'
import type { AgentRecord } from '../../common/agent'

interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
}

export interface TeamWorkspaceProps {
  teamId: string
  teamName: string
  members: AgentRecord[]
  sharedMemories: SharedMemory[]
  fileTree: FileEntry[]
  onShareConversation?: (teamId: string, tags: string[]) => void
  onShareFile?: (teamId: string, filePath: string, tags: string[]) => void
  onShareNote?: (teamId: string, content: string, tags: string[]) => void
  onRefreshFiles?: () => void
  onOpenFile?: (path: string) => void
  onQueryMemory?: (query: string, tags: string[]) => void
}

const MEMORY_TYPE_CONFIG: Record<SharedMemoryType, { icon: typeof MessageSquare; label: string; color: string }> = {
  conversation: { icon: MessageSquare, label: 'Conversation', color: 'text-blue-500' },
  file: { icon: FileText, label: 'File', color: 'text-green-500' },
  note: { icon: Brain, label: 'Note', color: 'text-violet-500' },
  task_result: { icon: CheckCircle, label: 'Task Result', color: 'text-amber-500' },
}

function TagInput({
  tags,
  onAddTag,
  onRemoveTag,
}: {
  tags: string[]
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      onAddTag(input.trim())
      setInput('')
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center p-1.5 border rounded-md bg-background min-h-[32px]">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary"
        >
          <Tag className="w-2.5 h-2.5" />
          {tag}
          <button
            type="button"
            className="ml-0.5 hover:text-destructive"
            onClick={() => onRemoveTag(tag)}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Add tags (Enter to add)' : ''}
        className="flex-1 min-w-[80px] text-xs bg-transparent focus:outline-none px-1"
      />
    </div>
  )
}

function FileTreeItem({
  entry,
  onOpen,
  onShare,
}: {
  entry: FileEntry
  onOpen?: (path: string) => void
  onShare?: (path: string) => void
}) {
  const isDir = entry.type === 'directory'

  return (
    <div className="flex items-center justify-between group py-1 px-2 rounded hover:bg-accent/30">
      <button
        type="button"
        className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
        onClick={() => onOpen?.(entry.path)}
      >
        {isDir ? (
          <FolderOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-xs truncate">{entry.name}</span>
      </button>
      {!isDir && (
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 opacity-0 group-hover:opacity-100"
          onClick={() => onShare?.(entry.path)}
        >
          <Share2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}

export function TeamWorkspace({
  teamId,
  teamName,
  members,
  sharedMemories,
  fileTree,
  onShareConversation,
  onShareFile,
  onShareNote,
  onRefreshFiles,
  onOpenFile,
  onQueryMemory,
}: TeamWorkspaceProps) {
  const [activePanel, setActivePanel] = useState<'files' | 'share' | 'memories'>('files')
  const [shareTags, setShareTags] = useState<string[]>([])
  const [noteContent, setNoteContent] = useState('')
  const [shareType, setShareType] = useState<'conversation' | 'note'>('conversation')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  const handleShare = useCallback(async () => {
    setIsSharing(true)
    try {
      if (shareType === 'conversation') {
        onShareConversation?.(teamId, shareTags)
      } else {
        onShareNote?.(teamId, noteContent, shareTags)
      }
      setShareSuccess(true)
      setShareTags([])
      setNoteContent('')
      setTimeout(() => setShareSuccess(false), 3000)
    } finally {
      setIsSharing(false)
    }
  }, [shareType, teamId, shareTags, noteContent, onShareConversation, onShareNote])

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      onQueryMemory?.(searchQuery, shareTags)
    }
  }, [searchQuery, shareTags, onQueryMemory])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{teamName} Workspace</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant={activePanel === 'files' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActivePanel('files')}
          >
            Files
          </Button>
          <Button
            variant={activePanel === 'share' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActivePanel('share')}
          >
            Share
          </Button>
          <Button
            variant={activePanel === 'memories' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActivePanel('memories')}
          >
            Memories
          </Button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Files panel */}
        {activePanel === 'files' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Team Files</span>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={onRefreshFiles}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            {fileTree.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                No files in team workspace
              </div>
            ) : (
              <div className="space-y-0.5">
                {fileTree.map((entry) => (
                  <FileTreeItem
                    key={entry.path}
                    entry={entry}
                    onOpen={onOpenFile}
                    onShare={(path) => onShareFile?.(teamId, path, shareTags)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share panel */}
        {activePanel === 'share' && (
          <div className="space-y-3">
            {/* Share type selector */}
            <div className="flex gap-2">
              <Button
                variant={shareType === 'conversation' ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setShareType('conversation')}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Chat Thread
              </Button>
              <Button
                variant={shareType === 'note' ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setShareType('note')}
              >
                <Brain className="w-3 h-3 mr-1" />
                Note
              </Button>
            </div>

            {/* Note content (only for note type) */}
            {shareType === 'note' && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Note Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a note to share with the team..."
                  className="w-full h-24 text-xs p-2 border rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {shareType === 'conversation' && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                Share the current chat conversation with your team. The entire thread will be shared.
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tags</label>
              <TagInput
                tags={shareTags}
                onAddTag={(tag) => setShareTags((prev) => [...new Set([...prev, tag])])}
                onRemoveTag={(tag) => setShareTags((prev) => prev.filter((t) => t !== tag))}
              />
            </div>

            {/* Share button */}
            <Button
              className="w-full h-8 text-xs"
              disabled={isSharing || (shareType === 'note' && !noteContent.trim())}
              onClick={handleShare}
            >
              {isSharing ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Share2 className="w-3 h-3 mr-1" />
              )}
              Share with Team
            </Button>

            {/* Success toast */}
            {shareSuccess && (
              <div className="flex items-center gap-1.5 p-2 rounded bg-green-500/10 text-green-600 text-xs">
                <CheckCircle className="w-3.5 h-3.5" />
                Shared to {teamName} successfully
              </div>
            )}
          </div>
        )}

        {/* Memories panel */}
        {activePanel === 'memories' && (
          <div className="space-y-2">
            {/* Search */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search team memories..."
                className="flex-1 text-xs px-2 py-1.5 border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={handleSearch}
              >
                <span className="sr-only">Search</span>
                Search
              </Button>
            </div>

            {/* Memory list */}
            {sharedMemories.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8">
                No shared memories yet. Use the Share tab to share content.
              </div>
            ) : (
              sharedMemories.map((memory) => {
                const config = MEMORY_TYPE_CONFIG[memory.type]
                const Icon = config.icon

                return (
                  <div key={memory.id} className="p-2.5 rounded-lg border bg-card">
                    <div className="flex items-start gap-2">
                      <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium">{config.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(memory.sharedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-3">
                          {memory.content.slice(0, 200)}
                        </div>
                        {memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {memory.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

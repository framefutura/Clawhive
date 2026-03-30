import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { TopBar } from './components/TopBar'
import { Sidebar } from './components/Sidebar'
import { Blackboard } from './components/Blackboard'
import { ChatView } from './components/ChatView'
import { Settings } from './components/Settings'
import { FileUpload, useClipboardPaste } from './components/FileUpload'
import { useChatStore } from './stores/chatStore'
import { useSession } from './hooks/useSession'
import { useGateway } from './hooks/useGateway'
import type { Provider } from './components/ModelPicker'
import type { GeneCategory } from './types'
import './styles/shadcn-variables.css'

// Sample data for Phase 1
const SAMPLE_AGENTS = [
  { id: 'default', name: 'ClawHive Agent', role: 'General Assistant', status: 'idle' as const, geneCount: 3 },
]

const SAMPLE_GENE_CATEGORIES: { id: GeneCategory; name: string; color: string; count: number }[] = [
  { id: 'dev', name: 'Development', color: '#10B981', count: 2 },
  { id: 'data', name: 'Data', color: '#3B82F6', count: 1 },
  { id: 'ops', name: 'Operations', color: '#F59E0B', count: 0 },
  { id: 'network', name: 'Network', color: '#8B5CF6', count: 0 },
  { id: 'creative', name: 'Creative', color: '#EC4899', count: 0 },
  { id: 'comm', name: 'Communication', color: '#06B6D4', count: 1 },
  { id: 'security', name: 'Security', color: '#EF4444', count: 0 },
  { id: 'efficiency', name: 'Efficiency', color: '#84CC16', count: 0 },
]

const SAMPLE_ACTIVE_GENES: { category: GeneCategory; name: string }[] = [
  { category: 'dev', name: 'Code Writing' },
  { category: 'dev', name: 'Debugging' },
  { category: 'data', name: 'Data Analysis' },
  { category: 'comm', name: 'Summarization' },
]

export default function App() {
  const { connected } = useGateway()
  const { sessions, activeSession, availableGenes, geneCategories, createSession, setActiveSession } = useSession()
  const { messages, isWorking, sendMessage } = useChatStore(activeSession?.id)

  const [activeAgentId, setActiveAgentId] = useState<string>('default')
  const [storagePath, setStoragePath] = useState('~/.clawhive')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Model selection state
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic')
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')

  // File upload state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const handleFileUpload = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  useClipboardPaste(handleFileUpload)

  // Auto-connect to gateway on mount
  useEffect(() => {
    const connect = async () => {
      try {
        await window.clawhive.connect('ws://localhost:18792')
      } catch (err) {
        console.log('Gateway not available yet')
      }
    }
    connect()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TopBar
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={(p) => {
          setSelectedProvider(p)
          // Update default model for provider
          const defaults: Record<Provider, string> = {
            anthropic: 'claude-sonnet-4-20250514',
            openai: 'gpt-4o',
            ollama: 'llama3.2',
          }
          setSelectedModel(defaults[p])
        }}
        onModelChange={setSelectedModel}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          agents={SAMPLE_AGENTS}
          activeAgentId={activeAgentId}
          onSelectAgent={setActiveAgentId}
          onCreateAgent={() => {}}
          geneCategories={SAMPLE_GENE_CATEGORIES}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {showChat ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Back to Blackboard
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs",
                    connected ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <FileUpload
                    onUpload={handleFileUpload}
                    selectedFiles={attachedFiles}
                    onRemoveFile={handleRemoveFile}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatView messages={messages} isWorking={isWorking} onSend={sendMessage} />
              </div>
            </>
          ) : (
            <Blackboard
              activeGenes={SAMPLE_ACTIVE_GENES}
              currentTask={isWorking ? 'Processing your request...' : undefined}
              agentStatus={isWorking ? 'working' : 'idle'}
              recentMessages={messages.slice(-5).map(m => ({ content: m.content, timestamp: m.timestamp }))}
              onNewTask={() => setShowChat(true)}
              onOpenChat={() => setShowChat(true)}
              onViewLogs={() => {}}
            />
          )}
        </div>
      </div>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        storagePath={storagePath}
        onStoragePathChange={setStoragePath}
      />
    </div>
  )
}

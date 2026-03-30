import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { TopBar } from './components/TopBar'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { Blackboard } from './components/Blackboard'
import { TopologyGraph, createMockTopology } from './components/TopologyGraph'
import { ChatView } from './components/ChatView'
import { Settings } from './components/Settings'
import { FirstLaunchWizard } from './components/FirstLaunchWizard'
import { FileManager } from './components/FileManager'
import { FileUpload, useClipboardPaste } from './components/FileUpload'
import { useChatStore } from './stores/chatStore'
import { useTabStore } from './stores/tabStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useSession } from './hooks/useSession'
import { useGateway } from './hooks/useGateway'
import type { Provider } from './components/ModelPicker'
import type { GeneCategory } from './types'
import type { TabType } from '../common/tab'
import './styles/shadcn-variables.css'

// Sample gene categories for sidebar
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
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    renameTab,
    switchTab,
    getDisplayTabs,
  } = useTabStore()
  const {
    workspaces,
    activeWorkspaceId,
    createWorkspace,
    setActiveWorkspace,
    getWorkspace,
  } = useWorkspaceStore()

  // Get the active tab record
  const activeTab = tabs.find(t => t.id === activeTabId)

  // Get workspace for active tab
  const activeWorkspace = activeTab?.workspaceId
    ? getWorkspace(activeTab.workspaceId)
    : null

  // Get chat session for active tab (chat tabs have contentRef as sessionId)
  const sessionId = activeTab?.type === 'chat' ? activeTab.contentRef : undefined
  const { messages, isWorking, sendMessage } = useChatStore(sessionId)

  // First launch detection
  const [isFirstLaunch, setIsFirstLaunch] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [agents, setAgents] = useState([{
    id: 'default',
    name: 'ClawHive Agent',
    role: 'General Assistant',
    status: 'idle' as const,
    geneCount: 3,
  }])
  const [activeAgentId, setActiveAgentId] = useState<string>('default')
  const [storagePath, setStoragePath] = useState('~/.clawhive')

  // Model selection state
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic')
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  // Check for first launch
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const config = await window.clawhive.getConfig()

        // First launch if no dataPath configured
        if (!config.dataPath) {
          setIsFirstLaunch(true)
        } else {
          setStoragePath(config.dataPath)
        }
      } catch {
        // If config:get not available yet, treat as first launch
        setIsFirstLaunch(true)
      }

      setIsLoading(false)
    }
    checkFirstLaunch()
  }, [])

  // Auto-create main workspace on first launch completion
  const handleFirstLaunchComplete = useCallback(async (config: {
    dataPath: string
    name: string
    role: string
    provider: string
    model: string
    apiKey?: string
    genes: string[]
  }) => {
    // Save data path
    await window.clawhive.setStoragePath(config.dataPath)
    await window.clawhive.setConfig({ dataPath: config.dataPath })
    setStoragePath(config.dataPath)

    // Create agent
    const agent = await window.clawhive.createAgent({
      name: config.name,
      role: config.role,
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      genes: config.genes,
    })

    // Create the first workspace
    const mainWorkspace = await createWorkspace('Main Workspace')

    // Create default workspace tab linked to the main workspace
    await createTab('workspace', '', 'Main Workspace', mainWorkspace.id)

    // Create a chat tab
    await createTab('chat')

    // Mark first launch complete
    await window.clawhive.setConfig({ firstLaunchComplete: true })

    // Update UI
    setAgents([{
      id: agent.id,
      name: config.name,
      role: config.role,
      status: 'idle',
      geneCount: config.genes.length,
    }])
    setSelectedProvider(config.provider as Provider)
    setSelectedModel(config.model)

    setIsFirstLaunch(false)
  }, [createTab, createWorkspace])

  // Ensure at least one workspace tab exists on startup
  useEffect(() => {
    if (isFirstLaunch || isLoading || tabs.length > 0) return

    // No tabs exist - create a default workspace
    const ensureWorkspace = async () => {
      try {
        // Check if any workspaces exist
        const existingWorkspaces = await window.clawhive.listWorkspaces()
        let workspaceId: string

        if (existingWorkspaces.length === 0) {
          // Create a new workspace
          const newWorkspace = await createWorkspace('Main Workspace')
          workspaceId = newWorkspace.id
        } else {
          workspaceId = existingWorkspaces[0].id
        }

        // Create a workspace tab
        await createTab('workspace', '', 'Main Workspace', workspaceId)
      } catch (err) {
        console.error('Failed to create default workspace:', err)
      }
    }

    ensureWorkspace()
  }, [isFirstLaunch, isLoading, tabs.length, createTab, createWorkspace])

  // Update active workspace when tab changes
  useEffect(() => {
    if (activeTab?.workspaceId) {
      setActiveWorkspace(activeTab.workspaceId)
    }
  }, [activeTab?.workspaceId, setActiveWorkspace])

  const handleFileUpload = (files: File[]) => {
    setAttachedFiles(prev => [...prev, ...files])
  }

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  useClipboardPaste(handleFileUpload)

  // Auto-connect to gateway on mount
  useEffect(() => {
    if (isFirstLaunch || isLoading) return

    const connect = async () => {
      try {
        await window.clawhive.connect('ws://localhost:18792')
      } catch (err) {
        console.log('Gateway not available yet')
      }
    }
    connect()
  }, [isFirstLaunch, isLoading])

  // Auto-naming: update chat tab title when first user message is sent
  useEffect(() => {
    if (!activeTab || activeTab.type !== 'chat' || messages.length === 0) return

    const firstUserMessage = messages.find(m => m.role === 'user')
    if (firstUserMessage && activeTab.title === 'New Chat') {
      // Update tab title to first message preview
      window.clawhive.updateTabTitle(activeTab.id, firstUserMessage.content)
    }
  }, [messages, activeTab])

  // Handle creating a new workspace tab
  const handleAddWorkspaceTab = useCallback(async () => {
    const newWorkspace = await createWorkspace()
    await createTab('workspace', '', newWorkspace.name, newWorkspace.id)
  }, [createTab, createWorkspace])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading ClawHive...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <FirstLaunchWizard
        open={isFirstLaunch}
        onComplete={handleFirstLaunchComplete}
        availableGenes={availableGenes}
      />

      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <TopBar
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={(p) => {
            setSelectedProvider(p)
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
            agents={agents}
            activeAgentId={activeAgentId}
            onSelectAgent={setActiveAgentId}
            onCreateAgent={() => {}}
            geneCategories={SAMPLE_GENE_CATEGORIES}
          />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Tab Bar */}
            <TabBar
              tabs={getDisplayTabs()}
              activeTabId={activeTabId}
              onSelectTab={switchTab}
              onCloseTab={closeTab}
              onAddTab={(type?: TabType) => {
                if (type === 'workspace') {
                  handleAddWorkspaceTab()
                } else if (type === 'file') {
                  // Create a file tab with the current workspace
                  if (activeWorkspace) {
                    createTab('file', '', 'Files', activeWorkspace.id)
                  }
                } else if (type) {
                  createTab(type)
                } else {
                  // Default to workspace tab if no type specified
                  handleAddWorkspaceTab()
                }
              }}
              onRenameTab={renameTab}
            />

            {/* Content Area - switches based on active tab type */}
            {activeTab ? (
              activeTab.type === 'chat' ? (
                <>
                  <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{activeTab.title}</span>
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
              ) : activeTab.type === 'workspace' ? (
                activeWorkspace ? (
                  <Blackboard
                    workspaceId={activeWorkspace.id}
                    workspaceName={activeWorkspace.name}
                    activeGenes={activeWorkspace.activeGenes.length > 0
                      ? activeWorkspace.activeGenes
                      : SAMPLE_ACTIVE_GENES}
                    currentTask={activeWorkspace.activeTask || (isWorking ? 'Processing your request...' : undefined)}
                    agentStatus={isWorking ? 'working' : activeWorkspace.agentStatus}
                    recentMessages={messages.slice(-5).map(m => ({ content: m.content, timestamp: m.timestamp }))}
                    onNewTask={() => createTab('chat')}
                    onOpenChat={() => createTab('chat')}
                    onViewLogs={() => {}}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    Loading workspace...
                  </div>
                )
              ) : activeTab.type === 'settings' ? (
                <Settings
                  open={true}
                  onClose={() => createTab('workspace')}
                  storagePath={storagePath}
                  onStoragePathChange={setStoragePath}
                />
              ) : activeTab.type === 'browser' ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Browser tab - coming in phase 02-04
                </div>
              ) : activeTab.type === 'file' ? (
                activeWorkspace ? (
                  <FileManager
                    workspaceId={activeWorkspace.id}
                    rootPath={`${storagePath}/workspaces/${activeWorkspace.id}`}
                    selectedFile={activeTab.contentRef}
                    onSelectFile={(filePath) => {
                      // Update the tab's contentRef to the selected file
                      window.clawhive.updateTab(activeTab.id, { contentRef: filePath })
                    }}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    No workspace selected for file manager
                  </div>
                )
              ) : null
            ) : (
              // No tabs open - show default workspace
              <div className="flex-1 flex flex-col">
                <TabBar
                  tabs={[{ id: 'empty', title: 'Workspace', type: 'workspace' }]}
                  activeTabId="empty"
                  onSelectTab={() => {}}
                  onCloseTab={() => {}}
                  onAddTab={(type?: TabType) => {
                    if (type === 'workspace') {
                      handleAddWorkspaceTab()
                    } else {
                      createTab(type || 'workspace')
                    }
                  }}
                  onRenameTab={() => {}}
                />
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  No workspace active. Create a new tab to get started.
                </div>
              </div>
            )}
          </div>
        </div>

        <Settings
          open={settingsOpen && !activeTab}
          onClose={() => setSettingsOpen(false)}
          storagePath={storagePath}
          onStoragePathChange={setStoragePath}
        />
      </div>
    </>
  )
}

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { TopBar } from './components/TopBar'
import { TabBar } from './components/TabBar'
import { Sidebar } from './components/Sidebar'
import { Blackboard } from './components/Blackboard'
import { ChatView } from './components/ChatView'
import { Settings } from './components/Settings'
import { SecurityPanel } from './components/SecurityPanel'
import { FirstLaunchWizard } from './components/FirstLaunchWizard'
import { FileManager } from './components/FileManager'
import { BrowserToolbar } from './components/BrowserToolbar'
import { FileUpload, useClipboardPaste } from './components/FileUpload'
import { SensitiveAuthDialog } from './components/SensitiveAuthDialog'
import { RepairDialog } from './components/RepairDialog'
import { AgentWizard } from './components/AgentWizard'
import { OrgTree, type TreeNode } from './components/OrgTree'
import { HierarchyViewSwitcher, type HierarchyViewMode } from './components/hierarchy/HierarchyViewSwitcher'
import { useChatStore } from './stores/chatStore'
import { useTabStore } from './stores/tabStore'
import { useWorkspaceStore } from './stores/workspaceStore'
import { useSession } from './hooks/useSession'
import { useGateway } from './hooks/useGateway'
import type { Provider } from './components/ModelPicker'
import type { GeneCategory } from './types'
import type { TabType } from '../common/tab'
import type { AgentRecord } from '../common/agent'
import type { SecurityLevel, PermissionMatrix } from '../common/security'
import type { ApprovalRequest } from '../main/security-manager'
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

  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [roles, setRoles] = useState<{ id: string; name: string; default_level: 'high' | 'medium' | 'low'; permissions: string }[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [hierarchyViewMode, setHierarchyViewMode] = useState<'hierarchy' | 'org-chart' | 'teams'>('hierarchy')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [rightPanelPinned, setRightPanelPinned] = useState(false)
  const [rightPanelSubjectId, setRightPanelSubjectId] = useState<string | null>(null)
  const [storagePath, setStoragePath] = useState('~/.clawhive')

  // Model selection state
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic')
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514')

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [repairDialogOpen, setRepairDialogOpen] = useState(false)
  const [securityPanelOpen, setSecurityPanelOpen] = useState(false)
  const [agentWizardOpen, setAgentWizardOpen] = useState(false)
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('medium')
  const [parsedPermissions, setParsedPermissions] = useState<PermissionMatrix>({
    tools: {}, files: { read: [], write: [], deny: [] }, network: { allowHosts: [], denyHosts: [] }, execution: { shell: 'prompt', code: 'prompt' }
  })
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  // Approval dialog state
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null)

  // Browser state
  const [browserUrls, setBrowserUrls] = useState<Record<string, string>>({})
  const [browserCanGoBack, setBrowserCanGoBack] = useState<Record<string, boolean>>({})
  const [browserCanGoForward, setBrowserCanGoForward] = useState<Record<string, boolean>>({})
  const [capturedText, setCapturedText] = useState<string | null>(null)
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null)
  const [showCaptureModal, setShowCaptureModal] = useState(false)

  // Track browser tabs that have been initialized
  const browserTabsInitialized = useRef<Set<string>>(new Set())
  const previousActiveTabId = useRef<string | null>(null)

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

  const loadAgents = useCallback(async () => {
    try {
      const [loadedAgents, hierarchy] = await Promise.all([
        window.clawhive.getAgents(),
        window.clawhive.getHierarchy(),
      ])
      setAgents(loadedAgents)
      return loadedAgents
    } catch (err) {
      console.error('Failed to load agents:', err)
      return [] as AgentRecord[]
    }
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

    setSelectedProvider(config.provider as Provider)
    setSelectedModel(config.model)
    setActiveAgentId(agent.id)
    setSelectedSubjectId(agent.id)
    setRightPanelSubjectId(agent.id)
    await loadAgents()

    setIsFirstLaunch(false)
  }, [createTab, createWorkspace, loadAgents])

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

  // Load agents from registry
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    if (agents.length === 0) {
      setActiveAgentId(null)
      setSelectedSubjectId(null)
      if (!rightPanelPinned) {
        setRightPanelSubjectId(null)
      }
      return
    }

    const selectedExists = selectedSubjectId ? agents.some(agent => agent.id === selectedSubjectId) : false
    const nextSelectedId = selectedExists ? selectedSubjectId : activeAgentId ?? agents[0].id

    if (nextSelectedId !== selectedSubjectId) {
      setSelectedSubjectId(nextSelectedId)
    }

    const activeExists = activeAgentId ? agents.some(agent => agent.id === activeAgentId) : false
    if (!activeExists || activeAgentId === null) {
      setActiveAgentId(nextSelectedId)
    }

    if (!rightPanelPinned) {
      setRightPanelSubjectId(nextSelectedId)
    }
  }, [agents, activeAgentId, selectedSubjectId, rightPanelPinned])

  // Sync security level and permissions from session and role
  useEffect(() => {
    const syncSecurity = async () => {
      if (sessionId) {
        try {
          const sessions = await window.clawhive.getSessions()
          const session = sessions.find((s: { id: string }) => s.id === sessionId)
          if (session) {
            // Use persisted security level if available
            if (session.security_level) {
              setSecurityLevel(session.security_level)
            }
            // Find role by name and parse permissions
            const roleName = session.role_name || agents.find(a => a.id === activeAgentId)?.role || 'Individual Agent'
            const role = roles.find((r: { name: string }) => r.name === roleName)
            if (role) {
              try {
                const permissions = JSON.parse(role.permissions) as PermissionMatrix
                setParsedPermissions(permissions)
              } catch (e) {
                console.error('Failed to parse role permissions:', e)
                // Fall back to empty permissions
                setParsedPermissions({
                  tools: {},
                  files: { read: [], write: [], deny: [] },
                  network: { allowHosts: [], denyHosts: [] },
                  execution: { shell: 'prompt', code: 'prompt' }
                })
              }
            }
          }
        } catch (err) {
          console.error('Failed to sync security from session:', err)
        }
      }
    }
    syncSecurity()
  }, [sessionId, roles, agents, activeAgentId])

  // Persist security level changes and update permissions
  const handleChangeLevel = async (newLevel: SecurityLevel) => {
    setSecurityLevel(newLevel)
    if (sessionId) {
      try {
        const roleName = agents.find(a => a.id === activeAgentId)?.role || 'Individual Agent'
        await window.clawhive.updateSessionSecurity(sessionId, newLevel, roleName)
      } catch (err) {
        console.error('Failed to persist security level:', err)
      }
    }
  }

  // Subscribe to approval requests
  useEffect(() => {
    const unsubscribe = window.clawhive.onSecurityApprovalRequested((request: unknown) => {
      setPendingApproval(request as ApprovalRequest)
    })
    return unsubscribe
  }, [])

  // Handle approval resolution - SensitiveAuthDialog callbacks
  const handleApproveAuth = async (requestId: string, purpose: string) => {
    await window.clawhive.resolveSecurityApproval(requestId, true)
    setPendingApproval(null)
  }

  const handleDenyAuth = async (requestId: string, reason: string) => {
    await window.clawhive.resolveSecurityApproval(requestId, false)
    setPendingApproval(null)
  }

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

  // Initialize browser view when browser tab becomes active
  useEffect(() => {
    const initBrowserTab = async () => {
      if (!activeTab) return

      // Hide previous browser tab if it was a browser
      if (previousActiveTabId.current && previousActiveTabId.current !== activeTab.id) {
        const prevTab = tabs.find(t => t.id === previousActiveTabId.current)
        if (prevTab?.type === 'browser') {
          await window.clawhive.browserSetVisible(prevTab.id, false)
        }
      }

      // Handle current active tab
      if (activeTab.type === 'browser') {
        // Create browser view if not already initialized
        if (!browserTabsInitialized.current.has(activeTab.id)) {
          const initialUrl = activeTab.contentRef || 'https://google.com'
          await window.clawhive.browserCreate(activeTab.id, initialUrl)
          browserTabsInitialized.current.add(activeTab.id)
          // Initialize URL state
          setBrowserUrls(prev => ({ ...prev, [activeTab.id]: initialUrl }))
        }
        // Show the browser view
        await window.clawhive.browserSetVisible(activeTab.id, true)
        // Update navigation state
        const canBack = await window.clawhive.browserCanGoBack(activeTab.id)
        const canForward = await window.clawhive.browserCanGoForward(activeTab.id)
        setBrowserCanGoBack(prev => ({ ...prev, [activeTab.id]: canBack }))
        setBrowserCanGoForward(prev => ({ ...prev, [activeTab.id]: canForward }))
      }

      previousActiveTabId.current = activeTab.id
    }

    initBrowserTab()
  }, [activeTab, tabs])

  // Listen for browser title changes and update tab title
  useEffect(() => {
    const cleanup = window.clawhive.onBrowserTitleChanged((event) => {
      const tab = tabs.find(t => t.id === event.tabId)
      if (tab && tab.type === 'browser') {
        // Update tab title with page title (truncated if needed)
        const title = event.title.length > 30 ? event.title.slice(0, 30) + '...' : event.title
        window.clawhive.renameTab(tab.id, title)
      }
    })
    return cleanup
  }, [tabs])

  // Listen for browser URL changes
  useEffect(() => {
    const cleanup = window.clawhive.onBrowserUrlChanged((event) => {
      setBrowserUrls(prev => ({ ...prev, [event.tabId]: event.url }))
      // Update navigation state
      window.clawhive.browserCanGoBack(event.tabId).then(can => {
        setBrowserCanGoBack(prev => ({ ...prev, [event.tabId]: can }))
      })
      window.clawhive.browserCanGoForward(event.tabId).then(can => {
        setBrowserCanGoForward(prev => ({ ...prev, [event.tabId]: can }))
      })
    })
    return cleanup
  }, [])

  // Clean up browser views when tabs are closed
  useEffect(() => {
    const currentTabIds = new Set(tabs.map(t => t.id))
    for (const tabId of browserTabsInitialized.current) {
      if (!currentTabIds.has(tabId)) {
        // Tab was closed, destroy its browser view
        window.clawhive.browserDestroy(tabId)
        browserTabsInitialized.current.delete(tabId)
        // Clean up state
        setBrowserUrls(prev => {
          const next = { ...prev }
          delete next[tabId]
          return next
        })
      }
    }
  }, [tabs])

  // Clean up all browser views on unmount
  useEffect(() => {
    return () => {
      for (const tabId of browserTabsInitialized.current) {
        window.clawhive.browserDestroy(tabId)
      }
      browserTabsInitialized.current.clear()
    }
  }, [])

  const handleAddWorkspaceTab = useCallback(async () => {
    const newWorkspace = await createWorkspace()
    await createTab('workspace', '', newWorkspace.name, newWorkspace.id)
  }, [createTab, createWorkspace])

  const sidebarAgents = agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    geneCount: agent.genes.length,
  }))

  const buildHierarchy = useCallback((records: AgentRecord[]): TreeNode<AgentRecord>[] => {
    const nodeMap = new Map(records.map((agent) => [agent.id, { data: agent, children: [] as TreeNode<AgentRecord>[] }]))
    const roots: TreeNode<AgentRecord>[] = []

    for (const agent of records) {
      const node = nodeMap.get(agent.id)
      if (!node) continue

      if (agent.parentId && nodeMap.has(agent.parentId)) {
        nodeMap.get(agent.parentId)?.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots
  }, [])

  const hierarchyNodes = buildHierarchy(agents)

  const selectedAgent = selectedSubjectId
    ? agents.find(agent => agent.id === selectedSubjectId) ?? null
    : null

  const rightPanelAgent = rightPanelSubjectId
    ? agents.find(agent => agent.id === rightPanelSubjectId) ?? null
    : null

  const handleSelectAgent = (id: string) => {
    setActiveAgentId(id)
    setSelectedSubjectId(id)
    if (!rightPanelPinned) {
      setRightPanelSubjectId(id)
    }
  }

  const handleCreateAgent = async (config: {
    name: string
    role: import('../common/agent').AgentRole
    parentId?: string
    department?: string
    team?: string
    provider: Provider
    model: string
    apiKey?: string
    genes: string[]
    allowedTools: string[]
    defaultSecurityLevel: string
  }) => {
    const created = await window.clawhive.createAgent(config)
    await loadAgents()
    setActiveAgentId(created.id)
    setSelectedSubjectId(created.id)
    setRightPanelSubjectId(created.id)
    setRightPanelPinned(false)
    setAgentWizardOpen(false)
  }

  const handleReparentAgent = useCallback(async (
    agentId: string,
    newParentId: string | undefined,
    _comment: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await window.clawhive.updateAgent(agentId, { parentId: newParentId })
      await loadAgents()
      // Keep the moved agent selected
      setActiveAgentId(agentId)
      setSelectedSubjectId(agentId)
      if (!rightPanelPinned) {
        setRightPanelSubjectId(agentId)
      }
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  }, [loadAgents, rightPanelPinned])

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
          <div className="shrink-0 border-r bg-card/40 flex flex-col">
            <Sidebar
              agents={sidebarAgents}
              activeAgentId={activeAgentId}
              onSelectAgent={handleSelectAgent}
              onCreateAgent={() => setAgentWizardOpen(true)}
              geneCategories={SAMPLE_GENE_CATEGORIES}
            />

            <div className="border-t p-3">
              <HierarchyViewSwitcher
                viewMode={hierarchyViewMode as HierarchyViewMode}
                onChange={setHierarchyViewMode}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 pt-0">
              <OrgTree
                nodes={hierarchyNodes}
                allAgents={agents}
                activeAgentId={activeAgentId ?? undefined}
                viewMode={hierarchyViewMode}
                onSelectAgent={handleSelectAgent}
                onCreateAgent={(parentId) => {
                  setSelectedSubjectId(parentId ?? null)
                  setAgentWizardOpen(true)
                }}
                onEditAgent={handleSelectAgent}
                onDeleteAgent={(id) => {
                  console.warn('Delete agent not implemented yet', id)
                }}
                onReparentAgent={handleReparentAgent}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
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
                      <button
                        onClick={() => setSecurityPanelOpen(true)}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted transition-colors"
                        title="Security Settings"
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          securityLevel === 'high' ? "bg-red-500" :
                          securityLevel === 'medium' ? "bg-yellow-500" :
                          "bg-green-500"
                        )} />
                        <span className="capitalize">{securityLevel}</span>
                      </button>
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
                <div className="flex-1 flex flex-col">
                  {/* Browser Toolbar */}
                  <BrowserToolbar
                    url={browserUrls[activeTab.id] || activeTab.contentRef || 'https://google.com'}
                    canGoBack={browserCanGoBack[activeTab.id] || false}
                    canGoForward={browserCanGoForward[activeTab.id] || false}
                    onNavigate={(url) => {
                      window.clawhive.browserNavigate(activeTab.id, url)
                      // Update tab's contentRef to track the URL
                      window.clawhive.updateTab(activeTab.id, { contentRef: url })
                      setBrowserUrls(prev => ({ ...prev, [activeTab.id]: url }))
                    }}
                    onGoBack={() => window.clawhive.browserGoBack(activeTab.id)}
                    onGoForward={() => window.clawhive.browserGoForward(activeTab.id)}
                    onReload={() => window.clawhive.browserReload(activeTab.id)}
                    onCaptureText={async () => {
                      const text = await window.clawhive.browserCaptureText(activeTab.id)
                      setCapturedText(text)
                      setShowCaptureModal(true)
                    }}
                    onCaptureScreenshot={async () => {
                      const dataUrl = await window.clawhive.browserCaptureScreenshot(activeTab.id)
                      setCapturedScreenshot(dataUrl)
                      setShowCaptureModal(true)
                    }}
                  />
                  {/* BrowserView placeholder - actual content rendered by main process */}
                  <div className="flex-1 bg-background" />
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

          <aside className="w-80 shrink-0 border-l bg-card/30 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Details</h2>
                <p className="text-xs text-muted-foreground">
                  Wave 1 detail seam for the selected subject.
                </p>
              </div>
              <button
                onClick={() => {
                  if (rightPanelPinned) {
                    setRightPanelPinned(false)
                    setRightPanelSubjectId(selectedSubjectId)
                  } else {
                    setRightPanelPinned(true)
                    setRightPanelSubjectId(selectedSubjectId)
                  }
                }}
                className="px-2 py-1 text-xs border rounded hover:bg-muted transition-colors"
              >
                {rightPanelPinned ? 'Unpin' : 'Pin'}
              </button>
            </div>

            {rightPanelAgent ? (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">{rightPanelAgent.name}</div>
                  <div className="text-xs text-muted-foreground">{rightPanelAgent.role}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Status</div>
                    <div className="capitalize">{rightPanelAgent.status}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Lifecycle</div>
                    <div className="capitalize">{rightPanelAgent.lifecycle}</div>
                  </div>
                </div>
                <div className="rounded border p-3 text-xs text-muted-foreground">
                  Right-panel editing and special Secretary/CEO surfaces land in later waves.
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select an agent to inspect its registry details.
              </div>
            )}
          </aside>
        </div>

        <AgentWizard
          open={agentWizardOpen}
          onComplete={handleCreateAgent}
          onCancel={() => setAgentWizardOpen(false)}
          availableGenes={availableGenes}
          existingAgents={agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            role: agent.role,
          }))}
        />

        <Settings
          open={settingsOpen && !activeTab}
          onClose={() => setSettingsOpen(false)}
          storagePath={storagePath}
          onStoragePathChange={setStoragePath}
          onOpenRepair={() => {
            setSettingsOpen(false)
            setRepairDialogOpen(true)
          }}
        />

        <RepairDialog
          open={repairDialogOpen}
          onClose={() => setRepairDialogOpen(false)}
        />

        <SecurityPanel
          open={securityPanelOpen}
          onClose={() => setSecurityPanelOpen(false)}
          role={agents.find(a => a.id === activeAgentId)?.role || 'Individual Agent'}
          level={securityLevel}
          onChangeLevel={handleChangeLevel}
          permissions={parsedPermissions}
        />

        {/* Security Approval Dialog - Integrated SensitiveAuthDialog */}
        <SensitiveAuthDialog
          open={pendingApproval !== null}
          onClose={() => setPendingApproval(null)}
          request={pendingApproval}
          onApprove={handleApproveAuth}
          onDeny={handleDenyAuth}
        />
      </div>

      {/* Capture Results Modal */}
      {showCaptureModal && (capturedText || capturedScreenshot) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-medium">
                {capturedText ? 'Captured Text' : 'Screenshot'}
              </h3>
              <button
                onClick={() => {
                  setShowCaptureModal(false)
                  setCapturedText(null)
                  setCapturedScreenshot(null)
                }}
                className="p-1 hover:bg-muted rounded"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              {capturedText && (
                <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded">
                  {capturedText}
                </pre>
              )}
              {capturedScreenshot && (
                <img
                  src={capturedScreenshot}
                  alt="Screenshot"
                  className="max-w-full rounded border"
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  const content = capturedText || capturedScreenshot || ''
                  navigator.clipboard.writeText(content)
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

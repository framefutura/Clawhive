// DeskClaw Gene Categories
export type GeneCategory =
  | 'dev'        // Development
  | 'data'       // Data
  | 'ops'        // Operations
  | 'network'    // Network
  | 'creative'   // Creative
  | 'comm'       // Communication
  | 'security'   // Security
  | 'efficiency' // Efficiency

export interface Gene {
  id: string
  name: string
  category: GeneCategory
  description: string
  version: string
}

// Predefined genes for Phase 1 (foundation for marketplace in Phase 4)
export const DEFAULT_GENES: Gene[] = [
  // Development
  { id: 'code-write', name: 'Code Writing', category: 'dev', description: 'Write and edit code', version: '1.0.0' },
  { id: 'code-debug', name: 'Debugging', category: 'dev', description: 'Debug and fix code issues', version: '1.0.0' },
  { id: 'code-review', name: 'Code Review', category: 'dev', description: 'Review code for quality', version: '1.0.0' },
  // Data
  { id: 'data-analysis', name: 'Data Analysis', category: 'data', description: 'Analyze data sets', version: '1.0.0' },
  { id: 'sql-query', name: 'SQL', category: 'data', description: 'Write SQL queries', version: '1.0.0' },
  // Operations
  { id: 'deploy', name: 'Deployment', category: 'ops', description: 'Deploy applications', version: '1.0.0' },
  { id: 'monitor', name: 'Monitoring', category: 'ops', description: 'Monitor system health', version: '1.0.0' },
  // Communication
  { id: 'summarize', name: 'Summarization', category: 'comm', description: 'Summarize content', version: '1.0.0' },
]

export interface Session {
  id: string
  agentId: string
  modelConfig: ModelConfig
  genes: string[] // Loaded gene IDs (DeskClaw gene system)
  createdAt: number
  messages: ChatMessage[]
}

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'ollama'
  model: string
  apiKey?: string
  baseUrl?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Attachment[]
  timestamp: number
}

export interface Attachment {
  name: string
  type: string
  path: string
}

export interface SessionStore {
  create(agentId: string, modelConfig: ModelConfig, genes?: string[]): Session
  list(): Session[]
  get(id: string): Session | null
  delete(id: string): void
  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void
  updateGenes(sessionId: string, genes: string[]): void
}

class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>()

  create(agentId: string, modelConfig: ModelConfig, genes: string[] = []): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      agentId,
      modelConfig,
      genes, // DeskClaw: genes loaded into this session
      createdAt: Date.now(),
      messages: [],
    }
    this.sessions.set(session.id, session)
    return session
  }

  list(): Session[] {
    return Array.from(this.sessions.values())
  }

  get(id: string): Session | null {
    return this.sessions.get(id) ?? null
  }

  delete(id: string): void {
    this.sessions.delete(id)
  }

  addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.messages.push({
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      })
    }
  }

  updateGenes(sessionId: string, genes: string[]): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.genes = genes
    }
  }
}

export const sessionStore = new InMemorySessionStore()

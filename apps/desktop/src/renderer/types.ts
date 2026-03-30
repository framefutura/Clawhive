// Shared types for renderer - mirrors main/session.ts types
// Cannot import from main process directly (separate tsconfig)

export type GeneCategory =
  | 'dev'
  | 'data'
  | 'ops'
  | 'network'
  | 'creative'
  | 'comm'
  | 'security'
  | 'efficiency'

export interface Gene {
  id: string
  name: string
  category: GeneCategory
  description: string
  version: string
}

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'ollama'
  model: string
  apiKey?: string
  baseUrl?: string
}

export interface Session {
  id: string
  agentId: string
  modelConfig: ModelConfig
  genes: string[]
  createdAt: number
  messages: ChatMessage[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  attachments?: { name: string; type: string; path: string }[]
}

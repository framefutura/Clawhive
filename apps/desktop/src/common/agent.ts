export type AgentRole = 'CEO' | 'CFO' | 'COO' | 'Department Head' | 'Team Leader' | 'Individual Agent'

export interface AgentRecord {
  id: string
  name: string
  role: AgentRole
  parentId?: string
  department?: string
  team?: string
  genes: string[]
  provider: string
  model: string
  apiKey?: string
  allowedTools: string[]
  defaultSecurityLevel: string
  createdAt: number
  updatedAt: number
}

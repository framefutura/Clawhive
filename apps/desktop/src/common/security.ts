/**
 * Security types and permission matrix for ClawHive
 * Defines security levels, roles, and permission structures
 */

export type SecurityLevel = 'high' | 'medium' | 'low'

export interface PermissionMatrix {
  tools: Record<string, 'allow' | 'deny' | 'prompt'>
  files: { read: string[]; write: string[]; deny: string[] }
  network: { allowHosts: string[]; denyHosts: string[] }
  execution: { shell: 'allow' | 'deny' | 'prompt'; code: 'allow' | 'deny' | 'prompt' }
}

export interface RoleProfile {
  role: string
  defaultLevel: SecurityLevel
  permissions: PermissionMatrix
}

export interface ActionRequest {
  type: 'tool' | 'file' | 'network' | 'execution'
  tool?: string
  operation?: string
  path?: string
  host?: string
  command?: string
  code?: string
}

export interface SecurityDecision {
  allowed: boolean
  reason: string
  requiresApproval: boolean
  approvalType?: 'user' | 'parent'
}

export interface ApprovalRequest {
  id: string
  action: ActionRequest
  reason: string
  timestamp: number
}

// Pre-defined role profiles
export const DEFAULT_ROLES: RoleProfile[] = [
  {
    role: 'CEO Agent',
    defaultLevel: 'medium',
    permissions: {
      tools: {
        'fs.read': 'allow',
        'fs.write': 'allow',
        'fs.unlink': 'prompt',
        'child_process.spawn': 'prompt',
        'http.request': 'allow',
        'agent.delegate': 'allow',
        'task.create': 'allow',
        'task.assign': 'allow',
      },
      files: {
        read: ['~/.clawhive/workspaces/*', '~/Documents/*'],
        write: ['~/.clawhive/workspaces/*'],
        deny: ['~/.ssh/*', '~/.aws/*', '~/.clawhive/secrets/*'],
      },
      network: {
        allowHosts: ['*'],
        denyHosts: [],
      },
      execution: {
        shell: 'prompt',
        code: 'allow',
      },
    },
  },
  {
    role: 'CFO Agent',
    defaultLevel: 'medium',
    permissions: {
      tools: {
        'fs.read': 'allow',
        'fs.write': 'allow',
        'fs.unlink': 'deny',
        'child_process.spawn': 'deny',
        'http.request': 'allow',
        'spreadsheet.read': 'allow',
        'spreadsheet.write': 'allow',
        'budget.query': 'allow',
        'cost.report': 'allow',
      },
      files: {
        read: ['~/.clawhive/workspaces/*', '~/Documents/*', '~/Downloads/*'],
        write: ['~/.clawhive/workspaces/*/reports/*'],
        deny: ['~/.ssh/*', '~/.aws/*', '~/.clawhive/secrets/*'],
      },
      network: {
        allowHosts: ['api.stripe.com', 'api.quickbooks.com', '*.freshbooks.com'],
        denyHosts: [],
      },
      execution: {
        shell: 'deny',
        code: 'allow',
      },
    },
  },
  {
    role: 'Security Agent',
    defaultLevel: 'high',
    permissions: {
      tools: {
        'fs.read': 'allow',
        'fs.write': 'prompt',
        'fs.unlink': 'prompt',
        'child_process.spawn': 'prompt',
        'http.request': 'prompt',
        'audit.log': 'allow',
        'security.scan': 'allow',
        'policy.check': 'allow',
      },
      files: {
        read: ['~/.clawhive/*', '/var/log/*'],
        write: ['~/.clawhive/audit/*'],
        deny: [],
      },
      network: {
        allowHosts: [],
        denyHosts: ['*.internal', 'localhost:*'],
      },
      execution: {
        shell: 'prompt',
        code: 'prompt',
      },
    },
  },
  {
    role: 'Individual Agent',
    defaultLevel: 'medium',
    permissions: {
      tools: {
        'fs.read': 'allow',
        'fs.write': 'prompt',
        'fs.unlink': 'deny',
        'child_process.spawn': 'deny',
        'http.request': 'allow',
        'chat.send': 'allow',
        'task.update': 'allow',
      },
      files: {
        read: ['~/.clawhive/workspaces/*'],
        write: ['~/.clawhive/workspaces/*'],
        deny: ['~/.ssh/*', '~/.aws/*', '~/.clawhive/secrets/*'],
      },
      network: {
        allowHosts: ['api.anthropic.com', 'api.openai.com', 'localhost:11434'],
        denyHosts: [],
      },
      execution: {
        shell: 'deny',
        code: 'allow',
      },
    },
  },
]

// Helper to get role by name
export function getRoleProfile(roleName: string): RoleProfile | undefined {
  return DEFAULT_ROLES.find(r => r.role === roleName)
}

// Sensitive tool operations that require extra scrutiny
export const SENSITIVE_TOOLS = new Set([
  'fs.unlink',
  'fs.rmdir',
  'child_process.spawn',
  'child_process.exec',
  'shell.execute',
  'code.eval',
])

// Check if an operation is sensitive
export function isSensitiveOperation(action: ActionRequest): boolean {
  if (action.type === 'execution') return true
  if (action.type === 'tool' && action.tool && SENSITIVE_TOOLS.has(action.tool)) return true
  if (action.type === 'file' && action.operation === 'write') {
    // Writing outside workspace is sensitive
    if (action.path && !action.path.includes('.clawhive/workspaces')) return true
  }
  if (action.type === 'network') {
    // All network requests are potentially sensitive
    return true
  }
  return false
}

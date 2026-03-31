/**
 * Tool Registry - Deny-by-default tool permission system
 * All tools start denied; explicit user enablement required
 */

import type { SecurityLevel, RoleProfile } from '../common/security.js'

export type ToolDangerLevel = 'safe' | 'caution' | 'dangerous'
export type ToolPermission = 'deny' | 'allow' | 'prompt'

export interface ToolDefinition {
  name: string
  description: string
  dangerLevel: ToolDangerLevel
  defaultPermission: 'deny'
  requiredRole?: string[]
  requiresSecurityLevel?: SecurityLevel[]
}

export interface AgentToolPermission {
  toolName: string
  permission: ToolPermission
  enabledAt?: number
  enabledBy?: string
}

// Default tool definitions - all start with deny permission
export const DEFAULT_TOOLS: ToolDefinition[] = [
  {
    name: 'fs_read',
    description: 'Read files from the file system',
    dangerLevel: 'safe',
    defaultPermission: 'deny',
  },
  {
    name: 'fs_write',
    description: 'Write files to the file system',
    dangerLevel: 'dangerous',
    defaultPermission: 'deny',
    requiresSecurityLevel: ['medium', 'low'],
  },
  {
    name: 'fs_delete',
    description: 'Delete files from the file system',
    dangerLevel: 'dangerous',
    defaultPermission: 'deny',
    requiresSecurityLevel: ['low'],
  },
  {
    name: 'shell_exec',
    description: 'Execute shell commands',
    dangerLevel: 'dangerous',
    defaultPermission: 'deny',
    requiresSecurityLevel: ['low'],
  },
  {
    name: 'browser_navigate',
    description: 'Navigate browser to URLs',
    dangerLevel: 'caution',
    defaultPermission: 'deny',
  },
  {
    name: 'http_request',
    description: 'Make HTTP requests to external services',
    dangerLevel: 'caution',
    defaultPermission: 'deny',
  },
  {
    name: 'http_get',
    description: 'Make HTTP GET requests',
    dangerLevel: 'caution',
    defaultPermission: 'deny',
  },
  {
    name: 'http_post',
    description: 'Make HTTP POST requests',
    dangerLevel: 'dangerous',
    defaultPermission: 'deny',
  },
  {
    name: 'agent_delegate',
    description: 'Delegate tasks to other agents',
    dangerLevel: 'caution',
    defaultPermission: 'deny',
  },
  {
    name: 'task_create',
    description: 'Create new tasks',
    dangerLevel: 'safe',
    defaultPermission: 'deny',
  },
  {
    name: 'task_assign',
    description: 'Assign tasks to agents',
    dangerLevel: 'caution',
    defaultPermission: 'deny',
  },
  {
    name: 'spreadsheet_read',
    description: 'Read spreadsheet files',
    dangerLevel: 'safe',
    defaultPermission: 'deny',
  },
  {
    name: 'spreadsheet_write',
    description: 'Write spreadsheet files',
    dangerLevel: 'dangerous',
    defaultPermission: 'deny',
    requiresSecurityLevel: ['medium', 'low'],
  },
  {
    name: 'chat_send',
    description: 'Send chat messages',
    dangerLevel: 'safe',
    defaultPermission: 'deny',
  },
  {
    name: 'audit_log',
    description: 'Access audit logs',
    dangerLevel: 'safe',
    defaultPermission: 'deny',
    requiredRole: ['Security Agent', 'CEO Agent'],
  },
  {
    name: 'security_scan',
    description: 'Run security scans',
    dangerLevel: 'caution',
    defaultPermission: 'deny',
    requiredRole: ['Security Agent'],
  },
  {
    name: 'policy_check',
    description: 'Check security policies',
    dangerLevel: 'safe',
    defaultPermission: 'deny',
    requiredRole: ['Security Agent', 'CEO Agent'],
  },
]

// Role-based tool presets - safe tools that can be pre-allowed
export const ROLE_TOOL_PRESETS: Record<string, string[]> = {
  'Individual Agent': ['fs_read', 'chat_send', 'task_create'],
  'CEO Agent': ['fs_read', 'fs_write', 'chat_send', 'task_create', 'task_assign', 'agent_delegate', 'audit_log', 'policy_check'],
  'CFO Agent': ['fs_read', 'spreadsheet_read', 'spreadsheet_write', 'chat_send'],
  'Security Agent': ['fs_read', 'audit_log', 'security_scan', 'policy_check'],
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>()
  private agentPermissions = new Map<string, Map<string, AgentToolPermission>>()

  constructor() {
    // Initialize with default tools
    for (const tool of DEFAULT_TOOLS) {
      this.tools.set(tool.name, tool)
    }
  }

  /**
   * Get all available tool definitions
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get a specific tool definition
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * Get tools by danger level
   */
  getToolsByDangerLevel(level: ToolDangerLevel): ToolDefinition[] {
    return this.getAllTools().filter(t => t.dangerLevel === level)
  }

  /**
   * Get default permissions for a new agent
   * All tools start as denied
   */
  getDefaultPermissions(): AgentToolPermission[] {
    return this.getAllTools().map(tool => ({
      toolName: tool.name,
      permission: 'deny' as ToolPermission,
    }))
  }

  /**
   * Get preset permissions for a role
   * Safe tools are pre-allowed based on role profile
   */
  getRolePresetPermissions(role: string): AgentToolPermission[] {
    const presetTools = ROLE_TOOL_PRESETS[role] || []
    const permissions: AgentToolPermission[] = []

    for (const tool of this.getAllTools()) {
      if (presetTools.includes(tool.name) && tool.dangerLevel === 'safe') {
        permissions.push({
          toolName: tool.name,
          permission: 'allow',
        })
      } else {
        permissions.push({
          toolName: tool.name,
          permission: 'deny',
        })
      }
    }

    return permissions
  }

  /**
   * Set permissions for an agent
   */
  setAgentPermissions(agentId: string, permissions: AgentToolPermission[]): void {
    const permMap = new Map<string, AgentToolPermission>()
    for (const perm of permissions) {
      permMap.set(perm.toolName, perm)
    }
    this.agentPermissions.set(agentId, permMap)
  }

  /**
   * Get permissions for an agent
   */
  getAgentPermissions(agentId: string): AgentToolPermission[] {
    const permMap = this.agentPermissions.get(agentId)
    if (!permMap) {
      return this.getDefaultPermissions()
    }
    return Array.from(permMap.values())
  }

  /**
   * Get permission for a specific tool/agent combination
   */
  getPermission(agentId: string, toolName: string): ToolPermission {
    const permMap = this.agentPermissions.get(agentId)
    if (!permMap) {
      return 'deny'
    }
    return permMap.get(toolName)?.permission || 'deny'
  }

  /**
   * Enable a tool for an agent
   */
  enableTool(
    agentId: string,
    toolName: string,
    permission: 'allow' | 'prompt' = 'allow',
    enabledBy?: string
  ): boolean {
    const tool = this.tools.get(toolName)
    if (!tool) {
      return false
    }

    // Get or create permission map for agent
    let permMap = this.agentPermissions.get(agentId)
    if (!permMap) {
      permMap = new Map()
      this.agentPermissions.set(agentId, permMap)
    }

    permMap.set(toolName, {
      toolName,
      permission,
      enabledAt: Date.now(),
      enabledBy,
    })

    return true
  }

  /**
   * Disable a tool for an agent
   */
  disableTool(agentId: string, toolName: string): boolean {
    const permMap = this.agentPermissions.get(agentId)
    if (!permMap) {
      return false
    }

    permMap.set(toolName, {
      toolName,
      permission: 'deny',
    })

    return true
  }

  /**
   * Check if a tool can be enabled for an agent
   * Returns reason if not allowed
   */
  canEnableTool(
    agentId: string,
    toolName: string,
    securityLevel: SecurityLevel,
    role: string
  ): { allowed: boolean; reason?: string } {
    const tool = this.tools.get(toolName)
    if (!tool) {
      return { allowed: false, reason: 'Tool not found' }
    }

    // Check role requirements
    if (tool.requiredRole && !tool.requiredRole.includes(role)) {
      return {
        allowed: false,
        reason: `Tool "${toolName}" requires one of these roles: ${tool.requiredRole.join(', ')}`,
      }
    }

    // Check security level requirements for dangerous tools
    if (tool.dangerLevel === 'dangerous') {
      if (tool.requiresSecurityLevel && !tool.requiresSecurityLevel.includes(securityLevel)) {
        return {
          allowed: false,
          reason: `Tool "${toolName}" requires security level: ${tool.requiresSecurityLevel.join(' or ')}`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Validate that dangerous tools have proper authorization
   */
  validateDangerousToolEnablement(
    toolName: string,
    securityLevel: SecurityLevel,
    userExplicitlyEnabled: boolean
  ): { valid: boolean; reason?: string } {
    const tool = this.tools.get(toolName)
    if (!tool) {
      return { valid: false, reason: 'Tool not found' }
    }

    if (tool.dangerLevel !== 'dangerous') {
      return { valid: true }
    }

    // Dangerous tools require explicit user toggle
    if (!userExplicitlyEnabled) {
      return {
        valid: false,
        reason: `Dangerous tool "${toolName}" requires explicit user enablement`,
      }
    }

    // Dangerous tools require appropriate security level
    if (tool.requiresSecurityLevel && !tool.requiresSecurityLevel.includes(securityLevel)) {
      return {
        valid: false,
        reason: `Dangerous tool "${toolName}" requires security level: ${tool.requiresSecurityLevel.join(' or ')}`,
      }
    }

    return { valid: true }
  }

  /**
   * Get tools grouped by category for UI display
   */
  getToolsForPicker(agentId?: string): {
    safe: Array<ToolDefinition & { enabled: boolean; permission: ToolPermission }>
    caution: Array<ToolDefinition & { enabled: boolean; permission: ToolPermission }>
    dangerous: Array<ToolDefinition & { enabled: boolean; permission: ToolPermission }>
  } {
    const result = {
      safe: [] as Array<ToolDefinition & { enabled: boolean; permission: ToolPermission }>,
      caution: [] as Array<ToolDefinition & { enabled: boolean; permission: ToolPermission }>,
      dangerous: [] as Array<ToolDefinition & { enabled: boolean; permission: ToolPermission }>,
    }

    for (const tool of this.getAllTools()) {
      const permission = agentId ? this.getPermission(agentId, tool.name) : 'deny'
      const enabled = permission !== 'deny'
      const toolWithStatus = { ...tool, enabled, permission }

      if (tool.dangerLevel === 'safe') {
        result.safe.push(toolWithStatus)
      } else if (tool.dangerLevel === 'caution') {
        result.caution.push(toolWithStatus)
      } else {
        result.dangerous.push(toolWithStatus)
      }
    }

    return result
  }

  /**
   * Clear all permissions for an agent (e.g., on deletion)
   */
  clearAgentPermissions(agentId: string): void {
    this.agentPermissions.delete(agentId)
  }
}

// Singleton instance
let toolRegistry: ToolRegistry | null = null

export function getToolRegistry(): ToolRegistry {
  if (!toolRegistry) {
    toolRegistry = new ToolRegistry()
  }
  return toolRegistry
}

// Re-export types
export type { ToolDefinition, AgentToolPermission }

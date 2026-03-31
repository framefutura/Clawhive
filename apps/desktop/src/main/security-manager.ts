/**
 * Security Manager - Core security enforcement logic
 * Evaluates actions against permission matrices and security levels
 */

import type {
  SecurityLevel,
  RoleProfile,
  ActionRequest,
  SecurityDecision,
  ApprovalRequest,
  isSensitiveOperation,
  getRoleProfile,
} from '../common/security.js'
import {
  getPrivacyGuard,
  detectSuspicious,
  evaluateSuspiciousSignals,
  type SuspiciousSignals,
} from './privacy-guard.js'

export class SecurityManager {
  private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map()
  private approvalEmitter: ((approvalRequest: ApprovalRequest) => void) | null = null
  private activityLog: Array<{
    timestamp: number
    action: string
    decision: SecurityDecision
    metadata?: Record<string, unknown>
  }> = []

  /**
   * Evaluate an action against the role's permission matrix and security level
   */
  evaluateAction(level: SecurityLevel, role: RoleProfile, action: ActionRequest): SecurityDecision {
    // Step 0: Check file path against Privacy Guard for file operations
    if (action.type === 'file' && action.path) {
      const privacyGuard = getPrivacyGuard()
      const pathCheck = privacyGuard.checkPath(
        action.path,
        action.operation === 'write' ? 'write' : 'read'
      )

      if (!pathCheck.allowed) {
        const decision: SecurityDecision = {
          allowed: false,
          reason: pathCheck.reason || 'Path blocked by Privacy Guard',
          requiresApproval: false,
        }
        this.logActivity(action, decision, { blockedPath: action.path })
        return decision
      }
    }

    // Step 1: Check for suspicious patterns
    const suspiciousSignals = detectSuspicious(action)
    const suspiciousCheck = evaluateSuspiciousSignals(suspiciousSignals, level)

    if (suspiciousCheck.blocked) {
      const decision: SecurityDecision = {
        allowed: false,
        reason: suspiciousCheck.reason || 'Suspicious activity detected',
        requiresApproval: false,
      }
      this.logActivity(action, decision, { suspiciousSignals })
      return decision
    }

    // Step 2: Check permission matrix first (deterministic)
    const matrixDecision = this.checkPermissionMatrix(role, action)

    if (matrixDecision === 'deny') {
      const decision: SecurityDecision = {
        allowed: false,
        reason: `Action denied by permission matrix for role "${role.role}"`,
        requiresApproval: false,
      }
      this.logActivity(action, decision)
      return decision
    }

    if (matrixDecision === 'prompt') {
      const decision: SecurityDecision = {
        allowed: true,
        reason: `Action requires explicit approval (matrix says "prompt") for role "${role.role}"`,
        requiresApproval: true,
        approvalType: 'user',
      }
      this.logActivity(action, decision)
      return decision
    }

    // Step 2: Check security level
    switch (level) {
      case 'low':
        // Low security: allow non-denied actions without prompt
        return this.allowAction(action, `Allowed at low security level for role "${role.role}"`)

      case 'medium':
        // Medium security: allow unless sensitive
        if (isSensitiveOperation(action)) {
          const decision: SecurityDecision = {
            allowed: true,
            reason: `Sensitive action requires approval at medium security level`,
            requiresApproval: true,
            approvalType: 'user',
          }
          this.logActivity(action, decision)
          return decision
        }
        return this.allowAction(action, `Allowed at medium security level (non-sensitive)`)

      case 'high':
        // High security: always requires approval
        const decision: SecurityDecision = {
          allowed: true,
          reason: `High security level requires approval for all actions`,
          requiresApproval: true,
          approvalType: 'user',
        }
        this.logActivity(action, decision)
        return decision

      default:
        // Unknown level - deny for safety
        const denyDecision: SecurityDecision = {
          allowed: false,
          reason: `Unknown security level: ${level}`,
          requiresApproval: false,
        }
        this.logActivity(action, denyDecision)
        return denyDecision
    }
  }

  /**
   * Check for suspicious patterns in an action
   */
  detectSuspicious(action: ActionRequest): SuspiciousSignals {
    return detectSuspicious(action)
  }

  /**
   * Get Privacy Guard instance for path checking
   */
  getPrivacyGuard() {
    return getPrivacyGuard()
  }

  /**
   * Get required approvals for a security decision
   */
  getRequiredApprovals(decision: SecurityDecision): ApprovalRequest[] {
    if (!decision.requiresApproval) {
      return []
    }

    // Generate approval request
    const request: ApprovalRequest = {
      id: this.generateApprovalId(),
      action: { type: 'tool' }, // Will be populated by caller
      reason: decision.reason,
      timestamp: Date.now(),
    }

    return [request]
  }

  /**
   * Set the approval emitter callback (called by main process with window reference)
   */
  setApprovalEmitter(emitter: (approvalRequest: ApprovalRequest) => void): void {
    this.approvalEmitter = emitter
  }

  /**
   * Request approval from user/parent
   */
  async requestApproval(approvalRequest: ApprovalRequest): Promise<boolean> {
    return new Promise((resolve) => {
      this.approvalCallbacks.set(approvalRequest.id, resolve)

      console.log(`[Security] Approval requested: ${approvalRequest.reason}`)

      // Emit to renderer for user approval
      if (this.approvalEmitter) {
        this.approvalEmitter(approvalRequest)
      } else {
        console.warn('[Security] No approval emitter configured - approval will block until resolveApproval() is called')
      }
    })
  }

  /**
   * Resolve an approval request
   */
  resolveApproval(approvalId: string, approved: boolean): void {
    const callback = this.approvalCallbacks.get(approvalId)
    if (callback) {
      callback(approved)
      this.approvalCallbacks.delete(approvalId)
    }
  }

  /**
   * Check permission matrix for an action
   * Returns: 'allow' | 'deny' | 'prompt'
   */
  private checkPermissionMatrix(
    role: RoleProfile,
    action: ActionRequest
  ): 'allow' | 'deny' | 'prompt' {
    const perms = role.permissions

    switch (action.type) {
      case 'tool':
        if (!action.tool) return 'deny'
        return perms.tools[action.tool] || 'deny'

      case 'file':
        if (!action.path || !action.operation) return 'deny'

        // Check deny list first
        for (const denyPattern of perms.files.deny) {
          if (this.matchesPattern(action.path, denyPattern)) {
            return 'deny'
          }
        }

        // Check operation-specific permissions
        if (action.operation === 'read') {
          for (const allowPattern of perms.files.read) {
            if (this.matchesPattern(action.path, allowPattern)) {
              return 'allow'
            }
          }
          return 'deny'
        }

        if (action.operation === 'write') {
          for (const allowPattern of perms.files.write) {
            if (this.matchesPattern(action.path, allowPattern)) {
              return 'allow'
            }
          }
          return 'deny'
        }

        return 'deny'

      case 'network':
        if (!action.host) return 'deny'

        // Check deny list first
        for (const denyPattern of perms.network.denyHosts) {
          if (this.matchesHostPattern(action.host, denyPattern)) {
            return 'deny'
          }
        }

        // Check allow list
        for (const allowPattern of perms.network.allowHosts) {
          if (this.matchesHostPattern(action.host, allowPattern)) {
            return 'allow'
          }
        }

        // Default deny if not in allow list
        return 'deny'

      case 'execution':
        if (action.command) {
          return perms.execution.shell
        }
        if (action.code) {
          return perms.execution.code
        }
        return 'deny'

      default:
        return 'deny'
    }
  }

  /**
   * Check if a path matches a glob pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob matching - supports * wildcards
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    )
    return regex.test(path)
  }

  /**
   * Check if a host matches a host pattern
   */
  private matchesHostPattern(host: string, pattern: string): boolean {
    // Support wildcards like *.example.com
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2)
      return host === domain || host.endsWith('.' + domain)
    }
    // Support * for all hosts
    if (pattern === '*') {
      return true
    }
    return host === pattern
  }

  /**
   * Helper to create an allowed decision
   */
  private allowAction(action: ActionRequest, reason: string): SecurityDecision {
    const decision: SecurityDecision = {
      allowed: true,
      reason,
      requiresApproval: false,
    }
    this.logActivity(action, decision)
    return decision
  }

  /**
   * Log security activity
   */
  private logActivity(
    action: ActionRequest,
    decision: SecurityDecision,
    metadata?: Record<string, unknown>
  ): void {
    this.activityLog.push({
      timestamp: Date.now(),
      action: JSON.stringify(action),
      decision,
      metadata,
    })

    // Keep log size manageable (last 1000 entries)
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-1000)
    }
  }

  /**
   * Get activity log (for audit purposes)
   */
  getActivityLog(): Array<{
    timestamp: number
    action: string
    decision: SecurityDecision
    metadata?: Record<string, unknown>
  }> {
    return [...this.activityLog]
  }

  /**
   * Generate unique approval ID
   */
  private generateApprovalId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

// Singleton instance
let securityManager: SecurityManager | null = null

export function getSecurityManager(): SecurityManager {
  if (!securityManager) {
    securityManager = new SecurityManager()
  }
  return securityManager
}

// Re-export types for convenience
export type { SecurityLevel, RoleProfile, ActionRequest, SecurityDecision, ApprovalRequest }
export { getRoleProfile, isSensitiveOperation }

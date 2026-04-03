/**
 * Authorization Manager
 * Manages sensitive data access authorization requests and approval workflow
 *
 * This module provides:
 * - createAuthRequest() - create authorization request with full risk assessment
 * - approve() / deny() - approval workflow
 * - requiresSensitiveAuth() - check if action needs authorization
 * - generateExecutionReport() - create summary report after execution
 */

import type {
  ActionRequest,
  SecurityLevel,
} from '../common/security.js'
import {
  SensitiveDataClassifier,
  getSensitiveDataClassifier,
  SensitiveDataType,
  type RiskLevel,
} from './sensitive-data-classifier.js'
import {
  getThreatAnalyzer,
  type ThreatAnalysis,
} from './threat-analyzer.js'
import {
  addActivityLog,
  type DbActivityLog,
} from './storage.js'

/**
 * Authorization request status
 */
export type AuthRequestStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'revoked'

/**
 * Sensitive data authorization request
 */
export interface SensitiveAuthRequest {
  id: string
  agentId: string
  agentName?: string
  action: ActionRequest
  sensitiveTypes: SensitiveDataType[]
  riskLevel: RiskLevel
  purpose: string
  toolsInvolved: string[]
  privacyRiskAssessment: string
  privacyRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  malwareCheck: ThreatAnalysis | null
  malwareRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  status: AuthRequestStatus
  createdAt: number
  expiresAt: number
  approvedBy?: string
  approvedAt?: number
  deniedBy?: string
  deniedAt?: number
  deniedReason?: string
  revokedBy?: string
  revokedAt?: number
  executionId?: string
  reportId?: string
}

/**
 * Authorization decision with full context
 */
export interface AuthorizationDecision {
  requiresAuth: boolean
  request?: SensitiveAuthRequest
  reason: string
  canAutoApprove: boolean
  autoApproveReason?: string
}

/**
 * Execution report summary
 */
export interface ExecutionReport {
  id: string
  requestId: string
  agentId: string
  agentName?: string
  timestamp: number
  actionSummary: string
  sensitiveTypesAccessed: SensitiveDataType[]
  toolsUsed: string[]
  dataAccessSummary: DataAccessEntry[]
  toolExecutionSummary: ToolExecutionEntry[]
  riskEvents: RiskEvent[]
  warnings: string[]
  dataWiped: boolean
  wipedAt?: number
  summary: string
  duration: number // milliseconds
}

export interface DataAccessEntry {
  type: SensitiveDataType
  path: string
  accessType: 'read' | 'write' | 'delete'
  timestamp: number
  success: boolean
}

export interface ToolExecutionEntry {
  tool: string
  params: Record<string, unknown>
  duration: number
  result: 'success' | 'failure'
  error?: string
}

export interface RiskEvent {
  type: string
  description: string
  mitigated: boolean
  mitigation?: string
}

/**
 * Authorization Manager class
 */
export class AuthorizationManager {
  private requests: Map<string, SensitiveAuthRequest> = new Map()
  private executionLogs: Map<string, ExecutionReport> = new Map()
  private requestExpiryMs: number = 30 * 60 * 1000 // 30 minutes default

  constructor() {
    // Load pending requests from storage on startup
    this.loadPendingRequests()
  }

  /**
   * Check if an action requires sensitive data authorization
   */
  requiresSensitiveAuth(action: ActionRequest): boolean {
    const classifier = getSensitiveDataClassifier()
    const result = classifier.classifyAction(action)

    // Requires auth if sensitive data detected with medium or higher risk
    return result.types.length > 0 && ['medium', 'high', 'critical'].includes(result.riskLevel)
  }

  /**
   * Create a new authorization request
   */
  createAuthRequest(
    action: ActionRequest,
    agentId: string,
    agentName?: string,
    purpose?: string
  ): SensitiveAuthRequest {
    const classifier = getSensitiveDataClassifier()
    const threatAnalyzer = getThreatAnalyzer()

    // Classify sensitive data
    const classification = classifier.classifyAction(action)

    // Analyze for threats
    const threatAnalysis = threatAnalyzer.analyzeActionSuspicion(action)

    // Determine tools involved
    const toolsInvolved = this.extractToolsFromAction(action)

    // Generate privacy risk assessment
    const privacyAssessment = this.generatePrivacyAssessment(classification, threatAnalysis)

    // Determine overall risk level
    const riskLevel = this.calculateOverallRiskLevel(classification.riskLevel, threatAnalysis.threatLevel)

    const request: SensitiveAuthRequest = {
      id: this.generateId(),
      agentId,
      agentName,
      action,
      sensitiveTypes: classification.types,
      riskLevel,
      purpose: purpose || '',
      toolsInvolved,
      privacyRiskAssessment: privacyAssessment.text,
      privacyRiskLevel: privacyAssessment.level,
      malwareCheck: threatAnalysis,
      malwareRiskLevel: threatAnalysis.threatLevel === 'safe'
        ? 'low'
        : threatAnalysis.threatLevel === 'caution'
          ? 'medium'
          : threatAnalysis.threatLevel === 'dangerous'
            ? 'high'
            : 'critical',
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + this.requestExpiryMs,
    }

    // Store request
    this.requests.set(request.id, request)

    // Log activity
    this.logAuthRequest(request)

    return request
  }

  /**
   * Get an authorization request by ID
   */
  getAuthRequest(requestId: string): SensitiveAuthRequest | undefined {
    const request = this.requests.get(requestId)

    // Check if expired
    if (request && request.status === 'pending' && Date.now() > request.expiresAt) {
      request.status = 'expired'
      this.requests.set(requestId, request)
    }

    return request
  }

  /**
   * Get all pending authorization requests
   */
  getPendingRequests(): SensitiveAuthRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.status === 'pending' && Date.now() <= r.expiresAt)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  /**
   * Get all requests for a specific agent
   */
  getRequestsByAgent(agentId: string): SensitiveAuthRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Approve an authorization request
   */
  async approve(requestId: string, approverId: string): Promise<boolean> {
    const request = this.requests.get(requestId)

    if (!request) {
      console.error(`[AuthManager] Request not found: ${requestId}`)
      return false
    }

    if (request.status !== 'pending') {
      console.error(`[AuthManager] Request ${requestId} is not pending (status: ${request.status})`)
      return false
    }

    if (Date.now() > request.expiresAt) {
      request.status = 'expired'
      this.requests.set(requestId, request)
      return false
    }

    request.status = 'approved'
    request.approvedBy = approverId
    request.approvedAt = Date.now()

    this.requests.set(requestId, request)

    // Log approval
    this.logAuthDecision(request, 'approved', approverId)

    console.log(`[AuthManager] Request ${requestId} approved by ${approverId}`)

    return true
  }

  /**
   * Deny an authorization request
   */
  deny(requestId: string, deniedBy: string, reason: string): boolean {
    const request = this.requests.get(requestId)

    if (!request) {
      console.error(`[AuthManager] Request not found: ${requestId}`)
      return false
    }

    if (request.status !== 'pending') {
      console.error(`[AuthManager] Request ${requestId} is not pending (status: ${request.status})`)
      return false
    }

    request.status = 'denied'
    request.deniedBy = deniedBy
    request.deniedAt = Date.now()
    request.deniedReason = reason

    this.requests.set(requestId, request)

    // Log denial
    this.logAuthDecision(request, 'denied', deniedBy, reason)

    console.log(`[AuthManager] Request ${requestId} denied by ${deniedBy}: ${reason}`)

    return true
  }

  /**
   * Revoke an approved request (e.g., if suspicious activity detected)
   */
  revoke(requestId: string, revokedBy: string, reason: string): boolean {
    const request = this.requests.get(requestId)

    if (!request) {
      return false
    }

    if (request.status !== 'approved') {
      return false
    }

    request.status = 'revoked'
    request.revokedBy = revokedBy
    request.revokedAt = Date.now()
    request.deniedReason = reason // reuse field for revocation reason

    this.requests.set(requestId, request)

    console.log(`[AuthManager] Request ${requestId} revoked by ${revokedBy}: ${reason}`)

    return true
  }

  /**
   * Generate execution report after operation completes
   */
  generateExecutionReport(
    requestId: string,
    executionResult: {
      success: boolean
      duration: number
      dataAccessed: DataAccessEntry[]
      toolsExecuted: ToolExecutionEntry[]
      riskEvents: RiskEvent[]
      warnings: string[]
      dataWiped: boolean
    }
  ): ExecutionReport {
    const request = this.requests.get(requestId)

    if (!request) {
      throw new Error(`Request not found: ${requestId}`)
    }

    const report: ExecutionReport = {
      id: this.generateId(),
      requestId,
      agentId: request.agentId,
      agentName: request.agentName,
      timestamp: Date.now(),
      actionSummary: this.generateActionSummary(request),
      sensitiveTypesAccessed: request.sensitiveTypes,
      toolsUsed: request.toolsInvolved,
      dataAccessSummary: executionResult.dataAccessed,
      toolExecutionSummary: executionResult.toolsExecuted,
      riskEvents: executionResult.riskEvents,
      warnings: executionResult.warnings,
      dataWiped: executionResult.dataWiped,
      wipedAt: executionResult.dataWiped ? Date.now() : undefined,
      summary: this.generateSummary(request, executionResult),
      duration: executionResult.duration,
    }

    request.reportId = report.id
    this.requests.set(requestId, request)
    this.executionLogs.set(report.id, report)

    // Log report creation
    addActivityLog({
      timestamp: Date.now(),
      session_id: null,
      agent_id: request.agentId,
      action_type: 'execution_report',
      decision: 'allowed',
      reason: `Execution report generated for request ${requestId}`,
      metadata: JSON.stringify({
        reportId: report.id,
        dataWiped: report.dataWiped,
        sensitiveTypes: report.sensitiveTypesAccessed,
      }),
    })

    return report
  }

  /**
   * Get execution report
   */
  getExecutionReport(reportId: string): ExecutionReport | undefined {
    return this.executionLogs.get(reportId)
  }

  /**
   * Get execution report by request ID
   */
  getReportByRequestId(requestId: string): ExecutionReport | undefined {
    const request = this.requests.get(requestId)
    if (!request?.reportId) {
      return undefined
    }
    return this.executionLogs.get(request.reportId)
  }

  /**
   * Get all execution reports for an agent
   */
  getReportsByAgent(agentId: string): ExecutionReport[] {
    return Array.from(this.executionLogs.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Check if request can be auto-approved
   */
  canAutoApprove(request: SensitiveAuthRequest): boolean {
    // Auto-approve only low risk, low privacy risk, low malware risk
    return (
      request.riskLevel === 'low' &&
      request.privacyRiskLevel === 'low' &&
      request.malwareRiskLevel === 'low' &&
      request.sensitiveTypes.length === 0
    )
  }

  /**
   * Set request expiry time
   */
  setRequestExpiryMs(ms: number): void {
    this.requestExpiryMs = ms
  }

  /**
   * Get authorization statistics
   */
  getStats(): {
    pending: number
    approved: number
    denied: number
    expired: number
    totalReports: number
  } {
    const requests = Array.from(this.requests.values())
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      denied: requests.filter(r => r.status === 'denied').length,
      expired: requests.filter(r => r.status === 'expired').length,
      totalReports: this.executionLogs.size,
    }
  }

  // Private helper methods

  private generateId(): string {
    return `auth_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  }

  private extractToolsFromAction(action: ActionRequest): string[] {
    const tools: string[] = []

    switch (action.type) {
      case 'tool':
        if (action.tool) tools.push(action.tool)
        break
      case 'file':
        tools.push(`fs_${action.operation || 'access'}`)
        break
      case 'execution':
        if (action.command) tools.push('shell_exec')
        if (action.code) tools.push('code_exec')
        break
      case 'network':
        tools.push('http_request')
        break
    }

    return tools
  }

  private generatePrivacyAssessment(
    classification: { types: SensitiveDataType[]; riskLevel: RiskLevel },
    threatAnalysis: ThreatAnalysis
  ): { text: string; level: 'low' | 'medium' | 'high' | 'critical' } {
    const parts: string[] = []

    // Data sensitivity
    if (classification.types.length > 0) {
      const typeNames = classification.types.map(t =>
        SensitiveDataClassifier.getTypeDescription(t)
      )
      parts.push(`Data types: ${typeNames.join(', ')}`)
    }

    // Privacy risk
    if (threatAnalysis.hasThreat) {
      parts.push(`Threat detected: ${threatAnalysis.details}`)
    }

    // Recommendations
    if (threatAnalysis.recommendations.length > 0) {
      parts.push(`Recommendations: ${threatAnalysis.recommendations.join('; ')}`)
    }

    // Determine level
    let level: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (classification.riskLevel === 'critical' || threatAnalysis.threatLevel === 'critical') {
      level = 'critical'
    } else if (classification.riskLevel === 'high' || threatAnalysis.threatLevel === 'dangerous') {
      level = 'high'
    } else if (classification.riskLevel === 'medium' || threatAnalysis.threatLevel === 'caution') {
      level = 'medium'
    }

    return {
      text: parts.join(' | ') || 'No significant privacy risks identified',
      level,
    }
  }

  private calculateOverallRiskLevel(
    dataRisk: RiskLevel,
    threatRisk: 'safe' | 'caution' | 'dangerous' | 'critical'
  ): RiskLevel {
    const riskOrder: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    }

    // Map threat risk to data risk scale
    const threatToDataRisk: Record<string, RiskLevel> = {
      safe: 'low',
      caution: 'medium',
      dangerous: 'high',
      critical: 'critical',
    }

    const mappedThreatRisk = threatToDataRisk[threatRisk] || 'low'
    const maxRisk = Math.max(riskOrder[dataRisk], riskOrder[mappedThreatRisk])

    const riskNames: Record<number, RiskLevel> = {
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'critical',
    }

    return riskNames[maxRisk] || 'low'
  }

  private generateActionSummary(request: SensitiveAuthRequest): string {
    const parts: string[] = []

    parts.push(`Action type: ${request.action.type}`)

    if (request.action.type === 'file' && request.action.path) {
      parts.push(`File: ${request.action.path}`)
    }

    if (request.action.type === 'execution' && request.action.command) {
      const cmd = request.action.command.length > 50
        ? request.action.command.slice(0, 50) + '...'
        : request.action.command
      parts.push(`Command: ${cmd}`)
    }

    if (request.toolsInvolved.length > 0) {
      parts.push(`Tools: ${request.toolsInvolved.join(', ')}`)
    }

    return parts.join(' | ')
  }

  private generateSummary(
    request: SensitiveAuthRequest,
    result: {
      success: boolean
      dataAccessed: DataAccessEntry[]
      toolsExecuted: ToolExecutionEntry[]
      riskEvents: RiskEvent[]
      dataWiped: boolean
    }
  ): string {
    const parts: string[] = []

    parts.push(`Agent ${request.agentId} completed sensitive data operation`)

    if (result.success) {
      parts.push('Status: SUCCESS')
    } else {
      parts.push('Status: COMPLETED WITH ERRORS')
    }

    if (request.sensitiveTypes.length > 0) {
      parts.push(`Sensitive data types: ${request.sensitiveTypes.length}`)
    }

    if (result.dataAccessed.length > 0) {
      parts.push(`Data accesses: ${result.dataAccessed.length}`)
    }

    if (result.toolsExecuted.length > 0) {
      parts.push(`Tools executed: ${result.toolsExecuted.length}`)
    }

    if (result.riskEvents.length > 0) {
      parts.push(`Risk events: ${result.riskEvents.length}`)
    }

    if (result.dataWiped) {
      parts.push('Data: WIPED (ephemeral execution completed)')
    }

    return parts.join(' | ')
  }

  private logAuthRequest(request: SensitiveAuthRequest): void {
    addActivityLog({
      timestamp: Date.now(),
      session_id: null,
      agent_id: request.agentId,
      action_type: 'sensitive_auth_request',
      decision: 'prompted',
      reason: `Sensitive data access requested: ${request.sensitiveTypes.join(', ')}`,
      metadata: JSON.stringify({
        requestId: request.id,
        riskLevel: request.riskLevel,
        toolsInvolved: request.toolsInvolved,
      }),
    })
  }

  private logAuthDecision(
    request: SensitiveAuthRequest,
    decision: 'approved' | 'denied',
    decidedBy: string,
    reason?: string
  ): void {
    addActivityLog({
      timestamp: Date.now(),
      session_id: null,
      agent_id: request.agentId,
      action_type: `sensitive_auth_${decision}`,
      decision: decision === 'approved' ? 'allowed' : 'denied',
      reason: reason || `${decision} by ${decidedBy}`,
      metadata: JSON.stringify({
        requestId: request.id,
        decidedBy,
        riskLevel: request.riskLevel,
      }),
    })
  }

  private async loadPendingRequests(): Promise<void> {
    // Load pending requests from storage
    // This would typically query the database for pending requests
    // For now, we work with in-memory requests
    console.log('[AuthManager] Loaded pending authorization requests')
  }
}

// Singleton instance
let authManager: AuthorizationManager | null = null

export function getAuthorizationManager(): AuthorizationManager {
  if (!authManager) {
    authManager = new AuthorizationManager()
  }
  return authManager
}

export function resetAuthorizationManager(): void {
  authManager = null
}

// Types are exported at their declaration sites above

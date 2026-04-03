/**
 * Execution Report Generator
 * Generates summary reports for sensitive data operations
 *
 * Key principle: Reports contain METADATA only, never actual sensitive data
 */

import type {
  SensitiveAuthRequest,
  ExecutionReport as AuthExecutionReport,
  DataAccessEntry,
  ToolExecutionEntry,
  RiskEvent,
} from './authorization-manager.js'
import { SensitiveDataClassifier, getSensitiveDataClassifier, SensitiveDataType } from './sensitive-data-classifier.js'

export type { AuthExecutionReport as ExecutionReport, DataAccessEntry, ToolExecutionEntry, RiskEvent }

/**
 * Report export formats
 */
export type ReportFormat = 'json' | 'markdown' | 'text'

/**
 * Compact report for API responses
 */
export interface CompactReport {
  id: string
  requestId: string
  agentId: string
  agentName?: string
  timestamp: number
  summary: string
  sensitiveTypesCount: number
  toolsUsedCount: number
  riskLevel: string
  dataWiped: boolean
  duration: number
}

/**
 * Report Generator class
 */
export class ReportGenerator {
  /**
   * Generate a compact report (for API responses)
   */
  generateCompactReport(report: AuthExecutionReport): CompactReport {
    return {
      id: report.id,
      requestId: report.requestId,
      agentId: report.agentId,
      agentName: report.agentName,
      timestamp: report.timestamp,
      summary: report.summary,
      sensitiveTypesCount: report.sensitiveTypesAccessed.length,
      toolsUsedCount: report.toolsUsed.length,
      riskLevel: this.getRiskLevel(report),
      dataWiped: report.dataWiped,
      duration: report.duration,
    }
  }

  /**
   * Export report in specified format
   */
  export(report: AuthExecutionReport, format: ReportFormat): string {
    switch (format) {
      case 'json':
        return this.exportJson(report)
      case 'markdown':
        return this.exportMarkdown(report)
      case 'text':
        return this.exportText(report)
    }
  }

  /**
   * Export as JSON
   */
  exportJson(report: AuthExecutionReport): string {
    // Remove any sensitive data that might have slipped in
    const safeReport = this.sanitizeReport(report)
    return JSON.stringify(safeReport, null, 2)
  }

  /**
   * Export as Markdown
   */
  exportMarkdown(report: AuthExecutionReport): string {
    const lines: string[] = [
      '# Sensitive Data Access Report',
      '',
      `**Report ID:** ${report.id}`,
      `**Request ID:** ${report.requestId}`,
      `**Agent ID:** ${report.agentId}`,
      report.agentName ? `**Agent Name:** ${report.agentName}` : '',
      `**Timestamp:** ${new Date(report.timestamp).toISOString()}`,
      `**Duration:** ${(report.duration / 1000).toFixed(2)}s`,
      '',
      '## Summary',
      '',
      report.summary,
      '',
      '## Data Access',
      '',
    ]

    if (report.dataAccessSummary.length === 0) {
      lines.push('No data was accessed.')
    } else {
      lines.push('| Type | Path | Access | Result |')
      lines.push('|------|------|--------|--------|')
      for (const entry of report.dataAccessSummary) {
        const typeName = this.getTypeName(entry.type)
        lines.push(`| ${typeName} | \`${this.maskPath(entry.path)}\` | ${entry.accessType} | ${entry.success ? 'Success' : 'Failed'} |`)
      }
    }

    lines.push('', '## Tools Used', '')
    if (report.toolExecutionSummary.length === 0) {
      lines.push('No tools were executed.')
    } else {
      lines.push('| Tool | Result | Duration |')
      lines.push('|------|--------|---------|')
      for (const entry of report.toolExecutionSummary) {
        lines.push(`| ${entry.tool} | ${entry.result} | ${entry.duration}ms |`)
      }
    }

    if (report.riskEvents.length > 0) {
      lines.push('', '## Risk Events', '')
      for (const event of report.riskEvents) {
        const status = event.mitigated ? '✅ Mitigated' : '⚠️ Active'
        lines.push(`- **${event.type}:** ${event.description} (${status})`)
        if (event.mitigation) {
          lines.push(`  - Mitigation: ${event.mitigation}`)
        }
      }
    }

    if (report.warnings.length > 0) {
      lines.push('', '## Warnings', '')
      for (const warning of report.warnings) {
        lines.push(`- ⚠️ ${warning}`)
      }
    }

    lines.push('', '## Data Status', '')
    lines.push(`**Data Wiped:** ${report.dataWiped ? '✅ Yes (ephemeral execution)' : '❌ No'}`)
    if (report.wipedAt) {
      lines.push(`**Wiped At:** ${new Date(report.wipedAt).toISOString()}`)
    }

    return lines.join('\n')
  }

  /**
   * Export as plain text
   */
  exportText(report: AuthExecutionReport): string {
    const lines: string[] = [
      '=== SENSITIVE DATA ACCESS REPORT ===',
      '',
      `Report ID: ${report.id}`,
      `Request ID: ${report.requestId}`,
      `Agent: ${report.agentId}`,
      `Time: ${new Date(report.timestamp).toISOString()}`,
      `Duration: ${(report.duration / 1000).toFixed(2)}s`,
      '',
      'SUMMARY:',
      report.summary,
      '',
      'DATA ACCESS:',
    ]

    for (const entry of report.dataAccessSummary) {
      lines.push(`  - ${this.getTypeName(entry.type)}: ${entry.accessType} ${entry.success ? 'OK' : 'FAILED'}`)
    }

    lines.push('', 'TOOLS:')
    for (const entry of report.toolExecutionSummary) {
      lines.push(`  - ${entry.tool}: ${entry.result} (${entry.duration}ms)`)
    }

    if (report.riskEvents.length > 0) {
      lines.push('', 'RISKS:')
      for (const event of report.riskEvents) {
        lines.push(`  - ${event.type}: ${event.description} [${event.mitigated ? 'MITIGATED' : 'ACTIVE'}]`)
      }
    }

    lines.push('', `DATA WIPED: ${report.dataWiped ? 'YES' : 'NO'}`)

    return lines.join('\n')
  }

  /**
   * Get risk level string from report
   */
  private getRiskLevel(report: AuthExecutionReport): string {
    if (report.riskEvents.some(e => !e.mitigated && ['critical', 'high'].includes(e.type))) {
      return 'high'
    }
    if (report.riskEvents.some(e => !e.mitigated)) {
      return 'medium'
    }
    return 'low'
  }

  /**
   * Get human-readable type name
   */
  private getTypeName(type: SensitiveDataType): string {
    return SensitiveDataClassifier.getTypeDescription(type)
  }

  /**
   * Mask sensitive parts of path
   */
  private maskPath(filePath: string): string {
    const parts = filePath.split('/')
    if (parts.length <= 2) return '***'
    const filename = parts[parts.length - 1]
    const dir = parts.slice(0, -1).join('/')
    return `${dir}/***/${filename}`
  }

  /**
   * Remove any sensitive data from report
   */
  private sanitizeReport(report: AuthExecutionReport): AuthExecutionReport {
    return {
      ...report,
      // Sanitize tool params - only keep non-sensitive keys
      toolExecutionSummary: report.toolExecutionSummary.map(t => ({
        tool: t.tool,
        params: Object.fromEntries(
          Object.entries(t.params).filter(([k]) => !['password', 'secret', 'token', 'key', 'credential'].some(s => k.toLowerCase().includes(s)))
        ),
        duration: t.duration,
        result: t.result,
        error: t.error,
      })),
    }
  }
}

// Singleton
let generator: ReportGenerator | null = null

export function getReportGenerator(): ReportGenerator {
  if (!generator) generator = new ReportGenerator()
  return generator
}

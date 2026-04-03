/**
 * Threat Analyzer
 * Detects malware, suspicious patterns, and tool chain risks
 *
 * This module provides:
 * - analyzeForMalware() - scan files for malware signatures
 * - analyzeActionSuspicion() - detect suspicious command patterns
 * - analyzeToolChain() - evaluate risks in tool combinations
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { ActionRequest } from '../common/security.js'

/**
 * Threat risk levels
 */
export type ThreatLevel = 'safe' | 'caution' | 'dangerous' | 'critical'

/**
 * Threat analysis result
 */
export interface ThreatAnalysis {
  hasThreat: boolean
  threatLevel: ThreatLevel
  threatTypes: ThreatType[]
  signatures: string[]
  suspiciousPatterns: SuspiciousPattern[]
  recommendations: string[]
  details: string
}

/**
 * Types of threats detected
 */
export type ThreatType =
  | 'malware'
  | 'ransomware'
  | 'trojan'
  | 'spyware'
  | 'adware'
  | 'worm'
  | 'rootkit'
  | 'keylogger'
  | 'cryptominer'
  | 'data_exfiltration'
  | 'command_injection'
  | 'privilege_escalation'
  | 'lateral_movement'
  | 'persistence'
  | 'obfuscation'
  | 'social_engineering'

/**
 * Suspicious pattern detected
 */
export interface SuspiciousPattern {
  pattern: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  location?: string
}

/**
 * Tool chain analysis result
 */
export interface ToolChainAnalysis {
  tools: string[]
  riskLevel: ThreatLevel
  risks: ToolChainRisk[]
  recommendations: string[]
  canExecuteTogether: boolean
}

export interface ToolChainRisk {
  toolA: string
  toolB: string
  risk: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Malware signature definitions
 */
interface MalwareSignature {
  name: string
  threatType: ThreatType
  patterns: RegExp[]
  description: string
}

const MALWARE_SIGNATURES: MalwareSignature[] = [
  // Ransomware patterns
  {
    name: 'Ransomware Indicator',
    threatType: 'ransomware',
    patterns: [
      /ransom|ransomware|encrypt/i,
      /\.encrypted$/i,
      /bitcoin.*payment|btc.*payment/i,
      /payment.*decrypt|decrypt.*payment/i,
      /your.*files.*will.*be.*deleted/i,
      /24.*hours.*payment/i,
    ],
    description: 'Ransomware payment/deletion threats',
  },
  // Cryptominer patterns
  {
    name: 'Cryptominer Indicator',
    threatType: 'cryptominer',
    patterns: [
      /cryptominer|crypto.*miner|xmrig|coinhive/i,
      /stratum\+tcp|mining.*pool/i,
      /cryptonight|ethash|equihash/i,
      /cpu.*miner|gpu.*miner/i,
    ],
    description: 'Cryptocurrency mining software',
  },
  // Keylogger patterns
  {
    name: 'Keylogger Indicator',
    threatType: 'keylogger',
    patterns: [
      /keylog|key.*logger|keyboard.*capture|keystroke.*capture/i,
      /record.*keystrokes|keystroke.*recorder/i,
      /capture.*input|input.*capture/i,
    ],
    description: 'Keystroke recording software',
  },
  // Data exfiltration patterns
  {
    name: 'Data Exfiltration Indicator',
    threatType: 'data_exfiltration',
    patterns: [
      /exfiltrat|data.*leak|data.*steal/i,
      /send.*data.*remote|upload.*data.*external/i,
      /curl.*http.*upload|wget.*post/i,
      /base64.*encoded.*data|base64.*send/i,
      /nc\s+-e|netcat.*reverse.*shell/i,
    ],
    description: 'Data theft or exfiltration attempts',
  },
  // Reverse shell patterns
  {
    name: 'Reverse Shell Indicator',
    threatType: 'malware',
    patterns: [
      /reverse.*shell|backdoor|remote.*access/i,
      /nc\s+-e\s+/i,
      /\/bin\/sh.*-i/i,
      /bash.*-i.*\/dev\/tcp/i,
      /perl.*-e.*socket|python.*-c.*socket/i,
    ],
    description: 'Reverse shell or backdoor access',
  },
  // Privilege escalation
  {
    name: 'Privilege Escalation Indicator',
    threatType: 'privilege_escalation',
    patterns: [
      /chmod\s+777|chmod\s+4755|chmod\s+u\+s/i,
      /setuid|setgid|sudo.*exploit/i,
      /password.*bypass|privilege.*escalat/i,
    ],
    description: 'Privilege escalation attempts',
  },
  // Command injection
  {
    name: 'Command Injection Indicator',
    threatType: 'command_injection',
    patterns: [
      /;\s*rm\s+-rf|;\s*wget|;\s*curl/i,
      /\|\s*sh|\|\s*bash|\&\&\s*rm/i,
      /\$\(.*\)|`.*`/i, // Command substitution
      /eval\s*\(|exec\s*\(/i,
      /document\.cookie|window\.location/i,
    ],
    description: 'Command or code injection attempts',
  },
  // Persistence mechanisms
  {
    name: 'Persistence Mechanism Indicator',
    threatType: 'persistence',
    patterns: [
      /crontab.*reverse|schedule.*task/i,
      /launchagent|launchd|systemd.*service/i,
      /reg.*add.*run|registry.*auto.*start/i,
      /~\/\.bashrc.*reverse|~\/\.profile.*reverse/i,
    ],
    description: 'Persistence mechanisms for malware',
  },
  // Obfuscation
  {
    name: 'Obfuscation Indicator',
    threatType: 'obfuscation',
    patterns: [
      /base64.*decode|base64.*encrypt/i,
      /rot13|xor.*encrypt|obfuscat/i,
      /eval\s*\(\s*base64/i,
      /stringfromfile|exec.*string/i,
      /charcodeat.*eval|decode.*component/i,
    ],
    description: 'Code obfuscation techniques',
  },
  // Social engineering
  {
    name: 'Social Engineering Indicator',
    threatType: 'social_engineering',
    patterns: [
      /click.*here.*verify|urgent.*action.*required/i,
      /confirm.*identity.*now|verify.*account.*now/i,
      /suspend.*account.*unless|security.*alert.*verify/i,
    ],
    description: 'Social engineering or phishing attempts',
  },
]

/**
 * Suspicious command patterns
 */
interface SuspiciousCommandPattern {
  pattern: RegExp
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

const SUSPICIOUS_COMMAND_PATTERNS: SuspiciousCommandPattern[] = [
  // Critical severity
  {
    pattern: /rm\s+-rf\s+\/|rm\s+-rf\s+\*\s*;|del\s+\/f\s+\/s\s+\/q/i,
    description: 'Destructive delete command (potential ransomware)',
    severity: 'critical',
  },
  {
    pattern: /format\s+[a-z]:|fdisk|mkfs\./i,
    description: 'Filesystem format command',
    severity: 'critical',
  },
  {
    pattern: /nc\s+-l\s+-p\s+\d+|nc\s+-e\s+\//i,
    description: 'Netcat listener (potential backdoor)',
    severity: 'critical',
  },
  {
    pattern: /chmod\s+777\s+\/|chmod\s+777\s+\./i,
    description: 'World-writable permissions on root/system',
    severity: 'critical',
  },
  {
    pattern: /sudo\s+su|sudo\s+-i|su\s+-\s*root/i,
    description: 'Attempt to gain root access',
    severity: 'critical',
  },
  {
    pattern: /wget.*\|.*sh|curl.*\|.*sh|fetch.*\|.*sh/i,
    description: 'Download and execute (script injection)',
    severity: 'critical',
  },

  // High severity
  {
    pattern: /mysqldump.*--all-databases|pg_dump.*-a\s+-c/i,
    description: 'Full database dump',
    severity: 'high',
  },
  {
    pattern: /passwd\s+root|usermod.*sudo|useradd.*sudo/i,
    description: 'User account modification',
    severity: 'high',
  },
  {
    pattern: /iptables.*flush|ufw\s+disable|firewall.*off/i,
    description: 'Disabling firewall',
    severity: 'high',
  },
  {
    pattern: /\.ssh\/authorized_keys|wget.*\.ssh/i,
    description: 'SSH key manipulation',
    severity: 'high',
  },
  {
    pattern: /base64\s+-d\s+.*\|.*sh|base64\s+-d\s+.*\|.*python/i,
    description: 'Encoded command execution',
    severity: 'high',
  },

  // Medium severity
  {
    pattern: /grep\s+-r\s+--include.*password|grep\s+-r\s+--include.*secret/i,
    description: 'Credential searching',
    severity: 'medium',
  },
  {
    pattern: /curl\s+.*\s+-H\s+.*Authorization|wget\s+.*--header.*auth/i,
    description: 'External API calls with auth headers',
    severity: 'medium',
  },
  {
    pattern: /ps\s+-ef|ps\s+aux.*\|.*grep/i,
    description: 'Process enumeration',
    severity: 'medium',
  },
  {
    pattern: /net\s+stat|ss\s+-tulpn|lsof\s+-i/i,
    description: 'Network connection enumeration',
    severity: 'medium',
  },

  // Low severity
  {
    pattern: /whoami|uname\s+-a|hostname/i,
    description: 'System information gathering',
    severity: 'low',
  },
  {
    pattern: /df\s+-h|free\s+-m|top\s+-bn1/i,
    description: 'System resource monitoring',
    severity: 'low',
  },
]

/**
 * Dangerous tool combinations
 */
const DANGEROUS_TOOL_COMBINATIONS: Array<[string[], string, string]> = [
  [
    ['shell_exec', 'fs_write'],
    'Shell execution combined with file write can execute arbitrary code',
    'critical',
  ],
  [
    ['fs_read', 'http_request'],
    'File read combined with network request can exfiltrate data',
    'critical',
  ],
  [
    ['shell_exec', 'network_scan'],
    'Shell execution with network scanning indicates reconnaissance',
    'high',
  ],
  [
    ['fs_delete', 'shell_exec'],
    'File deletion combined with shell execution can破坏系统',
    'critical',
  ],
  [
    ['credential_access', 'http_request'],
    'Credential access combined with network request is data exfiltration risk',
    'critical',
  ],
  [
    ['crypto_transfer', 'shell_exec'],
    'Financial transaction with shell execution is highly suspicious',
    'critical',
  ],
]

/**
 * ThreatAnalyzer class
 */
export class ThreatAnalyzer {
  private malwareSignatures: MalwareSignature[]
  private suspiciousPatterns: SuspiciousCommandPattern[]

  constructor() {
    this.malwareSignatures = MALWARE_SIGNATURES
    this.suspiciousPatterns = SUSPICIOUS_COMMAND_PATTERNS
  }

  /**
   * Analyze a file for malware signatures
   */
  async analyzeForMalware(filePath: string): Promise<ThreatAnalysis> {
    const signatures: string[] = []
    const threatTypes: ThreatType[] = []
    const allSuspiciousPatterns: SuspiciousPattern[] = []
    const recommendations: string[] = []

    try {
      const content = await fs.readFile(filePath, 'utf-8')

      // Check malware signatures
      for (const signature of this.malwareSignatures) {
        for (const pattern of signature.patterns) {
          if (pattern.test(content)) {
            signatures.push(signature.name)
            if (!threatTypes.includes(signature.threatType)) {
              threatTypes.push(signature.threatType)
            }
            allSuspiciousPatterns.push({
              pattern: pattern.source,
              description: signature.description,
              severity: this.threatTypeToSeverity(signature.threatType),
              location: filePath,
            })
            recommendations.push(`Malware signature detected: ${signature.name}`)
            break
          }
        }
      }

      // Check for obfuscated code
      if (this.hasObfuscation(content)) {
        threatTypes.push('obfuscation')
        allSuspiciousPatterns.push({
          pattern: 'obfuscation detected',
          description: 'Code obfuscation patterns found (base64, hex, etc.)',
          severity: 'high',
        })
        recommendations.push('Code obfuscation detected - manual review recommended')
      }

      // Determine threat level
      const threatLevel = this.determineThreatLevel(threatTypes, allSuspiciousPatterns)

      return {
        hasThreat: signatures.length > 0 || threatTypes.length > 0,
        threatLevel,
        threatTypes,
        signatures,
        suspiciousPatterns: allSuspiciousPatterns,
        recommendations,
        details: this.generateDetails(threatTypes, signatures, threatLevel),
      }
    } catch (error) {
      // File read error - might not be a text file
      return {
        hasThreat: false,
        threatLevel: 'safe',
        threatTypes: [],
        signatures: [],
        suspiciousPatterns: [],
        recommendations: [],
        details: `Unable to analyze file: ${(error as Error).message}`,
      }
    }
  }

  /**
   * Analyze an action for suspicious patterns
   */
  analyzeActionSuspicion(action: ActionRequest): ThreatAnalysis {
    const signatures: string[] = []
    const threatTypes: ThreatType[] = []
    const allSuspiciousPatterns: SuspiciousPattern[] = []
    const recommendations: string[] = []

    let textToAnalyze = ''

    // Collect text from all relevant fields
    if (action.type === 'execution' && action.command) {
      textToAnalyze += action.command
    }
    if (action.type === 'execution' && action.code) {
      textToAnalyze += action.code
    }
    if (action.type === 'file' && action.path) {
      textToAnalyze += action.path
    }
    if (action.type === 'network' && action.host) {
      textToAnalyze += action.host
    }

    // Check for suspicious command patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.pattern.test(textToAnalyze)) {
        allSuspiciousPatterns.push({
          pattern: pattern.pattern.source,
          description: pattern.description,
          severity: pattern.severity,
        })
        recommendations.push(`Suspicious pattern: ${pattern.description}`)
      }
    }

    // Check malware signatures
    for (const signature of this.malwareSignatures) {
      for (const pattern of signature.patterns) {
        if (pattern.test(textToAnalyze)) {
          signatures.push(signature.name)
          if (!threatTypes.includes(signature.threatType)) {
            threatTypes.push(signature.threatType)
          }
        }
      }
    }

    // Check for obfuscation
    if (this.hasObfuscation(textToAnalyze)) {
      threatTypes.push('obfuscation')
      allSuspiciousPatterns.push({
        pattern: 'obfuscation',
        description: 'Obfuscated code or commands detected',
        severity: 'high',
      })
      recommendations.push('Command or code appears to be obfuscated')
    }

    // Check for specific threat types based on action type
    if (action.type === 'execution' && action.command) {
      // Command injection check
      if (this.hasCommandInjection(action.command)) {
        threatTypes.push('command_injection')
        allSuspiciousPatterns.push({
          pattern: 'command_injection',
          description: 'Potential command injection detected',
          severity: 'critical',
        })
        recommendations.push('Command injection risk detected - input sanitization required')
      }

      // Privilege escalation check
      if (/sudo|su\s+-|chmod\s+777|setuid/i.test(action.command)) {
        threatTypes.push('privilege_escalation')
        allSuspiciousPatterns.push({
          pattern: 'privilege_escalation',
          description: 'Potential privilege escalation attempt',
          severity: 'high',
        })
      }
    }

    // Determine threat level
    const threatLevel = this.determineThreatLevel(threatTypes, allSuspiciousPatterns)

    return {
      hasThreat: signatures.length > 0 || allSuspiciousPatterns.length > 0,
      threatLevel,
      threatTypes,
      signatures,
      suspiciousPatterns: allSuspiciousPatterns,
      recommendations,
      details: this.generateDetails(threatTypes, signatures, threatLevel),
    }
  }

  /**
   * Map severity ('low'|'medium'|'high'|'critical') to ThreatLevel
   */
  private severityToThreatLevel(severity: 'low' | 'medium' | 'high' | 'critical'): ThreatLevel {
    switch (severity) {
      case 'low': return 'safe'
      case 'medium': return 'caution'
      case 'high': return 'dangerous'
      case 'critical': return 'critical'
    }
  }

  /**
   * Analyze a chain of tool calls
   */
  analyzeToolChain(tools: string[]): ToolChainAnalysis {
    const risks: ToolChainRisk[] = []
    const recommendations: string[] = []
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low'

    for (const [dangerousCombo, riskDesc, severity] of DANGEROUS_TOOL_COMBINATIONS) {
      const hasAll = dangerousCombo.every(tool =>
        tools.some(t => t.toLowerCase().includes(tool.toLowerCase()))
      )

      if (hasAll) {
        const toolA = dangerousCombo[0]
        const toolB = dangerousCombo[1]

        risks.push({
          toolA,
          toolB,
          risk: riskDesc,
          severity: severity as 'low' | 'medium' | 'high' | 'critical',
        })

        if (severity === 'critical') {
          maxSeverity = 'critical'
        } else if (severity === 'high' && maxSeverity !== 'critical') {
          maxSeverity = 'high'
        } else if (severity === 'medium' && maxSeverity === 'low') {
          maxSeverity = 'medium'
        }

        recommendations.push(`Risk: ${toolA} + ${toolB} - ${riskDesc}`)
      }
    }

    // General recommendations
    if (tools.length > 5) {
      recommendations.push('Large tool chain detected - consider breaking into smaller operations')
    }

    const canExecuteTogether = maxSeverity !== 'critical' && maxSeverity !== 'high'

    return {
      tools,
      riskLevel: this.severityToThreatLevel(maxSeverity),
      risks,
      recommendations,
      canExecuteTogether,
    }
  }

  /**
   * Check for command injection patterns
   */
  private hasCommandInjection(command: string): boolean {
    const injectionPatterns = [
      /;\s*\w+/, // command chaining
      /\|\s*\w+/, // pipe
      /&&\s*\w+/, // AND
      /\|\|\s*\w+/, // OR
      /`[^`]+`/, // backtick substitution
      /\$\([^)]+\)/, // $() substitution
      /\n/, // newline injection
    ]

    return injectionPatterns.some(p => p.test(command))
  }

  /**
   * Check for code obfuscation
   */
  private hasObfuscation(text: string): boolean {
    // Base64 patterns
    const base64Pattern = /[A-Za-z0-9+/]{40,}={0,2}/
    // Hex encoding
    const hexPattern = /\\x[0-9a-fA-F]{2}/
    // Unicode escape
    const unicodePattern = /\\u[0-9a-fA-F]{4}/
    // URL encoding
    const urlPattern = /%[0-9a-fA-F]{2}/

    const base64Count = (text.match(base64Pattern) || []).length
    const hexCount = (text.match(hexPattern) || []).length
    const unicodeCount = (text.match(unicodePattern) || []).length
    const urlCount = (text.match(urlPattern) || []).length

    return base64Count > 0 || hexCount > 3 || unicodeCount > 3 || urlCount > 5
  }

  /**
   * Convert threat type to severity level
   */
  private threatTypeToSeverity(threatType: ThreatType): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTypes: ThreatType[] = [
      'ransomware',
      'trojan',
      'rootkit',
      'data_exfiltration',
      'command_injection',
    ]
    const highTypes: ThreatType[] = [
      'malware',
      'keylogger',
      'cryptominer',
      'privilege_escalation',
      'persistence',
    ]
    const mediumTypes: ThreatType[] = [
      'spyware',
      'adware',
      'lateral_movement',
      'obfuscation',
    ]

    if (criticalTypes.includes(threatType)) return 'critical'
    if (highTypes.includes(threatType)) return 'high'
    if (mediumTypes.includes(threatType)) return 'medium'
    return 'low'
  }

  /**
   * Determine overall threat level
   */
  private determineThreatLevel(
    threatTypes: ThreatType[],
    patterns: SuspiciousPattern[]
  ): ThreatLevel {
    // Critical threats
    if (
      threatTypes.includes('ransomware') ||
      threatTypes.includes('rootkit') ||
      threatTypes.includes('data_exfiltration') ||
      patterns.some(p => p.severity === 'critical')
    ) {
      return 'critical'
    }

    // Dangerous threats
    if (
      threatTypes.includes('malware') ||
      threatTypes.includes('trojan') ||
      threatTypes.includes('keylogger') ||
      threatTypes.includes('cryptominer') ||
      patterns.some(p => p.severity === 'high')
    ) {
      return 'dangerous'
    }

    // Caution threats
    if (
      threatTypes.includes('spyware') ||
      threatTypes.includes('adware') ||
      threatTypes.includes('obfuscation') ||
      threatTypes.includes('command_injection') ||
      patterns.some(p => p.severity === 'medium')
    ) {
      return 'caution'
    }

    return 'safe'
  }

  /**
   * Generate analysis details text
   */
  private generateDetails(
    threatTypes: ThreatType[],
    signatures: string[],
    threatLevel: ThreatLevel
  ): string {
    const parts: string[] = []

    if (threatLevel === 'safe') {
      return 'No threats detected - analysis shows normal patterns'
    }

    if (signatures.length > 0) {
      parts.push(`Signatures matched: ${signatures.join(', ')}`)
    }

    if (threatTypes.length > 0) {
      parts.push(`Threat types: ${threatTypes.join(', ')}`)
    }

    parts.push(`Overall threat level: ${threatLevel.toUpperCase()}`)

    return parts.join(' | ')
  }

  /**
   * Get threat level color for UI
   */
  static getThreatLevelColor(level: ThreatLevel): string {
    const colors: Record<ThreatLevel, string> = {
      safe: '#22c55e', // green
      caution: '#eab308', // yellow
      dangerous: '#f97316', // orange
      critical: '#ef4444', // red
    }
    return colors[level]
  }

  /**
   * Get threat level label for UI
   */
  static getThreatLevelLabel(level: ThreatLevel): string {
    const labels: Record<ThreatLevel, string> = {
      safe: 'Safe',
      caution: 'Caution',
      dangerous: 'Dangerous',
      critical: 'Critical Threat',
    }
    return labels[level]
  }
}

// Singleton instance
let analyzer: ThreatAnalyzer | null = null

export function getThreatAnalyzer(): ThreatAnalyzer {
  if (!analyzer) {
    analyzer = new ThreatAnalyzer()
  }
  return analyzer
}

export function resetThreatAnalyzer(): void {
  analyzer = null
}

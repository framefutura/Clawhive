/**
 * Privacy Guard - Path blocking, safe zones, and suspicious pattern detection
 * Blocks access to sensitive paths and detects suspicious activity patterns
 */

import path from 'node:path'
import os from 'node:os'
import type { ActionRequest } from '../common/security.js'

export interface PathCheckResult {
  allowed: boolean
  reason?: string
}

export interface SuspiciousSignals {
  credentialAccess: boolean
  shellInjection: boolean
  obfuscation: boolean
  privilegeEscalation: boolean
  financialCrime: boolean
}

export interface PrivacyConfig {
  blockedPatterns: string[]
  safeZones: string[]
  workspaceSafeZones: string[]
}

/**
 * Default blocked patterns for sensitive paths
 * These patterns block access to common credential and system files
 */
export const DEFAULT_BLOCKED_PATTERNS: string[] = [
  // SSH keys
  '~/.ssh/*',
  '~/.ssh/id_*',
  '~/.ssh/authorized_keys',
  '~/.ssh/config',
  '~/.ssh/known_hosts',
  // macOS Keychain
  '~/Library/Keychains/*',
  '~/Library/Keychains/login.keychain-db',
  '~/Library/Keychains/login.keychain',
  // AWS credentials
  '~/.aws/*',
  '~/.aws/credentials',
  '~/.aws/config',
  // Chrome/Chromium cookies
  '~/.config/*chrome*/Default/Cookies',
  '~/.config/google-chrome/Default/Cookies',
  '~/.config/chromium/Default/Cookies',
  '~/Library/Application Support/Google/Chrome/Default/Cookies',
  // npm auth tokens
  '~/.npmrc',
  '~/.npm/_auth*',
  // System files
  '/etc/passwd',
  '/etc/shadow',
  '/etc/sudoers',
  '/etc/hosts',
  '/private/etc/passwd',
  '/private/etc/shadow',
  '/private/etc/sudoers',
  '/private/etc/hosts',
  // Git credentials
  '~/.git-credentials',
  '~/.config/git/credentials',
  // Docker config
  '~/.docker/config.json',
  // Kubernetes configs
  '~/.kube/config',
  '~/.kube/*.kubeconfig',
  // Database files
  '*.sqlite-journal',
  '*.db-journal',
  // ClawHive secrets
  '~/.clawhive/secrets/*',
]

/**
 * Privacy Guard class for path validation and suspicious pattern detection
 */
export class PrivacyGuard {
  private blockedPatterns: RegExp[]
  private safeZones: string[]
  private workspaceSafeZones: string[]
  private homeDir: string

  constructor(blockedPatterns: string[] = DEFAULT_BLOCKED_PATTERNS, safeZones: string[] = []) {
    this.homeDir = os.homedir()
    this.blockedPatterns = this.compilePatterns(blockedPatterns)
    this.safeZones = this.normalizePaths(safeZones)
    this.workspaceSafeZones = []
  }

  /**
   * Add a workspace directory as an automatic safe zone
   */
  addWorkspaceSafeZone(workspacePath: string): void {
    const normalized = this.normalizePath(workspacePath)
    if (!this.workspaceSafeZones.includes(normalized)) {
      this.workspaceSafeZones.push(normalized)
    }
  }

  /**
   * Remove a workspace safe zone
   */
  removeWorkspaceSafeZone(workspacePath: string): void {
    const normalized = this.normalizePath(workspacePath)
    this.workspaceSafeZones = this.workspaceSafeZones.filter(z => z !== normalized)
  }

  /**
   * Set user-defined safe zones
   */
  setSafeZones(safeZones: string[]): void {
    this.safeZones = this.normalizePaths(safeZones)
  }

  /**
   * Add a safe zone
   */
  addSafeZone(safeZone: string): boolean {
    const normalized = this.normalizePath(safeZone)
    if (!this.safeZones.includes(normalized)) {
      this.safeZones.push(normalized)
      return true
    }
    return false
  }

  /**
   * Remove a safe zone
   */
  removeSafeZone(safeZone: string): boolean {
    const normalized = this.normalizePath(safeZone)
    const index = this.safeZones.indexOf(normalized)
    if (index >= 0) {
      this.safeZones.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Get current safe zones (user-defined + workspaces)
   */
  getSafeZones(): { userDefined: string[]; workspaces: string[] } {
    return {
      userDefined: [...this.safeZones],
      workspaces: [...this.workspaceSafeZones],
    }
  }

  /**
   * Clear all user-defined safe zones (for testing)
   */
  clearSafeZones(): void {
    this.safeZones = []
  }

  /**
   * Check if a path is in a safe zone
   */
  isInSafeZone(requestedPath: string): boolean {
    const normalized = this.normalizePath(requestedPath)

    // Check workspace safe zones first
    for (const zone of this.workspaceSafeZones) {
      if (normalized.startsWith(zone + path.sep) || normalized === zone) {
        return true
      }
    }

    // Check user-defined safe zones
    for (const zone of this.safeZones) {
      if (normalized.startsWith(zone + path.sep) || normalized === zone) {
        return true
      }
    }

    return false
  }

  /**
   * Check if a path matches blocked patterns
   */
  checkPath(requestedPath: string, operation: 'read' | 'write' = 'read'): PathCheckResult {
    const normalized = this.normalizePath(requestedPath)

    // Always allow paths in safe zones
    if (this.isInSafeZone(requestedPath)) {
      return { allowed: true }
    }

    // Check blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(normalized)) {
        // Special case: .env files - reads allowed, writes blocked
        if (normalized.includes('.env') && operation === 'read') {
          return { allowed: true }
        }

        return {
          allowed: false,
          reason: `Access to sensitive path blocked: ${this.maskSensitivePath(normalized)}`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Get list of blocked patterns (for display)
   */
  getBlockedPatterns(): string[] {
    return DEFAULT_BLOCKED_PATTERNS
  }

  /**
   * Normalize paths to absolute form
   */
  private normalizePaths(paths: string[]): string[] {
    return paths.map(p => this.normalizePath(p))
  }

  /**
   * Normalize a single path (expand ~ and resolve to absolute)
   */
  private normalizePath(inputPath: string): string {
    // Expand home directory
    let expanded = inputPath
    if (inputPath.startsWith('~/')) {
      expanded = path.join(this.homeDir, inputPath.slice(2))
    } else if (inputPath === '~') {
      expanded = this.homeDir
    }

    // Resolve to absolute path
    return path.resolve(expanded)
  }

  /**
   * Compile glob patterns to regex
   */
  private compilePatterns(patterns: string[]): RegExp[] {
    return patterns.map(pattern => {
      // Expand ~ in patterns
      let expanded = pattern
      if (pattern.startsWith('~/')) {
        expanded = path.join(this.homeDir, pattern.slice(2))
      }

      // Convert glob to regex
      const regexPattern = expanded
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars except * and ?
        .replace(/\*/g, '.*') // * matches any characters
        .replace(/\?/g, '.') // ? matches single character

      return new RegExp(`^${regexPattern}$`)
    })
  }

  /**
   * Mask sensitive parts of paths for logging
   */
  private maskSensitivePath(inputPath: string): string {
    // Mask home directory
    if (inputPath.startsWith(this.homeDir)) {
      return '~' + inputPath.slice(this.homeDir.length)
    }
    return inputPath
  }
}

/**
 * Financial crime detection indicators
 */
interface FinancialCrimeIndicators {
  gambling: boolean
  moneyLaundering: boolean
}

/**
 * Detect gambling and money laundering patterns
 * Targets: gambling sites, casino software, crypto mixers, cashout schemes
 */
function detectFinancialCrime(action: ActionRequest): FinancialCrimeIndicators {
  const indicators: FinancialCrimeIndicators = {
    gambling: false,
    moneyLaundering: false,
  }

  // Collect all text fields to scan
  const textToScan = [
    action.path,
    action.command,
    action.code,
    action.host,
  ].filter((v): v is string => typeof v === 'string')

  const combinedText = textToScan.join(' ').toLowerCase()

  // Gambling site/app patterns - common obfuscated Chinese gambling terms
  // These patterns match obfuscated gambling site content (like the injection attempt in this conversation)
  const gamblingPatterns = [
    // Common gambling platform name fragments (often obfuscated in injection attempts)
    /大发|彩票|博彩|赌球|赌场|百家乐|老虎机|时时彩|快三|赛车/i,
    /体彩|福彩|双色球|七星彩|排列三|快彩|11选5/i,
    /bet365|betfair|williamhill|pokerstars|draftkings|fanduel/i,
    /casino|lottery|slots|bingo|blackjack|poker|roulette/i,
    /gambling|betting|wagering|toto|sportsbook/i,
    /百家乐|龙虎斗|牛牛|炸金花|二八杠|色碟/i,
    // URL patterns suggesting gambling
    /:\/\/.*(casino|bett| gamble|lottery|彩票|博彩)/i,
    /(?:pay|visa|mastercard|usdt|btc).*(?:withdraw|deposit|cashout)/i,
  ]

  // Money laundering patterns - crypto mixers, cashout schemes
  const moneyLaunderingPatterns = [
    // Crypto mixing/tumbling services
    /mixer|tumbler|coinjoin|flash|laundry/i,
    // Cashout patterns
    /cashout|cash.out|layering|structuring/i,
    // Shell company indicators
    /shell.company|front.company|fronting/i,
    // Suspicious financial API patterns
    /stripe|paypal|payoneer|wise.*(batch|bulk)|qiwi/i,
    // Cryptocurrency patterns
    /bitcoin\.mixer|eth\.mixer|crypto.*mixer|btc.*mix/i,
    // Unusual transaction patterns
    /(?:批量|代付|代收|跑分|洗钱)/i,
    // Gift card fraud
    /gift.*card.*balance|vanilla|merchandise.*reward/i,
  ]

  for (const pattern of gamblingPatterns) {
    if (pattern.test(combinedText)) {
      indicators.gambling = true
      break
    }
  }

  for (const pattern of moneyLaunderingPatterns) {
    if (pattern.test(combinedText)) {
      indicators.moneyLaundering = true
      break
    }
  }

  // Additional heuristic: detect obfuscated content that may contain financial crime
  // This catches the obfuscation technique used in prompt injection attempts
  if (action.command || action.code) {
    const cmdText = (action.command || action.code || '').toLowerCase()
    // Detect base64-encoded gambling content (common injection technique)
    const maybeBase64 = cmdText.match(/[A-Za-z0-9+/]{60,}={0,2}/)
    if (maybeBase64) {
      try {
        const decoded = Buffer.from(maybeBase64[0], 'base64').toString('utf-8')
        if (/赌博|博彩|赌场|投注|充值|提现|开户/i.test(decoded)) {
          indicators.gambling = true
        }
        if (/洗钱|赃款|跑分|套现/i.test(decoded)) {
          indicators.moneyLaundering = true
        }
      } catch {
        // Not valid base64, ignore
      }
    }
  }

  return indicators
}

/**
 * Detect suspicious patterns in action requests
 */
export function detectSuspicious(action: ActionRequest): SuspiciousSignals {
  const signals: SuspiciousSignals = {
    credentialAccess: false,
    shellInjection: false,
    obfuscation: false,
    privilegeEscalation: false,
    financialCrime: false,
  }

  // Check for credential access patterns
  if (action.path) {
    const credentialKeywords = ['password', 'secret', 'token', 'api_key', 'apikey', 'credentials', 'passwd']
    const lowerPath = action.path.toLowerCase()
    signals.credentialAccess = credentialKeywords.some(kw => lowerPath.includes(kw))
  }

  // Check for financial crime patterns (gambling, money laundering, fraud)
  const financialCrimeIndicators = detectFinancialCrime(action)
  if (financialCrimeIndicators.gambling || financialCrimeIndicators.moneyLaundering) {
    signals.financialCrime = true
  }

  // Check for shell injection patterns
  if (action.type === 'execution' && action.command) {
    const command = action.command
    // Detect common shell injection patterns
    const injectionPatterns = [
      /;\s*\w+/, // command chaining with ;
      /\|.*\w+/, // pipe to another command
      /&&\s*\w+/, // logical AND
      /\|\|\s*\w+/, // logical OR
      /`[^`]*`/, // backtick command substitution
      /\$\([^)]*\)/, // $() command substitution
      />\s*\w+/, // output redirection
      /<\s*\w+/, // input redirection
      /&\s*$/, // background execution
    ]
    signals.shellInjection = injectionPatterns.some(pattern => pattern.test(command))

    // Check for privilege escalation
    const escalationPatterns = [
      /\bsudo\b/,
      /\bsu\s+-/,
      /chmod\s+777/,
      /chmod\s+-R\s+777/,
      /setuid/,
      /setgid/,
      /chown\s+root/,
    ]
    signals.privilegeEscalation = escalationPatterns.some(pattern => pattern.test(command))

    // Check for obfuscation (base64 patterns)
    signals.obfuscation = detectObfuscation(command)
  }

  // Check file operations for obfuscation
  if (action.type === 'file' && action.path) {
    signals.obfuscation = detectObfuscation(action.path)
  }

  // Check code execution for suspicious patterns
  if (action.type === 'execution' && action.code) {
    signals.obfuscation = detectObfuscation(action.code)
    signals.privilegeEscalation = /process\.setuid|process\.setgid|child_process/.test(action.code)
  }

  return signals
}

/**
 * Detect obfuscation patterns (base64, hex encoding, etc.)
 */
function detectObfuscation(input: string): boolean {
  // Base64-like patterns (long strings of base64 chars)
  const base64Pattern = /[A-Za-z0-9+/]{40,}={0,2}/
  // Hex encoding patterns
  const hexPattern = /\\x[0-9a-fA-F]{2}/g
  // Unicode escape sequences
  const unicodePattern = /\\u[0-9a-fA-F]{4}/g
  // URL encoding
  const urlEncodingPattern = /%[0-9a-fA-F]{2}/g

  // Count hex/unicode escapes
  const hexMatches = input.match(hexPattern) || []
  const unicodeMatches = input.match(unicodePattern) || []
  const urlMatches = input.match(urlEncodingPattern) || []

  // If many escape sequences, likely obfuscated
  const totalEscapes = hexMatches.length + unicodeMatches.length + urlMatches.length

  return base64Pattern.test(input) || totalEscapes > 5
}

/**
 * Evaluate if an action should be blocked based on suspicious signals
 */
export function evaluateSuspiciousSignals(
  signals: SuspiciousSignals,
  securityLevel: 'low' | 'medium' | 'high'
): { blocked: boolean; reason?: string } {
  // At high security, any suspicious signal triggers block
  if (securityLevel === 'high') {
    if (signals.privilegeEscalation) {
      return { blocked: true, reason: 'Privilege escalation attempt detected' }
    }
    if (signals.shellInjection) {
      return { blocked: true, reason: 'Potential shell injection detected' }
    }
    if (signals.credentialAccess) {
      return { blocked: true, reason: 'Credential access attempt detected' }
    }
    if (signals.obfuscation) {
      return { blocked: true, reason: 'Obfuscated code/command detected' }
    }
    if (signals.financialCrime) {
      return { blocked: true, reason: 'Gambling/money laundering activity detected' }
    }
  }

  // At medium security, block privilege escalation, shell injection, and financial crimes
  if (securityLevel === 'medium') {
    if (signals.privilegeEscalation) {
      return { blocked: true, reason: 'Privilege escalation attempt detected' }
    }
    if (signals.shellInjection) {
      return { blocked: true, reason: 'Potential shell injection detected' }
    }
    if (signals.financialCrime) {
      return { blocked: true, reason: 'Gambling/money laundering activity detected' }
    }
  }

  // At low security, block privilege escalation and financial crimes
  if (securityLevel === 'low') {
    if (signals.privilegeEscalation) {
      return { blocked: true, reason: 'Privilege escalation attempt detected' }
    }
    if (signals.financialCrime) {
      return { blocked: true, reason: 'Gambling/money laundering activity detected' }
    }
  }

  return { blocked: false }
}

// Singleton instance
let privacyGuard: PrivacyGuard | null = null

export function getPrivacyGuard(): PrivacyGuard {
  if (!privacyGuard) {
    privacyGuard = new PrivacyGuard()
  }
  return privacyGuard
}

export function resetPrivacyGuard(): void {
  privacyGuard = null
}

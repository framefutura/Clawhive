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
 * Detect suspicious patterns in action requests
 */
export function detectSuspicious(action: ActionRequest): SuspiciousSignals {
  const signals: SuspiciousSignals = {
    credentialAccess: false,
    shellInjection: false,
    obfuscation: false,
    privilegeEscalation: false,
  }

  // Check for credential access patterns
  if (action.path) {
    const credentialKeywords = ['password', 'secret', 'token', 'api_key', 'apikey', 'credentials', 'passwd']
    const lowerPath = action.path.toLowerCase()
    signals.credentialAccess = credentialKeywords.some(kw => lowerPath.includes(kw))
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
  }

  // At medium security, only block privilege escalation and shell injection
  if (securityLevel === 'medium') {
    if (signals.privilegeEscalation) {
      return { blocked: true, reason: 'Privilege escalation attempt detected' }
    }
    if (signals.shellInjection) {
      return { blocked: true, reason: 'Potential shell injection detected' }
    }
  }

  // At low security, only block privilege escalation
  if (securityLevel === 'low') {
    if (signals.privilegeEscalation) {
      return { blocked: true, reason: 'Privilege escalation attempt detected' }
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

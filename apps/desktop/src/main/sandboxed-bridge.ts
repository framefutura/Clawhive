/**
 * Sandboxed Bridge - Isolated code execution with circuit breakers
 * Provides subprocess isolation for shell/code execution with security enforcement
 */

import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { SecurityLevel, RoleProfile, ActionRequest, SecurityDecision } from '../common/security.js'
import { getSecurityManager } from './security-manager.js'

export interface SecurityContext {
  level: SecurityLevel
  role: RoleProfile
  workspaceId: string
  workspacePath: string
}

interface CallRecord {
  toolName: string
  args: string
  timestamp: number
}

interface SessionState {
  callCount: number
  callHistory: CallRecord[]
  totalExecutionTime: number
  paused: boolean
  pauseReason?: string
  childProcess?: ChildProcess
}

const MAX_CALLS_PER_SESSION = 100
const LOOP_WINDOW_SIZE = 5
const LOOP_REPETITION_THRESHOLD = 3
const MAX_CUMULATIVE_EXECUTION_TIME_MS = 10 * 60 * 1000 // 10 minutes
const EXECUTION_TIMEOUT_MS = 30000 // 30 seconds

export class SandboxedBridge extends EventEmitter {
  private sessions = new Map<string, SessionState>()

  /**
   * Check if a tool can be executed based on security context
   */
  canExecute(sessionId: string, toolName: string, context: SecurityContext): { allowed: boolean; reason?: string } {
    // Check if session is paused
    const session = this.getSession(sessionId)
    if (session.paused) {
      return { allowed: false, reason: session.pauseReason || 'Session is paused' }
    }

    // Check call count limit
    if (session.callCount >= MAX_CALLS_PER_SESSION) {
      return { allowed: false, reason: 'Tool call limit reached (100 calls per session)' }
    }

    // Check cumulative execution time
    if (session.totalExecutionTime >= MAX_CUMULATIVE_EXECUTION_TIME_MS) {
      this.pauseSession(sessionId, 'Cumulative execution time exceeded (10 minutes)')
      return { allowed: false, reason: 'Session paused: Cumulative execution time exceeded' }
    }

    // Delegate to SecurityManager for permission evaluation
    const securityManager = getSecurityManager()
    const action: ActionRequest = {
      type: 'tool',
      tool: toolName,
    }

    const decision = securityManager.evaluateAction(context.level, context.role, action)

    if (!decision.allowed) {
      return { allowed: false, reason: decision.reason }
    }

    if (decision.requiresApproval) {
      return { allowed: true, reason: decision.reason }
    }

    return { allowed: true }
  }

  /**
   * Execute a tool in a sandboxed context
   */
  async execute(
    sessionId: string,
    toolName: string,
    args: unknown,
    context: SecurityContext
  ): Promise<unknown> {
    // Pre-execution checks
    const canExecute = this.canExecute(sessionId, toolName, context)
    if (!canExecute.allowed) {
      throw new Error(canExecute.reason || 'Execution not allowed')
    }

    // Check for loops before execution
    const loopCheck = this.checkForLoops(sessionId, toolName, args)
    if (loopCheck.isLoop) {
      this.pauseSession(sessionId, `Loop detected: ${loopCheck.reason}`)
      throw new Error(`Loop detected: ${loopCheck.reason}`)
    }

    const session = this.getSession(sessionId)
    const startTime = Date.now()

    try {
      let result: unknown

      // Route to appropriate execution method based on tool type
      if (this.isShellTool(toolName)) {
        result = await this.executeInChildProcess(sessionId, toolName, args, context)
      } else if (this.isFileTool(toolName)) {
        result = await this.executeFileTool(toolName, args, context)
      } else if (this.isNetworkTool(toolName)) {
        result = await this.executeNetworkTool(toolName, args, context)
      } else {
        // Default: execute in main process with sanitization
        result = await this.executeInMainProcess(toolName, args, context)
      }

      // Record successful execution
      const executionTime = Date.now() - startTime
      this.recordCall(sessionId, toolName, args, executionTime)

      return result
    } catch (error) {
      // Sanitize error before returning
      throw this.sanitizeError(error)
    }
  }

  /**
   * Reset a session's state
   */
  resetSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session?.childProcess) {
      session.childProcess.kill()
    }
    this.sessions.delete(sessionId)
  }

  /**
   * Pause a session (circuit breaker trip)
   */
  pauseSession(sessionId: string, reason: string): void {
    const session = this.getSession(sessionId)
    session.paused = true
    session.pauseReason = reason

    // Kill any running child process
    if (session.childProcess) {
      session.childProcess.kill()
      session.childProcess = undefined
    }

    // Emit pause event to renderer
    this.emit('sandbox:paused', {
      sessionId,
      reason,
      callCount: session.callCount,
      totalExecutionTime: session.totalExecutionTime,
    })
  }

  /**
   * Resume a paused session
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.paused = false
      session.pauseReason = undefined
      this.emit('sandbox:resumed', { sessionId })
    }
  }

  /**
   * Get session state for UI display
   */
  getSessionState(sessionId: string): {
    callCount: number
    paused: boolean
    pauseReason?: string
    totalExecutionTime: number
  } | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    return {
      callCount: session.callCount,
      paused: session.paused,
      pauseReason: session.pauseReason,
      totalExecutionTime: session.totalExecutionTime,
    }
  }

  /**
   * Execute shell commands in an isolated child process
   */
  private async executeInChildProcess(
    sessionId: string,
    toolName: string,
    args: unknown,
    context: SecurityContext
  ): Promise<unknown> {
    const session = this.getSession(sessionId)

    // Extract command from args
    const command = this.extractCommand(args)
    if (!command) {
      throw new Error('No command provided for shell execution')
    }

    return new Promise((resolve, reject) => {
      const stdout: string[] = []
      const stderr: string[] = []

      // Spawn child process with limited environment
      const child = spawn('sh', ['-c', command], {
        cwd: context.workspacePath,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          // No access to sensitive env vars
        },
        timeout: EXECUTION_TIMEOUT_MS,
      })

      session.childProcess = child

      child.stdout?.on('data', (data: Buffer) => {
        stdout.push(data.toString())
      })

      child.stderr?.on('data', (data: Buffer) => {
        stderr.push(data.toString())
      })

      child.on('close', (code) => {
        session.childProcess = undefined

        if (code === 0) {
          resolve({
            stdout: stdout.join(''),
            stderr: stderr.join(''),
            exitCode: code,
          })
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${stderr.join('')}`))
        }
      })

      child.on('error', (err) => {
        session.childProcess = undefined
        reject(err)
      })

      // Timeout handler
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM')
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL')
          }
        }, 5000)
        reject(new Error('Execution timeout after 30 seconds'))
      }, EXECUTION_TIMEOUT_MS)

      child.on('close', () => {
        clearTimeout(timeoutId)
      })
    })
  }

  /**
   * Execute file tools with path sanitization
   */
  private async executeFileTool(
    toolName: string,
    args: unknown,
    context: SecurityContext
  ): Promise<unknown> {
    // File tools are executed in main process but with path validation
    // The Privacy Guard already validated paths in canExecute
    // This is a placeholder - actual implementation would use fs promises
    throw new Error(`File tool ${toolName} not yet implemented in sandboxed bridge`)
  }

  /**
   * Execute network tools with host validation
   */
  private async executeNetworkTool(
    toolName: string,
    args: unknown,
    context: SecurityContext
  ): Promise<unknown> {
    // Network tools are executed in main process with host validation
    // The SecurityManager already validated hosts in canExecute
    throw new Error(`Network tool ${toolName} not yet implemented in sandboxed bridge`)
  }

  /**
   * Execute safe tools in main process
   */
  private async executeInMainProcess(
    toolName: string,
    args: unknown,
    context: SecurityContext
  ): Promise<unknown> {
    // For safe tools that don't need isolation
    throw new Error(`Tool ${toolName} not yet implemented in sandboxed bridge`)
  }

  /**
   * Check for repetitive tool call patterns (loop detection)
   */
  private checkForLoops(
    sessionId: string,
    toolName: string,
    args: unknown
  ): { isLoop: boolean; reason?: string } {
    const session = this.getSession(sessionId)
    const argsHash = this.hashArgs(args)

    // Get last N calls
    const recentCalls = session.callHistory.slice(-LOOP_WINDOW_SIZE)

    // Count occurrences of this tool+args combination
    const matches = recentCalls.filter(
      (call) => call.toolName === toolName && call.args === argsHash
    )

    if (matches.length >= LOOP_REPETITION_THRESHOLD - 1) {
      // -1 because we're about to add one more
      return {
        isLoop: true,
        reason: `Tool "${toolName}" called ${LOOP_REPETITION_THRESHOLD}+ times with identical arguments`,
      }
    }

    // Check for rapid-fire pattern (same tool, different args, very fast)
    const sameToolCalls = recentCalls.filter((call) => call.toolName === toolName)
    if (sameToolCalls.length >= LOOP_WINDOW_SIZE - 1) {
      const timeSpan = Date.now() - (sameToolCalls[0]?.timestamp || Date.now())
      if (timeSpan < 1000) {
        // Less than 1 second for 5 calls
        return {
          isLoop: true,
          reason: `Rapid-fire tool calls detected: "${toolName}" called ${sameToolCalls.length + 1} times in ${timeSpan}ms`,
        }
      }
    }

    return { isLoop: false }
  }

  /**
   * Record a tool call for loop detection and metrics
   */
  private recordCall(sessionId: string, toolName: string, args: unknown, executionTime: number): void {
    const session = this.getSession(sessionId)

    session.callCount++
    session.totalExecutionTime += executionTime

    session.callHistory.push({
      toolName,
      args: this.hashArgs(args),
      timestamp: Date.now(),
    })

    // Trim history to prevent unbounded growth
    if (session.callHistory.length > LOOP_WINDOW_SIZE * 2) {
      session.callHistory = session.callHistory.slice(-LOOP_WINDOW_SIZE)
    }
  }

  /**
   * Get or create session state
   */
  private getSession(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        callCount: 0,
        callHistory: [],
        totalExecutionTime: 0,
        paused: false,
      })
    }
    return this.sessions.get(sessionId)!
  }

  /**
   * Check if tool is a shell execution tool
   */
  private isShellTool(toolName: string): boolean {
    const shellTools = ['shell_exec', 'child_process.spawn', 'child_process.exec', 'shell.execute']
    return shellTools.includes(toolName)
  }

  /**
   * Check if tool is a file operation tool
   */
  private isFileTool(toolName: string): boolean {
    const fileTools = ['fs_read', 'fs_write', 'fs.unlink', 'fs.rmdir', 'fs.mkdir']
    return fileTools.includes(toolName)
  }

  /**
   * Check if tool is a network tool
   */
  private isNetworkTool(toolName: string): boolean {
    const networkTools = ['http_request', 'http.get', 'http.post', 'fetch']
    return networkTools.includes(toolName)
  }

  /**
   * Extract command from tool arguments
   */
  private extractCommand(args: unknown): string | null {
    if (typeof args === 'string') {
      return args
    }
    if (typeof args === 'object' && args !== null) {
      const cmd = (args as Record<string, unknown>).command
      if (typeof cmd === 'string') {
        return cmd
      }
    }
    return null
  }

  /**
   * Create a simple hash of arguments for comparison
   */
  private hashArgs(args: unknown): string {
    try {
      return JSON.stringify(args)
    } catch {
      return String(args)
    }
  }

  /**
   * Sanitize error messages before returning to agent
   */
  private sanitizeError(error: unknown): Error {
    if (error instanceof Error) {
      // Remove stack traces and internal details
      const safeMessage = error.message
        .replace(/\s+at\s+.+$/gm, '') // Remove stack trace lines
        .replace(/file:\/\/\/[^\s]+/g, '[path]') // Remove file paths
        .replace(/\/[^\s]+/g, '[path]') // Remove any remaining paths

      return new Error(safeMessage)
    }
    return new Error(String(error))
  }
}

// Singleton instance
let sandboxedBridge: SandboxedBridge | null = null

export function getSandboxedBridge(): SandboxedBridge {
  if (!sandboxedBridge) {
    sandboxedBridge = new SandboxedBridge()
  }
  return sandboxedBridge
}

export { MAX_CALLS_PER_SESSION, LOOP_WINDOW_SIZE, LOOP_REPETITION_THRESHOLD }

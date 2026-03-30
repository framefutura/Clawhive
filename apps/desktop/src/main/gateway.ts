import { spawn, ChildProcess, execFile } from 'node:child_process'
import { EventEmitter } from 'node:events'
import WebSocket from 'ws'
import { detectOllama, type OllamaStatus } from './ollama-detector.js'

const GATEWAY_DEFAULT_PORT = 18792
const GATEWAY_START_TIMEOUT = 15000
const CLI_CHECK_TIMEOUT = 5000

// Paperclip-inspired WebSocket protocol frame types
export interface GatewayRequestFrame {
  type: 'req'
  id: string
  action: string
  payload?: unknown
}

export interface GatewayResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: string
}

export interface GatewayEventFrame {
  type: 'event'
  seq: number
  event: string
  data?: unknown
}

export type GatewayFrame = GatewayRequestFrame | GatewayResponseFrame | GatewayEventFrame

export interface GatewayConfig {
  port?: number
  authToken?: string
}

export interface GatewayEvent {
  type: 'connected' | 'disconnected' | 'message' | 'error' | 'ollama-detected' | 'cli-missing'
  data?: unknown
}

export interface CLICheckResult {
  available: boolean
  version?: string
}

export interface GatewayState {
  ollamaDetected: boolean
  ollamaModels: string[]
  cliAvailable: boolean
  cliVersion?: string
}

/**
 * GatewayManager - Manages OpenClaw Gateway child process
 *
 * Implements Paperclip's OpenClaw Gateway adapter pattern:
 * - WebSocket protocol with three frame types (req/res/event)
 * - Session strategies: issue, fixed, run
 * - Heartbeat-based execution model
 */
export class GatewayManager extends EventEmitter {
  private process: ChildProcess | null = null
  private ws: WebSocket | null = null
  private port: number
  private authToken: string
  private reconnectTimer: NodeJS.Timeout | null = null
  private requestId = 0
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>()

  // State tracking for Ollama and CLI
  ollamaDetected = false
  ollamaModels: string[] = []
  cliAvailable = false
  cliVersion?: string

  constructor(config: GatewayConfig = {}) {
    super()
    this.port = config.port ?? GATEWAY_DEFAULT_PORT
    this.authToken = config.authToken ?? ''
  }

  /**
   * Check if OpenClaw CLI is available via npx
   */
  async checkOpenClawCLI(): Promise<CLICheckResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ available: false })
      }, CLI_CHECK_TIMEOUT)

      execFile('npx', ['openclaw', '--version'], { timeout: CLI_CHECK_TIMEOUT }, (err, stdout) => {
        clearTimeout(timeout)
        if (err) {
          resolve({ available: false })
        } else {
          const version = stdout.trim()
          resolve({ available: true, version })
        }
      })
    })
  }

  /**
   * Get platform-specific install instructions for OpenClaw CLI
   */
  getInstallInstructions(): string {
    const platform = process.platform
    const baseInstructions = `OpenClaw CLI not found. Please install it:

npm install -g openclaw

Or ensure npx is available in your PATH.

For more information, visit: https://github.com/openclaw/openclaw#installation`

    if (platform === 'darwin') {
      return `OpenClaw CLI not found. Please install it:

npm install -g openclaw

Or via Homebrew (if available):
brew install openclaw

Or ensure npx is available in your PATH.

For more information, visit: https://github.com/openclaw/openclaw#installation`
    }

    return baseInstructions
  }

  async start(): Promise<void> {
    // Check CLI availability first
    const cliCheck = await this.checkOpenClawCLI()
    if (!cliCheck.available) {
      const error = new Error(this.getInstallInstructions())
      this.emit('event', { type: 'cli-missing', data: { message: error.message } } satisfies GatewayEvent)
      throw error
    }
    this.cliAvailable = true
    this.cliVersion = cliCheck.version

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Gateway failed to start within ${GATEWAY_START_TIMEOUT}ms`))
      }, GATEWAY_START_TIMEOUT)

      // Spawn gateway as child process
      this.process = spawn('npx', ['openclaw', 'gateway', '--port', String(this.port)], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          OPENCLAW_TOKEN: this.authToken,
        },
      })

      this.process.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString()
        console.log('[Gateway]', msg)
        if (msg.includes('listening') || msg.includes('Gateway running')) {
          clearTimeout(timeout)
          this.connectWebSocket().then(resolve).catch(reject)
        }
      })

      this.process.stdout?.on('data', (data: Buffer) => {
        console.log('[Gateway stdout]', data.toString())
      })
    }).then(async () => {
      // After gateway starts, detect Ollama
      await this.detectOllama()
    })
  }

  /**
   * Detect Ollama and update state
   */
  private async detectOllama(): Promise<void> {
    try {
      const status = await detectOllama()
      this.ollamaDetected = status.available
      this.ollamaModels = status.models ?? []

      if (status.available) {
        this.emit('event', {
          type: 'ollama-detected',
          data: { models: status.models, baseUrl: status.baseUrl }
        } satisfies GatewayEvent)
      }
    } catch {
      // Silently fail - Ollama detection is optional
      this.ollamaDetected = false
      this.ollamaModels = []
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'))
      }, 5000)

      this.ws = new WebSocket(`ws://localhost:${this.port}`)

      this.ws.on('open', () => {
        clearTimeout(timeout)
        // Send connect request (Paperclip protocol v3)
        this.sendFrame({
          type: 'req',
          id: this.nextRequestId(),
          action: 'connect',
          payload: { authToken: this.authToken },
        })
        this.emit('event', { type: 'connected' } satisfies GatewayEvent)
        resolve()
      })

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const frame = JSON.parse(data.toString()) as GatewayFrame
          this.handleFrame(frame)
        } catch {
          // ignore parse errors
        }
      })

      this.ws.on('close', () => {
        this.emit('event', { type: 'disconnected' } satisfies GatewayEvent)
      })

      this.ws.on('error', (err) => {
        clearTimeout(timeout)
        this.emit('event', { type: 'error', data: err.message } satisfies GatewayEvent)
        reject(err)
      })
    })
  }

  private handleFrame(frame: GatewayFrame): void {
    if (frame.type === 'res') {
      // Handle response
      const pending = this.pendingRequests.get(frame.id)
      if (pending) {
        this.pendingRequests.delete(frame.id)
        if (frame.ok) {
          pending.resolve(frame.payload)
        } else {
          pending.reject(new Error(frame.error || 'Unknown error'))
        }
      }
    } else if (frame.type === 'event') {
      // Handle async event
      this.emit('event', { type: 'message', data: frame } satisfies GatewayEvent)
    }
  }

  private nextRequestId(): string {
    return `req-${++this.requestId}`
  }

  private sendFrame(frame: GatewayFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame))
    }
  }

  /**
   * Send a request and wait for response
   * Paperclip-inspired request/response pattern
   */
  async request(action: string, payload?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextRequestId()
      this.pendingRequests.set(id, { resolve, reject })

      this.sendFrame({
        type: 'req',
        id,
        action,
        payload,
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${action}`))
        }
      }, 30000)
    })
  }

  /**
   * Send a fire-and-forget message
   */
  send(action: string, payload?: unknown): void {
    this.sendFrame({
      type: 'req',
      id: this.nextRequestId(),
      action,
      payload,
    })
  }

  /**
   * Execute a heartbeat-run (Paperclip-inspired single-agent execution)
   * This is the core execution model for DeskClaw's work cycle
   */
  async heartbeatRun(sessionId: string, message: string, genes?: string[]): Promise<void> {
    await this.request('agent:run', {
      sessionId,
      message,
      genes, // DeskClaw gene system integration
      strategy: 'run', // Paperclip session strategy: issue, fixed, run
    })
  }

  stop(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.process?.kill()
    this.process = null
    this.ws = null
    this.pendingRequests.clear()
  }
}

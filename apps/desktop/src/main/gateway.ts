import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import WebSocket from 'ws'

const GATEWAY_DEFAULT_PORT = 18792
const GATEWAY_START_TIMEOUT = 15000

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
  type: 'connected' | 'disconnected' | 'message' | 'error'
  data?: unknown
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

  constructor(config: GatewayConfig = {}) {
    super()
    this.port = config.port ?? GATEWAY_DEFAULT_PORT
    this.authToken = config.authToken ?? ''
  }

  async start(): Promise<void> {
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
    })
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

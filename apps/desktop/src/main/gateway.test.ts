import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GatewayManager, type GatewayConfig } from './gateway.js'
import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'

// Mock child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn(),
}))

// Mock ws - just mock the module without implementation
vi.mock('ws', () => ({
  default: vi.fn().mockImplementation(function() {
    const ws = new EventEmitter()
    Object.assign(ws, {
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
    })
    return ws
  }),
}))

// Mock ollama-detector
vi.mock('./ollama-detector.js', () => ({
  detectOllama: vi.fn().mockResolvedValue({ available: false }),
}))

import { spawn, execFile } from 'node:child_process'
import WebSocket from 'ws'

describe('GatewayManager', () => {
  let gateway: GatewayManager
  let mockProcess: EventEmitter & Partial<ChildProcess>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock process
    mockProcess = new EventEmitter() as EventEmitter & Partial<ChildProcess>
    mockProcess.stderr = { on: vi.fn() } as unknown as NodeJS.ReadableStream
    mockProcess.stdout = { on: vi.fn() } as unknown as NodeJS.ReadableStream
    mockProcess.kill = vi.fn()

    // Mock spawn to return mock process
    vi.mocked(spawn).mockReturnValue(mockProcess as ChildProcess)

    // Mock execFile for CLI check - default to success
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (err: Error | null, stdout?: string) => void
      callback(null, '1.0.0')
      return {} as ReturnType<typeof execFile>
    })

    gateway = new GatewayManager()
  })

  afterEach(() => {
    gateway.stop()
    vi.useRealTimers()
  })

  it('should initialize with default config', () => {
    const defaultGateway = new GatewayManager()
    expect(defaultGateway).toBeDefined()
    expect(defaultGateway['port']).toBe(18792)
  })

  it('should accept custom config', () => {
    const customGateway = new GatewayManager({ port: 9999, authToken: 'test-token' })
    expect(customGateway['port']).toBe(9999)
    expect(customGateway['authToken']).toBe('test-token')
  })

  it('should check CLI availability', async () => {
    const result = await gateway.checkOpenClawCLI()
    expect(result.available).toBe(true)
    expect(result.version).toBe('1.0.0')
    expect(execFile).toHaveBeenCalledWith(
      'npx',
      ['openclaw', '--version'],
      expect.any(Object),
      expect.any(Function)
    )
  })

  it('should fail fast if CLI is not available', async () => {
    // Mock CLI check to fail
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (err: Error | null) => void
      callback(new Error('Command not found'))
      return {} as ReturnType<typeof execFile>
    })

    await expect(gateway.start()).rejects.toThrow('OpenClaw CLI not found')
  })

  it('should emit cli-missing event when CLI is not available', async () => {
    const cliMissingHandler = vi.fn()
    gateway.on('event', cliMissingHandler)

    // Mock CLI check to fail
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (err: Error | null) => void
      callback(new Error('Command not found'))
      return {} as ReturnType<typeof execFile>
    })

    try {
      await gateway.start()
    } catch {
      // Expected to throw
    }

    expect(cliMissingHandler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'cli-missing' })
    )
  })

  it('should track CLI state when available', async () => {
    // Don't actually start, just verify the check works
    const result = await gateway.checkOpenClawCLI()
    expect(result.available).toBe(true)
    expect(result.version).toBe('1.0.0')
  })

  it('should return platform-specific install instructions', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')

    // Test macOS
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    const macInstructions = gateway.getInstallInstructions()
    expect(macInstructions).toContain('brew install openclaw')
    expect(macInstructions).toContain('npm install -g openclaw')

    // Test Windows
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    const winInstructions = gateway.getInstallInstructions()
    expect(winInstructions).toContain('npm install -g openclaw')
    expect(winInstructions).not.toContain('brew install')

    // Restore original
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform)
    }
  })

  it('should have request method for action/payload pattern', () => {
    expect(typeof gateway.request).toBe('function')
  })

  it('should have send method for fire-and-forget', () => {
    expect(typeof gateway.send).toBe('function')
  })

  it('should have heartbeatRun method for agent execution', () => {
    expect(typeof gateway.heartbeatRun).toBe('function')
  })

  it('should cleanup on stop()', () => {
    gateway.stop()
    expect(mockProcess.kill).not.toHaveBeenCalled() // No process started
  })

  it('should track Ollama detection state', async () => {
    // Initial state
    expect(gateway.ollamaDetected).toBe(false)
    expect(gateway.ollamaModels).toEqual([])

    // Simulate setting state (as would happen after detection)
    gateway.ollamaDetected = true
    gateway.ollamaModels = ['llama3.2', 'mistral']

    expect(gateway.ollamaDetected).toBe(true)
    expect(gateway.ollamaModels).toEqual(['llama3.2', 'mistral'])
  })

  it('should track CLI availability state', async () => {
    // Initial state
    expect(gateway.cliAvailable).toBe(false)

    // Mock successful check
    const result = await gateway.checkOpenClawCLI()
    expect(result.available).toBe(true)
  })

  it('should have correct initial state for GatewayManager', () => {
    expect(gateway.ollamaDetected).toBe(false)
    expect(gateway.ollamaModels).toEqual([])
    expect(gateway.cliAvailable).toBe(false)
    expect(gateway.cliVersion).toBeUndefined()
  })
})

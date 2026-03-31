import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SecurityManager, getSecurityManager } from './security-manager.js'
import { getRoleProfile } from '../common/security.js'

describe('SecurityManager', () => {
  let securityManager: SecurityManager

  beforeEach(() => {
    securityManager = new SecurityManager()
  })

  describe('evaluateAction - SEC-02 (high security)', () => {
    it('high security action with matrix allow still triggers requiresApproval: true', () => {
      const role = getRoleProfile('Individual Agent')!
      const decision = securityManager.evaluateAction('high', role, {
        type: 'tool',
        tool: 'fs.read',
        operation: 'read',
        path: '~/.clawhive/workspaces/test.txt',
      })

      expect(decision.requiresApproval).toBe(true)
      expect(decision.approvalType).toBe('user')
    })

    it('high security level requires approval for all action types', () => {
      const role = getRoleProfile('CEO Agent')!

      const toolDecision = securityManager.evaluateAction('high', role, {
        type: 'tool',
        tool: 'http.request',
      })
      expect(toolDecision.requiresApproval).toBe(true)

      const fileDecision = securityManager.evaluateAction('high', role, {
        type: 'file',
        operation: 'read',
        path: '~/.clawhive/workspaces/test.txt',
      })
      expect(fileDecision.requiresApproval).toBe(true)

      const networkDecision = securityManager.evaluateAction('high', role, {
        type: 'network',
        host: 'example.com',
      })
      expect(networkDecision.requiresApproval).toBe(true)
    })
  })

  describe('evaluateAction - SEC-03 (medium security)', () => {
    it('medium security non-sensitive action returns requiresApproval: false', () => {
      const role = getRoleProfile('Individual Agent')!
      // fs.read is not in SENSITIVE_TOOLS and is non-sensitive
      const decision = securityManager.evaluateAction('medium', role, {
        type: 'tool',
        tool: 'fs.read',
        operation: 'read',
        path: '~/.clawhive/workspaces/test.txt',
      })

      expect(decision.requiresApproval).toBe(false)
      expect(decision.allowed).toBe(true)
    })

    it('medium security sensitive action returns requiresApproval: true', () => {
      const role = getRoleProfile('CEO Agent')!
      // CEO Agent allows all hosts and has child_process.spawn as 'prompt'
      const decision = securityManager.evaluateAction('medium', role, {
        type: 'tool',
        tool: 'child_process.spawn',
      })

      expect(decision.requiresApproval).toBe(true)
    })

    it('medium security allows fs.read without approval (non-sensitive)', () => {
      const role = getRoleProfile('Individual Agent')!
      const decision = securityManager.evaluateAction('medium', role, {
        type: 'tool',
        tool: 'fs.read',
      })

      expect(decision.requiresApproval).toBe(false)
      expect(decision.allowed).toBe(true)
    })

    it('medium security denies tool in matrix deny list regardless of sensitivity', () => {
      const role = getRoleProfile('Individual Agent')!
      // fs.unlink is denied by Individual Agent matrix
      const decision = securityManager.evaluateAction('medium', role, {
        type: 'tool',
        tool: 'fs.unlink',
        operation: 'delete',
        path: '~/.clawhive/workspaces/test.txt',
      })

      expect(decision.allowed).toBe(false)
      expect(decision.requiresApproval).toBe(false)
    })
  })

  describe('requestApproval and resolveApproval', () => {
    it('resolveApproval with false denies the pending action', async () => {
      let resolvedValue: boolean | null = null

      securityManager.setApprovalEmitter(() => {
        // No-op emitter - we'll manually call resolveApproval
      })

      const approvalPromise = securityManager.requestApproval({
        id: 'test-approval-1',
        action: { type: 'tool', tool: 'shell.exec' },
        reason: 'Shell execution requires approval',
        timestamp: Date.now(),
      })

      // Deny the approval
      securityManager.resolveApproval('test-approval-1', false)

      resolvedValue = await approvalPromise
      expect(resolvedValue).toBe(false)
    })

    it('resolveApproval with true completes the pending action', async () => {
      securityManager.setApprovalEmitter(() => {
        // No-op emitter
      })

      const approvalPromise = securityManager.requestApproval({
        id: 'test-approval-2',
        action: { type: 'tool', tool: 'fs.write' },
        reason: 'File write requires approval',
        timestamp: Date.now(),
      })

      // Approve the action
      securityManager.resolveApproval('test-approval-2', true)

      const resolvedValue = await approvalPromise
      expect(resolvedValue).toBe(true)
    })

    it('only the correct approvalId resolves the promise', async () => {
      securityManager.setApprovalEmitter(() => {})

      const promise1 = securityManager.requestApproval({
        id: 'approval-A',
        action: { type: 'tool', tool: 'tool-a' },
        reason: 'Tool A',
        timestamp: Date.now(),
      })

      const promise2 = securityManager.requestApproval({
        id: 'approval-B',
        action: { type: 'tool', tool: 'tool-b' },
        reason: 'Tool B',
        timestamp: Date.now(),
      })

      // Resolve only approval-B
      securityManager.resolveApproval('approval-B', true)

      // approval-B should resolve, approval-A should still be pending
      const [resultB] = await Promise.all([
        promise2,
        new Promise(resolve => setTimeout(resolve, 50)).then(() => false),
      ])
      expect(resultB).toBe(true)
    })
  })

  describe('getActivityLog', () => {
    it('records evaluated actions in activity log', () => {
      const role = getRoleProfile('Individual Agent')!
      securityManager.evaluateAction('medium', role, {
        type: 'tool',
        tool: 'http.request',
      })

      const log = securityManager.getActivityLog()
      expect(log.length).toBeGreaterThan(0)
    })
  })
})

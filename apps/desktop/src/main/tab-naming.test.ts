import { describe, it, expect } from 'vitest'
import { autoNameTab } from './tab-naming.js'

describe('autoNameTab', () => {
  it('should return "New Chat" for chat tab with no context', () => {
    expect(autoNameTab('chat')).toBe('New Chat')
    expect(autoNameTab('chat', {})).toBe('New Chat')
  })

  it('should return the first message preview for chat tabs', () => {
    expect(autoNameTab('chat', { firstMessage: 'Hello world' })).toBe('Hello world')
    expect(autoNameTab('chat', { firstMessage: 'A'.repeat(30) })).toBe('A'.repeat(22) + '\u2026')
  })

  it('should return "New Tab" for browser tab with no title', () => {
    expect(autoNameTab('browser')).toBe('New Tab')
    expect(autoNameTab('browser', {})).toBe('New Tab')
  })

  it('should return page title for browser tabs', () => {
    expect(autoNameTab('browser', { pageTitle: 'Google' })).toBe('Google')
    expect(autoNameTab('browser', { pageTitle: '  Spaces  ' })).toBe('Spaces')
  })

  it('should return "Untitled" for file tab with no path', () => {
    expect(autoNameTab('file')).toBe('Untitled')
    expect(autoNameTab('file', {})).toBe('Untitled')
  })

  it('should return basename for file tabs', () => {
    expect(autoNameTab('file', { path: '/home/user/documents/report.pdf' })).toBe('report.pdf')
    expect(autoNameTab('file', { path: 'readme.md' })).toBe('readme.md')
  })

  it('should return "Workspace" for workspace tabs with no task name', () => {
    expect(autoNameTab('workspace')).toBe('Workspace')
    expect(autoNameTab('workspace', {})).toBe('Workspace')
  })

  it('should return task name for workspace tabs', () => {
    expect(autoNameTab('workspace', { taskName: 'My Task' })).toBe('My Task')
  })

  it('should always return "Settings" for settings tabs', () => {
    expect(autoNameTab('settings')).toBe('Settings')
    expect(autoNameTab('settings', { taskName: 'ignored' })).toBe('Settings')
  })

  it('should return "Untitled" for unknown types', () => {
    // @ts-expect-error Testing unknown type
    expect(autoNameTab('unknown')).toBe('Untitled')
  })

  it('should handle edge cases with empty strings', () => {
    expect(autoNameTab('chat', { firstMessage: '' })).toBe('New Chat')
    expect(autoNameTab('chat', { firstMessage: '   ' })).toBe('New Chat')
    expect(autoNameTab('browser', { pageTitle: '' })).toBe('New Tab')
  })
})

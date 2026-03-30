import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.clawhive for renderer tests
Object.defineProperty(window, 'clawhive', {
  value: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onGatewayEvent: vi.fn(() => () => {}),
    getSessions: vi.fn(),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
    getGenes: vi.fn(),
    getGeneCategories: vi.fn(),
  },
  writable: true,
})

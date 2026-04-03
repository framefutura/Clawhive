import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const rootDir = resolve(__dirname, '..')

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [resolve(rootDir, 'src/renderer/**/*.test.ts'), resolve(rootDir, 'src/renderer/**/*.test.tsx'), resolve(rootDir, 'src/common/**/*.test.ts')],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
})

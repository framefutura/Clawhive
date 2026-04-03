import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

const rootDir = resolve(__dirname, '..')

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [resolve(rootDir, 'src/main/**/*.test.ts'), resolve(rootDir, 'src/main/**/*.spec.ts'), resolve(rootDir, 'src/test/**/*.test.ts'), resolve(rootDir, 'src/common/**/*.test.ts')],
    exclude: [resolve(rootDir, 'src/renderer/**/*')],
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

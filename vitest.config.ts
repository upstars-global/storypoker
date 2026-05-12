import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['app/**/__tests__/**/*.spec.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['**/*.d.ts', '**/.nuxt/**', '**/.output/**'],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app'),
    },
  },
})

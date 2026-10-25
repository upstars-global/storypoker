import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx', 'tests/components/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './test-results/coverage',
      exclude: ['**/*.d.ts', '**/.nuxt/**', '**/.output/**'],
    },
  },
  resolve: {
    alias: {
      '~': resolve(rootDir, 'app'),
      '@': resolve(rootDir, 'app'),
      'virtual:pwa-register': resolve(rootDir, 'tests/support/stubs/pwaRegister.ts'),
    },
  },
})

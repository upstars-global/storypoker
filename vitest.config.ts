import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx', 'tests/components/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      'tests/unit/composables/useCountdown.spec.ts',
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
      '~': resolve(__dirname, 'app'),
      '@': resolve(__dirname, 'app'),
      'virtual:pwa-register': resolve(__dirname, 'tests/support/stubs/pwaRegister.ts'),
    },
  },
})

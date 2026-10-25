import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.spec.ts', 'tests/components/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      'tests/unit/stores/**',
      'tests/unit/composables/useCountdown.spec.ts',
      'tests/unit/composables/useDylanAvatar.spec.ts',
      'tests/unit/composables/useMenuKeyboard.spec.ts',
      'tests/unit/composables/useSoundVolume.spec.ts',
      'tests/unit/composables/useTheme.spec.ts',
      'tests/unit/utils/useClickOutside.spec.ts',
      'tests/unit/i18n.spec.ts',
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

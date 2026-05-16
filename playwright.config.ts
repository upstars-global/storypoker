import { defineConfig, devices } from '@playwright/test'
import { config as loadDotenv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __cfgDir = dirname(fileURLToPath(import.meta.url))

if (!process.env.CI) {
  loadDotenv({ path: resolve(__cfgDir, '.env/.env.test') })
}

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: resolve(__cfgDir, 'test-results/playwright'),
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['github'],
        ['html', { open: 'never', outputFolder: resolve(__cfgDir, 'playwright-report') }],
      ]
    : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    {
      name: 'webkit',
      use: devices['Desktop Safari'],
      testIgnore: ['**/critical-flows.spec.ts'],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview',
        cwd: __cfgDir,
        url: 'http://localhost:3000',
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
        env: {
          SUPABASE_URL: process.env.SUPABASE_URL!,
          SUPABASE_KEY: process.env.SUPABASE_KEY!,
          SUPABASE_TEST_SERVICE_ROLE_KEY: '',
          SUPABASE_SECRET_KEY: '',
          E2E_SUPABASE_SERVICE_ROLE_KEY: '',
          E2E_TEST_USER_EMAIL: '',
          E2E_TEST_USER_PASSWORD: '',
        },
      },
})

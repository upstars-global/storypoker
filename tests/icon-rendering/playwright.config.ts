import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

const harnessDir = import.meta.dirname

export default defineConfig({
  testDir: harnessDir,
  outputDir: resolve(harnessDir, '../../test-results/playwright-icon-harness'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4181',
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'allow',
    trace: 'off',
  },
  projects: [{ name: 'icon-harness', use: devices['Desktop Chrome'] }],
  webServer: {
    command: 'npm run icons:harness:build && npm run icons:harness:preview',
    url: 'http://localhost:4181',
    timeout: 180_000,
    reuseExistingServer: false,
  },
})

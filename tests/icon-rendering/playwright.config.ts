import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
import { VIEWPORT } from './selectors.ts'

const harnessDir = import.meta.dirname
const port = 4181

export default defineConfig({
  testDir: harnessDir,
  outputDir: resolve(harnessDir, '../../test-results/playwright-icon-harness'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: VIEWPORT,
    serviceWorkers: 'allow',
    trace: 'off',
  },
  projects: [{ name: 'icon-harness', use: { ...devices['Desktop Chrome'], viewport: VIEWPORT } }],
  webServer: {
    command: 'npm run icons:harness:build && npm run icons:harness:preview',
    url: `http://localhost:${port}`,
    timeout: 180_000,
    reuseExistingServer: false,
  },
})

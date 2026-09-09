import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'
import { VIEWPORT } from './selectors.ts'

const harnessDir = import.meta.dirname

export default defineConfig({
  testDir: harnessDir,
  testMatch: 'interleaved.spec.ts',
  outputDir: resolve(harnessDir, '../../test-results/playwright-icon-measure'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: 'list',
  use: {
    viewport: VIEWPORT,
    serviceWorkers: 'allow',
    trace: 'off',
  },
  projects: [{ name: 'icon-measure', use: { ...devices['Desktop Chrome'], viewport: VIEWPORT } }],
  webServer: [
    {
      command: 'npm run icons:harness:preview',
      url: 'http://localhost:4181',
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run icons:harness:preview:b',
      url: 'http://localhost:4182',
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
})

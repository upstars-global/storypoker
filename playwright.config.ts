import { defineConfig, devices, type Project } from '@playwright/test'
import { config as loadDotenv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { VISUAL_SUPABASE_KEY, VISUAL_SUPABASE_URL } from './tests/visual/support/fakeSupabase'

const __cfgDir = dirname(fileURLToPath(import.meta.url))
const previewBlockedEnv = Object.fromEntries([
  'SUPABASE_TEST_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'E2E_SUPABASE_SERVICE_ROLE_KEY',
  'E2E_TEST_USER_EMAIL',
  'E2E_TEST_USER_PASSWORD',
].map(key => [key, '']))

if (!process.env.CI) {
  loadDotenv({ path: resolve(__cfgDir, '.env/.env.test'), override: true })
}

const VISUAL_PORT = 4174
const VISUAL_DIST = 'test-results/visual-dist'

function selectedProjects(argv: string[]): string[] {
  return argv.flatMap((arg, index) => {
    if (arg.startsWith('--project=')) return [arg.slice('--project='.length)]
    if (arg !== '--project') return []
    const rest = argv.slice(index + 1)
    const end = rest.findIndex(next => next.startsWith('-'))
    return end < 0 ? rest : rest.slice(0, end)
  })
}

const VISUAL_SELECTED_ENV = 'STORYPOKER_VISUAL_SELECTED'
const projectFilter = selectedProjects(process.argv)
const visualSelected = process.env[VISUAL_SELECTED_ENV] === '1' || projectFilter.includes('visual')
const appSelected = projectFilter.length === 0 || projectFilter.some(project => project !== 'visual')
if (visualSelected) process.env[VISUAL_SELECTED_ENV] = '1'

const appServer = {
  command: 'pnpm run build && pnpm run preview',
  cwd: __cfgDir,
  url: 'http://localhost:4173',
  timeout: 180_000,
  reuseExistingServer: !process.env.CI,
  env: {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    VITE_SUPABASE_KEY: process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || '',
    ...previewBlockedEnv,
  },
}

const visualServer = {
  command: `pnpm exec vite build --outDir ${VISUAL_DIST} --emptyOutDir && pnpm exec vite preview --outDir ${VISUAL_DIST} --port ${VISUAL_PORT} --strictPort`,
  cwd: __cfgDir,
  url: `http://localhost:${VISUAL_PORT}`,
  timeout: 180_000,
  reuseExistingServer: !process.env.CI,
  env: {
    VITE_SUPABASE_URL: VISUAL_SUPABASE_URL,
    VITE_SUPABASE_KEY: VISUAL_SUPABASE_KEY,
    ...previewBlockedEnv,
  },
}

const visualProject: Project = {
  name: 'visual',
  testDir: resolve(__cfgDir, 'tests/visual'),
  testMatch: ['**/*.spec.ts'],
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${VISUAL_PORT}`,
    serviceWorkers: 'block',
    locale: 'uk-UA',
    timezoneId: 'UTC',
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
  },
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
        ['html', { open: 'never', outputFolder: resolve(__cfgDir, 'test-results/playwright-report') }],
      ]
    : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'page-load',
      use: devices['Desktop Chrome'],
      testMatch: ['**/page-load.spec.ts'],
    },
    {
      name: 'icon-delivery',
      use: devices['Desktop Chrome'],
      testMatch: ['**/icon-delivery.spec.ts'],
    },
    {
      name: 'chromium',
      use: devices['Desktop Chrome'],
      testIgnore: ['**/page-load.spec.ts', '**/icon-delivery.spec.ts'],
    },
    {
      name: 'webkit',
      use: devices['Desktop Safari'],
      testIgnore: ['**/critical-flows.spec.ts', '**/page-load.spec.ts', '**/icon-delivery.spec.ts'],
    },
    ...(visualSelected ? [visualProject] : []),
  ],
  webServer: [
    ...(appSelected && !process.env.E2E_BASE_URL ? [appServer] : []),
    ...(visualSelected ? [visualServer] : []),
  ],
})

import { test as base } from '@playwright/test'

export type ConsoleFixtures = {
  consoleErrors: string[]
}

export const test = base.extend<ConsoleFixtures>({
  consoleErrors: [
    async ({ page }, use, testInfo) => {
      const errors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text())
      })
      page.on('pageerror', (err) => {
        errors.push(err.message)
      })
      await use(errors)
      if (testInfo.status === 'passed' && errors.length) {
        throw new Error(`Browser console errors detected:\n- ${errors.join('\n- ')}`)
      }
    },
    { auto: true },
  ],
})

export const expect = test.expect

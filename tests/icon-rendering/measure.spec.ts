import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { iconSelector, variant } from './selectors'

const outDir = resolve(import.meta.dirname, '../../test-results/icon-rendering/runs')
const PAIRS = 5
const FLAGS = { iconsLucide: false, iconsRounded: true }

interface Run {
  variant: string
  cache: 'cold' | 'warm'
  role: string
  flags: string
  icons: number
  iconElements: number
  markupBytes: number
  transferBytes: number
  readyMs: number
  requests: string[]
}

async function measure(page: import('@playwright/test').Page, selector: string): Promise<Omit<Run, 'variant' | 'cache' | 'role' | 'flags' | 'requests'>> {
  return page.evaluate(sel => {
    const icons = [...document.querySelectorAll(sel)]
    const bytes = (value: string) => new TextEncoder().encode(value).length
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return {
      icons: icons.length,
      iconElements: icons.reduce((n, e) => n + 1 + e.querySelectorAll('*').length, 0),
      markupBytes: icons.reduce((n, e) => n + bytes(e.outerHTML), 0),
      transferBytes: performance.getEntriesByType('resource')
        .reduce((n, e) => n + (e as PerformanceResourceTiming).transferSize, 0) + (nav?.transferSize ?? 0),
      readyMs: performance.now(),
    }
  }, selector)
}

test('measures icons', async ({ browser }) => {
  const runs: Run[] = []

  for (let pair = 0; pair < PAIRS; pair += 1) {
    for (const cache of ['cold', 'warm'] as const) {
      const context = await browser.newContext()
      const page = await context.newPage()
      const requests: string[] = []
      page.on('request', request => {
        const url = new URL(request.url())
        if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') requests.push(url.origin)
      })
      await page.addInitScript(value => {
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(value))
      }, FLAGS)

      if (cache === 'warm') {
        await page.goto('/?role=guest&view=room')
        await page.getByTestId('icon-harness-ready').waitFor({ state: 'attached' })
      }

      await page.goto('/?role=guest&view=room')
      await page.getByTestId('icon-harness-ready').waitFor({ state: 'attached' })
      await page.evaluate(() => new Promise<void>(done => {
        requestAnimationFrame(() => requestAnimationFrame(() => done()))
      }))

      const metrics = await measure(page, iconSelector)
      runs.push({
        variant,
        cache,
        role: 'guest',
        flags: `${FLAGS.iconsLucide}/${FLAGS.iconsRounded}`,
        ...metrics,
        requests,
      })
      await context.close()
    }
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, `${variant}.json`), JSON.stringify(runs, null, 2) + '\n')
})

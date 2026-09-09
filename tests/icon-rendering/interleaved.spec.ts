import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { VIEWPORT } from './selectors'

const outDir = resolve(import.meta.dirname, '../../test-results/icon-rendering/runs')
const PAIRS = 20
const FLAGS = { iconsLucide: false, iconsRounded: true }

const VARIANTS = [
  { variant: 'a', origin: 'http://localhost:4181', selector: 'svg.iconify' },
  { variant: 'b', origin: 'http://localhost:4182', selector: 'span.sp-icon' },
]

interface Run {
  variant: string
  cache: 'cold' | 'warm'
  pair: number
  role: string
  flags: string
  icons: number
  iconElements: number
  markupBytes: number
  transferBytes: number
  readyMs: number
  serviceWorkerControlled: boolean
  requests: string[]
}

test('measures both variants interleaved', async ({ browser }) => {
  const runs: Run[] = []

  for (let pair = 0; pair < PAIRS; pair += 1) {
    for (const cache of ['cold', 'warm'] as const) {
      const order = pair % 2 === 0 ? VARIANTS : [...VARIANTS].reverse()
      for (const target of order) {
        const context = await browser.newContext({ viewport: VIEWPORT })
        const page = await context.newPage()
        const requests: string[] = []
        page.on('request', request => {
          const url = new URL(request.url())
          if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') requests.push(url.origin)
        })
        await page.addInitScript(value => {
          localStorage.setItem('FEATURE_FLAGS', JSON.stringify(value))
        }, FLAGS)

        const url = `${target.origin}/?role=guest&view=room`
        if (cache === 'warm') {
          await page.goto(url)
          await page.getByTestId('icon-harness-ready').waitFor({ state: 'attached' })
          await page.evaluate(async () => { await navigator.serviceWorker.ready })
        }

        await page.goto(url)
        await page.getByTestId('icon-harness-ready').waitFor({ state: 'attached' })
        await page.evaluate(() => new Promise<void>(done => {
          requestAnimationFrame(() => requestAnimationFrame(() => done()))
        }))

        const metrics = await page.evaluate(sel => {
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
            serviceWorkerControlled: navigator.serviceWorker.controller !== null,
          }
        }, target.selector)

        runs.push({
          variant: target.variant,
          cache,
          pair,
          role: 'guest',
          flags: `${FLAGS.iconsLucide}/${FLAGS.iconsRounded}`,
          ...metrics,
          requests,
        })
        await context.close()
      }
    }
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'interleaved.json'), JSON.stringify(runs, null, 2) + '\n')
})

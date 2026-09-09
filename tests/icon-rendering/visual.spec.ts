import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

import { iconSelector, isMaskVariant, variant } from './selectors'

const shotDir = resolve(import.meta.dirname, `../../test-results/icon-rendering/${variant}`)
const THEMES = ['light', 'dark'] as const
const PALETTES = ['classic', 'cyberdeck', 'matcha'] as const
const FLAG_CASES = [
  { iconsLucide: false, iconsRounded: false },
  { iconsLucide: false, iconsRounded: true },
  { iconsLucide: true, iconsRounded: false },
  { iconsLucide: true, iconsRounded: true },
]

test.beforeAll(() => {
  mkdirSync(shotDir, { recursive: true })
})

for (const theme of THEMES) {
  for (const palette of PALETTES) {
    for (const flags of FLAG_CASES) {
      const flagLabel = `${Number(flags.iconsLucide)}${Number(flags.iconsRounded)}`

      for (const view of ['room', 'catalog'] as const) {
        test(`screenshot ${view} ${theme} ${palette} ${flagLabel}`, async ({ page }) => {
          await page.addInitScript(state => {
            localStorage.setItem('sp-theme', state.theme)
            localStorage.setItem('sp-palette', state.palette)
            localStorage.setItem('FEATURE_FLAGS', JSON.stringify(state.flags))
          }, { theme, palette, flags })
          await page.clock.install({ time: new Date('2026-09-09T09:05:00.000Z') })
          await page.goto(`/?role=guest&view=${view}`)
          await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
          await page.evaluate(() => document.fonts.ready)
          await page.clock.pauseAt(new Date('2026-09-09T09:05:10.000Z'))
          await page.screenshot({
            path: `${shotDir}/guest-${theme}-${palette}-${flagLabel}-${view}.png`,
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
          })
        })
      }
    }
  }
}

test('icons carry real geometry and stay decorative', async ({ page }) => {
  await page.goto('/?view=catalog')
  await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
  const sizes = await page.locator(`[data-icon-name] ${iconSelector}`).evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      children: node.childElementCount,
      ariaHidden: node.getAttribute('aria-hidden'),
      masked: getComputedStyle(node).maskImage !== 'none'
        || getComputedStyle(node).backgroundImage !== 'none',
    }
  }))
  expect(sizes.length).toBeGreaterThan(0)
  for (const size of sizes) {
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
    if (isMaskVariant) expect(size.masked).toBe(true)
    else expect(size.children).toBeGreaterThan(0)
    expect(size.ariaHidden).toBe('true')
  }
})

for (const role of ['player', 'moderator', 'authorized-moderator'] as const) {
  test(`role controls render local icons: ${role}`, async ({ page }) => {
    const attempts: string[] = []
    await page.route(/https:\/\/api\.(iconify\.design|simplesvg\.com|unisvg\.com)\//, async route => {
      attempts.push(route.request().url())
      await route.abort()
    })
    await page.goto(`/?role=${role}&view=room`)
    await expect(page.getByTestId('icon-harness-ready')).toBeAttached()

    const timerIcons = await page.locator(`[data-testid=side-column] ${iconSelector}`).count()
    const cardsIcons = await page.locator(`[data-testid=cards-column] ${iconSelector}`).count()
    if (role === 'player') {
      expect(timerIcons).toBe(18)
      expect(cardsIcons).toBe(0)
    } else {
      expect(timerIcons).toBe(36)
      expect(cardsIcons).toBe(5)
    }

    const broken = await page.locator(iconSelector).evaluateAll((nodes, mask) => nodes
      .filter(node => {
        if (node.getBoundingClientRect().width === 0) return true
        if (mask) {
          const style = getComputedStyle(node)
          return style.maskImage === 'none' && style.backgroundImage === 'none'
        }
        return node.childElementCount === 0
      }).length, isMaskVariant)
    expect(broken).toBe(0)
    expect(attempts).toEqual([])

    await page.screenshot({
      path: `${shotDir}/${role}-dark-classic-01-room.png`,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
    })
  })
}

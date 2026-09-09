import { expect, test } from '@playwright/test'
import { iconSelector, isMaskVariant } from './selectors'

test('renders the room fixture without a backend', async ({ page }) => {
  const remote: string[] = []
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      remote.push(url.origin)
      await route.abort()
      return
    }
    await route.continue()
  })
  await page.goto('/?role=guest&view=room')
  await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
  await expect(page.getByTestId('players-list')).toContainText('0 / 15')
  await expect(page.locator('dialog .mui-modal-paper')).toBeAttached()
  expect(remote).toEqual([])
})

const ICONIFY_HOSTS = /https:\/\/api\.(iconify\.design|simplesvg\.com|unisvg\.com)\//
const FLAG_CASES = [
  { iconsLucide: false, iconsRounded: false },
  { iconsLucide: false, iconsRounded: true },
  { iconsLucide: true, iconsRounded: false },
  { iconsLucide: true, iconsRounded: true },
]

for (const flags of FLAG_CASES) {
  const label = `${flags.iconsLucide}/${flags.iconsRounded}`

  test(`every catalog icon has local data: ${label}`, async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    const attempts: string[] = []
    await page.route(ICONIFY_HOSTS, async route => {
      attempts.push(route.request().url())
      await route.abort()
    })
    await page.addInitScript(value => {
      localStorage.setItem('FEATURE_FLAGS', JSON.stringify(value))
    }, flags)
    await page.goto('/?view=catalog')
    await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
    const containers = page.locator('[data-icon-name]')
    const total = await containers.count()
    expect(total).toBeGreaterThan(0)
    const empty = await page.locator('[data-icon-name]').evaluateAll((nodes, args) => nodes
      .filter(node => {
        const el = node.querySelector(args.selector)
        if (!el) return true
        if (args.mask) {
          const style = getComputedStyle(el)
          return style.maskImage === 'none' && style.backgroundImage === 'none'
        }
        return el.childElementCount === 0
      })
      .map(node => node.getAttribute('data-icon-name')), { selector: iconSelector, mask: isMaskVariant })
    expect(empty).toEqual([])
    expect(attempts).toEqual([])
    await context.close()
  })
}

test('keeps the icon catalog after an offline reload', async ({ page, context }) => {
  await page.goto('/?view=catalog')
  await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const count = await page.locator(`[data-icon-name] ${iconSelector}`).count()
  expect(count).toBeGreaterThan(0)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
  await expect(page.locator(`[data-icon-name] ${iconSelector}`)).toHaveCount(count)
})

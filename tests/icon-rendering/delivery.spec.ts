import { expect, test } from '@playwright/test'
import { VIEWPORT, iconLocator, iconSelector } from './selectors'

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
    const context = await browser.newContext({ viewport: VIEWPORT })
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
    const empty = await page.locator('[data-icon-name]').evaluateAll((nodes, selector) => nodes
      .filter(node => {
        const el = node.querySelector(selector)
        if (!el) return true
        if (el.classList.contains('sp-icon-inline')) return el.childElementCount === 0
        const style = getComputedStyle(el)
        return style.maskImage === 'none' && style.webkitMaskImage === 'none'
      })
      .map(node => node.getAttribute('data-icon-name')), iconSelector)
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

const ROOM_STATES = [
  {
    label: 'timer running',
    query: '?role=moderator&view=room',
    present: ['widget-toggle-slot'],
    absent: ['slot-machine', 'countdown-ticker'],
    icons: { present: ['ic:baseline-pause'], absent: ['ic:baseline-play-arrow'] },
  },
  {
    label: 'timer paused',
    query: '?role=moderator&view=room&paused=1',
    present: ['widget-toggle-slot'],
    absent: ['slot-machine', 'countdown-ticker'],
    icons: { present: ['ic:baseline-play-arrow'], absent: ['ic:baseline-pause'] },
  },
  {
    label: 'slot widget',
    query: '?role=moderator&view=room&widget=slot',
    present: ['slot-machine', 'widget-toggle-timer', 'slot-spin-button'],
    absent: ['widget-toggle-slot', 'countdown-ticker'],
    icons: { present: ['ic:baseline-timer'], absent: ['ic:baseline-pause'] },
  },
  {
    label: 'countdown running',
    query: '?role=moderator&view=room&countdown=3',
    present: ['countdown-ticker'],
    absent: ['slot-machine'],
    icons: { present: [], absent: [] },
  },
]

for (const state of ROOM_STATES) {
  test(`renders local icons in room state: ${state.label}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const page = await context.newPage()
    const attempts: string[] = []
    await page.route(ICONIFY_HOSTS, async route => {
      attempts.push(route.request().url())
      await route.abort()
    })
    await page.goto(state.query)
    await expect(page.getByTestId('icon-harness-ready')).toBeAttached()

    for (const testId of state.present) await expect(page.getByTestId(testId)).toBeVisible()
    for (const testId of state.absent) await expect(page.getByTestId(testId)).toHaveCount(0)
    for (const name of state.icons.present) {
      await expect(page.locator(iconLocator(name))).not.toHaveCount(0)
    }
    for (const name of state.icons.absent) {
      await expect(page.locator(iconLocator(name))).toHaveCount(0)
    }

    const empty = await page.locator(iconSelector).evaluateAll(nodes => nodes
      .filter(node => {
        if (node.classList.contains('sp-icon-inline')) return node.childElementCount === 0
        const style = getComputedStyle(node)
        return style.maskImage === 'none' && style.webkitMaskImage === 'none'
      })
      .length)
    expect(empty).toBe(0)
    expect(attempts).toEqual([])
    await context.close()
  })
}

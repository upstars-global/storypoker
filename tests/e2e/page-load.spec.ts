import { test, expect } from '../fixtures/console'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/ffc']

for (const route of PUBLIC_ROUTES) {
  test(`loads ${route} without console errors`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response, `no response for ${route}`).not.toBeNull()
    expect(response!.ok(), `${route} returned HTTP ${response!.status()}`).toBe(true)

    await expect(page.locator('#app')).not.toBeEmpty()
  })
}

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.keyboard.press('Tab')
  const skipLink = page.locator('a[href="#main"]')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
})

test('feature flag switch toggles from the keyboard', async ({ page }) => {
  await page.goto('/ffc', { waitUntil: 'domcontentloaded' })
  const checkbox = page.locator('#ffc-example')
  await expect(checkbox).not.toBeChecked()
  await page.locator('#ffc-iconsRounded').focus()
  await page.keyboard.press('Tab')
  await expect(checkbox).toBeFocused()
  await expect(checkbox).not.toHaveAccessibleName('')
  await page.keyboard.press('Space')
  await expect(checkbox).toBeChecked()
  await expect(page.locator('#ffc-example ~ .track')).toHaveCSS('outline-style', 'solid')
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('FEATURE_FLAGS') ?? '{}'))
  expect(stored.example).toBe(true)
})

test('volume slider is keyboard reachable and persists its value', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByTestId('volume-button')
  await expect(trigger).not.toHaveAccessibleName('')
  await trigger.click()
  const slider = page.getByTestId('volume-slider')
  await expect(slider).toBeVisible()
  await expect(slider).not.toHaveAccessibleName('')
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sp-volume'))).toBe('0.2')
})

test('stored theme and palette are on html at the first DOMContentLoaded', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sp-palette', 'cyberdeck')
    localStorage.setItem('sp-theme', 'light')
    const probe = window as unknown as Record<string, unknown>
    const snapshot = () => ({
      theme: document.documentElement.getAttribute('data-theme'),
      palette: document.documentElement.getAttribute('data-palette'),
    })
    const observer = new MutationObserver(() => {
      if (!document.querySelector('script[type="module"]')) return
      probe.__beforeModuleAttrs = snapshot()
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
    document.addEventListener('DOMContentLoaded', () => {
      probe.__domContentLoadedAttrs = snapshot()
    }, { once: true, capture: true })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const attrs = await page.evaluate(() => {
    const probe = window as unknown as Record<string, unknown>
    return { beforeModule: probe.__beforeModuleAttrs, domContentLoaded: probe.__domContentLoadedAttrs }
  })
  expect(attrs.beforeModule).toEqual({ theme: 'light', palette: 'cyberdeck' })
  expect(attrs.domContentLoaded).toEqual({ theme: 'light', palette: 'cyberdeck' })
  await expect(page.locator('#app')).not.toBeEmpty()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'cyberdeck')
  await expect(page.getByTestId('theme-toggle-button')).toHaveAccessibleName(/./)
})

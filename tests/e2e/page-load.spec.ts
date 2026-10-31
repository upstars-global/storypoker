import { expect, openScene, ROOM_ID, ROOM_SLUG, settleScene, test, type SceneRole } from '../visual/support/scene'
import { colorContrast } from '../support/helpers/colorContrast'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/ffc']

for (const palette of ['classic', 'cyberdeck', 'matcha']) {
  for (const theme of ['dark', 'light']) {
    test(`account volume slider contrast: ${palette} ${theme}`, async ({ page }) => {
      await page.addInitScript(({ palette, theme }) => {
        localStorage.setItem('sp-palette', palette)
        localStorage.setItem('sp-theme', theme)
      }, { palette, theme })
      await page.goto('/')
      await page.getByTestId('account-menu-button').click()
      const colors = await page.getByRole('menu').evaluate((menu) => {
        const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number)
        const blend = (foreground: number[], background: number[]) => {
          const alpha = foreground[3] ?? 1
          return foreground.slice(0, 3).map((value, index) => value * alpha + background[index]! * (1 - alpha))
        }
        const hex = (channels: number[]) => `#${channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`
        const style = getComputedStyle(menu)
        let background = rgb(style.backgroundColor)
        const overlay = style.backgroundImage.match(/rgba?\([^)]*\)/)?.[0]
        if (overlay) background = blend(rgb(overlay), background)
        const thumb = blend(rgb(getComputedStyle(menu.querySelector('.mui-slider-knob')!).color), background)
        const digit = blend(rgb(getComputedStyle(menu.querySelector('.mui-slider-value')!).color), thumb)
        return { background: hex(background), thumb: hex(thumb), digit: hex(digit) }
      })
      expect(colorContrast(colors.thumb, colors.background), 'thumb against menu').toBeGreaterThanOrEqual(3)
      expect(colorContrast(colors.digit, colors.thumb), 'digit against thumb').toBeGreaterThanOrEqual(4.5)
    })
  }
}

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
  await page.getByTestId('account-menu-button').click()
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

test('account menu reaches the slider with arrows and preserves appearance choices', async ({ page }) => {
  await page.goto('/')
  const account = page.getByTestId('account-menu-button')
  await account.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('volume-button')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('volume-slider')).toBeFocused()
  await page.keyboard.press('End')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sp-volume'))).toBe('1')
  await page.keyboard.press('Home')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sp-volume'))).toBe('0')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(account).toBeFocused()
  await account.click()
  const oldTheme = await page.locator('html').getAttribute('data-theme')
  await page.getByTestId('theme-toggle-button').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', oldTheme === 'light' ? 'dark' : 'light')
  await account.click()
  await page.getByTestId('palette-option-matcha').click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'matcha')
  await expect(page.locator('html')).toHaveAttribute('data-theme', oldTheme === 'light' ? 'dark' : 'light')
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
  await page.getByTestId('account-menu-button').click()
  await expect(page.getByTestId('theme-toggle-button')).toHaveAccessibleName(/./)
})

const URL_SCHEMA_ROUTES: { path: string; role: SceneRole }[] = [
  { path: '/', role: 'guest' },
  { path: `/${ROOM_ID}`, role: 'player' },
  { path: `/${ROOM_SLUG}`, role: 'authorized-moderator' },
  { path: `/${ROOM_SLUG}`, role: 'guest' },
  { path: '/login', role: 'guest' },
  { path: '/signup', role: 'guest' },
  { path: '/forgot-password', role: 'guest' },
  { path: '/reset-password', role: 'guest' },
  { path: '/ffc', role: 'guest' },
]

test.describe('URL Schema routes keep the console clean', () => {
  test.use({ serviceWorkers: 'block' })

  for (const { path, role } of URL_SCHEMA_ROUTES) {
    test(`${path} as ${role} after load and 1280 -> 375`, async ({ page, consoleErrors }) => {
      const supabaseUrl = process.env.VITE_SUPABASE_URL
      if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL must be set so the Supabase fake can route the build\'s requests')

      const scene = await openScene(page, { palette: 'classic', theme: 'dark', role, path, viewport: 1280, supabaseUrl })
      expect(consoleErrors, 'console errors after load at 1280').toEqual([])

      await page.setViewportSize({ width: 375, height: 812 })
      await settleScene(page, scene)
      expect(consoleErrors, 'console errors after resize to 375').toEqual([])
      expect(scene.fake.unhandled, 'requests the Supabase fake did not serve').toEqual([])
    })
  }
})

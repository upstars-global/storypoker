import { expect, openScene, ROOM_ID, ROOM_SLUG, settleScene, test, type SceneRole } from '../visual/support/scene'
import { colorContrast } from '../support/helpers/colorContrast'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/ffc']

for (const palette of ['classic', 'cyberdeck', 'matcha']) {
  for (const theme of ['dark', 'light']) {
    test(`account volume slider appearance: ${palette} ${theme}`, async ({ page }) => {
      await page.addInitScript(({ palette, theme }) => {
        localStorage.setItem('sp-palette', palette)
        localStorage.setItem('sp-theme', theme)
      }, { palette, theme })
      await page.goto('/')
      await page.getByTestId('account-menu-button').click()
      const mute = await page.getByTestId('volume-button').boundingBox()
      const slider = await page.getByTestId('volume-slider').boundingBox()
      expect(mute).not.toBeNull()
      expect(slider).not.toBeNull()
      expect(slider!.width).toBe(96)
      expect(Math.abs(mute!.y + mute!.height / 2 - slider!.y - slider!.height / 2)).toBeLessThan(2)
      expect(mute!.x + mute!.width).toBeLessThanOrEqual(slider!.x)
      const colors = await page.getByRole('menu').evaluate((menu) => {
        const rgb = (value: string) => value.match(/[\d.]+/g)!.map(Number)
        const blend = (foreground: number[], background: number[]) => {
          const alpha = foreground[3] ?? 1
          return foreground.slice(0, 3).map((value, index) => value * alpha + background[index]! * (1 - alpha))
        }
        const hex = (channels: number[]) => `#${channels.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`
        const knob = getComputedStyle(menu.querySelector('.mui-slider-knob')!)
        const fill = getComputedStyle(menu.querySelector('.mui-slider-knob > :first-child')!)
        const header = getComputedStyle(document.querySelector('header')!)
        const original = document.createElement('span')
        original.style.backgroundColor = header.getPropertyValue('--color-appbar-emphasis')
        menu.append(original)
        const originalFill = getComputedStyle(original).backgroundColor
        original.remove()
        const base = rgb(fill.backgroundColor)
        const stops = fill.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []
        const surfaces = [base, ...stops.map(stop => blend(rgb(stop), base))]
        const digit = rgb(getComputedStyle(menu.querySelector('.mui-slider-value')!).color)
        return {
          outline: knob.outlineStyle, border: knob.borderTopWidth, originalFill,
          fill: fill.backgroundColor, gradient: fill.backgroundImage,
          digitColor: getComputedStyle(menu.querySelector('.mui-slider-value')!).color,
          headerFill: header.backgroundColor, headerGradient: header.backgroundImage,
          pairs: surfaces.map(surface => ({ thumb: hex(surface), digit: hex(blend(digit, surface)) })),
        }
      })
      expect(colors.fill).toBe(theme === 'dark' ? colors.originalFill : colors.headerFill)
      expect(colors.gradient).toBe(theme === 'dark' ? 'none' : colors.headerGradient)
      if (theme === 'dark') expect(colors.digitColor).toBe(colors.headerFill)
      expect(colors.outline).toBe('none')
      expect(colors.border).toBe('0px')
      for (const pair of colors.pairs) {
        expect(colorContrast(pair.digit, pair.thumb), 'digit against each gradient stop').toBeGreaterThanOrEqual(4.5)
      }
    })
  }
}

for (const palette of ['classic', 'cyberdeck', 'matcha']) {
  for (const theme of ['dark', 'light']) {
    test(`palette submenu: ${palette} ${theme}`, async ({ page }) => {
      await page.addInitScript(({ palette, theme }) => {
        localStorage.setItem('sp-palette', palette)
        localStorage.setItem('sp-theme', theme)
      }, { palette, theme })
      await page.goto('/')
      await page.getByTestId('account-menu-button').click()
      expect(await page.getByRole('menu').evaluate(menu => menu.scrollWidth <= menu.clientWidth)).toBe(true)
      await expect(page.getByTestId('palette-option-classic')).toHaveCount(0)
      const trigger = page.getByTestId('palette-menu-trigger')
      await trigger.click()
      const submenu = page.getByTestId('palette-submenu')
      await expect(submenu).toBeVisible()
      expect(await submenu.evaluate(menu => menu.scrollWidth <= menu.clientWidth)).toBe(true)
      await expect(submenu.getByRole('menuitemradio')).toHaveCount(3)
      await expect(page.getByTestId(`palette-option-${palette}`)).toHaveAttribute('aria-checked', 'true')
      await expect(submenu.locator('[aria-checked="true"]')).toHaveCount(1)
      const box = await submenu.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
      await page.keyboard.press('Escape')
      await expect(submenu).toHaveCount(0)
      await expect(trigger).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(submenu).toBeVisible()
      await page.getByTestId('palette-option-matcha').click()
      await expect(page.getByRole('menu')).toHaveCount(0)
      await expect(page.getByTestId('account-menu-button')).toBeFocused()
      await expect(page.locator('html')).toHaveAttribute('data-palette', 'matcha')
    })
  }
}

test('palette submenu supports a complete keyboard selection', async ({ page }) => {
  await page.goto('/')
  const account = page.getByTestId('account-menu-button')
  await account.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('volume-button')).toBeFocused()
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('palette-menu-trigger')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('palette-option-classic')).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByTestId('palette-option-cyberdeck')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(account).toBeFocused()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'cyberdeck')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sp-palette'))).toBe('cyberdeck')
})

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
  await page.getByTestId('palette-menu-trigger').click()
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

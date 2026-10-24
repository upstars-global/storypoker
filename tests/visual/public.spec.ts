import { expect, openScene, PALETTES, test, THEMES, VIEWPORTS, settleScene } from './support/scene'

const SCREENS = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'forgot-password', path: '/forgot-password' },
  { name: 'reset-password', path: '/reset-password' },
  { name: 'ffc', path: '/ffc' },
] as const

test.describe('public screens', () => {
  for (const screen of SCREENS) {
    for (const palette of PALETTES) {
      for (const theme of THEMES) {
        for (const viewport of VIEWPORTS) {
          test(`${screen.name} ${palette} ${theme} ${viewport}`, async ({ page }) => {
            const scene = await openScene(page, { palette, theme, role: 'guest', path: screen.path, viewport })
            if (screen.name === 'reset-password') {
              await expect(page.locator('main#main a[href="/forgot-password"]')).toBeVisible()
            }
            await settleScene(page, scene)
            await expect(page).toHaveScreenshot(`public-${screen.name}-${palette}-${theme}-${viewport}.png`, {
              fullPage: true,
            })
          })
        }
      }
    }
  }
})

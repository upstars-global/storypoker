import { VISUAL_SUPABASE_URL } from './fakeSupabase'
import { expect, openScene, PALETTES, ROOM_ID, ROOM_SLUG, test, THEMES, VIEWPORTS, type SceneRole } from './scene'

const PUBLIC_SCENES = [
  { path: '/', role: 'guest' },
  { path: '/', role: 'player' },
  { path: '/login', role: 'guest' },
] as const satisfies readonly { path: string; role: SceneRole }[]

const ROOM_SCENES = [
  { path: `/${ROOM_ID}`, role: 'guest', expectedPath: `/${ROOM_SLUG}` },
  { path: `/${ROOM_SLUG}`, role: 'player', expectedPath: `/${ROOM_SLUG}` },
  { path: `/${ROOM_ID}`, role: 'authorized-moderator', expectedPath: `/${ROOM_SLUG}` },
] as const satisfies readonly { path: string; role: SceneRole; expectedPath: string }[]

test.describe('openScene self-check', () => {
  test('exports the screenshot matrix', () => {
    expect(PALETTES).toEqual(['classic', 'cyberdeck', 'matcha'])
    expect(THEMES).toEqual(['dark', 'light'])
    expect(VIEWPORTS).toEqual([1280, 375])
  })

  for (const { path, role } of PUBLIC_SCENES) {
    test(`public ${path} as ${role} applies palette and theme with no unrouted requests`, async ({ page }) => {
      const scene = await openScene(page, { palette: 'cyberdeck', theme: 'light', role, path, viewport: 1280 })
      const html = page.locator('html')
      await expect(html).toHaveAttribute('data-palette', 'cyberdeck')
      await expect(html).toHaveAttribute('data-theme', 'light')
      expect(await page.evaluate(() => Date.now())).toBe(Date.parse('2026-09-09T09:05:00Z'))
      expect(await page.evaluate(() => localStorage.getItem('sp-volume'))).toBe('0')
      expect(await page.evaluate(() => localStorage.getItem('FEATURE_FLAGS'))).toBe('{}')
      expect(scene.fake.unhandled).toEqual([])
    })
  }

  for (const { path, role, expectedPath } of ROOM_SCENES) {
    test(`room ${path} as ${role} lands on ${expectedPath} with no unrouted requests`, async ({ page }) => {
      const scene = await openScene(page, { palette: 'matcha', theme: 'dark', role, path, viewport: 375 })
      const html = page.locator('html')
      await expect(html).toHaveAttribute('data-palette', 'matcha')
      await expect(html).toHaveAttribute('data-theme', 'dark')
      expect(new URL(page.url()).pathname).toBe(expectedPath)
      expect(page.viewportSize()?.width).toBe(375)
      expect(scene.fake.handled.some(request => request.includes('/rest/v1/rooms'))).toBe(true)
      expect(scene.fake.handled.some(request => request.startsWith('WS '))).toBe(true)
      expect(scene.fake.unhandled).toEqual([])
    })
  }

  test('home lists the seeded recent room for a returning player', async ({ page }) => {
    await openScene(page, { palette: 'classic', theme: 'dark', role: 'player', path: '/', viewport: 1280 })
    await expect(page.getByText('Sprint Planning')).toBeVisible()
  })

  test('authorized moderator sees moderator controls and room background menu', async ({ page }) => {
    await openScene(page, { palette: 'classic', theme: 'light', role: 'authorized-moderator', path: `/${ROOM_SLUG}`, viewport: 1280 })
    await expect(page.getByTestId('reveal-button')).toBeVisible()
    await page.getByTestId('account-menu-button').click()
    await expect(page.getByTestId('room-background-menu-item')).toBeVisible()
  })

  test('plain player sees no moderator controls', async ({ page }) => {
    await openScene(page, { palette: 'classic', theme: 'light', role: 'player', path: `/${ROOM_SLUG}`, viewport: 1280 })
    await expect(page.locator('[data-testid="player-row"]')).toHaveCount(8)
    await expect(page.getByTestId('reveal-button')).toHaveCount(0)
  })

  test('records Supabase and external requests the fake does not serve', async ({ page, consoleErrors }) => {
    const scene = await openScene(page, { palette: 'classic', theme: 'dark', role: 'guest', path: '/ffc', viewport: 1280 })
    const statuses = await page.evaluate(async (supabaseUrl) => {
      const supabase = await fetch(`${supabaseUrl}/functions/v1/unknown`).then(response => response.status)
      const external = await fetch('https://example.com/tracker').then(() => 'reached', () => 'blocked')
      return { supabase, external }
    }, VISUAL_SUPABASE_URL)
    expect(statuses).toEqual({ supabase: 501, external: 'blocked' })
    expect(scene.fake.unhandled).toEqual([
      `GET ${VISUAL_SUPABASE_URL}/functions/v1/unknown`,
      'external GET https://example.com/tracker',
    ])
    scene.fake.unhandled.length = 0
    consoleErrors.length = 0
  })

  test('fails the test when a Supabase request is left unserved', async ({ page, consoleErrors }) => {
    test.fail()
    await openScene(page, { palette: 'classic', theme: 'dark', role: 'guest', path: '/ffc', viewport: 1280 })
    await page.evaluate(async (supabaseUrl) => { await fetch(`${supabaseUrl}/functions/v1/unknown`) }, VISUAL_SUPABASE_URL)
    consoleErrors.length = 0
  })
})

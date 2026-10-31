import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test as consoleTest } from '../../fixtures/console'
import {
  installFakeSupabase,
  supabaseAuthStorageKey,
  VISUAL_SUPABASE_URL,
  type FakeAuthUser,
  type FakeSupabase,
  type FakeTables,
} from './fakeSupabase'

export const PALETTES = ['classic', 'cyberdeck', 'matcha'] as const
export const THEMES = ['dark', 'light'] as const
export const VIEWPORTS = [1280, 375] as const
export const ROLES = ['guest', 'player', 'authorized-moderator'] as const
export const FROZEN_NOW = '2026-09-09T09:05:00.000Z'

export type Palette = typeof PALETTES[number]
export type Theme = typeof THEMES[number]
export type ViewportWidth = typeof VIEWPORTS[number]
export type SceneRole = typeof ROLES[number]

const VIEWPORT_HEIGHTS: Record<ViewportWidth, number> = { 1280: 800, 375: 812 }
const PUBLIC_PATHS = new Set(['/', '/login', '/signup', '/forgot-password', '/reset-password', '/ffc'])
const SEEDED_MARKER = 'visual-scene-seeded'

export interface VisualRoomFixture {
  meta: {
    roomId: string
    slug: string
    playerId: string
    moderatorPlayerId: string
    moderatorUser: FakeAuthUser
    onlinePlayerIds: string[]
    lastVisitedAt: string
  }
  tables: FakeTables
}

export const visualRoom: VisualRoomFixture = JSON.parse(
  readFileSync(new URL('../../fixtures/data/visual-room.json', import.meta.url), 'utf8'),
)

export const ROOM_ID = visualRoom.meta.roomId
export const ROOM_SLUG = visualRoom.meta.slug

export interface SceneOptions {
  palette: Palette
  theme: Theme
  role: SceneRole
  path: string
  viewport: ViewportWidth
  tables?: (tables: FakeTables) => void
  storage?: Record<string, string>
  supabaseUrl?: string
}

export interface Scene {
  fake: FakeSupabase
  currentPlayerId: string | null
  expectedPath: string
}

const scenesByPage = new WeakMap<Page, Scene>()

function playerIdForRole(role: SceneRole): string | null {
  if (role === 'player') return visualRoom.meta.playerId
  if (role === 'authorized-moderator') return visualRoom.meta.moderatorPlayerId
  return null
}

function sessionSeed(tables: FakeTables, playerId: string): Record<string, string> {
  const player = tables.players.find(row => row.id === playerId)
  if (!player?.room_id) throw new Error(`visual-room.json has no player ${playerId}`)
  return {
    [`storypoker_session_${player.room_id}`]: JSON.stringify({
      playerId,
      playerName: player.name,
      lastVisitedAt: visualRoom.meta.lastVisitedAt,
    }),
  }
}

function resolveRoomPath(tables: FakeTables, path: string): { roomId: string; expectedPath: string } | null {
  const pathname = new URL(path, 'http://visual.local').pathname
  if (PUBLIC_PATHS.has(pathname)) return null
  const param = decodeURIComponent(pathname.slice(1))
  const room = tables.rooms.find(row => row.id === param || row.slug === param)
  if (!room) return null
  return { roomId: room.id, expectedPath: room.slug ? `/${room.slug}` : `/${room.id}` }
}

export async function settleScene(page: Page, scene: Scene): Promise<void> {
  await scene.fake.idle()
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loaded')
  await scene.fake.idle()
}

export async function openScene(page: Page, options: SceneOptions): Promise<Scene> {
  if (scenesByPage.has(page)) throw new Error('openScene installs the Supabase fake once per page; use a fresh page')
  const tables = structuredClone(visualRoom.tables)
  options.tables?.(tables)
  const authUser = options.role === 'authorized-moderator' ? visualRoom.meta.moderatorUser : null
  const currentPlayerId = playerIdForRole(options.role)
  const baseURL = test.info().project.use.baseURL
  if (!baseURL) throw new Error('visual project has no baseURL')

  await page.setViewportSize({ width: options.viewport, height: VIEWPORT_HEIGHTS[options.viewport] })
  await page.clock.setFixedTime(FROZEN_NOW)
  const fake = await installFakeSupabase(page, {
    tables,
    now: FROZEN_NOW,
    appOrigin: baseURL,
    authUser,
    onlinePlayerIds: visualRoom.meta.onlinePlayerIds,
    supabaseUrl: options.supabaseUrl,
  })

  const storage: Record<string, string> = {
    'sp-palette': options.palette,
    'sp-theme': options.theme,
    'sp-volume': '0',
    'sp-lang': 'uk',
    FEATURE_FLAGS: '{}',
    ...(currentPlayerId ? sessionSeed(tables, currentPlayerId) : {}),
    ...(fake.session ? { [supabaseAuthStorageKey(options.supabaseUrl ?? VISUAL_SUPABASE_URL)]: JSON.stringify(fake.session) } : {}),
    ...options.storage,
  }
  await page.addInitScript(({ entries, marker }) => {
    try {
      if (sessionStorage.getItem(marker)) return
      localStorage.clear()
      for (const [key, value] of entries) localStorage.setItem(key, value)
      sessionStorage.setItem(marker, '1')
    } catch {}
  }, { entries: Object.entries(storage), marker: SEEDED_MARKER })

  const room = resolveRoomPath(tables, options.path)
  const expectedPath = room?.expectedPath ?? new URL(options.path, baseURL).pathname
  const scene: Scene = { fake, currentPlayerId, expectedPath }
  scenesByPage.set(page, scene)

  await page.goto(options.path)
  await expect(page.locator('#app')).not.toBeEmpty()

  if (room) {
    await page.waitForURL(url => url.pathname === room.expectedPath)
    await expect(page.getByTestId('room-root')).toBeVisible()
    if (currentPlayerId) {
      await expect(fake.presenceTracked).resolves.toBe(currentPlayerId)
      const player = tables.players.find(row => row.id === currentPlayerId)
      await expect(page.locator(`[data-testid="player-row"][data-player-name="${player?.name}"]`)).toBeVisible()
    } else {
      await expect(page.locator('#join-overlay-title')).toBeVisible()
    }
  } else {
    await expect(page.locator('main#main')).toBeVisible()
  }

  await settleScene(page, scene)
  return scene
}

export const test = consoleTest.extend<{ unroutedRequestGuard: void }>({
  unroutedRequestGuard: [
    async ({ page }, use) => {
      await use()
      const unhandled = scenesByPage.get(page)?.fake.unhandled ?? []
      if (unhandled.length) {
        throw new Error(`Requests not served by the visual Supabase fake:\n- ${unhandled.join('\n- ')}`)
      }
    },
    { auto: true },
  ],
})

export { expect }

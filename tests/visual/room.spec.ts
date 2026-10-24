import type { Page } from '@playwright/test'
import type { FakeTables } from './support/fakeSupabase'
import { expect, openScene, PALETTES, ROOM_SLUG, settleScene, test, THEMES, VIEWPORTS, type Scene, type SceneRole } from './support/scene'

interface RoomState {
  name: string
  roles: readonly SceneRole[]
  tables?: (tables: FakeTables) => void
  fullPage: boolean
  prepare?: (page: Page, scene: Scene, role: SceneRole) => Promise<void>
}

const MEMBER_ROLES = ['player', 'authorized-moderator'] as const satisfies readonly SceneRole[]

function playerMenuTarget(role: SceneRole): string {
  return role === 'authorized-moderator' ? 'Casey' : 'Blake'
}

function revealRound(tables: FakeTables): void {
  tables.room_state[0]!.phase = 'revealed'
}

const STATES: readonly RoomState[] = [
  {
    name: 'join',
    roles: ['guest'],
    fullPage: false,
  },
  {
    name: 'voting',
    roles: MEMBER_ROLES,
    fullPage: true,
    prepare: async (page) => {
      await expect(page.getByTestId('results-area')).toHaveCount(0)
    },
  },
  {
    name: 'revealed',
    roles: MEMBER_ROLES,
    fullPage: true,
    tables: revealRound,
    prepare: async (page) => {
      await expect(page.getByTestId('results-area')).toBeVisible()
    },
  },
  {
    name: 'header-menu',
    roles: MEMBER_ROLES,
    fullPage: true,
    prepare: async (page, scene) => {
      await page.getByTestId('account-menu-button').click()
      await expect(page.getByTestId('account-menu-button')).toHaveAttribute('aria-expanded', 'true')
      await settleScene(page, scene)
    },
  },
  {
    name: 'player-menu',
    roles: MEMBER_ROLES,
    fullPage: true,
    prepare: async (page, scene, role) => {
      const row = page.locator(`[data-testid="player-row"][data-player-name="${playerMenuTarget(role)}"]`)
      const button = row.locator('button[aria-expanded]')
      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      await expect(row.getByRole('menu')).toBeVisible()
      await settleScene(page, scene)
    },
  },
]

test.describe('room screens', () => {
  for (const state of STATES) {
    for (const role of state.roles) {
      for (const palette of PALETTES) {
        for (const theme of THEMES) {
          for (const viewport of VIEWPORTS) {
            test(`${state.name} ${role} ${palette} ${theme} ${viewport}`, async ({ page }) => {
              const scene = await openScene(page, {
                palette,
                theme,
                role,
                path: `/${ROOM_SLUG}`,
                viewport,
                tables: state.tables,
              })
              await state.prepare?.(page, scene, role)
              await settleScene(page, scene)
              await expect(page).toHaveScreenshot(`room-${state.name}-${role}-${palette}-${theme}-${viewport}.png`, {
                fullPage: state.fullPage,
              })
            })
          }
        }
      }
    }
  }
})

import type { Locator, Page } from '@playwright/test'
import type { FakeTables } from './support/fakeSupabase'
import { expect, FROZEN_NOW, openScene, PALETTES, ROOM_SLUG, settleScene, test, THEMES, VIEWPORTS, type Scene, type SceneRole } from './support/scene'

interface ModalState {
  name: string
  roles: readonly SceneRole[]
  tables?: (tables: FakeTables) => void
  titleId: string
  fullPage: boolean
  open: (page: Page, scene: Scene, role: SceneRole) => Promise<void>
  detail?: { name: string; region: (modal: Locator) => Promise<Region> }
}

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const MEMBER_ROLES = ['player', 'authorized-moderator'] as const satisfies readonly SceneRole[]
const ECHARTS_ANIMATION_SKIP_MS = 5_000
const HISTORY_ROUNDS = 4
const TRENDS_PLOT_INSET = { left: 44, right: 56, top: 20, bottom: 68 }

function playerEditTarget(role: SceneRole): string {
  return role === 'authorized-moderator' ? 'Casey' : 'Blake'
}

function dialog(page: Page, titleId: string): Locator {
  return page.locator(`dialog[open][aria-labelledby="${titleId}"]`)
}

async function openAccountMenuItem(page: Page, item: Locator): Promise<void> {
  await page.getByTestId('account-menu-button').click()
  await expect(page.getByTestId('account-menu-button')).toHaveAttribute('aria-expanded', 'true')
  await item.click()
}

function accountMenuItem(page: Page, name: string): Locator {
  return page.getByRole('menuitem', { name, exact: true })
}

async function openHistory(page: Page): Promise<void> {
  await openAccountMenuItem(page, accountMenuItem(page, 'Історія раундів'))
  await expect(dialog(page, 'history-modal-title').getByTestId('history-round')).toHaveCount(HISTORY_ROUNDS)
}

async function finishChartAnimations(page: Page, scene: Scene): Promise<void> {
  const timer = page.getByTestId('timer-display')
  const frozenTimer = await timer.innerText()
  await page.clock.setFixedTime(new Date(Date.parse(FROZEN_NOW) + ECHARTS_ANIMATION_SKIP_MS))
  await settleScene(page, scene)
  await page.clock.setFixedTime(FROZEN_NOW)
  await expect(timer).toHaveText(frozenTimer)
}

async function trendsPlotRegion(modal: Locator): Promise<Region> {
  const box = await modal.locator('x-vue-echarts').boundingBox()
  if (!box) throw new Error('trends chart has no bounding box')
  return {
    x: box.x + TRENDS_PLOT_INSET.left,
    y: box.y + TRENDS_PLOT_INSET.top,
    width: box.width - TRENDS_PLOT_INSET.left - TRENDS_PLOT_INSET.right,
    height: box.height - TRENDS_PLOT_INSET.top - TRENDS_PLOT_INSET.bottom,
  }
}

async function waitForImages(modal: Locator): Promise<void> {
  await expect.poll(() => modal.locator('img').evaluateAll(images =>
    images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0),
  )).toBe(true)
}

const MODALS: readonly ModalState[] = [
  {
    name: 'configure-deck',
    roles: ['authorized-moderator'],
    titleId: 'card-deck-modal-title',
    fullPage: false,
    open: async (page) => {
      await openAccountMenuItem(page, accountMenuItem(page, 'Налаштувати колоду'))
    },
  },
  {
    name: 'history',
    roles: MEMBER_ROLES,
    titleId: 'history-modal-title',
    fullPage: false,
    open: openHistory,
  },
  {
    name: 'trends',
    roles: MEMBER_ROLES,
    titleId: 'alignment-trends-modal-title',
    fullPage: false,
    open: async (page, scene) => {
      await openAccountMenuItem(page, accountMenuItem(page, 'Тренди узгодженості'))
      await expect(dialog(page, 'alignment-trends-modal-title').locator('canvas')).toBeVisible()
      await settleScene(page, scene)
      await finishChartAnimations(page, scene)
    },
    detail: { name: 'trends-chart', region: trendsPlotRegion },
  },
  {
    name: 'round-snapshot',
    roles: MEMBER_ROLES,
    titleId: 'round-snapshot-modal-title',
    fullPage: false,
    open: async (page) => {
      await openHistory(page)
      await dialog(page, 'history-modal-title').getByTestId('history-round').first().click()
    },
  },
  {
    name: 'room-background',
    roles: ['authorized-moderator'],
    titleId: 'room-background-modal-title',
    fullPage: false,
    open: async (page) => {
      await openAccountMenuItem(page, page.getByTestId('room-background-menu-item'))
      await expect(dialog(page, 'room-background-modal-title').getByTestId('room-background-preview')).toBeVisible()
    },
  },
  {
    name: 'player-edit',
    roles: MEMBER_ROLES,
    titleId: 'player-edit-modal-title',
    fullPage: false,
    open: async (page, _scene, role) => {
      const row = page.locator(`[data-testid="player-row"][data-player-name="${playerEditTarget(role)}"]`)
      const button = row.locator('button[aria-expanded]')
      await button.click()
      await expect(button).toHaveAttribute('aria-expanded', 'true')
      await row.getByRole('menuitem', { name: 'Редагувати', exact: true }).click()
    },
  },
  {
    name: 'user-settings',
    roles: ['authorized-moderator'],
    titleId: 'user-settings-modal-title',
    fullPage: false,
    open: async (page) => {
      await openAccountMenuItem(page, accountMenuItem(page, 'Налаштування акаунту'))
    },
  },
  {
    name: 'auth',
    roles: ['player'],
    titleId: 'auth-modal-title',
    fullPage: false,
    open: async (page) => {
      await openAccountMenuItem(page, page.getByTestId('auth-sign-in-menu-item'))
    },
  },
]

test.describe('modals', () => {
  for (const modal of MODALS) {
    for (const role of modal.roles) {
      for (const palette of PALETTES) {
        for (const theme of THEMES) {
          for (const viewport of VIEWPORTS) {
            test(`${modal.name} ${role} ${palette} ${theme} ${viewport}`, async ({ page }) => {
              const scene = await openScene(page, {
                palette,
                theme,
                role,
                path: `/${ROOM_SLUG}`,
                viewport,
                tables: modal.tables,
              })
              await modal.open(page, scene, role)
              const modalDialog = dialog(page, modal.titleId)
              await expect(modalDialog.locator(`[id="${modal.titleId}"]`)).toBeVisible()
              await page.mouse.move(0, 0)
              await waitForImages(modalDialog)
              await settleScene(page, scene)
              await expect(page).toHaveScreenshot(`modal-${modal.name}-${role}-${palette}-${theme}-${viewport}.png`, {
                fullPage: modal.fullPage,
              })
              if (modal.detail) {
                await expect(page).toHaveScreenshot(`modal-${modal.detail.name}-${role}-${palette}-${theme}-${viewport}.png`, {
                  clip: await modal.detail.region(modalDialog),
                })
              }
            })
          }
        }
      }
    }
  }
})

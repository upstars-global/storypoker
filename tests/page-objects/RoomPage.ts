import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

const JOIN_ROOM = 'Приєднатись'
const PLAYER_MENU_FOR = 'Меню гравця: '
const EDIT_PLAYER = 'Редагувати'
const SAVE = 'Зберегти'
const KICK_PLAYER = 'Вилучити гравця'
const KICK_CONFIRM = 'Вилучити'

export class RoomPage {
  constructor(private readonly page: Page) {}

  playerRow(name: string): Locator {
    return this.page.locator(`[data-testid="player-row"][data-player-name="${name}"]`)
  }

  voteCard(value: string): Locator {
    return this.page.locator(`[data-testid="vote-card"][data-value="${value}"]`)
  }

  resultsArea(): Locator {
    return this.page.getByTestId('results-area')
  }

  revealButton(): Locator {
    return this.page.getByTestId('reveal-button')
  }

  newRoundButton(): Locator {
    return this.page.getByTestId('new-round-button')
  }

  resetButton(): Locator {
    return this.page.getByTestId('reset-button')
  }

  async joinAs(name: string) {
    await expect(this.page.locator('#join-overlay-title')).toBeVisible()
    await this.page.locator('#join-name').fill(name)
    await this.page.getByRole('button', { name: JOIN_ROOM, exact: true }).click()
    await expect(this.playerRow(name)).toBeVisible()
  }

  async openPlayerMenu(name: string) {
    await this.playerRow(name).getByRole('button', { name: `${PLAYER_MENU_FOR}${name}`, exact: true }).click()
    await expect(this.page.getByRole('menu')).toBeVisible()
  }

  async rename(currentName: string, nextName: string) {
    await this.openPlayerMenu(currentName)
    await this.page.getByRole('menuitem', { name: EDIT_PLAYER, exact: true }).click()
    const dialog = this.page.getByRole('dialog')
    await dialog.locator('#player-name').fill(nextName)
    await dialog.getByRole('button', { name: SAVE, exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(this.playerRow(nextName)).toBeVisible()
  }

  async kick(name: string) {
    await this.openPlayerMenu(name)
    await this.page.getByRole('menuitem', { name: KICK_PLAYER, exact: true }).click()
    const dialog = this.page.getByRole('dialog')
    await dialog.getByRole('button', { name: KICK_CONFIRM, exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(this.playerRow(name)).toHaveCount(0)
  }

  async resetVotes() {
    await this.resetButton().click()
  }

  async castVote(value: string) {
    const card = this.voteCard(value)
    await card.click()
    await expect(card).toHaveAttribute('aria-pressed', 'true')
  }

  async waitVoteConfirmed(name: string) {
    const row = this.playerRow(name)
    await expect(row).toHaveAttribute('data-voted', 'true')
    await expect(row).toHaveAttribute('data-vote-pending', 'false')
  }

  async reveal() {
    await this.revealButton().click()
    await expect(this.resultsArea()).toBeVisible()
  }

  async newRound() {
    await this.newRoundButton().click()
    await expect(this.resultsArea()).toBeHidden()
  }
}

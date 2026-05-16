import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

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

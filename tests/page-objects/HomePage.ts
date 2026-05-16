import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

const ROOM_ID_RE = /\/([A-Za-z0-9]{8})(?:\?|#|$)/

export class HomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async createRoom(name: string): Promise<string> {
    await this.page.getByTestId('home-name-input').fill(name)
    await this.page.getByTestId('home-create-room').click()
    await this.page.waitForURL(ROOM_ID_RE)
    const match = this.page.url().match(ROOM_ID_RE)
    if (!match) throw new Error(`URL did not match room id pattern: ${this.page.url()}`)
    await expect(this.page.getByTestId('players-list')).toBeVisible()
    return match[1]
  }
}

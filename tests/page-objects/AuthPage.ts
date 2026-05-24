import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export class AuthPage {
  constructor(private readonly page: Page) {}

  private get accountMenuButton(): Locator {
    return this.page.getByTestId('account-menu-button')
  }

  async login(email: string, password: string) {
    await this.page.goto('/login')
    await this.page.getByTestId('login-email').fill(email)
    await this.page.getByTestId('login-password').fill(password)
    await this.page.getByTestId('login-submit').click()
    await this.page.waitForURL('/')
  }

  async openAccountMenu() {
    if ((await this.accountMenuButton.getAttribute('aria-expanded')) !== 'true') {
      await this.accountMenuButton.click()
    }
    await expect(this.page.getByRole('menu')).toBeVisible()
  }

  async expectSignedIn() {
    await this.openAccountMenu()
    await expect(this.page.getByTestId('auth-sign-out-menu-item')).toBeVisible()
    await expect(this.page.getByTestId('auth-sign-in-menu-item')).toHaveCount(0)
  }

  async expectSignedOut() {
    await this.openAccountMenu()
    await expect(this.page.getByTestId('auth-sign-in-menu-item')).toBeVisible()
    await expect(this.page.getByTestId('auth-sign-out-menu-item')).toHaveCount(0)
  }

  async signOut() {
    await this.openAccountMenu()
    await this.page.getByTestId('auth-sign-out-menu-item').click()
  }
}

import { expect, test } from '@playwright/test'

test('renders the room fixture without a backend', async ({ page }) => {
  const remote: string[] = []
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      remote.push(url.origin)
      await route.abort()
      return
    }
    await route.continue()
  })
  await page.goto('/?role=guest&view=room')
  await expect(page.getByTestId('icon-harness-ready')).toBeAttached()
  await expect(page.getByTestId('players-list')).toContainText('0 / 15')
  await expect(page.locator('dialog .mui-modal-paper')).toBeAttached()
  expect(remote).toEqual([])
})

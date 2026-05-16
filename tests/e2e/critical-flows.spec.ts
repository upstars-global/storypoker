import { randomUUID } from 'node:crypto'
import { test, expect } from '../support/test'
import { AuthPage } from '../page-objects/AuthPage'

test('signup → success screen (email confirmation on)', async ({ page, signupViaUI, trackedEmails }) => {
  const password = process.env.E2E_TEST_USER_PASSWORD
  if (!password) throw new Error('E2E_TEST_USER_PASSWORD is not set')

  const email = `e2e-${randomUUID()}@storypoker-test.dev`
  trackedEmails.push(email)

  await signupViaUI(page, email, password)
  await expect(page.getByTestId('signup-success')).toBeVisible()
})

test('login persistent user → account menu reflects signed-in/out', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error('E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD must be set')
  }

  const auth = new AuthPage(page)
  await auth.login(email, password)
  await auth.expectSignedIn()
  await auth.signOut()
  await auth.expectSignedOut()
})

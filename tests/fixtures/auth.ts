import { test as base, type Page } from '@playwright/test'
import { getAdminClient } from '../support/helpers/supabase-admin'

export type AuthFixtures = {
  trackedEmails: string[]
  signupViaUI: (page: Page, email: string, password: string) => Promise<void>
}

async function findUserIdByEmail(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
): Promise<string | null> {
  const needle = email.toLowerCase()
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers failed on page ${page}: ${error.message}`)
    const users = data?.users ?? []
    const match = users.find(u => (u.email ?? '').toLowerCase() === needle)
    if (match) return match.id
    if (users.length < 1000) return null
    page += 1
  }
}

export const test = base.extend<AuthFixtures>({
  trackedEmails: async ({}, use, testInfo) => {
    const emails: string[] = []
    await use(emails)
    if (!emails.length) return
    const admin = getAdminClient()
    for (const email of emails) {
      try {
        const userId = await findUserIdByEmail(admin, email)
        if (!userId) {
          const msg = `cleanup: user not found for ${email}`
          if (testInfo.status === 'passed') throw new Error(msg)
          await testInfo.attach('cleanup-error', { body: msg, contentType: 'text/plain' })
          continue
        }
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (!error) continue
        const msg = `deleteUser failed for ${email}: ${error.message}`
        if (testInfo.status === 'passed') throw new Error(msg)
        await testInfo.attach('cleanup-error', { body: msg, contentType: 'text/plain' })
      } catch (err: any) {
        if (testInfo.status === 'passed') throw err
        await testInfo.attach('cleanup-error', {
          body: String(err?.message ?? err),
          contentType: 'text/plain',
        })
      }
    }
  },

  signupViaUI: async ({}, use) => {
    await use(async (page, email, password) => {
      await page.goto('/signup')
      await page.getByTestId('signup-email').fill(email)
      await page.getByTestId('signup-password').fill(password)
      await page.getByTestId('signup-confirm').fill(password)
      await page.getByTestId('signup-submit').click()
    })
  },
})

export const expect = test.expect

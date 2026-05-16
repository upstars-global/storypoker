import { test as base } from '@playwright/test'
import { getAdminClient } from '../support/helpers/supabase-admin'

export type RoomFixtures = {
  trackedRoomIds: string[]
}

export const test = base.extend<RoomFixtures>({
  trackedRoomIds: async ({}, use, testInfo) => {
    const ids: string[] = []
    await use(ids)
    if (!ids.length) return
    const admin = getAdminClient()
    for (const id of ids) {
      const { error } = await admin.from('rooms').delete().eq('id', id)
      if (!error) continue
      const msg = `room cleanup failed for ${id}: ${error.message}`
      if (testInfo.status === 'passed') throw new Error(msg)
      await testInfo.attach('cleanup-error', { body: msg, contentType: 'text/plain' })
    }
  },
})

export const expect = test.expect

import { mergeTests } from '@playwright/test'
import { test as roomTest, type RoomFixtures } from '../fixtures/room'
import { test as authTest, type AuthFixtures } from '../fixtures/auth'

export const test = mergeTests(roomTest, authTest)
export const expect = test.expect
export type { RoomFixtures, AuthFixtures }

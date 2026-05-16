import { mergeTests } from '@playwright/test'
import { test as roomTest, type RoomFixtures } from '../fixtures/room'
import { test as authTest, type AuthFixtures } from '../fixtures/auth'
import { test as consoleTest, type ConsoleFixtures } from '../fixtures/console'

export const test = mergeTests(roomTest, authTest, consoleTest)
export const expect = test.expect
export type { RoomFixtures, AuthFixtures, ConsoleFixtures }

import { randomUUID } from 'node:crypto'
import { test, expect } from '../support/test'
import { AuthPage } from '../page-objects/AuthPage'
import { HomePage } from '../page-objects/HomePage'
import { RoomPage } from '../page-objects/RoomPage'

test('signup → success screen (email confirmation on)', async ({ page, signupViaUI, trackedEmails }) => {
  const password = process.env.E2E_TEST_USER_PASSWORD ?? ''
  test.skip(!password, 'E2E_TEST_USER_PASSWORD is not set')

  const email = `e2e-${randomUUID()}@storypoker-test.dev`
  trackedEmails.push(email)

  await signupViaUI(page, email, password)
  await expect(page.getByTestId('signup-success')).toBeVisible()
})

test('login persistent user → account menu reflects signed-in/out', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL ?? ''
  const password = process.env.E2E_TEST_USER_PASSWORD ?? ''
  test.skip(!email || !password, 'E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD must be set')

  const auth = new AuthPage(page)
  await auth.login(email, password)
  await auth.expectSignedIn()
  await auth.signOut()
  await auth.expectSignedOut()
})

test('two browsers: vote, reveal, reset, rename, kick', async ({ page, browser, trackedRoomIds }) => {
  const MODERATOR = 'E2E Moderator'
  const PLAYER = 'E2E Player'
  const RENAMED = 'E2E Player Renamed'

  const home = new HomePage(page)
  await home.goto()
  const roomId = await home.createRoom(MODERATOR)
  trackedRoomIds.push(roomId)
  const moderator = new RoomPage(page)

  const playerContext = await browser.newContext()
  try {
    const playerPage = await playerContext.newPage()
    const player = new RoomPage(playerPage)
    await playerPage.goto(`/${roomId}`)
    await player.joinAs(PLAYER)
    await expect(moderator.playerRow(PLAYER)).toBeVisible()

    await moderator.castVote('5')
    await player.castVote('8')
    await moderator.waitVoteConfirmed(PLAYER)
    await player.waitVoteConfirmed(MODERATOR)

    await moderator.reveal()
    await expect(moderator.resultsArea()).toContainText('5')
    await expect(moderator.resultsArea()).toContainText('8')
    await expect(player.resultsArea()).toBeVisible()

    await moderator.newRound()
    await expect(player.resultsArea()).toBeHidden()
    await player.castVote('3')
    await moderator.waitVoteConfirmed(PLAYER)
    await moderator.resetVotes()
    await expect(moderator.playerRow(PLAYER)).toHaveAttribute('data-voted', 'false')
    await expect(player.voteCard('3')).toHaveAttribute('aria-pressed', 'false')

    await player.rename(PLAYER, RENAMED)
    await expect(moderator.playerRow(RENAMED)).toBeVisible()

    await moderator.kick(RENAMED)
    await expect(player.playerRow(RENAMED)).toHaveCount(0)
  } finally {
    await playerContext.close()
  }
})

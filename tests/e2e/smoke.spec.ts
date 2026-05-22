import { test, expect } from '../support/test'
import { HomePage } from '../page-objects/HomePage'
import { RoomPage } from '../page-objects/RoomPage'

test('home → create room → joined as moderator with auto-rejoin', async ({ page, trackedRoomIds, consoleErrors: _consoleErrors }) => {
  const home = new HomePage(page)
  await home.goto()
  const roomId = await home.createRoom('E2E Tester')
  trackedRoomIds.push(roomId)
  const playerName = '[DEV] E2E Tester'

  await expect(
    page.locator(`[data-testid="player-row"][data-player-name="${playerName}"]`),
  ).toBeVisible()

  await expect(page.getByTestId('reveal-button')).toBeVisible()

  const session = await page.evaluate(
    (id) => localStorage.getItem(`storypoker_session_${id}`),
    roomId,
  )
  expect(session).not.toBeNull()
  const parsed = JSON.parse(session!)
  expect(parsed.playerId).toEqual(expect.any(String))
  expect(parsed.playerName).toBe(playerName)
  expect(parsed.lastVisitedAt).toEqual(expect.any(Number))

  await page.reload()
  await expect(
    page.locator(`[data-testid="player-row"][data-player-name="${playerName}"]`),
  ).toBeVisible()
})

test('moderator votes, reveals, starts new round', async ({ page, trackedRoomIds, consoleErrors: _consoleErrors }) => {
  const home = new HomePage(page)
  const room = new RoomPage(page)
  const NAME = 'Moderator Solo'

  const roomId = await home.createRoom(NAME)
  trackedRoomIds.push(roomId)

  await room.castVote('5')
  await room.waitVoteConfirmed(`[DEV] ${NAME}`)

  await room.reveal()
  await expect(room.resultsArea()).toContainText('5')

  await room.newRound()
  await expect(room.voteCard('5')).toBeEnabled()
})

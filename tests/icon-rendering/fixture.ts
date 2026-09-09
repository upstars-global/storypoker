import type { Player } from '~/stores/types'
import players from '../fixtures/data/icon-room.json'

export type HarnessRole = 'guest' | 'player' | 'moderator' | 'authorized-moderator'

export const ROOM_NAME = 'Core Platform'
export const ROOM_STARTED_AT = '2026-09-09T09:00:00.000Z'
export const ROOM_PAUSED_AT = '2026-09-09T09:03:00.000Z'
export const PAUSED_ELAPSED_MS = 180_000

export function makePlayers(): Player[] {
  return structuredClone(players) as Player[]
}

export function moderatorId(): string {
  return makePlayers().find(player => player.is_moderator)!.id
}

export function firstPlayerId(): string {
  return makePlayers()[0]!.id
}

export function currentPlayerId(role: HarnessRole): string | null {
  if (role === 'guest') return null
  if (role === 'player') return firstPlayerId()
  return moderatorId()
}

export function isModeratorRole(role: HarnessRole): boolean {
  return role === 'moderator' || role === 'authorized-moderator'
}

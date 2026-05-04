interface StoredSession {
  playerId: string
  playerName: string
  lastVisitedAt?: string
}

const PREFIX = 'storypoker_session_'

export interface RecentRoomEntry {
  roomId: string
  playerName: string
  lastVisitedAt: string | null
}

export function listRecentRooms(): RecentRoomEntry[] {
  if (typeof localStorage === 'undefined') return []
  const out: RecentRoomEntry[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(PREFIX)) continue
    const roomId = key.slice(PREFIX.length)
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const session = JSON.parse(raw) as StoredSession
      out.push({
        roomId,
        playerName: session.playerName,
        lastVisitedAt: session.lastVisitedAt ?? null,
      })
    } catch {}
  }
  return out.sort((a, b) => {
    if (a.lastVisitedAt && b.lastVisitedAt) return b.lastVisitedAt.localeCompare(a.lastVisitedAt)
    if (a.lastVisitedAt) return -1
    if (b.lastVisitedAt) return 1
    return 0
  })
}

export function touchRecentRoom(roomId: string, playerId: string, playerName: string): void {
  if (typeof localStorage === 'undefined') return
  const session: StoredSession = {
    playerId,
    playerName,
    lastVisitedAt: new Date().toISOString(),
  }
  localStorage.setItem(`${PREFIX}${roomId}`, JSON.stringify(session))
}

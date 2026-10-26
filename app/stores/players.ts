import { create } from 'zustand'
import { getSupabase } from '~/lib/supabase-instance'
import type { Player } from './types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface PlayersState {
  roomId: string | null
  players: Player[]
  pendingVotes: Record<string, string | null>
  visiblePlayers: Player[]
  applyChange: (payload: RealtimePostgresChangesPayload<Player>) => void
  voteOf: (playerId: string) => string | null
  castVote: (playerId: string, card: string | null) => Promise<void>
  clearPendingVotes: () => void
  rename: (playerId: string, name: string) => Promise<void>
  toggleModerator: (playerId: string, value: boolean) => Promise<void>
  setShields: (playerId: string, shields: string[]) => Promise<void>
  kick: (playerId: string) => Promise<void>
  leave: (playerId: string) => Promise<void>
  join: (name: string, userId?: string | null, shields?: string[]) => Promise<Player>
  rejoin: (playerId: string) => Promise<Player>
  findExistingPlayer: (roomIdArg: string, userId: string | null) => Promise<Player | null>
  linkUser: (playerId: string, userId: string) => Promise<void>
  fetchAll: (roomIdArg: string) => Promise<void>
}

function sortVisible(players: Player[]): Player[] {
  return players
    .filter(p => p.left_at === null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

function replacePlayer(players: Player[], playerId: string, patch: (p: Player) => Player): Player[] {
  return players.map(p => (p.id === playerId ? patch(p) : p))
}

export const usePlayersStore = create<PlayersState>()((set, get) => ({
  roomId: null,
  players: [],
  pendingVotes: {},
  visiblePlayers: [],

  applyChange(payload) {
    switch (payload.eventType) {
      case 'INSERT': {
        const row = payload.new
        if (!get().players.some(p => p.id === row.id)) {
          set(s => ({ players: [...s.players, row] }))
        }
        break
      }
      case 'UPDATE': {
        const row = payload.new
        set(s => ({
          players: replacePlayer(s.players, row.id, () => row),
          pendingVotes: s.pendingVotes[row.id] === row.vote ? withoutKey(s.pendingVotes, row.id) : s.pendingVotes,
        }))
        break
      }
      case 'DELETE': {
        const id = payload.old.id
        set(s => ({ players: s.players.filter(p => p.id !== id) }))
        break
      }
    }
  },

  voteOf(playerId) {
    const pending = get().pendingVotes[playerId]
    if (pending !== undefined) return pending
    return get().players.find(p => p.id === playerId)?.vote ?? null
  },

  async castVote(playerId, card) {
    set(s => ({ pendingVotes: { ...s.pendingVotes, [playerId]: card } }))
    try {
      const { error } = await getSupabase()
        .from('players')
        .update({ vote: card })
        .eq('id', playerId)
      if (error) throw error
      set(s => ({
        players: replacePlayer(s.players, playerId, p => ({ ...p, vote: card })),
        pendingVotes: withoutKey(s.pendingVotes, playerId),
      }))
    } catch (e) {
      set(s => ({ pendingVotes: withoutKey(s.pendingVotes, playerId) }))
      throw e
    }
  },

  clearPendingVotes() {
    set({ pendingVotes: {} })
  },

  async rename(playerId, name) {
    await getSupabase().from('players').update({ name }).eq('id', playerId)
  },

  async toggleModerator(playerId, value) {
    await getSupabase().from('players').update({ is_moderator: value }).eq('id', playerId)
  },

  async setShields(playerId, shields) {
    set(s => ({ players: replacePlayer(s.players, playerId, p => ({ ...p, shields })) }))
    const { error } = await getSupabase().from('players').update({ shields }).eq('id', playerId)
    if (error) {
      const roomId = get().roomId
      if (roomId) await get().fetchAll(roomId)
      throw error
    }
  },

  async kick(playerId) {
    await getSupabase()
      .from('players')
      .update({ left_at: new Date().toISOString() })
      .eq('id', playerId)
  },

  async leave(playerId) {
    const roomId = get().roomId
    if (roomId) localStorage.removeItem(`storypoker_session_${roomId}`)
    await getSupabase()
      .from('players')
      .update({ left_at: new Date().toISOString() })
      .eq('id', playerId)
  },

  async join(name, userId = null, shields = []) {
    const roomId = get().roomId
    if (!roomId) throw new Error('roomId not set')
    const { data, error } = await getSupabase()
      .from('players')
      .insert({ room_id: roomId, name, user_id: userId, is_moderator: false, shields })
      .select()
      .single()
    if (error) throw error
    return data as Player
  },

  async rejoin(playerId) {
    const { data, error } = await getSupabase()
      .from('players')
      .update({ left_at: null })
      .eq('id', playerId)
      .select()
      .single()
    if (error) throw error
    return data as Player
  },

  async findExistingPlayer(roomIdArg, userId) {
    const supabase = getSupabase()
    if (userId) {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomIdArg)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
      const found = (data ?? [])[0] as Player | undefined
      if (found) return found
    }
    if (typeof localStorage === 'undefined') return null
    const candidateIds: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('storypoker_session_')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      try {
        const parsed = JSON.parse(raw) as { playerId?: string }
        if (parsed.playerId) candidateIds.push(parsed.playerId)
      } catch {}
    }
    if (candidateIds.length === 0) return null
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomIdArg)
      .in('id', candidateIds)
      .order('created_at', { ascending: false })
      .limit(1)
    return ((data ?? [])[0] as Player | undefined) ?? null
  },

  async linkUser(playerId, userId) {
    set(s => ({ players: replacePlayer(s.players, playerId, p => ({ ...p, user_id: userId })) }))
    await getSupabase().from('players').update({ user_id: userId }).eq('id', playerId)
  },

  async fetchAll(roomIdArg) {
    const { data } = await getSupabase()
      .from('players')
      .select('*')
      .eq('room_id', roomIdArg)
      .order('created_at')
    set({ players: (data ?? []) as Player[] })
  },
}))

usePlayersStore.subscribe((state, previous) => {
  if (state.players !== previous.players) {
    usePlayersStore.setState({ visiblePlayers: sortVisible(state.players) })
  }
})

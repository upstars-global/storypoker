import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { Player } from './types'

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Player
  old: Partial<Player>
}

export const usePlayersStore = defineStore('players', () => {
  const players = ref<Player[]>([])
  const pendingVotes = ref<Record<string, string | null>>({})
  const roomId = ref<string | null>(null)

  const visiblePlayers = computed(() =>
    players.value
      .filter(p => p.left_at === null)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  )

  function applyChange(payload: RealtimePayload) {
    switch (payload.eventType) {
      case 'INSERT':
        if (!players.value.find(p => p.id === payload.new.id)) {
          players.value.push(payload.new)
        }
        break
      case 'UPDATE': {
        const idx = players.value.findIndex(p => p.id === payload.new.id)
        if (idx >= 0) players.value[idx] = payload.new
        if (pendingVotes.value[payload.new.id] === payload.new.vote) {
          delete pendingVotes.value[payload.new.id]
        }
        break
      }
      case 'DELETE':
        players.value = players.value.filter(p => p.id !== (payload.old as any).id)
        break
    }
  }

  function voteOf(playerId: string): string | null {
    if (pendingVotes.value[playerId] !== undefined) return pendingVotes.value[playerId]
    return players.value.find(p => p.id === playerId)?.vote ?? null
  }

  async function castVote(playerId: string, card: string | null) {
    pendingVotes.value[playerId] = card
    try {
      const { error } = await getSupabase()
        .from('players')
        .update({ vote: card })
        .eq('id', playerId)
      if (error) throw error
    } catch (e) {
      delete pendingVotes.value[playerId]
      throw e
    }
  }

  function clearPendingVotes() {
    pendingVotes.value = {}
  }

  async function rename(playerId: string, name: string) {
    await getSupabase().from('players').update({ name }).eq('id', playerId)
  }

  async function toggleModerator(playerId: string, value: boolean) {
    await getSupabase().from('players').update({ is_moderator: value }).eq('id', playerId)
  }

  async function setShields(playerId: string, shields: string[]) {
    const idx = players.value.findIndex(p => p.id === playerId)
    if (idx >= 0) players.value[idx] = { ...players.value[idx], shields }
    const { error } = await getSupabase().from('players').update({ shields }).eq('id', playerId)
    if (error) {
      if (roomId.value) await fetchAll(roomId.value)
      throw error
    }
  }

  async function kick(playerId: string) {
    await getSupabase()
      .from('players')
      .update({ left_at: new Date().toISOString() })
      .eq('id', playerId)
  }

  async function leave(playerId: string) {
    if (roomId.value) localStorage.removeItem(`storypoker_session_${roomId.value}`)
    await getSupabase()
      .from('players')
      .update({ left_at: new Date().toISOString() })
      .eq('id', playerId)
  }

  async function join(name: string, userId: string | null = null, shields: string[] = []): Promise<Player> {
    if (!roomId.value) throw new Error('roomId not set')
    const { data, error } = await getSupabase()
      .from('players')
      .insert({ room_id: roomId.value, name, user_id: userId, is_moderator: false, shields })
      .select()
      .single()
    if (error) throw error
    return data as Player
  }

  async function rejoin(playerId: string): Promise<Player> {
    const { data, error } = await getSupabase()
      .from('players')
      .update({ left_at: null })
      .eq('id', playerId)
      .select()
      .single()
    if (error) throw error
    return data as Player
  }

  async function findExistingPlayer(roomIdArg: string, userId: string | null): Promise<Player | null> {
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
  }

  async function linkUser(playerId: string, userId: string) {
    const idx = players.value.findIndex(p => p.id === playerId)
    const existing = idx >= 0 ? players.value[idx] : null
    if (existing) players.value[idx] = { ...existing, user_id: userId }
    await getSupabase().from('players').update({ user_id: userId }).eq('id', playerId)
  }

  async function fetchAll(roomIdArg: string): Promise<void> {
    const { data } = await getSupabase()
      .from('players')
      .select('*')
      .eq('room_id', roomIdArg)
      .order('created_at')
    players.value = (data ?? []) as Player[]
  }

  return {
    roomId, players, pendingVotes, visiblePlayers,
    applyChange, voteOf, castVote, clearPendingVotes,
    rename, toggleModerator, setShields, kick, leave, join, rejoin, findExistingPlayer, linkUser, fetchAll,
  }
})

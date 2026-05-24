import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import { getDeck, type DeckPresetId } from '~/utils/cardDecks'
import { usePlayersStore } from './players'
import type { RoomState, RoundHistoryVote } from './types'

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: RoomState
  old: Partial<RoomState>
}

export const useRoomStore = defineStore('room', () => {
  const roomId = ref<string | null>(null)
  const roomState = ref<RoomState | null>(null)

  function applyChange(payload: RealtimePayload) {
    if (payload.eventType === 'UPDATE') {
      roomState.value = payload.new
    }
  }

  async function reveal() {
    if (!roomId.value || !roomState.value || roomState.value.phase === 'revealed') return
    const supabase = getSupabase()
    const playersStore = usePlayersStore()
    const votes: RoundHistoryVote[] = playersStore.visiblePlayers
      .filter(p => p.vote !== null)
      .map(p => ({ player_id: p.id, name: p.name, vote: p.vote as string }))

    const revealedAt = new Date()
    const update: Partial<Pick<RoomState, 'phase' | 'paused_at' | 'paused_elapsed_ms'>> = { phase: 'revealed' }
    if (roomState.value.paused_at) {
      const pausedSince = new Date(roomState.value.paused_at).getTime()
      update.paused_at = null
      update.paused_elapsed_ms = Math.max(
        0,
        (roomState.value.paused_elapsed_ms ?? 0) + (revealedAt.getTime() - pausedSince),
      )
    }

    await supabase.from('room_state').update(update).eq('room_id', roomId.value)

    if (votes.length >= 2) {
      await supabase.from('round_history').insert({
        room_id: roomId.value,
        started_at: roomState.value.round_started_at,
        revealed_at: revealedAt.toISOString(),
        votes,
      })
    }
  }

  async function startNewRound() {
    if (!roomId.value) return
    const supabase = getSupabase()
    await Promise.all([
      supabase.from('players').update({ vote: null }).eq('room_id', roomId.value),
      supabase
        .from('room_state')
        .update({
          phase: 'voting',
          round_started_at: new Date().toISOString(),
          paused_at: null,
          paused_elapsed_ms: 0,
        })
        .eq('room_id', roomId.value),
    ])
  }

  async function resetTimer() {
    if (!roomId.value) return
    await getSupabase()
      .from('room_state')
      .update({
        round_started_at: new Date().toISOString(),
        paused_at: null,
        paused_elapsed_ms: 0,
      })
      .eq('room_id', roomId.value)
  }

  async function pauseTimer() {
    if (!roomId.value || !roomState.value || roomState.value.paused_at) return
    await getSupabase()
      .from('room_state')
      .update({ paused_at: new Date().toISOString() })
      .eq('room_id', roomId.value)
  }

  async function resumeTimer() {
    if (!roomId.value || !roomState.value || !roomState.value.paused_at) return
    const pausedSince = new Date(roomState.value.paused_at).getTime()
    const next = Math.max(0, (roomState.value.paused_elapsed_ms ?? 0) + (Date.now() - pausedSince))
    await getSupabase()
      .from('room_state')
      .update({ paused_at: null, paused_elapsed_ms: next })
      .eq('room_id', roomId.value)
  }

  async function adjustTimer(deltaMs: number) {
    if (!roomId.value || !roomState.value) return
    const start = new Date(roomState.value.round_started_at).getTime()
    const pivot = roomState.value.paused_at
      ? new Date(roomState.value.paused_at).getTime()
      : Date.now()
    const cap = pivot - (roomState.value.paused_elapsed_ms ?? 0)
    const nextStart = Math.min(cap, start - deltaMs)
    await getSupabase()
      .from('room_state')
      .update({ round_started_at: new Date(nextStart).toISOString() })
      .eq('room_id', roomId.value)
  }

  async function saveCardDeck(cards: string[]) {
    if (!roomId.value) return
    await getSupabase().from('room_state').update({ active_cards: cards }).eq('room_id', roomId.value)
  }

  async function setDeckPreset(presetId: DeckPresetId) {
    if (!roomId.value) return
    const preset = getDeck(presetId)
    await getSupabase()
      .from('room_state')
      .update({ deck_preset: presetId, active_cards: preset.defaultActive })
      .eq('room_id', roomId.value)
  }

  function generateRoomId(): string {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
  }

  async function create(): Promise<string> {
    const id = generateRoomId()
    const supabase = getSupabase()
    const { error: roomErr } = await supabase.from('rooms').insert({ id })
    if (roomErr) throw roomErr
    const { error: stateErr } = await supabase.from('room_state').insert({ room_id: id })
    if (stateErr) throw stateErr
    return id
  }

  async function resolveRoom(input: string): Promise<{ id: string; slug: string | null; name: string | null } | null> {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('rooms')
      .select('id, slug, name')
      .or(`id.eq.${input},slug.eq.${input}`)
      .maybeSingle()
    return data ?? null
  }

  async function setRoomName(name: string | null, slug: string | null): Promise<void> {
    if (!roomId.value) return
    const supabase = getSupabase()
    const { error } = await supabase.from('rooms').update({ name, slug }).eq('id', roomId.value)
    if (error) {
      if ((error as any).code === '23505') {
        const e = new Error('room_slug_taken') as Error & { code?: string }
        e.code = 'room_slug_taken'
        throw e
      }
      throw error
    }
  }

  return {
    roomId,
    roomState,
    applyChange,
    reveal,
    startNewRound,
    saveCardDeck,
    setDeckPreset,
    create,
    resolveRoom,
    setRoomName,
    resetTimer,
    pauseTimer,
    resumeTimer,
    adjustTimer,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSupabase } from '~/lib/supabase-instance'
import type { RoomState } from './types'

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
    if (!roomId.value) return
    await getSupabase().from('room_state').update({ phase: 'revealed' }).eq('room_id', roomId.value)
  }

  async function startNewRound() {
    if (!roomId.value) return
    const supabase = getSupabase()
    await Promise.all([
      supabase.from('players').update({ vote: null }).eq('room_id', roomId.value),
      supabase
        .from('room_state')
        .update({ phase: 'voting', round_started_at: new Date().toISOString() })
        .eq('room_id', roomId.value),
    ])
  }

  async function saveCardDeck(cards: string[]) {
    if (!roomId.value) return
    await getSupabase().from('room_state').update({ active_cards: cards }).eq('room_id', roomId.value)
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

  return { roomId, roomState, applyChange, reveal, startNewRound, saveCardDeck, create }
})

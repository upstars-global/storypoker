interface Player {
  id: string
  room_id: string
  name: string
  is_moderator: boolean
  vote: string | null
  is_online: boolean
  user_id: string | null
  created_at: string
  left_at: string | null
}

interface RoomState {
  room_id: string
  phase: 'voting' | 'revealed'
  active_cards: string[]
  round_started_at: string
}

export function useRoom(roomId: string) {
  const { $supabase } = useNuxtApp()
  const players = ref<Player[]>([])
  const roomState = ref<RoomState | null>(null)
  let playersChannel: any = null
  let stateChannel: any = null

  async function fetchInitialData() {
    const [{ data: pData }, { data: sData }] = await Promise.all([
      $supabase.from('players').select('*').eq('room_id', roomId).is('left_at', null).order('created_at'),
      $supabase.from('room_state').select('*').eq('room_id', roomId).single(),
    ])
    players.value = pData ?? []
    roomState.value = sData ?? null
  }

  function subscribeRealtime() {
    playersChannel = $supabase
      .channel(`players:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await $supabase.from('players').select('*').eq('room_id', roomId).is('left_at', null).order('created_at')
          players.value = data ?? []
        }
      )
      .subscribe()

    stateChannel = $supabase
      .channel(`room_state:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_state', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await $supabase.from('room_state').select('*').eq('room_id', roomId).single()
          roomState.value = data ?? null
        }
      )
      .subscribe()
  }

  function unsubscribe() {
    playersChannel?.unsubscribe()
    stateChannel?.unsubscribe()
  }

  async function revealEstimates() {
    await $supabase.from('room_state').update({ phase: 'revealed' }).eq('room_id', roomId)
  }

  async function startNewRound() {
    await Promise.all([
      $supabase.from('players').update({ vote: null }).eq('room_id', roomId),
      $supabase.from('room_state').update({ phase: 'voting', round_started_at: new Date().toISOString() }).eq('room_id', roomId),
    ])
  }

  async function saveCardDeck(cards: string[]) {
    await $supabase.from('room_state').update({ active_cards: cards }).eq('room_id', roomId)
  }

  return {
    players,
    roomState,
    fetchInitialData,
    subscribeRealtime,
    unsubscribe,
    revealEstimates,
    startNewRound,
    saveCardDeck,
  }
}

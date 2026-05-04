export interface Player {
  id: string
  room_id: string
  name: string
  is_moderator: boolean
  vote: string | null
  user_id: string | null
  created_at: string
  left_at: string | null
}

export interface RoomState {
  room_id: string
  phase: 'voting' | 'revealed'
  active_cards: string[]
  round_started_at: string
}

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'

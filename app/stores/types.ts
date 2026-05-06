import type { DeckPresetId } from '~/utils/cardDecks'

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
  deck_preset: DeckPresetId
  active_cards: string[]
  round_started_at: string
}

export interface RoundHistoryVote {
  player_id: string
  name: string
  vote: string
}

export interface RoundHistory {
  id: string
  room_id: string
  started_at: string
  revealed_at: string
  votes: RoundHistoryVote[]
  created_at: string
}

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'

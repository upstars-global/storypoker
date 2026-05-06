import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { setSupabase, resetSupabase } from '../../lib/supabase-instance'
import { useRoomStore } from '../room'
import { usePlayersStore } from '../players'
import type { Player, RoomState } from '../types'

function fakeRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: 'r1',
    phase: 'voting',
    deck_preset: 'scrum',
    active_cards: ['1', '2', '3'],
    round_started_at: '2026-05-04T00:00:00Z',
    ...overrides,
  }
}

function fakePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    room_id: 'r1',
    name: 'Alice',
    is_moderator: false,
    vote: null,
    user_id: null,
    created_at: '2026-05-04T00:00:00Z',
    left_at: null,
    ...overrides,
  }
}

describe('roomStore.applyChange', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetSupabase()
  })

  it('applies UPDATE to roomState', () => {
    const store = useRoomStore()
    store.roomState = fakeRoomState({ phase: 'voting' })
    store.applyChange({
      eventType: 'UPDATE',
      new: fakeRoomState({ phase: 'revealed' }),
      old: {} as any,
    } as any)
    expect(store.roomState?.phase).toBe('revealed')
  })

  it('ignores INSERT/DELETE on room_state (singleton row)', () => {
    const store = useRoomStore()
    store.roomState = fakeRoomState()
    store.applyChange({ eventType: 'INSERT', new: fakeRoomState({ phase: 'revealed' }) } as any)
    expect(store.roomState.phase).toBe('voting')
  })
})

describe('roomStore actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetSupabase()
  })

  it('reveal() sends update with phase=revealed (and skips history with <2 votes)', async () => {
    const calls: Array<{ table: string; op: string; arg: any }> = []
    setSupabase({
      from: (table: string) => ({
        update: (arg: any) => {
          calls.push({ table, op: 'update', arg })
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        },
        insert: (arg: any) => {
          calls.push({ table, op: 'insert', arg })
          return Promise.resolve({ error: null })
        },
      }),
    } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState()
    const players = usePlayersStore()
    players.players = [fakePlayer({ id: 'p1', vote: '5' })]
    await store.reveal()
    expect(calls.find(c => c.table === 'room_state' && c.op === 'update')?.arg).toEqual({ phase: 'revealed' })
    expect(calls.find(c => c.table === 'round_history')).toBeUndefined()
  })

  it('reveal() writes round_history when votes>=2', async () => {
    const calls: Array<{ table: string; op: string; arg: any }> = []
    setSupabase({
      from: (table: string) => ({
        update: (arg: any) => {
          calls.push({ table, op: 'update', arg })
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        },
        insert: (arg: any) => {
          calls.push({ table, op: 'insert', arg })
          return Promise.resolve({ error: null })
        },
      }),
    } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState()
    const players = usePlayersStore()
    players.players = [
      fakePlayer({ id: 'p1', name: 'Alice', vote: '5' }),
      fakePlayer({ id: 'p2', name: 'Bob', vote: '8' }),
      fakePlayer({ id: 'p3', name: 'Empty', vote: null }),
    ]
    await store.reveal()
    const hist = calls.find(c => c.table === 'round_history' && c.op === 'insert')
    expect(hist?.arg).toMatchObject({
      room_id: 'r1',
      started_at: '2026-05-04T00:00:00Z',
      votes: [
        { player_id: 'p1', name: 'Alice', vote: '5' },
        { player_id: 'p2', name: 'Bob', vote: '8' },
      ],
    })
    expect(typeof hist?.arg.revealed_at).toBe('string')
  })

  it('startNewRound() resets player votes and sets phase=voting + round_started_at', async () => {
    const calls: Array<{ table: string; arg: any }> = []
    setSupabase({
      from: (table: string) => ({
        update: (arg: any) => {
          calls.push({ table, arg })
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        },
      }),
    } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.startNewRound()
    const playersCall = calls.find(c => c.table === 'players')
    const stateCall = calls.find(c => c.table === 'room_state')
    expect(playersCall?.arg).toEqual({ vote: null })
    expect(stateCall?.arg.phase).toBe('voting')
    expect(typeof stateCall?.arg.round_started_at).toBe('string')
  })

  it('saveCardDeck(cards) sends update with active_cards', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.saveCardDeck(['1', '5'])
    expect(update).toHaveBeenCalledWith({ active_cards: ['1', '5'] })
  })

  it('setDeckPreset(id) sends deck_preset + defaultActive', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.setDeckPreset('boolean')
    expect(update).toHaveBeenCalledWith({
      deck_preset: 'boolean',
      active_cards: ['True', 'False', '?', '☕'],
    })
  })
})

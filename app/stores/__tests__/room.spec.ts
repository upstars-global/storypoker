import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setSupabase, resetSupabase } from '../../lib/supabase-instance'
import { useRoomStore } from '../room'
import type { RoomState } from '../types'

function fakeRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: 'r1',
    phase: 'voting',
    active_cards: ['1', '2', '3'],
    round_started_at: '2026-05-04T00:00:00Z',
    ...overrides,
  }
}

describe('roomStore.applyChange', () => {
  beforeEach(() => resetSupabase())

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
  beforeEach(() => resetSupabase())

  it('reveal() sends update with phase=revealed', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.reveal()
    expect(update).toHaveBeenCalledWith({ phase: 'revealed' })
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
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { useRoomStore, backgroundDisplayUrl } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import type { Player, RoomState } from '~/stores/types'

function fakeRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    room_id: 'r1',
    phase: 'voting',
    deck_preset: 'scrum',
    active_cards: ['1', '2', '3'],
    round_started_at: '2026-05-04T00:00:00Z',
    paused_at: null,
    paused_elapsed_ms: 0,
    poll_question: null,
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
    shields: [],
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

  it('reveal() finalizes active pause duration before revealing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-04T00:01:00Z'))
    try {
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
      store.roomState = fakeRoomState({
        paused_at: '2026-05-04T00:00:30Z',
        paused_elapsed_ms: 2000,
      })
      const players = usePlayersStore()
      players.players = [fakePlayer({ id: 'p1', vote: '5' })]
      await store.reveal()
      expect(calls.find(c => c.table === 'room_state' && c.op === 'update')?.arg).toEqual({
        phase: 'revealed',
        paused_at: null,
        paused_elapsed_ms: 32000,
      })
    } finally {
      vi.useRealTimers()
    }
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
    expect(stateCall?.arg.paused_at).toBeNull()
    expect(stateCall?.arg.paused_elapsed_ms).toBe(0)
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
      poll_question: null,
    })
  })

  it('setDeckPreset(id) writes the preset defaultQuestion into poll_question when it has one', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await store.setDeckPreset('goal_clarity')
    expect(update).toHaveBeenCalledWith({
      deck_preset: 'goal_clarity',
      active_cards: ['1', '2', '3', '4', '5'],
      poll_question: 'Наскільки чітко я розумію Sprint Goals?',
    })
  })
})

describe('roomStore timer actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetSupabase()
  })

  it('resetTimer() zeroes paused state and updates round_started_at', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({ paused_at: '2026-05-04T00:00:30Z', paused_elapsed_ms: 5000 })
    await store.resetTimer()
    const arg = update.mock.calls[0]![0]
    expect(arg.paused_at).toBeNull()
    expect(arg.paused_elapsed_ms).toBe(0)
    expect(typeof arg.round_started_at).toBe('string')
  })

  it('pauseTimer() sets paused_at when not paused', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({ paused_at: null })
    await store.pauseTimer()
    expect(update).toHaveBeenCalledOnce()
    expect(typeof update.mock.calls[0]![0].paused_at).toBe('string')
  })

  it('pauseTimer() is no-op when already paused', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({ paused_at: '2026-05-04T00:00:30Z' })
    await store.pauseTimer()
    expect(update).not.toHaveBeenCalled()
  })

  it('resumeTimer() adds pause delta to paused_elapsed_ms', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-04T00:01:00Z'))
    try {
      const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      setSupabase({ from: () => ({ update }) } as any)
      const store = useRoomStore()
      store.roomId = 'r1'
      store.roomState = fakeRoomState({ paused_at: '2026-05-04T00:00:30Z', paused_elapsed_ms: 2000 })
      await store.resumeTimer()
      expect(update).toHaveBeenCalledWith({ paused_at: null, paused_elapsed_ms: 32000 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('resumeTimer() is no-op when not paused', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({ paused_at: null })
    await store.resumeTimer()
    expect(update).not.toHaveBeenCalled()
  })

  it('adjustTimer(+10000) shifts round_started_at 10s back', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({
      round_started_at: '2026-05-04T00:00:00.000Z',
      paused_at: '2026-05-04T00:00:30.000Z',
    })
    await store.adjustTimer(10000)
    expect(update).toHaveBeenCalledWith({ round_started_at: '2026-05-03T23:59:50.000Z' })
  })

  it('adjustTimer(-10000) caps round_started_at at pivot to avoid negative elapsed', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({
      round_started_at: '2026-05-04T00:00:00.000Z',
      paused_at: '2026-05-04T00:00:05.000Z',
    })
    await store.adjustTimer(-10000)
    expect(update).toHaveBeenCalledWith({ round_started_at: '2026-05-04T00:00:05.000Z' })
  })

  it('adjustTimer(-10000) caps at pivot minus accumulated pause time', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase({ from: () => ({ update }) } as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    store.roomState = fakeRoomState({
      round_started_at: '2026-05-04T00:00:00.000Z',
      paused_at: '2026-05-04T00:00:05.000Z',
      paused_elapsed_ms: 2000,
    })
    await store.adjustTimer(-10000)
    expect(update).toHaveBeenCalledWith({ round_started_at: '2026-05-04T00:00:03.000Z' })
  })

  it('preserves adjusted start and accumulated pause across pause, resume, and reveal', async () => {
    vi.useFakeTimers()
    try {
      const updates: any[] = []
      const store = useRoomStore()
      setSupabase({
        from: () => ({
          update: (arg: any) => {
            updates.push(arg)
            store.roomState = { ...store.roomState!, ...arg }
            return { eq: vi.fn().mockResolvedValue({ error: null }) }
          },
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any)
      store.roomId = 'r1'
      store.roomState = fakeRoomState({ round_started_at: '2026-05-04T00:00:00.000Z' })
      const players = usePlayersStore()
      players.players = [fakePlayer({ id: 'p1', vote: '5' })]

      vi.setSystemTime(new Date('2026-05-04T00:00:10.000Z'))
      await store.pauseTimer()
      await store.adjustTimer(30000)
      expect(store.roomState.round_started_at).toBe('2026-05-03T23:59:30.000Z')

      vi.setSystemTime(new Date('2026-05-04T00:00:20.000Z'))
      await store.resumeTimer()
      expect(store.roomState.paused_at).toBeNull()
      expect(store.roomState.paused_elapsed_ms).toBe(10000)

      vi.setSystemTime(new Date('2026-05-04T00:01:00.000Z'))
      await store.reveal()
      expect(updates.at(-1)).toEqual({ phase: 'revealed' })
      expect(store.roomState.round_started_at).toBe('2026-05-03T23:59:30.000Z')
      expect(store.roomState.paused_elapsed_ms).toBe(10000)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('roomStore background', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetSupabase()
  })

  function fakeClient() {
    const bucket = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    const client = {
      storage: { from: vi.fn().mockReturnValue(bucket) },
      from: vi.fn().mockReturnValue({ update }),
    }
    return { bucket, update, eq, client }
  }

  it('uploads to the fixed room path, then points the room row at it', async () => {
    const { bucket, update, eq, client } = fakeClient()
    setSupabase(client as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    const blob = new Blob(['x'], { type: 'image/webp' })
    const result = await store.uploadBackground(blob, 0.5)
    expect(client.storage.from).toHaveBeenCalledWith('room-backgrounds')
    expect(bucket.upload).toHaveBeenCalledWith('r1/background.webp', blob, { upsert: true, contentType: 'image/webp' })
    expect(client.from).toHaveBeenCalledWith('rooms')
    expect(update.mock.calls[0]![0].background_url).toBe('r1/background.webp')
    expect(update.mock.calls[0]![0].background_updated_at).toBeTruthy()
    expect(update.mock.calls[0]![0].background_opacity).toBe(0.5)
    expect(eq).toHaveBeenCalledWith('id', 'r1')
    expect(result?.background_url).toBe('r1/background.webp')
  })

  it('does not touch the room row when the upload fails', async () => {
    const { bucket, update, client } = fakeClient()
    bucket.upload.mockResolvedValue({ error: new Error('denied') })
    setSupabase(client as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    await expect(store.uploadBackground(new Blob(), 0.65)).rejects.toThrow('denied')
    expect(update).not.toHaveBeenCalled()
  })

  it('updates only the opacity', async () => {
    const { bucket, update, client } = fakeClient()
    setSupabase(client as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    expect(await store.setBackgroundOpacity(0.3)).toEqual({ background_opacity: 0.3 })
    expect(update).toHaveBeenCalledWith({ background_opacity: 0.3 })
    expect(bucket.upload).not.toHaveBeenCalled()
  })

  it('clears the room row before removing the file and tolerates storage failure', async () => {
    const { bucket, update, client } = fakeClient()
    bucket.remove.mockRejectedValue(new Error('gone'))
    setSupabase(client as any)
    const store = useRoomStore()
    store.roomId = 'r1'
    const result = await store.removeBackground()
    expect(update.mock.calls[0]![0].background_url).toBeNull()
    expect(update.mock.invocationCallOrder[0]!).toBeLessThan(bucket.remove.mock.invocationCallOrder[0]!)
    expect(bucket.remove).toHaveBeenCalledWith(['r1/background.webp'])
    expect(result?.background_url).toBeNull()
  })
})

describe('backgroundDisplayUrl', () => {
  beforeEach(() => resetSupabase())

  it('builds a cache-busted public URL for a well-formed path', () => {
    const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn/${path}` } }))
    setSupabase({ storage: { from: vi.fn().mockReturnValue({ getPublicUrl }) } } as any)
    expect(backgroundDisplayUrl('AbC12345/background.webp', '2026-10-12T10:00:00Z'))
      .toBe('https://cdn/AbC12345/background.webp?v=2026-10-12T10%3A00%3A00Z')
  })

  it('rejects paths that could break out of a CSS url()', () => {
    setSupabase({ storage: { from: vi.fn() } } as any)
    expect(backgroundDisplayUrl('x")/background.webp', null)).toBeNull()
    expect(backgroundDisplayUrl('r1/other.png', null)).toBeNull()
  })
})

describe('roomStore.resolveRoom', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetSupabase()
  })

  function clientReturning(row: unknown) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: row })
    const or = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ or })
    return { select, client: { from: vi.fn().mockReturnValue({ select }) } }
  }

  it('defaults background fields to null for rows from before the background migration', async () => {
    const { client } = clientReturning({ id: 'r1', slug: null, name: 'Team', created_at: null })
    setSupabase(client as any)
    expect(await useRoomStore().resolveRoom('r1')).toEqual({
      id: 'r1', slug: null, name: 'Team', background_url: null, background_updated_at: null, background_opacity: null,
    })
  })

  it('returns null for an unknown room', async () => {
    const { client } = clientReturning(null)
    setSupabase(client as any)
    expect(await useRoomStore().resolveRoom('nope')).toBeNull()
  })
})

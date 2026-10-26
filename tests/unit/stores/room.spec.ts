import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setSupabase, resetSupabase } from '~/lib/supabase-instance'
import { useRoomStore, backgroundDisplayUrl } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { useAuthStore } from '~/stores/auth'
import type { Player, RoomState } from '~/stores/types'
import type { User } from '@supabase/supabase-js'
import { asSupabase, changePayload } from '../../support/helpers/fakeSupabase'
import { resetStores } from '../../support/helpers/resetStores'

const state = () => useRoomStore.getState()

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

type UpdateQuery = Promise<{ error: null }> & {
  eq: (column: string, value: unknown) => UpdateQuery
  neq: (column: string, value: unknown) => UpdateQuery
  select: (columns: string) => Promise<{ data: { room_id: string }[] | null; error: { message: string } | null }>
}

function updateQuery(
  updatedRows: { room_id: string }[] | null = [{ room_id: 'r1' }],
  filters: [string, string, unknown][] = [],
  error: { message: string } | null = null,
): UpdateQuery {
  const query: UpdateQuery = Object.assign(Promise.resolve({ error: null as null }), {
    eq: (column: string, value: unknown) => { filters.push(['eq', column, value]); return query },
    neq: (column: string, value: unknown) => { filters.push(['neq', column, value]); return query },
    select: () => Promise.resolve({ data: updatedRows, error }),
  })
  return query
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
  beforeEach(async () => {
    resetSupabase()
    await resetStores()
  })

  it('applies UPDATE to roomState', () => {
    useRoomStore.setState({ roomState: fakeRoomState({ phase: 'voting' }) })
    state().applyChange(changePayload<RoomState>('UPDATE', { new: fakeRoomState({ phase: 'revealed' }) }))
    expect(state().roomState?.phase).toBe('revealed')
  })

  it('ignores INSERT/DELETE on room_state (singleton row)', () => {
    useRoomStore.setState({ roomState: fakeRoomState() })
    state().applyChange(changePayload<RoomState>('INSERT', { new: fakeRoomState({ phase: 'revealed' }) }))
    expect(state().roomState?.phase).toBe('voting')
  })
})

describe('roomStore actions', () => {
  beforeEach(async () => {
    resetSupabase()
    await resetStores()
  })

  it('reveal() sends update with phase=revealed (and skips history with <2 votes)', async () => {
    const calls: Array<{ table: string; op: string; arg: Record<string, unknown> }> = []
    setSupabase(asSupabase({
      from: (table: string) => ({
        update: (arg: Record<string, unknown>) => {
          calls.push({ table, op: 'update', arg })
          return updateQuery()
        },
        insert: (arg: Record<string, unknown>) => {
          calls.push({ table, op: 'insert', arg })
          return Promise.resolve({ error: null })
        },
      }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: '5' })] })
    await state().reveal()
    expect(calls.find(c => c.table === 'room_state' && c.op === 'update')?.arg).toEqual({ phase: 'revealed' })
    expect(calls.find(c => c.table === 'round_history')).toBeUndefined()
  })

  it('reveal() writes round_history when votes>=2', async () => {
    const calls: Array<{ table: string; op: string; arg: Record<string, unknown> }> = []
    setSupabase(asSupabase({
      from: (table: string) => ({
        update: (arg: Record<string, unknown>) => {
          calls.push({ table, op: 'update', arg })
          return updateQuery()
        },
        insert: (arg: Record<string, unknown>) => {
          calls.push({ table, op: 'insert', arg })
          return Promise.resolve({ error: null })
        },
      }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    usePlayersStore.setState({ players: [
      fakePlayer({ id: 'p1', name: 'Alice', vote: '5' }),
      fakePlayer({ id: 'p2', name: 'Bob', vote: '8' }),
      fakePlayer({ id: 'p3', name: 'Empty', vote: null }),
    ] })
    await state().reveal()
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

  it('reveal() writes round_history only when its update moved the round out of voting', async () => {
    const filters: [string, string, unknown][] = []
    const insert = vi.fn().mockResolvedValue({ error: null })
    const revealedState = fakeRoomState({ phase: 'revealed' })
    const single = vi.fn().mockResolvedValue({ data: revealedState, error: null })
    const refetch: unknown[][] = []
    setSupabase(asSupabase({
      from: (table: string) => ({
        update: () => updateQuery([], filters),
        insert,
        select: (columns: string) => ({
          eq: (column: string, value: unknown) => {
            refetch.push([table, columns, column, value])
            return { single }
          },
        }),
      }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    usePlayersStore.setState({ players: [
      fakePlayer({ id: 'p1', name: 'Alice', vote: '5' }),
      fakePlayer({ id: 'p2', name: 'Bob', vote: '8' }),
    ] })
    await state().reveal()
    expect(filters).toEqual([['eq', 'room_id', 'r1'], ['neq', 'phase', 'revealed']])
    expect(insert).not.toHaveBeenCalled()
    expect(refetch).toEqual([['room_state', '*', 'room_id', 'r1']])
    expect(state().roomState).toEqual(revealedState)
  })

  it('reveal() keeps the store when the room or its state changed during the refetch', async () => {
    const newerState = fakeRoomState({ room_id: 'r2' })
    setSupabase(asSupabase({
      from: () => ({
        update: () => updateQuery([]),
        select: () => ({
          eq: () => ({
            single: () => {
              useRoomStore.setState({ roomId: 'r2', roomState: newerState })
              return Promise.resolve({ data: fakeRoomState({ phase: 'revealed' }), error: null })
            },
          }),
        }),
      }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    await state().reveal()
    expect(state().roomState).toBe(newerState)
  })

  it('reveal() logs a failed refetch', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = { message: 'network down' }
    setSupabase(asSupabase({
      from: () => ({
        update: () => updateQuery([]),
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error }) }) }),
      }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    await state().reveal()
    expect(consoleError).toHaveBeenCalledWith('[reveal] room_state refetch failed:', error)
    expect(state().roomState?.phase).toBe('voting')
    consoleError.mockRestore()
  })

  it('reveal() logs a failed update and writes no round_history', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = { message: 'network down' }
    setSupabase(asSupabase({
      from: () => ({ update: () => updateQuery(null, [], error), insert }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    usePlayersStore.setState({ players: [
      fakePlayer({ id: 'p1', name: 'Alice', vote: '5' }),
      fakePlayer({ id: 'p2', name: 'Bob', vote: '8' }),
    ] })
    await state().reveal()
    expect(insert).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('[reveal] room_state update failed:', error)
    expect(state().roomState?.phase).toBe('voting')
    consoleError.mockRestore()
  })

  it('reveal() finalizes active pause duration before revealing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-04T00:01:00Z'))
    try {
      const calls: Array<{ table: string; op: string; arg: Record<string, unknown> }> = []
      setSupabase(asSupabase({
        from: (table: string) => ({
          update: (arg: Record<string, unknown>) => {
            calls.push({ table, op: 'update', arg })
            return updateQuery()
          },
          insert: (arg: Record<string, unknown>) => {
            calls.push({ table, op: 'insert', arg })
            return Promise.resolve({ error: null })
          },
        }),
      }))
      useRoomStore.setState({ roomId: 'r1' })
      useRoomStore.setState({ roomState: fakeRoomState({
        paused_at: '2026-05-04T00:00:30Z',
        paused_elapsed_ms: 2000,
      }) })
      usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: '5' })] })
      await state().reveal()
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
    const calls: Array<{ table: string; arg: Record<string, unknown> }> = []
    setSupabase(asSupabase({
      from: (table: string) => ({
        update: (arg: Record<string, unknown>) => {
          calls.push({ table, arg })
          return { eq: vi.fn().mockResolvedValue({ error: null }) }
        },
      }),
    }))
    useRoomStore.setState({ roomId: 'r1' })
    await state().startNewRound()
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
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    await state().saveCardDeck(['1', '5'])
    expect(update).toHaveBeenCalledWith({ active_cards: ['1', '5'] })
  })

  it('setDeckPreset(id) sends deck_preset + defaultActive', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    await state().setDeckPreset('boolean')
    expect(update).toHaveBeenCalledWith({
      deck_preset: 'boolean',
      active_cards: ['True', 'False', '?', '☕'],
      poll_question: null,
    })
  })

  it('setDeckPreset(id) writes the preset defaultQuestion into poll_question when it has one', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    await state().setDeckPreset('goal_clarity')
    expect(update).toHaveBeenCalledWith({
      deck_preset: 'goal_clarity',
      active_cards: ['1', '2', '3', '4', '5'],
      poll_question: 'Наскільки чітко я розумію Sprint Goals?',
    })
  })
})

describe('roomStore timer actions', () => {
  beforeEach(async () => {
    resetSupabase()
    await resetStores()
  })

  it('resetTimer() zeroes paused state and updates round_started_at', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({ paused_at: '2026-05-04T00:00:30Z', paused_elapsed_ms: 5000 }) })
    await state().resetTimer()
    const arg = update.mock.calls[0]![0]
    expect(arg.paused_at).toBeNull()
    expect(arg.paused_elapsed_ms).toBe(0)
    expect(typeof arg.round_started_at).toBe('string')
  })

  it('resetTimer(expectedStartedAt) only resets the voting round it was asked about', async () => {
    const filters: [string, unknown][] = []
    type FilterBuilder = Promise<{ error: null }> & { eq: (column: string, value: unknown) => FilterBuilder }
    const builder: FilterBuilder = Object.assign(Promise.resolve({ error: null as null }), {
      eq: (column: string, value: unknown) => { filters.push([column, value]); return builder },
    })
    setSupabase(asSupabase({ from: () => ({ update: () => builder }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    await state().resetTimer('2026-10-21T00:00:00+00:00')
    expect(filters).toEqual([['room_id', 'r1'], ['round_started_at', '2026-10-21T00:00:00+00:00'], ['phase', 'voting']])
  })

  it('resetTimer() rejects when the update fails', async () => {
    const failure = { message: 'denied' }
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: failure }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState() })
    await expect(state().resetTimer()).rejects.toBe(failure)
  })

  it('pauseTimer() sets paused_at when not paused', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({ paused_at: null }) })
    await state().pauseTimer()
    expect(update).toHaveBeenCalledOnce()
    expect(typeof update.mock.calls[0]![0].paused_at).toBe('string')
  })

  it('pauseTimer() is no-op when already paused', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({ paused_at: '2026-05-04T00:00:30Z' }) })
    await state().pauseTimer()
    expect(update).not.toHaveBeenCalled()
  })

  it('resumeTimer() adds pause delta to paused_elapsed_ms', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-04T00:01:00Z'))
    try {
      const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
      setSupabase(asSupabase({ from: () => ({ update }) }))
      useRoomStore.setState({ roomId: 'r1' })
      useRoomStore.setState({ roomState: fakeRoomState({ paused_at: '2026-05-04T00:00:30Z', paused_elapsed_ms: 2000 }) })
      await state().resumeTimer()
      expect(update).toHaveBeenCalledWith({ paused_at: null, paused_elapsed_ms: 32000 })
    } finally {
      vi.useRealTimers()
    }
  })

  it('resumeTimer() is no-op when not paused', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({ paused_at: null }) })
    await state().resumeTimer()
    expect(update).not.toHaveBeenCalled()
  })

  it('adjustTimer(+10000) shifts round_started_at 10s back', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({
      round_started_at: '2026-05-04T00:00:00.000Z',
      paused_at: '2026-05-04T00:00:30.000Z',
    }) })
    await state().adjustTimer(10000)
    expect(update).toHaveBeenCalledWith({ round_started_at: '2026-05-03T23:59:50.000Z' })
  })

  it('adjustTimer(-10000) caps round_started_at at pivot to avoid negative elapsed', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({
      round_started_at: '2026-05-04T00:00:00.000Z',
      paused_at: '2026-05-04T00:00:05.000Z',
    }) })
    await state().adjustTimer(-10000)
    expect(update).toHaveBeenCalledWith({ round_started_at: '2026-05-04T00:00:05.000Z' })
  })

  it('adjustTimer(-10000) caps at pivot minus accumulated pause time', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    useRoomStore.setState({ roomId: 'r1' })
    useRoomStore.setState({ roomState: fakeRoomState({
      round_started_at: '2026-05-04T00:00:00.000Z',
      paused_at: '2026-05-04T00:00:05.000Z',
      paused_elapsed_ms: 2000,
    }) })
    await state().adjustTimer(-10000)
    expect(update).toHaveBeenCalledWith({ round_started_at: '2026-05-04T00:00:03.000Z' })
  })

  it('preserves adjusted start and accumulated pause across pause, resume, and reveal', async () => {
    vi.useFakeTimers()
    try {
      const updates: Partial<RoomState>[] = []
      setSupabase(asSupabase({
        from: () => ({
          update: (arg: Partial<RoomState>) => {
            updates.push(arg)
            useRoomStore.setState(s => ({ roomState: { ...s.roomState!, ...arg } }))
            return updateQuery()
          },
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      }))
      useRoomStore.setState({ roomId: 'r1' })
      useRoomStore.setState({ roomState: fakeRoomState({ round_started_at: '2026-05-04T00:00:00.000Z' }) })
      usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: '5' })] })

      vi.setSystemTime(new Date('2026-05-04T00:00:10.000Z'))
      await state().pauseTimer()
      await state().adjustTimer(30000)
      expect(state().roomState?.round_started_at).toBe('2026-05-03T23:59:30.000Z')

      vi.setSystemTime(new Date('2026-05-04T00:00:20.000Z'))
      await state().resumeTimer()
      expect(state().roomState?.paused_at).toBeNull()
      expect(state().roomState?.paused_elapsed_ms).toBe(10000)

      vi.setSystemTime(new Date('2026-05-04T00:01:00.000Z'))
      await state().reveal()
      expect(updates.at(-1)).toEqual({ phase: 'revealed' })
      expect(state().roomState?.round_started_at).toBe('2026-05-03T23:59:30.000Z')
      expect(state().roomState?.paused_elapsed_ms).toBe(10000)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('roomStore background', () => {
  beforeEach(async () => {
    resetSupabase()
    await resetStores()
    useAuthStore.setState({ user: { id: 'u1' } as User })
  })

  function fakeClient() {
    const bucket = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const is = vi.fn().mockResolvedValue({ error: null })
    const eq = vi.fn(() => Object.assign(Promise.resolve({ error: null }), { is }))
    const update = vi.fn().mockReturnValue({ eq })
    const client = {
      storage: { from: vi.fn().mockReturnValue(bucket) },
      from: vi.fn().mockReturnValue({ update }),
    }
    return { bucket, update, eq, is, client }
  }

  it('replaces a background without claiming ownership of it', async () => {
    const { update, is, client } = fakeClient()
    setSupabase(asSupabase(client))
    useRoomStore.setState({ roomId: 'r1' })
    const result = await state().uploadBackground(new Blob(['x'], { type: 'image/webp' }), 0.5)
    expect(update.mock.calls.map(([row]) => Object.keys(row))).toEqual([['background_url', 'background_updated_at', 'background_opacity']])
    expect(is).not.toHaveBeenCalled()
    expect(result).not.toHaveProperty('background_owner_id')
  })

  it('refuses to upload without a signed-in user', async () => {
    const { bucket, client } = fakeClient()
    setSupabase(asSupabase(client))
    useAuthStore.setState({ user: null })
    useRoomStore.setState({ roomId: 'r1' })
    await expect(state().uploadBackground(new Blob(), 0.5)).rejects.toThrow()
    expect(bucket.upload).not.toHaveBeenCalled()
  })

  it('uploads to the fixed room path, then points the room row at it', async () => {
    const { bucket, update, eq, client } = fakeClient()
    setSupabase(asSupabase(client))
    useRoomStore.setState({ roomId: 'r1' })
    const blob = new Blob(['x'], { type: 'image/webp' })
    const result = await state().uploadBackground(blob, 0.5)
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
    setSupabase(asSupabase(client))
    useRoomStore.setState({ roomId: 'r1' })
    await expect(state().uploadBackground(new Blob(), 0.65)).rejects.toThrow('denied')
    expect(update).not.toHaveBeenCalled()
  })

  it('updates only the opacity', async () => {
    const { bucket, update, client } = fakeClient()
    setSupabase(asSupabase(client))
    useRoomStore.setState({ roomId: 'r1' })
    expect(await state().setBackgroundOpacity(0.3)).toEqual({ background_opacity: 0.3 })
    expect(update).toHaveBeenCalledWith({ background_opacity: 0.3 })
    expect(bucket.upload).not.toHaveBeenCalled()
  })

  it('clears the room row before removing the file and tolerates storage failure', async () => {
    const { bucket, update, client } = fakeClient()
    bucket.remove.mockRejectedValue(new Error('gone'))
    setSupabase(asSupabase(client))
    useRoomStore.setState({ roomId: 'r1' })
    const result = await state().removeBackground()
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
    setSupabase(asSupabase({ storage: { from: vi.fn().mockReturnValue({ getPublicUrl }) } }))
    expect(backgroundDisplayUrl('AbC12345/background.webp', '2026-10-12T10:00:00Z'))
      .toBe('https://cdn/AbC12345/background.webp?v=2026-10-12T10%3A00%3A00Z')
  })

  it('rejects paths that could break out of a CSS url()', () => {
    setSupabase(asSupabase({ storage: { from: vi.fn() } }))
    expect(backgroundDisplayUrl('x")/background.webp', null)).toBeNull()
    expect(backgroundDisplayUrl('r1/other.png', null)).toBeNull()
  })
})

describe('roomStore.resolveRoom', () => {
  beforeEach(async () => {
    resetSupabase()
    await resetStores()
  })

  function clientReturning(row: unknown) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: row })
    const or = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ or })
    return { select, client: { from: vi.fn().mockReturnValue({ select }) } }
  }

  it('defaults background fields to null for rows from before the background migration', async () => {
    const { client } = clientReturning({ id: 'r1', slug: null, name: 'Team', created_at: null })
    setSupabase(asSupabase(client))
    expect(await useRoomStore.getState().resolveRoom('r1')).toEqual({
      id: 'r1', slug: null, name: 'Team', background_url: null, background_updated_at: null, background_opacity: null,
    })
  })

  it('returns null for an unknown room', async () => {
    const { client } = clientReturning(null)
    setSupabase(asSupabase(client))
    expect(await useRoomStore.getState().resolveRoom('nope')).toBeNull()
  })
})

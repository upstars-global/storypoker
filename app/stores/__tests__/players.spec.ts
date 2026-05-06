import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetSupabase, setSupabase } from '../../lib/supabase-instance'
import { usePlayersStore } from '../players'
import type { Player } from '../types'

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

describe('playersStore.applyChange', () => {
  beforeEach(() => resetSupabase())

  it('INSERT adds a player', () => {
    const store = usePlayersStore()
    store.applyChange({ eventType: 'INSERT', new: fakePlayer({ id: 'p1' }), old: {} } as any)
    expect(store.players).toHaveLength(1)
    expect(store.players[0].id).toBe('p1')
  })

  it('INSERT is idempotent (no duplicates)', () => {
    const store = usePlayersStore()
    const p = fakePlayer({ id: 'p1' })
    store.applyChange({ eventType: 'INSERT', new: p, old: {} } as any)
    store.applyChange({ eventType: 'INSERT', new: p, old: {} } as any)
    expect(store.players).toHaveLength(1)
  })

  it('UPDATE replaces matching player', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', name: 'Alice' })]
    store.applyChange({
      eventType: 'UPDATE',
      new: fakePlayer({ id: 'p1', name: 'Alice2' }),
      old: {},
    } as any)
    expect(store.players[0].name).toBe('Alice2')
  })

  it('DELETE removes player (used for kick)', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1' }), fakePlayer({ id: 'p2' })]
    store.applyChange({ eventType: 'DELETE', new: {}, old: { id: 'p1' } } as any)
    expect(store.players.map(p => p.id)).toEqual(['p2'])
  })

  it('soft-delete via UPDATE marks left_at and is filtered by visiblePlayers', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1' })]
    store.applyChange({
      eventType: 'UPDATE',
      new: fakePlayer({ id: 'p1', left_at: '2026-05-04T01:00:00Z' }),
      old: {},
    } as any)
    expect(store.players).toHaveLength(1)
    expect(store.visiblePlayers).toHaveLength(0)
  })
})

describe('playersStore.castVote (optimistic)', () => {
  beforeEach(() => resetSupabase())

  it('sets pendingVotes immediately and clears on success', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    setSupabase({ from: () => ({ update }) } as any)
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: null })]
    const promise = store.castVote('p1', '5')
    expect(store.pendingVotes['p1']).toBe('5')
    await promise
    expect(update).toHaveBeenCalledWith({ vote: '5' })
  })

  it('rolls back pendingVotes on error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error('fail') })
    const update = vi.fn().mockReturnValue({ eq })
    setSupabase({ from: () => ({ update }) } as any)
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1' })]
    await expect(store.castVote('p1', '5')).rejects.toThrow('fail')
    expect(store.pendingVotes['p1']).toBeUndefined()
  })

  it('voteOf returns pending vote when present', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: '1' })]
    store.pendingVotes['p1'] = '5'
    expect(store.voteOf('p1')).toBe('5')
  })

  it('voteOf falls back to server vote when no pending', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: '1' })]
    expect(store.voteOf('p1')).toBe('1')
  })

  it('applyChange UPDATE clears matching pendingVote (reconciliation)', () => {
    const store = usePlayersStore()
    store.players = [fakePlayer({ id: 'p1', vote: null })]
    store.pendingVotes['p1'] = '5'
    store.applyChange({
      eventType: 'UPDATE',
      new: fakePlayer({ id: 'p1', vote: '5' }),
      old: {},
    } as any)
    expect(store.pendingVotes['p1']).toBeUndefined()
  })

  it('clearPendingVotes() empties the map (used on phase=revealed)', () => {
    const store = usePlayersStore()
    store.pendingVotes = { p1: '5', p2: '3' }
    store.clearPendingVotes()
    expect(store.pendingVotes).toEqual({})
  })
})

describe('playersStore actions', () => {
  beforeEach(() => resetSupabase())

  function makeBuilder(result: any = { error: null, data: null }) {
    const eq = vi.fn().mockResolvedValue(result)
    const update = vi.fn().mockReturnValue({ eq })
    const del = vi.fn().mockReturnValue({ eq })
    const single = vi.fn().mockResolvedValue(result)
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    return { update, del, insert, eq, select, single }
  }

  it('rename(id, name) sends update with name', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().rename('p1', 'Bob')
    expect(b.update).toHaveBeenCalledWith({ name: 'Bob' })
  })

  it('toggleModerator(id, true) sends update', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().toggleModerator('p1', true)
    expect(b.update).toHaveBeenCalledWith({ is_moderator: true })
  })

  it('kick(id) sets left_at (soft-delete)', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().kick('p1')
    const arg = b.update.mock.calls[0][0]
    expect(typeof arg.left_at).toBe('string')
  })

  it('leave(id) sets left_at and clears localStorage session', async () => {
    localStorage.setItem('storypoker_session_r1', 'x')
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    const store = usePlayersStore()
    store.roomId = 'r1'
    await store.leave('p1')
    const arg = b.update.mock.calls[0][0]
    expect(typeof arg.left_at).toBe('string')
    expect(localStorage.getItem('storypoker_session_r1')).toBeNull()
  })

  it('join(name, userId?) inserts and returns new player', async () => {
    const newP = fakePlayer({ id: 'p9', name: 'Carol' })
    const b = makeBuilder({ error: null, data: newP })
    setSupabase({ from: () => ({ insert: b.insert }) } as any)
    const store = usePlayersStore()
    store.roomId = 'r1'
    const result = await store.join('Carol')
    expect(result.id).toBe('p9')
    expect(b.insert).toHaveBeenCalledWith({ room_id: 'r1', name: 'Carol', user_id: null, is_moderator: false })
  })

  it('linkUser(playerId, userId) sends update with user_id', async () => {
    const b = makeBuilder()
    setSupabase({ from: () => ({ update: b.update }) } as any)
    await usePlayersStore().linkUser('p1', 'u9')
    expect(b.update).toHaveBeenCalledWith({ user_id: 'u9' })
  })
})

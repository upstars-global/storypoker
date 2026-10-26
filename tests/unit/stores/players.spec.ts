import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetSupabase, setSupabase } from '~/lib/supabase-instance'
import { usePlayersStore } from '~/stores/players'
import type { Player } from '~/stores/types'
import { asSupabase, changePayload } from '../../support/helpers/fakeSupabase'
import { resetStores } from '../../support/helpers/resetStores'

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

const state = () => usePlayersStore.getState()

async function resetAll() {
  resetSupabase()
  await resetStores()
}

describe('playersStore.applyChange', () => {
  beforeEach(resetAll)

  it('INSERT adds a player', () => {
    state().applyChange(changePayload<Player>('INSERT', { new: fakePlayer({ id: 'p1' }) }))
    expect(state().players).toHaveLength(1)
    expect(state().players[0]!.id).toBe('p1')
  })

  it('INSERT is idempotent (no duplicates)', () => {
    const p = fakePlayer({ id: 'p1' })
    state().applyChange(changePayload<Player>('INSERT', { new: p }))
    state().applyChange(changePayload<Player>('INSERT', { new: p }))
    expect(state().players).toHaveLength(1)
  })

  it('UPDATE replaces matching player', () => {
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', name: 'Alice' })] })
    state().applyChange(changePayload<Player>('UPDATE', { new: fakePlayer({ id: 'p1', name: 'Alice2' }) }))
    expect(state().players[0]!.name).toBe('Alice2')
  })

  it('DELETE removes player (used for kick)', () => {
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1' }), fakePlayer({ id: 'p2' })] })
    state().applyChange(changePayload<Player>('DELETE', { old: { id: 'p1' } }))
    expect(state().players.map(p => p.id)).toEqual(['p2'])
  })

  it('soft-delete via UPDATE marks left_at and is filtered by visiblePlayers', () => {
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1' })] })
    expect(state().visiblePlayers).toHaveLength(1)
    state().applyChange(changePayload<Player>('UPDATE', { new: fakePlayer({ id: 'p1', left_at: '2026-05-04T01:00:00Z' }) }))
    expect(state().players).toHaveLength(1)
    expect(state().visiblePlayers).toHaveLength(0)
  })

  it('visiblePlayers sorts by name case-insensitively and follows direct setState', () => {
    usePlayersStore.setState({
      players: [
        fakePlayer({ id: 'p1', name: 'carol' }),
        fakePlayer({ id: 'p2', name: 'Alice' }),
        fakePlayer({ id: 'p3', name: 'bob', left_at: '2026-05-04T01:00:00Z' }),
        fakePlayer({ id: 'p4', name: 'Bob' }),
      ],
    })
    expect(state().visiblePlayers.map(p => p.id)).toEqual(['p2', 'p4', 'p1'])
  })
})

describe('playersStore.castVote (optimistic)', () => {
  beforeEach(resetAll)

  it('sets pendingVotes immediately and clears on success', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: null })] })
    const promise = state().castVote('p1', '5')
    expect(state().pendingVotes['p1']).toBe('5')
    await promise
    expect(update).toHaveBeenCalledWith({ vote: '5' })
    expect(state().pendingVotes['p1']).toBeUndefined()
    expect(state().players[0]?.vote).toBe('5')
  })

  it('rolls back pendingVotes on error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error('fail') })
    const update = vi.fn().mockReturnValue({ eq })
    setSupabase(asSupabase({ from: () => ({ update }) }))
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1' })] })
    await expect(state().castVote('p1', '5')).rejects.toThrow('fail')
    expect(state().pendingVotes['p1']).toBeUndefined()
  })

  it('voteOf returns pending vote when present', () => {
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: '1' })], pendingVotes: { p1: '5' } })
    expect(state().voteOf('p1')).toBe('5')
  })

  it('voteOf falls back to server vote when no pending', () => {
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: '1' })] })
    expect(state().voteOf('p1')).toBe('1')
  })

  it('applyChange UPDATE clears matching pendingVote (reconciliation)', () => {
    usePlayersStore.setState({ players: [fakePlayer({ id: 'p1', vote: null })], pendingVotes: { p1: '5' } })
    state().applyChange(changePayload<Player>('UPDATE', { new: fakePlayer({ id: 'p1', vote: '5' }) }))
    expect(state().pendingVotes['p1']).toBeUndefined()
  })

  it('clearPendingVotes() empties the map (used on phase=revealed)', () => {
    usePlayersStore.setState({ pendingVotes: { p1: '5', p2: '3' } })
    state().clearPendingVotes()
    expect(state().pendingVotes).toEqual({})
  })
})

describe('playersStore actions', () => {
  beforeEach(resetAll)

  function makeBuilder(result: { error: unknown; data: unknown } = { error: null, data: null }) {
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
    setSupabase(asSupabase({ from: () => ({ update: b.update }) }))
    await state().rename('p1', 'Bob')
    expect(b.update).toHaveBeenCalledWith({ name: 'Bob' })
  })

  it('toggleModerator(id, true) sends update', async () => {
    const b = makeBuilder()
    setSupabase(asSupabase({ from: () => ({ update: b.update }) }))
    await state().toggleModerator('p1', true)
    expect(b.update).toHaveBeenCalledWith({ is_moderator: true })
  })

  it('kick(id) sets left_at (soft-delete)', async () => {
    const b = makeBuilder()
    setSupabase(asSupabase({ from: () => ({ update: b.update }) }))
    await state().kick('p1')
    const arg = b.update.mock.calls[0]![0]
    expect(typeof arg.left_at).toBe('string')
  })

  it('leave(id) sets left_at and clears localStorage session', async () => {
    localStorage.setItem('storypoker_session_r1', 'x')
    const b = makeBuilder()
    setSupabase(asSupabase({ from: () => ({ update: b.update }) }))
    usePlayersStore.setState({ roomId: 'r1' })
    await state().leave('p1')
    const arg = b.update.mock.calls[0]![0]
    expect(typeof arg.left_at).toBe('string')
    expect(localStorage.getItem('storypoker_session_r1')).toBeNull()
  })

  it('join(name, userId?) inserts and returns new player', async () => {
    const newP = fakePlayer({ id: 'p9', name: 'Carol' })
    const b = makeBuilder({ error: null, data: newP })
    setSupabase(asSupabase({ from: () => ({ insert: b.insert }) }))
    usePlayersStore.setState({ roomId: 'r1' })
    const result = await state().join('Carol')
    expect(result.id).toBe('p9')
    expect(b.insert).toHaveBeenCalledWith({ room_id: 'r1', name: 'Carol', user_id: null, is_moderator: false, shields: [] })
  })

  it('linkUser(playerId, userId) sends update with user_id', async () => {
    const b = makeBuilder()
    setSupabase(asSupabase({ from: () => ({ update: b.update }) }))
    await state().linkUser('p1', 'u9')
    expect(b.update).toHaveBeenCalledWith({ user_id: 'u9' })
  })
})

describe('playersStore reset between tests', () => {
  beforeEach(resetAll)

  it('starts every test with no players, pending votes, or room', () => {
    expect(state().players).toEqual([])
    expect(state().visiblePlayers).toEqual([])
    expect(state().pendingVotes).toEqual({})
    expect(state().roomId).toBeNull()
  })
})

/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../../../netlify/functions/room-json.mjs'

const { from } = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ from })) }))

const roles = ['dev', 'be', 'fe', 'sre', 'qa', 'gqa', 'aqa', 'po', 'sm']
const room = { id: 'room0001', slug: 'room', name: 'Test room' }
const vote = (player_id: string, value: string) => ({ player_id, name: player_id, vote: value })
const players = [
  ...roles.map(id => ({ id, shields: [id], left_at: null })),
  { id: 'custom', shields: ['custom:Designer'], left_at: null },
  { id: 'unassigned', shields: [], left_at: null },
  { id: 'departed', shields: ['aqa'], left_at: '2026-10-29T12:00:00Z' },
]
const rounds = [
  {
    id: 'all-roles', revealed_at: '2026-10-26T12:00:00Z', deck_preset: 'scrum',
    active_cards: ['1', '2', '3', '5', '8', '?', '☕'],
    votes: [...roles.map(id => vote(id, '3')), vote('custom', '8'), vote('unassigned', '1'), vote('departed', '5')],
  },
  {
    id: 'po-sm', revealed_at: '2026-10-27T12:00:00Z', deck_preset: 'scrum',
    active_cards: ['1', '2', '3', '5', '8', '?', '☕'],
    votes: [vote('po', '1'), vote('sm', '5')],
  },
  {
    id: 'poll', revealed_at: '2026-10-28T12:00:00Z', deck_preset: 'voting',
    active_cards: ['1', '2', '3'], votes: [vote('dev', '1'), vote('be', '3')],
  },
  {
    id: 'legacy', revealed_at: '2026-10-29T12:00:00Z', deck_preset: null, active_cards: null,
    votes: [vote('unassigned', '1'), vote('departed', '5')],
  },
  {
    id: 'no-score', revealed_at: '2026-10-30T12:00:00Z', deck_preset: 'scrum',
    active_cards: ['1', '2', '3', '?', '☕'], votes: [vote('dev', '?'), vote('be', '☕')],
  },
]

interface ApiRound {
  id: string
  alignments?: Record<string, number | null>
  roleVotes?: { name: string; vote: string; role: string }[]
  [key: string]: unknown
}
interface Payload { room: typeof room; rounds: ApiRound[] }

function query(data: unknown) {
  const builder = Object.assign(Promise.resolve({ data, error: null }), {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    or: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: room, error: null })),
  })
  return builder
}

async function requestPayload(path = 'room') {
  const response = await handler(new Request(`https://x/api/${path}.json`, {
    headers: { authorization: 'Bearer <API_TOKEN>' },
  }))
  expect(response.status).toBe(200)
  return response.json() as Promise<Payload>
}

beforeEach(() => {
  vi.stubEnv('STORYPOKER_API_TOKEN', '<API_TOKEN>')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co')
  vi.stubEnv('VITE_SUPABASE_KEY', 'placeholder')
  from.mockImplementation((table: string) => {
    if (table === 'rooms') return query([room])
    if (table === 'round_history') return query(rounds)
    if (table === 'players') return query(players)
    throw new Error(`Unexpected table: ${table}`)
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('room JSON legacy contract', () => {
  it('preserves legacy fields and numeric round selection byte for byte', async () => {
    const payload = await requestPayload()
    expect(payload.rounds.map(round => round.id)).toEqual(['all-roles', 'po-sm', 'legacy'])
    const legacy = {
      ...payload,
      rounds: payload.rounds.map(({ alignments: _alignments, roleVotes: _roleVotes, ...round }) => round),
    }
    expect(JSON.stringify(legacy)).toMatchInlineSnapshot(`"{"room":{"id":"room0001","slug":"room","name":"Test room"},"rounds":[{"id":"all-roles","date":"2026-10-26T12:00:00Z","week":"W44","deck":"Scrum Scale","average":3,"devAlignment":25,"qaAlignment":100,"voters":9,"votes":[{"name":"dev","vote":"3","cohort":"DEV"},{"name":"be","vote":"3","cohort":"DEV"},{"name":"fe","vote":"3","cohort":"DEV"},{"name":"sre","vote":"3","cohort":"DEV"},{"name":"qa","vote":"3","cohort":"QA"},{"name":"gqa","vote":"3","cohort":"QA"},{"name":"aqa","vote":"3","cohort":"QA"},{"name":"unassigned","vote":"1","cohort":"DEV"},{"name":"departed","vote":"5","cohort":"DEV"}]},{"id":"po-sm","date":"2026-10-27T12:00:00Z","week":"W44","deck":"Scrum Scale","average":3,"devAlignment":25,"qaAlignment":null,"voters":2,"votes":[{"name":"po","vote":"1","cohort":"DEV"},{"name":"sm","vote":"5","cohort":"DEV"}]},{"id":"legacy","date":"2026-10-29T12:00:00Z","week":"W44","deck":"","average":3,"devAlignment":57,"qaAlignment":null,"voters":2,"votes":[{"name":"unassigned","vote":"1","cohort":"DEV"},{"name":"departed","vote":"5","cohort":"DEV"}]}]}"`)
  })

  it.each([undefined, 'Bearer wrong-token'])('rejects authorization %s', async authorization => {
    const response = await handler(new Request('https://x/api/room.json', {
      headers: authorization ? { authorization } : {},
    }))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'unauthorized' })
    expect(from).not.toHaveBeenCalled()
  })
})

describe('room JSON role cohorts', () => {
  it.each(['DEV', 'QA', 'GQA', 'PO'])('excludes custom roles named %s', async role => {
    from.mockImplementation((table: string) => {
      if (table === 'rooms') return query([room])
      if (table === 'round_history') return query(rounds)
      if (table === 'players') return query(players.map(player => player.id === 'custom'
        ? { ...player, shields: [`custom:${role}`] }
        : player))
      throw new Error(`Unexpected table: ${table}`)
    })
    const payload = await requestPayload()
    expect(payload.rounds[0]?.roleVotes?.some(vote => vote.name === 'custom')).toBe(false)
    expect(payload.rounds[0]?.roleVotes).toHaveLength(11)
    expect(payload.rounds[0]?.alignments).toEqual({
      DEV: 25, BE: null, FE: null, SRE: null, QA: null, GQA: null, AQA: null, PO: null, SM: null,
    })
  })

  it('adds all nine roles in order and preserves vote order without custom roles', async () => {
    const { rounds: result } = await requestPayload()
    expect(result[0]?.alignments).toEqual({
      DEV: 25, BE: null, FE: null, SRE: null, QA: null, GQA: null, AQA: null, PO: null, SM: null,
    })
    expect(Object.keys(result[0]?.alignments ?? {})).toEqual(roles.map(role => role.toUpperCase()))
    expect(result[0]?.roleVotes).toEqual([
      ...roles.map(role => ({ name: role, vote: '3', role: role.toUpperCase() })),
      { name: 'unassigned', vote: '1', role: 'DEV' },
      { name: 'departed', vote: '5', role: 'DEV' },
    ])
    expect(result[1]?.alignments).toEqual({ PO: null, SM: null })
    expect(result[1]?.roleVotes).toEqual([
      { name: 'po', vote: '1', role: 'PO' },
      { name: 'sm', vote: '5', role: 'SM' },
    ])
    expect(result[2]?.alignments).toEqual({ DEV: 57 })
    expect(result[2]?.roleVotes).toEqual([
      { name: 'unassigned', vote: '1', role: 'DEV' },
      { name: 'departed', vote: '5', role: 'DEV' },
    ])
    for (const round of result) {
      expect(Object.keys(round)).toEqual([
        'id', 'date', 'week', 'deck', 'average', 'devAlignment', 'qaAlignment', 'voters', 'votes',
        'alignments', 'roleVotes',
      ])
    }
  })

  it.each(roles)('scores %s independently', async role => {
    from.mockImplementation((table: string) => {
      if (table === 'rooms') return query([room])
      if (table === 'round_history') return query([{
        ...rounds[0], votes: [vote('first', '1'), vote('second', '5')],
      }])
      if (table === 'players') return query([
        { id: 'first', shields: [role], left_at: null },
        { id: 'second', shields: [role], left_at: null },
      ])
      throw new Error(`Unexpected table: ${table}`)
    })
    const payload = await requestPayload()
    expect(payload.rounds).toHaveLength(1)
    expect(payload.rounds[0]?.alignments).toEqual({ [role.toUpperCase()]: 25 })
  })

  it('keeps non-estimate votes in roleVotes and emits null for their role score', async () => {
    from.mockImplementation((table: string) => {
      if (table === 'rooms') return query([room])
      if (table === 'players') return query(players)
      if (table === 'round_history') return query([{
        ...rounds[0], votes: [vote('dev', '1'), vote('unassigned', '1'), vote('gqa', '?'), vote('aqa', '☕')],
      }])
      throw new Error(`Unexpected table: ${table}`)
    })
    const payload = await requestPayload()
    expect(payload.rounds[0]?.alignments).toEqual({ DEV: 100, GQA: null, AQA: null })
    expect(payload.rounds[0]?.roleVotes).toEqual([
      { name: 'dev', vote: '1', role: 'DEV' },
      { name: 'unassigned', vote: '1', role: 'DEV' },
      { name: 'gqa', vote: '?', role: 'GQA' },
      { name: 'aqa', vote: '☕', role: 'AQA' },
    ])
  })

  it('includes the same cohort fields in the teams endpoint', async () => {
    const response = await handler(new Request('https://x/api/teams.json', {
      headers: { authorization: 'Bearer <API_TOKEN>' },
    }))
    expect(response.status).toBe(200)
    const payload = await response.json() as { teams: Payload[] }
    expect(payload.teams).toHaveLength(1)
    expect(payload.teams[0]?.rounds.map(round => round.id)).toEqual(['all-roles', 'po-sm', 'legacy'])
    expect(payload.teams[0]?.rounds[1]?.alignments).toEqual({ PO: null, SM: null })
    expect(payload.teams[0]?.rounds[1]?.roleVotes).toEqual([
      { name: 'po', vote: '1', role: 'PO' },
      { name: 'sm', vote: '5', role: 'SM' },
    ])
  })
})

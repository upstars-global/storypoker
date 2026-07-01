import { describe, it, expect } from 'vitest'
import { averageOf, voteToNumber, summarizeRound } from '~/utils/roundStats'
import type { RoundHistory } from '~/stores/types'

const FIB = ['1', '2', '3', '5', '8', '13', '21', '?', '☕']

function round(partial: Partial<RoundHistory>): RoundHistory {
  return {
    id: 'h1',
    room_id: 'r1',
    started_at: '2026-05-04T00:00:00Z',
    revealed_at: '2026-05-04T00:05:00Z',
    votes: [],
    active_cards: FIB,
    deck_preset: 'fibonacci',
    created_at: '2026-05-04T00:05:00Z',
    ...partial,
  }
}

describe('voteToNumber', () => {
  it('parses fractions, hours and starred votes', () => {
    expect(voteToNumber('1/2')).toBe(0.5)
    expect(voteToNumber('8h')).toBe(8)
    expect(voteToNumber('5 *')).toBe(5)
    expect(voteToNumber('?')).toBeNull()
  })
})

describe('averageOf', () => {
  it('averages numeric votes weighted by count, ignoring specials', () => {
    expect(averageOf({ '2': 1, '8': 1, '?': 3 })).toBe('5.0')
  })
  it('returns null without numeric votes', () => {
    expect(averageOf({ '?': 2, '☕': 1 })).toBeNull()
  })
})

describe('summarizeRound', () => {
  it('computes counts, average, alignment and voter count', () => {
    const s = summarizeRound(round({
      votes: [
        { player_id: 'p1', name: 'A', vote: '5' },
        { player_id: 'p2', name: 'B', vote: '5' },
        { player_id: 'p3', name: 'C', vote: '8' },
      ],
    }))
    expect(s.voterCount).toBe(3)
    expect(s.counts).toEqual({ '5': 2, '8': 1 })
    expect(s.average).toBe('6.0')
    expect(s.alignment).toBe(83)
    expect(s.isPoll).toBe(false)
  })

  it('skips average and alignment for poll decks', () => {
    const s = summarizeRound(round({
      deck_preset: 'vote_question',
      active_cards: ['Yes', 'No'],
      votes: [
        { player_id: 'p1', name: 'A', vote: 'Yes' },
        { player_id: 'p2', name: 'B', vote: 'No' },
      ],
    }))
    expect(s.isPoll).toBe(true)
    expect(s.average).toBeNull()
    expect(s.alignment).toBeNull()
  })

  it('leaves alignment null when deck snapshot is missing (legacy rows)', () => {
    const s = summarizeRound(round({
      active_cards: null,
      votes: [
        { player_id: 'p1', name: 'A', vote: '5' },
        { player_id: 'p2', name: 'B', vote: '8' },
      ],
    }))
    expect(s.alignment).toBeNull()
    expect(s.average).toBe('6.5')
  })
})

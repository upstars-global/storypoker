import { describe, it, expect } from 'vitest'
import { averageOf, voteToNumber, summarizeRound, isNumericPreset, roleRoundAlignment, roundAlignment } from '~/utils/roundStats'
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

  it('leaves PO, SM and custom roles out of the average and alignment', () => {
    const s = summarizeRound(round({
      active_cards: ['1', '2', '3', '5', '8', '13'],
      votes: [
        { player_id: 'd1', name: 'A', vote: '5' },
        { player_id: 'gone', name: 'B', vote: '5' },
        { player_id: 'po', name: 'C', vote: '13' },
      ],
    }), new Map([['d1', ['dev']], ['po', ['po']]]))
    expect(s.counts).toEqual({ '5': 2, '13': 1 })
    expect(s.average).toBe('5.0')
    expect(s.alignment).toBe(100)
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

  it('falls back to defaultActive deck order when active_cards is missing (legacy rows)', () => {
    const s = summarizeRound(round({
      active_cards: null,
      votes: [
        { player_id: 'p1', name: 'A', vote: '5' },
        { player_id: 'p2', name: 'B', vote: '8' },
      ],
    }))
    expect(s.alignment).toBe(83)
    expect(s.average).toBe('6.5')
  })

  it('falls back to scrum defaultActive when both active_cards and deck_preset are missing', () => {
    const s = summarizeRound(round({
      active_cards: null,
      deck_preset: null,
      votes: [
        { player_id: 'p1', name: 'A', vote: '5' },
        { player_id: 'p2', name: 'B', vote: '8' },
      ],
    }))
    expect(s.alignment).toBe(86)
  })

  it('computes a Goal Clarity Score average/alignment on the 1-5 scale', () => {
    const s = summarizeRound(round({
      deck_preset: 'goal_clarity',
      active_cards: ['1', '2', '3', '4', '5'],
      votes: [
        { player_id: 'p1', name: 'A', vote: '3' },
        { player_id: 'p2', name: 'B', vote: '4' },
        { player_id: 'p3', name: 'C', vote: '5' },
        { player_id: 'p4', name: 'D', vote: '4' },
        { player_id: 'p5', name: 'E', vote: '5' },
        { player_id: 'p6', name: 'F', vote: '4' },
      ],
    }))
    expect(s.average).toBe('4.2')
    expect(s.alignment).toBe(50)
    expect(s.isPoll).toBe(false)
  })
})

describe('isNumericPreset', () => {
  it('treats goal_clarity as numeric alongside scrum/fibonacci/hours', () => {
    expect(isNumericPreset('goal_clarity')).toBe(true)
    expect(isNumericPreset('scrum')).toBe(true)
    expect(isNumericPreset('tshirt')).toBe(false)
    expect(isNumericPreset('voting')).toBe(false)
    expect(isNumericPreset(null)).toBe(true)
  })
})

describe('roundAlignment', () => {
  it('scores the pooled estimator votes instead of averaging role scores', () => {
    const history = round({
      active_cards: ['1', '2', '3', '5', '8', '13'],
      votes: [
        { player_id: 'b1', name: 'B1', vote: '3' },
        { player_id: 'b2', name: 'B2', vote: '3' },
        { player_id: 'q1', name: 'Q1', vote: '3' },
        { player_id: 'q2', name: 'Q2', vote: '8' },
        { player_id: 'po', name: 'PO', vote: '13' },
      ],
    })
    const shields = new Map([['b1', ['be']], ['b2', ['be']], ['q1', ['qa']], ['q2', ['qa']], ['po', ['po']]])
    expect(roundAlignment(history, shields)).toBe(60)
    expect(summarizeRound(history, shields).average).toBe('4.3')
    expect(summarizeRound(history, shields).alignment).toBe(60)
  })

  it.each(['voting', 'vote_question', 'tshirt', 'boolean'])('excludes the %s preset', deckPreset => {
    const history = round({
      deck_preset: deckPreset,
      active_cards: ['1', '2', '3'],
      votes: [
        { player_id: 'p1', name: 'A', vote: '3' },
        { player_id: 'p2', name: 'B', vote: '3' },
      ],
    })
    expect(roundAlignment(history, new Map())).toBeNull()
  })

  it('falls back to all votes when every voter is a non-estimator', () => {
    const history = round({
      active_cards: ['1', '2', '3', '5', '8', '13'],
      votes: [
        { player_id: 'po', name: 'PO', vote: '3' },
        { player_id: 'sm', name: 'SM', vote: '8' },
        { player_id: 'ux', name: 'UX', vote: '3' },
      ],
    })
    const shields = new Map([['po', ['po']], ['sm', ['sm']], ['ux', ['custom:UX']]])
    const summary = summarizeRound(history, shields)
    expect(summary.average).toBe('4.7')
    expect(summary.alignment).toBe(60)
    expect(roundAlignment(history, shields)).toBe(60)
  })
})

describe('roleRoundAlignment', () => {
  it('keeps GQA and AQA scores separate from QA', () => {
    const history = round({
      votes: [
        { player_id: 'q1', name: 'QA1', vote: '3' },
        { player_id: 'q2', name: 'QA2', vote: '3' },
        { player_id: 'g1', name: 'GQA1', vote: '5' },
        { player_id: 'g2', name: 'GQA2', vote: '5' },
        { player_id: 'a1', name: 'AQA1', vote: '8' },
        { player_id: 'a2', name: 'AQA2', vote: '8' },
      ],
    })
    const shields = new Map([
      ['q1', ['qa']], ['q2', ['qa']], ['g1', ['gqa']], ['g2', ['gqa']], ['a1', ['aqa']], ['a2', ['aqa']],
    ])
    expect(roleRoundAlignment(history, shields)).toEqual({ QA: 100, GQA: 100, AQA: 100 })
  })

  it('scores every role on its own and skips custom roles', () => {
    const round = {
      id: 'r', room_id: 'x', started_at: '', revealed_at: '', created_at: null,
      active_cards: ['1', '2', '3', '5', '8'], deck_preset: 'scrum',
      votes: [
        { player_id: 'b1', name: 'B1', vote: '3' },
        { player_id: 'b2', name: 'B2', vote: '3' },
        { player_id: 'po', name: 'PO', vote: '8' },
        { player_id: 'ux', name: 'UX', vote: '1' },
        { player_id: 'gone', name: 'Gone', vote: '5' },
      ],
    }
    const shields = new Map([['b1', ['be']], ['b2', ['be']], ['po', ['po']], ['ux', ['custom:UX']]])
    expect(roleRoundAlignment(round as never, shields)).toEqual({ BE: 100, PO: null, DEV: null })
  })
})

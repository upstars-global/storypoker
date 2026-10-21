import { describe, expect, it } from 'vitest'
import { activeCardsForDeck, getDeck, GOAL_CLARITY_THRESHOLDS } from '~/utils/cardDecks'

describe('cardDecks', () => {
  it('exposes the goal clarity thresholds as named constants', () => {
    expect(GOAL_CLARITY_THRESHOLDS).toEqual({ clear: 3.5, unclear: 2.5 })
  })

  it('includes optional joint and beer cards in scrum scale', () => {
    const scrum = getDeck('scrum')

    expect(scrum.cards).toContain('🚬')
    expect(scrum.cards).toContain('🍺')
    expect(scrum.defaultActive).not.toContain('🚬')
    expect(scrum.defaultActive).not.toContain('🍺')
  })

  it('scrum and fibonacci have no 0 and nothing above 21', () => {
    for (const id of ['scrum', 'fibonacci'] as const) {
      const numeric = getDeck(id).cards.map(card => Number.parseFloat(card)).filter(Number.isFinite)
      expect(numeric).not.toContain(0)
      expect(Math.max(...numeric)).toBeLessThanOrEqual(21)
    }
  })

  it('drops stale active cards that the preset no longer offers', () => {
    expect(activeCardsForDeck('scrum', ['0', '1', '40', '100', '?'])).toEqual(['1', '?'])
    expect(activeCardsForDeck('vote_question', ['Option A', 'Option B'])).toEqual(['Option A', 'Option B'])
  })

  it('goal_clarity is a fixed 1-5 scale with a default question', () => {
    const goalClarity = getDeck('goal_clarity')

    expect(goalClarity.cards).toEqual(['1', '2', '3', '4', '5'])
    expect(goalClarity.defaultActive).toEqual(goalClarity.cards)
    expect(goalClarity.defaultQuestion).toBeTruthy()
  })
})

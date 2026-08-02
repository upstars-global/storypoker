import { describe, expect, it } from 'vitest'
import { getDeck } from '~/utils/cardDecks'

describe('cardDecks', () => {
  it('includes optional joint and beer cards in scrum scale', () => {
    const scrum = getDeck('scrum')

    expect(scrum.cards).toContain('🚬')
    expect(scrum.cards).toContain('🍺')
    expect(scrum.defaultActive).not.toContain('🚬')
    expect(scrum.defaultActive).not.toContain('🍺')
  })

  it('goal_clarity is a fixed 1-5 scale with a default question', () => {
    const goalClarity = getDeck('goal_clarity')

    expect(goalClarity.cards).toEqual(['1', '2', '3', '4', '5'])
    expect(goalClarity.defaultActive).toEqual(goalClarity.cards)
    expect(goalClarity.defaultQuestion).toBeTruthy()
  })
})

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
})

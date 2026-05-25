import { describe, expect, it } from 'vitest'
import { createCelebrationParticles, shouldCelebrateGroupedVotes } from '~/utils/resultCelebration'

describe('resultCelebration', () => {
  it('celebrates when dev and qa are both unanimous and match', () => {
    expect(
      shouldCelebrateGroupedVotes({
        dev: { '5': 3 },
        qa: { '5': 2 },
        sm: {},
      })
    ).toBe(true)
  })

  it('does not celebrate when dev and qa are unanimous but different', () => {
    expect(
      shouldCelebrateGroupedVotes({
        dev: { '5': 3 },
        qa: { '8': 2 },
        sm: {},
      })
    ).toBe(false)
  })

  it('does not celebrate when one group has mixed estimates', () => {
    expect(
      shouldCelebrateGroupedVotes({
        dev: { '5': 2, '8': 1 },
        qa: { '5': 2 },
        sm: {},
      })
    ).toBe(false)
  })

  it('celebrates when only dev group is unanimous', () => {
    expect(
      shouldCelebrateGroupedVotes({ dev: { '5': 3 }, qa: {}, sm: {} })
    ).toBe(true)
  })

  it('celebrates when only qa group is unanimous', () => {
    expect(
      shouldCelebrateGroupedVotes({ dev: {}, qa: { '8': 2 }, sm: {} })
    ).toBe(true)
  })

  it('does not celebrate when only sm group has votes', () => {
    expect(
      shouldCelebrateGroupedVotes({ dev: {}, qa: {}, sm: { '5': 1 } })
    ).toBe(false)
  })

  it('does not celebrate when only dev group is not unanimous', () => {
    expect(
      shouldCelebrateGroupedVotes({ dev: { '5': 2, '8': 1 }, qa: {}, sm: {} })
    ).toBe(false)
  })

  it('does not celebrate when grouped votes are missing', () => {
    expect(shouldCelebrateGroupedVotes(null)).toBe(false)
  })

  it('creates particles with correct confetti properties', () => {
    const values = [
      0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
      0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81, 0.91,
    ]
    let index = 0
    const random = () => values[index++ % values.length]!

    const particles = createCelebrationParticles(2, random)

    expect(particles).toHaveLength(2)
    expect(particles[0]).toMatchObject({
      startX: 49.2,
      startY: 49.8,
      fall: 53,
      size: 12,
      spin: 558,
      delay: 96,
      duration: 3480,
      hue: 0,
    })
    expect(particles[1]).toMatchObject({
      startX: 49.6,
      startY: 50,
      fall: 56,
      size: 13,
      spin: 617,
      delay: 109,
      duration: 2520,
      hue: 34,
    })
  })
})

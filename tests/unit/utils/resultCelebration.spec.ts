import { describe, expect, it } from 'vitest'
import { createCelebrationParticles, shouldCelebrateGroupedVotes } from '~/utils/resultCelebration'

describe('resultCelebration', () => {
  it('celebrates when general and qa are both unanimous and match', () => {
    expect(
      shouldCelebrateGroupedVotes({
        general: { '5': 3 },
        qa: { '5': 2 },
      })
    ).toBe(true)
  })

  it('does not celebrate when general and qa are unanimous but different', () => {
    expect(
      shouldCelebrateGroupedVotes({
        general: { '5': 3 },
        qa: { '8': 2 },
      })
    ).toBe(false)
  })

  it('does not celebrate when one group has mixed estimates', () => {
    expect(
      shouldCelebrateGroupedVotes({
        general: { '5': 2, '8': 1 },
        qa: { '5': 2 },
      })
    ).toBe(false)
  })

  it('does not celebrate when grouped votes are missing', () => {
    expect(shouldCelebrateGroupedVotes(null)).toBe(false)
  })

  it('creates particles within viewport bounds', () => {
    const values = [
      0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
      0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81, 0.91,
    ]
    let index = 0
    const random = () => values[index++ % values.length]!

    const particles = createCelebrationParticles(2, random)

    expect(particles).toHaveLength(2)
    expect(particles[0]).toMatchObject({
      left: 10,
      top: 20,
      size: 14,
      delay: 0,
      duration: 2200,
      angle: 144,
      curveX: 0,
      curveY: 44,
      driftX: 128,
      driftY: 156,
      hue: 280,
    })
    expect(particles[1]).toMatchObject({
      left: 11,
      top: 21,
      size: 14,
      delay: 0,
      duration: 2200,
      angle: 148,
      curveX: 5,
      curveY: 48,
      driftX: 134,
      driftY: 161,
      hue: 280,
    })
  })
})

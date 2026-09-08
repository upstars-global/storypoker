import { describe, expect, it } from 'vitest'
import { createCelebrationParticles, shouldCelebrate } from '~/utils/resultCelebration'

describe('resultCelebration', () => {
  it('celebrates when general and qa are both unanimous and match', () => {
    expect(shouldCelebrate({}, { general: { '5': 3 }, qa: { '5': 2 } })).toBe(true)
  })

  it('celebrates when general and qa are unanimous but different', () => {
    expect(shouldCelebrate({}, { general: { '5': 3 }, qa: { '8': 2 } })).toBe(true)
  })

  it('celebrates when only one group is unanimous and the other is mixed', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: { '5': 2 } })).toBe(true)
  })

  it('does not celebrate when both groups have mixed estimates', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: { '5': 1, '8': 1 } })).toBe(false)
  })

  it('celebrates when only general group is unanimous', () => {
    expect(shouldCelebrate({}, { general: { '5': 3 }, qa: {} })).toBe(true)
  })

  it('celebrates when only qa group is unanimous', () => {
    expect(shouldCelebrate({}, { general: {}, qa: { '8': 2 } })).toBe(true)
  })

  it('does not celebrate when only general group is not unanimous', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: {} })).toBe(false)
  })

  it('does not celebrate when a lone qa voter agrees with nobody', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: { '8': 1 } })).toBe(false)
  })

  it('does not celebrate when the only unanimous group has a single voter', () => {
    expect(shouldCelebrate({}, { general: {}, qa: { '8': 1 } })).toBe(false)
  })

  it('celebrates without qa split when every vote matches', () => {
    expect(shouldCelebrate({ '5': 3 }, null)).toBe(true)
  })

  it('celebrates without qa split at exactly two matching votes', () => {
    expect(shouldCelebrate({ '5': 2 }, null)).toBe(true)
  })

  it('does not celebrate a single voter without qa split', () => {
    expect(shouldCelebrate({ '5': 1 }, null)).toBe(false)
  })

  it('does not celebrate mixed votes without qa split', () => {
    expect(shouldCelebrate({ '5': 2, '8': 1 }, null)).toBe(false)
  })

  it('does not celebrate when there are no votes at all', () => {
    expect(shouldCelebrate({}, null)).toBe(false)
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

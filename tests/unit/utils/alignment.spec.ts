import { describe, it, expect } from 'vitest'
import { alignmentScore } from '~/utils/alignment'

const FIB = ['1', '2', '3', '5', '8', '13', '21', '?', '☕']

describe('alignmentScore', () => {
  it('returns 100 when everyone picks the same card', () => {
    expect(alignmentScore({ '5': 4 }, FIB)).toBe(100)
  })

  it('returns 0 when votes span the whole estimate range', () => {
    expect(alignmentScore({ '1': 1, '21': 1 }, FIB)).toBe(0)
  })

  it('scores adjacent cards as highly aligned', () => {
    expect(alignmentScore({ '5': 2, '8': 1 }, FIB)).toBe(83)
  })

  it('ignores ? and ☕ when measuring spread', () => {
    expect(alignmentScore({ '5': 2, '?': 1, '☕': 1 }, FIB)).toBe(100)
  })

  it('returns null with fewer than two estimate votes', () => {
    expect(alignmentScore({ '5': 1, '?': 3 }, FIB)).toBeNull()
  })

  it('returns null without a deck order', () => {
    expect(alignmentScore({ '5': 2 }, undefined)).toBeNull()
    expect(alignmentScore({ '5': 2 }, [])).toBeNull()
  })

  it('handles a two-card deck', () => {
    expect(alignmentScore({ True: 1, False: 1 }, ['True', 'False', '?', '☕'])).toBe(0)
    expect(alignmentScore({ True: 2 }, ['True', 'False', '?', '☕'])).toBe(100)
  })
})

import { describe, it, expect } from 'vitest'
import { SLOT_SYMBOLS, randomSlotSymbol, spinReels, isJackpot, buildReelStrip } from '~/utils/slotMachine'

function sequence(...values: number[]) {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]!
}

describe('slotMachine', () => {
  it('picks the lightest and heaviest symbols at distribution edges', () => {
    expect(randomSlotSymbol(() => 0)).toBe('tabler:cherry')
    expect(randomSlotSymbol(() => 0.999999)).toBe('tabler:play-card-7')
  })

  it('only ever returns known symbols', () => {
    for (let i = 0; i < 200; i++) {
      expect(SLOT_SYMBOLS).toContain(randomSlotSymbol())
    }
  })

  it('respects weights across the distribution', () => {
    const counts: Record<string, number> = {}
    const steps = 1000
    for (let i = 0; i < steps; i++) {
      const s = randomSlotSymbol(() => i / steps)
      counts[s] = (counts[s] ?? 0) + 1
    }
    expect(counts['tabler:cherry']!).toBeGreaterThan(counts['tabler:play-card-7']!)
    expect(counts['tabler:star']!).toBeGreaterThan(counts['tabler:lemon-2']!)
  })

  it('spins three independent reels', () => {
    const reels = spinReels(sequence(0, 0.5, 0.99))
    expect(reels).toHaveLength(3)
    expect(reels[0]).toBe('tabler:cherry')
    expect(reels[2]).toBe('tabler:play-card-7')
  })

  it('detects a jackpot only when all three match', () => {
    expect(isJackpot(['tabler:play-card-7', 'tabler:play-card-7', 'tabler:play-card-7'])).toBe(true)
    expect(isJackpot(['tabler:cherry', 'tabler:cherry', 'tabler:cherry'])).toBe(true)
    expect(isJackpot(['tabler:cherry', 'tabler:cherry', 'tabler:lemon-2'])).toBe(false)
    expect(isJackpot(['tabler:cherry', 'tabler:cherry'])).toBe(false)
  })

  it('builds a strip of the requested length', () => {
    const strip = buildReelStrip(15)
    expect(strip).toHaveLength(15)
    strip.forEach(s => expect(SLOT_SYMBOLS).toContain(s))
  })
})

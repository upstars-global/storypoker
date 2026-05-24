import { describe, expect, it } from 'vitest'
import { CHIP_CATALOG, QA_ROUTING_CHIPS, getChip, isQaPlayer, chipsForGroup } from '~/utils/chips'

describe('chips', () => {
  it('exposes a unique chip id per catalog entry', () => {
    const ids = CHIP_CATALOG.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves a chip by id', () => {
    expect(getChip('vue')?.group).toBe('frontend')
    expect(getChip('unknown')).toBeUndefined()
  })

  it('routes to QA only for the four QA discipline chips', () => {
    for (const id of QA_ROUTING_CHIPS) {
      expect(isQaPlayer([id])).toBe(true)
    }
  })

  it('does not route stack chips to QA on their own', () => {
    expect(isQaPlayer(['playwright', 'vue'])).toBe(false)
    expect(isQaPlayer(['qase'])).toBe(false)
    expect(isQaPlayer(['js', 'ts'])).toBe(false)
  })

  it('routes to QA when a QA discipline chip is combined with a stack chip', () => {
    expect(isQaPlayer(['playwright', 'manual-qa'])).toBe(true)
    expect(isQaPlayer(['aqa', 'ts'])).toBe(true)
  })

  it('treats empty or missing chips as general', () => {
    expect(isQaPlayer([])).toBe(false)
    expect(isQaPlayer(null)).toBe(false)
    expect(isQaPlayer(undefined)).toBe(false)
  })

  it('groups chips by discipline', () => {
    expect(chipsForGroup('qa').map(c => c.id)).toContain('manual-qa')
    expect(chipsForGroup('lead').every(c => c.group === 'lead')).toBe(true)
  })
})

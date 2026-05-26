import { describe, expect, it } from 'vitest'
import { SHIELD_CATALOG, SHIELD_GROUPS, getShield, isQaPlayer, shieldsForGroup } from '~/utils/shields'

describe('shields', () => {
  it('exposes a unique shield id per catalog entry', () => {
    const ids = SHIELD_CATALOG.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves a shield by id', () => {
    expect(getShield('qa')?.group).toBe('discipline')
    expect(getShield('head')?.group).toBe('lead')
    expect(getShield('unknown')).toBeUndefined()
  })

  it('routes to QA only when the qa shield is worn', () => {
    expect(isQaPlayer(['qa'])).toBe(true)
    expect(isQaPlayer(['qa', 'tl'])).toBe(true)
    expect(isQaPlayer(['dev'])).toBe(false)
    expect(isQaPlayer(['head'])).toBe(false)
  })

  it('treats empty or missing shields as general', () => {
    expect(isQaPlayer([])).toBe(false)
    expect(isQaPlayer(null)).toBe(false)
    expect(isQaPlayer(undefined)).toBe(false)
  })

  it('groups shields by category', () => {
    expect(shieldsForGroup('discipline').map(s => s.id)).toEqual(['dev', 'qa'])
    expect(shieldsForGroup('lead').every(s => s.group === 'lead')).toBe(true)
    expect(SHIELD_GROUPS).toEqual(['discipline', 'lead'])
  })
})

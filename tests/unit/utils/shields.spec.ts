import { describe, expect, it } from 'vitest'
import { PLAYER_ROLES, SHIELD_CATALOG, SHIELD_GROUPS, getShield, isQaPlayer, roleTagForShields, shieldsForGroup, toggleShield, trendCohorts } from '~/utils/shields'

describe('shields', () => {
  it('exposes a unique shield id per catalog entry', () => {
    const ids = SHIELD_CATALOG.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('resolves a shield by id', () => {
    expect(getShield('qa')?.group).toBe('role')
    expect(getShield('vue')?.group).toBe('stack')
    expect(getShield('head')?.group).toBe('lead')
    expect(getShield('unknown')).toBeUndefined()
  })

  it('routes to QA when a QA discipline shield is worn', () => {
    expect(isQaPlayer(['qa'])).toBe(true)
    expect(isQaPlayer(['aqa'])).toBe(true)
    expect(isQaPlayer(['dev', 'vue'])).toBe(false)
    expect(isQaPlayer(['playwright'])).toBe(false)
  })

  it('treats empty or missing shields as general', () => {
    expect(isQaPlayer([])).toBe(false)
    expect(isQaPlayer(null)).toBe(false)
    expect(isQaPlayer(undefined)).toBe(false)
  })

  it('wears at most one skill shield plus one leadership shield, skill first', () => {
    const dev = getShield('dev')!
    const vue = getShield('vue')!
    const head = getShield('head')!
    const tl = getShield('tl')!

    expect(toggleShield([], head)).toEqual(['head'])
    expect(toggleShield(['head'], dev)).toEqual(['dev', 'head'])
    expect(toggleShield(['dev'], vue)).toEqual(['vue'])
    expect(toggleShield(['dev', 'head'], dev)).toEqual(['head'])
    expect(toggleShield(['dev', 'head'], tl)).toEqual(['dev', 'tl'])
  })

  it('derives the role tag from a player shield', () => {
    expect(roleTagForShields(['dev'])).toBe('DEV')
    expect(roleTagForShields(['be'])).toBe('BE')
    expect(roleTagForShields(['qa'])).toBe('QA')
    expect(roleTagForShields([])).toBeNull()
    expect(roleTagForShields(null)).toBeNull()
    expect(roleTagForShields(['vue'])).toBeNull()
  })

  it('maps every role tag to a real catalog shield', () => {
    for (const { shield } of PLAYER_ROLES) {
      expect(getShield(shield)).toBeDefined()
    }
  })

  it('groups shields by category', () => {
    expect(SHIELD_GROUPS).toEqual(['role', 'focus', 'stack', 'qa', 'lead'])
    expect(shieldsForGroup('role').map(s => s.id)).toEqual(['dev', 'qa', 'gqa', 'po', 'sm'])
    expect(shieldsForGroup('qa').map(s => s.id)).toContain('vitest')
    expect(shieldsForGroup('stack').every(s => s.group === 'stack')).toBe(true)
  })
})

describe('trendCohorts', () => {
  const shields = new Map<string, string[]>([
    ['dev', ['dev']], ['fe', ['fe']], ['sre', ['sre']], ['gqa', ['gqa']],
    ['po', ['po']], ['sm', ['sm']], ['none', []], ['custom', ['custom:Design']],
  ])
  const votes = (...ids: string[]) => ids.map(player_id => ({ player_id }))

  it('splits estimators into DEV and QA and leaves PO, SM and custom roles out', () => {
    expect(Object.fromEntries(trendCohorts(votes('dev', 'fe', 'sre', 'gqa', 'po', 'sm', 'none', 'custom'), shields)))
      .toEqual({ dev: 'DEV', fe: 'DEV', sre: 'DEV', gqa: 'QA', none: 'DEV' })
  })

  it('counts players without a role and players who left the room as DEV', () => {
    expect(Object.fromEntries(trendCohorts(votes('none', 'departed', 'po'), shields)))
      .toEqual({ none: 'DEV', departed: 'DEV' })
  })

  it('counts everyone as DEV when only PO, SM or custom roles voted', () => {
    expect(Object.fromEntries(trendCohorts(votes('po', 'custom'), shields))).toEqual({ po: 'DEV', custom: 'DEV' })
  })
})

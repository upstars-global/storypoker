import { describe, it, expect } from 'vitest'
import { ALWAYS_SHOWN_COHORTS, COHORT_COLORS, ESTIMATOR_COHORTS, ROLE_COHORTS, cohortForShields, estimatorVotes, groupVotesByCohort, normalizeCohorts, resultCohortFor, voteCohortFor } from '~/utils/resultCohorts'

describe('normalizeCohorts', () => {
  it('defaults to every configurable developer role', () => {
    expect(normalizeCohorts(null)).toEqual(['DEV', 'BE', 'FE', 'SRE'])
    expect(normalizeCohorts(undefined)).toEqual(['DEV', 'BE', 'FE', 'SRE'])
  })

  it('drops unknown tags and keeps the canonical order', () => {
    expect(normalizeCohorts(['QA', 'PO', 'FE', 'BE', 'QA'])).toEqual(['BE', 'FE'])
  })

  it('allows every configurable circle to be disabled', () => {
    expect(normalizeCohorts([])).toEqual([])
    expect(normalizeCohorts(['FE'])).toEqual(['FE'])
  })
})

describe('cohortForShields', () => {
  it('gives every developer and QA discipline its own cohort', () => {
    expect(cohortForShields(['sre'])).toBe('SRE')
    expect(cohortForShields(['fe'])).toBe('FE')
    expect(cohortForShields(['gqa'])).toBe('GQA')
    expect(cohortForShields(['aqa'])).toBe('AQA')
  })

  it('gives PO and SM their own cohorts and leaves custom roles outside', () => {
    expect(cohortForShields(['po'])).toBe('PO')
    expect(cohortForShields(['sm'])).toBe('SM')
    expect(cohortForShields(['custom:Design'])).toBeNull()
  })

  it('counts players without a role as DEV', () => {
    expect(cohortForShields([])).toBe('DEV')
    expect(cohortForShields(null)).toBe('DEV')
  })

  it.each(['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA', 'PO', 'SM', ''])(
    'keeps the custom role "%s" outside all cohorts',
    (tag) => {
      expect(cohortForShields([`custom:${tag}`])).toBeNull()
    },
  )

  it('uses the first recognized role shield when legacy players have several shields', () => {
    expect(cohortForShields(['unknown', 'custom:DEV', 'qa'])).toBeNull()
    expect(cohortForShields(['unknown', 'custom:', 'qa'])).toBeNull()
    expect(cohortForShields(['unknown', 'qa', 'custom:DEV'])).toBe('QA')
    expect(cohortForShields(['unknown', 'gqa', 'custom:'])).toBe('GQA')
    expect(cohortForShields(['unknown'])).toBe('DEV')
  })
})

describe('groupVotesByCohort', () => {
  const players = [
    { shields: ['fe'], vote: '3' },
    { shields: ['fe'], vote: '5' },
    { shields: ['be'], vote: '5' },
    { shields: ['qa'], vote: '8' },
    { shields: ['aqa'], vote: '8' },
    { shields: ['dev'], vote: '3' },
    { shields: ['po'], vote: '2' },
    { shields: ['custom:Design'], vote: '2' },
    { shields: ['sm'], vote: null },
  ]

  it('shows every role in its own circle by default', () => {
    expect(groupVotesByCohort([...players, { shields: ['sre'], vote: '5' }, { shields: ['sm'], vote: '1' }], normalizeCohorts(null))).toEqual([
      { key: 'DEV', votes: { '3': 1 } },
      { key: 'BE', votes: { '5': 1 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'SRE', votes: { '5': 1 } },
      { key: 'QA', votes: { '8': 1 } },
      { key: 'AQA', votes: { '8': 1 } },
      { key: 'PO', votes: { '2': 1 } },
      { key: 'SM', votes: { '1': 1 } },
    ])
  })

  it('keeps PO in its own circle and ignores custom roles', () => {
    expect(groupVotesByCohort(players, ['DEV', 'BE', 'FE', 'SRE'])).toEqual([
      { key: 'DEV', votes: { '3': 1 } },
      { key: 'BE', votes: { '5': 1 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'QA', votes: { '8': 1 } },
      { key: 'AQA', votes: { '8': 1 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('folds every developer into DEV when only DEV is selected', () => {
    expect(groupVotesByCohort([...players, { shields: ['sre'], vote: '5' }], ['DEV'])).toEqual([
      { key: 'DEV', votes: { '3': 2, '5': 3 } },
      { key: 'QA', votes: { '8': 1 } },
      { key: 'AQA', votes: { '8': 1 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('keeps selected developer roles apart and folds the rest into DEV', () => {
    expect(groupVotesByCohort([...players, { shields: ['sre'], vote: '5' }], ['DEV', 'FE'])).toEqual([
      { key: 'DEV', votes: { '3': 1, '5': 2 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'QA', votes: { '8': 1 } },
      { key: 'AQA', votes: { '8': 1 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('drops votes of deselected roles when DEV is off', () => {
    expect(groupVotesByCohort(players, ['FE', 'BE', 'QA'])).toEqual([
      { key: 'BE', votes: { '5': 1 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'QA', votes: { '8': 1 } },
      { key: 'AQA', votes: { '8': 1 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('skips cohorts without votes', () => {
    expect(groupVotesByCohort([{ shields: ['fe'], vote: '3' }], ['FE', 'SRE'])).toEqual([
      { key: 'FE', votes: { '3': 1 } },
    ])
  })
})

describe('resultCohortFor', () => {
  it('routes deselected developer roles into DEV only while DEV is selected', () => {
    expect(resultCohortFor('SRE', ['DEV', 'QA'])).toBe('DEV')
    expect(resultCohortFor('SRE', ['BE', 'FE'])).toBeNull()
    expect(resultCohortFor('DEV', ['BE', 'QA'])).toBeNull()
    expect(resultCohortFor('BE', ['DEV', 'BE', 'QA'])).toBe('BE')
    expect(resultCohortFor('QA', ['QA'])).toBe('QA')
    expect(resultCohortFor('PO', ['DEV'])).toBe('PO')
    expect(resultCohortFor(null, ['DEV'])).toBeNull()
  })
})

describe('role cohort contract', () => {
  it('keeps the canonical role order, visibility and estimator pool', () => {
    expect(ROLE_COHORTS).toEqual(['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA', 'PO', 'SM'])
    expect(ALWAYS_SHOWN_COHORTS).toEqual(['QA', 'GQA', 'AQA', 'PO', 'SM'])
    expect(ESTIMATOR_COHORTS).toEqual(['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA'])
    expect(COHORT_COLORS).toMatchObject({ QA: '#ffa726', GQA: '#ff7043', AQA: '#fdd835' })
  })

  it('ignores saved QA entries and unknown tags', () => {
    expect(normalizeCohorts(['QA', 'GQA', 'AQA', 'PO', 'SM', 'unknown', 'BE'])).toEqual(['BE'])
    expect(normalizeCohorts(['DEV', 'QA'])).toEqual(normalizeCohorts(['DEV']))
  })

  it('keeps always shown roles visible even with no developer chips', () => {
    for (const role of ['QA', 'GQA', 'AQA', 'PO', 'SM']) {
      expect(resultCohortFor(role, [])).toBe(role)
    }
    expect(resultCohortFor('DEV', [])).toBeNull()
    expect(resultCohortFor('BE', [])).toBeNull()
  })

  it('defaults roleless and departed players to DEV', () => {
    const shields = new Map([['roleless', []], ['custom', ['custom:Design']]])
    expect(voteCohortFor(shields, 'roleless')).toBe('DEV')
    expect(voteCohortFor(shields, 'departed')).toBe('DEV')
    expect(voteCohortFor(undefined, 'departed')).toBe('DEV')
    expect(voteCohortFor(shields, 'custom')).toBeNull()
  })

  it('orders all nine circles canonically regardless of player order', () => {
    const roles = ['SM', 'AQA', 'GQA', 'QA', 'SRE', 'FE', 'BE', 'DEV', 'PO']
    const players = roles.map(role => ({ shields: [role.toLowerCase()], vote: '3' }))
    expect(groupVotesByCohort(players, normalizeCohorts(null)).map(group => group.key))
      .toEqual(['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA', 'PO', 'SM'])
    expect(groupVotesByCohort(players, ['DEV']).map(group => group.key))
      .toEqual(['DEV', 'QA', 'GQA', 'AQA', 'PO', 'SM'])
    expect(groupVotesByCohort(players, ['BE']).map(group => group.key))
      .toEqual(['BE', 'QA', 'GQA', 'AQA', 'PO', 'SM'])
    expect(groupVotesByCohort(players, ['DEV'])[0]?.votes).toEqual({ '3': 4 })
  })

  it('omits disabled developer votes and custom roles', () => {
    const players = ['dev', 'be', 'fe', 'sre', 'custom:Design'].map(role => ({ shields: [role], vote: '3' }))
    expect(groupVotesByCohort(players, [])).toEqual([])
  })

  it('does not create role circles for custom roles named after built-in roles', () => {
    const players = ['DEV', 'QA', 'GQA', 'PO'].map(role => ({ shields: [`custom:${role}`], vote: '3' }))
    expect(groupVotesByCohort(players, normalizeCohorts(null))).toEqual([])
  })
})

describe('estimatorVotes', () => {
  const roles = ['dev', 'be', 'fe', 'sre', 'qa', 'gqa', 'aqa', 'po', 'sm', 'custom:Design']
  const shields = new Map(roles.map(role => [role, [role]]))

  it('keeps estimator votes with their fields and omits product and custom roles', () => {
    const votes = [...roles, 'roleless', 'departed'].map(player_id => ({ player_id, vote: '3' }))
    shields.set('roleless', [])
    expect(estimatorVotes(votes, shields).map(vote => vote.player_id))
      .toEqual(['dev', 'be', 'fe', 'sre', 'qa', 'gqa', 'aqa', 'roleless', 'departed'])
  })

  it('falls back to all votes when every voter is outside the estimator pool', () => {
    const votes = ['po', 'sm', 'custom:Design'].map(player_id => ({ player_id, vote: '8' }))
    expect(estimatorVotes(votes, shields)).toEqual(votes)
    expect(estimatorVotes([], shields)).toEqual([])
  })

  it('treats unknown players as estimators when no shields map is available', () => {
    const votes = [{ player_id: 'departed', vote: '5' }]
    expect(estimatorVotes(votes, undefined)).toEqual(votes)
  })

  it('excludes custom roles with built-in names when an estimator has voted', () => {
    const votes = ['dev', 'customDev', 'customQa', 'customGqa', 'customPo', 'customEmpty'].map(player_id => ({ player_id, vote: '5' }))
    const shieldsByPlayer = new Map([
      ['dev', ['dev']],
      ['customDev', ['custom:DEV']],
      ['customQa', ['custom:QA']],
      ['customGqa', ['custom:GQA']],
      ['customPo', ['custom:PO']],
      ['customEmpty', ['custom:']],
    ])
    expect(estimatorVotes(votes, shieldsByPlayer)).toEqual([votes[0]])
  })
})

import { describe, it, expect } from 'vitest'
import { cohortForShields, groupVotesByCohort, normalizeCohorts, resultCohortFor } from '~/utils/resultCohorts'

describe('normalizeCohorts', () => {
  it('defaults to every developer role and QA until the room configures them', () => {
    expect(normalizeCohorts(null)).toEqual(['DEV', 'BE', 'FE', 'SRE', 'QA'])
    expect(normalizeCohorts(undefined)).toEqual(['DEV', 'BE', 'FE', 'SRE', 'QA'])
  })

  it('drops unknown tags and keeps the canonical order', () => {
    expect(normalizeCohorts(['QA', 'PO', 'FE', 'BE', 'QA'])).toEqual(['BE', 'FE', 'QA'])
  })

  it('always keeps the QA circle', () => {
    expect(normalizeCohorts([])).toEqual(['QA'])
    expect(normalizeCohorts(['FE'])).toEqual(['FE', 'QA'])
  })
})

describe('cohortForShields', () => {
  it('splits developers and merges every QA flavour', () => {
    expect(cohortForShields(['sre'])).toBe('SRE')
    expect(cohortForShields(['fe'])).toBe('FE')
    expect(cohortForShields(['gqa'])).toBe('QA')
    expect(cohortForShields(['aqa'])).toBe('QA')
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
      { key: 'QA', votes: { '8': 2 } },
      { key: 'PO', votes: { '2': 1 } },
      { key: 'SM', votes: { '1': 1 } },
    ])
  })

  it('keeps PO in its own circle and ignores custom roles', () => {
    expect(groupVotesByCohort(players, ['DEV', 'BE', 'FE', 'SRE', 'QA'])).toEqual([
      { key: 'DEV', votes: { '3': 1 } },
      { key: 'BE', votes: { '5': 1 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'QA', votes: { '8': 2 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('folds every developer into DEV when only DEV is selected', () => {
    expect(groupVotesByCohort([...players, { shields: ['sre'], vote: '5' }], ['DEV'])).toEqual([
      { key: 'DEV', votes: { '3': 2, '5': 3 } },
      { key: 'QA', votes: { '8': 2 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('keeps selected developer roles apart and folds the rest into DEV', () => {
    expect(groupVotesByCohort([...players, { shields: ['sre'], vote: '5' }], ['DEV', 'FE'])).toEqual([
      { key: 'DEV', votes: { '3': 1, '5': 2 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'QA', votes: { '8': 2 } },
      { key: 'PO', votes: { '2': 1 } },
    ])
  })

  it('drops votes of deselected roles when DEV is off', () => {
    expect(groupVotesByCohort(players, ['FE', 'BE', 'QA'])).toEqual([
      { key: 'BE', votes: { '5': 1 } },
      { key: 'FE', votes: { '3': 1, '5': 1 } },
      { key: 'QA', votes: { '8': 2 } },
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
    expect(resultCohortFor('SRE', ['BE', 'FE', 'QA'])).toBeNull()
    expect(resultCohortFor('DEV', ['BE', 'QA'])).toBeNull()
    expect(resultCohortFor('BE', ['DEV', 'BE', 'QA'])).toBe('BE')
    expect(resultCohortFor('QA', ['QA'])).toBe('QA')
    expect(resultCohortFor('PO', ['DEV'])).toBe('PO')
    expect(resultCohortFor(null, ['DEV'])).toBeNull()
  })
})

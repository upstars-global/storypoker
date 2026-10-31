import { CUSTOM_SHIELD_PREFIX, roleTagForShields } from './shields'

export const RESULT_COHORTS: readonly string[] = ['DEV', 'BE', 'FE', 'SRE']
export const DEV_UMBRELLA_COHORT = 'DEV'
export const DEFAULT_RESULT_COHORTS: readonly string[] = RESULT_COHORTS
export const ALWAYS_SHOWN_COHORTS: readonly string[] = ['QA', 'GQA', 'AQA', 'PO', 'SM']
export const ESTIMATOR_COHORTS: readonly string[] = ['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA']
export const ROLE_COHORTS: readonly string[] = [...RESULT_COHORTS, ...ALWAYS_SHOWN_COHORTS]
export const COHORT_COLORS: Record<string, string> = {
  DEV: '#26a69a',
  BE: '#42a5f5',
  FE: '#ab47bc',
  SRE: '#8d6e63',
  QA: '#ffa726',
  GQA: '#ff7043',
  AQA: '#fdd835',
  PO: '#ec407a',
  SM: '#9ccc65',
}
const DEV_SUBCOHORTS = new Set(['BE', 'FE', 'SRE'])

export type VoteCounts = Record<string, number>

export interface VoteGroup {
  key: string
  votes: VoteCounts
}

export interface ResultGroup {
  label: string
  votes: VoteCounts
}

const COHORT_BY_TAG = new Map<string, string>([
  ['DEV', 'DEV'],
  ['BE', 'BE'],
  ['FE', 'FE'],
  ['SRE', 'SRE'],
  ['QA', 'QA'],
  ['GQA', 'GQA'],
  ['AQA', 'AQA'],
  ['PO', 'PO'],
  ['SM', 'SM'],
])

export function normalizeCohorts(value: readonly string[] | null | undefined): string[] {
  const chosen = new Set(value ?? DEFAULT_RESULT_COHORTS)
  return RESULT_COHORTS.filter(tag => chosen.has(tag))
}

export function cohortForShields(shields: string[] | null | undefined): string | null {
  for (const shield of shields ?? []) {
    if (shield.startsWith(CUSTOM_SHIELD_PREFIX)) return null
    const tag = roleTagForShields([shield])
    if (tag) return COHORT_BY_TAG.get(tag) ?? null
  }
  return DEV_UMBRELLA_COHORT
}

export function voteCohortFor(shieldsByPlayer: ReadonlyMap<string, string[]> | undefined, playerId: string): string | null {
  const shields = shieldsByPlayer?.get(playerId)
  return shields ? cohortForShields(shields) : DEV_UMBRELLA_COHORT
}

export function resultCohortFor(cohort: string | null, selected: readonly string[]): string | null {
  if (!cohort) return null
  if (selected.includes(cohort) || ALWAYS_SHOWN_COHORTS.includes(cohort)) return cohort
  return DEV_SUBCOHORTS.has(cohort) && selected.includes(DEV_UMBRELLA_COHORT) ? DEV_UMBRELLA_COHORT : null
}

export function groupVotesByCohort(
  players: readonly { shields: string[] | null; vote: string | null }[],
  cohorts: readonly string[],
): VoteGroup[] {
  const selected = normalizeCohorts(cohorts)
  const buckets = new Map<string, VoteCounts>(ROLE_COHORTS.map(key => [key, {}]))
  for (const player of players) {
    if (!player.vote) continue
    const target = resultCohortFor(cohortForShields(player.shields), selected)
    const bucket = target ? buckets.get(target) : undefined
    if (bucket) bucket[player.vote] = (bucket[player.vote] ?? 0) + 1
  }
  return [...buckets]
    .filter(([, votes]) => Object.keys(votes).length > 0)
    .map(([key, votes]) => ({ key, votes }))
}

export function estimatorVotes<T extends { player_id: string }>(
  votes: readonly T[],
  shieldsByPlayer: ReadonlyMap<string, string[]> | undefined,
): T[] {
  const estimators = votes.filter(vote => {
    const cohort = voteCohortFor(shieldsByPlayer, vote.player_id)
    return cohort !== null && ESTIMATOR_COHORTS.includes(cohort)
  })
  return estimators.length ? estimators : [...votes]
}

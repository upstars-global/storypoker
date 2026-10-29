import { roleTagForShields } from './shields'

export const RESULT_COHORTS: readonly string[] = ['DEV', 'BE', 'FE', 'SRE', 'QA']
export const ALWAYS_SHOWN_COHORT = 'QA'
export const DEV_UMBRELLA_COHORT = 'DEV'
export const DEFAULT_RESULT_COHORTS: readonly string[] = RESULT_COHORTS
export const PRODUCT_COHORTS: readonly string[] = ['PO', 'SM']
export const ROLE_COHORTS: readonly string[] = [...RESULT_COHORTS, ...PRODUCT_COHORTS]
export const COHORT_COLORS: Record<string, string> = {
  DEV: '#26a69a',
  BE: '#42a5f5',
  FE: '#ab47bc',
  SRE: '#8d6e63',
  QA: '#ffa726',
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
  ['GQA', 'QA'],
  ['AQA', 'QA'],
  ['PO', 'PO'],
  ['SM', 'SM'],
])

export function normalizeCohorts(value: readonly string[] | null | undefined): string[] {
  const chosen = new Set([...(value ?? DEFAULT_RESULT_COHORTS), ALWAYS_SHOWN_COHORT])
  return RESULT_COHORTS.filter(tag => chosen.has(tag))
}

export function cohortForShields(shields: string[] | null | undefined): string | null {
  const tag = roleTagForShields(shields)
  return tag ? COHORT_BY_TAG.get(tag) ?? null : DEV_UMBRELLA_COHORT
}

export function voteCohortFor(shieldsByPlayer: ReadonlyMap<string, string[]> | undefined, playerId: string): string | null {
  const shields = shieldsByPlayer?.get(playerId)
  return shields ? cohortForShields(shields) : DEV_UMBRELLA_COHORT
}

export function resultCohortFor(cohort: string | null, selected: readonly string[]): string | null {
  if (!cohort) return null
  if (selected.includes(cohort) || PRODUCT_COHORTS.includes(cohort)) return cohort
  return DEV_SUBCOHORTS.has(cohort) && selected.includes(DEV_UMBRELLA_COHORT) ? DEV_UMBRELLA_COHORT : null
}

export function groupVotesByCohort(
  players: readonly { shields: string[] | null; vote: string | null }[],
  cohorts: readonly string[],
): VoteGroup[] {
  const selected = normalizeCohorts(cohorts)
  const buckets = new Map<string, VoteCounts>([...selected, ...PRODUCT_COHORTS].map(key => [key, {}]))
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

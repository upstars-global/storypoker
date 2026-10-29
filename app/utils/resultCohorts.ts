import { roleTagForShields } from './shields'

export const RESULT_COHORTS: readonly string[] = ['DEV', 'BE', 'FE', 'SRE', 'QA']
export const ALWAYS_SHOWN_COHORT = 'QA'
export const DEV_UMBRELLA_COHORT = 'DEV'
export const DEFAULT_RESULT_COHORTS: readonly string[] = [DEV_UMBRELLA_COHORT, 'BE', 'FE', ALWAYS_SHOWN_COHORT]
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
])

export function normalizeCohorts(value: readonly string[] | null | undefined): string[] {
  const chosen = new Set([...(value ?? DEFAULT_RESULT_COHORTS), ALWAYS_SHOWN_COHORT])
  return RESULT_COHORTS.filter(tag => chosen.has(tag))
}

export function cohortForShields(shields: string[] | null | undefined): string | null {
  const tag = roleTagForShields(shields)
  return tag ? COHORT_BY_TAG.get(tag) ?? null : DEV_UMBRELLA_COHORT
}

export function resultCohortFor(cohort: string | null, selected: readonly string[]): string | null {
  if (!cohort) return null
  if (selected.includes(cohort)) return cohort
  return DEV_SUBCOHORTS.has(cohort) && selected.includes(DEV_UMBRELLA_COHORT) ? DEV_UMBRELLA_COHORT : null
}

export function groupVotesByCohort(
  players: readonly { shields: string[] | null; vote: string | null }[],
  cohorts: readonly string[],
): VoteGroup[] {
  const selected = normalizeCohorts(cohorts)
  const buckets = new Map<string, VoteCounts>(selected.map(key => [key, {}]))
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

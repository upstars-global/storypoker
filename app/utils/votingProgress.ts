import { isQaPlayer, roleTagForShields } from '~/utils/shields'

const DEV_TAGS = new Set(['DEV', 'BE', 'FE'])

export type VotingGroupKey = 'dev' | 'qa' | 'other'

export interface VotingGroupProgress {
  key: VotingGroupKey
  total: number
  voted: number
  percent: number
}

export interface VotingProgress {
  total: number
  voted: number
  percent: number
  groups: VotingGroupProgress[]
  waiting: { id: string; name: string }[]
}

interface VotingPlayer {
  id: string
  name: string
  vote: string | null
  shields: string[] | null | undefined
}

function groupKeyFor(player: VotingPlayer): VotingGroupKey {
  if (isQaPlayer(player.shields)) return 'qa'
  const tag = roleTagForShields(player.shields)
  if (tag && DEV_TAGS.has(tag)) return 'dev'
  return 'other'
}

function percentOf(voted: number, total: number): number {
  return total === 0 ? 0 : Math.round((voted / total) * 100)
}

export function votingProgress(players: VotingPlayer[]): VotingProgress {
  const buckets: Record<VotingGroupKey, { total: number; voted: number }> = {
    dev: { total: 0, voted: 0 },
    qa: { total: 0, voted: 0 },
    other: { total: 0, voted: 0 },
  }
  const waiting: { id: string; name: string }[] = []
  let voted = 0

  for (const p of players) {
    const bucket = buckets[groupKeyFor(p)]
    bucket.total++
    if (p.vote !== null) {
      bucket.voted++
      voted++
    } else {
      waiting.push({ id: p.id, name: p.name })
    }
  }

  const groups = (Object.keys(buckets) as VotingGroupKey[])
    .filter(key => buckets[key].total > 0)
    .map(key => ({
      key,
      total: buckets[key].total,
      voted: buckets[key].voted,
      percent: percentOf(buckets[key].voted, buckets[key].total),
    }))

  return {
    total: players.length,
    voted,
    percent: percentOf(voted, players.length),
    groups,
    waiting,
  }
}

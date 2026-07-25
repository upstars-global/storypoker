import { alignmentScore } from './alignment'
import { isQaPlayer } from './shields'
import { DECK_PRESETS, DEFAULT_PRESET_ID } from './cardDecks'
import type { RoundHistory } from '~/stores/types'

// Rounds recorded before migration 010 (active_cards) - or before deck_preset
// existed at all - have no deck snapshot to compute alignment against.
// Approximate with defaultActive for the round's preset (or DEFAULT_PRESET_ID
// when even the preset is missing) so legacy history still contributes.
// Mirrors resolveActiveCards in netlify/functions/room-json.mts - keep both in sync.
function resolveActiveCards(activeCards: string[] | null, deckPreset: string | null): string[] | null {
  if (activeCards?.length) return activeCards
  const preset = DECK_PRESETS.find(p => p.id === (deckPreset ?? DEFAULT_PRESET_ID))
  return preset?.defaultActive ?? null
}

export function voteToNumber(v: string): number | null {
  const trimmed = v.replace(/\s*\*$/, '').replace(/h$/i, '')
  if (trimmed === '1/2') return 0.5
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function averageOf(votes: Record<string, number>): string | null {
  let sum = 0
  let count = 0
  for (const [vote, c] of Object.entries(votes)) {
    const n = voteToNumber(vote)
    if (n === null) continue
    sum += n * c
    count += c
  }
  if (count === 0) return null
  return (sum / count).toFixed(1)
}

export function isPollPreset(preset: string | null | undefined): boolean {
  return preset === 'voting' || preset === 'vote_question'
}

export function isNumericPreset(preset: string | null | undefined): boolean {
  if (preset == null) return true
  return preset === 'scrum' || preset === 'fibonacci' || preset === 'hours'
}

export interface RoundSummary {
  id: string
  revealedAt: string
  voterCount: number
  average: string | null
  alignment: number | null
  counts: Record<string, number>
  isPoll: boolean
  deckPreset: string | null
}

export function splitRoundAlignment(
  round: RoundHistory,
  shieldsByPlayer: Map<string, string[]>,
): { dev: number | null; qa: number | null } {
  const devCounts: Record<string, number> = {}
  const qaCounts: Record<string, number> = {}
  for (const v of round.votes) {
    const shields = shieldsByPlayer.get(v.player_id) ?? []
    if (isQaPlayer(shields)) {
      qaCounts[v.vote] = (qaCounts[v.vote] ?? 0) + 1
    } else {
      devCounts[v.vote] = (devCounts[v.vote] ?? 0) + 1
    }
  }
  const activeCards = resolveActiveCards(round.active_cards, round.deck_preset)
  return {
    dev: alignmentScore(devCounts, activeCards),
    qa: alignmentScore(qaCounts, activeCards),
  }
}

export function roundAlignment(
  round: RoundHistory,
  shieldsByPlayer: Map<string, string[]>,
): number | null {
  const { dev, qa } = splitRoundAlignment(round, shieldsByPlayer)
  if (dev !== null && qa !== null) return Math.round((dev + qa) / 2)
  if (dev !== null || qa !== null) return dev ?? qa
  const counts: Record<string, number> = {}
  for (const v of round.votes) counts[v.vote] = (counts[v.vote] ?? 0) + 1
  return alignmentScore(counts, resolveActiveCards(round.active_cards, round.deck_preset))
}

export function summarizeRound(round: RoundHistory): RoundSummary {
  const counts: Record<string, number> = {}
  for (const v of round.votes) counts[v.vote] = (counts[v.vote] ?? 0) + 1
  const isPoll = isPollPreset(round.deck_preset)
  return {
    id: round.id,
    revealedAt: round.revealed_at,
    voterCount: round.votes.length,
    average: isPoll ? null : averageOf(counts),
    alignment: isPoll ? null : alignmentScore(counts, resolveActiveCards(round.active_cards, round.deck_preset)),
    counts,
    isPoll,
    deckPreset: round.deck_preset,
  }
}

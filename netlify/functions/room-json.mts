import { createClient } from '@supabase/supabase-js'

// Same alignment/average scoring as app/utils/alignment.ts + app/utils/roundStats.ts,
// duplicated here (not imported) so this function has no dependency on Vite path
// aliases (~/*) that Netlify's function bundler does not resolve.

const NON_ESTIMATE = new Set(['?', '☕'])

function alignmentScore(votes: Record<string, number>, deckOrder: string[] | undefined | null): number | null {
  if (!deckOrder?.length) return null
  const estimateCards = deckOrder.filter(c => !NON_ESTIMATE.has(c))
  const pos = new Map(estimateCards.map((c, i) => [c, i]))
  const indices: number[] = []
  for (const [vote, count] of Object.entries(votes)) {
    const p = pos.get(vote)
    if (p === undefined) continue
    for (let k = 0; k < count; k++) indices.push(p)
  }
  if (indices.length < 2) return null
  const span = estimateCards.length - 1
  if (span <= 0) return 100
  const spread = Math.max(...indices) - Math.min(...indices)
  return Math.round(100 * (1 - spread / span))
}

function voteToNumber(v: string): number | null {
  const trimmed = v.replace(/\s*\*$/, '').replace(/h$/i, '')
  if (trimmed === '1/2') return 0.5
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function averageOf(votes: Record<string, number>): number | null {
  let sum = 0
  let count = 0
  for (const [vote, c] of Object.entries(votes)) {
    const n = voteToNumber(vote)
    if (n === null) continue
    sum += n * c
    count += c
  }
  if (count === 0) return null
  return Math.round((sum / count) * 10) / 10
}

// Deck presets that carry a numeric estimate — mirrors CSV_EXPORT_DECKS in HistoryModal.vue
const DECK_NAMES: Record<string, string> = {
  scrum: 'Scrum Scale',
  fibonacci: 'Fibonacci Sequence',
}

// QA disciplines route a player's vote into the separate QA pile — mirrors
// QA_SHIELDS/isQaPlayer in app/utils/shields.ts.
const QA_SHIELDS = new Set(['qa', 'aqa', 'gqa'])

function isQaPlayer(shields: string[] | null | undefined): boolean {
  return Boolean(shields?.some(id => QA_SHIELDS.has(id)))
}

// Mirrors splitRoundAlignment() in app/utils/roundStats.ts — same per-round
// DEV/QA split shown in the storypoker app's own Alignment Trends modal.
function splitAlignment(
  votes: { player_id: string; vote: string }[],
  shieldsByPlayer: Map<string, string[]>,
  activeCards: string[] | null,
): { dev: number | null; qa: number | null } {
  const devCounts: Record<string, number> = {}
  const qaCounts: Record<string, number> = {}
  for (const v of votes) {
    const shields = shieldsByPlayer.get(v.player_id) ?? []
    if (isQaPlayer(shields)) qaCounts[v.vote] = (qaCounts[v.vote] ?? 0) + 1
    else devCounts[v.vote] = (devCounts[v.vote] ?? 0) + 1
  }
  return { dev: alignmentScore(devCounts, activeCards), qa: alignmentScore(qaCounts, activeCards) }
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `W${week}`
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=60',
    },
  })
}

interface RoundRow {
  id: string
  revealed_at: string | null
  votes: { player_id: string; name: string; vote: string }[] | null
  active_cards: string[] | null
  deck_preset: string | null
}

export default async (req: Request): Promise<Response> => {
  const slug = decodeURIComponent(new URL(req.url).pathname.replace(/^\/api\//, '').replace(/\.json$/i, ''))
  if (!slug) return json({ error: 'missing room slug' }, 400)

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_KEY
  if (!url || !key) return json({ error: 'server misconfigured' }, 500)

  const supabase = createClient(url, key)

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, slug, name')
    .or(`id.eq.${slug},slug.eq.${slug}`)
    .maybeSingle()

  if (roomErr) return json({ error: 'query failed' }, 500)
  if (!room) return json({ error: 'room not found' }, 404)

  const [{ data: rounds, error: roundsErr }, { data: players, error: playersErr }] = await Promise.all([
    supabase
      .from('round_history')
      .select('id, revealed_at, votes, active_cards, deck_preset')
      .eq('room_id', room.id)
      .not('revealed_at', 'is', null)
      .order('revealed_at', { ascending: true }),
    supabase
      .from('players')
      .select('id, shields, left_at')
      .eq('room_id', room.id),
  ])

  if (roundsErr || playersErr) return json({ error: 'query failed' }, 500)

  // Mirrors visiblePlayers in stores/players.ts — a player who has since left the
  // room falls back to being counted as DEV, same as in the storypoker app itself.
  const shieldsByPlayer = new Map<string, string[]>(
    (players ?? []).filter(p => p.left_at === null).map(p => [p.id as string, (p.shields ?? []) as string[]]),
  )

  const result = ((rounds ?? []) as RoundRow[])
    .filter(r => r.deck_preset != null && r.deck_preset in DECK_NAMES)
    .map((r) => {
      const counts: Record<string, number> = {}
      for (const v of r.votes ?? []) counts[v.vote] = (counts[v.vote] ?? 0) + 1
      const date = new Date(r.revealed_at as string)
      const { dev, qa } = splitAlignment(r.votes ?? [], shieldsByPlayer, r.active_cards)
      return {
        id: r.id,
        date: r.revealed_at,
        week: isoWeek(date),
        deck: DECK_NAMES[r.deck_preset as string],
        average: averageOf(counts),
        devAlignment: dev,
        qaAlignment: qa,
        voters: (r.votes ?? []).length,
      }
    })
    .filter(r => r.average !== null && (r.devAlignment !== null || r.qaAlignment !== null))

  return json({ room: { id: room.id, slug: room.slug, name: room.name }, rounds: result })
}

export const config = {
  path: '/api/*',
}

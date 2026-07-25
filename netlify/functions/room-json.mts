import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

// Human-readable names for the deck presets that carry a numeric estimate.
// Mirrors DECK_PRESETS in app/utils/cardDecks.ts for just the numeric subset.
const DECK_NAMES: Record<string, string> = {
  scrum: 'Scrum Scale',
  fibonacci: 'Fibonacci Sequence',
  hours: 'Hours',
}

// A deck contributes to alignment/average only when its cards form an ordered
// numeric scale - mirrors isNumericPreset() in app/utils/roundStats.ts. Poll-style
// decks (vote_question, voting) and non-scalar decks (tshirt, boolean) are excluded;
// `null` covers legacy rounds recorded before deck_preset existed.
function isNumericPreset(preset: string | null): boolean {
  return preset === null || preset in DECK_NAMES
}

// Fallback deck order for rounds recorded before active_cards existed
// (supabase/migrations/010_round_history_deck.sql) - defaultActive from
// app/utils/cardDecks.ts for each numeric preset. An approximation (the deck
// actually shown at the time may have had a different active subset), used
// only when active_cards is null so legacy rounds still contribute alignment.
const DEFAULT_ACTIVE_CARDS: Record<string, string[]> = {
  scrum: ['1/2', '1', '2', '3', '5', '8', '13', '20', '?', '☕'],
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  hours: ['1/2h', '1h', '2h', '3h', '5h', '8h', '13h', '20h', '?', '☕'],
}

// Rounds recorded before deck_preset existed have no preset at all - a second,
// bigger approximation on top of the one above: assume DEFAULT_PRESET_ID
// ('scrum' in app/utils/cardDecks.ts) rather than dropping them entirely.
const LEGACY_DEFAULT_PRESET = 'scrum'

function resolveActiveCards(activeCards: string[] | null, deckPreset: string | null): string[] | null {
  if (activeCards?.length) return activeCards
  return DEFAULT_ACTIVE_CARDS[deckPreset ?? LEGACY_DEFAULT_PRESET] ?? null
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
      'cache-control': 'private, no-store',
    },
  })
}

interface RoomRow {
  id: string
  slug: string | null
  name: string | null
}

interface RoundRow {
  id: string
  revealed_at: string | null
  votes: { player_id: string; name: string; vote: string }[] | null
  active_cards: string[] | null
  deck_preset: string | null
}

async function buildRoomPayload(supabase: SupabaseClient, room: RoomRow) {
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

  if (roundsErr || playersErr) return { room: { id: room.id, slug: room.slug, name: room.name }, rounds: [], error: 'query failed' }

  // Mirrors visiblePlayers in stores/players.ts — a player who has since left the
  // room falls back to being counted as DEV, same as in the storypoker app itself.
  const shieldsByPlayer = new Map<string, string[]>(
    (players ?? []).filter(p => p.left_at === null).map(p => [p.id as string, (p.shields ?? []) as string[]]),
  )

  const result = ((rounds ?? []) as RoundRow[])
    .filter(r => isNumericPreset(r.deck_preset))
    .map((r) => {
      const counts: Record<string, number> = {}
      for (const v of r.votes ?? []) counts[v.vote] = (counts[v.vote] ?? 0) + 1
      const date = new Date(r.revealed_at as string)
      const { dev, qa } = splitAlignment(r.votes ?? [], shieldsByPlayer, resolveActiveCards(r.active_cards, r.deck_preset))
      return {
        id: r.id,
        date: r.revealed_at,
        week: isoWeek(date),
        deck: r.deck_preset ? (DECK_NAMES[r.deck_preset] ?? r.deck_preset) : '',
        average: averageOf(counts),
        devAlignment: dev,
        qaAlignment: qa,
        voters: (r.votes ?? []).length,
      }
    })
    .filter(r => r.average !== null && (r.devAlignment !== null || r.qaAlignment !== null))

  return { room: { id: room.id, slug: room.slug, name: room.name }, rounds: result }
}

// Shared-secret gate - mirrors the Authorization: Bearer pattern used by
// agilecharts' own webhooks (server/api/webhooks/fe-weekly-report.post.ts).
// Without it, anyone who knows a room slug (or /api/teams.json, which needs
// no slug at all) could read every team's voting history.
function isAuthorized(req: Request): boolean {
  const token = process.env.STORYPOKER_API_TOKEN
  if (!token) return false
  return req.headers.get('authorization') === `Bearer ${token}`
}

export default async (req: Request): Promise<Response> => {
  if (!process.env.STORYPOKER_API_TOKEN) return json({ error: 'server misconfigured' }, 500)
  if (!isAuthorized(req)) return json({ error: 'unauthorized' }, 401)

  const rawSlug = decodeURIComponent(new URL(req.url).pathname.replace(/^\/api\//, '').replace(/\.json$/i, ''))
  if (!rawSlug) return json({ error: 'missing room slug' }, 400)

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_KEY
  if (!url || !key) return json({ error: 'server misconfigured' }, 500)

  const supabase = createClient(url, key)

  if (rawSlug === 'teams') {
    const { data: rooms, error: roomsErr } = await supabase.from('rooms').select('id, slug, name')
    if (roomsErr) return json({ error: 'query failed' }, 500)
    const teams = await Promise.all((rooms ?? []).map(room => buildRoomPayload(supabase, room as RoomRow)))
    return json({ teams })
  }

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .select('id, slug, name')
    .or(`id.eq.${rawSlug},slug.eq.${rawSlug}`)
    .maybeSingle()

  if (roomErr) return json({ error: 'query failed' }, 500)
  if (!room) return json({ error: 'room not found' }, 404)

  return json(await buildRoomPayload(supabase, room as RoomRow))
}

export const config = {
  path: '/api/*',
}

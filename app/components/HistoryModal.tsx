import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AppIcon from '~/components/AppIcon'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import RoundSnapshotModal from '~/components/RoundSnapshotModal'
import { useCardLabel } from '~/hooks/useCardLabel'
import { useShieldsMap } from '~/hooks/useShieldsMap'
import { useRoomStore } from '~/stores/room'
import type { RoundHistory } from '~/stores/types'
import { DECK_PRESETS } from '~/utils/cardDecks'
import { isNumericPreset, summarizeRound, voteToNumber, type RoundSummary } from '~/utils/roundStats'
import { COHORT_BADGE_TEXT_COLORS, COHORT_COLORS, ROLE_COHORTS, voteCohortFor } from '~/utils/resultCohorts'

type HistoryModalProps = {
  onClose: () => void
}

type EnrichedSummary = RoundSummary & {
  trend: 'up' | 'down' | 'flat' | null
  round: RoundHistory
  roleRows: { role: string | null; counts: Record<string, number> }[]
}

const FILTER_ACTIVE = 'bg-elevated text-primary'
const FILTER_IDLE = 'text-muted hover:text-body'

function filterClass(active: boolean) {
  return `rounded px-3 py-1 text-mui-caption font-medium transition-colors ${active ? FILTER_ACTIVE : FILTER_IDLE}`
}

function deckName(id: string): string {
  return DECK_PRESETS.find(p => p.id === id)?.name ?? id
}

function hasNumericVote(counts: Record<string, number>): boolean {
  return Object.keys(counts).some(v => voteToNumber(v) !== null)
}

function alignmentColor(a: number): string {
  if (a >= 80) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}

function sortedCounts(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

function quarterOf(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1
}

export default function HistoryModal({ onClose }: HistoryModalProps) {
  const { t, i18n } = useTranslation()
  const cardLabel = useCardLabel()
  const shieldsMap = useShieldsMap()
  const [loading, setLoading] = useState(true)
  const [rounds, setRounds] = useState<RoundHistory[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null)
  const [deckFilter, setDeckFilter] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<RoundHistory | null>(null)

  const summaries = useMemo<EnrichedSummary[]>(() => {
    const base = rounds.map(round => summarizeRound(round, shieldsMap))
    return base.map((s, i) => {
      const older = base[i + 1]
      let trend: EnrichedSummary['trend'] = null
      if (s.alignment !== null && older?.alignment != null) {
        trend = s.alignment > older.alignment ? 'up' : s.alignment < older.alignment ? 'down' : 'flat'
      }
      const round = rounds[i]!
      const countsByRole = new Map<string | null, Record<string, number>>()
      for (const v of round.votes) {
        const role = voteCohortFor(shieldsMap, v.player_id)
        const counts = countsByRole.get(role) ?? {}
        counts[v.vote] = (counts[v.vote] ?? 0) + 1
        countsByRole.set(role, counts)
      }
      const roleRows: EnrichedSummary['roleRows'] = ROLE_COHORTS.flatMap(role => {
        const counts = countsByRole.get(role)
        return counts ? [{ role, counts }] : []
      })
      if (roleRows.length < 2) {
        return { ...s, trend, round, roleRows: [{ role: null, counts: s.counts }] }
      }
      const customCounts = countsByRole.get(null)
      if (customCounts) roleRows.push({ role: null, counts: customCounts })
      return { ...s, trend, round, roleRows }
    })
  }, [rounds, shieldsMap])

  useEffect(() => {
    let active = true
    void useRoomStore.getState().fetchHistory().then((fetched) => {
      if (!active) return
      setRounds(fetched)
      const newest = fetched[0]
      if (newest) setSelectedYear(new Date(newest.revealed_at).getFullYear())
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const dateFmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
  const timeFmt = new Intl.DateTimeFormat(i18n.language, { timeStyle: 'short' })

  const years = new Set<number>()
  const decks = new Set<string>()
  for (const s of summaries) {
    if (isNumericPreset(s.deckPreset)) years.add(new Date(s.revealedAt).getFullYear())
    if (s.deckPreset && isNumericPreset(s.deckPreset)) decks.add(s.deckPreset)
  }
  const availableYears = [...years].sort((a, b) => b - a)
  const availableDecks = [...decks]

  const filteredSummaries = summaries.filter((s) => {
    if (!isNumericPreset(s.deckPreset)) return false
    if (s.deckPreset == null && !hasNumericVote(s.counts)) return false
    const d = new Date(s.revealedAt)
    if (selectedYear !== null && d.getFullYear() !== selectedYear) return false
    if (selectedQuarter !== null && quarterOf(d) !== selectedQuarter) return false
    if (deckFilter !== null && s.deckPreset !== deckFilter) return false
    return true
  })

  const groupMap = new Map<string, EnrichedSummary[]>()
  for (const s of filteredSummaries) {
    const d = new Date(s.revealedAt)
    const key = `${d.getFullYear()}-Q${quarterOf(d)}`
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(s)
  }
  const groups = [...groupMap.entries()].map(([key, items]) => ({
    key,
    label: `Q${key.split('-Q')[1]} ${key.split('-Q')[0]}`,
    rounds: items,
  }))

  let body
  if (loading) {
    body = (
      <p className="mt-8 text-center text-mui-body text-muted">
        {t('common.loading')}
      </p>
    )
  } else if (!summaries.length) {
    body = (
      <p className="mt-8 text-center text-mui-body text-muted">
        {t('history.empty')}
      </p>
    )
  } else if (!filteredSummaries.length) {
    body = (
      <p className="mt-8 text-center text-mui-body text-muted">
        {t('history.emptyRange')}
      </p>
    )
  } else {
    body = (
      <div className="mt-6 flex flex-col gap-7">
        {groups.map(g => (
          <section
            key={g.key}
            className="flex flex-col gap-3"
          >
            <h3 className="text-mui-caption font-semibold uppercase tracking-wide text-muted">
              {g.label}
            </h3>
            {g.rounds.map(r => (
              <button
                key={r.id}
                type="button"
                className="flex w-full flex-col gap-2 rounded border p-3 text-left transition-colors hover:bg-elevated"
                data-testid="history-round"
                onClick={() => setSelectedRound(r.round)}
              >
                <div className="flex w-full items-center justify-between gap-3 text-mui-body text-primary">
                  <div className="flex items-center gap-2">
                    <span>{dateFmt.format(new Date(r.revealedAt))}</span>
                    <span className="text-muted">·</span>
                    <span>{timeFmt.format(new Date(r.revealedAt))}</span>
                    {r.deckPreset && (
                      <span className="text-mui-caption text-muted">
                        {deckName(r.deckPreset)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-mui-caption">
                    {r.average !== null && (
                      <span>
                        {t('history.average')}
                        {': '}
                        <span className="font-semibold">{r.average}</span>
                      </span>
                    )}
                    {r.alignment !== null && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block rounded-full"
                          style={{ width: '9px', height: '9px', backgroundColor: alignmentColor(r.alignment) }}
                        />
                        <span className="font-semibold">{r.alignment}</span>
                        {r.trend === 'up' && (
                          <AppIcon
                            name="ic:baseline-arrow-drop-up"
                            style={{ fontSize: '1.25rem', color: '#43a047' }}
                          />
                        )}
                        {r.trend === 'down' && (
                          <AppIcon
                            name="ic:baseline-arrow-drop-down"
                            style={{ fontSize: '1.25rem', color: '#e64a19' }}
                          />
                        )}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted">
                      <AppIcon
                        name="ic:baseline-account-circle"
                        style={{ fontSize: '1rem' }}
                      />
                      {r.voterCount}
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-col gap-1.5">
                  {r.roleRows.map(({ role, counts }) => (
                    <div
                      key={role ?? 'all'}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {role !== null && (
                        <span
                          className="rounded px-1.5 py-0.5 text-mui-caption font-semibold"
                          style={{ backgroundColor: COHORT_COLORS[role], color: COHORT_BADGE_TEXT_COLORS[role] }}
                        >
                          {role}
                        </span>
                      )}
                      {sortedCounts(counts).map(([card, count]) => (
                        <span
                          key={card}
                          className="rounded bg-elevated px-2 py-0.5 text-mui-caption text-body"
                        >
                          {`${cardLabel(card)} × ${count}`}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </section>
        ))}
      </div>
    )
  }

  return (
    <AppModal
      labelledby="history-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '640px', width: '92vw', maxHeight: '86vh', overflowY: 'auto', padding: '32px 36px 36px' }}
        onClose={onClose}
      >
        <h2
          id="history-modal-title"
          className="text-center text-mui-h2 font-bold text-primary"
        >
          {t('history.title')}
        </h2>

        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex gap-1">
                {availableYears.map(year => (
                  <button
                    key={year}
                    className={filterClass(selectedYear === year)}
                    onClick={() => {
                      setSelectedYear(year)
                      setSelectedQuarter(null)
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(q => (
                  <button
                    key={q}
                    className={filterClass(selectedQuarter === q)}
                    onClick={() => setSelectedQuarter(selectedQuarter === q ? null : q)}
                  >
                    {`Q${q}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {availableDecks.length > 1 && (
            <div className="flex flex-wrap justify-center gap-1">
              <button
                className={filterClass(deckFilter === null)}
                onClick={() => setDeckFilter(null)}
              >
                {t('history.filter.allDecks')}
              </button>
              {availableDecks.map(deck => (
                <button
                  key={deck}
                  className={filterClass(deckFilter === deck)}
                  onClick={() => setDeckFilter(deck)}
                >
                  {deckName(deck)}
                </button>
              ))}
            </div>
          )}
        </div>

        {body}
      </AppModalPaper>
      {selectedRound && (
        <RoundSnapshotModal
          round={selectedRound}
          shieldsMap={shieldsMap}
          onClose={() => setSelectedRound(null)}
        />
      )}
    </AppModal>
  )
}

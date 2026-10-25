import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { use as registerChartModules, type EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import AppIcon from '~/components/AppIcon'
import AppModal from '~/components/AppModal'
import AppModalPaper from '~/components/AppModalPaper'
import RoundSnapshotModal from '~/components/RoundSnapshotModal'
import { useEChart } from '~/hooks/useEChart'
import { useShieldsMap } from '~/hooks/useShieldsMap'
import { useRoomStore } from '~/stores/room'
import type { RoundHistory } from '~/stores/types'
import { DECK_PRESETS } from '~/utils/cardDecks'
import { isNumericPreset, splitRoundAlignment, summarizeRound, voteToNumber } from '~/utils/roundStats'
import { DEV_COHORT_LABEL, type TrendCohort } from '~/utils/shields'

registerChartModules([CanvasRenderer, LineChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent])

type AlignmentTrendsModalProps = {
  roomName?: string
  onClose: () => void
}

type TimeRange = '30D' | '90D' | '6M' | '1Y'

const TIME_RANGES: readonly TimeRange[] = ['30D', '90D', '6M', '1Y']

interface ChartPoint {
  date: Date
  devAlignment: number | null
  qaAlignment: number | null
  deckPreset: string | null
  round: RoundHistory
}

const REF_LINES = [
  { v: 100, label: '100%', color: '#43a047', dashed: false },
  { v: 75, label: '75%', color: '#43a047', dashed: false },
  { v: 50, label: '50%', color: '#fbc02d', dashed: true },
  { v: 25, label: '25%', color: '#e64a19', dashed: true },
]

const DAY_MS = 86400000

function deckName(id: string): string {
  return DECK_PRESETS.find(p => p.id === id)?.name ?? id
}

function alignmentLevel(a: number): string {
  if (a >= 90) return 'Perfect'
  if (a >= 75) return 'High'
  if (a >= 40) return 'Medium'
  return 'Low'
}

function levelColor(a: number): string {
  if (a >= 75) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function cutoffFor(range: TimeRange): Date {
  const d = new Date()
  if (range === '30D') d.setDate(d.getDate() - 30)
  else if (range === '90D') d.setDate(d.getDate() - 90)
  else if (range === '6M') d.setMonth(d.getMonth() - 6)
  else d.setFullYear(d.getFullYear() - 1)
  return d
}

function average(values: (number | null)[]): number | null {
  const vals = values.filter((v): v is number => v !== null)
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
}

function rangeClass(active: boolean, padding: string): string {
  return `rounded ${padding} py-0.5 text-mui-caption font-medium transition-colors ${active ? 'bg-elevated text-primary' : 'text-muted hover:text-body'}`
}

type TrendsChartProps = {
  option: EChartsCoreOption
  onViewDetails: (index: number, cohort: TrendCohort) => void
}

function TrendsChart({ option, onViewDetails }: TrendsChartProps) {
  const container = useRef<HTMLDivElement | null>(null)
  const chart = useEChart(container, option)
  const viewDetails = useRef(onViewDetails)

  useEffect(() => {
    viewDetails.current = onViewDetails
  })

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (!target?.closest) return
      const detailsEl = target.closest<HTMLElement>('[data-view-details]')
      if (detailsEl) {
        const cohort: TrendCohort = detailsEl.dataset.cohort === 'QA' ? 'QA' : 'DEV'
        viewDetails.current(Number(detailsEl.dataset.index), cohort)
        chart.current?.dispatchAction({ type: 'hideTip' })
        return
      }
      if (target.closest('[data-close-tooltip]')) {
        chart.current?.dispatchAction({ type: 'hideTip' })
      }
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [chart])

  return (
    <div
      ref={container}
      style={{ height: '300px' }}
    />
  )
}

export default function AlignmentTrendsModal({ roomName, onClose }: AlignmentTrendsModalProps) {
  const { t, i18n } = useTranslation()
  const shieldsMap = useShieldsMap()
  const [timeRange, setTimeRange] = useState<TimeRange>('6M')
  const [allPoints, setAllPoints] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [deckFilter, setDeckFilter] = useState<string | null>(null)
  const [showDevSeries, setShowDevSeries] = useState(true)
  const [showQaSeries, setShowQaSeries] = useState(true)
  const [selectedRound, setSelectedRound] = useState<RoundHistory | null>(null)
  const [selectedCohort, setSelectedCohort] = useState<TrendCohort | null>(null)
  const shieldsRef = useRef(shieldsMap)

  useEffect(() => {
    shieldsRef.current = shieldsMap
  })

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const rounds = await useRoomStore.getState().fetchHistory()
        if (!active) return
        setAllPoints(rounds
          .filter((r) => {
            const s = summarizeRound(r)
            if (!isNumericPreset(s.deckPreset)) return false
            if (s.deckPreset == null && !Object.keys(s.counts).some(v => voteToNumber(v) !== null)) return false
            return true
          })
          .map((r) => {
            const { dev, qa } = splitRoundAlignment(r, shieldsRef.current)
            return { date: new Date(r.revealed_at), devAlignment: dev, qaAlignment: qa, deckPreset: r.deck_preset, round: r }
          })
          .sort((a, b) => a.date.getTime() - b.date.getTime()))
      } catch (e) {
        console.error('[AlignmentTrendsModal] fetchHistory error:', e)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  const [cutoff, setCutoff] = useState(() => cutoffFor(timeRange))

  function selectRange(range: TimeRange) {
    setTimeRange(range)
    setCutoff(cutoffFor(range))
  }

  const availableDecks = useMemo(() => {
    const seen = new Set<string>()
    for (const p of allPoints) {
      if (p.deckPreset) seen.add(p.deckPreset)
    }
    return [...seen]
  }, [allPoints])

  const points = useMemo(() => allPoints.filter(p =>
    p.date >= cutoff
    && (deckFilter === null || p.deckPreset === deckFilter),
  ), [allPoints, cutoff, deckFilter])

  const hasQaData = points.some(p => p.qaAlignment !== null)
  const currentDevScore = [...points].reverse().find(p => p.devAlignment !== null)?.devAlignment ?? null
  const currentQaScore = [...points].reverse().find(p => p.qaAlignment !== null)?.qaAlignment ?? null
  const avgDev = average(points.map(p => p.devAlignment))
  const avgQa = average(points.map(p => p.qaAlignment))
  const estimatesCount = points.length
  const hasEnoughData = points.length >= 2

  let trend: { pct: number; dir: 'up' | 'down' | 'stable' } | null = null
  const devVals = points.map(p => p.devAlignment).filter((v): v is number => v !== null)
  if (devVals.length >= 4) {
    const half = Math.floor(devVals.length / 2)
    const recentAvg = devVals.slice(half).reduce((s, v) => s + v, 0) / (devVals.length - half)
    const olderAvg = devVals.slice(0, half).reduce((s, v) => s + v, 0) / half
    const pct = olderAvg === 0 ? 0 : ((recentAvg - olderAvg) / olderAvg) * 100
    trend = {
      pct: Math.abs(Math.round(pct * 10) / 10),
      dir: pct > 1 ? 'up' : pct < -1 ? 'down' : 'stable',
    }
  }

  const locale = i18n.language

  const chartOption = useMemo<EChartsCoreOption>(() => {
    const axisDateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    const tooltipDateFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' })

    // A null slot between sessions more than one calendar day apart breaks the line there,
    // so separate estimation sessions do not read as one continuous run; indexMap maps each
    // slot back to its points index (-1 for inserted gap slots).
    const categories: string[] = []
    const dev: (number | null)[] = []
    const qa: (number | null)[] = []
    const indexMap: number[] = []
    points.forEach((p, i) => {
      const prev = points[i - 1]
      if (prev && (startOfDay(p.date) - startOfDay(prev.date)) / DAY_MS > 1) {
        categories.push('')
        dev.push(null)
        qa.push(null)
        indexMap.push(-1)
      }
      categories.push(`${axisDateFmt.format(p.date)}\nw${isoWeek(p.date)}`)
      dev.push(p.devAlignment)
      qa.push(p.qaAlignment)
      indexMap.push(i)
    })

    function tooltipFormatter(params: { dataIndex: number; seriesName?: string; value?: number | null }): string {
      const realIdx = indexMap[params.dataIndex] ?? -1
      const point = points[realIdx]
      if (!point || params.value === null || params.value === undefined) return ''
      const dateStr = tooltipDateFmt.format(point.date)
      const cohort: TrendCohort = params.seriesName === 'QA' ? 'QA' : 'DEV'
      return `<div style="min-width:130px">`
        + `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">`
        + `<span style="font-weight:600;color:#fff;font-size:11px;">${params.seriesName} ${params.value}%</span>`
        + `<span data-close-tooltip style="cursor:pointer;color:#b0bec5;font-weight:700;">×</span>`
        + `</div>`
        + `<div style="color:#b0bec5;font-size:10px;margin-top:2px;">${dateStr}</div>`
        + `<div data-view-details data-index="${realIdx}" data-cohort="${cohort}" style="color:#4fc3f7;text-decoration:underline;cursor:pointer;font-size:10px;margin-top:6px;">${t('trends.viewDetails')}</div>`
        + `</div>`
    }

    const devSeries = {
      name: DEV_COHORT_LABEL,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      connectNulls: false,
      lineStyle: { width: 2, color: '#26a69a' },
      itemStyle: { color: '#26a69a' },
      data: dev,
    }

    const qaSeries = {
      name: 'QA',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      connectNulls: false,
      lineStyle: { width: 2, color: '#ffa726' },
      itemStyle: { color: '#ffa726' },
      data: qa,
    }

    const refLineSeries = {
      name: '__refLines',
      type: 'line',
      data: [],
      silent: true,
      showSymbol: false,
      tooltip: { show: false },
      markLine: {
        silent: true,
        symbol: 'none',
        label: { formatter: '{b}', fontSize: 10 },
        data: REF_LINES.map(r => ({
          yAxis: r.v,
          name: r.label,
          lineStyle: { color: r.color, type: r.dashed ? 'dashed' : 'solid', opacity: 0.4 },
          label: { color: r.color },
        })),
      },
    }

    const series: object[] = []
    if (showDevSeries) series.push(devSeries)
    if (showQaSeries && points.some(p => p.qaAlignment !== null)) series.push(qaSeries)
    series.push(refLineSeries)

    return {
      backgroundColor: 'transparent',
      grid: { left: 44, right: 56, top: 20, bottom: 68 },
      xAxis: {
        type: 'category',
        data: categories,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#546e7a' } },
        axisLabel: { color: '#78909c', fontSize: 9, lineHeight: 12, hideOverlap: true },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        name: t('trends.axisAlignment'),
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { color: '#78909c', fontSize: 9 },
        axisLine: { show: false },
        axisLabel: { color: '#78909c', fontSize: 9, formatter: '{value}%' },
        splitLine: { show: false },
      },
      tooltip: {
        trigger: 'item',
        triggerOn: 'click',
        enterable: true,
        backgroundColor: '#1a1a2e',
        borderColor: '#546e7a',
        borderWidth: 1,
        extraCssText: 'border-radius:4px;',
        formatter: tooltipFormatter,
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 4,
          height: 24,
          borderColor: '#546e7a',
          fillerColor: 'rgba(120,144,156,0.2)',
          dataBackground: {
            lineStyle: { color: '#26a69a' },
            areaStyle: { color: 'rgba(38,166,154,0.15)' },
          },
          handleStyle: { color: '#26a69a' },
          textStyle: { color: '#78909c', fontSize: 9 },
        },
        { type: 'inside', xAxisIndex: 0 },
      ],
      series,
    }
  }, [points, showDevSeries, showQaSeries, locale, t])

  function openRoundSnapshotAt(idx: number, cohort: TrendCohort) {
    const round = points[idx]?.round
    if (!round) return
    setSelectedRound(round)
    setSelectedCohort(cohort)
  }

  return (
    <AppModal
      labelledby="alignment-trends-modal-title"
      open
      onClose={onClose}
    >
      <AppModalPaper
        style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '28px 32px 32px' }}
        onClose={onClose}
      >
        <h2
          id="alignment-trends-modal-title"
          className="text-mui-h2 font-bold text-primary"
        >
          {roomName ? t('trends.titleWithTeam', { name: roomName }) : t('trends.title')}
        </h2>

        {loading
          ? (
              <p className="mt-8 text-center text-mui-body text-muted">
                {t('common.loading')}
              </p>
            )
          : (
              <>
                <div className="mt-5 grid grid-cols-4 gap-3">
                  <div className="flex flex-col gap-1 rounded border p-3">
                    <span className="text-mui-caption text-muted">{t('trends.currentScore')}</span>
                    <div className="flex items-end gap-2">
                      <span
                        className="text-2xl font-bold"
                        style={{ color: '#26a69a' }}
                      >
                        {currentDevScore ?? '-'}
                      </span>
                      {hasQaData && (
                        <span
                          className="text-2xl font-bold"
                          style={{ color: '#ffa726' }}
                        >
                          {`/ ${currentQaScore ?? '-'}`}
                        </span>
                      )}
                    </div>
                    {currentDevScore !== null && (
                      <span
                        className="w-fit rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
                        style={{ backgroundColor: levelColor(currentDevScore) }}
                      >
                        {alignmentLevel(currentDevScore)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 rounded border p-3">
                    <span className="text-mui-caption text-muted">{t('trends.trend')}</span>
                    {trend
                      ? (
                          <div className="flex items-center gap-1">
                            <AppIcon
                              name={trend.dir === 'up' ? 'ic:baseline-trending-up' : trend.dir === 'down' ? 'ic:baseline-trending-down' : 'ic:baseline-trending-flat'}
                              style={{ fontSize: '1.4rem', color: trend.dir === 'up' ? '#43a047' : trend.dir === 'down' ? '#e64a19' : '#90a4ae' }}
                            />
                            <span className="text-lg font-bold text-primary">
                              {trend.dir === 'up' ? t('trends.up') : trend.dir === 'down' ? t('trends.down') : t('trends.stable')}
                            </span>
                          </div>
                        )
                      : (
                          <span className="text-lg font-bold text-primary">-</span>
                        )}
                    {trend && (
                      <span className="text-mui-caption text-muted">
                        {`${trend.pct}% ${t('trends.vsPrevious')}`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 rounded border p-3">
                    <span className="text-mui-caption text-muted">{t('trends.averageScore')}</span>
                    <div className="flex items-end gap-2">
                      <span
                        className="text-2xl font-bold"
                        style={{ color: '#26a69a' }}
                      >
                        {avgDev ?? '-'}
                      </span>
                      {hasQaData && (
                        <span
                          className="text-2xl font-bold"
                          style={{ color: '#ffa726' }}
                        >
                          {`/ ${avgQa ?? '-'}`}
                        </span>
                      )}
                    </div>
                    {avgDev !== null && (
                      <span
                        className="w-fit rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
                        style={{ backgroundColor: levelColor(avgDev) }}
                      >
                        {alignmentLevel(avgDev)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 rounded border p-3">
                    <span className="text-mui-caption text-muted">{t('trends.estimates')}</span>
                    <span className="text-2xl font-bold text-primary">{estimatesCount}</span>
                    <span className="text-mui-caption text-muted">{t('trends.currentPeriod')}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-mui-caption font-semibold uppercase tracking-wide text-muted">
                        {t('trends.chartTitle')}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className={`flex items-center gap-1 text-mui-caption transition-opacity${showDevSeries ? '' : ' opacity-40'}`}
                          aria-pressed={showDevSeries}
                          onClick={() => setShowDevSeries(!showDevSeries)}
                        >
                          <span
                            className="inline-block h-2 w-4 rounded"
                            style={{ background: '#26a69a' }}
                          />
                          {DEV_COHORT_LABEL}
                        </button>
                        {hasQaData && (
                          <button
                            type="button"
                            className={`flex items-center gap-1 text-mui-caption transition-opacity${showQaSeries ? '' : ' opacity-40'}`}
                            aria-pressed={showQaSeries}
                            onClick={() => setShowQaSeries(!showQaSeries)}
                          >
                            <span
                              className="inline-block h-2 w-4 rounded"
                              style={{ background: '#ffa726' }}
                            />
                            QA
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {TIME_RANGES.map(r => (
                        <button
                          key={r}
                          className={rangeClass(timeRange === r, 'px-2')}
                          onClick={() => selectRange(r)}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {availableDecks.length > 1 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      <button
                        className={rangeClass(deckFilter === null, 'px-3')}
                        onClick={() => setDeckFilter(null)}
                      >
                        {t('history.filter.allDecks')}
                      </button>
                      {availableDecks.map(deck => (
                        <button
                          key={deck}
                          className={rangeClass(deckFilter === deck, 'px-3')}
                          onClick={() => setDeckFilter(deck)}
                        >
                          {deckName(deck)}
                        </button>
                      ))}
                    </div>
                  )}

                  {hasEnoughData
                    ? (
                        <TrendsChart
                          option={chartOption}
                          onViewDetails={openRoundSnapshotAt}
                        />
                      )
                    : (
                        <div className="flex h-32 items-center justify-center">
                          <span className="text-mui-body text-muted">{t('trends.noData')}</span>
                        </div>
                      )}
                </div>
              </>
            )}
      </AppModalPaper>
      {selectedRound && (
        <RoundSnapshotModal
          round={selectedRound}
          shieldsMap={shieldsMap}
          cohort={selectedCohort}
          onClose={() => {
            setSelectedRound(null)
            setSelectedCohort(null)
          }}
        />
      )}
    </AppModal>
  )
}

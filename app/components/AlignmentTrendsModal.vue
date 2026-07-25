<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import RoundSnapshotModal from '~/components/RoundSnapshotModal.vue'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { summarizeRound, isNumericPreset, voteToNumber, splitRoundAlignment } from '~/utils/roundStats'
import { DECK_PRESETS } from '~/utils/cardDecks'
import type { RoundHistory } from '~/stores/types'

const props = defineProps<{ roomName?: string }>()
const emit = defineEmits<{ close: [] }>()

const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const { visiblePlayers } = storeToRefs(playersStore)
const { locale } = useI18n()

type TimeRange = '30D' | '90D' | '6M' | '1Y'
const timeRange = ref<TimeRange>('6M')

interface ChartPoint {
  date: Date
  devAlignment: number | null
  qaAlignment: number | null
  deckPreset: string | null
  round: RoundHistory
}

const allPoints = ref<ChartPoint[]>([])
const loading = ref(true)

const shieldsMap = computed(() => {
  const m = new Map<string, string[]>()
  for (const p of visiblePlayers.value) m.set(p.id, p.shields ?? [])
  return m
})

onMounted(async () => {
  try {
    const rounds = await roomStore.fetchHistory()
    allPoints.value = rounds
      .filter(r => {
        const s = summarizeRound(r)
        if (!isNumericPreset(s.deckPreset)) return false
        if (s.deckPreset == null && !Object.keys(s.counts).some(v => voteToNumber(v) !== null)) return false
        return true
      })
      .map(r => {
        const { dev, qa } = splitRoundAlignment(r, shieldsMap.value)
        return { date: new Date(r.revealed_at), devAlignment: dev, qaAlignment: qa, deckPreset: r.deck_preset, round: r }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  } catch (e) {
    console.error('[AlignmentTrendsModal] fetchHistory error:', e)
  } finally {
    loading.value = false
  }
})

const cutoff = computed(() => {
  const d = new Date()
  if (timeRange.value === '30D') d.setDate(d.getDate() - 30)
  else if (timeRange.value === '90D') d.setDate(d.getDate() - 90)
  else if (timeRange.value === '6M') d.setMonth(d.getMonth() - 6)
  else d.setFullYear(d.getFullYear() - 1)
  return d
})

const deckFilter = ref<string | null>(null)

const availableDecks = computed(() => {
  const seen = new Set<string>()
  for (const p of allPoints.value) {
    if (p.deckPreset) seen.add(p.deckPreset)
  }
  return [...seen]
})

function deckName(id: string): string {
  return DECK_PRESETS.find(p => p.id === id)?.name ?? id
}

const points = computed(() => allPoints.value.filter(p =>
  p.date >= cutoff.value &&
  (deckFilter.value === null || p.deckPreset === deckFilter.value),
))

const hasQaData = computed(() => points.value.some(p => p.qaAlignment !== null))

const showDevSeries = ref(true)
const showQaSeries = ref(true)

const currentDevScore = computed(() => {
  const last = [...points.value].reverse().find(p => p.devAlignment !== null)
  return last?.devAlignment ?? null
})

const currentQaScore = computed(() => {
  const last = [...points.value].reverse().find(p => p.qaAlignment !== null)
  return last?.qaAlignment ?? null
})

const avgDev = computed(() => {
  const vals = points.value.map(p => p.devAlignment).filter((v): v is number => v !== null)
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
})

const avgQa = computed(() => {
  const vals = points.value.map(p => p.qaAlignment).filter((v): v is number => v !== null)
  return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null
})

const estimatesCount = computed(() => points.value.length)

const trend = computed(() => {
  const devVals = points.value.map(p => p.devAlignment).filter((v): v is number => v !== null)
  if (devVals.length < 4) return null
  const half = Math.floor(devVals.length / 2)
  const recentAvg = devVals.slice(half).reduce((s, v) => s + v, 0) / (devVals.length - half)
  const olderAvg = devVals.slice(0, half).reduce((s, v) => s + v, 0) / half
  const pct = olderAvg === 0 ? 0 : ((recentAvg - olderAvg) / olderAvg) * 100
  return {
    pct: Math.abs(Math.round(pct * 10) / 10),
    dir: pct > 1 ? 'up' : pct < -1 ? 'down' : 'stable',
  }
})

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

// SVG chart
const VB_W = 560
const VB_H = 220
const PAD = { top: 12, right: 88, bottom: 28, left: 36 }
const INNER_W = VB_W - PAD.left - PAD.right
const INNER_H = VB_H - PAD.top - PAD.bottom

function valToY(v: number): number {
  return PAD.top + INNER_H - (v / 100) * INNER_H
}

const REF_LINES = [
  { v: 100, label: '100%', color: '#43a047', dashed: false },
  { v: 75, label: '75%', color: '#43a047', dashed: false },
  { v: 50, label: '50%', color: '#fbc02d', dashed: true },
  { v: 25, label: '25%', color: '#e64a19', dashed: true },
]

interface HoveredDot { x: number; y: number; date: Date; value: number; series: 'DEV' | 'QA'; round: RoundHistory; pinned: boolean }
const hoveredDot = ref<HoveredDot | null>(null)
const selectedRound = ref<RoundHistory | null>(null)
let hideTooltipTimer: ReturnType<typeof setTimeout> | null = null

const DEV_COHORT_LABEL = 'DEV/FE/BE'

function seriesLabel(series: 'DEV' | 'QA'): string {
  return series === 'DEV' ? DEV_COHORT_LABEL : 'QA'
}

function showTooltip(dot: { x: number; y: number; date: Date; alignment: number; round: RoundHistory }, series: 'DEV' | 'QA') {
  if (hoveredDot.value?.pinned) return
  cancelHideTooltip()
  hoveredDot.value = { x: dot.x, y: dot.y, date: dot.date, value: dot.alignment, series, round: dot.round, pinned: false }
}

function toggleTooltipPin(dot: { x: number; y: number; date: Date; alignment: number; round: RoundHistory }, series: 'DEV' | 'QA') {
  if (hoveredDot.value?.pinned && hoveredDot.value.round.id === dot.round.id && hoveredDot.value.series === series) {
    hoveredDot.value = null
    return
  }
  cancelHideTooltip()
  hoveredDot.value = { x: dot.x, y: dot.y, date: dot.date, value: dot.alignment, series, round: dot.round, pinned: true }
}

function scheduleHideTooltip() {
  if (hoveredDot.value?.pinned) return
  hideTooltipTimer = setTimeout(() => {
    if (!hoveredDot.value?.pinned) hoveredDot.value = null
    hideTooltipTimer = null
  }, 200)
}

function cancelHideTooltip() {
  if (hideTooltipTimer) {
    clearTimeout(hideTooltipTimer)
    hideTooltipTimer = null
  }
}

function closeTooltip() {
  hoveredDot.value = null
}

function openRoundSnapshot() {
  if (!hoveredDot.value) return
  selectedRound.value = hoveredDot.value.round
  hoveredDot.value = null
}

function indexToX(i: number): number {
  return PAD.left + (i / (points.value.length - 1)) * INNER_W
}

function smoothPath(pts: { x: number; y: number }[]): string {
  const first = pts[0]
  const second = pts[1]
  if (!first || !second) return ''
  if (pts.length === 2) return `M ${first.x},${first.y} L ${second.x},${second.y}`
  let d = `M ${first.x},${first.y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]!
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

const chartData = computed(() => {
  if (points.value.length < 2) return null

  function toXY(i: number, p: ChartPoint, val: number | null) {
    if (val === null) return null
    return {
      x: indexToX(i),
      y: valToY(val),
      alignment: val,
      date: p.date,
      round: p.round,
    }
  }

  const devDots = points.value.map((p, i) => toXY(i, p, p.devAlignment)).filter(Boolean) as { x: number; y: number; alignment: number; date: Date; round: RoundHistory }[]
  const qaDots = points.value.map((p, i) => toXY(i, p, p.qaAlignment)).filter(Boolean) as { x: number; y: number; alignment: number; date: Date; round: RoundHistory }[]

  return {
    devPath: smoothPath(devDots),
    qaPath: smoothPath(qaDots),
    devDots,
    qaDots,
  }
})

const tooltipDateFmt = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'short' }))

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function weekLabel(date: Date): string {
  return `w${isoWeek(date)}`
}

const xAxisLabels = computed(() => {
  if (!chartData.value || points.value.length < 2) return []
  const lastIndex = points.value.length - 1
  const tickCount = Math.min(7, points.value.length)
  const seen = new Set<number>()
  const indices: number[] = []
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.round((i * lastIndex) / (tickCount - 1))
    if (!seen.has(idx)) {
      seen.add(idx)
      indices.push(idx)
    }
  }
  return indices.map(idx => ({
    x: indexToX(idx),
    label: weekLabel(points.value[idx]!.date),
  }))
})
</script>

<template>
  <AppModal
    labelledby="alignment-trends-modal-title"
    :open="true"
    @close="emit('close')"
  >
    <AppModalPaper
      style="max-width: 680px; width: 95vw; max-height: 90vh; overflow-y: auto; padding: 28px 32px 32px;"
      @close="emit('close')"
    >
      <h2
        id="alignment-trends-modal-title"
        class="text-mui-h2 font-bold text-primary"
      >
        {{ props.roomName ? $t('trends.titleWithTeam', { name: props.roomName }) : $t('trends.title') }}
      </h2>

      <p
        v-if="loading"
        class="mt-8 text-center text-mui-body text-muted"
      >
        {{ $t('common.loading') }}
      </p>

      <template v-else>
        <!-- Stat cards -->
        <div class="mt-5 grid grid-cols-4 gap-3">
          <div class="flex flex-col gap-1 rounded border p-3">
            <span class="text-mui-caption text-muted">{{ $t('trends.currentScore') }}</span>
            <div class="flex items-end gap-2">
              <span
                class="text-2xl font-bold"
                style="color:#26a69a"
              >{{ currentDevScore ?? '-' }}</span>
              <span
                v-if="hasQaData"
                class="text-2xl font-bold"
                style="color:#ffa726"
              >/ {{ currentQaScore ?? '-' }}</span>
            </div>
            <span
              v-if="currentDevScore !== null"
              class="w-fit rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
              :style="{ backgroundColor: levelColor(currentDevScore) }"
            >{{ alignmentLevel(currentDevScore) }}</span>
          </div>

          <div class="flex flex-col gap-1 rounded border p-3">
            <span class="text-mui-caption text-muted">{{ $t('trends.trend') }}</span>
            <div
              v-if="trend"
              class="flex items-center gap-1"
            >
              <AppIcon
                :icon="trend.dir === 'up' ? 'ic:baseline-trending-up' : trend.dir === 'down' ? 'ic:baseline-trending-down' : 'ic:baseline-trending-flat'"
                :style="{ fontSize: '1.4rem', color: trend.dir === 'up' ? '#43a047' : trend.dir === 'down' ? '#e64a19' : '#90a4ae' }"
              />
              <span class="text-lg font-bold text-primary">
                {{ trend.dir === 'up' ? $t('trends.up') : trend.dir === 'down' ? $t('trends.down') : $t('trends.stable') }}
              </span>
            </div>
            <span
              v-else
              class="text-lg font-bold text-primary"
            >-</span>
            <span
              v-if="trend"
              class="text-mui-caption text-muted"
            >
              {{ trend.pct }}% {{ $t('trends.vsPrevious') }}
            </span>
          </div>

          <div class="flex flex-col gap-1 rounded border p-3">
            <span class="text-mui-caption text-muted">{{ $t('trends.averageScore') }}</span>
            <div class="flex items-end gap-2">
              <span
                class="text-2xl font-bold"
                style="color:#26a69a"
              >{{ avgDev ?? '-' }}</span>
              <span
                v-if="hasQaData"
                class="text-2xl font-bold"
                style="color:#ffa726"
              >/ {{ avgQa ?? '-' }}</span>
            </div>
            <span
              v-if="avgDev !== null"
              class="w-fit rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
              :style="{ backgroundColor: levelColor(avgDev) }"
            >{{ alignmentLevel(avgDev) }}</span>
          </div>

          <div class="flex flex-col gap-1 rounded border p-3">
            <span class="text-mui-caption text-muted">{{ $t('trends.estimates') }}</span>
            <span class="text-2xl font-bold text-primary">{{ estimatesCount }}</span>
            <span class="text-mui-caption text-muted">{{ $t('trends.currentPeriod') }}</span>
          </div>
        </div>

        <!-- Chart -->
        <div class="mt-5">
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span class="text-mui-caption font-semibold uppercase tracking-wide text-muted">
                {{ $t('trends.chartTitle') }}
              </span>
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="flex items-center gap-1 text-mui-caption transition-opacity"
                  :class="{ 'opacity-40': !showDevSeries }"
                  :aria-pressed="showDevSeries"
                  @click="showDevSeries = !showDevSeries"
                >
                  <span
                    class="inline-block h-2 w-4 rounded"
                    style="background:#26a69a"
                  />
                  {{ DEV_COHORT_LABEL }}
                </button>
                <button
                  v-if="hasQaData"
                  type="button"
                  class="flex items-center gap-1 text-mui-caption transition-opacity"
                  :class="{ 'opacity-40': !showQaSeries }"
                  :aria-pressed="showQaSeries"
                  @click="showQaSeries = !showQaSeries"
                >
                  <span
                    class="inline-block h-2 w-4 rounded"
                    style="background:#ffa726"
                  />
                  QA
                </button>
              </div>
            </div>
            <div class="flex gap-1">
              <button
                v-for="r in (['30D', '90D', '6M', '1Y'] as const)"
                :key="r"
                class="rounded px-2 py-0.5 text-mui-caption font-medium transition-colors"
                :class="timeRange === r ? 'bg-elevated text-primary' : 'text-muted hover:text-body'"
                @click="timeRange = r"
              >
                {{ r }}
              </button>
            </div>
          </div>

          <div
            v-if="availableDecks.length > 1"
            class="mb-2 flex flex-wrap gap-1"
          >
            <button
              class="rounded px-3 py-0.5 text-mui-caption font-medium transition-colors"
              :class="deckFilter === null ? 'bg-elevated text-primary' : 'text-muted hover:text-body'"
              @click="deckFilter = null"
            >
              {{ $t('history.filter.allDecks') }}
            </button>
            <button
              v-for="deck in availableDecks"
              :key="deck"
              class="rounded px-3 py-0.5 text-mui-caption font-medium transition-colors"
              :class="deckFilter === deck ? 'bg-elevated text-primary' : 'text-muted hover:text-body'"
              @click="deckFilter = deck"
            >
              {{ deckName(deck) }}
            </button>
          </div>

          <div
            v-if="!chartData"
            class="flex h-32 items-center justify-center"
          >
            <span class="text-mui-body text-muted">{{ $t('trends.noData') }}</span>
          </div>

          <svg
            v-else
            :viewBox="`0 0 ${VB_W} ${VB_H}`"
            width="100%"
            preserveAspectRatio="xMidYMid meet"
            style="display: block;"
          >
            <!-- Reference lines -->
            <g
              v-for="refLine in REF_LINES"
              :key="refLine.v"
            >
              <line
                :x1="PAD.left"
                :y1="valToY(refLine.v)"
                :x2="VB_W - PAD.right"
                :y2="valToY(refLine.v)"
                :stroke="refLine.color"
                stroke-width="1"
                :stroke-dasharray="refLine.dashed ? '4 4' : 'none'"
                opacity="0.4"
              />
              <text
                :x="VB_W - PAD.right + 6"
                :y="valToY(refLine.v) + 4"
                :fill="refLine.color"
                font-size="10"
                opacity="0.8"
              >{{ refLine.label }}</text>
            </g>

            <!-- X-axis baseline -->
            <line
              :x1="PAD.left"
              :y1="PAD.top + INNER_H"
              :x2="VB_W - PAD.right"
              :y2="PAD.top + INNER_H"
              stroke="#546e7a"
              stroke-width="1"
            />

            <!-- X-axis labels -->
            <text
              v-for="lbl in xAxisLabels"
              :key="lbl.x"
              :x="lbl.x"
              :y="PAD.top + INNER_H + 16"
              fill="#78909c"
              font-size="9"
              text-anchor="middle"
            >{{ lbl.label }}</text>

            <!-- DEV line -->
            <template v-if="showDevSeries">
              <path
                v-if="chartData.devPath"
                :d="chartData.devPath"
                fill="none"
                stroke="#26a69a"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <g
                v-for="(dot, i) in chartData.devDots"
                :key="`dev-${i}`"
              >
                <circle
                  :cx="dot.x"
                  :cy="dot.y"
                  r="3"
                  fill="#26a69a"
                  stroke="#1a1a2e"
                  stroke-width="1.5"
                  style="pointer-events: none;"
                />
                <circle
                  :cx="dot.x"
                  :cy="dot.y"
                  r="8"
                  fill="transparent"
                  style="cursor: pointer;"
                  @mouseenter="showTooltip(dot, 'DEV')"
                  @mouseleave="scheduleHideTooltip"
                  @click="toggleTooltipPin(dot, 'DEV')"
                />
              </g>
            </template>

            <!-- QA line -->
            <template v-if="showQaSeries">
              <path
                v-if="chartData.qaPath"
                :d="chartData.qaPath"
                fill="none"
                stroke="#ffa726"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <g
                v-for="(dot, i) in chartData.qaDots"
                :key="`qa-${i}`"
              >
                <circle
                  :cx="dot.x"
                  :cy="dot.y"
                  r="3"
                  fill="#ffa726"
                  stroke="#1a1a2e"
                  stroke-width="1.5"
                  style="pointer-events: none;"
                />
                <circle
                  :cx="dot.x"
                  :cy="dot.y"
                  r="8"
                  fill="transparent"
                  style="cursor: pointer;"
                  @mouseenter="showTooltip(dot, 'QA')"
                  @mouseleave="scheduleHideTooltip"
                  @click="toggleTooltipPin(dot, 'QA')"
                />
              </g>
            </template>

            <!-- Hover tooltip -->
            <g
              v-if="hoveredDot"
              :transform="`translate(${Math.min(Math.max(hoveredDot.x, PAD.left + 52), VB_W - PAD.right - 52)}, ${Math.max(hoveredDot.y - 42, PAD.top + 24)})`"
              @mouseenter="cancelHideTooltip"
              @mouseleave="scheduleHideTooltip"
            >
              <rect
                x="-52"
                y="-16"
                width="104"
                height="48"
                rx="4"
                fill="#1a1a2e"
                stroke="#546e7a"
                stroke-width="1"
                style="pointer-events: none;"
              />
              <text
                v-if="hoveredDot.pinned"
                x="44"
                y="-6"
                fill="#b0bec5"
                font-size="11"
                font-weight="700"
                text-anchor="middle"
                style="cursor: pointer;"
                @click="closeTooltip"
              >×</text>
              <text
                x="0"
                y="-4"
                fill="#fff"
                font-size="10"
                font-weight="600"
                text-anchor="middle"
                style="pointer-events: none;"
              >{{ seriesLabel(hoveredDot.series) }} {{ hoveredDot.value }}%</text>
              <text
                x="0"
                y="8"
                fill="#b0bec5"
                font-size="9"
                text-anchor="middle"
                style="pointer-events: none;"
              >{{ tooltipDateFmt.format(hoveredDot.date) }}</text>
              <text
                x="0"
                y="24"
                fill="#4fc3f7"
                font-size="9"
                font-weight="600"
                text-anchor="middle"
                style="cursor: pointer; text-decoration: underline;"
                @click="openRoundSnapshot"
              >{{ $t('trends.viewDetails') }}</text>
            </g>

            <!-- Axis titles -->
            <text
              :x="PAD.left + INNER_W / 2"
              :y="VB_H - 4"
              fill="#78909c"
              font-size="9"
              text-anchor="middle"
            >{{ $t('trends.axisTime') }}</text>
            <text
              :x="10"
              :y="PAD.top + INNER_H / 2"
              fill="#78909c"
              font-size="9"
              text-anchor="middle"
              :transform="`rotate(-90, 10, ${PAD.top + INNER_H / 2})`"
            >{{ $t('trends.axisAlignment') }}</text>
          </svg>
        </div>
      </template>
    </AppModalPaper>
  </AppModal>

  <RoundSnapshotModal
    v-if="selectedRound"
    :round="selectedRound"
    :shields-map="shieldsMap"
    @close="selectedRound = null"
  />
</template>

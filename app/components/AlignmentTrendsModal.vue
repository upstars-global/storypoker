<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/AppModal.vue'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { summarizeRound, isNumericPreset, voteToNumber } from '~/utils/roundStats'
import { alignmentScore } from '~/utils/alignment'
import { isQaPlayer } from '~/utils/shields'
import { DECK_PRESETS } from '~/utils/cardDecks'
import type { RoundHistory } from '~/stores/types'

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
}

const allPoints = ref<ChartPoint[]>([])
const loading = ref(true)

const shieldsMap = computed(() => {
  const m = new Map<string, string[]>()
  for (const p of visiblePlayers.value) m.set(p.id, p.shields ?? [])
  return m
})

function splitRound(round: RoundHistory): { dev: number | null; qa: number | null } {
  const devCounts: Record<string, number> = {}
  const qaCounts: Record<string, number> = {}
  for (const v of round.votes) {
    const shields = shieldsMap.value.get(v.player_id) ?? []
    if (isQaPlayer(shields)) {
      qaCounts[v.vote] = (qaCounts[v.vote] ?? 0) + 1
    } else {
      devCounts[v.vote] = (devCounts[v.vote] ?? 0) + 1
    }
  }
  return {
    dev: alignmentScore(devCounts, round.active_cards),
    qa: alignmentScore(qaCounts, round.active_cards),
  }
}

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
        const { dev, qa } = splitRound(r)
        return { date: new Date(r.revealed_at), devAlignment: dev, qaAlignment: qa, deckPreset: r.deck_preset }
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
  if (a >= 75) return 'Very High'
  if (a >= 60) return 'High'
  if (a >= 40) return 'Medium'
  return 'Low'
}

function levelColor(a: number): string {
  if (a >= 60) return '#43a047'
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
  { v: 100, label: 'Perfect', color: '#43a047', dashed: false },
  { v: 75, label: 'Very High', color: '#43a047', dashed: false },
  { v: 60, label: 'High', color: '#43a047', dashed: false },
  { v: 50, label: 'Medium', color: '#fbc02d', dashed: true },
  { v: 25, label: 'Low', color: '#e64a19', dashed: true },
]

const chartData = computed(() => {
  if (points.value.length < 2) return null
  const xs = points.value.map(p => p.date.getTime())
  const minX = Math.min(...xs)
  const xRange = Math.max(...xs) - minX || 1

  function toXY(p: ChartPoint, val: number | null) {
    if (val === null) return null
    return {
      x: PAD.left + ((p.date.getTime() - minX) / xRange) * INNER_W,
      y: valToY(val),
      alignment: val,
      date: p.date,
    }
  }

  const devDots = points.value.map(p => toXY(p, p.devAlignment)).filter(Boolean) as { x: number; y: number; alignment: number; date: Date }[]
  const qaDots = points.value.map(p => toXY(p, p.qaAlignment)).filter(Boolean) as { x: number; y: number; alignment: number; date: Date }[]

  return {
    devPolyline: devDots.map(d => `${d.x},${d.y}`).join(' '),
    qaPolyline: qaDots.map(d => `${d.x},${d.y}`).join(' '),
    devDots,
    qaDots,
    minX,
    xRange,
  }
})

const dateFmt = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'short' }))

const xAxisLabels = computed(() => {
  if (!chartData.value || points.value.length < 2) return []
  const { minX, xRange } = chartData.value
  const step = Math.max(1, Math.floor(points.value.length / 6))
  return points.value
    .filter((_, i) => i % step === 0 || i === points.value.length - 1)
    .slice(0, 7)
    .map(p => ({
      x: PAD.left + ((p.date.getTime() - minX) / xRange) * INNER_W,
      label: dateFmt.value.format(p.date),
    }))
})
</script>

<template>
  <AppModal :open="true" @close="emit('close')">
    <div
      class="mui-modal-paper"
      style="max-width: 680px; width: 95vw; max-height: 90vh; overflow-y: auto; padding: 28px 32px 32px;"
      @pointerdown.stop
    >
      <h2 class="text-mui-h2 font-bold text-white">
        {{ $t('trends.title') }}
      </h2>

          <p v-if="loading" class="mt-8 text-center text-mui-body text-muted">
            {{ $t('common.loading') }}
          </p>

          <template v-else>
            <!-- Stat cards -->
            <div class="mt-5 grid grid-cols-4 gap-3">
              <div class="flex flex-col gap-1 rounded border p-3">
                <span class="text-mui-caption text-muted">{{ $t('trends.currentScore') }}</span>
                <div class="flex items-end gap-2">
                  <span class="text-2xl font-bold" style="color:#26a69a">{{ currentDevScore ?? '—' }}</span>
                  <span v-if="hasQaData" class="text-2xl font-bold" style="color:#ffa726">/ {{ currentQaScore ?? '—' }}</span>
                </div>
                <span
                  v-if="currentDevScore !== null"
                  class="w-fit rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
                  :style="{ backgroundColor: levelColor(currentDevScore) }"
                >{{ alignmentLevel(currentDevScore) }}</span>
              </div>

              <div class="flex flex-col gap-1 rounded border p-3">
                <span class="text-mui-caption text-muted">{{ $t('trends.trend') }}</span>
                <div v-if="trend" class="flex items-center gap-1">
                  <AppIcon
                    :icon="trend.dir === 'up' ? 'ic:baseline-trending-up' : trend.dir === 'down' ? 'ic:baseline-trending-down' : 'ic:baseline-trending-flat'"
                    :style="{ fontSize: '1.4rem', color: trend.dir === 'up' ? '#43a047' : trend.dir === 'down' ? '#e64a19' : '#90a4ae' }"
                  />
                  <span class="text-lg font-bold text-white">
                    {{ trend.dir === 'up' ? $t('trends.up') : trend.dir === 'down' ? $t('trends.down') : $t('trends.stable') }}
                  </span>
                </div>
                <span v-else class="text-lg font-bold text-white">—</span>
                <span v-if="trend" class="text-mui-caption text-muted">
                  {{ trend.pct }}% {{ $t('trends.vsPrevious') }}
                </span>
              </div>

              <div class="flex flex-col gap-1 rounded border p-3">
                <span class="text-mui-caption text-muted">{{ $t('trends.averageScore') }}</span>
                <div class="flex items-end gap-2">
                  <span class="text-2xl font-bold" style="color:#26a69a">{{ avgDev ?? '—' }}</span>
                  <span v-if="hasQaData" class="text-2xl font-bold" style="color:#ffa726">/ {{ avgQa ?? '—' }}</span>
                </div>
                <span
                  v-if="avgDev !== null"
                  class="w-fit rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
                  :style="{ backgroundColor: levelColor(avgDev) }"
                >{{ alignmentLevel(avgDev) }}</span>
              </div>

              <div class="flex flex-col gap-1 rounded border p-3">
                <span class="text-mui-caption text-muted">{{ $t('trends.estimates') }}</span>
                <span class="text-2xl font-bold text-white">{{ estimatesCount }}</span>
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
                    <span class="flex items-center gap-1 text-mui-caption">
                      <span class="inline-block h-2 w-4 rounded" style="background:#26a69a" />
                      DEV
                    </span>
                    <span v-if="hasQaData" class="flex items-center gap-1 text-mui-caption">
                      <span class="inline-block h-2 w-4 rounded" style="background:#ffa726" />
                      QA
                    </span>
                  </div>
                </div>
                <div class="flex gap-1">
                  <button
                    v-for="r in (['30D', '90D', '6M', '1Y'] as const)"
                    :key="r"
                    class="rounded px-2 py-0.5 text-mui-caption font-medium transition-colors"
                    :class="timeRange === r ? 'bg-elevated text-white' : 'text-muted hover:text-body'"
                    @click="timeRange = r"
                  >{{ r }}</button>
                </div>
              </div>

              <div v-if="availableDecks.length > 1" class="mb-2 flex flex-wrap gap-1">
                <button
                  class="rounded px-3 py-0.5 text-mui-caption font-medium transition-colors"
                  :class="deckFilter === null ? 'bg-elevated text-white' : 'text-muted hover:text-body'"
                  @click="deckFilter = null"
                >{{ $t('history.filter.allDecks') }}</button>
                <button
                  v-for="deck in availableDecks"
                  :key="deck"
                  class="rounded px-3 py-0.5 text-mui-caption font-medium transition-colors"
                  :class="deckFilter === deck ? 'bg-elevated text-white' : 'text-muted hover:text-body'"
                  @click="deckFilter = deck"
                >{{ deckName(deck) }}</button>
              </div>

              <div v-if="!chartData" class="flex h-32 items-center justify-center">
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
                <g v-for="ref in REF_LINES" :key="ref.v">
                  <line
                    :x1="PAD.left" :y1="valToY(ref.v)"
                    :x2="VB_W - PAD.right" :y2="valToY(ref.v)"
                    :stroke="ref.color" stroke-width="1"
                    :stroke-dasharray="ref.dashed ? '4 4' : 'none'"
                    opacity="0.4"
                  />
                  <text
                    :x="VB_W - PAD.right + 6" :y="valToY(ref.v) + 4"
                    :fill="ref.color" font-size="10" opacity="0.8"
                  >{{ ref.label }}</text>
                </g>

                <!-- X-axis baseline -->
                <line
                  :x1="PAD.left" :y1="PAD.top + INNER_H"
                  :x2="VB_W - PAD.right" :y2="PAD.top + INNER_H"
                  stroke="#546e7a" stroke-width="1"
                />

                <!-- X-axis labels -->
                <text
                  v-for="lbl in xAxisLabels" :key="lbl.x"
                  :x="lbl.x" :y="PAD.top + INNER_H + 16"
                  fill="#78909c" font-size="9" text-anchor="middle"
                >{{ lbl.label }}</text>

                <!-- DEV line -->
                <polyline
                  v-if="chartData.devPolyline"
                  :points="chartData.devPolyline"
                  fill="none" stroke="#26a69a" stroke-width="2"
                  stroke-linejoin="round" stroke-linecap="round"
                />
                <circle
                  v-for="(dot, i) in chartData.devDots" :key="`dev-${i}`"
                  :cx="dot.x" :cy="dot.y" r="3"
                  fill="#26a69a" stroke="#1a1a2e" stroke-width="1.5"
                />

                <!-- QA line -->
                <polyline
                  v-if="chartData.qaPolyline"
                  :points="chartData.qaPolyline"
                  fill="none" stroke="#ffa726" stroke-width="2"
                  stroke-linejoin="round" stroke-linecap="round"
                />
                <circle
                  v-for="(dot, i) in chartData.qaDots" :key="`qa-${i}`"
                  :cx="dot.x" :cy="dot.y" r="3"
                  fill="#ffa726" stroke="#1a1a2e" stroke-width="1.5"
                />
              </svg>
            </div>
          </template>

      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 12px; right: 12px;"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
      </button>
    </div>
  </AppModal>
</template>

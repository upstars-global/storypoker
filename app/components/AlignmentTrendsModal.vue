<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import RoundSnapshotModal from '~/components/RoundSnapshotModal.vue'
import { storeToRefs } from 'pinia'
import { useRoomStore } from '~/stores/room'
import { usePlayersStore } from '~/stores/players'
import { summarizeRound, isNumericPreset, voteToNumber, splitRoundAlignment } from '~/utils/roundStats'
import { DECK_PRESETS } from '~/utils/cardDecks'
import { DEV_COHORT_LABEL } from '~/utils/shields'
import type { RoundHistory } from '~/stores/types'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, DataZoomComponent, MarkLineComponent])

const props = defineProps<{ roomName?: string }>()
const emit = defineEmits<{ close: [] }>()

const roomStore = useRoomStore()
const playersStore = usePlayersStore()
const { visiblePlayers } = storeToRefs(playersStore)
const { locale, t } = useI18n()

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

const REF_LINES = [
  { v: 100, label: '100%', color: '#43a047', dashed: false },
  { v: 75, label: '75%', color: '#43a047', dashed: false },
  { v: 50, label: '50%', color: '#fbc02d', dashed: true },
  { v: 25, label: '25%', color: '#e64a19', dashed: true },
]

const selectedRound = ref<RoundHistory | null>(null)
const selectedCohort = ref<'DEV' | 'QA' | null>(null)

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function weekLabel(date: Date): string {
  return `w${isoWeek(date)}`
}

const tooltipDateFmt = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'short', timeStyle: 'short' }))

const hasEnoughData = computed(() => points.value.length >= 2)

function tooltipFormatter(params: { dataIndex: number; seriesName?: string; value?: unknown }): string {
  const point = points.value[params.dataIndex]
  if (!point || params.value === null || params.value === undefined) return ''
  const dateStr = tooltipDateFmt.value.format(point.date)
  const cohort: 'DEV' | 'QA' = params.seriesName === 'QA' ? 'QA' : 'DEV'
  return `<div style="min-width:130px">`
    + `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">`
    + `<span style="font-weight:600;color:#fff;font-size:11px;">${params.seriesName} ${params.value}%</span>`
    + `<span data-close-tooltip style="cursor:pointer;color:#b0bec5;font-weight:700;">×</span>`
    + `</div>`
    + `<div style="color:#b0bec5;font-size:10px;margin-top:2px;">${dateStr}</div>`
    + `<div data-view-details data-index="${params.dataIndex}" data-cohort="${cohort}" style="color:#4fc3f7;text-decoration:underline;cursor:pointer;font-size:10px;margin-top:6px;">${t('trends.viewDetails')}</div>`
    + `</div>`
}

const chartOption = computed(() => {
  const categories = points.value.map(p => weekLabel(p.date))

  const devSeries = {
    name: DEV_COHORT_LABEL,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    connectNulls: false,
    lineStyle: { width: 2, color: '#26a69a' },
    itemStyle: { color: '#26a69a' },
    data: points.value.map(p => p.devAlignment),
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
    data: points.value.map(p => p.qaAlignment),
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

  const series = []
  if (showDevSeries.value) series.push(devSeries)
  if (showQaSeries.value && hasQaData.value) series.push(qaSeries)
  series.push(refLineSeries)

  return {
    backgroundColor: 'transparent',
    grid: { left: 44, right: 56, top: 20, bottom: 68 },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#546e7a' } },
      axisLabel: { color: '#78909c', fontSize: 9 },
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
})

const chartRef = ref<InstanceType<typeof VChart> | null>(null)

function openRoundSnapshotAt(idx: number, cohort: 'DEV' | 'QA') {
  const round = points.value[idx]?.round
  if (!round) return
  selectedRound.value = round
  selectedCohort.value = cohort
}

function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement | null
  if (!target) return
  const detailsEl = target.closest('[data-view-details]') as HTMLElement | null
  if (detailsEl) {
    const cohort = detailsEl.dataset.cohort === 'QA' ? 'QA' : 'DEV'
    openRoundSnapshotAt(Number(detailsEl.dataset.index), cohort)
    chartRef.value?.dispatchAction({ type: 'hideTip' })
    return
  }
  if (target.closest('[data-close-tooltip]')) {
    chartRef.value?.dispatchAction({ type: 'hideTip' })
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
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
            v-if="!hasEnoughData"
            class="flex h-32 items-center justify-center"
          >
            <span class="text-mui-body text-muted">{{ $t('trends.noData') }}</span>
          </div>

          <VChart
            v-else
            ref="chartRef"
            :option="chartOption"
            autoresize
            style="height: 300px;"
          />
        </div>
      </template>
    </AppModalPaper>
  </AppModal>

  <RoundSnapshotModal
    v-if="selectedRound"
    :round="selectedRound"
    :shields-map="shieldsMap"
    :cohort="selectedCohort"
    @close="selectedRound = null; selectedCohort = null"
  />
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/AppModal.vue'
import { useRoomStore } from '~/stores/room'
import { useCardLabel } from '~/composables/useCardLabel'
import { summarizeRound, isNumericPreset, voteToNumber, type RoundSummary } from '~/utils/roundStats'
import { DECK_PRESETS } from '~/utils/cardDecks'

const props = defineProps<{ roomName?: string }>()
const emit = defineEmits<{ close: [] }>()

const roomStore = useRoomStore()
const cardLabel = useCardLabel()
const { locale } = useI18n()

const loading = ref(true)
const summaries = ref<(RoundSummary & { trend: 'up' | 'down' | 'flat' | null })[]>([])
const selectedYear = ref<number | null>(null)
const selectedQuarter = ref<number | null>(null)
const deckFilter = ref<string | null>(null)

onMounted(async () => {
  const rounds = await roomStore.fetchHistory()
  const base = rounds.map(summarizeRound)
  summaries.value = base.map((s, i) => {
    const older = base[i + 1]
    let trend: 'up' | 'down' | 'flat' | null = null
    if (s.alignment !== null && older?.alignment != null) {
      trend = s.alignment > older.alignment ? 'up' : s.alignment < older.alignment ? 'down' : 'flat'
    }
    return { ...s, trend }
  })
  if (summaries.value.length) {
    selectedYear.value = new Date(summaries.value[0]!.revealedAt).getFullYear()
  }
  loading.value = false
})

const dateFmt = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }))
const timeFmt = computed(() => new Intl.DateTimeFormat(locale.value, { timeStyle: 'short' }))

const availableYears = computed(() => {
  const years = new Set<number>()
  for (const s of summaries.value) {
    if (isNumericPreset(s.deckPreset)) years.add(new Date(s.revealedAt).getFullYear())
  }
  return [...years].sort((a, b) => b - a)
})

const availableDecks = computed(() => {
  const seen = new Set<string>()
  for (const s of summaries.value) {
    if (s.deckPreset && isNumericPreset(s.deckPreset)) seen.add(s.deckPreset)
  }
  return [...seen]
})

function deckName(id: string): string {
  return DECK_PRESETS.find(p => p.id === id)?.name ?? id
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function hasNumericVote(counts: Record<string, number>): boolean {
  return Object.keys(counts).some(v => voteToNumber(v) !== null)
}

const filteredSummaries = computed(() => {
  return summaries.value.filter(s => {
    if (!isNumericPreset(s.deckPreset)) return false
    if (s.deckPreset == null && !hasNumericVote(s.counts)) return false
    const d = new Date(s.revealedAt)
    if (selectedYear.value !== null && d.getFullYear() !== selectedYear.value) return false
    if (selectedQuarter.value !== null && Math.floor(d.getMonth() / 3) + 1 !== selectedQuarter.value) return false
    if (deckFilter.value !== null && s.deckPreset !== deckFilter.value) return false
    return true
  })
})

const groups = computed(() => {
  const map = new Map<string, typeof summaries.value>()
  for (const s of filteredSummaries.value) {
    const d = new Date(s.revealedAt)
    const q = Math.floor(d.getMonth() / 3) + 1
    const key = `${d.getFullYear()}-Q${q}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  return [...map.entries()].map(([key, rounds]) => ({
    key,
    label: `Q${key.split('-Q')[1]} ${key.split('-Q')[0]}`,
    rounds,
  }))
})

function exportCsv() {
  const dateColFmt = new Intl.DateTimeFormat(locale.value, { dateStyle: 'short' })
  const escape = (v: string | number | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const allCards = [...new Set(filteredSummaries.value.flatMap(s => Object.keys(s.counts)))]

  const header = ['Date', 'Time', 'Week', 'Deck', 'Average', 'Alignment', 'Voters', ...allCards]
  const rows = filteredSummaries.value.map(s => {
    const d = new Date(s.revealedAt)
    return [
      escape(dateColFmt.format(d)),
      escape(timeFmt.value.format(d)),
      escape(`W${getISOWeek(d)}`),
      escape(s.deckPreset ? deckName(s.deckPreset) : ''),
      escape(s.average),
      escape(s.alignment),
      escape(s.voterCount),
      ...allCards.map(c => escape(s.counts[c] ?? 0)),
    ].join(';')
  })

  const csv = '﻿' + [header.join(';'), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const prefix = props.roomName ? `${props.roomName.replace(/[^\w\d-]/g, '_')}-` : ''
  a.download = `${prefix}round-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function alignmentColor(a: number): string {
  if (a >= 80) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}

function sortedCounts(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}
</script>

<template>
  <AppModal :open="true" @close="emit('close')">
    <div
      class="mui-modal-paper"
      style="max-width: 640px; width: 92vw; max-height: 86vh; overflow-y: auto; padding: 32px 36px 36px;"
      @pointerdown.stop
    >
      <h2 class="text-center text-mui-h2 font-bold text-white">
        {{ $t('history.title') }}
      </h2>

          <div class="mt-4 flex flex-col items-center gap-2">
            <div class="flex w-full items-center justify-between">
              <div class="flex flex-col gap-1">
                <div class="flex gap-1">
                  <button
                    v-for="year in availableYears"
                    :key="year"
                    class="rounded px-3 py-1 text-mui-caption font-medium transition-colors"
                    :class="selectedYear === year
                      ? 'bg-elevated text-white'
                      : 'text-muted hover:text-body'"
                    @click="selectedYear = year; selectedQuarter = null"
                  >
                    {{ year }}
                  </button>
                </div>
                <div class="flex gap-1">
                  <button
                    v-for="q in [1, 2, 3, 4]"
                    :key="q"
                    class="rounded px-3 py-1 text-mui-caption font-medium transition-colors"
                    :class="selectedQuarter === q
                      ? 'bg-elevated text-white'
                      : 'text-muted hover:text-body'"
                    @click="selectedQuarter = selectedQuarter === q ? null : q"
                  >
                    Q{{ q }}
                  </button>
                </div>
              </div>
              <button
                v-if="filteredSummaries.length"
                v-wave
                class="flex items-center gap-1 rounded px-2 py-1 text-mui-caption text-muted transition-colors hover:text-body"
                :aria-label="$t('history.exportCsv')"
                @click="exportCsv"
              >
                <AppIcon icon="ic:baseline-download" style="font-size: 1rem;" />
                {{ $t('history.exportCsv') }}
              </button>
            </div>
            <div v-if="availableDecks.length > 1" class="flex flex-wrap justify-center gap-1">
              <button
                class="rounded px-3 py-1 text-mui-caption font-medium transition-colors"
                :class="deckFilter === null
                  ? 'bg-elevated text-white'
                  : 'text-muted hover:text-body'"
                @click="deckFilter = null"
              >
                {{ $t('history.filter.allDecks') }}
              </button>
              <button
                v-for="deck in availableDecks"
                :key="deck"
                class="rounded px-3 py-1 text-mui-caption font-medium transition-colors"
                :class="deckFilter === deck
                  ? 'bg-elevated text-white'
                  : 'text-muted hover:text-body'"
                @click="deckFilter = deck"
              >
                {{ deckName(deck) }}
              </button>
            </div>
          </div>

          <p v-if="loading" class="mt-8 text-center text-mui-body text-muted">
            {{ $t('common.loading') }}
          </p>
          <p v-else-if="!summaries.length" class="mt-8 text-center text-mui-body text-muted">
            {{ $t('history.empty') }}
          </p>
          <p v-else-if="!filteredSummaries.length" class="mt-8 text-center text-mui-body text-muted">
            {{ $t('history.emptyRange') }}
          </p>

          <div v-else class="mt-6 flex flex-col gap-7">
            <section v-for="g in groups" :key="g.key" class="flex flex-col gap-3">
              <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted">
                {{ g.label }}
              </h3>
              <div
                v-for="r in g.rounds"
                :key="r.id"
                class="flex flex-col gap-2 rounded border p-3"
                data-testid="history-round"
              >
                <div class="flex items-center justify-between gap-3 text-mui-body text-white">
                  <div class="flex items-center gap-2">
                    <span>{{ dateFmt.format(new Date(r.revealedAt)) }}</span>
                    <span class="text-muted">·</span>
                    <span>{{ timeFmt.format(new Date(r.revealedAt)) }}</span>
                    <span v-if="r.deckPreset" class="text-mui-caption text-muted">
                      {{ deckName(r.deckPreset) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-mui-caption">
                    <span v-if="r.average !== null">
                      {{ $t('history.average') }}: <span class="font-semibold">{{ r.average }}</span>
                    </span>
                    <span v-if="r.alignment !== null" class="flex items-center gap-1.5">
                      <span
                        class="inline-block rounded-full"
                        :style="{ width: '9px', height: '9px', backgroundColor: alignmentColor(r.alignment) }"
                      />
                      <span class="font-semibold">{{ r.alignment }}</span>
                      <AppIcon
                        v-if="r.trend === 'up'"
                        icon="ic:baseline-arrow-drop-up"
                        style="font-size: 1.25rem; color: #43a047;"
                      />
                      <AppIcon
                        v-else-if="r.trend === 'down'"
                        icon="ic:baseline-arrow-drop-down"
                        style="font-size: 1.25rem; color: #e64a19;"
                      />
                    </span>
                    <span class="flex items-center gap-1 text-muted">
                      <AppIcon icon="ic:baseline-account-circle" style="font-size: 1rem;" />
                      {{ r.voterCount }}
                    </span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="[card, count] in sortedCounts(r.counts)"
                    :key="card"
                    class="rounded bg-elevated px-2 py-0.5 text-mui-caption text-body"
                  >
                    {{ cardLabel(card) }} × {{ count }}
                  </span>
                </div>
              </div>
            </section>
          </div>

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

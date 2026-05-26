<script setup lang="ts">
import { ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { CountdownMode } from '~/composables/useCountdown'

defineProps<{
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
  hasVotes: boolean
  countdownCounter: number
  countdownRunning: boolean
}>()

const emit = defineEmits<{
  vote: [card: string]
  reveal: []
  startCountdown: [mode: CountdownMode]
}>()

const countdownModeLSKey = 'sp-countdown-mode'
const countdownModeOptions: { value: CountdownMode; icon: string; label: string }[] = [
  { value: 'silent', icon: 'ic:baseline-volume-off', label: 'cards.countdownSilent' },
  { value: 'dry', icon: 'app:bank', label: 'cards.countdownDry' },
  { value: 'wet', icon: 'app:town-hall', label: 'cards.countdownWet' },
]

function readCountdownMode(): CountdownMode {
  const saved = localStorage.getItem(countdownModeLSKey)
  return countdownModeOptions.some(o => o.value === saved) ? (saved as CountdownMode) : 'dry'
}

const countdownMode = ref<CountdownMode>(readCountdownMode())
watch(countdownMode, value => localStorage.setItem(countdownModeLSKey, value))
</script>

<template>
  <div class="flex flex-col items-center w-full rounded">
    <div class="flex flex-wrap justify-center gap-4 max-w-[1240px] mx-auto">
      <div
        v-for="card in activeCards"
        :key="card"
        class="relative w-[151.66px] aspect-[2/3] flex-none"
      >
        <button
          v-wave
          type="button"
          class="mui-card"
          :class="{ 'is-selected': selectedVote === card }"
          data-testid="vote-card"
          :data-value="card"
          :aria-pressed="selectedVote === card"
          @click="emit('vote', card)"
        >
          <span class="mui-card-value">{{ card }}</span>
        </button>
      </div>
    </div>

    <div v-if="isModerator" class="flex flex-wrap items-end justify-center gap-4 pt-8">
      <button
        v-wave
        class="mui-btn"
        :disabled="!hasVotes || countdownRunning"
        data-testid="reveal-button"
        @click="emit('reveal')"
      >
        {{ $t('cards.reveal') }}
      </button>
      <div class="flex flex-col items-center gap-2">
        <div
          class="flex items-center gap-1"
          :class="{ 'pointer-events-none opacity-50': countdownRunning }"
          role="radiogroup"
          data-testid="countdown-mode"
        >
          <label
            v-for="option in countdownModeOptions"
            :key="option.value"
            class="cursor-pointer flex items-center justify-center rounded p-1.5 transition-colors"
            :class="countdownMode === option.value ? 'text-primary' : 'text-muted'"
            :title="$t(option.label)"
          >
            <input
              v-model="countdownMode"
              type="radio"
              name="countdown-mode"
              class="sr-only"
              :value="option.value"
              :disabled="countdownRunning"
            >
            <Icon class="text-xl" :icon="option.icon" />
          </label>
        </div>
        <button
          v-wave
          class="mui-btn"
          :disabled="countdownRunning"
          data-testid="reveal-countdown-button"
          @click="emit('startCountdown', countdownMode)"
        >
          {{ countdownCounter || $t('cards.revealCountdown') }}
        </button>
      </div>
    </div>
  </div>
</template>

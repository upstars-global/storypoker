<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import {
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
import type { CountdownMode } from '~/composables/useCountdown'
import { useCardLabel } from '~/composables/useCardLabel'

const cardLabel = useCardLabel()

const props = defineProps<{
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
  hasVotes: boolean
  countdownCounter: number
  countdownRunning: boolean
  pollMode: boolean
  voteQuestionMode: boolean
  pollQuestion: string | null
  hasLastRound?: boolean
  showLastRound?: boolean
}>()

const emit = defineEmits<{
  vote: [card: string]
  reveal: []
  startCountdown: [mode: CountdownMode]
  setPollQuestion: [question: string]
  startVoteQuestion: [question: string, answers: [string, string, string]]
  toggleLastRound: []
}>()

const canVote = computed(() => !(props.pollMode || props.voteQuestionMode) || !!props.pollQuestion)
const questionDraft = ref('')
const answerDrafts = ref<[string, string, string]>(['', '', ''])

watch(() => props.pollQuestion, (val) => {
  if (!val) {
    questionDraft.value = ''
    answerDrafts.value = ['', '', '']
  }
})

function submitQuestion() {
  const value = questionDraft.value.trim()
  if (!value) return
  emit('setPollQuestion', value)
}

function vqCardStyle(card: string): Record<string, string> {
  if (!props.voteQuestionMode || !props.pollQuestion) return {}
  const len = card.length
  if (len <= 3) return {}
  const rem = len <= 6 ? 1.4 : len <= 9 ? 1.0 : 0.8
  return { fontSize: `${rem}rem`, wordBreak: 'break-word', padding: '0 8px', lineHeight: '1.2', textAlign: 'center' }
}

function submitVoteQuestion() {
  const question = questionDraft.value.trim()
  const answers = answerDrafts.value.map(a => a.trim()) as [string, string, string]
  if (!question || answers.some(a => !a)) return
  emit('startVoteQuestion', question, answers)
}

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
    <div v-if="(pollMode || voteQuestionMode) && !showLastRound" class="w-full max-w-[640px] mx-auto mb-8">
      <h3
        v-if="pollQuestion"
        class="text-center text-mui-h2 font-bold text-white"
        data-testid="poll-question"
      >
        {{ pollQuestion }}
      </h3>
      <div v-else-if="voteQuestionMode && isModerator" class="flex flex-col gap-3">
        <input
          v-model="questionDraft"
          type="text"
          class="mui-input w-full"
          :placeholder="$t('poll.questionPlaceholder')"
          data-testid="poll-question-input"
        >
        <input
          v-for="n in 3"
          :key="n"
          v-model="answerDrafts[n - 1]"
          type="text"
          class="mui-input w-full"
          maxlength="12"
          :placeholder="$t('poll.answerPlaceholder', { n })"
        >
        <div class="flex justify-center mt-5">
          <button
            v-wave
            class="mui-btn"
            :disabled="!questionDraft.trim() || answerDrafts.some(a => !a.trim())"
            data-testid="poll-start-button"
            @click="submitVoteQuestion"
          >
            {{ $t('poll.startVoting') }}
          </button>
        </div>
      </div>
      <div v-else-if="!voteQuestionMode && isModerator" class="flex flex-col gap-3">
        <input
          v-model="questionDraft"
          type="text"
          class="mui-input w-full"
          :placeholder="$t('poll.questionPlaceholder')"
          data-testid="poll-question-input"
          @keyup.enter="submitQuestion"
        >
        <div class="flex justify-center mt-5">
          <button
            v-wave
            class="mui-btn"
            :disabled="!questionDraft.trim()"
            data-testid="poll-start-button"
            @click="submitQuestion"
          >
            {{ $t('poll.startVoting') }}
          </button>
        </div>
      </div>
      <p v-else class="text-center text-mui-body text-muted">
        {{ $t('poll.waiting') }}
      </p>
    </div>

    <div
      v-if="!showLastRound"
      class="flex flex-wrap justify-center gap-4 max-w-[1240px] mx-auto"
      :class="{ 'pointer-events-none opacity-40': !canVote }"
    >
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
          :disabled="!canVote"
          @click="emit('vote', card)"
        >
          <span class="mui-card-value" :style="vqCardStyle(card)">{{ voteQuestionMode && !pollQuestion ? '?' : cardLabel(card) }}</span>
        </button>
      </div>
    </div>

    <div v-if="isModerator" class="flex flex-wrap items-end justify-center gap-4 pt-8">
      <button
        v-wave
        class="mui-icon-btn"
        :disabled="(!hasLastRound && !showLastRound) || countdownRunning"
        :style="{ color: ((!hasLastRound && !showLastRound) || countdownRunning) ? 'var(--text-disabled)' : showLastRound ? 'var(--primary)' : undefined }"
        @click="emit('toggleLastRound')"
      >
        <AppIcon icon="lucide:undo" style="font-size: 1.5rem;" />
      </button>
      <button
        v-wave
        class="mui-btn"
        :disabled="!hasVotes || countdownRunning || !canVote"
        data-testid="reveal-button"
        @click="emit('reveal')"
      >
        {{ $t('cards.reveal') }}
      </button>
      <div class="flex flex-col items-center gap-2">
        <div
          class="flex items-center gap-1"
          :class="{ 'pointer-events-none opacity-50': countdownRunning || showLastRound }"
          role="radiogroup"
          data-testid="countdown-mode"
        >
          <TooltipRoot v-for="option in countdownModeOptions" :key="option.value">
            <TooltipTrigger as-child>
              <label
                v-wave
                class="mui-icon-btn cursor-pointer"
                :style="{ color: countdownMode === option.value ? '#fff' : 'var(--text-muted)' }"
              >
                <input
                  v-model="countdownMode"
                  type="radio"
                  name="countdown-mode"
                  class="sr-only"
                  :value="option.value"
                  :disabled="countdownRunning"
                >
                <AppIcon class="mui-svg-icon" style="font-size: 1.5rem;" :icon="option.icon" />
              </label>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
                {{ $t(option.label) }}
              </TooltipContent>
            </TooltipPortal>
          </TooltipRoot>
        </div>
        <button
          v-wave
          class="mui-btn"
          :disabled="countdownRunning || !canVote || showLastRound"
          data-testid="reveal-countdown-button"
          @click="emit('startCountdown', countdownMode)"
        >
          {{ countdownCounter || $t('cards.revealCountdown') }}
        </button>
      </div>
    </div>
  </div>
</template>

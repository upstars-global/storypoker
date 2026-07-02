<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import AppTooltip from '~/components/AppTooltip.vue'
import type { CountdownMode } from '~/composables/useCountdown'
import { useCardLabel } from '~/composables/useCardLabel'

const cardLabel = useCardLabel()

const props = defineProps<{
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
  hasVotes: boolean
  canReset: boolean
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
  reset: []
  startCountdown: [mode: CountdownMode]
  setPollQuestion: [question: string]
  startVoteQuestion: [question: string, answers: string[]]
  toggleLastRound: []
}>()

const canVote = computed(() => !(props.pollMode || props.voteQuestionMode) || !!props.pollQuestion)
const MAX_ANSWERS = 5
const questionDraft = ref('')
const answerDrafts = ref<string[]>(['', ''])

watch(() => props.pollQuestion, (val) => {
  if (!val) {
    questionDraft.value = ''
    answerDrafts.value = ['', '']
  }
})

const answerInputs = ref<HTMLInputElement[]>([])
function setAnswerRef(el: Element | ComponentPublicInstance | null, i: number) {
  if (el) answerInputs.value[i] = el as HTMLInputElement
}

async function addAnswer() {
  if (answerDrafts.value.length >= MAX_ANSWERS) return
  answerDrafts.value.push('')
  await nextTick()
  answerInputs.value[answerDrafts.value.length - 1]?.focus()
}

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
  const answers = answerDrafts.value.map(a => a.trim()).filter(Boolean)
  if (!question || answers.length < 2) return
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
        <div
          v-for="(answer, i) in answerDrafts"
          :key="i"
          class="flex items-center justify-center gap-2"
        >
          <input
            :ref="(el) => setAnswerRef(el, i)"
            v-model="answerDrafts[i]"
            type="text"
            class="mui-input w-48"
            maxlength="12"
            :placeholder="$t('poll.answerPlaceholder', { n: i + 1 })"
          >
          <button
            v-wave
            type="button"
            class="mui-icon-btn flex-none"
            :style="{ visibility: (i === answerDrafts.length - 1 && answerDrafts.length < 5) ? 'visible' : 'hidden' }"
            :disabled="!(i === answerDrafts.length - 1 && answerDrafts.length < 5)"
            data-testid="poll-add-answer"
            @click="addAnswer"
          >
            <AppIcon icon="ic:baseline-add" style="font-size: 1.5rem;" />
          </button>
        </div>
        <div class="flex justify-center mt-5">
          <button
            v-wave
            class="mui-btn"
            :disabled="!questionDraft.trim() || answerDrafts.filter(a => a.trim()).length < 2"
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
      <AppTooltip side="top" :side-offset="6">
        <template #trigger>
          <button
            v-wave
            class="mui-icon-btn"
            :disabled="!canReset || countdownRunning"
            :style="{ color: (!canReset || countdownRunning) ? 'var(--text-disabled)' : undefined }"
            data-testid="reset-button"
            @click="emit('reset')"
          >
            <AppIcon icon="ic:baseline-restart-alt" style="font-size: 1.5rem;" />
          </button>
        </template>
        <template #content>{{ $t('cards.reset') }}</template>
      </AppTooltip>
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
          <AppTooltip v-for="option in countdownModeOptions" :key="option.value" side="top" :side-offset="6">
            <template #trigger>
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
            </template>
            <template #content>{{ $t(option.label) }}</template>
          </AppTooltip>
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

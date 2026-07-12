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

function removeAnswer(i: number) {
  answerDrafts.value.splice(i, 1)
  answerInputs.value.splice(i, 1)
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

const countdownModeOptions: { value: CountdownMode; icon: string; label: string }[] = [
  { value: 'silent', icon: 'ic:baseline-volume-off', label: 'cards.countdownSilent' },
  { value: 'dry', icon: 'app:timer', label: 'cards.countdownDry' },
  { value: 'wet', icon: 'app:town-hall', label: 'cards.countdownWet' },
]

// keep in sync with the CSS transition duration on .hold-btn.is-holding .hold-ring-fill
const HOLD_MS = 1400
const holdingMode = ref<CountdownMode | null>(null)
let holdTimeout: number | undefined

// once the countdown finishes naturally, `reveal()` still needs a realtime
// round-trip before `phase` flips to 'revealed' — without this flag the mode
// buttons would flash back in for that gap before CardsArea unmounts
const revealPending = ref(false)
watch(() => props.countdownRunning, (running, wasRunning) => {
  if (wasRunning && !running) revealPending.value = true
})

function canStartCountdown(): boolean {
  return !props.countdownRunning && !props.showLastRound && canVote.value
}

function startHold(mode: CountdownMode) {
  if (!canStartCountdown()) return
  holdingMode.value = mode
  clearTimeout(holdTimeout)
  holdTimeout = window.setTimeout(() => {
    holdingMode.value = null
    if (canStartCountdown()) emit('startCountdown', mode)
  }, HOLD_MS)
}

// scoped to `mode` so a blur/pointerleave bubbling from a *different* button
// (e.g. losing focus because another button was just pressed) can't cancel
// a hold it didn't start
function cancelHold(mode: CountdownMode) {
  if (holdingMode.value !== mode) return
  clearTimeout(holdTimeout)
  holdTimeout = undefined
  holdingMode.value = null
}
</script>

<template>
  <div class="flex flex-col items-center w-full rounded">
    <div
      v-if="(pollMode || voteQuestionMode) && !showLastRound"
      class="w-full max-w-[640px] mx-auto mb-8"
    >
      <h3
        v-if="pollQuestion"
        class="text-center text-mui-h2 font-bold text-primary"
        data-testid="poll-question"
      >
        {{ pollQuestion }}
      </h3>
      <div
        v-else-if="voteQuestionMode && isModerator"
        class="flex flex-col gap-3"
      >
        <input
          id="poll-question"
          v-model="questionDraft"
          type="text"
          name="poll-question"
          class="mui-input w-full"
          :placeholder="$t('poll.questionPlaceholder')"
          data-testid="poll-question-input"
        >
        <div
          v-for="(_, i) in answerDrafts"
          :key="i"
          class="flex items-center justify-center gap-2"
        >
          <input
            :ref="(el) => setAnswerRef(el, i)"
            :id="`poll-answer-${i}`"
            v-model="answerDrafts[i]"
            type="text"
            :name="`poll-answer-${i}`"
            class="mui-input w-48"
            maxlength="12"
            :placeholder="$t('poll.answerPlaceholder', { n: i + 1 })"
          >
          <button
            v-wave
            type="button"
            class="mui-icon-btn flex-none"
            :aria-label="$t('poll.removeAnswer')"
            data-testid="poll-remove-answer"
            @click="removeAnswer(i)"
          >
            <AppIcon
              icon="ic:baseline-close"
              style="font-size: 1.5rem;"
            />
          </button>
        </div>
        <button
          v-if="answerDrafts.length < MAX_ANSWERS"
          v-wave
          type="button"
          class="mui-btn mui-btn-text flex items-center gap-1 self-center normal-case"
          data-testid="poll-add-answer"
          @click="addAnswer"
        >
          <AppIcon
            icon="ic:baseline-add"
            style="font-size: 1.125rem;"
          />
          {{ $t('poll.addAnswer') }}
        </button>
        <div class="flex justify-center mt-5">
          <button
            v-wave
            class="mui-btn"
            :disabled="!questionDraft.trim() || answerDrafts.filter(a => a.trim()).length < 2 || answerDrafts.some(a => !a.trim())"
            data-testid="poll-start-button"
            @click="submitVoteQuestion"
          >
            {{ $t('poll.startVoting') }}
          </button>
        </div>
      </div>
      <div
        v-else-if="!voteQuestionMode && isModerator"
        class="flex flex-col gap-3"
      >
        <input
          id="poll-question-simple"
          v-model="questionDraft"
          type="text"
          name="poll-question"
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
      <p
        v-else
        class="text-center text-mui-body text-muted"
      >
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
          <span
            class="mui-card-value"
            :style="vqCardStyle(card)"
          >{{ voteQuestionMode && !pollQuestion ? '?' : cardLabel(card) }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="isModerator"
      class="flex flex-wrap items-center justify-center gap-6 pt-8"
    >
      <div class="flex items-center gap-2">
        <AppTooltip
          side="top"
          :side-offset="6"
        >
          <template #trigger>
            <button
              v-wave
              class="mui-icon-btn"
              :disabled="(!hasLastRound && !showLastRound) || countdownRunning"
              :style="{ color: ((!hasLastRound && !showLastRound) || countdownRunning) ? 'var(--text-disabled)' : undefined }"
              @click="emit('toggleLastRound')"
            >
              <AppIcon
                icon="lucide:undo"
                style="font-size: 1.5rem;"
              />
            </button>
          </template>
          <template #content>
            {{ showLastRound ? $t('cards.backToCards') : $t('cards.lastRound') }}
          </template>
        </AppTooltip>
        <AppTooltip
          side="top"
          :side-offset="6"
        >
          <template #trigger>
            <button
              v-wave
              class="mui-icon-btn"
              :disabled="!canReset || countdownRunning"
              :style="{ color: (!canReset || countdownRunning) ? 'var(--text-disabled)' : undefined }"
              data-testid="reset-button"
              @click="emit('reset')"
            >
              <AppIcon
                icon="ic:baseline-restart-alt"
                style="font-size: 1.5rem;"
              />
            </button>
          </template>
          <template #content>
            {{ $t('cards.reset') }}
          </template>
        </AppTooltip>
      </div>
      <div
        class="border-l border-input self-stretch"
        style="width: 0;"
      />
      <div class="flex items-center gap-4">
        <button
          v-if="!showLastRound"
          v-wave
          class="mui-btn"
          :disabled="!hasVotes || countdownRunning || !canVote"
          data-testid="reveal-button"
          @click="emit('reveal')"
        >
          {{ $t('cards.reveal') }}
        </button>
        <div
          class="mui-icon-group flex items-center justify-center"
          :class="{ 'pointer-events-none opacity-50': showLastRound || !canVote }"
          role="group"
          :aria-label="$t('cards.countdownGroupLabel')"
          data-testid="countdown-mode"
        >
          <template v-if="!countdownRunning && !revealPending">
            <AppTooltip
              v-for="option in countdownModeOptions"
              :key="option.value"
              side="top"
              :side-offset="6"
            >
              <template #trigger>
                <button
                  v-wave
                  type="button"
                  class="mui-icon-btn hold-btn"
                  :class="{ 'is-holding': holdingMode === option.value }"
                  :style="{ color: (showLastRound || !canVote) ? 'var(--text-disabled)' : undefined }"
                  :disabled="showLastRound || !canVote"
                  data-testid="countdown-mode-option"
                  @pointerdown="startHold(option.value)"
                  @pointerup="cancelHold(option.value)"
                  @pointerleave="cancelHold(option.value)"
                  @pointercancel="cancelHold(option.value)"
                  @keydown.enter="(e) => { if (!e.repeat) startHold(option.value) }"
                  @keydown.space.prevent="(e) => { if (!e.repeat) startHold(option.value) }"
                  @keyup.enter="cancelHold(option.value)"
                  @keyup.space="cancelHold(option.value)"
                  @blur="cancelHold(option.value)"
                  @contextmenu.prevent
                >
                  <svg
                    class="hold-ring"
                    viewBox="0 0 36 36"
                    aria-hidden="true"
                  >
                    <circle
                      class="hold-ring-fill"
                      cx="18"
                      cy="18"
                      r="17"
                    />
                  </svg>
                  <AppIcon
                    class="mui-svg-icon"
                    style="font-size: 1.5rem;"
                    :icon="option.icon"
                  />
                </button>
              </template>
              <template #content>
                {{ $t(option.label) }}
              </template>
            </AppTooltip>
          </template>
          <span
            v-else
            class="text-xl font-bold text-primary tabular-nums"
            data-testid="countdown-ticker"
          >{{ countdownCounter }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PieChart from '~/components/PieChart.vue'
import { createCelebrationParticles, shouldCelebrateGroupedVotes } from '~/utils/resultCelebration'

import { useI18n } from 'vue-i18n'

const props = defineProps<{
  votes: Record<string, number>
  groupedVotes?: { general: Record<string, number>; qa: Record<string, number> } | null
  isModerator: boolean
  pollQuestion?: string | null
}>()

const emit = defineEmits<{
  startNewRound: []
}>()

const { t } = useI18n()

function voteToNumber(v: string): number | null {
  const trimmed = v.replace(/\s*\*$/, '').replace(/h$/i, '')
  if (trimmed === '1/2') return 0.5
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function averageOf(votes: Record<string, number>): string | null {
  let sum = 0
  let count = 0
  for (const [vote, c] of Object.entries(votes)) {
    const n = voteToNumber(vote)
    if (n === null) continue
    sum += n * c
    count += c
  }
  if (count === 0) return null
  return (sum / count).toFixed(1)
}

const groups = computed(() => {
  const out: { label: string; votes: Record<string, number>; average: string | null }[] = []
  const devVotes = props.groupedVotes ? props.groupedVotes.general : props.votes
  out.push({ label: t('results.general'), votes: devVotes, average: averageOf(devVotes) })
  if (props.groupedVotes) {
    const qaTotal = Object.values(props.groupedVotes.qa).reduce((a, b) => a + b, 0)
    if (qaTotal) out.push({ label: 'QA', votes: props.groupedVotes.qa, average: averageOf(props.groupedVotes.qa) })
  }
  return out
})

const celebrate = computed(() => shouldCelebrateGroupedVotes(props.groupedVotes))

const celebrationParticles = ref(createCelebrationParticles(0))
const chartsEl = ref<HTMLElement | null>(null)

watch(celebrate, (next, prev) => {
  if (next && !prev) {
    let centerX = 50
    let centerY = 50
    if (chartsEl.value) {
      const rect = chartsEl.value.getBoundingClientRect()
      centerX = ((rect.left + rect.right) / 2 / window.innerWidth) * 100
      centerY = ((rect.top + rect.bottom) / 2 / window.innerHeight) * 100
    }
    celebrationParticles.value = createCelebrationParticles(undefined, undefined, centerX, centerY)
  } else if (!next) {
    celebrationParticles.value = []
  }
}, { immediate: true })
</script>

<template>
  <div data-testid="results-area" class="flex flex-col items-center gap-8 w-full">
    <div v-if="celebrate" class="celebration-layer" aria-hidden="true">
      <span
        v-for="(particle, index) in celebrationParticles"
        :key="index"
        class="celebration-particle"
        :style="{
          '--start-x': `${particle.startX}vw`,
          '--start-y': `${particle.startY}vh`,
          '--vx': `${particle.vx}vw`,
          '--vy': `${particle.vy}vw`,
          '--fall': `${particle.fall}vw`,
          '--size': `${particle.size}px`,
          '--spin': `${particle.spin}deg`,
          '--delay': `${particle.delay}ms`,
          '--duration': `${particle.duration}ms`,
          '--hue': `${particle.hue}deg`,
        }"
      />
    </div>
    <h3 v-if="pollQuestion" class="text-center text-mui-h2 font-bold text-primary" data-testid="poll-question">
      {{ pollQuestion }}
    </h3>
    <div ref="chartsEl" class="w-full flex flex-wrap justify-center gap-8">
      <div
        v-for="g in groups"
        :key="g.label"
        class="flex flex-col items-center gap-2"
        style="flex: 1 1 280px; max-width: 500px;"
      >
        <span class="mui-h6 text-primary">
          {{ g.label }}<template v-if="g.average !== null">: {{ g.average }}</template>
        </span>
        <PieChart :votes="g.votes" />
      </div>
    </div>
    <button
      v-if="isModerator"
      class="mui-btn"
      data-testid="new-round-button"
      @click="emit('startNewRound')"
    >
      {{ $t('cards.startNewRound') }}
    </button>
  </div>
</template>

<style scoped>
.celebration-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 60;
  overflow: hidden;
}

.celebration-particle {
  position: absolute;
  left: var(--start-x);
  top: var(--start-y);
  width: var(--size);
  height: calc(var(--size) * 0.4);
  border-radius: 2px;
  background: hsl(var(--hue) 90% 55%);
  transform-origin: center;
  opacity: 0;
  animation: confetti-burst var(--duration) ease-out 1;
  animation-delay: var(--delay);
}

@keyframes confetti-burst {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(0deg) scale(0.3);
  }
  6% {
    opacity: 1;
    transform: translate(calc(var(--vx) * 0.06), calc(var(--vy) * 0.06)) rotate(calc(var(--spin) * 0.06)) scale(1);
  }
  45% {
    opacity: 1;
    transform: translate(calc(var(--vx) * 0.45), var(--vy)) rotate(calc(var(--spin) * 0.5)) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--vx), calc(var(--vy) + var(--fall))) rotate(var(--spin)) scale(0.8);
  }
}
</style>

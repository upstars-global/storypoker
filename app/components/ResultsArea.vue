<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PieChart from '~/components/PieChart.vue'
import { createCelebrationParticles, shouldCelebrateGroupedVotes } from '~/utils/resultCelebration'

const props = defineProps<{
  votes: Record<string, number>
  groupedVotes?: { dev: Record<string, number>; qa: Record<string, number>; sm: Record<string, number> } | null
  isModerator: boolean
}>()

const emit = defineEmits<{
  startNewRound: []
}>()

const groups = computed(() => {
  if (!props.groupedVotes) return null
  const devTotal = Object.values(props.groupedVotes.dev).reduce((a, b) => a + b, 0)
  const qaTotal = Object.values(props.groupedVotes.qa).reduce((a, b) => a + b, 0)
  const smTotal = Object.values(props.groupedVotes.sm).reduce((a, b) => a + b, 0)
  const out: { label: 'DEV' | 'QA' | 'SM'; votes: Record<string, number> }[] = []
  if (devTotal) out.push({ label: 'DEV', votes: props.groupedVotes.dev })
  if (qaTotal) out.push({ label: 'QA', votes: props.groupedVotes.qa })
  if (smTotal) out.push({ label: 'SM', votes: props.groupedVotes.sm })
  return out.length ? out : null
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
    <div v-if="groups" ref="chartsEl" class="w-full flex flex-wrap justify-center gap-8">
      <div
        v-for="g in groups"
        :key="g.label"
        class="flex flex-col items-center gap-2"
        style="flex: 1 1 280px; max-width: 500px;"
      >
        <span class="mui-h6 text-primary">{{ g.label }}</span>
        <PieChart :votes="g.votes" />
      </div>
    </div>
    <div v-else ref="chartsEl">
      <PieChart :votes="votes" />
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

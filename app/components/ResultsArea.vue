<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PieChart from '~/components/PieChart.vue'
import { createCelebrationParticles, shouldCelebrateGroupedVotes } from '~/utils/resultCelebration'

import { useI18n } from 'vue-i18n'

const props = defineProps<{
  votes: Record<string, number>
  groupedVotes?: { general: Record<string, number>; qa: Record<string, number> } | null
  isModerator: boolean
}>()

const emit = defineEmits<{
  startNewRound: []
}>()

const { t } = useI18n()

const groups = computed(() => {
  if (!props.groupedVotes) return null
  const generalTotal = Object.values(props.groupedVotes.general).reduce((a, b) => a + b, 0)
  const qaTotal = Object.values(props.groupedVotes.qa).reduce((a, b) => a + b, 0)
  const out: { label: string; votes: Record<string, number> }[] = []
  if (generalTotal) out.push({ label: t('results.general'), votes: props.groupedVotes.general })
  if (qaTotal) out.push({ label: 'QA', votes: props.groupedVotes.qa })
  return out.length ? out : null
})

const celebrate = computed(() => shouldCelebrateGroupedVotes(props.groupedVotes))

const celebrationParticles = ref(createCelebrationParticles(0))

watch(celebrate, (next, prev) => {
  if (next && !prev) {
    celebrationParticles.value = createCelebrationParticles(360)
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
          '--particle-left': `${particle.left}vw`,
          '--particle-top': `${particle.top}vh`,
          '--particle-size': `${particle.size}px`,
          '--particle-delay': `${particle.delay}ms`,
          '--particle-duration': `${particle.duration}ms`,
          '--particle-angle': `${particle.angle}deg`,
          '--particle-curve-x': `${particle.curveX}px`,
          '--particle-curve-y': `${particle.curveY}px`,
          '--particle-drift-x': `${particle.driftX}px`,
          '--particle-drift-y': `${particle.driftY}px`,
          '--particle-hue': `${particle.hue}deg`,
        }"
      />
    </div>
    <div v-if="groups" class="w-full flex flex-wrap justify-center gap-8">
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
    <PieChart v-else :votes="votes" />
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
  left: var(--particle-left);
  top: var(--particle-top);
  width: var(--particle-size);
  height: calc(var(--particle-size) * 0.34);
  border-radius: 9999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), hsl(var(--particle-hue) 100% 60%), rgba(255, 255, 255, 0));
  opacity: 0;
  transform: translate(-50%, -50%) rotate(var(--particle-angle)) scaleX(0.2);
  transform-origin: center;
  animation: celebration-particle var(--particle-duration) cubic-bezier(0.2, 0.8, 0.2, 1) 1;
  animation-delay: var(--particle-delay);
  filter: drop-shadow(0 0 12px hsl(var(--particle-hue) 100% 60% / 0.72));
}

@keyframes celebration-particle {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--particle-angle)) scaleX(0.15);
  }
  8% {
    opacity: 1;
  }
  22% {
    opacity: 1;
    transform: translate(
        calc(-50% + (var(--particle-curve-x) * 0.18)),
        calc(-50% + (var(--particle-curve-y) * 0.18) - 40px)
      )
      rotate(calc(var(--particle-angle) + 120deg))
      scaleX(0.68);
  }
  48% {
    opacity: 1;
    transform: translate(
        calc(-50% + (var(--particle-curve-x) * 0.58)),
        calc(-50% + (var(--particle-curve-y) * 0.58) + 10px)
      )
      rotate(calc(var(--particle-angle) + 300deg))
      scaleX(1.1);
  }
  74% {
    opacity: 0.95;
    transform: translate(
        calc(-50% + (var(--particle-curve-x) * 0.86) + (var(--particle-drift-x) * 0.14)),
        calc(-50% + (var(--particle-curve-y) * 0.86) + (var(--particle-drift-y) * 0.14))
      )
      rotate(calc(var(--particle-angle) + 450deg))
      scaleX(1.5);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--particle-drift-x)), calc(-50% + var(--particle-drift-y))) rotate(calc(var(--particle-angle) + 720deg)) scaleX(2);
  }
}
</style>

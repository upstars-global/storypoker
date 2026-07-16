<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import { createCelebrationParticles, type CelebrationParticle } from '~/utils/resultCelebration'

const props = defineProps<{
  name: string
  symbol: string
  burstKey: number
}>()

const particles = ref<CelebrationParticle[]>([])

watch(() => props.burstKey, () => {
  particles.value = createCelebrationParticles(70)
}, { immediate: true })
</script>

<template>
  <div
    class="fixed left-1/2 -translate-x-1/2 z-50"
    style="top: 8px;"
    data-testid="slot-win-banner"
  >
    <div class="slot-win-layer" aria-hidden="true">
      <span
        v-for="(particle, index) in particles"
        :key="`${burstKey}-${index}`"
        class="slot-win-particle"
        :style="{
          '--start-x': `${particle.startX}vw`,
          '--start-y': `${particle.startY}vh`,
          '--vx': `${particle.vx * 0.6}vw`,
          '--vy': `${particle.vy * 0.6}vw`,
          '--fall': `${particle.fall * 0.6}vw`,
          '--size': `${Math.max(4, particle.size - 4)}px`,
          '--spin': `${particle.spin}deg`,
          '--delay': `${particle.delay}ms`,
          '--duration': `${particle.duration}ms`,
          '--hue': `${particle.hue}deg`,
        }"
      />
    </div>
    <div class="mui-paper shadow-8 px-4 py-1.5 text-mui-body text-primary flex items-center gap-2 whitespace-nowrap">
      <span class="inline-flex items-center gap-0.5 text-primary">
        <AppIcon :icon="symbol" />
        <AppIcon :icon="symbol" />
        <AppIcon :icon="symbol" />
      </span>
      <span class="font-semibold">{{ $t('slot.jackpot', { name }) }}</span>
    </div>
  </div>
</template>

<style scoped>
.slot-win-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 60;
  overflow: hidden;
}

.slot-win-particle {
  position: absolute;
  left: var(--start-x);
  top: var(--start-y);
  width: var(--size);
  height: calc(var(--size) * 0.4);
  border-radius: 2px;
  background: hsl(var(--hue) 90% 55%);
  transform-origin: center;
  opacity: 0;
  animation: slot-confetti var(--duration) ease-out 1;
  animation-delay: var(--delay);
}

@keyframes slot-confetti {
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

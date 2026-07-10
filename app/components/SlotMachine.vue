<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import AppTooltip from '~/components/AppTooltip.vue'
import { spinReels, isJackpot, buildReelStrip } from '~/utils/slotMachine'

const props = defineProps<{
  spinsLeft: number
}>()

const emit = defineEmits<{
  win: [symbol: string]
  spin: []
  switchWidget: []
}>()

const CELL_PX = 56
const REEL_DURATIONS_MS = [1100, 1700, 2300] as const

const reels = ref<string[]>(['7️⃣', '7️⃣', '7️⃣'])
const strips = ref<string[][]>([['7️⃣'], ['7️⃣'], ['7️⃣']])
const offsets = ref<number[]>([0, 0, 0])
const transitions = ref<string[]>(['none', 'none', 'none'])
const spinning = ref(false)
const jackpotFlash = ref(false)

let finishTimer: ReturnType<typeof setTimeout> | undefined
let flashTimer: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => { clearTimeout(finishTimer); clearTimeout(flashTimer) })

async function spin() {
  if (spinning.value || props.spinsLeft <= 0) return
  emit('spin')
  spinning.value = true
  jackpotFlash.value = false
  const targets = spinReels()
  strips.value = targets.map((target, i) => [reels.value[i]!, ...buildReelStrip(10 + i * 6), target])
  transitions.value = ['none', 'none', 'none']
  offsets.value = [0, 0, 0]
  await nextTick()
  requestAnimationFrame(() => requestAnimationFrame(() => {
    transitions.value = REEL_DURATIONS_MS.map(d => `transform ${d}ms cubic-bezier(0.22, 0.9, 0.3, 1)`)
    offsets.value = strips.value.map(strip => -(strip.length - 1) * CELL_PX)
  }))
  finishTimer = setTimeout(() => {
    reels.value = [...targets]
    strips.value = targets.map(t => [t])
    transitions.value = ['none', 'none', 'none']
    offsets.value = [0, 0, 0]
    spinning.value = false
    if (isJackpot(targets)) {
      jackpotFlash.value = true
      flashTimer = setTimeout(() => { jackpotFlash.value = false }, 2500)
      emit('win', targets[0]!)
    }
  }, REEL_DURATIONS_MS[2] + 150)
}
</script>

<template>
  <div
    class="mui-paper"
    data-testid="slot-machine"
  >
    <div class="mui-paper-header justify-center relative">
      <span>{{ $t('slot.title') }}</span>
      <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
        <AppTooltip
          side="left"
          :side-offset="6"
        >
          <template #trigger>
            <button
              v-wave
              type="button"
              class="mui-icon-btn"
              style="padding: 4px; color: inherit;"
              :aria-label="$t('slot.switchToTimer')"
              data-testid="widget-toggle-timer"
              @click="emit('switchWidget')"
            >
              <AppIcon
                class="mui-svg-icon"
                icon="ic:baseline-timer"
                style="font-size: 1.25rem;"
              />
            </button>
          </template>
          <template #content>
            {{ $t('slot.switchToTimer') }}
          </template>
        </AppTooltip>
      </div>
    </div>
    <div class="flex flex-col items-center gap-3 px-4 py-4">
      <div
        class="slot-window"
        :class="{ 'is-jackpot': jackpotFlash }"
      >
        <div
          v-for="(strip, i) in strips"
          :key="i"
          class="slot-reel"
          data-testid="slot-reel"
        >
          <div
            class="slot-strip"
            :style="{ transform: `translateY(${offsets[i]}px)`, transition: transitions[i] }"
          >
            <span
              v-for="(symbol, j) in strip"
              :key="j"
              class="slot-cell"
            >{{ symbol }}</span>
          </div>
        </div>
      </div>
      <button
        v-wave
        class="mui-btn mui-btn-sm w-full"
        style="max-width: 200px;"
        :disabled="spinning || spinsLeft <= 0"
        data-testid="slot-spin-button"
        @click="spin"
      >
        {{ spinning ? '…' : $t('slot.spin') }}
      </button>
      <span
        class="text-mui-caption text-muted"
        data-testid="slot-spins-left"
      >
        {{ spinsLeft > 0 ? $t('slot.spinsLeft', { n: spinsLeft }) : $t('slot.noSpinsLeft') }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.slot-window {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-card, 8px);
  border: 2px solid var(--border-input);
  background-color: var(--bg-elevated);
  transition: box-shadow 300ms, border-color 300ms;
}
.slot-window.is-jackpot {
  border-color: var(--success);
  box-shadow: 0 0 18px color-mix(in srgb, var(--success) 55%, transparent);
}
.slot-reel {
  width: 52px;
  height: 56px;
  overflow: hidden;
  border-radius: calc(var(--radius-card, 8px) / 2);
  background-color: var(--bg-paper);
  border: 1px solid var(--border);
}
.slot-strip {
  display: flex;
  flex-direction: column;
  will-change: transform;
}
.slot-cell {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  line-height: 1;
  user-select: none;
}
</style>

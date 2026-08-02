<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import AppTooltip from '~/components/AppTooltip.vue'
import { spinReels, isJackpot, buildReelStrip } from '~/utils/slotMachine'

const props = defineProps<{
  spinsLeft: number
  canSpin: boolean
}>()

const emit = defineEmits<{
  win: []
  spin: []
  spinEnd: []
  switchWidget: []
}>()

const CELL_PX = 56
const REEL_DURATIONS_MS = [1100, 1700, 2300] as const

const reels = ref<string[]>(['tabler:play-card-7', 'tabler:play-card-7', 'tabler:play-card-7'])
const strips = ref<string[][]>([['tabler:play-card-7'], ['tabler:play-card-7'], ['tabler:play-card-7']])
const offsets = ref<number[]>([0, 0, 0])
const transitions = ref<string[]>(['none', 'none', 'none'])
const spinning = ref(false)
const jammed = ref(false)
const showVoteFirstHint = ref(false)

let finishTimer: ReturnType<typeof setTimeout> | undefined
let jamTimer: ReturnType<typeof setTimeout> | undefined
let hintTimer: ReturnType<typeof setTimeout> | undefined
let tickRaf: number | undefined
onUnmounted(() => {
  clearTimeout(finishTimer)
  clearTimeout(jamTimer)
  clearTimeout(hintTimer)
  if (tickRaf !== undefined) cancelAnimationFrame(tickRaf)
})

// synthesized via Web Audio (no asset) so it stays lightweight and easy to keep quiet
let audioCtx: AudioContext | undefined
function playTick() {
  audioCtx ??= new AudioContext()
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 1400
  gain.gain.setValueAtTime(0.045, audioCtx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.025)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.03)
}

// mirrors the CSS `cubic-bezier(0.22, 0.9, 0.3, 1)` driving the reel transform,
// so ticks land exactly on the cells the eye sees passing (fast start, slow stop)
function cubicBezierEasing(p1x: number, p1y: number, p2x: number, p2y: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1
  const c = (a1: number) => 3 * a1
  const bezier = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t
  const slope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let t = x
    for (let i = 0; i < 8; i++) {
      const currentSlope = slope(t, p1x, p2x)
      if (Math.abs(currentSlope) < 1e-6) break
      t -= (bezier(t, p1x, p2x) - x) / currentSlope
    }
    return bezier(t, p1y, p2y)
  }
}
const reelEasing = cubicBezierEasing(0.22, 0.9, 0.3, 1)

function startTickLoop(totalSteps: number[]) {
  const startTime = performance.now()
  const lastCell = [0, 0, 0]
  const lastCellTickTime = [0, 0, 0]
  const lastReelIndex = totalSteps.length - 1
  let finalLeadTickDone = false
  function frame(now: number) {
    let anyActive = false
    for (let i = 0; i < 3; i++) {
      const duration = REEL_DURATIONS_MS[i]!
      const elapsed = now - startTime
      if (elapsed >= duration) {
        if (i === lastReelIndex) playTick()
        continue
      }
      anyActive = true
      const progress = reelEasing(Math.min(elapsed / duration, 1))
      const cell = Math.floor(progress * totalSteps[i]!)
      if (cell > lastCell[i]!) {
        for (let c = lastCell[i]! + 1; c <= cell; c++) playTick()
        lastCell[i] = cell
        lastCellTickTime[i] = elapsed
      }
      if (i === lastReelIndex && !finalLeadTickDone) {
        const leadPoint = lastCellTickTime[i]! + (duration - lastCellTickTime[i]!) * 0.35
        if (elapsed >= leadPoint) {
          playTick()
          finalLeadTickDone = true
        }
      }
    }
    tickRaf = anyActive ? requestAnimationFrame(frame) : undefined
  }
  tickRaf = requestAnimationFrame(frame)
}

// Button stays clickable even when you can't spin yet (haven't voted) - jiggling
// the reels a couple millimeters, like a jammed lever, reads better than a
// disabled button players might mistake for "broken" or "out of spins". The
// hint below only flashes for 1.5s after this click, instead of sitting there
// permanently whenever canSpin is false.
function triggerJam() {
  if (jammed.value) return
  jammed.value = true
  clearTimeout(jamTimer)
  jamTimer = setTimeout(() => { jammed.value = false }, 400)

  showVoteFirstHint.value = true
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => { showVoteFirstHint.value = false }, 1500)
}

async function spin() {
  if (spinning.value || props.spinsLeft <= 0) return
  if (!props.canSpin) {
    triggerJam()
    return
  }
  emit('spin')
  spinning.value = true
  if (tickRaf !== undefined) cancelAnimationFrame(tickRaf)
  const targets = spinReels()
  strips.value = targets.map((target, i) => [reels.value[i]!, ...buildReelStrip(10 + i * 6), target])
  transitions.value = ['none', 'none', 'none']
  offsets.value = [0, 0, 0]
  await nextTick()
  requestAnimationFrame(() => requestAnimationFrame(() => {
    transitions.value = REEL_DURATIONS_MS.map(d => `transform ${d}ms cubic-bezier(0.22, 0.9, 0.3, 1)`)
    offsets.value = strips.value.map(strip => -(strip.length - 1) * CELL_PX)
    startTickLoop(strips.value.map(s => s.length - 1))
  }))
  finishTimer = setTimeout(() => {
    reels.value = [...targets]
    strips.value = targets.map(t => [t])
    transitions.value = ['none', 'none', 'none']
    offsets.value = [0, 0, 0]
    spinning.value = false
    emit('spinEnd')
    if (isJackpot(targets)) emit('win')
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
        :class="{ 'is-jammed': jammed }"
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
            ><AppIcon
              class="mui-svg-icon"
              :icon="symbol"
            /></span>
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
        {{ spinsLeft <= 0 ? $t('slot.noSpinsLeft') : showVoteFirstHint ? $t('slot.voteFirst') : $t('slot.spinsLeft', { n: spinsLeft === Infinity ? '∞' : spinsLeft }) }}
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
.slot-window.is-jammed .slot-strip {
  animation: slot-jam 400ms ease-in-out;
}
.slot-window.is-jammed .slot-reel:nth-child(2) .slot-strip {
  animation-delay: 40ms;
}
.slot-window.is-jammed .slot-reel:nth-child(3) .slot-strip {
  animation-delay: 80ms;
}
@keyframes slot-jam {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(3px); }
  45% { transform: translateY(-2px); }
  70% { transform: translateY(2px); }
  90% { transform: translateY(-1px); }
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

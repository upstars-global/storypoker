<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AppTooltip from '~/components/AppTooltip.vue'
import { useI18n } from 'vue-i18n'
import { playAlarmChime, unlockAlarmAudio, clampAlarmMinutes, ALARM_MIN_MINUTES, ALARM_MAX_MINUTES, type AlarmSettings } from '~/utils/timerAlarm'

const props = defineProps<{
  roundStartedAt: string
  phase: 'voting' | 'revealed'
  pausedAt: string | null
  pausedElapsedMs: number
  canControl: boolean
  alarmMinutes?: number | null
  alarmMuted?: boolean | null
}>()

const emit = defineEmits<{
  (e: 'reset'): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'adjust', deltaMs: number): void
  (e: 'switchWidget'): void
  (e: 'updateAlarm', settings: Partial<AlarmSettings>): void
}>()

const { t } = useI18n()
const now = ref(Date.now())
const revealedAt = ref<number | null>(null)

watch(() => props.phase, (phase) => {
  revealedAt.value = phase === 'revealed' ? Date.now() : null
}, { immediate: true })

let interval: ReturnType<typeof setInterval>
onMounted(() => { interval = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => clearInterval(interval))

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

const isPaused = computed(() => Boolean(props.pausedAt))

const pivotMs = computed(() => {
  const pausedAtMs = props.pausedAt ? new Date(props.pausedAt).getTime() : null
  if (props.phase === 'revealed' && revealedAt.value !== null) {
    return pausedAtMs === null ? revealedAt.value : Math.min(revealedAt.value, pausedAtMs)
  }
  if (pausedAtMs !== null) return pausedAtMs
  return now.value
})

const elapsedMs = computed(() => {
  const start = new Date(props.roundStartedAt).getTime()
  return Math.max(0, pivotMs.value - start - (props.pausedElapsedMs ?? 0))
})

const text = computed(() => {
  const duration = formatDuration(elapsedMs.value)
  return props.phase === 'voting'
    ? t('timer.roundStartedAgo', { duration })
    : t('timer.roundDuration', { duration })
})

const showControls = computed(() => props.canControl && props.phase === 'voting')

const alarmMinutes = computed(() => clampAlarmMinutes(props.alarmMinutes))
const alarmMuted = computed(() => props.alarmMuted ?? false)
const alarmSettingsOpen = ref(false)
const alarmBlinking = ref(false)

function alarmIndexAt(ms: number) {
  return Math.floor(ms / (alarmMinutes.value * 60_000))
}

let firedAlarmIndex = alarmIndexAt(elapsedMs.value)
watch([() => props.roundStartedAt, alarmMinutes], () => {
  firedAlarmIndex = alarmIndexAt(elapsedMs.value)
}, { flush: 'sync' })

watch(elapsedMs, (current) => {
  const index = alarmIndexAt(current)
  if (index <= firedAlarmIndex) return
  firedAlarmIndex = index
  if (props.phase !== 'voting') return
  alarmBlinking.value = true
  if (props.canControl && !isPaused.value) emit('pause')
  if (!alarmMuted.value) playAlarmChime()
})

const unlockAlarmEvents = ['pointerdown', 'keydown'] as const
onMounted(() => unlockAlarmEvents.forEach(type => window.addEventListener(type, unlockAlarmAudio, { once: true })))
onUnmounted(() => unlockAlarmEvents.forEach(type => window.removeEventListener(type, unlockAlarmAudio)))

function onAlarmMinutesChange(event: Event) {
  const input = event.target as HTMLInputElement
  const minutes = clampAlarmMinutes(Number(input.value))
  input.value = String(minutes)
  if (minutes !== alarmMinutes.value) emit('updateAlarm', { minutes })
}

function toggleAlarmMuted() {
  emit('updateAlarm', { muted: !alarmMuted.value })
}
</script>

<template>
  <div
    class="mui-paper"
    :class="{ 'timer-alarm-blink': alarmBlinking }"
    data-testid="timer-widget"
    @animationend.self="alarmBlinking = false"
  >
    <div class="mui-paper-header justify-center relative">
      <div
        v-if="canControl"
        class="absolute left-1.5 top-1/2 -translate-y-1/2"
      >
        <AppTooltip
          side="top"
          :side-offset="6"
        >
          <template #trigger>
            <button
              v-wave
              type="button"
              class="mui-icon-btn"
              style="padding: 4px; color: inherit;"
              :aria-label="$t('timer.alarmSettings')"
              :aria-expanded="alarmSettingsOpen"
              data-testid="timer-alarm-toggle"
              @click="alarmSettingsOpen = !alarmSettingsOpen"
            >
              <AppIcon
                class="mui-svg-icon"
                icon="ic:baseline-settings"
                style="font-size: 1.25rem;"
              />
            </button>
          </template>
          <template #content>
            {{ $t('timer.alarmSettings') }}
          </template>
        </AppTooltip>
      </div>
      <span>{{ $t('timer.title') }}</span>
      <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
        <AppTooltip
          side="top"
          :side-offset="6"
        >
          <template #trigger>
            <button
              v-wave
              type="button"
              class="mui-icon-btn"
              style="padding: 4px; color: inherit;"
              :aria-label="$t('slot.switchToSlot')"
              data-testid="widget-toggle-slot"
              @click="emit('switchWidget')"
            >
              <AppIcon
                class="mui-svg-icon"
                icon="ic:baseline-casino"
                style="font-size: 1.25rem;"
              />
            </button>
          </template>
          <template #content>
            {{ $t('slot.switchToSlot') }}
          </template>
        </AppTooltip>
      </div>
    </div>
    <div
      v-if="canControl && alarmSettingsOpen"
      class="flex items-center gap-2 px-4 pt-3 text-body"
      data-testid="timer-alarm-settings"
    >
      <label
        for="timer-alarm-minutes"
        class="mui-body"
      >{{ $t('timer.alarmAfter') }}</label>
      <input
        id="timer-alarm-minutes"
        type="number"
        :min="ALARM_MIN_MINUTES"
        :max="ALARM_MAX_MINUTES"
        step="1"
        class="mui-input"
        style="width: 72px;"
        :value="alarmMinutes"
        data-testid="timer-alarm-minutes"
        @change="onAlarmMinutesChange"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
      >
      <span class="mui-body">{{ $t('timer.minutesShort') }}</span>
      <AppTooltip
        side="top"
        :side-offset="6"
      >
        <template #trigger>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.alarmSound')"
            :aria-pressed="!alarmMuted"
            data-testid="timer-alarm-mute"
            @click="toggleAlarmMuted"
          >
            <AppIcon
              class="mui-svg-icon"
              :icon="alarmMuted ? 'ic:baseline-notifications-off' : 'ic:baseline-notifications-active'"
              style="font-size: 1.5rem;"
            />
          </button>
        </template>
        <template #content>
          {{ $t('timer.alarmSound') }}
        </template>
      </AppTooltip>
    </div>
    <p
      class="mui-body px-4 py-3 text-body"
      data-testid="timer-display"
    >
      {{ text }}
    </p>
    <div
      v-if="showControls"
      class="timer-controls flex justify-between px-4 pb-3"
    >
      <AppTooltip
        side="top"
        :side-offset="6"
      >
        <template #trigger>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.minus30')"
            @click="emit('adjust', -30000)"
          >
            <AppIcon
              class="mui-svg-icon"
              icon="ic:baseline-fast-rewind"
              style="font-size: 1.5rem;"
            />
          </button>
        </template>
        <template #content>
          {{ $t('timer.minus30') }}
        </template>
      </AppTooltip>
      <AppTooltip
        side="top"
        :side-offset="6"
      >
        <template #trigger>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.reset')"
            @click="emit('reset')"
          >
            <AppIcon
              class="mui-svg-icon"
              icon="ic:baseline-stop"
              style="font-size: 1.5rem;"
            />
          </button>
        </template>
        <template #content>
          {{ $t('timer.reset') }}
        </template>
      </AppTooltip>
      <AppTooltip
        v-if="!isPaused"
        side="top"
        :side-offset="6"
      >
        <template #trigger>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.pause')"
            @click="emit('pause')"
          >
            <AppIcon
              class="mui-svg-icon"
              icon="ic:baseline-pause"
              style="font-size: 1.5rem;"
            />
          </button>
        </template>
        <template #content>
          {{ $t('timer.pause') }}
        </template>
      </AppTooltip>
      <AppTooltip
        v-else
        side="top"
        :side-offset="6"
      >
        <template #trigger>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.continue')"
            @click="emit('resume')"
          >
            <AppIcon
              class="mui-svg-icon"
              icon="ic:baseline-play-arrow"
              style="font-size: 1.5rem;"
            />
          </button>
        </template>
        <template #content>
          {{ $t('timer.continue') }}
        </template>
      </AppTooltip>
      <AppTooltip
        side="top"
        :side-offset="6"
      >
        <template #trigger>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.plus30')"
            @click="emit('adjust', 30000)"
          >
            <AppIcon
              class="mui-svg-icon"
              icon="ic:baseline-fast-forward"
              style="font-size: 1.5rem;"
            />
          </button>
        </template>
        <template #content>
          {{ $t('timer.plus30') }}
        </template>
      </AppTooltip>
    </div>
  </div>
</template>

<style scoped>
.timer-alarm-blink {
  animation: timer-alarm-blink 0.6s ease-in-out 3;
}
@keyframes timer-alarm-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}
</style>

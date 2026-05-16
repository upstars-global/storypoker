<script setup lang="ts">
const props = defineProps<{
  roundStartedAt: string
  phase: 'voting' | 'revealed'
  pausedAt: string | null
  pausedElapsedMs: number
  canControl: boolean
}>()

const emit = defineEmits<{
  (e: 'reset'): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'adjust', deltaMs: number): void
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

const elapsedMs = computed(() => {
  const start = new Date(props.roundStartedAt).getTime()
  const pivot = props.phase === 'revealed' && revealedAt.value !== null
    ? revealedAt.value
    : props.pausedAt
      ? new Date(props.pausedAt).getTime()
      : now.value
  return Math.max(0, pivot - start - (props.pausedElapsedMs ?? 0))
})

const text = computed(() => {
  const duration = formatDuration(elapsedMs.value)
  return props.phase === 'voting'
    ? t('timer.roundStartedAgo', { duration })
    : t('timer.roundDuration', { duration })
})

const showControls = computed(() => props.canControl && props.phase === 'voting')
</script>

<template>
  <div class="mui-paper">
    <div class="mui-paper-header" style="justify-content: center;">
      <span>{{ $t('timer.title') }}</span>
    </div>
    <p class="mui-body px-4 py-3" style="color: var(--text-body);">{{ text }}</p>
    <div v-if="showControls" class="flex flex-wrap justify-center gap-2 px-4 pb-3">
      <button
        v-wave
        type="button"
        class="mui-btn mui-btn-secondary mui-btn-sm"
        :aria-label="$t('timer.minus30')"
        :title="$t('timer.minus30')"
        @click="emit('adjust', -30000)"
      >
        <Icon class="mui-svg-icon" name="app:replay-30" style="font-size: 1.125rem;" />
      </button>
      <button
        v-if="!isPaused"
        v-wave
        type="button"
        class="mui-btn mui-btn-secondary mui-btn-sm"
        :aria-label="$t('timer.pause')"
        :title="$t('timer.pause')"
        @click="emit('pause')"
      >
        <Icon class="mui-svg-icon" name="app:pause" style="font-size: 1.125rem;" />
      </button>
      <button
        v-else
        v-wave
        type="button"
        class="mui-btn mui-btn-secondary mui-btn-sm"
        :aria-label="$t('timer.continue')"
        :title="$t('timer.continue')"
        @click="emit('resume')"
      >
        <Icon class="mui-svg-icon" name="app:play" style="font-size: 1.125rem;" />
      </button>
      <button
        v-wave
        type="button"
        class="mui-btn mui-btn-secondary mui-btn-sm"
        :aria-label="$t('timer.reset')"
        :title="$t('timer.reset')"
        @click="emit('reset')"
      >
        <Icon class="mui-svg-icon" name="app:replay" style="font-size: 1.125rem;" />
      </button>
      <button
        v-wave
        type="button"
        class="mui-btn mui-btn-secondary mui-btn-sm"
        :aria-label="$t('timer.plus30')"
        :title="$t('timer.plus30')"
        @click="emit('adjust', 30000)"
      >
        <Icon class="mui-svg-icon" name="app:forward-30" style="font-size: 1.125rem;" />
      </button>
    </div>
  </div>
</template>

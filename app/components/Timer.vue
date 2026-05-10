<script setup lang="ts">
const props = defineProps<{
  roundStartedAt: string
  phase: 'voting' | 'revealed'
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

const text = computed(() => {
  const start = new Date(props.roundStartedAt).getTime()
  if (props.phase === 'voting') {
    return t('timer.roundStartedAgo', { duration: formatDuration(now.value - start) })
  }
  const elapsed = (revealedAt.value ?? now.value) - start
  return t('timer.roundDuration', { duration: formatDuration(elapsed) })
})
</script>

<template>
  <div class="mui-paper">
    <div class="mui-paper-header" style="justify-content: center;">
      <span>{{ $t('timer.title') }}</span>
    </div>
    <p class="mui-body px-4 py-3" style="color: var(--text-body);">{{ text }}</p>
  </div>
</template>

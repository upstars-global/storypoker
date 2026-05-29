<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
import { useI18n } from 'vue-i18n'

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

const pivotMs = computed(() => {
  if (props.phase === 'revealed' && revealedAt.value !== null) return revealedAt.value
  if (props.pausedAt) return new Date(props.pausedAt).getTime()
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
</script>

<template>
  <div class="mui-paper">
    <div class="mui-paper-header justify-center">
      <span>{{ $t('timer.title') }}</span>
    </div>
    <p class="mui-body px-4 py-3 text-body">{{ text }}</p>
    <div v-if="showControls" class="flex justify-between px-4 pb-3">
      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.minus30')"
            @click="emit('adjust', -30000)"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-fast-rewind" style="font-size: 1.5rem;" />
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('timer.minus30') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.reset')"
            @click="emit('reset')"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-stop" style="font-size: 1.5rem;" />
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('timer.reset') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
      <TooltipRoot v-if="!isPaused">
        <TooltipTrigger as-child>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.pause')"
            @click="emit('pause')"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-pause" style="font-size: 1.5rem;" />
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('timer.pause') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
      <TooltipRoot v-else>
        <TooltipTrigger as-child>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.continue')"
            @click="emit('resume')"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-play-arrow" style="font-size: 1.5rem;" />
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('timer.continue') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
      <TooltipRoot>
        <TooltipTrigger as-child>
          <button
            v-wave
            type="button"
            class="mui-icon-btn text-muted dark:text-inverse"
            :aria-label="$t('timer.plus30')"
            @click="emit('adjust', 30000)"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-fast-forward" style="font-size: 1.5rem;" />
          </button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
            {{ $t('timer.plus30') }}
          </TooltipContent>
        </TooltipPortal>
      </TooltipRoot>
    </div>
  </div>
</template>

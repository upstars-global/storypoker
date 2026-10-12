<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, onUnmounted } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import { useI18n } from 'vue-i18n'
import { useRoomStore, type RoomBackground } from '~/stores/room'
import {
  BACKGROUND_ACCEPT,
  BACKGROUND_MAX_ZOOM,
  DEFAULT_FRAMING,
  clampFraming,
  encodeBackground,
  framedSize,
  loadBackgroundImage,
  type Framing,
} from '~/utils/backgroundImage'

const props = defineProps<{
  currentUrl: string | null
}>()

const emit = defineEmits<{
  close: []
  saved: [background: RoomBackground]
}>()

const { t } = useI18n()
const roomStore = useRoomStore()

const fileInput = ref<HTMLInputElement | null>(null)
const frame = ref<HTMLElement | null>(null)
const pendingBitmap = ref<ImageBitmap | null>(null)
const pendingObjectUrl = ref<string | null>(null)
const framing = ref<Framing>({ ...DEFAULT_FRAMING })
const removeRequested = ref(false)
const processing = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const savedPreviewUrl = computed(() => removeRequested.value ? null : props.currentUrl)
const hasChanges = computed(() => Boolean(pendingBitmap.value) || (removeRequested.value && Boolean(props.currentUrl)))

const pendingImageStyle = computed(() => {
  const bitmap = pendingBitmap.value
  if (!bitmap) return undefined
  const size = framedSize(bitmap.width, bitmap.height, framing.value.zoom)
  return {
    width: `${size.width * 100}%`,
    height: `${size.height * 100}%`,
    left: `${((1 - size.width) / 2 + framing.value.offsetX) * 100}%`,
    top: `${((1 - size.height) / 2 + framing.value.offsetY) * 100}%`,
  }
})

function clearPending() {
  if (pendingObjectUrl.value) URL.revokeObjectURL(pendingObjectUrl.value)
  pendingObjectUrl.value = null
  pendingBitmap.value?.close()
  pendingBitmap.value = null
  framing.value = { ...DEFAULT_FRAMING }
}

function updateFraming(next: Framing) {
  const bitmap = pendingBitmap.value
  if (bitmap) framing.value = clampFraming(next, bitmap.width, bitmap.height)
}

function setZoom(zoom: number) {
  updateFraming({ ...framing.value, zoom })
}

let drag: { pointerId: number; x: number; y: number } | null = null

function onPointerDown(e: PointerEvent) {
  if (!pendingBitmap.value) return
  drag = { pointerId: e.pointerId, x: e.clientX, y: e.clientY }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!drag || drag.pointerId !== e.pointerId || !frame.value) return
  const { clientWidth, clientHeight } = frame.value
  if (!clientWidth || !clientHeight) return
  const dx = (e.clientX - drag.x) / clientWidth
  const dy = (e.clientY - drag.y) / clientHeight
  drag = { ...drag, x: e.clientX, y: e.clientY }
  updateFraming({ ...framing.value, offsetX: framing.value.offsetX + dx, offsetY: framing.value.offsetY + dy })
}

function onPointerUp(e: PointerEvent) {
  if (drag?.pointerId === e.pointerId) drag = null
}

function onWheel(e: WheelEvent) {
  if (!pendingBitmap.value) return
  e.preventDefault()
  setZoom(framing.value.zoom * Math.exp(-e.deltaY * 0.0015))
}

const KEY_STEP = 0.02

function onFrameKeydown(e: KeyboardEvent) {
  if (!pendingBitmap.value) return
  const { offsetX, offsetY, zoom } = framing.value
  const moves: Record<string, Framing> = {
    ArrowLeft: { zoom, offsetX: offsetX - KEY_STEP, offsetY },
    ArrowRight: { zoom, offsetX: offsetX + KEY_STEP, offsetY },
    ArrowUp: { zoom, offsetX, offsetY: offsetY - KEY_STEP },
    ArrowDown: { zoom, offsetX, offsetY: offsetY + KEY_STEP },
    '+': { zoom: zoom + 0.1, offsetX, offsetY },
    '=': { zoom: zoom + 0.1, offsetX, offsetY },
    '-': { zoom: zoom - 0.1, offsetX, offsetY },
  }
  const next = moves[e.key]
  if (!next) return
  e.preventDefault()
  updateFraming(next)
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = null
  processing.value = true
  try {
    const bitmap = await loadBackgroundImage(file)
    clearPending()
    pendingBitmap.value = bitmap
    pendingObjectUrl.value = URL.createObjectURL(file)
    removeRequested.value = false
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : ''
    error.value = code === 'file-too-large'
      ? t('roomBackground.errorFileTooLarge')
      : code === 'unsupported-type'
        ? t('roomBackground.errorUnsupportedType')
        : t('roomBackground.errorDecodeFailed')
  } finally {
    processing.value = false
  }
}

function removeImage() {
  clearPending()
  removeRequested.value = true
  error.value = null
}

async function save() {
  if (saving.value || !hasChanges.value) return
  saving.value = true
  error.value = null
  try {
    const background = pendingBitmap.value
      ? await roomStore.uploadBackground(await encodeBackground(pendingBitmap.value, framing.value))
      : await roomStore.removeBackground()
    if (background) emit('saved', background)
    emit('close')
  } catch {
    error.value = t('roomBackground.saveError')
  } finally {
    saving.value = false
  }
}

onUnmounted(clearPending)
</script>

<template>
  <AppModal
    labelledby="room-background-modal-title"
    :open="true"
    @close="emit('close')"
  >
    <AppModalPaper
      style="max-width: 560px; padding: 32px 40px 40px;"
      @close="emit('close')"
    >
      <h2
        id="room-background-modal-title"
        class="text-center text-mui-h2 font-bold text-primary"
      >
        {{ $t('roomBackground.title') }}
      </h2>

      <input
        ref="fileInput"
        type="file"
        :accept="BACKGROUND_ACCEPT"
        class="hidden"
        data-testid="room-background-file"
        @change="onFileSelected"
      >
      <div
        v-if="pendingObjectUrl"
        ref="frame"
        class="room-background-frame mt-6 w-full overflow-hidden rounded relative bg-skeleton"
        style="aspect-ratio: 16 / 9;"
        tabindex="0"
        role="group"
        :aria-label="$t('roomBackground.adjustHint')"
        data-testid="room-background-frame"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel="onWheel"
        @keydown="onFrameKeydown"
      >
        <img
          :src="pendingObjectUrl"
          :alt="$t('roomBackground.preview')"
          class="absolute max-w-none select-none pointer-events-none"
          :style="pendingImageStyle"
          draggable="false"
          data-testid="room-background-pending-image"
        >
      </div>
      <button
        v-else
        v-wave
        type="button"
        class="mt-6 w-full overflow-hidden rounded flex items-center justify-center bg-skeleton"
        style="aspect-ratio: 16 / 9;"
        :aria-label="$t('roomBackground.chooseFile')"
        data-testid="room-background-preview"
        @click="fileInput?.click()"
      >
        <img
          v-if="savedPreviewUrl"
          :src="savedPreviewUrl"
          :alt="$t('roomBackground.preview')"
          style="width: 100%; height: 100%; object-fit: cover;"
        >
        <AppIcon
          v-else
          class="mui-svg-icon text-muted"
          icon="ic:baseline-wallpaper"
          style="font-size: 3rem;"
        />
      </button>
      <div
        v-if="pendingObjectUrl"
        class="mt-3 flex items-center gap-3"
      >
        <label
          for="room-background-zoom"
          class="text-mui-caption text-muted"
        >{{ $t('roomBackground.zoom') }}</label>
        <input
          id="room-background-zoom"
          type="range"
          min="1"
          :max="BACKGROUND_MAX_ZOOM"
          step="0.01"
          class="flex-1"
          :value="framing.zoom"
          data-testid="room-background-zoom"
          @input="setZoom(Number(($event.target as HTMLInputElement).value))"
        >
      </div>
      <p class="text-mui-caption mt-2 text-center text-muted">
        {{ pendingObjectUrl ? $t('roomBackground.adjustHint') : $t('roomBackground.hint') }}
      </p>

      <div class="mt-4 flex items-center justify-center gap-2">
        <button
          v-wave
          type="button"
          class="mui-btn mui-btn-secondary"
          :disabled="processing || saving"
          @click="fileInput?.click()"
        >
          {{ $t('roomBackground.chooseFile') }}
        </button>
        <button
          v-if="pendingObjectUrl || savedPreviewUrl"
          v-wave
          type="button"
          class="mui-btn mui-btn-text"
          :disabled="processing || saving"
          data-testid="room-background-remove"
          @click="removeImage"
        >
          {{ $t('roomBackground.remove') }}
        </button>
      </div>

      <p
        v-if="error"
        class="text-mui-caption mt-4 text-center text-danger"
        data-testid="room-background-error"
      >
        {{ error }}
      </p>

      <div class="flex justify-center mt-8">
        <button
          v-wave
          type="button"
          class="mui-btn"
          style="min-width: 120px;"
          :disabled="processing || saving || !hasChanges"
          data-testid="room-background-save"
          @click="save"
        >
          {{ $t('common.save') }}
        </button>
      </div>
    </AppModalPaper>
  </AppModal>
</template>

<style scoped>
.room-background-frame {
  cursor: grab;
  touch-action: none;
}
.room-background-frame:active {
  cursor: grabbing;
}
</style>

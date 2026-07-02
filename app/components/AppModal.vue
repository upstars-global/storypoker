<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  lockDismiss?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)

watch(() => props.open, async (val) => {
  await nextTick()
  if (!dialogEl.value) return
  if (val) {
    if (!dialogEl.value.open) dialogEl.value.showModal()
  } else {
    if (dialogEl.value.open) dialogEl.value.close()
  }
})

function onCancel(e: Event) {
  e.preventDefault()
  if (!props.lockDismiss) emit('close')
}

function onOverlayClick() {
  if (!props.lockDismiss) emit('close')
}
</script>

<template>
  <dialog ref="dialogEl" class="app-modal" @cancel="onCancel">
    <div class="mui-modal-overlay" @click.self="onOverlayClick">
      <slot />
    </div>
  </dialog>
</template>

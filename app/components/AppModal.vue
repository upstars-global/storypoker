<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  lockDismiss?: boolean
  labelledby?: string
  describedby?: string
}>()
const emit = defineEmits<{ close: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)

watch(() => props.open, async (val) => {
  await nextTick()
  if (!dialogEl.value) return
  if (val) {
    if (!dialogEl.value.open) {
      dialogEl.value.showModal()
      dialogEl.value.focus()
    }
  } else {
    if (dialogEl.value.open) dialogEl.value.close()
  }
}, { immediate: true })

function onCancel(e: Event) {
  e.preventDefault()
  if (!props.lockDismiss) emit('close')
}

function onOverlayClick() {
  if (!props.lockDismiss) emit('close')
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="app-modal"
    tabindex="-1"
    :aria-labelledby="labelledby"
    :aria-describedby="describedby"
    @cancel="onCancel"
  >
    <div
      class="mui-modal-overlay"
      @click.self="onOverlayClick"
    >
      <slot />
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps<{
  open: boolean
  lockDismiss?: boolean
  labelledby?: string
  describedby?: string
}>()
const emit = defineEmits<{ close: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)
let opener: HTMLElement | null = null

function restoreFocus() {
  const target = opener
  opener = null
  if (target?.isConnected) target.focus()
}

watch(() => props.open, async (val) => {
  await nextTick()
  if (!dialogEl.value) return
  if (val) {
    if (!dialogEl.value.open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialogEl.value.showModal()
      dialogEl.value.focus()
    }
  } else if (dialogEl.value.open) {
    dialogEl.value.close()
    restoreFocus()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (dialogEl.value?.open) dialogEl.value.close()
  restoreFocus()
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

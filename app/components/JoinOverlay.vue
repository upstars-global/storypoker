<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
const emit = defineEmits<{
  join: [name: string]
  close: []
}>()

const name = ref('')
const hasError = ref(false)

function submit() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  emit('join', name.value.trim())
}
</script>

<template>
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent
          class="mui-modal-paper"
          @pointerdown.stop
          @escape-key-down="(e) => e.preventDefault()"
          @interact-outside="(e) => e.preventDefault()"
        >
          <DialogTitle as="h2" class="mui-h5 text-center">{{ $t('join.title') }}</DialogTitle>
          <DialogDescription as="p" class="mui-caption text-center mt-2 text-muted">
            {{ $t('join.subtitle') }}
          </DialogDescription>
          <div class="flex flex-col gap-4 mt-6">
            <input
              v-model="name"
              type="text"
              :placeholder="$t('join.namePlaceholder')"
              class="mui-input w-full"
              :class="{ 'is-error': hasError }"
              @keyup.enter="submit"
            />
            <div class="flex justify-center">
              <button class="mui-btn" @click="submit">{{ $t('join.joinRoom') }}</button>
            </div>
          </div>
          <DialogClose
            v-wave
            class="mui-icon-btn absolute"
            style="top: 8px; right: 8px;"
            :aria-label="$t('common.close')"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
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
import { PLAYER_ROLES, formatPlayerName, type PlayerRole } from '~/utils/playerRoles'

const emit = defineEmits<{
  join: [name: string]
  close: []
}>()

const name = ref('')
const role = ref<PlayerRole>('DEV')
const hasError = ref(false)

function submit() {
  if (!name.value.trim()) {
    hasError.value = true
    return
  }
  emit('join', formatPlayerName(role.value, name.value))
}
</script>

<template>
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent
          class="mui-modal-paper"
          @escape-key-down="(e) => e.preventDefault()"
          @interact-outside="(e) => e.preventDefault()"
        >
          <DialogTitle as="h2" class="mui-h5 text-center">{{ $t('join.title') }}</DialogTitle>
          <DialogDescription as="p" class="mui-caption text-center mt-2 text-muted">
            {{ $t('join.subtitle') }}
          </DialogDescription>
          <div class="flex flex-col gap-4 mt-6">
            <div class="flex gap-3">
              <select v-model="role" class="mui-input max-w-[104px]" :aria-label="$t('players.role')">
                <option v-for="r in PLAYER_ROLES" :key="r" :value="r">[{{ r }}]</option>
              </select>
              <input
                v-model="name"
                type="text"
                :placeholder="$t('join.namePlaceholder')"
                class="mui-input min-w-0 flex-1"
                :class="{ 'is-error': hasError }"
                @keyup.enter="submit"
              />
            </div>
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
            <Icon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>

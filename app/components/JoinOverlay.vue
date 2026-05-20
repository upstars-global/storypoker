<script setup lang="ts">
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
  <div class="mui-modal-overlay">
    <div class="mui-modal-paper relative">
      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 8px; right: 8px;"
        aria-label="Close"
        @click="emit('close')"
      >
        <Icon class="mui-svg-icon" name="ic:baseline-close" style="font-size: 1.5rem;" />
      </button>
      <h2 class="mui-h5 text-center">{{ $t('join.title') }}</h2>
      <p class="mui-caption text-center mt-2 text-muted">
        {{ $t('join.subtitle') }}
      </p>
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
    </div>
  </div>
</template>

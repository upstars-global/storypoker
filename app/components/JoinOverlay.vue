<script setup lang="ts">
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
  <div class="mui-modal-overlay">
    <div class="mui-modal-paper relative">
      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 8px; right: 8px;"
        aria-label="Close"
        @click="emit('close')"
      >
        <Icon class="mui-svg-icon" name="app:close" style="font-size: 1.5rem;" />
      </button>
      <h2 class="mui-h5 text-center">{{ $t('join.title') }}</h2>
      <p class="mui-caption text-center mt-2" style="color: var(--text-muted);">
        {{ $t('join.subtitle') }}
      </p>
      <div class="flex flex-col gap-4 mt-6">
        <input
          v-model="name"
          type="text"
          :placeholder="$t('join.namePlaceholder')"
          class="mui-input"
          :class="{ 'is-error': hasError }"
          @keyup.enter="submit"
        />
        <div class="flex justify-center">
          <button class="mui-btn" @click="submit">{{ $t('join.joinRoom') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  join: [name: string]
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
    <div class="mui-modal-paper">
      <h2 class="mui-h5 text-center">Join the room</h2>
      <p class="mui-caption text-center mt-2" style="color: var(--text-muted);">
        Enter your name to join your team
      </p>
      <div class="flex flex-col gap-4 mt-6">
        <input
          v-model="name"
          type="text"
          placeholder="Please enter your name"
          class="mui-input"
          :class="{ 'is-error': hasError }"
          @keyup.enter="submit"
        />
        <div class="flex justify-center">
          <button class="mui-btn" @click="submit">Join Room</button>
        </div>
      </div>
    </div>
  </div>
</template>

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
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-sm flex flex-col gap-4">
      <h2 class="text-lg font-semibold text-center">Join the room</h2>
      <input
        v-model="name"
        type="text"
        placeholder="Please enter your name"
        class="bg-transparent border rounded px-4 py-3 text-sm outline-none transition-colors text-white"
        :class="hasError ? 'border-red-500' : 'border-gray-600 focus:border-gray-400'"
        @keyup.enter="submit"
      />
      <button
        class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors"
        @click="submit"
      >
        Join Room
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const ALL_CARDS = ['0.5', '1', '2', '3', '5', '8', '13', '21', '?', 'Pass', '☕']

const props = defineProps<{
  activeCards: string[]
}>()

const emit = defineEmits<{
  save: [cards: string[]]
  close: []
}>()

const selected = ref<string[]>([...props.activeCards])

function toggle(card: string) {
  if (selected.value.includes(card)) {
    selected.value = selected.value.filter(c => c !== card)
  } else {
    selected.value = [...selected.value, card].sort(
      (a, b) => ALL_CARDS.indexOf(a) - ALL_CARDS.indexOf(b)
    )
  }
}
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-[#2a2a2a] rounded-xl p-6 w-full max-w-md relative">
      <button class="absolute top-4 right-4 text-gray-400 hover:text-white" @click="emit('close')">
        <Icon name="mdi:close" class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold mb-4">Configure Card Deck</h2>
      <select class="w-full bg-[#3a3a3a] border border-gray-600 rounded px-3 py-2 mb-4 text-sm text-white">
        <option>Fibonacci scale</option>
      </select>
      <div class="grid grid-cols-3 gap-2 mb-6">
        <label
          v-for="card in ALL_CARDS"
          :key="card"
          class="flex items-center gap-2 text-sm cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="selected.includes(card)"
            class="accent-[#4a6572]"
            @change="toggle(card)"
          />
          {{ card }}
        </label>
      </div>
      <button
        class="w-full bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 rounded-full uppercase tracking-widest transition-colors"
        @click="emit('save', selected)"
      >
        Save Card Deck
      </button>
    </div>
  </div>
</template>

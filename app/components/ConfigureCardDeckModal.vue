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
  <div class="mui-modal-overlay" @click.self="emit('close')">
    <div class="mui-modal-paper" style="max-width: 32rem;">
      <button
        class="mui-icon-btn absolute"
        style="top: 8px; right: 8px;"
        aria-label="Close"
        @click="emit('close')"
      >
        <IconClose style="font-size: 1.25rem;" />
      </button>
      <h2 class="mui-h5">Configure Card Deck</h2>
      <p class="mui-caption mt-2" style="color: var(--text-muted);">
        Pick the cards available for this room.
      </p>
      <div class="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-6 mb-2">
        <label
          v-for="card in ALL_CARDS"
          :key="card"
          class="flex items-center gap-2 px-2 py-2 rounded cursor-pointer"
          style="border: 1px solid var(--border);"
        >
          <input
            type="checkbox"
            :checked="selected.includes(card)"
            class="accent-current"
            style="accent-color: var(--primary); width: 18px; height: 18px;"
            @change="toggle(card)"
          />
          <span style="color: var(--text-primary);">{{ card }}</span>
        </label>
      </div>
      <div class="flex justify-center mt-6">
        <button class="mui-btn" @click="emit('save', selected)">Save Card Deck</button>
      </div>
    </div>
  </div>
</template>

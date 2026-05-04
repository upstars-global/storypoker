<script setup lang="ts">
const ALL_CARDS = ['0', '1/2', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕']
const PRESETS: Record<string, string[]> = {
  'Scrum scale': ['1/2', '1', '2', '3', '5', '8', '13', '20', '?', '☕'],
  'Fibonacci': ['1', '2', '3', '5', '8', '13', '20', '40', '100', '?'],
  'T-shirt': ['1', '2', '5', '13', '20', '?'],
}

const props = defineProps<{
  activeCards: string[]
}>()

const emit = defineEmits<{
  save: [cards: string[]]
  close: []
}>()

const selected = ref<string[]>([...props.activeCards])
const preset = ref<string>('Scrum scale')

function toggle(card: string) {
  if (selected.value.includes(card)) {
    selected.value = selected.value.filter(c => c !== card)
  } else {
    selected.value = [...selected.value, card].sort(
      (a, b) => ALL_CARDS.indexOf(a) - ALL_CARDS.indexOf(b)
    )
  }
}

function applyPreset(name: string) {
  preset.value = name
  if (PRESETS[name]) selected.value = [...PRESETS[name]]
}
</script>

<template>
  <div class="mui-modal-overlay" @click.self="emit('close')">
    <div class="mui-modal-paper relative" style="max-width: 560px; padding: 32px 40px 40px;">
      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 12px; right: 12px;"
        aria-label="Close"
        @click="emit('close')"
      >
        <IconClose style="font-size: 1.25rem;" />
      </button>
      <h2 class="text-center text-[22px] font-bold tracking-[0.00735em]" style="color: var(--text-primary);">
        Configure Card Deck
      </h2>

      <div class="mt-7 flex justify-center">
        <select
          v-model="preset"
          class="rounded border bg-transparent px-3 py-2 text-[15px] focus:outline-none focus:ring-1 focus:ring-[#546e7a]"
          style="border-color: var(--border); color: var(--text-primary); min-width: 240px;"
          @change="applyPreset(preset)"
        >
          <option v-for="name in Object.keys(PRESETS)" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>

      <div class="grid grid-cols-3 gap-x-8 gap-y-3 mt-8 mb-2 mx-auto" style="max-width: 380px;">
        <label
          v-for="card in ALL_CARDS"
          :key="card"
          class="flex items-center gap-3 cursor-pointer text-[15px]"
          style="color: var(--text-primary);"
        >
          <input
            type="checkbox"
            :checked="selected.includes(card)"
            style="accent-color: var(--primary); width: 18px; height: 18px;"
            @change="toggle(card)"
          />
          <span>{{ card }}</span>
        </label>
      </div>

      <div class="flex justify-center mt-8">
        <button v-wave class="mui-btn" @click="emit('save', selected)">Save Card Deck</button>
      </div>
    </div>
  </div>
</template>

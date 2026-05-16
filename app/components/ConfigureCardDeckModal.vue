<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DECK_PRESETS, getDeck, type DeckPresetId } from '~/utils/cardDecks'

const props = defineProps<{
  deckPreset: DeckPresetId
  activeCards: string[]
}>()

const emit = defineEmits<{
  save: [payload: { deckPreset: DeckPresetId; cards: string[] }]
  close: []
}>()

const presetId = ref<DeckPresetId>(props.deckPreset)
const selected = ref<string[]>([...props.activeCards])

const currentDeck = computed(() => getDeck(presetId.value))

watch(() => props.deckPreset, (next) => { presetId.value = next })
watch(() => props.activeCards, (next) => { selected.value = [...next] })

function toggle(card: string) {
  if (selected.value.includes(card)) {
    selected.value = selected.value.filter(c => c !== card)
  } else {
    const order = currentDeck.value.cards
    selected.value = [...selected.value, card].sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    )
  }
}

function applyPreset(id: DeckPresetId) {
  presetId.value = id
  selected.value = [...getDeck(id).defaultActive]
}

function save() {
  emit('save', { deckPreset: presetId.value, cards: selected.value })
}
</script>

<template>
  <div class="mui-modal-overlay" @click.self="emit('close')">
    <div class="mui-modal-paper relative" style="max-width: 560px; padding: 32px 40px 40px;">
      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 12px; right: 12px;"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <Icon class="mui-svg-icon" name="ic:baseline-close" style="font-size: 1.5rem;" />
      </button>
      <h2 class="text-center text-mui-h2 font-bold text-primary">
        {{ $t('deck.configure') }}
      </h2>

      <div class="mt-7 flex justify-center">
        <select
          :value="presetId"
          class="rounded border bg-transparent px-3 py-2 text-mui-body text-primary focus:outline-none focus:ring-1 focus:ring-[#546e7a]"
          style="min-width: 240px;"
          @change="applyPreset(($event.target as HTMLSelectElement).value as DeckPresetId)"
        >
          <option v-for="p in DECK_PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <div class="grid grid-cols-3 gap-x-8 gap-y-3 mt-8 mb-2 mx-auto" style="max-width: 380px;">
        <label
          v-for="card in currentDeck.cards"
          :key="card"
          class="flex items-center gap-3 cursor-pointer text-mui-body text-primary"
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
        <button v-wave class="mui-btn" @click="save">{{ $t('deck.save') }}</button>
      </div>
    </div>
  </div>
</template>

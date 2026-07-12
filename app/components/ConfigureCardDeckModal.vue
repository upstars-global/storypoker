<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import AppIcon from '~/components/AppIcon.vue'
import { DECK_PRESETS, getDeck, VOTING_BASE_CARDS, VOTING_THIRD_CARDS, type DeckPresetId } from '~/utils/cardDecks'
import { useCardLabel } from '~/composables/useCardLabel'

const cardLabel = useCardLabel()

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
const isVoting = computed(() => presetId.value === 'voting')
const isVoteQuestion = computed(() => presetId.value === 'vote_question')
const votingThird = computed(() =>
  selected.value.find(c => VOTING_THIRD_CARDS.includes(c)) ?? VOTING_THIRD_CARDS[0]!
)

watch(() => props.deckPreset, (next) => { presetId.value = next })
watch(() => props.activeCards, (next) => { selected.value = [...next] })

function setVotingThird(card: string) {
  selected.value = [...VOTING_BASE_CARDS, card]
}

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
  <AppModal
    labelledby="card-deck-modal-title"
    :open="true"
    @close="emit('close')"
  >
    <AppModalPaper
      style="max-width: 560px; padding: 32px 40px 40px;"
      @close="emit('close')"
    >
      <h2
        id="card-deck-modal-title"
        class="text-center text-mui-h2 font-bold text-primary"
      >
        {{ $t('deck.configure') }}
      </h2>

      <div class="mt-7 flex justify-center">
        <select
          class="mui-input"
          style="min-width: 240px; cursor: pointer;"
          :value="presetId"
          @change="(e) => applyPreset((e.target as HTMLSelectElement).value as DeckPresetId)"
        >
          <option
            v-for="p in DECK_PRESETS"
            :key="p.id"
            :value="p.id"
          >
            {{ p.name }}
          </option>
        </select>
      </div>

      <div
        v-if="isVoting"
        class="flex flex-col items-center gap-6 mt-8 mb-2"
      >
        <div class="flex flex-col items-center gap-2">
          <span class="text-mui-caption font-semibold uppercase tracking-wide text-muted">
            {{ $t('deck.alwaysIncluded') }}
          </span>
          <div class="flex flex-wrap justify-center gap-2">
            <span
              v-for="card in VOTING_BASE_CARDS"
              :key="card"
              class="mui-chip is-selected is-disabled"
            >
              <AppIcon
                class="mui-chip-check"
                icon="ic:baseline-check"
              />
              {{ cardLabel(card) }}
            </span>
          </div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <span class="text-mui-caption font-semibold uppercase tracking-wide text-primary">
            {{ $t('poll.thirdCard') }}
          </span>
          <div class="flex items-center gap-2">
            <button
              v-for="card in VOTING_THIRD_CARDS"
              :key="card"
              type="button"
              class="mui-chip"
              :class="{ 'is-selected': votingThird === card }"
              :aria-pressed="votingThird === card"
              @click="setVotingThird(card)"
            >
              <AppIcon
                v-if="votingThird === card"
                class="mui-chip-check"
                icon="ic:baseline-check"
              />
              {{ card }}
            </button>
          </div>
        </div>
      </div>
      <div
        v-else-if="isVoteQuestion"
        class="flex justify-center mt-8 mb-2"
      >
        <p class="text-mui-body text-muted text-center">
          {{ $t('deck.voteQuestionInfo') }}
        </p>
      </div>
      <div
        v-else
        class="flex flex-wrap justify-center gap-2 mt-8 mb-2 mx-auto"
        style="max-width: 420px;"
      >
        <label
          v-for="card in currentDeck.cards"
          :key="card"
          class="mui-chip"
          :class="{ 'is-selected': selected.includes(card) }"
        >
          <input
            :id="`deck-card-${card}`"
            type="checkbox"
            :name="`deck-card-${card}`"
            :checked="selected.includes(card)"
            class="sr-only"
            @change="toggle(card)"
          >
          <AppIcon
            v-if="selected.includes(card)"
            class="mui-chip-check"
            icon="ic:baseline-check"
          />
          {{ card }}
        </label>
      </div>

      <div class="flex justify-center mt-8">
        <button
          v-wave
          class="mui-btn"
          @click="save"
        >
          {{ $t('deck.save') }}
        </button>
      </div>
    </AppModalPaper>
  </AppModal>
</template>

<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'
import { ref, computed, watch } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'reka-ui'
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
  <DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
    <DialogPortal>
      <DialogOverlay class="mui-modal-overlay">
        <DialogContent class="mui-modal-paper" style="max-width: 560px; padding: 32px 40px 40px;" @pointerdown.stop>
          <DialogTitle as="h2" class="text-center text-mui-h2 font-bold text-white">
            {{ $t('deck.configure') }}
          </DialogTitle>

          <div class="mt-7 flex justify-center">
            <SelectRoot
              :model-value="presetId"
              @update:model-value="(v) => applyPreset(v as DeckPresetId)"
            >
              <SelectTrigger
                class="flex items-center justify-between gap-2 rounded border bg-transparent px-3 py-2 text-mui-body text-white focus:outline-none focus:ring-1 focus:ring-[#546e7a]"
                style="min-width: 240px;"
                :aria-label="$t('deck.configure')"
              >
                <SelectValue />
                <AppIcon icon="ic:baseline-arrow-drop-down" style="font-size: 1.25rem;" />
              </SelectTrigger>
              <SelectPortal>
                <SelectContent
                  class="mui-menu"
                  position="popper"
                  :side-offset="4"
                  style="z-index: 1500; min-width: var(--reka-select-trigger-width);"
                >
                  <SelectViewport>
                    <SelectItem
                      v-for="p in DECK_PRESETS"
                      :key="p.id"
                      :value="p.id"
                      class="mui-menu-item cursor-pointer"
                    >
                      <SelectItemText>{{ p.name }}</SelectItemText>
                    </SelectItem>
                  </SelectViewport>
                </SelectContent>
              </SelectPortal>
            </SelectRoot>
          </div>

          <div
            v-if="isVoting"
            class="flex flex-col items-center gap-6 mt-8 mb-2"
          >
            <div class="flex flex-col items-start gap-3">
              <label
                v-for="card in VOTING_BASE_CARDS"
                :key="card"
                class="flex items-center gap-3 text-mui-body text-white opacity-70 cursor-not-allowed"
              >
                <input
                  type="checkbox"
                  checked
                  disabled
                  style="accent-color: var(--primary); width: 18px; height: 18px;"
                />
                <span>{{ cardLabel(card) }}</span>
              </label>
            </div>
            <div class="flex flex-col items-center gap-2">
              <span class="text-mui-caption font-semibold uppercase tracking-wide text-white">
                {{ $t('poll.thirdCard') }}
              </span>
              <div class="flex items-center gap-3">
                <button
                  v-for="card in VOTING_THIRD_CARDS"
                  :key="card"
                  type="button"
                  class="mui-shield"
                  style="padding: 6px 16px; font-size: 1.25rem;"
                  :class="{ 'is-selected': votingThird === card }"
                  :aria-pressed="votingThird === card"
                  @click="setVotingThird(card)"
                >{{ card }}</button>
              </div>
            </div>
          </div>
          <div
            v-else-if="isVoteQuestion"
            class="flex justify-center mt-8 mb-2"
          >
            <p class="text-mui-body text-muted text-center">{{ $t('deck.voteQuestionInfo') }}</p>
          </div>
          <div v-else class="grid grid-cols-3 gap-x-8 gap-y-3 mt-8 mb-2 mx-auto" style="max-width: 380px;">
            <label
              v-for="card in currentDeck.cards"
              :key="card"
              class="flex items-center gap-3 cursor-pointer text-mui-body text-white"
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
          <DialogClose
            v-wave
            class="mui-icon-btn absolute"
            style="top: 12px; right: 12px;"
            :aria-label="$t('common.close')"
          >
            <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
          </DialogClose>
        </DialogContent>
      </DialogOverlay>
    </DialogPortal>
  </DialogRoot>
</template>

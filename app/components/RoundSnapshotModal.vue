<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppModal from '~/components/AppModal.vue'
import AppModalPaper from '~/components/AppModalPaper.vue'
import RoleBadge from '~/components/RoleBadge.vue'
import { useCardLabel } from '~/composables/useCardLabel'
import { DECK_PRESETS } from '~/utils/cardDecks'
import { roleTagForShields, isQaPlayer, DEV_COHORT_LABEL } from '~/utils/shields'
import type { RoundHistory } from '~/stores/types'

const props = defineProps<{ round: RoundHistory; shieldsMap?: Map<string, string[]>; cohort?: 'DEV' | 'QA' | null }>()
const emit = defineEmits<{ close: [] }>()

const cardLabel = useCardLabel()
const { locale } = useI18n()

const dateFmt = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }))

const deckName = computed(() => {
  if (!props.round.deck_preset) return null
  return DECK_PRESETS.find(p => p.id === props.round.deck_preset)?.name ?? props.round.deck_preset
})

const cohortLabel = computed(() => {
  if (!props.cohort) return null
  return props.cohort === 'QA' ? 'QA' : DEV_COHORT_LABEL
})

const sortedVotes = computed(() => [...props.round.votes]
  .filter(v => {
    if (!props.cohort) return true
    const isQa = isQaPlayer(props.shieldsMap?.get(v.player_id))
    return props.cohort === 'QA' ? isQa : !isQa
  })
  .map(v => ({ ...v, roleTag: roleTagForShields(props.shieldsMap?.get(v.player_id)) }))
  .sort((a, b) => a.name.localeCompare(b.name)))
</script>

<template>
  <AppModal
    labelledby="round-snapshot-modal-title"
    :open="true"
    @close="emit('close')"
  >
    <AppModalPaper
      style="max-width: 420px; width: 92vw; max-height: 80vh; overflow-y: auto; padding: 24px 28px 28px;"
      @close="emit('close')"
    >
      <h3
        id="round-snapshot-modal-title"
        class="flex items-center gap-2 text-mui-h2 font-bold text-primary"
      >
        {{ $t('trends.roundSnapshotTitle') }}
        <span
          v-if="cohortLabel"
          class="rounded px-2 py-0.5 text-mui-caption font-semibold text-white"
          :style="{ backgroundColor: cohort === 'QA' ? '#ffa726' : '#26a69a' }"
        >{{ cohortLabel }}</span>
      </h3>
      <p class="mt-1 text-mui-caption text-muted">
        {{ dateFmt.format(new Date(round.revealed_at)) }}
        <span v-if="deckName"> · {{ deckName }}</span>
      </p>
      <div class="mt-4 flex flex-col gap-1.5">
        <div
          v-for="v in sortedVotes"
          :key="v.player_id"
          class="flex items-center justify-between rounded bg-elevated px-3 py-1.5 text-mui-body"
        >
          <span class="flex items-center gap-1.5">
            <span class="text-body">{{ v.name }}</span>
            <RoleBadge
              v-if="v.roleTag"
              :tag="v.roleTag"
            />
          </span>
          <span class="font-semibold text-primary">{{ cardLabel(v.vote) }}</span>
        </div>
        <p
          v-if="!sortedVotes.length"
          class="text-mui-body text-muted"
        >
          {{ $t('trends.noVotesInCohort') }}
        </p>
      </div>
    </AppModalPaper>
  </AppModal>
</template>

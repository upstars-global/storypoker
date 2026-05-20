<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  votes: Record<string, number>
  groupedVotes?: { dev: Record<string, number>; qa: Record<string, number>; sm: Record<string, number> } | null
  isModerator: boolean
}>()

const emit = defineEmits<{
  startNewRound: []
}>()

const groups = computed(() => {
  if (!props.groupedVotes) return null
  const devTotal = Object.values(props.groupedVotes.dev).reduce((a, b) => a + b, 0)
  const qaTotal = Object.values(props.groupedVotes.qa).reduce((a, b) => a + b, 0)
  const smTotal = Object.values(props.groupedVotes.sm).reduce((a, b) => a + b, 0)
  const out: { label: 'DEV' | 'QA' | 'SM'; votes: Record<string, number> }[] = []
  if (devTotal) out.push({ label: 'DEV', votes: props.groupedVotes.dev })
  if (qaTotal) out.push({ label: 'QA', votes: props.groupedVotes.qa })
  if (smTotal) out.push({ label: 'SM', votes: props.groupedVotes.sm })
  return out.length ? out : null
})
</script>

<template>
  <div data-testid="results-area" class="flex flex-col items-center gap-8 w-full">
    <div v-if="groups" class="w-full flex flex-wrap justify-center gap-8">
      <div
        v-for="g in groups"
        :key="g.label"
        class="flex flex-col items-center gap-2"
        style="flex: 1 1 280px; max-width: 500px;"
      >
        <span class="mui-h6 text-primary">{{ g.label }}</span>
        <PieChart :votes="g.votes" />
      </div>
    </div>
    <PieChart v-else :votes="votes" />
    <button
      v-if="isModerator"
      class="mui-btn"
      data-testid="new-round-button"
      @click="emit('startNewRound')"
    >
      {{ $t('cards.startNewRound') }}
    </button>
  </div>
</template>

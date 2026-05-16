<script setup lang="ts">
defineProps<{
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
  hasVotes: boolean
}>()

const emit = defineEmits<{
  vote: [card: string]
  reveal: []
}>()
</script>

<template>
  <div class="flex flex-col items-center w-full rounded">
    <div class="flex flex-wrap justify-center gap-4 max-w-[1240px] mx-auto">
      <div
        v-for="card in activeCards"
        :key="card"
        class="relative w-[151.66px] aspect-[2/3] flex-none"
      >
        <button
          v-wave
          type="button"
          class="mui-card"
          :class="{ 'is-selected': selectedVote === card }"
          data-testid="vote-card"
          :data-value="card"
          :aria-pressed="String(selectedVote === card)"
          @click="emit('vote', card)"
        >
          <span class="mui-card-value">{{ card }}</span>
        </button>
      </div>
    </div>

    <div v-if="isModerator" class="flex justify-center pt-8">
      <button v-wave class="mui-btn" :disabled="!hasVotes" data-testid="reveal-button" @click="emit('reveal')">{{ $t('cards.reveal') }}</button>
    </div>
  </div>
</template>

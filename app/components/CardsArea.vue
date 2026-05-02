<script setup lang="ts">
defineProps<{
  activeCards: string[]
  selectedVote: string | null
  isModerator: boolean
}>()

const emit = defineEmits<{
  vote: [card: string]
  reveal: []
}>()
</script>

<template>
  <div class="flex flex-col items-center w-full">
    <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
      <div
        v-for="card in activeCards"
        :key="card"
        class="relative w-full"
        style="padding-top: 150%;"
      >
        <button
          v-wave
          type="button"
          class="mui-card"
          :class="{ 'is-selected': selectedVote === card }"
          :style="selectedVote === card ? '' : 'box-shadow: var(--shadow-2);'"
          @click="emit('vote', card)"
        >
          <span class="mui-card-value">{{ card }}</span>
        </button>
      </div>
    </div>

    <div v-if="isModerator" class="flex justify-center pt-8">
      <button class="mui-btn" @click="emit('reveal')">Reveal Estimates</button>
    </div>
  </div>
</template>

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
  <div class="flex flex-col items-center w-full rounded">
    <div class="flex flex-wrap justify-center gap-4 max-w-[1240px] mx-auto">
      <div
        v-for="card in activeCards"
        :key="card"
        class="relative w-[140px] h-[190px] flex-none"
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
      <button v-wave class="mui-btn" @click="emit('reveal')">Reveal Estimates</button>
    </div>
  </div>
</template>

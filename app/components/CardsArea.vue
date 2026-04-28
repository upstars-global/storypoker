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
  <div class="flex flex-col items-center gap-6 w-full">
    <div class="grid grid-cols-6 gap-3 w-full">
      <button
        v-for="card in activeCards"
        :key="card"
        class="aspect-[2/3] rounded-lg text-xl font-semibold transition-colors flex items-center justify-center"
        :class="selectedVote === card
          ? 'bg-[#4a6572] text-white'
          : 'bg-[#3a3a3a] hover:bg-[#444] text-white'"
        @click="emit('vote', card)"
      >
        {{ card }}
      </button>
    </div>
    <button
      v-if="isModerator"
      class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 px-8 rounded-full uppercase tracking-widest transition-colors"
      @click="emit('reveal')"
    >
      Reveal Estimates
    </button>
  </div>
</template>

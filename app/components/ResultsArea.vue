<script setup lang="ts">
defineProps<{
  votes: Record<string, number>
  isModerator: boolean
}>()

const emit = defineEmits<{
  startNewRound: []
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-6">
    <PieChart :votes="votes" />
    <button
      v-if="isModerator"
      class="bg-[#4a6572] hover:bg-[#5a7582] text-white font-semibold py-3 px-8 rounded-full uppercase tracking-widest transition-colors"
      @click="emit('startNewRound')"
    >
      Start New Estimation Round
    </button>
  </div>
</template>

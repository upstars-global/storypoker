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
  <div class="flex flex-col items-center gap-8 w-full">
    <PieChart :votes="votes" class="w-full" />
    <button
      v-if="isModerator"
      class="mui-btn"
      @click="emit('startNewRound')"
    >
      Start New Estimation Round
    </button>
  </div>
</template>

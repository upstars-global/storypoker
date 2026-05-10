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
    <PieChart :votes="votes" />
    <button
      v-if="isModerator"
      class="mui-btn"
      @click="emit('startNewRound')"
    >
      {{ $t('cards.startNewRound') }}
    </button>
  </div>
</template>

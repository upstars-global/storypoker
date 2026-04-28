<script setup lang="ts">
const props = defineProps<{
  roundStartedAt: string
}>()

const text = ref('')

function update() {
  text.value = `This round started ${relativeTime(props.roundStartedAt)}`
}

let interval: ReturnType<typeof setInterval>
onMounted(() => { update(); interval = setInterval(update, 30_000) })
onUnmounted(() => clearInterval(interval))
watch(() => props.roundStartedAt, update)
</script>

<template>
  <div class="bg-[#2a2a2a] rounded-lg p-3 mt-3">
    <h2 class="text-sm font-semibold text-gray-400 mb-1 uppercase tracking-wider">Moderator Insights</h2>
    <p class="text-sm text-gray-300">{{ text }}</p>
  </div>
</template>

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
  <div class="mui-paper" style="box-shadow: var(--shadow-2);">
    <div class="mui-paper-header" style="justify-content: center;">
      <span>Moderator Insights</span>
    </div>
    <p class="mui-body px-4 py-3" style="color: var(--text-body);">{{ text }}</p>
  </div>
</template>

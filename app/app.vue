<script setup lang="ts">
const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen" style="background-color: var(--bg-app); color: var(--text-body);">
    <NuxtPage />
  </div>
</template>

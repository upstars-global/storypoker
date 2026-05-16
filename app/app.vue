<script setup lang="ts">
const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen bg-app text-body">
    <ConnectionBanner />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ConnectionBanner from '~/components/ConnectionBanner.vue'
import { useTheme } from '~/composables/useTheme'

const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen bg-app text-body">
    <ConnectionBanner />
    <RouterView />
  </div>
</template>

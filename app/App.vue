<script setup lang="ts">
import { onMounted } from 'vue'
import { TooltipProvider } from 'reka-ui'
import ConnectionBanner from '~/components/ConnectionBanner.vue'
import { useTheme } from '~/composables/useTheme'

const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <div class="min-h-screen bg-app text-body">
      <ConnectionBanner />
      <RouterView />
    </div>
  </TooltipProvider>
</template>

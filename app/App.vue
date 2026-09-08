<script setup lang="ts">
import { onMounted } from 'vue'
import ConnectionBanner from '~/components/ConnectionBanner.vue'
import { useSoundVolume } from '~/composables/useSoundVolume'
import { useTheme } from '~/composables/useTheme'

const { init } = useTheme()
useSoundVolume().initVolume()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen bg-app text-body">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] mui-btn mui-btn-md"
    >
      {{ $t('common.skipToContent') }}
    </a>
    <ConnectionBanner />
    <RouterView />
  </div>
</template>

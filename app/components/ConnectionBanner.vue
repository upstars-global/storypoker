<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePresenceStore } from '~/stores/presence'

const presence = usePresenceStore()
const { status } = storeToRefs(presence)
</script>

<template>
  <Transition name="banner-fade">
    <div
      v-if="status === 'reconnecting'"
      class="fixed inset-x-0 top-0 z-[9999] flex h-8 items-center justify-center gap-2 bg-amber-500 text-sm font-medium text-black"
      role="status"
      aria-live="polite"
    >
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      <span>{{ $t('connection.reconnecting') }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 0.15s;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
}
</style>

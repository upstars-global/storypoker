<script setup lang="ts">
import { useAppUpdate } from '~/composables/useAppUpdate'

const { promptVisible, applyUpdateNow } = useAppUpdate()
</script>

<template>
  <Transition name="banner-fade">
    <div
      v-if="promptVisible"
      class="fixed bottom-4 left-1/2 z-[9999] flex -translate-x-1/2 items-center gap-3 rounded bg-paper py-2 pr-2 pl-4 text-sm text-body shadow-4"
      role="status"
      aria-live="polite"
      data-testid="update-banner"
    >
      <span>{{ $t('appUpdate.available') }}</span>
      <button
        type="button"
        class="mui-btn mui-btn-sm"
        @click="applyUpdateNow"
      >
        {{ $t('appUpdate.reload') }}
      </button>
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

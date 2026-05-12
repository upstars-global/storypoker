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
      class="connection-banner"
      role="status"
      aria-live="polite"
    >
      <span class="banner-spinner" aria-hidden="true" />
      <span>{{ $t('connection.reconnecting') }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.connection-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: #f59e0b;
  color: #000;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
}
.banner-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.banner-fade-enter-active, .banner-fade-leave-active { transition: opacity 0.15s; }
.banner-fade-enter-from, .banner-fade-leave-to { opacity: 0; }
</style>

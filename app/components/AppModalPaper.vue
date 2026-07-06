<script setup lang="ts">
import AppIcon from '~/components/AppIcon.vue'

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div
    class="mui-modal-paper"
    @pointerdown.stop
  >
    <slot />
    <button
      v-wave
      class="mui-icon-btn absolute"
      style="top: 12px; right: 12px;"
      :aria-label="$t('common.close')"
      @click="emit('close')"
    >
      <AppIcon
        class="mui-svg-icon"
        icon="ic:baseline-close"
        style="font-size: 1.5rem;"
      />
    </button>
  </div>
</template>

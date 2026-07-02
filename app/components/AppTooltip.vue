<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
}>(), {
  side: 'top',
  sideOffset: 6,
})

const visible = ref(false)
</script>

<template>
  <div
    style="display: inline-flex; position: relative; align-items: center;"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
    @focusin="visible = true"
    @focusout="visible = false"
  >
    <slot name="trigger" />
    <div
      v-show="visible"
      class="mui-tooltip-content"
      :class="`app-tooltip-${props.side}`"
      :style="`--tt-offset: ${props.sideOffset}px;`"
    >
      <slot name="content" />
    </div>
  </div>
</template>

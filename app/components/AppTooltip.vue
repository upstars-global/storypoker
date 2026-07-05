<script setup lang="ts">
import { ref, onMounted, useId } from 'vue'

const props = withDefaults(defineProps<{
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
}>(), {
  side: 'top',
  sideOffset: 6,
})

const visible = ref(false)
const tooltipId = useId()
const wrapperEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const trigger = wrapperEl.value?.firstElementChild
  if (trigger && trigger.id !== tooltipId) trigger.setAttribute('aria-describedby', tooltipId)
})
</script>

<template>
  <div
    ref="wrapperEl"
    style="display: inline-flex; position: relative; align-items: center;"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
    @focusin="visible = true"
    @focusout="visible = false"
  >
    <slot name="trigger" />
    <div
      v-show="visible"
      :id="tooltipId"
      role="tooltip"
      class="mui-tooltip-content"
      :class="`app-tooltip-${props.side}`"
      :style="`--tt-offset: ${props.sideOffset}px;`"
    >
      <slot name="content" />
    </div>
  </div>
</template>

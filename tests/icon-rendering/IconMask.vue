<script setup lang="ts">
import { computed } from 'vue'
import { mapIconName } from '~/utils/iconMap'
import classes from './iconClasses.json'

const props = defineProps<{ icon: string }>()
const resolved = computed(() => {
  const name = mapIconName(props.icon)
  const className = (classes as Record<string, string>)[name]
  if (!className) throw new Error(`Missing mask icon: ${name}`)
  return className
})
</script>

<template>
  <span
    class="sp-icon"
    :class="resolved"
    aria-hidden="true"
  />
</template>

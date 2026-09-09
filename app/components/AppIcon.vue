<script setup lang="ts">
import { computed } from 'vue'
import { mapIconName } from '~/utils/iconMap'
import classes from '~/generated/iconClasses.json'
import colored from '~/generated/coloredIcons.json'

const props = defineProps<{ icon: string }>()

const resolved = computed(() => mapIconName(props.icon))
const markup = computed(() => (colored as Record<string, string>)[resolved.value] ?? '')
const rootClass = computed(() => {
  if (markup.value) return 'sp-icon-root sp-icon-inline'
  const name = (classes as Record<string, string>)[resolved.value]
  if (!name && (import.meta.env.DEV || import.meta.env.MODE === 'test')) {
    throw new Error(`Missing local icon: ${resolved.value}`)
  }
  return `sp-icon-root sp-icon ${name ?? ''}`
})
</script>

<template>
  <span
    :class="rootClass"
    aria-hidden="true"
    v-html="markup"
  />
</template>

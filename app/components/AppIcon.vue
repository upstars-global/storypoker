<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { mapIconName } from '~/utils/iconMap'
import { assertLocalIcon } from '~/lib/iconPolicy'

const props = defineProps<{ icon: string }>()
const resolved = computed(() => {
  const name = mapIconName(props.icon)
  assertLocalIcon(name)
  return name
})
</script>

<template>
  <Icon :icon="resolved" />
</template>

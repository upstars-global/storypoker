<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { mapIconName } from '~/utils/iconMap'

const props = defineProps<{ icon: string }>()
const resolved = computed(() => mapIconName(props.icon))
</script>

<template>
  <Icon :icon="resolved" />
</template>

<script setup lang="ts">
import AppTooltip from '~/components/AppTooltip.vue'

const props = defineProps<{
  tag: string
  interactive?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <AppTooltip
    side="top"
    :side-offset="6"
  >
    <template #trigger>
      <component
        :is="props.interactive ? 'button' : 'span'"
        v-wave="props.interactive || undefined"
        :type="props.interactive ? 'button' : undefined"
        class="mui-role-tag"
        :class="{ 'is-interactive': props.interactive, 'is-selected': props.selected }"
        :aria-pressed="props.interactive ? props.selected : undefined"
        @click="props.interactive && emit('select')"
      >
        {{ props.tag }}
      </component>
    </template>
    <template #content>
      {{ $t(`players.roleNames.${props.tag}`, props.tag) }}
    </template>
  </AppTooltip>
</template>

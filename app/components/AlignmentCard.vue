<script setup lang="ts">
defineProps<{
  blocks: { label: string; value: number }[]
}>()

function alignmentColor(a: number): string {
  if (a >= 80) return '#43a047'
  if (a >= 40) return '#fbc02d'
  return '#e64a19'
}
</script>

<template>
  <div data-testid="alignment-card" class="mui-paper">
    <div class="mui-paper-header flex items-center justify-center">
      {{ $t('results.alignment') }}
    </div>
    <div class="px-4 py-3 flex flex-col gap-2">
      <div
        v-for="b in blocks"
        :key="b.label"
        class="flex items-center justify-between"
      >
        <span class="text-mui-body text-body">{{ b.label }}</span>
        <span class="flex items-center gap-2">
          <span
            class="inline-block rounded-full"
            :style="{ width: '10px', height: '10px', backgroundColor: alignmentColor(b.value) }"
          />
          <span class="text-mui-body font-semibold text-primary">{{ b.value }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

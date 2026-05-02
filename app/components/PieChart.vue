<script setup lang="ts">
const props = defineProps<{
  votes: Record<string, number>
}>()

const COLORS = ['#546e7a', '#e64a19', '#fbc02d', '#388e3c', '#7b1fa2', '#0288d1', '#00796b', '#f57c00']

const data = computed(() => {
  const entries = Object.entries(props.votes).filter(([, count]) => count > 0)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  if (total === 0) return { segments: [], single: null }

  // Єдиний сегмент — повне коло
  if (entries.length === 1) {
    return {
      segments: [],
      single: { label: entries[0][0], color: COLORS[0] },
    }
  }

  const cx = 50, cy = 50, r = 40
  let angle = -Math.PI / 2
  const segments = entries.map(([label, count], i) => {
    const slice = (count / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += slice
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const largeArc = slice > Math.PI ? 1 : 0
    const midAngle = angle - slice / 2
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: COLORS[i % COLORS.length],
      label,
      lx: cx + r * 0.6 * Math.cos(midAngle),
      ly: cy + r * 0.6 * Math.sin(midAngle),
    }
  })
  return { segments, single: null }
})
</script>

<template>
  <svg viewBox="0 0 100 100" class="w-full max-w-[460px] mx-auto">
    <!-- Єдиний голос — повне коло -->
    <template v-if="data.single">
      <circle cx="50" cy="50" r="40" :fill="data.single.color" />
      <text
        x="50" y="50"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="12"
        fill="white"
        font-weight="400"
      >{{ data.single.label }}</text>
    </template>
    <!-- Кілька сегментів — пай чарт -->
    <template v-else>
      <path
        v-for="seg in data.segments"
        :key="seg.label"
        :d="seg.d"
        :fill="seg.color"
      />
      <text
        v-for="seg in data.segments"
        :key="`label-${seg.label}`"
        :x="seg.lx"
        :y="seg.ly"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="6"
        fill="white"
        font-weight="600"
      >{{ seg.label }}</text>
    </template>
  </svg>
</template>

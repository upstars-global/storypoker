<script setup lang="ts">
const props = defineProps<{
  votes: Record<string, number>
}>()

const COLORS = ['#4a6572', '#e64a19', '#fbc02d', '#388e3c', '#7b1fa2', '#0288d1', '#00796b', '#f57c00']

const segments = computed(() => {
  const entries = Object.entries(props.votes).filter(([, count]) => count > 0)
  const total = entries.reduce((s, [, c]) => s + c, 0)
  if (total === 0) return []

  const cx = 50
  const cy = 50
  const r = 40
  let angle = -Math.PI / 2
  return entries.map(([label, count], i) => {
    const slice = (count / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    angle += slice
    const x2 = cx + r * Math.cos(angle)
    const y2 = cy + r * Math.sin(angle)
    const largeArc = slice > Math.PI ? 1 : 0
    const midAngle = angle - slice / 2
    const lx = cx + (r * 0.6) * Math.cos(midAngle)
    const ly = cy + (r * 0.6) * Math.sin(midAngle)
    return {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: COLORS[i % COLORS.length],
      label,
      lx,
      ly,
    }
  })
})
</script>

<template>
  <svg viewBox="0 0 100 100" class="w-full max-w-xs mx-auto">
    <path
      v-for="seg in segments"
      :key="seg.label"
      :d="seg.d"
      :fill="seg.color"
    />
    <text
      v-for="seg in segments"
      :key="`label-${seg.label}`"
      :x="seg.lx"
      :y="seg.ly"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="6"
      fill="white"
      font-weight="600"
    >{{ seg.label }}</text>
  </svg>
</template>

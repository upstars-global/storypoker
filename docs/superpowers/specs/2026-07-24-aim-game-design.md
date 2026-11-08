# Aim Game - rocket range targeting an oil depot (third side widget)

**Date:** 2026-07-24
**Status:** approved

## Context

The room has a left side widget, switched by an icon button in the block header: `Timer` ↔ `SlotMachine` (`sp-side-widget`, `timer | slot`). A third widget is needed: a shooting-range minigame with a moving crosshair, a rocket launch button, and a target (an oil depot, a generic industrial target unrelated to a real location). A hit sets the target on fire; a miss allows another attempt. There are 3 attempts per round and no broadcast to other players (unlike the slot jackpot).

## Goal

Add `AimGame.vue` as a third side-widget mode, following the `SlotMachine.vue`/`slotMachine.ts` architectural pattern (a pure-logic utility and Vue component, with deterministic unit tests using an injectable `random`).

## Widget state (`app/pages/[slug].vue`)

`sideWidget` expands to `'timer' | 'slot' | 'aim'`; the localStorage key `sp-side-widget` stays the same.

Switching changes from a cyclic toggle (`timer<->slot`) to a direct transition with a payload:

```ts
const SIDE_WIDGET_KEY = 'sp-side-widget'
const VALID_WIDGETS = ['timer', 'slot', 'aim'] as const
type SideWidget = typeof VALID_WIDGETS[number]

const stored = localStorage.getItem(SIDE_WIDGET_KEY)
const sideWidget = ref<SideWidget>(VALID_WIDGETS.includes(stored as SideWidget) ? stored as SideWidget : 'timer')

function switchSideWidget(target: SideWidget) {
  sideWidget.value = target
  try { localStorage.setItem(SIDE_WIDGET_KEY, target) } catch {}
}
```

`Timer.vue` emits `switchWidget` with a `'slot'` or `'aim'` payload (two separate buttons in the header). `SlotMachine.vue` and the new `AimGame.vue` emit `switchWidget` with a `'timer'` payload (one back button, matching the current pattern).

```ts
// Timer.vue, SlotMachine.vue, AimGame.vue
const emit = defineEmits<{ (e: 'switchWidget', target: 'timer' | 'slot' | 'aim'): void }>()
```

Game attempts (aim) use a counter separate from slot spins:

```ts
const AIM_ATTEMPTS_PER_ROUND = 3
const aimAttemptsUsed = ref(0)

watch(() => roomState.value?.round_started_at, () => {
  spinsUsed.value = 0
  aimAttemptsUsed.value = 0
})
```

Markup:

```html
<AimGame
  v-if="roomState && sideWidget === 'aim'"
  :attempts-left="AIM_ATTEMPTS_PER_ROUND - aimAttemptsUsed"
  @fire="aimAttemptsUsed++"
  @switch-widget="switchSideWidget"
/>
```

## Pure logic: `app/utils/aimGame.ts`

No Vue dependencies, matching `slotMachine.ts`:

```ts
export const AIM_ZONE_WIDTH = 0.2
export const AIM_PERIOD_MS = 1400

export function positionAtTime(elapsedMs: number, periodMs: number = AIM_PERIOD_MS): number {
  const t = (elapsedMs % periodMs) / periodMs
  return t < 0.5 ? t * 2 : (1 - t) * 2
}

export function randomZoneStart(random: () => number = Math.random): number {
  return random() * (1 - AIM_ZONE_WIDTH)
}

export function isHit(position: number, zoneStart: number, zoneWidth: number = AIM_ZONE_WIDTH): boolean {
  return position >= zoneStart && position <= zoneStart + zoneWidth
}
```

`positionAtTime` is a 0→1→0 triangle wave (ping-pong), determined by `elapsedMs` (without `Math.random` or the DOM). `randomZoneStart` gives a uniformly distributed zone position such that `zoneStart + AIM_ZONE_WIDTH <= 1`.

## Component: `app/components/AimGame.vue`

The paper structure matches `SlotMachine.vue` (`mui-paper` + `mui-paper-header` with a switch button in the right corner, the `tabler:target` icon, and the `aim.switchToAim`/`aim.switchToTimer` tooltip).

**Visuals:** an inline SVG oil depot (several cylindrical tanks and a connecting pipe) as the card background; below/above it, a horizontal `aim-bar` with a highlighted target zone (a `div` with `left`/`width` in %, using `AIM_ZONE_WIDTH`) and a crosshair icon (`tabler:target`) moving along `left: calc(${position * 100}%)`.

**Crosshair movement:** a `requestAnimationFrame` loop (like the tick loop in `SlotMachine.vue`) updates `elapsed.value = performance.now() - startTime`; `position = computed(() => positionAtTime(elapsed.value))`. The loop is active only in the `idle` state.

**States:**
1. `idle` - the crosshair moves, and the "Пуск" (Launch) button is active (if `attemptsLeft > 0`)
2. `firing` - a click records `hitPosition = position.value`; a short rocket animation plays (translateY down from the crosshair to the tank, ~500ms); crosshair movement pauses
3. `resolved` - `isHit(hitPosition, zoneStart.value)` is calculated:
   1. **hit:** the SVG tank gets a CSS class with fire/smoke keyframes (like `.slot-window.is-jackpot`) for ~2.5s, then goes out; after completion, `zoneStart = randomZoneStart()` and the game returns to `idle`
   2. **miss:** a short miss animation (dust/smoke from the ground, ~600ms), then an immediate return to `idle` with a new `zoneStart = randomZoneStart()`

**Props/emits:**

```ts
const props = defineProps<{ attemptsLeft: number }>()
const emit = defineEmits<{
  (e: 'fire'): void
  (e: 'switchWidget', target: 'timer'): void
}>()
```

`emit('fire')` is called as soon as the launch button is pressed (like `emit('spin')` in `SlotMachine.vue`), regardless of a hit or miss.

**No broadcast:** there are no realtime events, channels, or banners for other players; only the player sees the result.

## i18n

`app/i18n/locales/{uk,en}.json`, namespace `aim`, matching `slot`:

```json
"aim": {
  "title": "Ракетний тир",
  "launch": "Пуск",
  "attemptsLeft": "Залишилось спроб: {n}",
  "noAttemptsLeft": "Спроби скінчились - чекай новий раунд",
  "hit": "Влучив!",
  "miss": "Промах",
  "switchToAim": "Показати тир",
  "switchToTimer": "Показати таймер"
}
```

EN (`en.json`):

```json
"aim": {
  "title": "Rocket Range",
  "launch": "Launch",
  "attemptsLeft": "Attempts left: {n}",
  "noAttemptsLeft": "No attempts left - wait for a new round",
  "hit": "Hit!",
  "miss": "Miss",
  "switchToAim": "Show rocket range",
  "switchToTimer": "Show timer"
}
```

## Tests: `tests/unit/utils/aimGame.spec.ts`

Matching `slotMachine.spec.ts`, with the same `sequence()` helper for `random`:

1. `positionAtTime`: period boundary points - `0` → `0`, quarter period → `0.5`, half period → `1`, three quarters → `0.5`, full period → `0`
2. `isHit`: exactly on the zone boundaries (`zoneStart`, `zoneStart + zoneWidth`) - `true`; just outside - `false`
3. `randomZoneStart`: the result is always in `[0, 1 - AIM_ZONE_WIDTH]` for extreme `random` values (`0` and `0.999999`)

## Out of scope for this iteration

1. The oil depot icon is NOT registered through `registerAppIcons.ts`/the `app:` collection. The SVG lives inline in `AimGame.vue` because the fire animation is tied to specific `<path>`/`<rect>` elements of this SVG and does not make sense as a reusable icon.
2. There is no room-wide win broadcast/celebration (unlike `SlotWinBanner`). This is a deliberate decision; it may be added in a separate iteration.
3. Difficulty (zone width) is fixed (`AIM_ZONE_WIDTH = 0.2`), with no progressive difficulty or random width. This is a deliberate simplification.

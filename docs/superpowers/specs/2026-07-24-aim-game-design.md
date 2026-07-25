# Aim Game — ракетний тир по нафтобазі (третій side-widget)

**Дата:** 2026-07-24
**Статус:** затверджено

## Контекст

Кімната має лівий side-widget, що перемикається кнопкою-іконкою в header блоку: `Timer` ↔ `SlotMachine` (`sp-side-widget`, `timer | slot`). Потрібен третій віджет — міні-гра "тир": рухомий приціл, кнопка запуску ракети, ціль (нафтобаза, generic industrial target — не прив'язана до реального об'єкта). Влучив → ціль горить; не влучив → ще спроба. Обмежено 3 спроби на раунд, без міжгравецького broadcast (на відміну від слот-джекпоту).

## Мета

Додати `AimGame.vue` як третій режим side-widget, за архітектурним патерном `SlotMachine.vue`/`slotMachine.ts` (pure-logic util + Vue-компонент, детерміновані unit-тести з injectable `random`).

## Widget-стан (`app/pages/[slug].vue`)

`sideWidget` розширюється до `'timer' | 'slot' | 'aim'`, localStorage-ключ `sp-side-widget` лишається той самий.

Перемикання перестає бути циклічним toggle (`timer<->slot`) і стає прямим переходом з payload:

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

`Timer.vue` емітить `switchWidget` з payload `'slot'` або `'aim'` (дві окремі кнопки в header). `SlotMachine.vue` і новий `AimGame.vue` емітять `switchWidget` з payload `'timer'` (одна кнопка назад, симетрично з поточним патерном).

```ts
// Timer.vue, SlotMachine.vue, AimGame.vue
const emit = defineEmits<{ (e: 'switchWidget', target: 'timer' | 'slot' | 'aim'): void }>()
```

Спроби гри (aim) — окремий лічильник від спінів слота:

```ts
const AIM_ATTEMPTS_PER_ROUND = 3
const aimAttemptsUsed = ref(0)

watch(() => roomState.value?.round_started_at, () => {
  spinsUsed.value = 0
  aimAttemptsUsed.value = 0
})
```

Розмітка:

```html
<AimGame
  v-if="roomState && sideWidget === 'aim'"
  :attempts-left="AIM_ATTEMPTS_PER_ROUND - aimAttemptsUsed"
  @fire="aimAttemptsUsed++"
  @switch-widget="switchSideWidget"
/>
```

## Pure-логіка: `app/utils/aimGame.ts`

Без Vue-залежностей, дзеркально до `slotMachine.ts`:

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

`positionAtTime` — трикутна хвиля 0→1→0 (ping-pong), детермінована від `elapsedMs` (без `Math.random`, без DOM). `randomZoneStart` дає рівномірну позицію зони так, щоб `zoneStart + AIM_ZONE_WIDTH <= 1`.

## Компонент: `app/components/AimGame.vue`

Структура паперу — як `SlotMachine.vue` (`mui-paper` + `mui-paper-header` з кнопкою-перемикачем у правому куті, іконка `tabler:target`, тултіп `aim.switchToAim`/`aim.switchToTimer`).

**Візуал:** inline SVG нафтобази (кілька циліндричних танків + труба-з'єднувач) як фон картки; під/над нею — горизонтальна `aim-bar` з підсвіченою цільовою зоною (`div` з `left`/`width` у %, з `AIM_ZONE_WIDTH`) і прицілом-іконкою (`tabler:target`), що рухається по `left: calc(${position * 100}%)`.

**Рух прицілу:** `requestAnimationFrame`-цикл (як тик-цикл у `SlotMachine.vue`), що оновлює `elapsed.value = performance.now() - startTime`; `position = computed(() => positionAtTime(elapsed.value))`. Цикл активний лише у стані `idle`.

**Стани:**
- `idle` — приціл рухається, кнопка "Пуск" активна (якщо `attemptsLeft > 0`)
- `firing` — клік фіксує `hitPosition = position.value`; невелика анімація ракети (translateY від прицілу вниз до танка, ~500ms); рух прицілу призупинено
- `resolved` — обчислюється `isHit(hitPosition, zoneStart.value)`:
  - **hit:** SVG танк отримує CSS-клас з keyframes вогню/диму (аналогічно `.slot-window.is-jackpot`) на ~2.5s, потім гасне; після завершення — `zoneStart = randomZoneStart()`, повернення в `idle`
  - **miss:** коротка "промах"-анімація (пилюка/дим від землі, ~600ms), одразу назад у `idle` з новим `zoneStart = randomZoneStart()`

**Props/emits:**

```ts
const props = defineProps<{ attemptsLeft: number }>()
const emit = defineEmits<{
  (e: 'fire'): void
  (e: 'switchWidget', target: 'timer'): void
}>()
```

`emit('fire')` викликається одразу при натисканні кнопки пуску (аналогічно `emit('spin')` у `SlotMachine.vue`), незалежно від результату hit/miss.

**Без broadcast:** ніяких realtime-подій, каналів чи банерів для інших гравців — результат бачить лише той, хто грає.

## i18n

`app/i18n/locales/{uk,en}.json`, namespace `aim`, дзеркально до `slot`:

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

## Тести: `tests/unit/utils/aimGame.spec.ts`

Дзеркально до `slotMachine.spec.ts`, з тим самим `sequence()`-хелпером для `random`:

- `positionAtTime`: межові точки періоду — `0` → `0`, чверть періоду → `0.5`, половина періоду → `1`, три чверті → `0.5`, повний період → `0`
- `isHit`: точно на межах зони (`zoneStart`, `zoneStart + zoneWidth`) — `true`; трохи за межами — `false`
- `randomZoneStart`: результат завжди в `[0, 1 - AIM_ZONE_WIDTH]` для крайніх значень `random` (`0` та `0.999999`)

## Поза межами цієї ітерації

- Іконка нафтобази НЕ реєструється через `registerAppIcons.ts`/`app:` collection — SVG живе inline в `AimGame.vue`, бо анімація вогню прив'язана до конкретних `<path>`/`<rect>` цього SVG і не має сенсу як переюзабельна іконка.
- Немає win-broadcast/celebration на кімнату (на відміну від `SlotWinBanner`) — свідоме рішення, може бути додано окремою ітерацією.
- Складність (ширина зони) фіксована (`AIM_ZONE_WIDTH = 0.2`), без прогресивної складності чи випадкової ширини — свідоме спрощення.

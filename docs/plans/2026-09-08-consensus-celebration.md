# Consensus Celebration Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один предикат консенсусу з порогом ≥ 2 голоси керує і салютом, і звуком; звук «Рішення прийнято» грає на
кожному reveal з консенсусом; користувач керує гучністю всіх звуків через слайдер у шапці.

**Architecture:** `shouldCelebrateGroupedVotes` заміняється на `shouldCelebrate(votes, grouped)` в наявному
`app/utils/resultCelebration.ts` - обидва споживачі (`[slug].vue`, `ResultsArea.vue`) переходять на нього.
Відтворення decision-звуку переїжджає з `finishCountdown` у watcher фази в `[slug].vue`, щоб джерело було одне.
Гучність - новий composable `useSoundVolume` з модуль-рівневим `ref` (патерн `useTheme`), споживачі -
`useCountdown`, `SlotMachine`, слайдер у `AppHeader`.

**Spec:** `docs/specs/2026-09-08-consensus-celebration-design.md`

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, Tailwind v4, vue-i18n 11, Vitest + happy-dom 20, Playwright
(проєкт `page-load`, без Supabase). Нових залежностей немає.

## Global Constraints

- Після кожної задачі: `npm run typecheck && npm run test:unit`; фініш - `npm run test:ci` і
  `npm run test:e2e:pages`
- 2 пробіли, без табів, один trailing newline; без коментарів у коді
- Кожен новий UI-рядок - у `app/i18n/locales/uk.json` **і** `en.json`
- Commit messages, коментарі в коді, назви тестів - англійською; документація в `docs/` - українською
- Коміт на задачу під час виконання; гілка зливається в `main` через squash-merge
- `git add` лише файли з блоку **Files** задачі; ніколи `git add -A`
- Секрети й env-значення не друкувати
- Кореневий `AGENTS.md` - рівно 150 рядків, ліміт 150; будь-який приріст компенсується в тій самій задачі

---

### Task 1: Єдиний предикат консенсусу з порогом ≥ 2

**Files:**
- Modify: `app/utils/resultCelebration.ts:16-37`
- Modify: `app/components/ResultsArea.vue:4,75`
- Modify: `app/pages/[slug].vue:21,200-206`
- Test: `tests/unit/utils/resultCelebration.spec.ts:1-61`

**Interfaces:**
- Consumes: нічого з попередніх задач
- Produces: `shouldCelebrate(votes: Record<string, number>, grouped: { general: Record<string, number>; qa:
  Record<string, number> } | null | undefined): boolean` - використовується Task 2 (звук) через `isConsensus`

- [ ] **Step 1.1: Write the failing tests**

У `tests/unit/utils/resultCelebration.spec.ts` заміни імпорт і всі виклики `shouldCelebrateGroupedVotes` на
`shouldCelebrate`. Наявні grouped-кейси передають `{}` першим аргументом (при grouped-режимі перший аргумент
ігнорується). Повний новий вміст describe-блока `resultCelebration` до тесту `creates particles`:

```ts
import { describe, expect, it } from 'vitest'
import { createCelebrationParticles, shouldCelebrate } from '~/utils/resultCelebration'

describe('resultCelebration', () => {
  it('celebrates when general and qa are both unanimous and match', () => {
    expect(shouldCelebrate({}, { general: { '5': 3 }, qa: { '5': 2 } })).toBe(true)
  })

  it('celebrates when general and qa are unanimous but different', () => {
    expect(shouldCelebrate({}, { general: { '5': 3 }, qa: { '8': 2 } })).toBe(true)
  })

  it('celebrates when only one group is unanimous and the other is mixed', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: { '5': 2 } })).toBe(true)
  })

  it('does not celebrate when both groups have mixed estimates', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: { '5': 1, '8': 1 } })).toBe(false)
  })

  it('celebrates when only general group is unanimous', () => {
    expect(shouldCelebrate({}, { general: { '5': 3 }, qa: {} })).toBe(true)
  })

  it('celebrates when only qa group is unanimous', () => {
    expect(shouldCelebrate({}, { general: {}, qa: { '8': 2 } })).toBe(true)
  })

  it('does not celebrate when only general group is not unanimous', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: {} })).toBe(false)
  })

  it('does not celebrate when a lone qa voter agrees with nobody', () => {
    expect(shouldCelebrate({}, { general: { '5': 2, '8': 1 }, qa: { '8': 1 } })).toBe(false)
  })

  it('does not celebrate when the only unanimous group has a single voter', () => {
    expect(shouldCelebrate({}, { general: {}, qa: { '8': 1 } })).toBe(false)
  })

  it('celebrates without qa split when every vote matches', () => {
    expect(shouldCelebrate({ '5': 3 }, null)).toBe(true)
  })

  it('celebrates without qa split at exactly two matching votes', () => {
    expect(shouldCelebrate({ '5': 2 }, null)).toBe(true)
  })

  it('does not celebrate a single voter without qa split', () => {
    expect(shouldCelebrate({ '5': 1 }, null)).toBe(false)
  })

  it('does not celebrate mixed votes without qa split', () => {
    expect(shouldCelebrate({ '5': 2, '8': 1 }, null)).toBe(false)
  })

  it('does not celebrate when there are no votes at all', () => {
    expect(shouldCelebrate({}, null)).toBe(false)
  })
```

Тест `creates particles with correct confetti properties` лишається без змін, як і закриваючий `})`.

- [ ] **Step 1.2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/utils/resultCelebration.spec.ts`
Expected: FAIL - `shouldCelebrate` не експортується з `~/utils/resultCelebration`.

- [ ] **Step 1.3: Implement the predicate**

У `app/utils/resultCelebration.ts` заміни `getUnanimousVote`, `hasVotes` і `shouldCelebrateGroupedVotes`
(рядки 16-37) на:

```ts
function isUnanimous(votes: VoteCounts): boolean {
  const entries = Object.entries(votes).filter(([, count]) => count > 0)
  return entries.length === 1 && entries[0]![1] >= 2
}

export function shouldCelebrate(votes: VoteCounts, grouped: {
  general: VoteCounts
  qa: VoteCounts
} | null | undefined): boolean {
  if (grouped) return isUnanimous(grouped.general) || isUnanimous(grouped.qa)
  return isUnanimous(votes)
}
```

`type VoteCounts`, `interface CelebrationParticle` і `createCelebrationParticles` не змінюються.

- [ ] **Step 1.4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/utils/resultCelebration.spec.ts`
Expected: PASS (15 тестів).

- [ ] **Step 1.5: Switch ResultsArea to the new predicate**

`app/components/ResultsArea.vue:4` - імпорт:

```ts
import { createCelebrationParticles, shouldCelebrate } from '~/utils/resultCelebration'
```

`app/components/ResultsArea.vue:75`:

```ts
const celebrate = computed(() => !props.disableCelebration && shouldCelebrate(props.votes, props.groupedVotes))
```

- [ ] **Step 1.6: Switch [slug].vue to the new predicate**

`app/pages/[slug].vue:21` - імпорт:

```ts
import { shouldCelebrate } from '~/utils/resultCelebration'
```

`app/pages/[slug].vue:200-206` - заміни весь `isConsensus` на:

```ts
const isConsensus = computed(() => {
  if (isPollDeck.value) return false
  return shouldCelebrate(voteCounts.value, groupedVoteCounts.value)
})
```

`voteCounts` і `groupedVoteCounts` оголошені нижче (`:215`, `:223`), але це `computed` - hoisting через
`const` у setup-скоупі працює, бо звернення відкладене до першого читання `isConsensus`.

- [ ] **Step 1.7: Verify no stale references remain**

Run: `rg 'shouldCelebrateGroupedVotes' app tests`
Expected: без збігів.

- [ ] **Step 1.8: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS обидва.

- [ ] **Step 1.9: Commit**

```bash
git add app/utils/resultCelebration.ts app/components/ResultsArea.vue app/pages/\[slug\].vue \
  tests/unit/utils/resultCelebration.spec.ts
git commit -m "feat: require at least two matching votes for a consensus celebration"
```

---

### Task 2: Звук рішення на кожному reveal

**Files:**
- Modify: `app/composables/useCountdown.ts:70-83,120-127`
- Modify: `app/pages/[slug].vue:208,317-338`

**Interfaces:**
- Consumes: `isConsensus` з Task 1
- Produces: `playDecision(): void` з `useCountdown()` - використовується Task 4 (гучність) лише опосередковано

- [ ] **Step 2.1: Move the decision sound out of finishCountdown**

`app/composables/useCountdown.ts` - у `finishCountdown` заміни блок `if (currentMode === 'wet') { … }`
(рядки 74-81) на:

```ts
        if (currentMode === 'wet' && !shouldPlayDecision?.() && ambienceAudio) {
            ambienceAudio.currentTime = 0
            ambienceAudio.play().catch(() => {})
        }
```

Решта `finishCountdown` (`clearTimeout`, скидання рефів, `onCountdownComplete?.()`, обнулення обох колбеків) -
без змін.

- [ ] **Step 2.2: Export playDecision**

`app/composables/useCountdown.ts` - додай функцію одразу після `finishCountdown`:

```ts
    function playDecision() {
        if (!decisionAudio) return
        decisionAudio.currentTime = 0
        decisionAudio.play().catch(() => {})
    }
```

І додай `playDecision` у return-об'єкт (рядки 120-127), після `startCountdown`:

```ts
    return {
        countdownTimerCounter,
        countdownTimerTotal,
        countdownActive,
        countdownRunning,
        startCountdown,
        stopCountdown,
        playDecision,
    }
```

- [ ] **Step 2.3: Destructure playDecision in [slug].vue**

`app/pages/[slug].vue:208`:

```ts
const { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown, playDecision } = useCountdown()
```

- [ ] **Step 2.4: Trigger the sound on the phase watcher**

`app/pages/[slug].vue:317` - watcher `() => roomState.value?.phase`. У гілці `if (phase === 'revealed') { … }`,
одразу після `showLastRound.value = false` (останній рядок гілки), додай:

```ts
    if (prev === 'voting' && isConsensus.value) playDecision()
```

Гард `prev === 'voting'` обов'язковий: watcher спрацьовує і на `undefined → 'revealed'` при першому
`fetchInitialData`, тож без нього вхід у вже розкриту кімнату грав би звук на завантаженні сторінки.

- [ ] **Step 2.5: Verify no test asserts the old wet-mode behavior**

Run: `rg 'decisionAudio|the-decision-has-been-made|shouldPlayDecision' tests`
Expected: без збігів (тестів на `useCountdown` наразі немає).

- [ ] **Step 2.6: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS обидва.

- [ ] **Step 2.7: Manual verification (no unit seam)**

`HTMLAudioElement.play()` у happy-dom не відтворює звук, тож автоматичного шва тут немає. Сценарій вручну
(`npm run dev`, дві вкладки в одній кімнаті, обидва гравці без QA-shield):

1. Обидва голосують однаково → модератор тисне Reveal без countdown → звук «Рішення прийнято» на обох вкладках.
2. Голоси різні → Reveal → тиша.
3. Countdown «з атмосферою» при консенсусі → в кінці звучить рішення (один раз, не двічі).
4. Countdown «з атмосферою» без консенсусу → `ambience`.
5. Перезавантаж вкладку в уже розкритій кімнаті → тиші (гард `prev === 'voting'`).

- [ ] **Step 2.8: Commit**

```bash
git add app/composables/useCountdown.ts app/pages/\[slug\].vue
git commit -m "feat: play the decision sound on every consensus reveal"
```

---

### Task 3: Composable гучності

**Files:**
- Create: `app/composables/useSoundVolume.ts`
- Test: `tests/unit/composables/useSoundVolume.spec.ts` (новий)

**Interfaces:**
- Consumes: нічого з попередніх задач
- Produces: `useSoundVolume(): { volume: Ref<number>, setVolume: (value: number) => void }` - `volume` у діапазоні
  `0`–`1`; використовується Task 4 (`useCountdown`, `SlotMachine`) і Task 5 (слайдер)

- [ ] **Step 3.1: Write the failing test**

`tests/unit/composables/useSoundVolume.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSoundVolume } from '~/composables/useSoundVolume'

describe('useSoundVolume', () => {
  beforeEach(() => {
    localStorage.clear()
    useSoundVolume().setVolume(1)
    localStorage.clear()
  })

  it('defaults to full volume', () => {
    const { volume } = useSoundVolume()
    expect(volume.value).toBe(1)
  })

  it('persists a new value', () => {
    const { volume, setVolume } = useSoundVolume()
    setVolume(0.4)
    expect(volume.value).toBe(0.4)
    expect(localStorage.getItem('sp-volume')).toBe('0.4')
  })

  it('shares state between callers', () => {
    const first = useSoundVolume()
    const second = useSoundVolume()
    first.setVolume(0.25)
    expect(second.volume.value).toBe(0.25)
  })

  it('clamps values outside the range', () => {
    const { volume, setVolume } = useSoundVolume()
    setVolume(2)
    expect(volume.value).toBe(1)
    setVolume(-1)
    expect(volume.value).toBe(0)
  })

  it('reads a stored value on init', () => {
    localStorage.setItem('sp-volume', '0.6')
    const { volume, initVolume } = useSoundVolume()
    initVolume()
    expect(volume.value).toBe(0.6)
  })

  it('falls back to full volume for a corrupted stored value', () => {
    localStorage.setItem('sp-volume', 'loud')
    const { volume, initVolume } = useSoundVolume()
    initVolume()
    expect(volume.value).toBe(1)
  })
})
```

- [ ] **Step 3.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useSoundVolume.spec.ts`
Expected: FAIL - модуль `~/composables/useSoundVolume` не існує.

- [ ] **Step 3.3: Implement the composable**

`app/composables/useSoundVolume.ts` (модуль-рівневий `ref` для спільного стану - той самий патерн, що
`theme`/`palette` в `app/composables/useTheme.ts`):

```ts
import { ref } from 'vue'

const STORAGE_KEY = 'sp-volume'

const volume = ref(1)

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}

export function useSoundVolume() {
  function initVolume() {
    let stored: string | null = null
    try { stored = localStorage.getItem(STORAGE_KEY) } catch {}
    volume.value = stored === null ? 1 : clamp(Number(stored))
  }

  function setVolume(value: number) {
    volume.value = clamp(value)
    try { localStorage.setItem(STORAGE_KEY, String(volume.value)) } catch {}
  }

  return { volume, initVolume, setVolume }
}
```

- [ ] **Step 3.4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useSoundVolume.spec.ts`
Expected: PASS (6 тестів).

- [ ] **Step 3.5: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS обидва.

- [ ] **Step 3.6: Commit**

```bash
git add app/composables/useSoundVolume.ts tests/unit/composables/useSoundVolume.spec.ts
git commit -m "feat: add a persisted sound volume composable"
```

---

### Task 4: Застосувати гучність до звуків

**Files:**
- Modify: `app/composables/useCountdown.ts:1-6,113-119`
- Modify: `app/components/SlotMachine.vue:42-54`
- Test: `tests/unit/composables/useCountdown.spec.ts` (новий)

**Interfaces:**
- Consumes: `useSoundVolume()` з Task 3, `playDecision` з Task 2
- Produces: нічого для інших задач

- [ ] **Step 4.1: Write the failing test**

`tests/unit/composables/useCountdown.spec.ts`. Тест монтує компонент-обгортку, бо `useCountdown` створює
`Audio` в `onMounted`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useCountdown } from '~/composables/useCountdown'
import { useSoundVolume } from '~/composables/useSoundVolume'

const created: { volume: number }[] = []

class FakeAudio {
  volume = 1
  currentTime = 0
  duration = 10
  onended: (() => void) | null = null
  constructor() { created.push(this) }
  play() { return Promise.resolve() }
  pause() {}
}

const Host = defineComponent({
  setup() {
    return useCountdown()
  },
  template: '<div />',
})

describe('useCountdown volume', () => {
  beforeEach(() => {
    created.length = 0
    localStorage.clear()
    vi.stubGlobal('Audio', FakeAudio)
    useSoundVolume().setVolume(1)
  })

  it('applies the stored volume to every audio element on mount', () => {
    useSoundVolume().setVolume(0.5)
    mount(Host)
    expect(created).toHaveLength(5)
    expect(created.every(a => a.volume === 0.5)).toBe(true)
  })

  it('applies a later volume change to already created elements', async () => {
    mount(Host)
    useSoundVolume().setVolume(0.2)
    await nextTick()
    expect(created.every(a => a.volume === 0.2)).toBe(true)
  })
})
```

- [ ] **Step 4.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useCountdown.spec.ts`
Expected: FAIL - `volume` лишається `1`, бо `useCountdown` його не виставляє.

- [ ] **Step 4.3: Apply volume in useCountdown**

`app/composables/useCountdown.ts` - у рядку 6 розшир імпорт з `vue` і додай імпорт composable:

```ts
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSoundVolume } from '~/composables/useSoundVolume'
```

Усередині `useCountdown()`, одразу після оголошень рефів (`countdownRunning`), додай:

```ts
    const { volume } = useSoundVolume()

    function applyVolume() {
        for (const audio of [pleaseVoteAudio, countdownDryAudio, countdownWetAudio, ambienceAudio, decisionAudio]) {
            if (audio) audio.volume = volume.value
        }
    }

    watch(volume, applyVolume)
```

І в `onMounted`, після створення `decisionAudio` (рядок 118), додай виклик:

```ts
        applyVolume()
```

- [ ] **Step 4.4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useCountdown.spec.ts`
Expected: PASS (2 тести).

- [ ] **Step 4.5: Apply volume to the slot machine tick**

`app/components/SlotMachine.vue` - додай імпорт до наявного блоку імпортів:

```ts
import { useSoundVolume } from '~/composables/useSoundVolume'
```

Поруч з іншими оголошеннями setup-скоупу:

```ts
const { volume: soundVolume } = useSoundVolume()
```

У `playTick` (рядок 49) заміни рядок `gain.gain.setValueAtTime(0.045, audioCtx.currentTime)` на:

```ts
  gain.gain.setValueAtTime(0.045 * soundVolume.value, audioCtx.currentTime)
```

Множник зберігає відносну тихість тіку: на повній гучності поведінка не змінюється.

- [ ] **Step 4.6: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS обидва; наявний `tests/unit/components/SlotMachine.spec.ts` лишається зеленим.

- [ ] **Step 4.7: Commit**

```bash
git add app/composables/useCountdown.ts app/components/SlotMachine.vue \
  tests/unit/composables/useCountdown.spec.ts
git commit -m "feat: apply the volume setting to countdown and slot sounds"
```

---

### Task 5: Слайдер гучності в шапці

**Files:**
- Modify: `app/components/AppHeader.vue:1-12,88-108,140-150`
- Modify: `app/i18n/locales/uk.json` (секція `header`)
- Modify: `app/i18n/locales/en.json` (секція `header`)
- Test: `tests/e2e/page-load.spec.ts` (додати тест)

**Interfaces:**
- Consumes: `useSoundVolume()` з Task 3
- Produces: нічого для інших задач

Слайдер свідомо стоїть **поза** обома `role="menu"` дропдаунами: `useMenuKeyboard` перехоплює
`ArrowUp`/`ArrowDown` для навігації пунктами, а ARIA-модель `menu` не допускає `slider` як вміст.

- [ ] **Step 5.1: Add i18n keys**

`app/i18n/locales/uk.json`, у секцію `"header"` (поруч з `"themePalette"`):

```json
    "volume": "Гучність звуку",
```

`app/i18n/locales/en.json`, у секцію `"header"`:

```json
    "volume": "Sound volume",
```

Перевір валідність обох файлів:

Run: `python3 -c "import json; json.load(open('app/i18n/locales/uk.json')); json.load(open('app/i18n/locales/en.json')); print('ok')"`
Expected: `ok`

- [ ] **Step 5.2: Write the failing e2e test**

`tests/e2e/page-load.spec.ts` - додай тест наприкінці файлу (тести тут на верхньому рівні, без `describe`).
`AppHeader` рендериться на `/` (`app/pages/index.vue:128`), тож Supabase для цього тесту не потрібен:

```ts
test('volume slider is keyboard reachable and persists its value', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByTestId('volume-button')
  await expect(trigger).not.toHaveAccessibleName('')
  await trigger.click()
  const slider = page.getByTestId('volume-slider')
  await expect(slider).toBeVisible()
  await expect(slider).not.toHaveAccessibleName('')
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sp-volume'))).toBe('0.95')
})
```

- [ ] **Step 5.3: Run the e2e test to verify it fails**

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only npm run test:e2e:pages`
Expected: FAIL - `volume-button` не знайдено.

Дамі-креди беруться з `.github/workflows/ci.yml` (job `page-load`); локальний `/.env/` порожній, без них
Supabase-клієнт не стартує і Vue не монтується.

- [ ] **Step 5.4: Add script state to AppHeader**

`app/components/AppHeader.vue` - додай імпорт до наявного блоку:

```ts
import { useSoundVolume } from '~/composables/useSoundVolume'
import { useClickOutside } from '~/composables/useClickOutside'
```

(`useClickOutside` уже імпортований - не дублюй рядок.)

Після блоку `pickPalette` (рядок ~105) додай:

```ts
const { volume, setVolume } = useSoundVolume()
const volumeRef = ref<HTMLElement | null>(null)
const volumeOpen = ref(false)
useClickOutside(volumeRef, () => { volumeOpen.value = false })

const volumePercent = computed(() => Math.round(volume.value * 100))

function onVolumeInput(event: Event) {
  const target = event.target as HTMLInputElement
  setVolume(Number(target.value) / 100)
}
```

`ref` і `computed` уже імпортовані з `vue` (рядок 3).

- [ ] **Step 5.5: Add the trigger and popover to the template**

`app/components/AppHeader.vue` - усередині `<div class="flex items-center gap-2">`, **перед** блоком
`<div ref="paletteMenuRef" …>` (рядок ~141), додай:

```html
      <div
        ref="volumeRef"
        style="position: relative;"
        @keydown.escape.stop="volumeOpen = false"
      >
        <button
          v-wave
          class="mui-icon-btn text-appbar-emphasis"
          style="--hover-bg: rgba(255,255,255,0.08);"
          :aria-label="$t('header.volume')"
          :aria-expanded="volumeOpen"
          data-testid="volume-button"
          @click="volumeOpen = !volumeOpen"
        >
          <AppIcon
            :icon="volume === 0 ? 'ic:baseline-volume-off' : 'ic:baseline-volume-up'"
            style="font-size: 1.5rem;"
          />
        </button>
        <div
          v-if="volumeOpen"
          class="mui-menu z-50 flex items-center px-3 py-2"
          style="position: absolute; right: 0; top: calc(100% + 4px); min-width: 180px;"
        >
          <input
            type="range"
            class="w-full"
            min="0"
            max="100"
            step="5"
            :value="volumePercent"
            :aria-label="$t('header.volume')"
            data-testid="volume-slider"
            @input="onVolumeInput"
          >
        </div>
      </div>
```

- [ ] **Step 5.6: Initialise the stored volume at startup**

`app/components/AppHeader.vue` - у Step 5.4 деструктуризацію заміни на:

```ts
const { volume, setVolume, initVolume } = useSoundVolume()
initVolume()
```

Виклик у setup безпечний: `initVolume` лише читає `localStorage` у `try/catch`.

- [ ] **Step 5.7: Run the e2e test to verify it passes**

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only npm run test:e2e:pages`
Expected: PASS усі тести, включно з новим.

- [ ] **Step 5.8: Run lint, typecheck and the unit suite**

Run: `npm run lint && npm run typecheck && npm run test:unit`
Expected: PASS; `vue/attributes-order` може дати нові warnings через порядок атрибутів - виправ через
`npx eslint --fix app/components/AppHeader.vue` і переконайся, що кількість warnings повернулася до
доміграційної (72, 0 errors).

- [ ] **Step 5.9: Commit**

```bash
git add app/components/AppHeader.vue app/i18n/locales/uk.json app/i18n/locales/en.json \
  tests/e2e/page-load.spec.ts
git commit -m "feat: add a volume slider to the app header"
```

---

### Task 6: Салют без QA-розщеплення

**Files:**
- Test: `tests/unit/components/ResultsArea.spec.ts` (новий)

**Interfaces:**
- Consumes: `shouldCelebrate` з Task 1
- Produces: нічого для інших задач

Це регресійний тест на дефект, який Task 1 виправив як побічний ефект: живий `<ResultsArea>` отримує
`:grouped-votes="groupedVoteCounts"`, а той `null` без QA-гравців, тож старий предикат ніколи не показував
конфеті в кімнаті без ролей. Окремої правки коду тут немає - лише шов, що фіксує поведінку.

- [ ] **Step 6.1: Write the test**

`tests/unit/components/ResultsArea.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ResultsArea from '~/components/ResultsArea.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function mountResults(props: Record<string, unknown>) {
  return mount(ResultsArea, {
    props: { showNewRound: false, ...props },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, PieChart: true, AppTooltip: true },
    },
  })
}

describe('ResultsArea celebration without a qa split', () => {
  it('celebrates when every vote matches and grouped votes are absent', () => {
    const wrapper = mountResults({ votes: { '5': 3 }, groupedVotes: null })
    expect(wrapper.find('.celebration-layer').exists()).toBe(true)
  })

  it('does not celebrate a single voter', () => {
    const wrapper = mountResults({ votes: { '5': 1 }, groupedVotes: null })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })

  it('does not celebrate mixed votes', () => {
    const wrapper = mountResults({ votes: { '5': 2, '8': 1 }, groupedVotes: null })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })

  it('respects disableCelebration for the last round view', () => {
    const wrapper = mountResults({ votes: { '5': 3 }, groupedVotes: null, disableCelebration: true })
    expect(wrapper.find('.celebration-layer').exists()).toBe(false)
  })
})
```

- [ ] **Step 6.2: Run the test**

Run: `npx vitest run tests/unit/components/ResultsArea.spec.ts`
Expected: PASS (4 тести). Якщо перший тест падає - Task 1 застосований неповно; перевір
`ResultsArea.vue:75`.

- [ ] **Step 6.3: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS обидва.

- [ ] **Step 6.4: Commit**

```bash
git add tests/unit/components/ResultsArea.spec.ts
git commit -m "test: cover the consensus celebration without a qa split"
```

---

### Task 7: Документація

**Files:**
- Modify: `AGENTS.md:120-122,137-139`
- Modify: `app/utils/AGENTS.md`
- Modify: `DESIGN.md:450`
- Modify: `docs/specs/2026-09-08-consensus-celebration-design.md:4`

**Interfaces:**
- Consumes: фінальну поведінку з Task 1-6
- Produces: нічого

Кореневий `AGENTS.md` - рівно 150 рядків при ліміті 150. Нова строка в таблиці LocalStorage компенсується
скороченням буллета Consensus, деталь якого переїжджає в `app/utils/AGENTS.md` (36 рядків, ліміт 200).

- [ ] **Step 7.1: Move the consensus detail to app/utils/AGENTS.md**

`app/utils/AGENTS.md` - додай наприкінці файлу:

```markdown
## Consensus

`resultCelebration.ts → shouldCelebrate(votes, grouped)` - єдиний предикат для салюту (`ResultsArea.vue`) і звуку
(`isConsensus` у `pages/[slug].vue`). Одноголосною вважається група з рівно однією унікальною оцінкою **і** ≥ 2
голосами. Без QA-розщеплення (`groupedVoteCounts === null`) те саме правило застосовується до всіх голосів.
Поріг ≥ 2 узгоджений з `DESIGN.md` §11: рядок `round_history` теж пишеться лише при `votes.length >= 2`.
```

- [ ] **Step 7.2: Shorten the root Consensus bullet**

`AGENTS.md:137-139` - заміни три рядки буллета Consensus на два:

```markdown
- **Consensus:** салют + decision-sound при одноголосності з ≥ 2 голосами: з QA-розщепленням - хоча б в одній
  групі (DEV/QA), без нього - серед усіх голосів. Деталі - `app/utils/AGENTS.md`
```

- [ ] **Step 7.3: Add the sp-volume row**

`AGENTS.md`, таблиця LocalStorage (після рядка `sp-side-widget`):

```markdown
| `sp-volume` | `0`–`1`, гучність усіх звуків; дефолт `1`. Читається/пишеться `useSoundVolume()` |
```

- [ ] **Step 7.4: Verify the line budget**

Run: `wc -l AGENTS.md app/utils/AGENTS.md`
Expected: `AGENTS.md` ≤ 150, `app/utils/AGENTS.md` ≤ 200.

Run: `awk 'length > 120 { print FILENAME ":" NR }' AGENTS.md app/utils/AGENTS.md`
Expected: без виводу.

- [ ] **Step 7.5: Update DESIGN.md**

`DESIGN.md:450` - заміни рядок про decision-sound на:

```markdown
- Звук `decision-sound` грає при кожному reveal з консенсусом (перехід `voting → revealed`), незалежно від режиму
  countdown; у режимі "з атмосферою" по завершенню грає `ambience.mp3`, якщо консенсусу немає. Гучність усіх звуків
  керується слайдером у шапці (`sp-volume`)
```

- [ ] **Step 7.6: Mark the spec as implemented**

`docs/specs/2026-09-08-consensus-celebration-design.md:4`:

```markdown
**Статус:** реалізовано (план - `docs/plans/2026-09-08-consensus-celebration.md`)
```

- [ ] **Step 7.7: Commit**

```bash
git add AGENTS.md app/utils/AGENTS.md DESIGN.md docs/specs/2026-09-08-consensus-celebration-design.md
git commit -m "docs: describe the consensus rule, reveal sound and volume setting"
```

---

### Task 8: Фінальна перевірка

**Files:** немає змін

- [ ] **Step 8.1: Run the CI check**

Run: `npm run test:ci`
Expected: exit 0; lint - 0 errors (warnings на рівні 72), typecheck чистий, unit усі зелені, build успішний.

- [ ] **Step 8.2: Run the page-load e2e suite**

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only npm run test:e2e:pages`
Expected: PASS усі тести.

- [ ] **Step 8.3: Confirm the tree is clean**

Run: `git status --porcelain`
Expected: без виводу.

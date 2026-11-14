# Frontend Audit Remediation Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan
> task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрити 11 знахідок аудиту `docs/audits/2026-09-07-frontend-design-audit.md` (reduced-motion, `lang`,
landmarks, accessible names, skip-link, повернення фокуса, меню зі стрілками, видимий провал голосу, пороги Goal
Clarity, тумблер `/ffc`, `<title>` кімнати).

**Architecture:** Точкові зміни в наявних файлах без нових абстракцій, окрім одного composable
`useMenuKeyboard` (три вживання). Глобальні правила (reduced-motion, skip-link) живуть у `main.css` і `App.vue`;
повернення фокуса - один раз в `AppModal`; решта - у компонентах, на які вказує аудит.

**Spec:** `docs/specs/2026-09-08-frontend-audit-remediation-design.md`

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, Tailwind v4, vue-i18n 11, Vitest + happy-dom 20 (є
`showModal`/`close`/`matchMedia`), Playwright (проєкт `page-load`, без Supabase). Нових залежностей немає.

## Global Constraints

- Після кожної задачі: `npm run typecheck && npm run test:unit`; фініш - `npm run test:ci` і
  `npm run test:e2e:pages`
- 2 пробіли, без табів, один trailing newline; без коментарів у коді
- Кожен новий UI-рядок - у `app/i18n/locales/uk.json` **і** `en.json`
- Commit messages, коментарі в коді, назви тестів - англійською; документація в `docs/` - українською
- Коміт на задачу під час виконання; гілка зливається в `main` через squash-merge
- `git add` лише файли з блоку **Files** задачі; ніколи `git add -A`
- Секрети й env-значення не друкувати

---

### Task 1: Reduced motion - CSS і слот (F-1)

**Files:**
- Modify: `app/assets/css/main.css` (додати блок наприкінці файлу)
- Modify: `app/components/SlotMachine.vue:130-159`
- Test: `tests/unit/components/SlotMachine.spec.ts` (новий)

**Interfaces:**
- Consumes: `spinReels`, `isJackpot`, `buildReelStrip` з `~/utils/slotMachine` (уже є)
- Produces: нічого для інших задач

- [ ] **Step 1.1: Write the failing test**

`tests/unit/components/SlotMachine.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import SlotMachine from '~/components/SlotMachine.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: {} },
})

function mountSlot() {
  return mount(SlotMachine, {
    props: { spinsLeft: 1, canSpin: true },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, AppTooltip: { template: '<div><slot name="trigger" /></div>' } },
    },
  })
}

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList)
}

describe('SlotMachine under prefers-reduced-motion', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows the final symbols without a reel strip and ends the spin after 300ms', async () => {
    mockReducedMotion(true)
    const wrapper = mountSlot()
    await wrapper.get('[data-testid="slot-spin-button"]').trigger('click')
    const reels = wrapper.findAll('[data-testid="slot-reel"]')
    expect(reels).toHaveLength(3)
    for (const reel of reels) expect(reel.findAll('.slot-cell')).toHaveLength(1)
    expect(wrapper.emitted('spin')).toHaveLength(1)
    expect(wrapper.emitted('spinEnd')).toBeUndefined()
    vi.advanceTimersByTime(300)
    expect(wrapper.emitted('spinEnd')).toHaveLength(1)
  })

  it('builds a multi-cell strip when motion is allowed', async () => {
    mockReducedMotion(false)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    const wrapper = mountSlot()
    await wrapper.get('[data-testid="slot-spin-button"]').trigger('click')
    const firstReel = wrapper.findAll('[data-testid="slot-reel"]')[0]!
    expect(firstReel.findAll('.slot-cell').length).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 1.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/SlotMachine.spec.ts`
Expected: FAIL - перший тест: `expected 12 to have length 1` (strip будується завжди).

- [ ] **Step 1.3: Implement reduced-motion path in `SlotMachine.vue`**

Замінити функцію `spin()` (`SlotMachine.vue:130-159`) на:

```ts
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function finishSpin(targets: string[]) {
  reels.value = [...targets]
  strips.value = targets.map(t => [t])
  transitions.value = ['none', 'none', 'none']
  offsets.value = [0, 0, 0]
  spinning.value = false
  emit('spinEnd')
  if (isJackpot(targets)) emit('win')
}

async function spin() {
  if (spinning.value || props.spinsLeft <= 0) return
  if (!props.canSpin) {
    triggerJam()
    return
  }
  emit('spin')
  spinning.value = true
  if (tickRaf !== undefined) cancelAnimationFrame(tickRaf)
  const targets = spinReels()
  if (prefersReducedMotion()) {
    reels.value = [...targets]
    strips.value = targets.map(t => [t])
    finishTimer = setTimeout(() => finishSpin(targets), 300)
    return
  }
  strips.value = targets.map((target, i) => [reels.value[i]!, ...buildReelStrip(10 + i * 6), target])
  transitions.value = ['none', 'none', 'none']
  offsets.value = [0, 0, 0]
  await nextTick()
  requestAnimationFrame(() => requestAnimationFrame(() => {
    transitions.value = REEL_DURATIONS_MS.map(d => `transform ${d}ms cubic-bezier(0.22, 0.9, 0.3, 1)`)
    offsets.value = strips.value.map(strip => -(strip.length - 1) * CELL_PX)
    startTickLoop(strips.value.map(s => s.length - 1))
  }))
  finishTimer = setTimeout(() => finishSpin(targets), REEL_DURATIONS_MS[2] + 150)
}
```

- [ ] **Step 1.4: Add the global reduced-motion block to `main.css`**

Дописати в самий кінець `app/assets/css/main.css` (після блоку `:root[data-theme-transition] * { … }`,
поза `@layer`):

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .celebration-layer {
    display: none;
  }
}
```

Scoped-клас `.celebration-layer` з `ResultsArea.vue` збігається з глобальним селектором: scoped додає атрибут,
клас лишається.

- [ ] **Step 1.5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/SlotMachine.spec.ts tests/unit/utils/slotMachine.spec.ts`
Expected: PASS (обидва файли).

Run: `rg -c 'prefers-reduced-motion' app/assets/css/main.css`
Expected: `1`

- [ ] **Step 1.6: Commit**

```bash
git add app/assets/css/main.css app/components/SlotMachine.vue tests/unit/components/SlotMachine.spec.ts
git commit -m "feat: respect prefers-reduced-motion in CSS and slot machine"
```

---

### Task 2: `lang` документа слідує за локаллю (F-2)

**Files:**
- Modify: `app/i18n.ts`
- Test: `tests/unit/i18n.spec.ts` (новий)

**Interfaces:**
- Produces: `persistLocale(code: string): void` (уже експортована; тепер також ставить `document.documentElement.lang`)

- [ ] **Step 2.1: Write the failing test**

`tests/unit/i18n.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('i18n document language', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.lang = 'uk'
  })

  it('sets html lang from the stored locale on init', async () => {
    localStorage.setItem('sp-lang', 'en')
    const { i18n } = await import('~/i18n')
    expect(i18n.global.locale.value).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('falls back to uk when nothing is stored', async () => {
    await import('~/i18n')
    expect(document.documentElement.lang).toBe('uk')
  })

  it('persistLocale updates storage and html lang', async () => {
    const { persistLocale } = await import('~/i18n')
    persistLocale('en')
    expect(localStorage.getItem('sp-lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
```

- [ ] **Step 2.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/i18n.spec.ts`
Expected: FAIL - `expected 'uk' to be 'en'` у першому й третьому тестах.

- [ ] **Step 2.3: Implement**

Замінити вміст `app/i18n.ts` на:

```ts
import { createI18n } from 'vue-i18n'
import uk from '~/i18n/locales/uk.json'
import en from '~/i18n/locales/en.json'

const STORAGE_KEY = 'sp-lang'
const LOCALES = ['uk', 'en']

function storedLocale(): string {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value && LOCALES.includes(value)) return value
  } catch {}
  return 'uk'
}

function applyDocumentLang(code: string) {
  document.documentElement.lang = code
}

export function persistLocale(code: string) {
  try { localStorage.setItem(STORAGE_KEY, code) } catch {}
  applyDocumentLang(code)
}

const initialLocale = storedLocale()
applyDocumentLang(initialLocale)

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: { uk, en },
})
```

`index.html` не змінюється: `lang="uk"` лишається дефолтом до завантаження JS.

- [ ] **Step 2.4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/i18n.spec.ts tests/unit/composables/useTheme.spec.ts`
Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add app/i18n.ts tests/unit/i18n.spec.ts
git commit -m "fix: keep html lang in sync with the active locale"
```

---

### Task 3: `<main>`, `<h1>` і `<title>` кімнати (F-3, F-11)

**Files:**
- Modify: `app/pages/[slug].vue:632-677` (шаблон) і скрипт після `headerSeed` (`:88`)
- Modify: `app/components/AppHeader.vue:130-132`

**Interfaces:**
- Produces: `main#main[tabindex="-1"]` на маршруті кімнати (ціль для Task 4)

Тестового шва немає: `[slug].vue` тягне Supabase, Realtime і router. Перевірка - typecheck + ручний сценарій.

- [ ] **Step 3.1: Turn the room name into `<h1>` in `AppHeader.vue`**

У `AppHeader.vue:130-132` замінити:

```html
    <template v-if="roomName">
      <span class="mui-h6 text-lg text-appbar-emphasis">{{ roomName }}</span>
    </template>
```

на:

```html
    <h1
      v-if="roomName"
      class="mui-h6 text-lg text-appbar-emphasis"
    >
      {{ roomName }}
    </h1>
```

Tailwind preflight скидає `h1` на `font-size: inherit; font-weight: inherit; margin: 0`, тож вигляд не зміниться.

- [ ] **Step 3.2: Wrap the room layout in `<main>` and add `<main>` to the not-found branch**

У `[slug].vue:677` замінити відкривальний тег

```html
    <div class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto">
```

на

```html
    <main
      id="main"
      tabindex="-1"
      class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto outline-none"
    >
```

і відповідний закривальний `</div>` (той, що йде одразу перед `<JoinOverlay`, `:768`) на `</main>`.

У not-found-гілці (`:633-635`) замінити

```html
  <div
    v-if="notFound"
    class="min-h-screen flex items-center justify-center p-4 bg-app"
  >
```

на

```html
  <main
    v-if="notFound"
    id="main"
    tabindex="-1"
    class="min-h-screen flex items-center justify-center p-4 bg-app outline-none"
  >
```

і закривальний `</div>` цієї гілки (`:653`, перед `<div v-else`) на `</main>`.

- [ ] **Step 3.3: Set `document.title` from the room name**

У скрипті `[slug].vue` одразу після `const headerSeed = ref<…>(readHeaderSeed())` (`:88`) додати:

```ts
const roomTitle = computed(() => currentRoomName.value ?? currentSlug.value ?? headerSeed.value.roomName)

watch([() => route.path, roomTitle, notFound], ([, name, missing]) => {
  document.title = !missing && name ? `${name} | Story Poker` : 'Story Poker'
}, { immediate: true, flush: 'post' })
```

`currentSlug`/`currentRoomName` оголошені раніше (`:82-83`), `notFound` - `:69`. `flush: 'post'` потрібен, бо
`router.afterEach` спрацьовує синхронно під час `router.replace('/<slug>')` і ставить `'Story Poker'`;
post-flush watcher виконується після нього і виграє.

- [ ] **Step 3.4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: без помилок.

- [ ] **Step 3.5: Manual check**

Run: `npm run dev`, відкрити будь-яку кімнату за id (`/<8 символів>`), яка має slug.

1. Вкладка браузера показує `<назва кімнати> | Story Poker` навіть після редиректу на slug.
2. У DevTools → Accessibility tree: один landmark `main`, один `heading level 1` з назвою кімнати.
3. Перейти на `/` - заголовок вкладки `Home | Story Poker`.
4. Відкрити `/nope-nope-nope` - є `<main>`, заголовок вкладки `Story Poker`.

- [ ] **Step 3.6: Commit**

```bash
git add "app/pages/[slug].vue" app/components/AppHeader.vue
git commit -m "feat: add main landmark, h1 and document title to the room page"
```

---

### Task 4: Skip-link (F-5)

**Files:**
- Modify: `app/App.vue`
- Modify: `app/pages/index.vue:150`, `app/pages/login.vue:60`, `app/pages/signup.vue:62`,
  `app/pages/forgot-password.vue:59`, `app/pages/reset-password.vue:79`, `app/pages/ffc.vue:69`
- Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` (ключ `common.skipToContent`)
- Test: `tests/e2e/page-load.spec.ts`

**Interfaces:**
- Consumes: `main#main[tabindex="-1"]` з Task 3 (кімната)

- [ ] **Step 4.1: Write the failing e2e test**

Дописати в кінець `tests/e2e/page-load.spec.ts`:

```ts
test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.keyboard.press('Tab')
  const skipLink = page.locator('a[href="#main"]')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main#main')).toBeFocused()
})
```

Маршрут `/login` обрано навмисно: `/` у `onMounted` фокусує поле імені (`index.vue:44`), тож перший Tab там
не потрапив би на skip-link.

- [ ] **Step 4.2: Run the e2e test to verify it fails**

Run: `npx playwright test --project=page-load -g "skip link"`
Expected: FAIL - `a[href="#main"]` не знайдено.

- [ ] **Step 4.3: Add i18n key**

В `en.json` у блок `"common"` після `"confirmPassword"` додати `"skipToContent": "Skip to main content"`;
в `uk.json` - `"skipToContent": "Перейти до основного вмісту"`.

- [ ] **Step 4.4: Add the link to `App.vue`**

Замінити шаблон `App.vue` на:

```html
<template>
  <div class="min-h-screen bg-app text-body">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] mui-btn mui-btn-md"
    >
      {{ $t('common.skipToContent') }}
    </a>
    <ConnectionBanner />
    <RouterView />
  </div>
</template>
```

- [ ] **Step 4.5: Add `id="main" tabindex="-1"` to the other six `<main>` elements**

У кожному з файлів нижче додати до тега `<main` атрибути `id="main"` і `tabindex="-1"`, а до класів - `outline-none`:

- `app/pages/index.vue:150`
- `app/pages/login.vue:60`
- `app/pages/signup.vue:62`
- `app/pages/forgot-password.vue:59`
- `app/pages/reset-password.vue:79`
- `app/pages/ffc.vue:69`

Приклад для `login.vue`:

```html
    <main
      id="main"
      tabindex="-1"
      class="flex flex-1 items-center justify-center px-4 py-10 outline-none"
    >
```

- [ ] **Step 4.6: Run e2e and unit**

Run: `npx playwright test --project=page-load`
Expected: PASS (усі public routes + skip link).

Run: `npm run typecheck && npm run test:unit`
Expected: PASS.

- [ ] **Step 4.7: Commit**

```bash
git add app/App.vue app/pages/index.vue app/pages/login.vue app/pages/signup.vue \
  app/pages/forgot-password.vue app/pages/reset-password.vue app/pages/ffc.vue \
  app/i18n/locales/uk.json app/i18n/locales/en.json tests/e2e/page-load.spec.ts
git commit -m "feat: add skip link and focusable main landmarks"
```

---

### Task 5: Accessible names для трьох icon-only кнопок (F-4)

**Files:**
- Modify: `app/components/CardsArea.vue:283-312`
- Modify: `app/components/PlayerRow.vue:290-296`
- Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` (ключ `players.menuFor`)
- Test: `tests/unit/components/PlayerRow.spec.ts`, `tests/unit/components/CardsArea.spec.ts` (новий)

- [ ] **Step 5.1: Write the failing tests**

У `tests/unit/components/PlayerRow.spec.ts` замінити `messages: { en: {} }` на:

```ts
  messages: { en: { players: { menuFor: 'Player menu: {name}' } } },
```

і додати новий `describe` наприкінці файлу:

```ts
describe('PlayerRow menu button name', () => {
  it('names the menu button after the player', () => {
    const wrapper = mountRow()
    expect(wrapper.get('button[aria-expanded]').attributes('aria-label')).toBe('Player menu: Alice')
  })
})
```

Новий `tests/unit/components/CardsArea.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CardsArea from '~/components/CardsArea.vue'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: { en: { cards: { reset: 'Reset Estimates', lastRound: 'Previous Round' } } },
})

function mountCards(showLastRound: boolean) {
  return mount(CardsArea, {
    props: {
      activeCards: ['1', '2', '3'],
      selectedVote: null,
      isModerator: true,
      hasVotes: true,
      canReset: true,
      countdownCounter: 0,
      countdownRunning: false,
      pollMode: false,
      voteQuestionMode: false,
      pollQuestion: null,
      hasLastRound: true,
      showLastRound,
    },
    global: {
      plugins: [i18n],
      directives: { wave: {} },
      stubs: { AppIcon: true, AppTooltip: { template: '<div><slot name="trigger" /></div>' } },
    },
  })
}

describe('CardsArea moderator icon buttons', () => {
  it('names the reset button', () => {
    const wrapper = mountCards(false)
    expect(wrapper.get('[data-testid="reset-button"]').attributes('aria-label')).toBe('Reset Estimates')
  })

  it('exposes the last-round toggle as a pressed button', () => {
    const off = mountCards(false).get('[data-testid="last-round-button"]')
    expect(off.attributes('aria-label')).toBe('Previous Round')
    expect(off.attributes('aria-pressed')).toBe('false')

    const on = mountCards(true).get('[data-testid="last-round-button"]')
    expect(on.attributes('aria-pressed')).toBe('true')
  })
})
```

- [ ] **Step 5.2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/PlayerRow.spec.ts tests/unit/components/CardsArea.spec.ts`
Expected: FAIL - `aria-label` undefined; `[data-testid="last-round-button"]` не знайдено.

- [ ] **Step 5.3: Add i18n key**

`en.json`, блок `"players"`, після `"kickPlayer"`: `"menuFor": "Player menu: {name}"`.
`uk.json`, там само: `"menuFor": "Меню гравця: {name}"`.

- [ ] **Step 5.4: Add names in `CardsArea.vue`**

Кнопка `toggleLastRound` (`:283-289`) - додати три атрибути:

```html
            <button
              v-wave
              class="mui-icon-btn"
              :disabled="(!hasLastRound && !showLastRound) || countdownRunning"
              :style="{ color: ((!hasLastRound && !showLastRound) || countdownRunning) ? 'var(--text-disabled)' : undefined }"
              :aria-label="$t('cards.lastRound')"
              :aria-pressed="showLastRound ? 'true' : 'false'"
              data-testid="last-round-button"
              @click="emit('toggleLastRound')"
            >
```

Кнопка reset (`:305-312`) - додати `:aria-label="$t('cards.reset')"` перед `data-testid="reset-button"`.

- [ ] **Step 5.5: Add name in `PlayerRow.vue`**

Кнопка меню (`:290-296`) - додати `:aria-label="$t('players.menuFor', { name: player.name })"` перед
`:aria-expanded="menuOpen"`.

- [ ] **Step 5.6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components`
Expected: PASS.

- [ ] **Step 5.7: Commit**

```bash
git add app/components/CardsArea.vue app/components/PlayerRow.vue \
  app/i18n/locales/uk.json app/i18n/locales/en.json \
  tests/unit/components/PlayerRow.spec.ts tests/unit/components/CardsArea.spec.ts
git commit -m "fix: give icon-only room controls accessible names"
```

---

### Task 6: `AppModal` повертає фокус на тригер (F-6)

**Files:**
- Modify: `app/components/AppModal.vue:1-33`
- Test: `tests/unit/components/AppModal.spec.ts`

- [ ] **Step 6.1: Write the failing tests**

Додати в `AppModal.spec.ts` імпорт `nextTick` з `vue` і новий `describe`:

```ts
import { nextTick } from 'vue'

describe('AppModal focus return', () => {
  function focusedTrigger() {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    return trigger
  }

  it('returns focus to the trigger when open becomes false', async () => {
    const trigger = focusedTrigger()
    const wrapper = mount(AppModal, { props: { open: true }, attachTo: document.body })
    await nextTick()
    expect(document.activeElement).not.toBe(trigger)
    await wrapper.setProps({ open: false })
    await nextTick()
    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
    trigger.remove()
  })

  it('returns focus to the trigger when unmounted while open', async () => {
    const trigger = focusedTrigger()
    const wrapper = mount(AppModal, { props: { open: true }, attachTo: document.body })
    await nextTick()
    wrapper.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
```

- [ ] **Step 6.2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/AppModal.spec.ts`
Expected: FAIL - `document.activeElement` це `<body>`, а не тригер.

- [ ] **Step 6.3: Implement**

Замінити `<script setup>` в `AppModal.vue` на:

```ts
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps<{
  open: boolean
  lockDismiss?: boolean
  labelledby?: string
  describedby?: string
}>()
const emit = defineEmits<{ close: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)
let opener: HTMLElement | null = null

function restoreFocus() {
  const target = opener
  opener = null
  if (target?.isConnected) target.focus()
}

watch(() => props.open, async (val) => {
  await nextTick()
  if (!dialogEl.value) return
  if (val) {
    if (!dialogEl.value.open) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialogEl.value.showModal()
      dialogEl.value.focus()
    }
  } else if (dialogEl.value.open) {
    dialogEl.value.close()
    restoreFocus()
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (dialogEl.value?.open) dialogEl.value.close()
  restoreFocus()
})

function onCancel(e: Event) {
  e.preventDefault()
  if (!props.lockDismiss) emit('close')
}

function onOverlayClick() {
  if (!props.lockDismiss) emit('close')
}
```

Шаблон не змінюється.

- [ ] **Step 6.4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/AppModal.spec.ts tests/unit/components/UserSettingsModal.spec.ts`
Expected: PASS.

- [ ] **Step 6.5: Commit**

```bash
git add app/components/AppModal.vue tests/unit/components/AppModal.spec.ts
git commit -m "fix: return focus to the opener when AppModal closes"
```

---

### Task 7: Тумблер `/ffc` з клавіатури (F-10)

**Files:**
- Modify: `app/pages/ffc.vue:79-90`
- Modify: `app/assets/css/main.css:943-947` (`.mui-switch input`) + нове правило фокуса
- Test: `tests/e2e/page-load.spec.ts`

Unit-шва немає: `ffc.vue` ініціалізує auth store у `onMounted`. `/ffc` уже в проєкті `page-load` без Supabase,
тож перевірка - e2e.

- [ ] **Step 7.1: Write the failing e2e test**

Дописати в `tests/e2e/page-load.spec.ts`:

```ts
test('feature flag switch toggles from the keyboard', async ({ page }) => {
  await page.goto('/ffc', { waitUntil: 'domcontentloaded' })
  const checkbox = page.locator('#ffc-example')
  await expect(checkbox).not.toBeChecked()
  await page.locator('#ffc-iconsRounded').focus()
  await page.keyboard.press('Tab')
  await expect(checkbox).toBeFocused()
  await page.keyboard.press('Space')
  await expect(checkbox).toBeChecked()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('FEATURE_FLAGS') ?? '{}'))
  expect(stored.example).toBe(true)
})
```

- [ ] **Step 7.2: Run the e2e test to verify it fails**

Tab від `#ffc-iconsRounded` до `#ffc-example` доводить саме Tab-досяжність, яку аудит називає дефектом;
`locator.focus()` на самій цілі спрацював би і на недосяжному елементі. Між цими двома картками інших фокусованих
елементів немає.

Run: `npx playwright test --project=page-load -g "feature flag switch"`
Expected: FAIL - `toBeFocused` (input має `width: 0; height: 0`, або `toBeChecked` після Space).

- [ ] **Step 7.3: Rewrite the switch markup in `ffc.vue`**

Замінити `ffc.vue:79-90`:

```html
              <span
                class="mui-switch"
                @click="toggleFeatureFlag(featureFlagKey)"
              >
                <input
                  :id="`ffc-${featureFlagKey}`"
                  type="checkbox"
                  :name="`ffc-${featureFlagKey}`"
                  :checked="featureFlagValue.enabled"
                >
                <span class="track" />
                <span class="thumb" />
              </span>
```

на:

```html
              <label
                class="mui-switch"
                :for="`ffc-${featureFlagKey}`"
              >
                <input
                  :id="`ffc-${featureFlagKey}`"
                  type="checkbox"
                  :name="`ffc-${featureFlagKey}`"
                  :checked="featureFlagValue.enabled"
                  @change="toggleFeatureFlag(featureFlagKey)"
                >
                <span class="track" />
                <span class="thumb" />
                <span class="sr-only">{{ $t(`ffc.flags.${featureFlagKey}.name`) }}</span>
              </label>
```

`<input>` має лишатися першим сиблінгом: правила `input:checked + .track` і `input:checked ~ .thumb` у
`main.css:967-975` на цьому тримаються.

- [ ] **Step 7.4: Make the input focusable in `main.css`**

Правило `.mui-switch input` (`main.css:943-947`) лишити як є; одразу після нього додати:

```css
  label.mui-switch input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
  }
  label.mui-switch:has(input:focus-visible) .track {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }
```

Селектор навмисно звужений до `label.mui-switch`: `PlayerRow.vue:327-336` тримає декоративний `.mui-switch` у
`<span>` усередині `role="menuitem"`, і якби його `<input>` став клікабельним на весь тумблер, клік нативно
перемикав би `checked` до того, як `toggleModerator` дійде через Supabase.

- [ ] **Step 7.5: Run e2e and unit**

Run: `npx playwright test --project=page-load`
Expected: PASS.

Run: `npm run typecheck && npm run test:unit`
Expected: PASS.

- [ ] **Step 7.6: Commit**

```bash
git add app/pages/ffc.vue app/assets/css/main.css tests/e2e/page-load.spec.ts
git commit -m "fix: make feature flag switches native keyboard-operable checkboxes"
```

---

### Task 8: Видимий провал голосу й редагування (F-8)

**Files:**
- Modify: `app/pages/[slug].vue:443-453` (`handleVote`), `:545-556` (`handleSaveEdit`), шаблон після `<CardsArea …/>`
- Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` (ключі `room.voteFailed`, `room.saveFailed`)

Тестового шва немає (сторінка тягне Supabase). Перевірка - typecheck + ручний сценарій. Повний шар сповіщень
з retry - ініціатива `docs/initiatives/error-handling.md`, тут не будується.

- [ ] **Step 8.1: Add i18n keys**

`en.json`, блок `"room"`, після `"notFoundBackHome"`:

```json
    "voteFailed": "Your vote was not saved. Check the connection and try again.",
    "saveFailed": "Changes were not saved. Check the connection and try again."
```

`uk.json`, там само:

```json
    "voteFailed": "Голос не збережено. Перевір з'єднання і спробуй ще раз.",
    "saveFailed": "Зміни не збережено. Перевір з'єднання і спробуй ще раз."
```

- [ ] **Step 8.2: Add the status state and handlers**

У скрипті `[slug].vue` після `const showLastRound = ref(false)` (`:95`) додати:

```ts
const actionNotice = ref<string | null>(null)
let actionNoticeTimer: ReturnType<typeof setTimeout> | undefined

function showActionNotice(message: string) {
  actionNotice.value = message
  clearTimeout(actionNoticeTimer)
  actionNoticeTimer = setTimeout(() => { actionNotice.value = null }, 5000)
}
```

У наявний `onUnmounted` (`:334`, той, що знімає канали) додати рядок `clearTimeout(actionNoticeTimer)`.

Замінити `handleVote` (`:443-453`) на:

```ts
async function handleVote(card: string) {
  if (!currentPlayerId.value) await identitySettled
  if (!currentPlayerId.value) return
  if (isPollDeck.value && !roomState.value?.poll_question) return
  const next = playersStore.voteOf(currentPlayerId.value) === card ? null : card
  try {
    await playersStore.castVote(currentPlayerId.value, next)
  } catch {
    showActionNotice(t('room.voteFailed'))
  }
}
```

Замінити `handleSaveEdit` (`:545-556`) на:

```ts
async function handleSaveEdit(payload: { name: string; shields: string[] }) {
  const target = editTargetPlayer.value
  if (!target) return
  try {
    if (payload.name !== target.name) {
      await playersStore.rename(target.id, payload.name)
    }
    await playersStore.setShields(target.id, payload.shields)
  } catch {
    showActionNotice(t('room.saveFailed'))
  }
  editTargetId.value = null
}
```

`t` уже деструктуровано з `useI18n()` (`:97`).

- [ ] **Step 8.3: Render the live region**

У шаблоні одразу після закривального `/>` компонента `<CardsArea … />` (`:766`) додати:

```html
        <p
          role="status"
          aria-live="polite"
          class="text-mui-body text-danger text-center min-h-6 mt-4"
          data-testid="action-notice"
        >
          {{ actionNotice }}
        </p>
```

Контейнер присутній завжди (порожній, поки помилки немає): live-region оголошує зміни лише якщо існував до них.

- [ ] **Step 8.4: Typecheck, lint, manual check**

Run: `npm run typecheck && npm run lint`
Expected: без помилок.

Manual: `npm run dev`, зайти в кімнату, у DevTools → Network увімкнути Offline, клікнути карту.
Очікувано: карта на мить підсвічується, повертається, під сіткою з'являється текст `room.voteFailed`, зникає
через 5 с. У DevTools → Accessibility текст оголошується як `status`.

- [ ] **Step 8.5: Commit**

```bash
git add "app/pages/[slug].vue" app/i18n/locales/uk.json app/i18n/locales/en.json
git commit -m "feat: announce failed vote and player edit in a live region"
```

---

### Task 9: Меню зі стрілками через `useMenuKeyboard` (F-7)

**Files:**
- Create: `app/composables/useMenuKeyboard.ts`
- Modify: `app/components/PlayerRow.vue:50-58, 285-312` і всі 5 `tabindex="0"` у пунктах
- Modify: `app/components/AppHeader.vue:88-106, 136-162, 212-248` і всі 10 `tabindex="0"` у пунктах
- Test: `tests/unit/composables/useMenuKeyboard.spec.ts` (новий), `tests/unit/components/PlayerRow.spec.ts`

**Interfaces:**
- Produces:

```ts
export function useMenuKeyboard(open: Ref<boolean>, trigger: Ref<HTMLElement | null>): {
  menuEl: Ref<HTMLElement | null>
  onKeydown: (e: KeyboardEvent) => void
}
```

  `menuEl` прив'язується до `<ul role="menu">`, `trigger` - до кнопки-тригера. При `open → true` фокус іде на
  перший `[role^="menuitem"]`; при `open → false` - назад на `trigger`. `onKeydown` вішається на `<ul>`.

- [ ] **Step 9.1: Write the failing composable test**

`tests/unit/composables/useMenuKeyboard.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref, nextTick } from 'vue'
import { useMenuKeyboard } from '~/composables/useMenuKeyboard'

const Host = defineComponent({
  setup() {
    const open = ref(false)
    const trigger = ref<HTMLElement | null>(null)
    const picked = ref<string | null>(null)
    const { menuEl, onKeydown } = useMenuKeyboard(open, trigger)
    return { open, trigger, picked, menuEl, onKeydown }
  },
  template: `
    <div>
      <button ref="trigger" :aria-expanded="open" @click="open = !open">menu</button>
      <ul v-if="open" ref="menuEl" role="menu" @keydown="onKeydown">
        <li role="menuitem" tabindex="-1" @click="picked = 'a'">A</li>
        <li role="menuitemradio" tabindex="-1" aria-checked="false" @click="picked = 'b'">B</li>
        <li role="menuitem" tabindex="-1" @click="picked = 'c'">C</li>
      </ul>
    </div>
  `,
})

function mountHost() {
  return mount(Host, { attachTo: document.body })
}

async function openMenu(wrapper: ReturnType<typeof mountHost>) {
  await wrapper.get('button').trigger('click')
  await nextTick()
  return wrapper.findAll('[role^="menuitem"]')
}

describe('useMenuKeyboard', () => {
  it('focuses the first item on open', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    expect(document.activeElement).toBe(items[0]!.element)
    wrapper.unmount()
  })

  it('moves with ArrowDown/ArrowUp and wraps around', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    const menu = wrapper.get('[role="menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]!.element)
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[0]!.element)
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(items[2]!.element)
    wrapper.unmount()
  })

  it('jumps with Home and End', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    const menu = wrapper.get('[role="menu"]')
    await menu.trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(items[2]!.element)
    await menu.trigger('keydown', { key: 'Home' })
    expect(document.activeElement).toBe(items[0]!.element)
    wrapper.unmount()
  })

  it('activates a menuitemradio with Enter', async () => {
    const wrapper = mountHost()
    const items = await openMenu(wrapper)
    await items[1]!.trigger('keydown', { key: 'Enter' })
    expect((wrapper.vm as { picked: string | null }).picked).toBe('b')
    wrapper.unmount()
  })

  it('closes with Escape and returns focus to the trigger', async () => {
    const wrapper = mountHost()
    await openMenu(wrapper)
    await wrapper.get('[role="menu"]').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('button').element)
    wrapper.unmount()
  })

  it('leaves focus alone when the menu closes because focus moved elsewhere', async () => {
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    const wrapper = mountHost()
    await openMenu(wrapper)
    outside.focus()
    ;(wrapper.vm as { open: boolean }).open = false
    await nextTick()
    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
    outside.remove()
  })
})
```

- [ ] **Step 9.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useMenuKeyboard.spec.ts`
Expected: FAIL - `Cannot find module '~/composables/useMenuKeyboard'`.

- [ ] **Step 9.3: Implement the composable**

`app/composables/useMenuKeyboard.ts`:

```ts
import { ref, watch, type Ref } from 'vue'

const ITEM_SELECTOR = '[role^="menuitem"]'

export function useMenuKeyboard(open: Ref<boolean>, trigger: Ref<HTMLElement | null>) {
  const menuEl = ref<HTMLElement | null>(null)

  function items(): HTMLElement[] {
    return menuEl.value ? Array.from(menuEl.value.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) : []
  }

  function focusAt(index: number) {
    const list = items()
    if (!list.length) return
    list[(index + list.length) % list.length]?.focus()
  }

  function onKeydown(e: KeyboardEvent) {
    const list = items()
    const active = document.activeElement
    const current = list.findIndex(el => el === active || el.contains(active))
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusAt(current + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusAt(current - 1)
        break
      case 'Home':
        e.preventDefault()
        focusAt(0)
        break
      case 'End':
        e.preventDefault()
        focusAt(list.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        ;(e.target as HTMLElement).closest<HTMLElement>(ITEM_SELECTOR)?.click()
        break
      case 'Escape':
        e.preventDefault()
        open.value = false
        break
    }
  }

  watch(open, (isOpen) => {
    if (isOpen) focusAt(0)
  }, { flush: 'post' })

  watch(open, (isOpen) => {
    if (!isOpen && menuEl.value?.contains(document.activeElement)) trigger.value?.focus()
  })

  return { menuEl, onKeydown }
}
```

Два watcher-и навмисно: відкриття - `flush: 'post'`, бо `<ul v-if>` з'являється лише після рендера; закриття -
pre-flush, бо тоді `<ul>` ще в DOM і `contains(document.activeElement)` розрізняє закриття з клавіатури або
вибором пункту (фокус усередині меню, повертаємо на тригер) від `useClickOutside` (фокус уже деінде, не чіпаємо).
Без цієї перевірки клік у поле вводу при відкритому меню викрадав би фокус назад на кнопку.

- [ ] **Step 9.4: Run composable test to verify it passes**

Run: `npx vitest run tests/unit/composables/useMenuKeyboard.spec.ts`
Expected: PASS.

- [ ] **Step 9.5: Extend `PlayerRow.spec.ts` with an arrow-key expectation**

Додати в `describe('PlayerRow menu keyboard support')`:

```ts
  it('moves focus between items with ArrowDown', async () => {
    const wrapper = mountRow()
    const menu = await openMenu(wrapper)
    const items = wrapper.findAll('[role="menuitem"]')
    expect(document.activeElement).toBe(items[0]!.element)
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1]!.element)
  })
```

Run: `npx vitest run tests/unit/components/PlayerRow.spec.ts`
Expected: FAIL на новому тесті (фокус на `body`).

- [ ] **Step 9.6: Wire `PlayerRow.vue`**

Скрипт: замінити `PlayerRow.vue:51-58`

```ts
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })

function activateMenuItem(e: KeyboardEvent) {
  const item = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]')
  item?.click()
}
```

на

```ts
const menuRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })
const { menuEl: menuListRef, onKeydown: onMenuKeydown } = useMenuKeyboard(menuOpen, menuButtonRef)
```

і додати імпорт `import { useMenuKeyboard } from '~/composables/useMenuKeyboard'`.

Шаблон: на кнопці меню (`:290`) додати `ref="menuButtonRef"`; на `<ul>` (`:305-312`) замінити

```html
      <ul
        v-if="menuOpen"
        class="mui-menu z-50"
        role="menu"
        style="position: absolute; right: 0; top: calc(100% + 4px); min-width: 200px;"
        @keydown.escape="menuOpen = false"
        @keydown.enter.prevent="activateMenuItem"
        @keydown.space.prevent="activateMenuItem"
      >
```

на

```html
      <ul
        v-if="menuOpen"
        ref="menuListRef"
        class="mui-menu z-50"
        role="menu"
        style="position: absolute; right: 0; top: calc(100% + 4px); min-width: 200px;"
        @keydown="onMenuKeydown"
      >
```

У всіх 5 `<li role="menuitem" tabindex="0">` цього файлу замінити `tabindex="0"` на `tabindex="-1"`.

- [ ] **Step 9.7: Wire both menus in `AppHeader.vue`**

Скрипт: замінити `AppHeader.vue:88-106`

```ts
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })

const paletteMenuRef = ref<HTMLElement | null>(null)
const paletteMenuOpen = ref(false)
useClickOutside(paletteMenuRef, () => { paletteMenuOpen.value = false })

function pickPalette(id: PaletteId) {
  setPalette(id)
  paletteMenuOpen.value = false
}

function activateMenuItem(e: KeyboardEvent) {
  const item = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]')
  item?.click()
}
```

на

```ts
const menuRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })
const { menuEl: menuListRef, onKeydown: onMenuKeydown } = useMenuKeyboard(menuOpen, menuButtonRef)

const paletteMenuRef = ref<HTMLElement | null>(null)
const paletteButtonRef = ref<HTMLElement | null>(null)
const paletteMenuOpen = ref(false)
useClickOutside(paletteMenuRef, () => { paletteMenuOpen.value = false })
const { menuEl: paletteListRef, onKeydown: onPaletteKeydown } = useMenuKeyboard(paletteMenuOpen, paletteButtonRef)

function pickPalette(id: PaletteId) {
  setPalette(id)
  paletteMenuOpen.value = false
}
```

і додати імпорт `import { useMenuKeyboard } from '~/composables/useMenuKeyboard'`.

Шаблон:

- кнопка палітри (`:141`, `data-testid="palette-menu-button"`) - додати `ref="paletteButtonRef"`;
- `<ul>` палітри (`:155-162`) - додати `ref="paletteListRef"`, три `@keydown.*` замінити на
  `@keydown="onPaletteKeydown"`;
- кнопка акаунта (`:217`, `data-testid="account-menu-button"`) - додати `ref="menuButtonRef"`;
- `<ul>` акаунта (`:241-248`) - додати `ref="menuListRef"`, три `@keydown.*` замінити на `@keydown="onMenuKeydown"`;
- обгортки `:139` і `:214` лишають `@keydown.escape.stop`, бо вони закривають меню, коли фокус на кнопці;
- усі 10 `tabindex="0"` на `<li role="menuitem*">` → `tabindex="-1"`.

- [ ] **Step 9.8: Run tests**

Run: `npx vitest run tests/unit/components tests/unit/composables`
Expected: PASS, включно з наявними Enter/Space/Escape-тестами `PlayerRow`.

Run: `npm run typecheck && npm run lint`
Expected: без помилок.

- [ ] **Step 9.9: Manual check**

`npm run dev`, кімната: Tab до кнопки палітри, Enter - фокус на першому пункті; стрілки циклічно; Escape повертає
фокус на кнопку; Tab з відкритого меню виходить із нього. Те саме для меню акаунта і меню гравця. Вибір пункту
«Історія раундів» відкриває модалку, після закриття фокус повертається на кнопку акаунта (Task 6 + цей крок).

- [ ] **Step 9.10: Commit**

```bash
git add app/composables/useMenuKeyboard.ts app/components/PlayerRow.vue app/components/AppHeader.vue \
  tests/unit/composables/useMenuKeyboard.spec.ts tests/unit/components/PlayerRow.spec.ts
git commit -m "feat: arrow-key navigation and focus return for role=menu dropdowns"
```

---

### Task 10: Іменовані пороги Goal Clarity (F-9)

**Files:**
- Modify: `app/utils/cardDecks.ts` (після `DECK_PRESETS`)
- Modify: `app/components/ResultsArea.vue:7, 50-61`
- Modify: `DESIGN.md` §11.7 (після списку порогів, рядок ~468)
- Test: `tests/unit/utils/cardDecks.spec.ts`

- [ ] **Step 10.1: Write the failing test**

Додати в `describe('cardDecks')`:

```ts
  it('exposes the goal clarity thresholds as named constants', () => {
    expect(GOAL_CLARITY_THRESHOLDS).toEqual({ clear: 3.5, unclear: 2.5 })
  })
```

і розширити імпорт: `import { getDeck, GOAL_CLARITY_THRESHOLDS } from '~/utils/cardDecks'`.

- [ ] **Step 10.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/cardDecks.spec.ts`
Expected: FAIL - `GOAL_CLARITY_THRESHOLDS` не експортовано.

- [ ] **Step 10.3: Add the constants**

У `app/utils/cardDecks.ts` після масиву `DECK_PRESETS` (перед `VOTING_BASE_CARDS`) додати:

```ts
export const GOAL_CLARITY_THRESHOLDS = { clear: 3.5, unclear: 2.5 } as const
```

- [ ] **Step 10.4: Use them in `ResultsArea.vue`**

Додати імпорт після рядка 7: `import { GOAL_CLARITY_THRESHOLDS } from '~/utils/cardDecks'`.

Замінити `:50-61`:

```ts
const goalClarityScoreColor = computed(() => {
  const n = Number(goalClarityAverage.value)
  if (!Number.isFinite(n)) return '#546e7a'
  if (n > GOAL_CLARITY_THRESHOLDS.clear) return '#43a047'
  if (n < GOAL_CLARITY_THRESHOLDS.unclear) return '#e64a19'
  return '#fbc02d'
})

const showGoalClarityHint = computed(() => {
  const n = Number(goalClarityAverage.value)
  return Number.isFinite(n) && n <= GOAL_CLARITY_THRESHOLDS.clear
})
```

- [ ] **Step 10.5: Document the origin in `DESIGN.md` §11.7**

Після рядка `- \`< 2.5\` - червоний \`#e64a19\`` додати абзац:

```markdown
Пороги `3.5` / `2.5` - продуктове рішення власника, а не похідна з даних; у коді вони живуть як
`GOAL_CLARITY_THRESHOLDS` (`app/utils/cardDecks.ts`) поруч із пресетом, і зсув межі означає зміну саме там.
```

- [ ] **Step 10.6: Run tests**

Run: `npx vitest run tests/unit/utils/cardDecks.spec.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 10.7: Commit**

```bash
git add app/utils/cardDecks.ts app/components/ResultsArea.vue DESIGN.md tests/unit/utils/cardDecks.spec.ts
git commit -m "refactor: name the goal clarity thresholds"
```

---

### Task 11: Фінальна верифікація й закриття аудиту

**Files:**
- Modify: `docs/audits/2026-09-07-frontend-design-audit.md` (шапка)
- Modify: `docs/specs/2026-09-08-frontend-audit-remediation-design.md` (статус)

- [ ] **Step 11.1: Run the CI check and page-load e2e**

```bash
npm run test:ci
npm run test:e2e:pages
```

Expected: обидва зелені.

- [ ] **Step 11.2: Re-run the audit's static checks**

```bash
rg -c 'prefers-reduced-motion' app/assets/css/main.css
rg -n 'documentElement.lang' app/i18n.ts
rg -n '<main' app/pages/*.vue | wc -l
rg -n 'aria-label' app/components/CardsArea.vue app/components/PlayerRow.vue
rg -n 'ArrowDown' app/composables/useMenuKeyboard.ts
rg -n 'role="status"' "app/pages/[slug].vue"
```

Expected: `1`; один рядок; `8` (7 сторінок + not-found-гілка кімнати); три `aria-label`; один хіт; один хіт.

- [ ] **Step 11.3: Mark the audit as remediated**

У шапку `docs/audits/2026-09-07-frontend-design-audit.md` після рядка `- Перший аудит проєкту: …` додати:

```markdown
- Статус: F-1…F-11 закриті планом `docs/plans/2026-09-08-frontend-audit-remediation.md` (2026-09-08);
  відкритими лишаються runtime-пункти з секції «Не перевірено»
```

У спеці змінити `**Статус:** проєкт` на `**Статус:** реалізовано`.

- [ ] **Step 11.4: Commit**

```bash
git add docs/audits/2026-09-07-frontend-design-audit.md docs/specs/2026-09-08-frontend-audit-remediation-design.md
git commit -m "docs: mark frontend audit findings as remediated"
```

Далі - `finishing-a-development-branch`: PR у `main`, squash-merge після зелених `test` / `page-load`.

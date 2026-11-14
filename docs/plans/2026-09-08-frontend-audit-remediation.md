# Frontend Audit Remediation Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan
> task-by-task. Steps use numbered checkbox (`1. [ ]`) syntax for tracking.

**Goal:** Resolve 11 findings from the audit `docs/audits/2026-09-07-frontend-design-audit.md` (reduced-motion, `lang`,
landmarks, accessible names, skip-link, focus restoration, arrow-key menus, a visible vote failure, Goal
Clarity thresholds, the `/ffc` toggle, the room `<title>`).

**Architecture:** Make targeted changes in existing files, with one new composable,
`useMenuKeyboard` (used in three places). Global rules (reduced-motion, skip-link) live in `main.css` and `App.vue`;
restore focus once in `AppModal`; put the rest in the components identified by the audit.

**Spec:** `docs/specs/2026-09-08-frontend-audit-remediation-design.md`

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, Tailwind v4, vue-i18n 11, Vitest + happy-dom 20 (provides
`showModal`/`close`/`matchMedia`), Playwright (`page-load` project, without Supabase). No new dependencies.

## Global Constraints

1. After each task: `npm run typecheck && npm run test:unit`; finish with `npm run test:ci` and
  `npm run test:e2e:pages`
2. 2 spaces, no tabs, one trailing newline; no code comments
3. Every new UI string goes in `app/i18n/locales/uk.json` **and** `en.json`
4. At the time of this plan, commit messages, code comments, and test names were in English; documentation in `docs/` was in Ukrainian
5. Commit each task during execution; squash-merge the branch into `main`
6. Use `git add` only for files in the task’s **Files** block; never use `git add -A`
7. Do not print secrets or environment values

---

### Task 1: Reduced motion - CSS and slot machine (F-1)

**Files:**
1. Modify: `app/assets/css/main.css` (add a block at the end of the file)
2. Modify: `app/components/SlotMachine.vue:130-159`
3. Test: `tests/unit/components/SlotMachine.spec.ts` (new)

**Interfaces:**
1. Consumes: `spinReels`, `isJackpot`, `buildReelStrip` from `~/utils/slotMachine` (already available)
2. Produces: nothing for other tasks

<!-- Separate lists. -->

1. [ ] **Step 1.1: Write the failing test**

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

2. [ ] **Step 1.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/components/SlotMachine.spec.ts`
Expected: FAIL - first test: `expected 12 to have length 1` (the strip is always built).

3. [ ] **Step 1.3: Implement reduced-motion path in `SlotMachine.vue`**

Replace the `spin()` function (`SlotMachine.vue:130-159`) with:

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

4. [ ] **Step 1.4: Add the global reduced-motion block to `main.css`**

Append to the end of `app/assets/css/main.css` (after the `:root[data-theme-transition] * { … }` block,
outside `@layer`):

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

The scoped `.celebration-layer` class from `ResultsArea.vue` matches the global selector: scoped adds an attribute,
and the class remains.

5. [ ] **Step 1.5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/SlotMachine.spec.ts tests/unit/utils/slotMachine.spec.ts`
Expected: PASS (both files).

Run: `rg -c 'prefers-reduced-motion' app/assets/css/main.css`
Expected: `1`

6. [ ] **Step 1.6: Commit**

```bash
git add app/assets/css/main.css app/components/SlotMachine.vue tests/unit/components/SlotMachine.spec.ts
git commit -m "feat: respect prefers-reduced-motion in CSS and slot machine"
```

---

### Task 2: Document `lang` follows the locale (F-2)

**Files:**
1. Modify: `app/i18n.ts`
2. Test: `tests/unit/i18n.spec.ts` (new)

**Interfaces:**
1. Produces: `persistLocale(code: string): void` (already exported; now also sets `document.documentElement.lang`)

<!-- Separate lists. -->

1. [ ] **Step 2.1: Write the failing test**

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

2. [ ] **Step 2.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/i18n.spec.ts`
Expected: FAIL - `expected 'uk' to be 'en'` in the first and third tests.

3. [ ] **Step 2.3: Implement**

Replace the contents of `app/i18n.ts` with:

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

`index.html` stays unchanged: `lang="uk"` remains the default until JS loads.

4. [ ] **Step 2.4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/i18n.spec.ts tests/unit/composables/useTheme.spec.ts`
Expected: PASS.

5. [ ] **Step 2.5: Commit**

```bash
git add app/i18n.ts tests/unit/i18n.spec.ts
git commit -m "fix: keep html lang in sync with the active locale"
```

---

### Task 3: Room `<main>`, `<h1>` and `<title>` (F-3, F-11)

**Files:**
1. Modify: `app/pages/[slug].vue:632-677` (template) and script after `headerSeed` (`:88`)
2. Modify: `app/components/AppHeader.vue:130-132`

**Interfaces:**
1. Produces: `main#main[tabindex="-1"]` on the room route (target for Task 4)

There is no test seam: `[slug].vue` pulls in Supabase, Realtime and the router. Verify with typecheck and a manual scenario.

1. [ ] **Step 3.1: Turn the room name into `<h1>` in `AppHeader.vue`**

In `AppHeader.vue:130-132`, replace:

```html
    <template v-if="roomName">
      <span class="mui-h6 text-lg text-appbar-emphasis">{{ roomName }}</span>
    </template>
```

with:

```html
    <h1
      v-if="roomName"
      class="mui-h6 text-lg text-appbar-emphasis"
    >
      {{ roomName }}
    </h1>
```

Tailwind preflight resets `h1` to `font-size: inherit; font-weight: inherit; margin: 0`, so its appearance will stay the same.

2. [ ] **Step 3.2: Wrap the room layout in `<main>` and add `<main>` to the not-found branch**

In `[slug].vue:677`, replace the opening tag

```html
    <div class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto">
```

with

```html
    <main
      id="main"
      tabindex="-1"
      class="flex flex-1 flex-col md:flex-row gap-6 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto outline-none"
    >
```

and replace the corresponding closing `</div>` (immediately before `<JoinOverlay`, `:768`) with `</main>`.

In the not-found branch (`:633-635`), replace

```html
  <div
    v-if="notFound"
    class="min-h-screen flex items-center justify-center p-4 bg-app"
  >
```

with

```html
  <main
    v-if="notFound"
    id="main"
    tabindex="-1"
    class="min-h-screen flex items-center justify-center p-4 bg-app outline-none"
  >
```

and replace the closing `</div>` of that branch (`:653`, before `<div v-else`) with `</main>`.

3. [ ] **Step 3.3: Set `document.title` from the room name**

In the `[slug].vue` script, immediately after `const headerSeed = ref<…>(readHeaderSeed())` (`:88`), add:

```ts
const roomTitle = computed(() => currentRoomName.value ?? currentSlug.value ?? headerSeed.value.roomName)

watch([() => route.path, roomTitle, notFound], ([, name, missing]) => {
  document.title = !missing && name ? `${name} | Story Poker` : 'Story Poker'
}, { immediate: true, flush: 'post' })
```

`currentSlug`/`currentRoomName` are declared earlier (`:82-83`), and `notFound` at `:69`. `flush: 'post'` is needed because
`router.afterEach` runs synchronously during `router.replace('/<slug>')` and sets `'Story Poker'`;
the post-flush watcher runs after it and takes precedence.

4. [ ] **Step 3.4: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

5. [ ] **Step 3.5: Manual check**

Run: `npm run dev`, open any room with a slug by id (`/<8 characters>`).

1. The browser tab shows `<room name> | Story Poker` even after redirecting to the slug.
2. In DevTools → Accessibility tree: one `main` landmark and one `heading level 1` with the room name.
3. Navigate to `/` - the tab title is `Home | Story Poker`.
4. Open `/nope-nope-nope` - there is a `<main>`, and the tab title is `Story Poker`.

<!-- Separate lists. -->

6. [ ] **Step 3.6: Commit**

```bash
git add "app/pages/[slug].vue" app/components/AppHeader.vue
git commit -m "feat: add main landmark, h1 and document title to the room page"
```

---

### Task 4: Skip-link (F-5)

**Files:**
1. Modify: `app/App.vue`
2. Modify: `app/pages/index.vue:150`, `app/pages/login.vue:60`, `app/pages/signup.vue:62`,
  `app/pages/forgot-password.vue:59`, `app/pages/reset-password.vue:79`, `app/pages/ffc.vue:69`
3. Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` (key `common.skipToContent`)
4. Test: `tests/e2e/page-load.spec.ts`

**Interfaces:**
1. Consumes: `main#main[tabindex="-1"]` from Task 3 (room)

<!-- Separate lists. -->

1. [ ] **Step 4.1: Write the failing e2e test**

Append to `tests/e2e/page-load.spec.ts`:

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

The `/login` route is intentional: `/` focuses the name field in `onMounted` (`index.vue:44`), so the first Tab
would not reach the skip link there.

2. [ ] **Step 4.2: Run the e2e test to verify it fails**

Run: `npx playwright test --project=page-load -g "skip link"`
Expected: FAIL - `a[href="#main"]` is not found.

3. [ ] **Step 4.3: Add i18n key**

In `en.json`, add `"skipToContent": "Skip to main content"` to the `"common"` block after `"confirmPassword"`;
in `uk.json`, add `"skipToContent": "Перейти до основного вмісту"`.

4. [ ] **Step 4.4: Add the link to `App.vue`**

Replace the `App.vue` template with:

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

5. [ ] **Step 4.5: Add `id="main" tabindex="-1"` to the other six `<main>` elements**

In each file below, add `id="main"` and `tabindex="-1"` to the `<main` tag and add `outline-none` to its classes:

1. `app/pages/index.vue:150`
2. `app/pages/login.vue:60`
3. `app/pages/signup.vue:62`
4. `app/pages/forgot-password.vue:59`
5. `app/pages/reset-password.vue:79`
6. `app/pages/ffc.vue:69`

Example for `login.vue`:

```html
    <main
      id="main"
      tabindex="-1"
      class="flex flex-1 items-center justify-center px-4 py-10 outline-none"
    >
```

6. [ ] **Step 4.6: Run e2e and unit**

Run: `npx playwright test --project=page-load`
Expected: PASS (all public routes + skip link).

Run: `npm run typecheck && npm run test:unit`
Expected: PASS.

7. [ ] **Step 4.7: Commit**

```bash
git add app/App.vue app/pages/index.vue app/pages/login.vue app/pages/signup.vue \
  app/pages/forgot-password.vue app/pages/reset-password.vue app/pages/ffc.vue \
  app/i18n/locales/uk.json app/i18n/locales/en.json tests/e2e/page-load.spec.ts
git commit -m "feat: add skip link and focusable main landmarks"
```

---

### Task 5: Accessible names for three icon-only buttons (F-4)

**Files:**
1. Modify: `app/components/CardsArea.vue:283-312`
2. Modify: `app/components/PlayerRow.vue:290-296`
3. Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` (key `players.menuFor`)
4. Test: `tests/unit/components/PlayerRow.spec.ts`, `tests/unit/components/CardsArea.spec.ts` (new)

<!-- Separate lists. -->

1. [ ] **Step 5.1: Write the failing tests**

In `tests/unit/components/PlayerRow.spec.ts`, replace `messages: { en: {} }` with:

```ts
  messages: { en: { players: { menuFor: 'Player menu: {name}' } } },
```

and add a new `describe` at the end of the file:

```ts
describe('PlayerRow menu button name', () => {
  it('names the menu button after the player', () => {
    const wrapper = mountRow()
    expect(wrapper.get('button[aria-expanded]').attributes('aria-label')).toBe('Player menu: Alice')
  })
})
```

New `tests/unit/components/CardsArea.spec.ts`:

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

2. [ ] **Step 5.2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/PlayerRow.spec.ts tests/unit/components/CardsArea.spec.ts`
Expected: FAIL - `aria-label` undefined; `[data-testid="last-round-button"]` is not found.

3. [ ] **Step 5.3: Add i18n key**

`en.json`, `"players"` block, after `"kickPlayer"`: `"menuFor": "Player menu: {name}"`.
`uk.json`, in the same place: `"menuFor": "Меню гравця: {name}"`.

4. [ ] **Step 5.4: Add names in `CardsArea.vue`**

Add three attributes to the `toggleLastRound` button (`:283-289`):

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

For the reset button (`:305-312`), add `:aria-label="$t('cards.reset')"` before `data-testid="reset-button"`.

5. [ ] **Step 5.5: Add name in `PlayerRow.vue`**

For the menu button (`:290-296`), add `:aria-label="$t('players.menuFor', { name: player.name })"` before
`:aria-expanded="menuOpen"`.

6. [ ] **Step 5.6: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components`
Expected: PASS.

7. [ ] **Step 5.7: Commit**

```bash
git add app/components/CardsArea.vue app/components/PlayerRow.vue \
  app/i18n/locales/uk.json app/i18n/locales/en.json \
  tests/unit/components/PlayerRow.spec.ts tests/unit/components/CardsArea.spec.ts
git commit -m "fix: give icon-only room controls accessible names"
```

---

### Task 6: `AppModal` returns focus to the trigger (F-6)

**Files:**
1. Modify: `app/components/AppModal.vue:1-33`
2. Test: `tests/unit/components/AppModal.spec.ts`

<!-- Separate lists. -->

1. [ ] **Step 6.1: Write the failing tests**

Add an import of `nextTick` from `vue` and a new `describe` to `AppModal.spec.ts`:

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

2. [ ] **Step 6.2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/AppModal.spec.ts`
Expected: FAIL - `document.activeElement` is `<body>` instead of the trigger.

3. [ ] **Step 6.3: Implement**

Replace `<script setup>` in `AppModal.vue` with:

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

The template remains unchanged.

4. [ ] **Step 6.4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/AppModal.spec.ts tests/unit/components/UserSettingsModal.spec.ts`
Expected: PASS.

5. [ ] **Step 6.5: Commit**

```bash
git add app/components/AppModal.vue tests/unit/components/AppModal.spec.ts
git commit -m "fix: return focus to the opener when AppModal closes"
```

---

### Task 7: Keyboard operation of the `/ffc` switch (F-10)

**Files:**
1. Modify: `app/pages/ffc.vue:79-90`
2. Modify: `app/assets/css/main.css:943-947` (`.mui-switch input`) + a new focus rule
3. Test: `tests/e2e/page-load.spec.ts`

There is no unit test seam: `ffc.vue` initializes the auth store in `onMounted`. `/ffc` is already in the `page-load`
project without Supabase, so the test is e2e.

1. [ ] **Step 7.1: Write the failing e2e test**

Append to `tests/e2e/page-load.spec.ts`:

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

2. [ ] **Step 7.2: Run the e2e test to verify it fails**

Tab from `#ffc-iconsRounded` to `#ffc-example` proves Tab reachability, which the audit identifies as a defect;
`locator.focus()` on the target itself would also work on an unreachable element. There are no other focusable
elements between these two cards.

Run: `npx playwright test --project=page-load -g "feature flag switch"`
Expected: FAIL - `toBeFocused` (the input has `width: 0; height: 0`, or `toBeChecked` after Space).

3. [ ] **Step 7.3: Rewrite the switch markup in `ffc.vue`**

Replace `ffc.vue:79-90`:

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

with:

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

`<input>` must remain the first sibling: the `input:checked + .track` and `input:checked ~ .thumb` rules in
`main.css:967-975` depend on it.

4. [ ] **Step 7.4: Make the input focusable in `main.css`**

Leave the `.mui-switch input` rule (`main.css:943-947`) unchanged; immediately after it, add:

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

The selector is intentionally scoped to `label.mui-switch`: `PlayerRow.vue:327-336` has a decorative `.mui-switch` in
a `<span>` inside `role="menuitem"`. If its `<input>` became clickable across the entire switch, a click would natively
toggle `checked` before `toggleModerator` completes through Supabase.

5. [ ] **Step 7.5: Run e2e and unit**

Run: `npx playwright test --project=page-load`
Expected: PASS.

Run: `npm run typecheck && npm run test:unit`
Expected: PASS.

6. [ ] **Step 7.6: Commit**

```bash
git add app/pages/ffc.vue app/assets/css/main.css tests/e2e/page-load.spec.ts
git commit -m "fix: make feature flag switches native keyboard-operable checkboxes"
```

---

### Task 8: Visible vote and edit failures (F-8)

**Files:**
1. Modify: `app/pages/[slug].vue:443-453` (`handleVote`), `:545-556` (`handleSaveEdit`), template after `<CardsArea …/>`
2. Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` (keys `room.voteFailed`, `room.saveFailed`)

There is no test seam (the page depends on Supabase). Verify with typecheck and a manual scenario. The full notification layer
with retry is covered by `docs/initiatives/error-handling.md` and is out of scope here.

1. [ ] **Step 8.1: Add i18n keys**

`en.json`, the `"room"` block, after `"notFoundBackHome"`:

```json
    "voteFailed": "Your vote was not saved. Check the connection and try again.",
    "saveFailed": "Changes were not saved. Check the connection and try again."
```

`uk.json`, in the same place:

```json
    "voteFailed": "Голос не збережено. Перевір з'єднання і спробуй ще раз.",
    "saveFailed": "Зміни не збережено. Перевір з'єднання і спробуй ще раз."
```

2. [ ] **Step 8.2: Add the status state and handlers**

In the `[slug].vue` script, add after `const showLastRound = ref(false)` (`:95`):

```ts
const actionNotice = ref<string | null>(null)
let actionNoticeTimer: ReturnType<typeof setTimeout> | undefined

function showActionNotice(message: string) {
  actionNotice.value = message
  clearTimeout(actionNoticeTimer)
  actionNoticeTimer = setTimeout(() => { actionNotice.value = null }, 5000)
}
```

Add `clearTimeout(actionNoticeTimer)` to the existing `onUnmounted` (`:334`, the one that removes channels).

Replace `handleVote` (`:443-453`) with:

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

Replace `handleSaveEdit` (`:545-556`) with:

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

`t` is already destructured from `useI18n()` (`:97`).

3. [ ] **Step 8.3: Render the live region**

In the template, add immediately after the closing `/>` of `<CardsArea … />` (`:766`):

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

The container is always present (empty until an error occurs): the live region announces changes only if it existed before them.

4. [ ] **Step 8.4: Typecheck, lint, manual check**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

Manual: run `npm run dev`, enter a room, enable Offline in DevTools → Network, and click a card.
Expected: the card briefly highlights and reverts; the `room.voteFailed` text appears below the grid and disappears
after 5 seconds. In DevTools → Accessibility, the text is announced as `status`.

5. [ ] **Step 8.5: Commit**

```bash
git add "app/pages/[slug].vue" app/i18n/locales/uk.json app/i18n/locales/en.json
git commit -m "feat: announce failed vote and player edit in a live region"
```

---

### Task 9: Arrow-key menus using `useMenuKeyboard` (F-7)

**Files:**
1. Create: `app/composables/useMenuKeyboard.ts`
2. Modify: `app/components/PlayerRow.vue:50-58, 285-312` and all 5 `tabindex="0"` attributes on items
3. Modify: `app/components/AppHeader.vue:88-106, 136-162, 212-248` and all 10 `tabindex="0"` attributes on items
4. Test: `tests/unit/composables/useMenuKeyboard.spec.ts` (new), `tests/unit/components/PlayerRow.spec.ts`

**Interfaces:**
1. Produces:

```ts
export function useMenuKeyboard(open: Ref<boolean>, trigger: Ref<HTMLElement | null>): {
  menuEl: Ref<HTMLElement | null>
  onKeydown: (e: KeyboardEvent) => void
}
```

  `menuEl` is bound to `<ul role="menu">` and `trigger` to the trigger button. When `open → true`, focus moves to
  the first `[role^="menuitem"]`; when `open → false`, it returns to `trigger`. Attach `onKeydown` to `<ul>`.

1. [ ] **Step 9.1: Write the failing composable test**

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

2. [ ] **Step 9.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useMenuKeyboard.spec.ts`
Expected: FAIL - `Cannot find module '~/composables/useMenuKeyboard'`.

3. [ ] **Step 9.3: Implement the composable**

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

The two watchers are intentional: opening uses `flush: 'post'` because `<ul v-if>` appears only after rendering; closing uses
pre-flush because `<ul>` is still in the DOM and `contains(document.activeElement)` distinguishes keyboard or item-selection
closure (focus is inside the menu, so return it to the trigger) from `useClickOutside` (focus is already elsewhere, so leave it).
Without this check, clicking an input while the menu is open would steal focus back to the button.

4. [ ] **Step 9.4: Run composable test to verify it passes**

Run: `npx vitest run tests/unit/composables/useMenuKeyboard.spec.ts`
Expected: PASS.

5. [ ] **Step 9.5: Extend `PlayerRow.spec.ts` with an arrow-key expectation**

Add to `describe('PlayerRow menu keyboard support')`:

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
Expected: FAIL on the new test (focus is on `body`).

6. [ ] **Step 9.6: Wire `PlayerRow.vue`**

Script: replace `PlayerRow.vue:51-58`

```ts
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })

function activateMenuItem(e: KeyboardEvent) {
  const item = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]')
  item?.click()
}
```

with

```ts
const menuRef = ref<HTMLElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })
const { menuEl: menuListRef, onKeydown: onMenuKeydown } = useMenuKeyboard(menuOpen, menuButtonRef)
```

and add the import `import { useMenuKeyboard } from '~/composables/useMenuKeyboard'`.

Template: add `ref="menuButtonRef"` to the menu button (`:290`); replace the `<ul>` (`:305-312`)

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

with

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

Replace `tabindex="0"` with `tabindex="-1"` on all 5 `<li role="menuitem" tabindex="0">` elements in this file.

7. [ ] **Step 9.7: Wire both menus in `AppHeader.vue`**

Script: replace `AppHeader.vue:88-106`

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

with

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

and add the import `import { useMenuKeyboard } from '~/composables/useMenuKeyboard'`.

Template:

1. palette button (`:141`, `data-testid="palette-menu-button"`): add `ref="paletteButtonRef"`;
2. palette `<ul>` (`:155-162`): add `ref="paletteListRef"` and replace the three `@keydown.*` handlers with
  `@keydown="onPaletteKeydown"`;
3. account button (`:217`, `data-testid="account-menu-button"`): add `ref="menuButtonRef"`;
4. account `<ul>` (`:241-248`): add `ref="menuListRef"` and replace the three `@keydown.*` handlers with `@keydown="onMenuKeydown"`;
5. wrappers `:139` and `:214` keep `@keydown.escape.stop`, because they close menus when focus is on the button;
6. change all 10 `tabindex="0"` on `<li role="menuitem*">` to `tabindex="-1"`.

<!-- Separate lists. -->

8. [ ] **Step 9.8: Run tests**

Run: `npx vitest run tests/unit/components tests/unit/composables`
Expected: PASS, including existing `PlayerRow` Enter/Space/Escape tests.

Run: `npm run typecheck && npm run lint`
Expected: no errors.

9. [ ] **Step 9.9: Manual check**

Run `npm run dev` and enter a room: Tab to the palette button, then press Enter to focus the first item; arrow keys wrap; Escape returns
focus to the button; Tab exits the open menu. Repeat for the account and player menus. Selecting
«Історія раундів» (Round history) opens a modal; after it closes, focus returns to the account button (Task 6 + this step).

10. [ ] **Step 9.10: Commit**

```bash
git add app/composables/useMenuKeyboard.ts app/components/PlayerRow.vue app/components/AppHeader.vue \
  tests/unit/composables/useMenuKeyboard.spec.ts tests/unit/components/PlayerRow.spec.ts
git commit -m "feat: arrow-key navigation and focus return for role=menu dropdowns"
```

---

### Task 10: Named Goal Clarity thresholds (F-9)

**Files:**
1. Modify: `app/utils/cardDecks.ts` (after `DECK_PRESETS`)
2. Modify: `app/components/ResultsArea.vue:7, 50-61`
3. Modify: `DESIGN.md` §11.7 (after the thresholds list, line ~468)
4. Test: `tests/unit/utils/cardDecks.spec.ts`

<!-- Separate lists. -->

1. [ ] **Step 10.1: Write the failing test**

Add to `describe('cardDecks')`:

```ts
  it('exposes the goal clarity thresholds as named constants', () => {
    expect(GOAL_CLARITY_THRESHOLDS).toEqual({ clear: 3.5, unclear: 2.5 })
  })
```

and extend the import: `import { getDeck, GOAL_CLARITY_THRESHOLDS } from '~/utils/cardDecks'`.

2. [ ] **Step 10.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/utils/cardDecks.spec.ts`
Expected: FAIL - `GOAL_CLARITY_THRESHOLDS` is not exported.

3. [ ] **Step 10.3: Add the constants**

In `app/utils/cardDecks.ts`, add after the `DECK_PRESETS` array (before `VOTING_BASE_CARDS`):

```ts
export const GOAL_CLARITY_THRESHOLDS = { clear: 3.5, unclear: 2.5 } as const
```

4. [ ] **Step 10.4: Use them in `ResultsArea.vue`**

Add the import after line 7: `import { GOAL_CLARITY_THRESHOLDS } from '~/utils/cardDecks'`.

Replace `:50-61`:

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

5. [ ] **Step 10.5: Document the origin in `DESIGN.md` §11.7**

After the line `- \`< 2.5\` - червоний \`#e64a19\`` (red), add the paragraph:

```markdown
The `3.5` / `2.5` thresholds are the owner's product decision and are not derived from data. In code, they live as
`GOAL_CLARITY_THRESHOLDS` (`app/utils/cardDecks.ts`) beside the preset; change them there when shifting a boundary.
```

6. [ ] **Step 10.6: Run tests**

Run: `npx vitest run tests/unit/utils/cardDecks.spec.ts && npm run typecheck`
Expected: PASS.

7. [ ] **Step 10.7: Commit**

```bash
git add app/utils/cardDecks.ts app/components/ResultsArea.vue DESIGN.md tests/unit/utils/cardDecks.spec.ts
git commit -m "refactor: name the goal clarity thresholds"
```

---

### Task 11: Final verification and audit closure

**Files:**
1. Modify: `docs/audits/2026-09-07-frontend-design-audit.md` (header)
2. Modify: `docs/specs/2026-09-08-frontend-audit-remediation-design.md` (status)

<!-- Separate lists. -->

1. [ ] **Step 11.1: Run the CI check and page-load e2e**

```bash
npm run test:ci
npm run test:e2e:pages
```

Expected: both pass.

2. [ ] **Step 11.2: Re-run the audit's static checks**

```bash
rg -c 'prefers-reduced-motion' app/assets/css/main.css
rg -n 'documentElement.lang' app/i18n.ts
rg -n '<main' app/pages/*.vue | wc -l
rg -n 'aria-label' app/components/CardsArea.vue app/components/PlayerRow.vue
rg -n 'ArrowDown' app/composables/useMenuKeyboard.ts
rg -n 'role="status"' "app/pages/[slug].vue"
```

Expected: `1`; one line; `8` (7 pages + the room not-found branch); three `aria-label` entries; one hit; one hit.

3. [ ] **Step 11.3: Mark the audit as remediated**

In the header of `docs/audits/2026-09-07-frontend-design-audit.md`, after the line `- Перший аудит проєкту: …` (first project audit), add:

```markdown
- Status: F-1…F-11 are closed by `docs/plans/2026-09-08-frontend-audit-remediation.md` (2026-09-08);
  runtime items in the «Не перевірено» (Not checked) section remain open
```

In the spec, change `**Статус:** проєкт` (Status: draft) to `**Статус:** реалізовано` (Status: implemented).

4. [ ] **Step 11.4: Commit**

```bash
git add docs/audits/2026-09-07-frontend-design-audit.md docs/specs/2026-09-08-frontend-audit-remediation-design.md
git commit -m "docs: mark frontend audit findings as remediated"
```

Next, use `finishing-a-development-branch`: open a PR into `main` and squash-merge after `test` / `page-load` pass.

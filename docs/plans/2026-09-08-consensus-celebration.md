# Consensus Celebration Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan
> task-by-task. Steps use checkbox (`1. [ ]`) syntax for tracking.

**Goal:** One consensus predicate with a threshold of ≥ 2 votes controls both confetti and sound; the “Рішення прийнято” (“Decision made”) sound plays on
every reveal with consensus; the user controls the volume of all sounds with a slider in the header.

**Architecture:** Replace `shouldCelebrateGroupedVotes` with `shouldCelebrate(votes, grouped)` in the existing
`app/utils/resultCelebration.ts`; both consumers (`[slug].vue`, `ResultsArea.vue`) switch to it.
Move decision sound playback from `finishCountdown` to the phase watcher in `[slug].vue` so it has one source.
Volume uses a new `useSoundVolume` composable with a module-level `ref` (the `useTheme` pattern), consumed by
`useCountdown`, `SlotMachine`, and the slider in `AppHeader`.

**Spec:** `docs/specs/2026-09-08-consensus-celebration-design.md`

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, Tailwind v4, vue-i18n 11, Vitest + happy-dom 20, Playwright
(`page-load` project, without Supabase). There are no new dependencies.

## Global Constraints

1. After each task: `npm run typecheck && npm run test:unit`; finish with `npm run test:ci` and
  `npm run test:e2e:pages`
1. 2 spaces, no tabs, one trailing newline; no code comments
1. Every new UI string goes in `app/i18n/locales/uk.json` **and** `en.json`
1. At the time of this plan, commit messages, code comments, and test names were in English; documentation in `docs/` was in Ukrainian
1. One commit per task during execution; the branch is squash-merged into `main`
1. `git add` only files in the task’s **Files** block; never use `git add -A`
1. Do not print secrets or environment values
1. The root `AGENTS.md` has exactly 150 lines, the limit is 150; offset any increase within the same task

---

### Task 1: Single consensus predicate with a threshold of ≥ 2

**Files:**
1. Modify: `app/utils/resultCelebration.ts:16-37`
1. Modify: `app/components/ResultsArea.vue:4,75`
1. Modify: `app/pages/[slug].vue:21,200-206`
1. Test: `tests/unit/utils/resultCelebration.spec.ts:1-61`
1. Test: `tests/unit/components/ResultsArea.spec.ts` (new)

**Interfaces:**
1. Consumes: nothing from previous tasks
1. Produces: `shouldCelebrate(votes: Record<string, number>, grouped: { general: Record<string, number>; qa:
  Record<string, number> } | null | undefined): boolean` - used by Task 2 (sound) through `isConsensus`

<!-- Separate lists. -->

1. [ ] **Step 1.1: Write the failing tests**

In `tests/unit/utils/resultCelebration.spec.ts`, replace the import and every call to `shouldCelebrateGroupedVotes` with
`shouldCelebrate`. Existing grouped cases pass `{}` as the first argument (the first argument is ignored in grouped
mode). The complete new content of the `resultCelebration` describe block before the `creates particles` test:

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

The `creates particles with correct confetti properties` test and the closing `})` remain unchanged.

1. [ ] **Step 1.2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/utils/resultCelebration.spec.ts`
Expected: FAIL - `shouldCelebrate` is not exported from `~/utils/resultCelebration`.

1. [ ] **Step 1.2a: Write the failing component test**

Regression test for the defect in the spec: the live `<ResultsArea>` receives `:grouped-votes="groupedVoteCounts"`, which
is `null` without QA players, so the old predicate never showed confetti in a room without roles. The mounting fixture
follows `tests/unit/components/CardsArea.spec.ts`; `PieChart` is pure SVG, but a stub avoids an extra render.

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

1. [ ] **Step 1.2b: Run the component test to verify it fails**

Run: `npx vitest run tests/unit/components/ResultsArea.spec.ts`
Expected: FAIL - the first test (`celebrates when every vote matches and grouped votes are absent`): at HEAD
`celebrate` ignores `votes`, so `.celebration-layer` is absent.

1. [ ] **Step 1.3: Implement the predicate**

In `app/utils/resultCelebration.ts`, replace `getUnanimousVote`, `hasVotes` and `shouldCelebrateGroupedVotes`
(lines 16-37) with:

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

`type VoteCounts`, `interface CelebrationParticle` and `createCelebrationParticles` remain unchanged.

1. [ ] **Step 1.4: Run the predicate tests to verify they pass**

Run: `npx vitest run tests/unit/utils/resultCelebration.spec.ts`
Expected: PASS (15 tests).

1. [ ] **Step 1.5: Switch ResultsArea to the new predicate**

`app/components/ResultsArea.vue:4` - import:

```ts
import { createCelebrationParticles, shouldCelebrate } from '~/utils/resultCelebration'
```

`app/components/ResultsArea.vue:75`:

```ts
const celebrate = computed(() => !props.disableCelebration && shouldCelebrate(props.votes, props.groupedVotes))
```

1. [ ] **Step 1.5a: Run the component test to verify it passes**

Run: `npx vitest run tests/unit/components/ResultsArea.spec.ts`
Expected: PASS (4 tests).

1. [ ] **Step 1.6: Switch [slug].vue to the new predicate**

`app/pages/[slug].vue:21` - import:

```ts
import { shouldCelebrate } from '~/utils/resultCelebration'
```

`app/pages/[slug].vue:200-206` - replace all of `isConsensus` with:

```ts
const isConsensus = computed(() => {
  if (isPollDeck.value) return false
  return shouldCelebrate(voteCounts.value, groupedVoteCounts.value)
})
```

`voteCounts` and `groupedVoteCounts` are declared below (`:215`, `:223`), but this is a `computed`: hoisting through
`const` in setup scope works because access is deferred until `isConsensus` is first read.

The vote source for `isConsensus` changes deliberately: it uses `voteCounts` from `visiblePlayers` instead of
`playersForUi` (which contains `pendingVotes` through `voteOf` and the `showLastRound` substitution, `[slug].vue:123-130`).
This is the same data `celebrate` sees in `ResultsArea`. The phase watcher clears `pendingVotes` before the sound
line (Task 2), so sound and confetti read the same data.

1. [ ] **Step 1.7: Verify no stale references remain**

Run: `rg 'shouldCelebrateGroupedVotes' app tests`
Expected: no matches.

1. [ ] **Step 1.8: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: both PASS.

1. [ ] **Step 1.9: Commit**

```bash
git add app/utils/resultCelebration.ts app/components/ResultsArea.vue app/pages/\[slug\].vue \
  tests/unit/utils/resultCelebration.spec.ts tests/unit/components/ResultsArea.spec.ts
git commit -m "feat: require at least two matching votes for a consensus celebration"
```

---

### Task 2: Decision sound on every reveal

**Files:**
1. Modify: `app/composables/useCountdown.ts:70-83,120-127`
1. Modify: `app/pages/[slug].vue:208,317-338`

**Interfaces:**
1. Consumes: `isConsensus` from Task 1
1. Produces: `playDecision(): void` from `useCountdown()` - used only indirectly by Task 4 (volume)

<!-- Separate lists. -->

1. [ ] **Step 2.1: Move the decision sound out of finishCountdown**

`app/composables/useCountdown.ts` uses 4-space indentation (an exception to Global Constraints; do not
reformat the file); the snippets below follow it.

First rename the callback, because after this step it only suppresses `ambience` and no longer plays the decision sound:
`shouldPlayDecision` → `hasConsensus` (lines 21, 44, 85, 98), and rename the `withDecision` parameter → `hasConsensus` in
the `startCountdown` signature (line 88). The call in `[slug].vue:411` passes the callback positionally and stays unchanged.

Next, in `finishCountdown`, replace the `if (currentMode === 'wet') { … }` block (lines 76-82) with:

```ts
        if (currentMode === 'wet' && !hasConsensus?.() && ambienceAudio) {
            ambienceAudio.currentTime = 0
            ambienceAudio.play().catch(() => {})
        }
```

The rest of `finishCountdown` (`clearTimeout`, resetting refs, `onCountdownComplete?.()`, clearing both callbacks)
remains unchanged.

1. [ ] **Step 2.2: Export playDecision**

`app/composables/useCountdown.ts` - add a function immediately after `finishCountdown`:

```ts
    function playDecision() {
        if (!decisionAudio) return
        decisionAudio.currentTime = 0
        decisionAudio.play().catch(() => {})
    }
```

Add `playDecision` to the return object (lines 120-127), after `startCountdown`:

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

1. [ ] **Step 2.3: Destructure playDecision in [slug].vue**

`app/pages/[slug].vue:208`:

```ts
const { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown, playDecision } = useCountdown()
```

1. [ ] **Step 2.4: Trigger the sound on the phase watcher**

`app/pages/[slug].vue:317` - the `() => roomState.value?.phase` watcher. In the `if (phase === 'revealed') { … }` branch,
immediately after `showLastRound.value = false` (the last line of the branch), add:

```ts
    if (prev === 'voting' && isConsensus.value) playDecision()
```

The `prev === 'voting'` guard is required: the watcher also fires on `undefined → 'revealed'` during the first
`fetchInitialData`, so without it entering an already revealed room would play the sound on page load.

1. [ ] **Step 2.5: Verify no test asserts the old wet-mode behavior**

Run: `rg 'decisionAudio|the-decision-has-been-made|shouldPlayDecision|withDecision' app tests`
Expected: matches only in `app/composables/useCountdown.ts` (`decisionAudio`); there are currently no tests for `useCountdown`.

1. [ ] **Step 2.6: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: both PASS.

1. [ ] **Step 2.7: Manual verification (no unit seam)**

`HTMLAudioElement.play()` in happy-dom does not play sound, so there is no automated seam here. Manual scenario
(`npm run dev`, two tabs in the same room, both players without a QA shield):

1. Both vote the same → moderator presses Reveal without a countdown → “Рішення прийнято” (“Decision made”) sound in both tabs.
2. Different votes → Reveal → silence.
3. Countdown “з атмосферою” (“with atmosphere”) with consensus → decision sound plays at the end (once, not twice).
4. Countdown “з атмосферою” (“with atmosphere”) without consensus → `ambience`.
5. Reload a tab in an already revealed room → silence (`prev === 'voting'` guard).
6. Disconnect during voting (offline in DevTools), reveal from another tab, reconnect → the sound
   plays once after reconnecting: `fetchInitialData` in the `connectionStatus` watcher (`[slug].vue:304-308`) produces
   a late `voting → revealed` transition. This is accepted as expected behavior. A hidden tab with a live socket
   receives the reveal immediately, so at `visibilitychange` the transition is already `revealed → revealed` and the sound does not repeat.

<!-- Separate lists. -->

1. [ ] **Step 2.8: Commit**

```bash
git add app/composables/useCountdown.ts app/pages/\[slug\].vue
git commit -m "feat: play the decision sound on every consensus reveal"
```

---

### Task 3: Volume composable

**Files:**
1. Create: `app/composables/useSoundVolume.ts`
1. Modify: `app/App.vue:2-7`
1. Test: `tests/unit/composables/useSoundVolume.spec.ts` (new)

**Interfaces:**
1. Consumes: nothing from previous tasks
1. Produces: `useSoundVolume(): { volume: Ref<number>, initVolume: () => void, setVolume: (value: number) => void }`
   1. `volume` ranges from `0` to `1`; `initVolume` is called once in `App.vue`; `volume`/`setVolume`
      are used by Task 4 (`useCountdown`, `SlotMachine`) and Task 5 (slider)

<!-- Separate lists. -->

1. [ ] **Step 3.1: Write the failing test**

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

1. [ ] **Step 3.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useSoundVolume.spec.ts`
Expected: FAIL - the `~/composables/useSoundVolume` module does not exist.

1. [ ] **Step 3.3: Implement the composable**

`app/composables/useSoundVolume.ts` (a module-level `ref` for shared state, following the same pattern as
`theme`/`palette` in `app/composables/useTheme.ts`):

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

1. [ ] **Step 3.4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useSoundVolume.spec.ts`
Expected: PASS (6 tests).

1. [ ] **Step 3.5: Initialise the stored volume at startup**

`app/App.vue` - call synchronously in the root component setup: `initVolume` only reads `localStorage` in
`try/catch` and does not need the DOM, while `App` setup runs before the setup and `onMounted` of any page
(a child component's `onMounted` runs before its parent's, so do not put `initVolume` there). Replace
lines 2-7 with:

```ts
import { onMounted } from 'vue'
import ConnectionBanner from '~/components/ConnectionBanner.vue'
import { useSoundVolume } from '~/composables/useSoundVolume'
import { useTheme } from '~/composables/useTheme'

const { init } = useTheme()
useSoundVolume().initVolume()
onMounted(() => init())
```

1. [ ] **Step 3.6: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS for both.

1. [ ] **Step 3.7: Commit**

```bash
git add app/composables/useSoundVolume.ts app/App.vue tests/unit/composables/useSoundVolume.spec.ts
git commit -m "feat: add a persisted sound volume composable"
```

---

### Task 4: Apply volume to sounds

**Files:**
1. Modify: `app/composables/useCountdown.ts:1-6,113-119`
1. Modify: `app/components/SlotMachine.vue:42-54`
1. Test: `tests/unit/composables/useCountdown.spec.ts` (new)

**Interfaces:**
1. Consumes: `useSoundVolume()` from Task 3
1. Produces: nothing for other tasks

<!-- Separate lists. -->

1. [ ] **Step 4.1: Write the failing test**

`tests/unit/composables/useCountdown.spec.ts`. The test mounts a wrapper component because `useCountdown` creates
`Audio` in `onMounted`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

  afterEach(() => {
    vi.unstubAllGlobals()
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

1. [ ] **Step 4.2: Run test to verify it fails**

Run: `npx vitest run tests/unit/composables/useCountdown.spec.ts`
Expected: FAIL - `volume` remains `1` because `useCountdown` does not set it.

1. [ ] **Step 4.3: Apply volume in useCountdown**

`app/composables/useCountdown.ts` - on line 6, extend the `vue` import and add the composable import:

```ts
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSoundVolume } from '~/composables/useSoundVolume'
```

Inside `useCountdown()`, immediately after the ref declarations (`countdownRunning`), add:

```ts
    const { volume } = useSoundVolume()

    function applyVolume() {
        for (const audio of [pleaseVoteAudio, countdownDryAudio, countdownWetAudio, ambienceAudio, decisionAudio]) {
            if (audio) audio.volume = volume.value
        }
    }

    watch(volume, applyVolume)
```

In `onMounted`, after creating `decisionAudio` (line 118), add the call:

```ts
        applyVolume()
```

1. [ ] **Step 4.4: Run test to verify it passes**

Run: `npx vitest run tests/unit/composables/useCountdown.spec.ts`
Expected: PASS (2 tests).

1. [ ] **Step 4.5: Apply volume to the slot machine tick**

`app/components/SlotMachine.vue` - add an import to the existing import block:

```ts
import { useSoundVolume } from '~/composables/useSoundVolume'
```

Alongside the other setup-scope declarations:

```ts
const { volume: soundVolume } = useSoundVolume()
```

In `playTick` (lines 43-49), add an early return as the first line of the function and replace the line
`gain.gain.setValueAtTime(0.045, audioCtx.currentTime)`:

```ts
function playTick() {
  if (soundVolume.value === 0) return
  audioCtx ??= new AudioContext()
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'triangle'
  osc.frequency.value = 1400
  gain.gain.setValueAtTime(0.045 * soundVolume.value, audioCtx.currentTime)
```

Leave the rest of the function (`exponentialRampToValueAtTime`, `connect`, `start`, `stop`) unchanged. The multiplier preserves
the tick's relative quietness: behavior at full volume remains unchanged. The early return at `0` avoids creating an `AudioContext`
for silence.

1. [ ] **Step 4.6: Run typecheck and the unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: PASS for both; the existing `tests/unit/components/SlotMachine.spec.ts` remains green.

1. [ ] **Step 4.7: Commit**

```bash
git add app/composables/useCountdown.ts app/components/SlotMachine.vue \
  tests/unit/composables/useCountdown.spec.ts
git commit -m "feat: apply the volume setting to countdown and slot sounds"
```

---

### Task 5: Volume slider in the header

**Files:**
1. Modify: `app/components/AppHeader.vue:1-12,88-108,140-150`
1. Modify: `app/utils/iconMap.ts:31`
1. Modify: `app/i18n/locales/uk.json` (`header` section)
1. Modify: `app/i18n/locales/en.json` (`header` section)
1. Test: `tests/e2e/page-load.spec.ts` (add a test)

**Interfaces:**
1. Consumes: `useSoundVolume()` from Task 3
1. Produces: nothing for other tasks

The slider is deliberately placed **outside** both `role="menu"` dropdowns: `useMenuKeyboard` intercepts
`ArrowUp`/`ArrowDown` to navigate items, and the ARIA `menu` model does not allow a `slider` as content.

1. [ ] **Step 5.1: Add i18n keys**

`"themePalette"` - the last key in the `"header"` section of both files (`uk.json:32`, `en.json:32`) and has no trailing
comma. Add a comma after it and insert `"volume"` as the new last key without a trailing comma.

`app/i18n/locales/uk.json`:

```json
    "themePalette": "Кольорова тема",
    "volume": "Гучність звуку"
  },
```

`app/i18n/locales/en.json`:

```json
    "themePalette": "Color theme",
    "volume": "Sound volume"
  },
```

Check that both files are valid:

Run: `python3 -c "import json; json.load(open('app/i18n/locales/uk.json')); json.load(open('app/i18n/locales/en.json')); print('ok')"`
Expected: `ok`

1. [ ] **Step 5.2: Write the failing e2e test**

`tests/e2e/page-load.spec.ts` - add a test at the end of the file (tests here are at the top level, without `describe`).
`AppHeader` renders at `/` (`app/pages/index.vue:128`), so this test does not need Supabase:

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

1. [ ] **Step 5.3: Run the e2e test to verify it fails**

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only npm run test:e2e:pages`
Expected: FAIL - `volume-button` is not found.

The dummy credentials come from `.github/workflows/ci.yml` (the `page-load` job); the local `/.env/` is empty. Without them,
the Supabase client does not start and Vue does not mount.

1. [ ] **Step 5.4: Add script state to AppHeader**

`app/components/AppHeader.vue` - add an import to the existing block:

```ts
import { useSoundVolume } from '~/composables/useSoundVolume'
import { useClickOutside } from '~/composables/useClickOutside'
```

(`useClickOutside` is already imported; do not duplicate the line.)

After the `pickPalette` block (around line 105), add:

```ts
const { volume, setVolume } = useSoundVolume()
const volumeRef = ref<HTMLElement | null>(null)
const volumeButtonRef = ref<HTMLButtonElement | null>(null)
const volumeSliderRef = ref<HTMLInputElement | null>(null)
const volumeOpen = ref(false)
useClickOutside(volumeRef, () => { volumeOpen.value = false })

const volumePercent = computed(() => Math.round(volume.value * 100))

async function toggleVolume() {
  volumeOpen.value = !volumeOpen.value
  if (!volumeOpen.value) return
  await nextTick()
  volumeSliderRef.value?.focus()
}

function closeVolume() {
  if (!volumeOpen.value) return
  volumeOpen.value = false
  volumeButtonRef.value?.focus()
}

function onVolumeInput(event: Event) {
  const target = event.target as HTMLInputElement
  setVolume(Number(target.value) / 100)
}
```

`ref` and `computed` are already imported from `vue` (line 3); add `nextTick` to the same import. Focus contract:
opening moves focus to the slider, Escape returns it to the button (otherwise `v-if` would remove the popover along with
the focused element and focus would fall to `<body>`), and clicking outside the popover closes it without changing focus.

1. [ ] **Step 5.5: Add the trigger and popover to the template**

`app/components/AppHeader.vue` - inside `<div class="flex items-center gap-2">`, **before** the
`<div ref="paletteMenuRef" …>` block (around line 141), add:

```html
      <div
        ref="volumeRef"
        style="position: relative;"
        @keydown.escape.stop="closeVolume"
      >
        <button
          ref="volumeButtonRef"
          v-wave
          class="mui-icon-btn text-appbar-emphasis"
          style="--hover-bg: rgba(255,255,255,0.08);"
          :aria-label="$t('header.volume')"
          :aria-expanded="volumeOpen"
          data-testid="volume-button"
          @click="toggleVolume"
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
            ref="volumeSliderRef"
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

1. [ ] **Step 5.6: Map the new icon for the Lucide flag**

`app/components/AGENTS.md` requires an entry in `MDI_TO_LUCIDE` for every new `ic:baseline-*` icon.
`ic:baseline-volume-off` already exists (`app/utils/iconMap.ts:31`); immediately after it, add:

```ts
  'ic:baseline-volume-up': 'lucide:volume-2',
```

1. [ ] **Step 5.7: Run the e2e test to verify it passes**

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only npm run test:e2e:pages`
Expected: PASS all tests, including the new one.

1. [ ] **Step 5.8: Run lint, typecheck and the unit suite**

Run: `npm run lint && npm run typecheck && npm run test:unit`
Expected: PASS; `vue/attributes-order` may produce new warnings due to attribute order. Fix them with
`npx eslint --fix app/components/AppHeader.vue` and verify that the warning count returns to
the pre-migration count (72, 0 errors).

1. [ ] **Step 5.9: Commit**

```bash
git add app/components/AppHeader.vue app/utils/iconMap.ts app/i18n/locales/uk.json app/i18n/locales/en.json \
  tests/e2e/page-load.spec.ts
git commit -m "feat: add a volume slider to the app header"
```

---

### Task 6: Documentation

**Files:**
1. Modify: `AGENTS.md:120-122,137-139`
1. Modify: `app/utils/AGENTS.md`
1. Modify: `DESIGN.md:450`
1. Modify: `docs/specs/2026-09-08-consensus-celebration-design.md:4,58`

**Interfaces:**
1. Consumes: final behavior from Tasks 1-5
2. Produces: nothing

The root `AGENTS.md` has exactly 150 lines, at its limit of 150. The new LocalStorage table row is offset
by shortening the Consensus bullet and moving its detail to `app/utils/AGENTS.md` (36 lines, limit 200).

1. [ ] **Step 6.1: Move the consensus detail to app/utils/AGENTS.md**

Append to `app/utils/AGENTS.md`:

```markdown
## Consensus

`resultCelebration.ts → shouldCelebrate(votes, grouped)` is the single predicate for confetti (`ResultsArea.vue`) and
sound (`isConsensus` in `pages/[slug].vue`). A group is unanimous when it has exactly one unique estimate **and** ≥ 2
votes. Without QA splitting (`groupedVoteCounts === null`), the same rule applies to all votes. The ≥ 2 threshold
matches `DESIGN.md` §11: a `round_history` row is also written only when `votes.length >= 2`.
```

1. [ ] **Step 6.2: Shorten the root Consensus bullet**

Replace the three lines of the Consensus bullet in `AGENTS.md:137-139` with two:

```markdown
- **Consensus:** confetti + decision-sound on unanimity with ≥ 2 votes: with QA splitting, in at least one
  group (DEV/QA); without it, among all votes. Details: `app/utils/AGENTS.md`
```

1. [ ] **Step 6.3: Add the sp-volume row**

In the LocalStorage table in `AGENTS.md` (after the `sp-side-widget` row):

```markdown
| `sp-volume` | `0`-`1`, volume for all sounds; default `1`. Read and written by `useSoundVolume()` |
```

1. [ ] **Step 6.4: Verify the line budget**

Run: `wc -l AGENTS.md app/utils/AGENTS.md`
Expected: `AGENTS.md` ≤ 150, `app/utils/AGENTS.md` ≤ 200.

Run: `perl -CSD -lne 'print "$ARGV:$." if length > 120' AGENTS.md app/utils/AGENTS.md`
Expected: no output. Use `perl -CSD -l`: BSD `awk` on macOS counts bytes instead of characters and incorrectly
flags 49 lines of the root file at HEAD; without `-l`, lines of exactly 120 characters count as 121.

1. [ ] **Step 6.5: Update DESIGN.md**

Replace the decision-sound line in `DESIGN.md:450` with:

```markdown
- The `decision-sound` plays on every reveal with consensus (the `voting → revealed` transition), regardless of countdown mode; in the "з атмосферою" ("with ambience") mode, `ambience.mp3` plays at the end if there is no consensus. The header slider controls the volume of all sounds (`sp-volume`)
```

Use one long line, as in the adjacent list items in `DESIGN.md`; the 120-character limit does not apply to it.

1. [ ] **Step 6.6: Mark the spec as implemented**

`docs/specs/2026-09-08-consensus-celebration-design.md:4`:

```markdown
**Status:** implemented (plan: `docs/plans/2026-09-08-consensus-celebration.md`)
```

In the "Доступність слайдера" ("Slider accessibility") line at
`docs/specs/2026-09-08-consensus-celebration-design.md:58`, replace `settings.volume` with `header.volume`:
the locales have no `settings` namespace; the key lives alongside the other header strings.

1. [ ] **Step 6.7: Commit**

```bash
git add AGENTS.md app/utils/AGENTS.md DESIGN.md docs/specs/2026-09-08-consensus-celebration-design.md
git commit -m "docs: describe the consensus rule, reveal sound and volume setting"
```

---

### Task 7: Final verification

**Files:** no changes

1. [ ] **Step 7.1: Run the CI check**

Run: `npm run test:ci`
Expected: exit 0; lint has 0 errors (warnings at 72), typecheck is clean, all unit tests pass, and the build succeeds.

1. [ ] **Step 7.2: Run the page-load e2e suite**

Run: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only npm run test:e2e:pages`
Expected: PASS for all tests.

1. [ ] **Step 7.3: Confirm the tree is clean**

Run: `git status --porcelain`
Expected: no output.

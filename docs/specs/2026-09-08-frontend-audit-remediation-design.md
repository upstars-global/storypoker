# Frontend audit remediation 2026-09-07

**Date:** 2026-09-08
**Status:** implemented (plan - `docs/plans/2026-09-08-frontend-audit-remediation.md`)
**Source:** `docs/audits/2026-09-07-frontend-design-audit.md` (11 findings, F-1…F-11)

## Context

The `frontend-crafting` audit (read-only, static) confirmed a strong baseline (real `<button>` elements, `focus-visible`,
`aria-label` in `Timer`, and kick with confirmation) and identified two systemic gaps: missing
`prefers-reduced-motion` and a fixed `lang="uk"`, plus nine isolated defects in semantics, naming, and the
keyboard contract. All findings were rechecked on the current branch `upd-deps-and-agent-context`:
the code at the named locations matches the audit.

Two clarifications to the audit change the scope:

1. **F-9:** `DESIGN.md` §11.7 already documents the thresholds `> 3.5` / `2.5 ≤ x ≤ 3.5` / `< 2.5`. What is missing is
   a statement of the origin of the numbers and named constants in the code. The values do not change.
2. **F-7:** The «дешевий шлях» ("cheap path", removing `role="menu"`) leaves `<li tabindex="0" @click>` without a role,
   creating the very silent clickable elements whose absence the audit praises in the project; moreover,
   `PlayerRow.spec.ts` and `activateMenuItem` rely on these roles. The full arrow-key contract through a shared composable was chosen.

## Goal

Close all MUST violations from the audit so that a keyboard user, screen reader user, or person sensitive to motion can
complete the full room cycle (join, vote, reveal, history, leave) without losing information or control. Each
finding receives a unit or e2e specification where there is a test seam; the rest receive typecheck and a manual scenario.

## Constraints and decisions

| Question | Decision |
| --- | --- |
| Reduced motion - CSS (F-1) | A global `@media (prefers-reduced-motion: reduce)` block at the end of `main.css`, outside `@layer`: `animation-duration`, `animation-iteration-count`, `transition-duration` → minimum for `*`; `.celebration-layer { display: none }`, because zero duration would leave 60 particles static on screen |
| Reduced motion - slot (F-1) | `SlotMachine.spin()` reads `matchMedia('(prefers-reduced-motion: reduce)')`: in reduced mode, reels immediately show final symbols, `startTickLoop` (sound during motion) is skipped, and `spinEnd`/`win` are emitted after a fixed 300 ms instead of `REEL_DURATIONS_MS[2] + 150`. Other players see the spin according to their own setting |
| Reduced motion - `win-blink` (F-1) | Covered by the global rule. Information is retained: the winner has an `aria-label`/text `players.slotWinner` and a die icon |
| Document `lang` (F-2) | `app/i18n.ts` sets `document.documentElement.lang` on initialization (`storedLocale()`) and inside `persistLocale(code)`. `index.html` retains `lang="uk"` as the default before JS, the same pattern as `data-theme` via an inline script |
| Room `<main>` + `<h1>` (F-3) | The `<div class="flex flex-1 …">` wrapper in `[slug].vue` becomes `<main id="main" tabindex="-1">`; the not-found branch also gets `<main>`. The room name in `AppHeader` renders as `<h1>` instead of `<span>` only in the `v-if="roomName"` branch; the header is unchanged on home/auth/ffc |
| Names of icon-only buttons (F-4) | `CardsArea`: `toggleLastRound` gets a static `:aria-label="$t('cards.lastRound')"` + `:aria-pressed="showLastRound"` (standard toggle pattern, the tooltip as `aria-describedby` continues to switch text); reset gets `:aria-label="$t('cards.reset')"`. `PlayerRow`: `:aria-label="$t('players.menuFor', { name: player.name })"`, a new key in both locales |
| Skip link (F-5) | `<a href="#main">` in `App.vue` before `ConnectionBanner`, classes `sr-only focus:not-sr-only` + `mui-btn`; text `common.skipToContent`. All 7 `<main>` elements get `id="main" tabindex="-1"` (without `tabindex` some browsers do not move focus to the anchor target). Depends on F-3 |
| `AppModal` focus restoration (F-6) | Remember `document.activeElement` before `showModal()`; restore focus both in the `open → false` watch branch and in `onBeforeUnmount`, because 8 of 10 consumers mount with `:open="true"` and disappear via `v-if`. One change covers all instances |
| Arrow-key menu (F-7) | New composable `app/composables/useMenuKeyboard.ts` (three uses: `AppHeader` ×2, `PlayerRow`): `ArrowDown`/`ArrowUp` cycle, `Home`/`End`, `Enter`/`Space` activate, `Escape` closes; items have `tabindex="-1"`, opening focuses the first item, closing returns focus to the trigger button, but only if focus was inside the menu (closing via `useClickOutside` leaves focus untouched). The selector `[role^="menuitem"]` fixes an existing gap: `activateMenuItem` searched only for `menuitem`, so `menuitemradio` (palette, language) could not be activated with Enter |
| Visible vote failure (F-8) | In `[slug].vue`, a `role="status" aria-live="polite"` container is always present below the card grid; empty `catch` blocks in `handleVote` (:450) and `handleSaveEdit` (:552) write `room.voteFailed` / `room.saveFailed` to it, with auto-clear after 5 s. The other five empty `catch` blocks are `localStorage` guards and a rejoin fallback; they are legitimate and remain unchanged |
| Goal Clarity thresholds (F-9) | `GOAL_CLARITY_THRESHOLDS = { clear: 3.5, unclear: 2.5 }` in `app/utils/cardDecks.ts` next to the preset; `ResultsArea` reads the constants. In `DESIGN.md` §11.7, one sentence: the thresholds are the owner's product decision, not derived from data |
| `/ffc` toggle (F-10) | `<span @click>` → `<label class="mui-switch">` with `<input type="checkbox" @change>` as the **first** sibling (the selectors `input:checked + .track` / `~ .thumb` remain), and `sr-only` checkbox name text inside the label. CSS: new rule `label.mui-switch input` - `position: absolute; inset: 0; width: 100%; height: 100%` (focusable), outline via `label.mui-switch:has(input:focus-visible) .track`. The selector is narrowed to `label` because the decorative `.mui-switch` in a `<span>` in the `PlayerRow` menu must remain non-clickable |
| Room `<title>` (F-11) | A `watch` in `[slug].vue` on `[route.path, currentRoomName ?? currentSlug ?? headerSeed.roomName]` with `flush: 'post'` sets `<name> \| Story Poker`; `flush: 'post'` is needed because `router.afterEach` fires synchronously during `router.replace` to the slug and overwrites the title with the default. `router.ts` is unchanged |

## Out of scope

1. **Notification layer / toast with retry** - initiative `docs/initiatives/error-handling.md` (P1). F-8 is deliberately
   minimal here: one live region in the room.
2. **Goal Clarity threshold values** - remain `3.5` / `2.5`; changing them is the owner's decision.
3. **Runtime checks** (contrast of six themes, touch targets, focus order) - a separate `web-debug` session, as
   stated in the audit.
4. **The «вимкнути салют/слот» ("disable fireworks/slot") flag in `/ffc`** - unnecessary after F-1: the system setting covers the case.

## Test strategy

| Finding | Seam | Check |
| --- | --- | --- |
| F-1 CSS | none | `rg -c 'prefers-reduced-motion' app/assets/css/main.css` = 1, `npm run build` |
| F-1 slot | unit | `tests/unit/components/SlotMachine.spec.ts`: mock `matchMedia`, after a click each reel has 1 cell, `spinEnd` after 300 ms |
| F-2 | unit | `tests/unit/i18n.spec.ts`: `persistLocale('en')` → `lang="en"`; module with `sp-lang=en` in storage → `lang="en"` |
| F-3, F-11 | none | typecheck + manual scenario (`main` landmark, `h1`, tab with room name after `router.replace`) |
| F-4 | unit | `PlayerRow.spec.ts` (name with player), new `CardsArea.spec.ts` (`aria-label`, `aria-pressed`) |
| F-5 | e2e | `page-load.spec.ts`: first Tab on `/` focuses the skip link, Enter → `document.activeElement` = `main#main` |
| F-6 | unit | `AppModal.spec.ts`: focus returns to trigger after `open=false` and after unmount |
| F-7 | unit | `tests/unit/composables/useMenuKeyboard.spec.ts` + `PlayerRow.spec.ts` (ArrowDown moves focus) |
| F-8 | none | typecheck + manual scenario (offline → click card → text in `role="status"`) |
| F-9 | unit | `cardDecks.spec.ts`: constants are exported and have expected values |
| F-10 | e2e | `page-load.spec.ts`: on `/ffc`, Tab to checkbox, Space toggles `checked` and `FEATURE_FLAGS` in storage |

Finish with `npm run test:ci` (lint + typecheck + unit + build), then `npm run test:e2e:pages`.

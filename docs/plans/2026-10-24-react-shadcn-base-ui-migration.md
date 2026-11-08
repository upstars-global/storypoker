# React + shadcn/ui (Base UI) + TypeScript 7 migration - implementation plan

**Spec:** docs/specs/2026-10-24-react-shadcn-base-ui-migration-design.md

**Goal:** Story Poker runs on React 19 + shadcn/ui (Base UI) + TS 7 with oxlint. The `visual` suite captured from the Vue version passes on React (updated baselines approved by the owner), `pnpm run test:ci` is green, and the React version is merged into `main` in one PR from the migration branch.

**Architecture:** Four waves following the specification sections. All waves use one branch, `2610242233-dev-session`, in the main checkout and one PR #46 into `main`, without intermediate merges. P0 (Tasks 1-6) starts with a spike on the highest risks (the TS 7 API for the icon scanner and type-aware oxlint), followed by a framework-independent `visual` suite that sees the application only through URLs, `data-testid`, roles, and mocked Supabase network responses, so it runs unchanged on Vue and React. Each subsequent wave adds commits to the same branch with green CI on push. P1 (Tasks 7-9) removes Vue, builds a React shell that keeps required `Public pages load` green (layout with skip link, header with volume, `AppIcon`, `/ffc`; other routes are stubs), then switches to TS 7 and oxlint. P2 (Tasks 10-13) covers state and infrastructure without UI: stores, i18n, theme/flags/sound, PWA, and sessions. P3 (Tasks 14-22) builds shadcn primitives on a token bridge, then screens from simple to room, then parity. P4 (Tasks 23-25) covers CSS cleanup, documentation, final gates, and a PR into `main`. Waves are sequential; within P3, Tasks 16-17 and 20 are independent after Task 15, while the rest run in order. Shared state between tasks consists only of contracts from the specification's Contract section. The plan does not require parallel agents.

**Stack:** React 19.3, react-dom 19.3, `@base-ui/react` 1.9, shadcn CLI 4.22 (`init -b base`), Tailwind v4
(`@tailwindcss/vite`), Vite 8 + `@vitejs/plugin-react`, vite-plugin-pwa, react-router 8 (declarative), Zustand 5,
react-i18next + i18next, echarts 6 (without `vue-echarts`), Supabase JS 2, TypeScript 7 (`tsc`), oxlint +
`oxlint-tsgolint` (type-aware), Vitest 5 + happy-dom + `@testing-library/react`, Playwright 1.64.1 (image
`mcr.microsoft.com/playwright:v1.64.1-noble` for `visual`), pnpm 12. Skills by task: `shadcn`,
`frontend-crafting`, `typescript`, `vitest`, `tdd`, `web-debug`, `echarts`.

**Execution:** subagents

## Global constraints

### Decisions

The following decisions and constraints describe the historical plan.

1. **React 19 + shadcn/ui on Base UI.** A full React migration provides the combination requested by the owner at the cost of rewriting the entire frontend. Rejected: shadcn-vue + Reka, given the experience in #14 and absence of Base UI; shadcn tokens alone without primitives, which provide no shadcn components.
2. **One branch, one PR.** P0-P4 are committed to one branch in the main repository checkout (without a worktree), with one PR into `main` at parity and no intermediate squash merges. This keeps `main` working, while requiring periodic updates to the branch from `main`. Rejected: two frameworks together, with two routers and shared state throughout the transition; a separate P0 PR into `main` and an integration branch with wave PRs, per the owner's decision on 2026-10-25. Every branch push has green CI. `main` is not frozen: a fix or feature merged into `main` during migration is ported to the React branch; if it changes the UI, affected baselines are recaptured on the branch under Decision 4.
3. **The visual oracle is the branch's first commits (P0).** Baselines are captured from the Vue application before Vue is removed, so parity is checked by comparison. The cost is writing some test infrastructure (fixtures and Supabase mocks) before migration. `visual` is a new non-required CI job `Visual` in a Playwright container; it becomes required after the migration merges.
4. **Parity threshold: `maxDiffPixelRatio: 0.01` per screenshot.** The 1% threshold tolerates minor Base UI antialiasing differences while catching shifts and changes in color, radius, or font. Rejected: 0.1% and manual comparison, which is not repeatable. A baseline can be updated only individually: the reason and diff are described in the PR, and the update takes effect after the owner's explicit «так» ("yes"); the remaining baselines stay unchanged.
5. **Palettes remain the source of truth; shadcn tokens derive from them.** Each shadcn token uses existing palette variables. This avoids splitting one palette into two sets, but shadcn component styles need adjustment for per-element variables (`--radius-*`, `--btn-*`, `--paper-border`, `--card-border`, `--shadow-*`, fonts). New palette variables may be added if existing values do not change.
6. **TS 7 only: `tsc` for typecheck, oxlint with type-aware rules in place of ESLint, and the icon generator on `typescript/unstable/ast`.** This uses one compiler, with a dependency on the unstable TS 7 API and another migration (ESLint → oxlint). Rejected: TS 6 under an alias for old tools. The `AGENTS.md` rule «TypeScript лишається 6.x» ("TypeScript remains 6.x") is deliberately revoked for this plan.
7. **Replacement stack:** react-router 8 (declarative mode, explicit routes) for vue-router, Zustand for Pinia, react-i18next with the same `uk.json`/`en.json`, ECharts through a custom hook for vue-echarts, `@testing-library/react` for `@vue/test-utils`, and a custom Material Design-style ripple for `v-wave`. Rejected: TanStack Router + Jotai.
8. **Components moving to shadcn:** Dialog (currently AppModal), Tooltip (AppTooltip), DropdownMenu (AppHeader and PlayerRow menus), Select (native select in deck settings), Button (`.mui-btn*`), Input, Switch. Cards, Timer, SlotMachine, PieChart, and RoleBadge remain custom components. shadcn Button, Input, and Switch variants use palette variables and replace `.mui-btn*`; `.mui-*` classes are removed once unused. Rejected: moving everything with a similar component to shadcn, because domain widgets have no equivalents.
9. **Baselines are captured in a Linux Playwright container matching CI's version.** The container gives CI and developers identical baselines, while local runs require Docker. Local macOS capture was rejected.
10. **Screenshot coverage: 1280 and 375 px, with regular player and authorized moderator roles for room screens.** Two widths and two roles, rather than one of each, catch mobile layout and role-specific UI, at the cost of ~500 screenshots and mocked Supabase Auth in P0.
11. **Reference-based mobile changes are a separate P5 phase after parity.** P0's 375-px baselines remain a faithful migration oracle and the redesign stays separate from the rewrite. Mobile screens are initially ported with their existing flaws. In P5, 375-px baselines are recaptured individually with owner approval (Decision 4). Rejected: implementing reference-based mobile screens immediately in P3.

### Out of scope

1. New features, redesign, and UI copy changes in P0-P4.
2. Reference-based mobile layout requirements: these go into a separate P5 specification.
3. Database schema, RLS, and Netlify function changes.
4. SSR, Next.js, React Server Components.
5. Removing the temporary `sw-reload-clients.js` (a separate task for the next release).
6. Replacing ECharts or DiceBear.

### Security Model

Trusted: owner decisions in the session and `AGENTS.md` instructions. Untrusted: npm package contents and code generated by the shadcn CLI; generated code is reviewed in the diff before commit, like any dependency. New dependencies (React, Base UI, shadcn, Zustand, react-router, react-i18next, oxlint, Testing Library) are added explicitly and listed in the PR description. `SUPABASE_SECRET_KEY` and `STORYPOKER_API_TOKEN` remain server-side: the client bundle reads only `VITE_*`, which `icons:audit-build` checks later. Build-time network calls are limited to `pnpm install` and `shadcn add`; visual tests use mocked Supabase responses without real credentials.

## Review focus

1. The Supabase mock in `visual` does not cover Realtime/Presence: only store unit tests and `critical-flows` catch behavioral differences in live events (reconciliation, presence status, broadcast `countdown:<roomId>`).
2. First frame: the inline theme script in `index.html` must run before React renders; screenshots are captured after load and do not see a flash.
3. Focus order and aria in shadcn Dialog/DropdownMenu/Select on Base UI versus custom Vue components outside keyboard test scenarios (Tab cycle inside the modal, `aria-describedby`).
4. localStorage compatibility: formats written by the Vue version are read by the new code without migration, especially `storypoker_session_*` and `FEATURE_FLAGS` with unknown keys.
5. The icon scanner uses the unstable TS 7 API: a `typescript` update may break it; `icons:check` must fail loudly instead of returning an empty list.
6. `icons:audit-build`: 25 KiB gzip budget for icons and absence of `iconCollections.json` from the production graph after the React bundler change.
7. Resize performance (the reason for rejecting shadcn-vue in #14) is checked only for absence of console errors; frame time is not measured by a test.

## Files

| File | Change | Task |
| --- | --- | --- |
| `playwright.config.ts` | modified: `visual` project (viewports 1280/375, `maxDiffPixelRatio: 0.01`, `animations: 'disabled'`), separate `webServer` env with a fake Supabase URL | 2 |
| `tests/visual/support/fakeSupabase.ts` | new: `page.route` for `**/rest/v1/**`, `**/auth/v1/**`, `**/storage/v1/**`; `page.routeWebSocket` for `**/realtime/v1/**` | 2 |
| `tests/visual/support/scene.ts` | new: `openScene(page, { palette, theme, role, path, viewport })` - localStorage, Supabase session, `page.clock` | 2 |
| `tests/fixtures/data/visual-room.json` | new: room, `room_state`, players, votes, round history | 2 |
| `tests/visual/public.spec.ts` | new: home, auth pages, `/ffc` | 3 |
| `tests/visual/room.spec.ts` | new: join overlay, room before/after reveal, AppHeader and PlayerRow menus | 4 |
| `tests/visual/modals.spec.ts` | new: eight modals | 5 |
| `tests/visual/__screenshots__/**` | new: baselines from the Linux container | 6 |
| `.github/workflows/ci.yml` | modified: job `Visual` (Task 6); job `Lint` without ESLint (Task 8) | 6, 8 |
| `.github/workflows/visual-baselines.yml` | new: `workflow_dispatch`, `--update-snapshots`, baselines as an artifact | 6 |
| `app/**/*.vue`, `app/App.vue`, `app/main.ts`, `app/router.ts`, `app/i18n.ts`, `app/__preview.ts` | deleted | 7 |
| `app/main.tsx`, `app/App.tsx`, `app/router.tsx` | new: React entry point, layout, routes from URL Schema | 7 |
| `app/components/AppIcon.tsx`, `app/components/AppHeader.tsx`, `app/pages/ffc.tsx` | new: ports for `Public pages load` (header initially with volume, theme/language/palette in Task 12) | 7, 12 |
| `app/pages/*.tsx` | new: stubs (Task 7), real pages (Tasks 16-19) | 7, 16-19 |
| `tests/unit/components/**`, `tests/unit/pages/**` | deleted (Task 7), React tests (Tasks 15-21) | 7, 15-21 |
| `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html` | modified: plugin-react, `jsx: react-jsx`, entry point `main.tsx` | 7 |
| `package.json`, `pnpm-lock.yaml` | modified: dependencies and scripts | 7, 8, 10, 11, 14 |
| `eslint.config.js` | deleted | 8 |
| `.oxlintrc.json` | new | 8 |
| `scripts/icons/scan.ts` | modified: `.tsx` (Task 7, TS 6), API TS 7 (Task 8) | 7, 8 |
| `tests/unit/utils/iconSubset.spec.ts`, `tests/unit/utils/iconManifest.spec.ts` | modified: `.tsx` cases | 7, 8 |
| `tests/icon-rendering/**` | modified: React harness (catalog in Task 9, room in Task 21) | 9, 21 |
| `app/stores/*.ts` | modified: Pinia → Zustand | 10 |
| `app/lib/supabase-instance.ts` | unchanged API (`initSupabase`, `getSupabase`, `setSupabase`) | 10 |
| `tests/unit/stores/*.spec.ts`, `tests/support/helpers/fakeSupabase.ts` | modified: Zustand | 10 |
| `app/i18n.ts` → `app/i18n.tsx` | new: i18next, interpolation `{`/`}` | 11 |
| `tests/unit/i18n.spec.ts` | modified | 11 |
| `app/composables/*.ts` → `app/hooks/*.ts` | modified: React hooks (`useTheme`, `useSoundVolume`, `useCountdown`, `useAppUpdate`, `useDylanAvatar`, `useCardLabel`, `useClickOutside`, `useMenuKeyboard`) | 12, 13 |
| `tests/unit/composables/*.spec.ts` → `tests/unit/hooks/*.spec.ts` | modified | 12, 13 |
| `app/pwa.ts`, `tests/unit/pwa.spec.ts` | modified, if needed for the React toast | 13 |
| `components.json`, `app/components/ui/*.tsx`, `app/lib/utils.ts` | new: shadcn Base UI (button, input, switch, dialog, tooltip, dropdown-menu, select) | 14 |
| `app/assets/css/main.css` | modified: token bridge (Task 14), removal of unused `.mui-*` (Task 23) | 14, 23 |
| `app/hooks/useRipple.ts` | new: ripple in place of `v-wave` | 14 |
| `app/components/*.tsx` | new: component ports | 15-21 |
| `tests/e2e/page-load.spec.ts` | modified: routes × resize without console errors | 22 |
| `tests/e2e/critical-flows.spec.ts`, `tests/page-objects/*.ts` | modified only if selectors require it | 22 |
| `AGENTS.md`, `app/**/AGENTS.md`, `tests/AGENTS.md`, `scripts/AGENTS.md`, `DESIGN.md` | modified: React stack | 24 |

## Tasks

### Task 1: TS 7 API and type-aware oxlint spike

**Files:** none (temporary directory outside the repository)

**Consumes:** `scripts/icons/scan.ts` (current `collectFromScript`), `typescript@7.0.2` exports `./unstable/*`

**Produces:** `Ruling:` in the log: how the scanner parses `.tsx` on TS 7 (`typescript/unstable/sync` or `unstable/ast` + parser) and how `oxlint --type-aware` finds `tsgolint`; or `blocked` with a reason, followed by a return to `specify` under Decision 6.

**Covers:** none (reduces risk for AC10, AC11)

**Depends on:** none

**Check:** a script in a temporary directory on TS 7 returns literals `'ic:baseline-home'` from `<AppIcon name="ic:baseline-home" />` and from `const x = cond ? 'ic:a' : 'ic:b'` in `.tsx`; `npx oxlint --type-aware` on the same file with `no-floating-promises` finds an intentional violation -> both results are present

**Commit:** none (spike without a commit)

### Task 2: `visual` infrastructure

**Files:** `playwright.config.ts`, `tests/visual/support/fakeSupabase.ts`, `tests/visual/support/scene.ts`,
`tests/fixtures/data/visual-room.json`

**Consumes:** table schema (`app/lib/database.types.ts`), Supabase Auth session format in localStorage
(`sb-<ref>-auth-token`), localStorage keys from `AGENTS.md`

**Produces:** Playwright `visual` project (only `tests/visual/**`, Desktop Chrome, `expect.toHaveScreenshot` with `maxDiffPixelRatio: 0.01` and `animations: 'disabled'`); `openScene(page, { palette, theme, role, path, viewport })`, where `role: 'guest' | 'player' | 'authorized-moderator'`, `viewport: 1280 | 375`; constants `PALETTES`, `THEMES`, `VIEWPORTS`. Invariants: no request goes to the network (an unmocked Supabase request fails the test), the clock is frozen at `2026-09-09T09:05:00Z`, `sp-volume=0`, `FEATURE_FLAGS={}`, and fonts are awaited (`document.fonts.ready`). Scenarios that must be predictable: room by 8-character id and by alias, player with/without a `storypoker_session_<roomId>` session.

**Covers:** AC4

**Depends on:** Task 1

**RED:** `pnpm exec playwright test --project visual` -> `No tests found`

**GREEN:** `pnpm exec playwright test --project=visual tests/visual/support` -> `openScene` self-test (attributes `data-palette`/`data-theme` on `<html>`, zero unmocked requests) passed

**Commit:** `git add -A -- playwright.config.ts tests/visual tests/fixtures/data/visual-room.json`

### Task 3: Public screen screenshots

**Files:** `tests/visual/public.spec.ts`

**Consumes:** `openScene` (Task 2)

**Produces:** `public-<screen>-<palette>-<theme>-<viewport>.png` screenshots for `home`, `login`, `signup`,
`forgot-password`, `reset-password`, `ffc`

**Covers:** AC1, AC2

**Depends on:** Task 2

**RED:** `pnpm exec playwright test --project=visual public` -> fails: no baselines

**GREEN:** `pnpm exec playwright test --project=visual public --update-snapshots && pnpm exec playwright test --project=visual public` -> 72 passed (local baselines, not committed to git)

**Commit:** `git add -A -- tests/visual/public.spec.ts`

### Task 4: Room and menu screenshots

**Files:** `tests/visual/room.spec.ts`

**Consumes:** `openScene`, `visual-room.json` (Task 2)

**Produces:** `room-<state>-<role>-<palette>-<theme>-<viewport>.png` screenshots: `join` (guest), `voting`, `revealed` (result circles), `header-menu`, `player-menu`; `player` and `authorized-moderator` roles for all except `join`

**Covers:** AC1, AC2

**Depends on:** Task 2

**RED:** `pnpm exec playwright test --project=visual room` -> fails: no baselines

**GREEN:** same command with `--update-snapshots`, then without -> passed

**Commit:** `git add -A -- tests/visual/room.spec.ts tests/fixtures/data/visual-room.json`

### Task 5: Modal screenshots

**Files:** `tests/visual/modals.spec.ts`

**Consumes:** `openScene` (Task 2)

**Produces:** `modal-<name>-<role>-<palette>-<theme>-<viewport>.png` screenshots for `configure-deck`, `history`, `trends`, `round-snapshot`, `room-background`, `player-edit`, `user-settings`, `auth`; roles as in Task 4, with authorized-moderator-only modals captured only for that role

**Covers:** AC1, AC2

**Depends on:** Task 4

**RED:** `pnpm exec playwright test --project=visual modals` -> fails: no baselines

**GREEN:** same command with `--update-snapshots`, then without -> passed

**Commit:** `git add -A -- tests/visual/modals.spec.ts`

### Task 6: `Visual` CI job and container baselines

**Files:** `.github/workflows/ci.yml`, `.github/workflows/visual-baselines.yml`, `tests/visual/__screenshots__/**`

**Consumes:** `visual` project (Tasks 2-5)

**Produces:** job `name: Visual` (`container: mcr.microsoft.com/playwright:v1.64.1-noble`, not required, `test-results/` artifact on failure); workflow `visual-baselines.yml` (`workflow_dispatch`, same container, `--update-snapshots`, `visual-baselines` artifact). Docker is unavailable locally, so baselines come only from this artifact; likewise in Tasks 22 and 25.

**Covers:** AC3, AC5

**Depends on:** Task 5

**Check:** `actionlint .github/workflows/ci.yml .github/workflows/visual-baselines.yml` -> no errors; run `visual-baselines` on the P0 branch, commit the artifact, then run `CI` twice on the PR into `main` -> `Visual` is green both times without baseline changes

**Commit:** `git add -A -- .github/workflows/ci.yml .github/workflows/visual-baselines.yml tests/visual/__screenshots__`

### Task 7: Remove Vue, build the React shell

**Files:** all `app/**/*.vue`, `app/main.ts`, `app/router.ts`, `app/__preview.ts`, `tests/unit/components/**`,
`tests/unit/pages/**`, `tests/icon-rendering/RoomHarness.vue`, `tests/icon-rendering/main.ts`, `app/main.tsx`,
`app/App.tsx`, `app/router.tsx`, `app/components/AppIcon.tsx`, `app/components/AppHeader.tsx`, `app/pages/*.tsx`,
`vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `index.html`, `package.json`, `pnpm-lock.yaml`,
`scripts/icons/scan.ts`, `tests/unit/utils/iconSubset.spec.ts`

**Consumes:** URL Schema, `app/utils/*` (unchanged), `app/generated/*`

**Produces:** `<App>` with skip link `a[href="#main"]` → `main#main`, `<AppHeader>` with `data-testid="volume-button"` and `volume-slider`, `<AppIcon name>` with the same `span.sp-icon-root` markup; routes `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/ffc`, `/:slug`; `/ffc` is a full port (toggles `#ffc-<flag>`); the rest are `main#main` stubs. The scanner reads `.ts`/`.tsx` on TS 6 (`ScriptKind.TSX`) and does not recognize `.vue`. Dependencies:

1. Remove `vue`, `pinia`, `vue-router`, `vue-i18n`, `vue-echarts`, `v-wave`, `@vitejs/plugin-vue`, `@vue/*`, `vue-tsc`.
2. Add `react`, `react-dom`, `react-router@8`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`, `@testing-library/react`.

`pinia`/`vue-i18n` are removed here because no one imports stores or i18n until Tasks 10-11. Utility unit specs remain unchanged.

**Covers:** AC7, AC13

**Depends on:** Task 6

**RED:** `pnpm exec playwright test --project page-load --project icon-delivery` after removing Vue -> fails (no application)

**GREEN:** `pnpm run icons:check && pnpm exec tsc --noEmit -p tsconfig.json && pnpm run test:unit && pnpm run build && pnpm exec playwright test --project page-load --project icon-delivery` -> all green; `git ls-files '*.vue'` -> empty

**Commit:** `git add -A -- app tests/unit tests/icon-rendering vite.config.ts vitest.config.ts tsconfig.json index.html package.json pnpm-lock.yaml scripts/icons`

### Task 8: TypeScript 7 and oxlint

**Files:** `package.json`, `pnpm-lock.yaml`, `eslint.config.js`, `.oxlintrc.json`, `tsconfig.node.json`,
`scripts/icons/scan.ts`, `tests/unit/utils/iconSubset.spec.ts`, `.github/workflows/ci.yml`

**Consumes:** `Ruling` Task 1

**Produces:** `typecheck` = `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tests/icon-rendering/tsconfig.json`
on `typescript@7`; `lint` = `oxlint --type-aware` with rules equivalent to the current ones (`no-explicit-any` and
`no-unused-vars` with `^_` - warn) plus react/react-hooks; scanner using the TS 7 API per the Task 1 ruling. No `eslint*`,
`typescript-eslint`, or `@vue/*` packages.

**Covers:** AC6, AC9, AC10, AC11

**Depends on:** Task 7

**RED:** new case in `iconSubset.spec.ts` - `.tsx` with a ternary `name` - on the TS 6 scanner after the bump to TS 7 ->
`Cannot find module` / API import error

**GREEN:** `pnpm run test:ci` -> green; `pnpm exec tsc -v` -> `Version 7.`; `pnpm run lint` -> oxlint, 0 errors

**Commit:** `git add -A -- package.json pnpm-lock.yaml eslint.config.js .oxlintrc.json tsconfig.node.json scripts/icons tests/unit/utils .github/workflows/ci.yml`

### Task 9: Icon harness - catalog in React

**Files:** `tests/icon-rendering/main.tsx`, `tests/icon-rendering/CatalogHarness.tsx`, `tests/icon-rendering/vite.config.ts`,
`tests/icon-rendering/tsconfig.json`, `tests/icon-rendering/visual.spec.ts`

**Consumes:** `AppIcon` (Task 7)

**Produces:** `view=catalog` renders all icons in the manifest; until Task 21, `view=room` returns a placeholder and its tests
are marked `test.fixme` with a reference to Task 21

**Covers:** AC13

**Depends on:** Task 8

**RED:** `pnpm run test:icons:harness` -> fails (no `main.ts`)

**GREEN:** `pnpm run test:icons:harness` -> catalog passed, room - fixme

**Commit:** `git add -A -- tests/icon-rendering`

### Task 10: Stores in Zustand

**Files:** `app/stores/{auth,room,players,presence,profiles}.ts`, `tests/unit/stores/*.spec.ts`,
`tests/support/helpers/fakeSupabase.ts`, `package.json`, `pnpm-lock.yaml`

**Consumes:** `getSupabase()`/`setSupabase()`, `app/stores/types.ts`

**Produces:** `useAuthStore`, `useRoomStore`, `usePlayersStore`, `usePresenceStore`, `useProfilesStore` (Zustand,
the same action and field names as Pinia; actions are available through `useXStore.getState()`). Invariants from the current tests:
`applyChange()` for insert/update/delete Realtime payloads, reconciliation after reconnect, player order.

**Covers:** AC18

**Depends on:** Task 9

**RED:** `pnpm run test:unit tests/unit/stores` on the rewritten specs -> fails (stores are still Pinia/missing)

**GREEN:** `pnpm run test:unit tests/unit/stores` -> all cases from the Vue version passed

**Commit:** `git add -A -- app/stores tests/unit/stores tests/support/helpers package.json pnpm-lock.yaml`

### Task 11: i18n with react-i18next

**Files:** `app/i18n.tsx`, `tests/unit/i18n.spec.ts`, `package.json`, `pnpm-lock.yaml`

**Consumes:** `app/i18n/locales/{uk,en}.json` (unchanged), `sp-lang` key

**Produces:** `i18n` (i18next, `interpolation: { prefix: '{', suffix: '}', escapeValue: false }`, `fallbackLng: 'uk'`),
`persistLocale(lang)`; locales remain unchanged (they contain 11 strings with `{name}` and no plurals or linked messages)

**Covers:** AC15, AC18

**Depends on:** Task 9

**RED:** `pnpm run test:unit tests/unit/i18n.spec.ts` -> fails

**GREEN:** same -> passed, including the `sp-lang=en` case before initialization; `git diff --stat main -- app/i18n/locales` -> empty

**Commit:** `git add -A -- app/i18n.tsx tests/unit/i18n.spec.ts package.json pnpm-lock.yaml`

### Task 12: Theme, palette, flags, sound

**Files:** `app/hooks/{useTheme,useSoundVolume,useClickOutside,useMenuKeyboard,useCardLabel,useDylanAvatar}.ts`,
`tests/unit/hooks/*.spec.ts`, `app/components/AppHeader.tsx`, `index.html`, `tests/e2e/page-load.spec.ts`

**Consumes:** `PALETTES`, keys `sp-theme`, `sp-palette`, `sp-volume`, `FEATURE_FLAGS`

**Produces:** hooks with the same return values and localStorage side effects as the composables;
AppHeader gets theme/palette/language menus. The inline script in `index.html` remains unchanged.

**Covers:** AC15, AC16, AC18

**Depends on:** Task 11

**RED:** `pnpm run test:unit tests/unit/hooks` -> fails

**GREEN:** same -> passed; `pnpm exec playwright test --project page-load` -> passed; test in `page-load`:
`addInitScript` sets `sp-palette=cyberdeck`, `sp-theme=light`, the first `DOMContentLoaded` already has the attributes -> passed

**Commit:** `git add -A -- app/hooks app/composables app/components/AppHeader.tsx tests/unit/hooks tests/unit/composables tests/e2e/page-load.spec.ts index.html`

### Task 13: Timer, countdown, PWA update

**Files:** `app/hooks/{useCountdown,useAppUpdate}.ts`, `app/pwa.ts`, `tests/unit/hooks/{useCountdown,useAppUpdate}.spec.ts`,
`tests/unit/pwa.spec.ts`, `tests/unit/swReloadClients.spec.ts`

**Consumes:** `virtual:pwa-register` (stub in vitest), `public/sw-reload-clients.js` (unchanged)

**Produces:** the same update application rules (hidden tab, idle time, toast) and silent/dry/wet countdown

**Covers:** AC18

**Depends on:** Task 12

**RED:** `pnpm run test:unit tests/unit/hooks tests/unit/pwa.spec.ts` -> fails

**GREEN:** same -> passed

**Commit:** `git add -A -- app/hooks app/composables app/pwa.ts tests/unit/hooks tests/unit/composables tests/unit/pwa.spec.ts`

### Task 14: shadcn on Base UI and token bridge

**Files:** `components.json`, `app/components/ui/{button,input,switch,dialog,tooltip,dropdown-menu,select}.tsx`,
`app/lib/utils.ts`, `app/assets/css/main.css`, `app/hooks/useRipple.ts`, `package.json`, `pnpm-lock.yaml`

**Consumes:** palette variables from `main.css`; `shadcn` skill

**Produces:** `components.json` using Base UI (`base`), aliases to `~/components/ui` and `~/lib/utils`; shadcn tokens
(`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--accent`, `--border`, `--input`,
`--ring`, `--popover`, `--radius`, shadows) defined through `var(--<palette>)`; Button variants (`md`, `sm`, `text`,
`secondary`) reproducing `.mui-btn*`; `useRipple()` with `v-wave` parameters (currentColor, 0.35 → 0, 400 ms,
ease-out). Installation: `pnpm dlx shadcn@latest init -b base` in the existing project, then `shadcn add` for seven
components.

**Covers:** AC8, AC12

**Depends on:** Task 13

**Check:** `grep` over the shadcn token block in `main.css` finds no literal color/radius/shadow (only
`var(...)`) -> 0 matches; `node -e "console.log(require('./components.json'))"` shows the `base` base;
`pnpm run test:ci` -> green

**Commit:** `git add -A -- components.json app/components/ui app/lib/utils.ts app/assets/css/main.css app/hooks/useRipple.ts package.json pnpm-lock.yaml`

### Task 15: Modal, tooltip, and menu on shadcn + keyboard tests

**Files:** `app/components/AppModalPaper.tsx`, `tests/unit/components/{AppModal,AppTooltip,PlayerRow}.spec.tsx`,
`app/components/AppHeader.tsx`

**Consumes:** `Dialog`, `Tooltip`, `DropdownMenu` (Task 14); behavioral cases from deleted Vue tests (`git show main:tests/unit/components/AppModal.spec.ts` etc.)

**Produces:** a way to use Dialog with `lockDismiss` (Escape and clicking outside the modal do not close it), the
`aria-labelledby`/`aria-describedby` relationship; AppHeader menu using DropdownMenu. Ports of the same cases: Enter/Space opens,
Escape closes, focus returns to the trigger, tooltip has `role="tooltip"` and `aria-describedby`.

**Covers:** AC18, AC21

**Depends on:** Task 14

**RED:** ported specs -> fail (components are missing)

**GREEN:** `pnpm run test:unit tests/unit/components` -> passed

**Commit:** `git add -A -- app/components tests/unit/components`

### Task 16: Auth pages

**Files:** `app/pages/{login,signup,forgot-password,reset-password}.tsx`, `app/components/{AuthModal,PasswordInput}.tsx`

**Consumes:** `useAuthStore` (Task 10), `authValidation.ts`, Button/Input (Task 14)

**Produces:** pages with the same fields, validation, redirects, and `data-testid` as Vue

**Covers:** AC17

**Depends on:** Task 15

**Check:** `pnpm exec playwright test --project=visual public -g "login|signup|forgot|reset"` locally against
branch baselines (comparison is approximate on macOS) and run the `Visual` job in the PR -> these screenshots are green or
each difference is submitted for approval

**Commit:** `git add -A -- app/pages app/components`

### Task 17: Home and Recent Rooms

**Files:** `app/pages/index.tsx`

**Consumes:** `recentRooms.ts`, `roomId.ts`, stores

**Produces:** room creation and Recent Rooms list with `storypoker_session_*`

**Covers:** AC17

**Depends on:** Task 15

**Check:** `Visual` job in the PR -> `public-home-*` green

**Commit:** `git add -A -- app/pages/index.tsx`

### Task 18: Room - core

**Files:** `app/pages/[slug].tsx`, `app/components/{JoinOverlay,PlayersList,PlayerRow,RoleBadge,RolePicker,CardsArea,ResultsArea,PieChart,AlignmentCard,ConnectionBanner}.tsx`,
`tests/unit/pages/roomPage.spec.tsx`, `tests/unit/components/{CardsArea,ResultsArea,PlayerRow}.spec.tsx`

**Consumes:** stores (Task 10), shadcn (Task 14), `shields.ts`, `resultCohorts.ts`, `resultCelebration.ts`, `cardDecks.ts`

**Produces:** the `/:slug` route with id → alias redirect, Realtime subscriptions and reconciliation as in Vue, auto-rejoin
from `storypoker_session_<roomId>`; role gates per `DESIGN.md` §11; consensus celebration. `PieChart` remains
an SVG port without switching to ECharts: the switch would change its appearance (the «переписуй при дотику»
[rewrite on touch] rule from `app/components/AGENTS.md` is deferred to P5 or a separate task).

**Covers:** AC14, AC17, AC18

**Depends on:** Task 17

**RED:** `roomPage.spec.tsx` - case «сесія з localStorage у форматі Vue повертає гравця під тим самим `playerId`» [a Vue-format localStorage session restores the player with the same `playerId`] -> fails

**GREEN:** `pnpm run test:unit tests/unit/pages tests/unit/components` -> passed; job `Visual` -> `room-*` green or awaiting approval

**Commit:** `git add -A -- app/pages app/components tests/unit/pages tests/unit/components`

### Task 19: Widgets - Timer, SlotMachine, countdown

**Files:** `app/components/{Timer,SlotMachine}.tsx`, `tests/unit/components/{Timer,SlotMachine}.spec.tsx`

**Consumes:** `useCountdown`, `timerAlarm.ts`, `slotMachine.ts`, broadcast `countdown:<roomId>`

**Produces:** `sp-side-widget` switching, alarm, limit of 3 spins, events `slot-spin-start`/`slot-spin-end`/`slot-win`

**Covers:** AC18

**Depends on:** Task 18

**RED:** ported specs -> fail

**GREEN:** `pnpm run test:unit tests/unit/components` -> passed

**Commit:** `git add -A -- app/components tests/unit/components`

### Task 20: Modals

**Files:** `app/components/{ConfigureCardDeckModal,HistoryModal,AlignmentTrendsModal,RoundSnapshotModal,RoomBackgroundModal,PlayerEditModal,UserSettingsModal,UpdateBanner}.tsx`,
`app/hooks/useEChart.ts`, `tests/unit/components/{ConfigureCardDeckModal,RoomBackgroundModal,UserSettingsModal}.spec.tsx`

**Consumes:** Dialog/Select/Switch (Task 14), stores, skill `echarts`

**Produces:** `useEChart(ref, option)` - init via `echarts/core` + `use([...])`, `resize` on ResizeObserver,
`dispose` on unmount; Select in deck settings (closed state matches the native control; any difference requires approval)

**Covers:** AC17, AC18

**Depends on:** Task 15

**RED:** ported specs -> fail

**GREEN:** `pnpm run test:unit tests/unit/components` -> passed; job `Visual` -> `modal-*` green or awaiting approval

**Commit:** `git add -A -- app/components app/hooks tests/unit/components`

### Task 21: Icon harness - room

**Files:** `tests/icon-rendering/RoomHarness.tsx`, `tests/icon-rendering/main.tsx`, `tests/icon-rendering/visual.spec.ts`,
`tests/icon-rendering/delivery.spec.ts`

**Consumes:** room components (Tasks 18-20), `fixture.ts`

**Produces:** query parameters `role`, `view`, `widget`, `paused`, `countdown` as in the Vue harness; `test.fixme` from
Task 9 removed

**Covers:** AC13

**Depends on:** Task 20

**RED:** remove `fixme` -> room tests fail

**GREEN:** `pnpm run test:icons:harness` -> all passed

**Commit:** `git add -A -- tests/icon-rendering`

### Task 22: Parity and console check

**Files:** `tests/e2e/page-load.spec.ts`, `tests/visual/__screenshots__/**` (approved only), `tests/e2e/critical-flows.spec.ts`,
`tests/page-objects/*.ts`

**Consumes:** all screens (Tasks 16-21)

**Produces:** a `page-load` test: every route from URL Schema (the room uses fake Supabase) has no `console.error`
after load and after `setViewportSize` 1280 → 375; a table in the record mapping «стара спека → новий тест»
[old spec → new test] for 42 Vue specs; a list of updated baselines, each with a reason, diff and owner «так» [yes]

**Covers:** AC17, AC18, AC19, AC20, AC22

**Depends on:** Task 21

**Check:** job `Visual` is green; `pnpm exec playwright test --project page-load --project icon-delivery` -> passed;
`pnpm exec playwright test --project chromium tests/e2e/critical-flows.spec.ts` with `.env/.env.test` on test
Supabase -> passed; each of the 42 specs has a row in the table

**Commit:** `git add -A -- tests/e2e tests/page-objects tests/visual/__screenshots__`

### Task 23: CSS cleanup

**Files:** `app/assets/css/main.css`

**Consumes:** shadcn Button/Input/Switch variants (Task 14)

**Produces:** `main.css` has no `.mui-*` classes unused in `app/**/*.tsx`

**Covers:** AC17

**Depends on:** Task 22

**Check:** for every `.mui-*` selector in `main.css`, `grep -r` over `app/**/*.tsx` -> a use exists; job `Visual` -> green

**Commit:** `git add -A -- app/assets/css/main.css`

### Task 24: Agent documentation

**Files:** `AGENTS.md`, `app/AGENTS.md`, `app/assets/AGENTS.md`, `app/components/AGENTS.md`, `app/pages/AGENTS.md`,
`app/stores/AGENTS.md`, `app/utils/AGENTS.md`, `tests/AGENTS.md`, `scripts/AGENTS.md`, `DESIGN.md`, `README.md`

**Consumes:** actual state after Tasks 7-23; skill `maintaining-agent-context`

**Produces:** description of the React stack, Zustand, react-i18next, shadcn/Base UI, oxlint, TS 7, `visual`; the line «TypeScript
лишається 6.x» [TypeScript remains 6.x] removed; root `AGENTS.md` within 28 KiB

**Covers:** AC24

**Depends on:** Task 23

**Check:** `grep -rn "TypeScript лишається 6.x\|vue-tsc\|Pinia\|vue-router\|\.vue\b" AGENTS.md app tests scripts --include=AGENTS.md` -> 0 matches; `wc -c AGENTS.md` -> ≤ 28672

**Commit:** `git add -A -- AGENTS.md app tests/AGENTS.md scripts/AGENTS.md DESIGN.md README.md`

### Task 25: Final gates and merge

**Files:** none

**Consumes:** head of `2610242233-dev-session`

**Produces:** PR #46 `2610242233-dev-session` → `main`

**Covers:** AC23, AC25

**Depends on:** Task 24

**Check:** `pnpm run test:ci` -> green; local `pnpm run build && pnpm run preview` from the branch head, two tabs on
`localhost`: enter a room, a vote in one appears in the other -> yes; CI on the PR -> all required checks and `Visual` green;
without `deploy:stage` and without merging

**Commit:** none (merge through `finalize`)

## Execution record

```text
Base: b1966d22e1eff384bac7e46ca056fa9b3aa7836f   Root: /Users/ihororlovskyi/work/github/io-upstars/storypoker   Branch: 2610242233-dev-session
Initial dirty state: .gitignore, AGENTS.md, scripts/skills.sh
Ruling: baseline pnpm run test:ci -> exit 0 on b1966d2 - recorded before Task 1 - none
Ruling: P0 runs in place on 2610242233-dev-session (== origin/main); spec and plan are committed with Task 2 as docs - P0 PR needs them in main for the integration branch - low
Task 1: done - /tmp/ts7-spike (subagent opus): node scripts/demo.ts -> [ic:a, ic:b, ic:baseline-home] from .tsx; oxlint --type-aware -> typescript(no-floating-promises) on src/sample.tsx; rechecked by controller
Ruling: scan.ts on TS 7 parses via typescript/unstable/sync (API + updateSnapshot + program.getSourceFile) with unstable/ast guards (isStringLiteral || isNoSubstitutionTemplateLiteral) and node.forEachChild; one API per scan, close() in finally - TS 7 has no createSourceFile, oxc-parser not needed - medium: unstable/* may change, so typescript pinned exactly
Ruling: TS 7 API spawns native tsc from optional @typescript/typescript-<platform>; installs must keep optional deps - Task 8 adds it to the CI check - medium
Ruling: oxlint --type-aware via oxlint-tsgolint devDependency, no typescript peer needed - verified in /tmp/ts7-spike-nots - low
Task 2: done - (subagent opus) controller rerun: playwright test tests/visual/support --project visual -> 12 passed; lint 0; typecheck 0; page-load+icon-delivery with dummy creds -> 16 passed; bare --list -> 22 tests (no visual)
Ruling: plan commands use --project=visual <filter> - Playwright 1.64.1 reads `--project visual <path>` as several project names - low
Ruling: visual project and its server (port 4174, fixed fake Supabase URL) load only when visual is named in --project, so bare test:e2e and CI e2e keep their old scope; Task 6 must pass --project=visual - medium: argv parsing in playwright.config.ts
Ruling: Google Fonts (fonts.googleapis.com, fonts.gstatic.com) pass through to the network in visual; everything else is blocked - self-hosting fonts changes the app and is out of P0 scope - medium: font CDN drift can move baselines
Deferred: tests/AGENTS.md still describes tests/visual as .gitkeep-only; typecheck does not cover tests/visual/** - Task 24
Task 3: done - (subagent sonnet) controller rerun: playwright test --project=visual public -> 72 passed against local baselines; lint 0; local PNGs stay untracked until Task 6
Task 4: done - (subagent opus) controller rerun: playwright test --project=visual -> 192 passed (72 public + 12 support + 108 room); lint 0
Ruling: room join screenshot is viewport-only, other room states full-page - overlay backdrop covers only the viewport - low
Deferred: room header overflows horizontally at 375 px (full page 463-473 px wide, account button off-screen); current Vue behavior, captured in baselines - P5 mobile spec
Task 5: done - (subagent opus) controller rerun: playwright test --project=visual -> 336 passed (modals 144 incl. 24 trends-chart clips); lint 0; typecheck 0
Round task-5 1: trends screenshot passes at 1% even with chart lines missing; add chart-clipped screenshot and separate DEV/QA lines in fixture
Ruling: trends gets a second screenshot clipped to the ECharts plot area (TRENDS_PLOT_INSET); with clock jump 0 all 24 chart clips fail - full-modal shot misses absent lines at 1% - medium: classic dark margin only 1.1-1.4%, stricter threshold would break Decision 4
Ruling: fixture QA alignment 71 vs DEV 86 in two history rounds (Emery 8->13, 5->8) so both trend lines are visible - only scene.ts reads the fixture - low
Ruling: ECharts animation completes by advancing the frozen clock 5 s and back to FROZEN_NOW in the spec, no app change - low
Task 6: done - actionlint 0; Visual baselines run 40140558827 success; CI run 40140903128 on e86533d attempts 1 and 2 -> Visual success, all required checks success, baselines unchanged
Ruling: Visual project runs with retries 0 so a flaky screenshot cannot pass on retry - low
Ruling: baselines = artifact visual-baselines of run 40140558827 (PR #46, label update-visual-baselines), 348 PNGs, replace local macOS captures - owner approved push and draft PR - low
Ruling: visual-baselines also runs on pull_request labeled update-visual-baselines (job-level if, no concurrency) - workflow_dispatch needs the file on main - low
Ruling: Visual and baselines jobs run in playwright:v1.64.1-noble with --user root, HOME=/root - container defaults to HOME=/github/home - low: confirmed only by a real run
Task 7: done - (subagent opus) commit 3034743; controller rerun with CI dummy VITE_SUPABASE_* : icons:check, typecheck (3 projects), lint 0, test:unit 158 passed, build, icons:audit-build (delta -275849 B gzip), playwright page-load + icon-delivery 16 passed; git ls-files *.vue -> empty
Task 8: done - (subagent opus) commit 31dbdd8; controller rerun: tsc -v -> Version 7.0.2; test:ci exit 0 (oxlint --type-aware 0 errors, 159 unit tests); icons:audit-build passed; page-load + icon-delivery 16 passed; no eslint/@vue packages in package.json
Task 9: done - (subagent opus) commit 88f2d29; controller rerun: test:icons:harness -> 30 passed (24 catalog screenshots), 33 skipped (room view fixme -> Task 21); typecheck 0; lint 0
Task 10: done - (subagent opus) commit c97094c; store specs 65 -> 69 cases, all 65 titles kept; controller rerun: test:ci exit 0, 228 unit tests
Task 11: done - (subagent sonnet) commit e252dcf; i18n spec 3 -> 5 cases incl. sp-lang=en before init; git diff --stat main -- app/i18n/locales empty; controller rerun: test:ci exit 0, 233 unit tests
Task 12: done - (subagent opus) commit b8d878a; hook specs 28 old cases kept, 36 total; controller rerun: test:ci exit 0 (269 unit tests), page-load + icon-delivery 17 passed incl. new init-script palette test; index.html unchanged
Task 13: done - 6324620 + 6ff3ed7 (opus): test:ci exit 0 (281 unit), page-load + icon-delivery 17 passed, no composables in excludes, app/pwa.ts override gone
Task 14: done - 9152423 (opus): test:ci exit 0 (290 unit), page-load + icon-delivery 17 passed, main.css diff additions only + @source {ts,tsx}, tsc 7.0.2, Button computed styles = .mui-btn* in 6 palettes x 2 widths
Task 15: done - 9f287b8 (opus): test:unit components 21 passed, test:ci exit 0 (311 unit), page-load + icon-delivery 17 passed, header menu checked in built preview
Task 16: done - 707c57e; controller rerun: pnpm run test:ci -> exit 0 (329 tests); page-load + icon-delivery -> 17 passed; CI Visual on PR #46 pending
Task 17: done - 0be53b7; controller rerun: pnpm run test:ci -> exit 0 (336 tests); page-load + icon-delivery -> 17 passed
Task 18: done - 7c74a63; controller rerun: pnpm run test:ci -> exit 0 (375 passed, 1 todo); page-load + icon-delivery -> 17 passed; room-* baselines wait for Task 19 (Timer in every room shot)
Task 19: done - a6f7669; controller rerun: pnpm run test:ci -> exit 0 (407 passed, 1 todo); page-load + icon-delivery -> 17 passed; CI Visual run 40213360416 pending
Task 20: done - 3ae6d5d, e3e0e5a; controller rerun: pnpm run test:ci -> exit 0 (445 tests); page-load + icon-delivery -> 17 passed; CI run 40215942021 all green incl. Visual (full set: public, room, modals, scenes)
Task 21: done - 5ef37b3; controller rerun: pnpm run test:icons:harness -> 63 passed; pnpm run test:ci -> exit 0 (445 tests)
Task 22: done - 90428d8 (opus) + 59e8bc4 (controller: AppIcon spec port, dice faces from PlayerRow.tsx); controller rerun: pnpm run test:ci -> exit 0 (449 tests); page-load + icon-delivery -> 26 passed (9 new AC22 console cases); AC20 unverified - missing credentials: .env/.env.test for critical-flows (CI E2E skipped without secrets); no baselines updated
Task 23: done - dbf7c8f, 85c8cf5, c11cf11 (opus); controller rerun: pnpm run test:ci -> exit 0 (440 tests: -11 with removed hooks, +2 new); page-load + icon-delivery -> 26 passed; every remaining .mui-* in main.css has a use in app/**/*.tsx; CI Visual on c11cf11 pending
Task 24: done - 890a2c2, 07bff8e (opus); controller rerun: stale-stack grep over AGENTS.md files -> 0; wc -c AGENTS.md -> 17621 (<= 28672), heaviest chain app/components 27303 B; pnpm run test:ci -> exit 0 (440 tests); CI run on c11cf11 all green incl. Visual (Task 23 CSS cleanup)
Task 25: done - c8b6a3d (baselines in Git LFS), 9cf9668 (merge origin/main #28/#29/#31, ResultsArea hyphen port); CI run 40229322347 on 9cf9668 all green incl. Visual from LFS (E2E skipped, no secrets); local Supabase (colima + supabase start, 20/20 migrations) -> playwright chromium x3 -> 15 passed, full test:e2e in mcr.microsoft.com/playwright:v1.64.1-noble -> 33 passed (critical-flows two browsers: vote, reveal, reset, rename, kick on the built preview = AC20, AC25); pnpm run test:ci -> exit 0 (446 tests); nothing merged or deployed
Ruling: owner decision 2026-10-25 - P0-P4 stay on 2610242233-dev-session in the main checkout, no worktrees, no P0 squash into main, one PR #46 at parity; spec Decisions 2-3 and AC13/20/23/25 updated to match - main fixes during migration get ported into this branch - low
Ruling: Vue-based stores/composables and their specs are excluded in tsconfig.json and vitest.config.ts instead of ported - Tasks 10-13 own the ports - high if forgotten: each of Tasks 10-13 must drop its exclude entries or its RED/GREEN proves nothing
Ruling: AppIcon prop is name (Vue used icon); scanner and iconManifest bindings follow; inputNames unchanged - low
Ruling: eslint-plugin-vue stack kept until Task 8 deletes eslint.config.js - low
Ruling: tests/icon-rendering vite.config.ts and tsconfig.json moved to plugin-react/tsx in Task 7 to keep typecheck green - Task 9 still owns the harness - low
Deferred: @testing-library/dom peer of @testing-library/react not installed - Task 15
Deferred: docs/audits/icon-bundle-baseline.json is stale after the Vue removal (delta -275 KiB) - Task 23
Deferred: playwright.config.ts sets VITE_SUPABASE_* to '' without shell env, so local page-load needs the CI dummy values (pre-existing) - Task 24 docs
Ruling: RED failed with TypeError reading ts.ScriptKind.TSX (TS 7 main export is only lib/version.cjs), not Cannot find module - same cause, different text - low
Ruling: oxlint = correctness at error + react/rules-of-hooks, react/exhaustive-deps warn, typescript/no-floating-promises error, no-explicit-any and no-unused-vars ^_ warn; Task 7 exclude list mirrored in ignorePatterns - Tasks 10-13 remove entries there too - medium
Ruling: per-file overrides for Playwright fixtures ({}, use), generated database.types.ts, deliberate stubs in pwa.spec.ts and swReloadClients.spec.ts, String(unknown) in tests/visual fakeSupabase - test or generated code only - low
Deferred: .oxlintrc.json rules-of-hooks off for app/pwa.ts (useAppUpdate is not a hook yet) - Task 12 removes the override when porting
Deferred: AGENTS.md "TypeScript лишається 6.x" [TypeScript remains 6.x], README ESLint mentions, vitest.config.ts __dirname warning - Task 24
Ruling: delivery.spec.ts room-view tests also fixme until Task 21 (they load view=room) - outside Task 9 Files but same cause - low
Deferred: app/assets/css/main.css @source still globs {vue,ts}, not tsx (Tailwind auto-detection covers it today) - Task 14
Ruling: visiblePlayers is a stored field recomputed by usePlayersStore.subscribe on players change - stable array identity for React selectors - low
Ruling: room actions snapshot roomId/roomState via get() at call start instead of re-reading after each await; reveal's history row uses round_started_at/active_cards/deck_preset that reveal itself does not change - low
Ruling: app/stores/AGENTS.md heading and access/reset notes updated with the port - outside Files, belongs to the stores scope - low
Deferred: tests/AGENTS.md still names deleted tests/support/setup/vitest.ts; auth initialized flag and profiles pending-fetch cache are module-level and not reset by resetStores() - Task 24 / when a test needs it
Ruling: fallbackLng uk per plan (Vue had fallbackLocale en) - uk.json and en.json have identical key sets, so no visible difference - low
Ruling: persistLocale also calls i18n.changeLanguage (Vue switched locale at the call site) - callers in Tasks 12/16-19 must not switch twice - low
Ruling: app/main.tsx imports ~/i18n so html lang and i18next init before render - low
Ruling: theme and volume state in Zustand vanilla stores (themeStore, soundVolumeStore) exported for non-component code; stores read localStorage on creation - low
Ruling: header menus share one plain HeaderMenu component (button + list) for Task 15 to swap to Base UI Menu; account menu holds only language items until Tasks 16-18 - low
Ruling: useClickOutside/useMenuKeyboard specs are .spec.tsx (oxlint react(refs)); vitest include and tsconfig include extended to tests/unit/**/*.tsx - low
Ruling: profiles.ts type import moved to ~/hooks/useDylanAvatar; iconManifest gets the header's two dynamic bindings - forced by the composable deletion - low
Deferred: correction - the app/pwa.ts rules-of-hooks override belongs to Task 13 (useAppUpdate), not Task 12 - Task 13
Deferred: App.tsx does not call useTheme init() / initVolume() as App.vue did (inline script covers html attrs today) - Task 13 wires them
Deferred: page-load init-script test reads attrs at the first module script; only valid on the built preview, not the dev server - Task 24 docs
Ruling: Task 13 landed in two commits - the owner asked for periodic /commit-all checkpoints (6324620 also carries the owner's .gitignore, AGENTS.md, scripts/skills.sh edits) - low
Ruling: App.tsx calls soundVolumeStore.getState().initVolume() instead of useSoundVolume() - avoids re-rendering the app on volume change - low
Ruling: useAppUpdate rules live in exported appUpdateStore (pwa.ts calls getState().scheduleUpdate) - low
Deferred: app/AGENTS.md, tests/AGENTS.md, app/components/AGENTS.md, app/pages/AGENTS.md still mention composables - Task 24
Deferred: StrictMode double-mount in dev creates 5 unused Audio objects in useCountdown (cleanup correct) - Task 19
Ruling: components.json has no `base` field; shadcn encodes Base UI as style "base-nova" (`shadcn info --json` -> base: "base") - AC8 checked that way - low
Ruling: :root --radius-input: 4px is the classic palette default (existing var(--radius-input, 4px) fallbacks), not a shadcn token literal - low
Ruling: palette --primary/--border and text utilities --color-primary/--color-muted are kept; shadcn code uses bg-(--primary), bg-(--muted) instead of bg-primary/bg-muted - later ui code must follow - medium
Ruling: init output trimmed (Geist fontsource, base-layer outline-ring/border rules, oklch :root/.dark blocks, chart/sidebar/card tokens) to keep visuals identical - low
Ruling: Button variants default/text/secondary, sizes default/sm/md; useRipple() is a callback ref not attached by Button - low
Deferred: lucide-react icons in ui/dialog, dropdown-menu, select break the local-icon rule (icons:check misses React icons) - Task 15/20 swap to AppIcon
Deferred: shadcn CLI in dependencies only for shadcn/tailwind.css import; consider devDependencies or inlining its variants - Task 23
Deferred: app/lib/utils.ts re-exports cn, unused (components import "cn") - Task 23
Deferred: switch thumb --bg-app vs Vue #fafafa; dialog footer "Close" untranslated - Task 15/20
Deferred: app/assets/AGENTS.md lacks the token bridge description - Task 24
Ruling: owner 2026-10-25 - lucide-react icons inside app/components/ui stay as shadcn generates them; supersedes the lucide Deferred above; rule updated in app/components/AGENTS.md - low
Ruling: PlayerRow.spec ports the keyboard/menu cases against AppMenu/AppMenuItem (PlayerRow comes in Task 18); RoleBadge is-excluded cases owed by Task 18 - low
Ruling: AppModal renders the Base UI popup as <dialog open class="app-modal"> with .mui-modal-overlay inside, modal="trap-focus" (no scroll lock); AppModalPaper close calls onClose directly so it works under lockDismiss - low
Ruling: AppTooltip adds role="tooltip" + aria-describedby itself and keeps the popup mounted (Base UI sets neither) - low
Deferred: tests/visual/room.spec.ts:65 row.getByRole('menu') breaks with the portaled menu - selector fix, not a baseline - Task 18
Deferred: RoleBadge is-excluded cases from the Vue PlayerRow spec - Task 18
Deferred: AppModalPaper onPointerDown stopPropagation may stop Base UI outside-click close for a Select inside a modal - Task 20
Deferred: always-mounted tooltips per PlayerRow - watch resize performance - Task 18
Deferred: useClickOutside, useMenuKeyboard used only by their specs; unused dropdown-menu submenu/checkbox/radio parts - Task 23
Deferred: header menu placement at 375 px under Base UI collision avoidance - Task 22 Visual run
Ruling: app/pages/AuthPageLayout.tsx added outside Task 16 Files - shared header + paper shell of the four auth pages - low
Ruling: signup skips the user redirect while signUp is in flight; page forms submit only via form submit (Vue also fired keyup.enter, double submit) - low
Ruling: auth pages keep native inputs with .mui-input; ui/input.tsx not bridged (its utilities override the floating label) - low
Deferred: forgot-password classic light/dark at 1280 differs 0.02 locally on macOS (caption wraps) - CI Visual run 40208875784 on 0be53b7 passes it (macOS font metrics only) - closed
Deferred: Sign in / Sign up / Sign out items in the AppHeader account menu - Task 18
Deferred: AuthModal not mounted yet; modal-auth-* baselines - Task 18
Deferred: ripple may vanish when the submit label text changes; wrap the label in a span - Task 20
Ruling: react-router 7.18.4 -> 8.5.0 by owner decision 2026-10-25; spec decision 7 updated - v8 breaking changes hit only framework/data mode and react-router-dom, unused here; test:ci exit 0 (329), page-load + icon-delivery 17 passed - low
Ruling: home mounts AppHeader without props; returning player's header avatar seed (headerPlayerName) dropped until the header gets auth/profile props - no baseline covers it - low
Deferred: home headerPlayerName avatar seed, AuthModal and UserSettingsModal on home - Task 18 / Task 20
Ruling: CI Visual run 40208875784 on 0be53b7: 79 passed (all public login/signup/forgot/reset/home, 1280 + 375), 257 failed only in room.spec, modals.spec and room scene self-checks - routes still stubs until Tasks 18-21 - low
Ruling: Task 18 touched AppIcon (aria-label), AppTooltip (className), AppMenu (sideOffset/alignOffset), AppHeader (room/auth/countdown items), router.tsx (no Titled on /:slug), index.tsx (header player name, AuthModal), main.css (confetti + slot-winner blink), iconManifest (2 dynamic entries), room.spec.ts:65 page.getByRole('menu'); PageStub.tsx deleted - deferred items and Vue scoped styles - low
Ruling: ConnectionBanner mounts in the room page, not App.tsx, without fade - Presence runs only in the room; no baseline covers it - low
Deferred: Timer/SlotMachine, side-widget setting, spin counts and outgoing slot broadcasts - Task 19
Deferred: PlayerRow Edit, header History/Trends/Configure deck/Room background/Account settings handlers, save handlers for player edit/deck/alarm/background, roomPage HistoryModal todo - Task 20
Deferred: tests/visual/modals.spec.ts:135 row.getByRole('menuitem') portal selector - Task 20
Deferred: home.spec "creates a room" flaked once (lastVisitedAt off 40 ms under advancing fake time) - failed CI Unit tests on a6f7669; fixed in a97d1e5 (fake only Date) - closed
Deferred: build warns about chunks > 500 kB - Task 23
Ruling: useCountdown mount() reuses Audio objects via ??= instead of lazy creation - countdown needs audio.duration early; StrictMode test added - low
Ruling: Timer reveal duration uses the last 1 s tick (react purity forbids Date.now() in render); alarm firing computed in render, chime from an effect; alarm minutes input uncontrolled, commits on blur/Enter - lint rules; behavior covered by specs - low
Deferred: PO/SM get 5 slot spins per round in Vue code, docs (AGENTS.md, app/components/AGENTS.md, DESIGN.md 11.8) say 3 - kept Vue behavior; fix docs - Task 24
Deferred: authPages.spec flaky "document is not defined" from a useRipple timer after env teardown (1 of 5 runs) - Task 23
Deferred: SlotMachine reel animation unchecked in a real browser - Task 21 harness widget=slot
Ruling: CI Visual run 40213360416 on a6f7669: 204 passed (all public, room.spec and scene self-checks), 132 failed only in modals.spec - modals are Task 20 - low
Ruling: Task 20 extra paths - app/hooks/useShieldsMap.ts (shared by History/Trends), AppModal initialFocus, RolePicker className, ui/select.tsx positioner z-[1400] (above .mui-modal-overlay 1300), wiring in [slug].tsx/index.tsx/App.tsx, .room-background-frame CSS, trend icon binding, ripple label spans in the auth pages and AuthModal, modals.spec selectors (page.getByRole('menuitem'), canvas instead of x-vue-echarts) - low
Ruling: AlignmentTrendsModal loads lazily - eager load put the entry 108 KB gzip over the icons:audit-build budget; first Trends open fetches ~188 KB gzip - medium
Ruling: RoundSnapshotModal renders nested inside History/Trends - siblings let Tab escape the snapshot; UpdateBanner without fade; deck preset list opens below the field (alignItemWithTrigger=false) - low
Ruling: AppModalPaper onPointerDown stopPropagation kept - Select outside press closes the list, not the modal (test + browser) - low
Deferred: deck Select chevron 1 px shorter with rounded ends vs native - owner approval of the modal-configure-deck baselines - CI Visual 40215942021 passes at 1% threshold, no baseline update - closed
Deferred: configure-deck classic light 375 chip rows wrap differently (chips ~1 px wider than the Vue light baseline; Vue dark agrees with React) - CI Visual 40215942021 passes at 1% threshold, no baseline update - closed
Deferred: skip link text read from uk.json directly, not via i18n - Task 23
Ruling: harness side-column icon count 36 -> 37 - the moderator alarm toggle (c88391c, #32) never updated the count because the harness does not run in CI; Vue Timer had the same button - low
Ruling: harness renders the ready marker immediately, showJoin starts from role === 'guest' (react set-state-in-effect); theme/volume init inside RoomHarness - low
Ruling: SlotMachine checked in Chromium via the harness (widget=slot): 3 reels spin 1100/1700/2300 ms, settle on result symbols, no console errors - closes the Task 19 deferral - low
Deferred: harness room screenshots are saved but never compared to a reference - Task 23 or a separate task
Ruling: Task 22 extra paths - tests/e2e/smoke.spec.ts (reveal needs 2 votes since 2858fc3, second voter context), tests/visual/support/{fakeSupabase,scene}.ts optional supabaseUrl for the AC22 room cases - low
Ruling: AC22 RED evidence - injected console.error on /ffc and a setTimeout throw on /login both failed the test, reverted - low
Deferred: AC20 critical-flows and smoke against the test Supabase - needs .env/.env.test or CI E2E secrets; realtime sync between two browsers and AuthPage.login unchecked - owner
Deferred: no tsconfig covers tests/e2e/** and tests/page-objects/** (checked once with a temporary tsconfig, tsc 7.0.2 exit 0) - Task 25
Deferred: AppIcon sets aria-hidden together with aria-label, so the label is never announced - Task 23
Ruling: Task 23 extra paths - useClickOutside/useMenuKeyboard deleted with specs (no consumer), useRipple tracks and cancels pending waves on unmount (authPages flake root cause, 10/10 runs), skip link via t('common.skipToContent'), AppIcon with aria-label renders role=img without aria-hidden, shadcn moved to devDependencies; ui/dropdown-menu.tsx unused parts kept as generated - low
Ruling: build chunk > 500 kB warning kept - icons:audit-build requires a single assets/index-*.js and measures the entry with CSS; manualChunks breaks that contract - medium
Deferred: docs/audits/icon-bundle-baseline.json measured on Vue, delta -78880 B gzip makes the 25 KB budget slack - re-measure with real credentials - owner
Deferred: PlayerRow status icons now carry aria-label and sit in an AppTooltip trigger with aria-describedby - likely announced twice (Vue never announced it) - Task 25
Deferred: tw-animate-css is build-time only but in dependencies - Task 25
Deferred: harness room screenshots - recommend toHaveScreenshot with container baselines or moving room view to tests/visual - owner
Deferred: app/assets/AGENTS.md:15-16 lists removed .mui-btn-sm/.mui-btn-text/.mui-btn-secondary; app/components/AGENTS.md:8 mentions useClickOutside - Task 24
Ruling: Task 24 closes the docs deferrals (tests/visual, dummy env, resetStores module state, init-script preview, composables, token bridge, PO/SM 5 spins, removed mui classes); DESIGN.md §1-§10 audit notes left as dated history; netlify/AGENTS.md TeamConsistencyTrends.vue names the neighbouring Nuxt repo, correct - low
Deferred: vitest.config.ts __dirname warning (code) - Task 25
Ruling: owner decision 2026-10-25 - nothing is merged; one shared prod database must keep working until the merge, so no deploy:stage and every check runs locally; spec AC25 and Task 25 Check updated - low
Ruling: Task 25 pre-gate fixes 851cf1f (tests/e2e/tsconfig.json covers e2e, page-objects, visual; 4th typecheck step), 2f05045 (AppTooltip describeTrigger=false for PlayerRow status/moderator/dice icons, labelled once), ad9e347 (tw-animate-css to devDependencies, vitest.config.ts without __dirname); controller rerun: pnpm run test:ci -> exit 0 (446 tests, no __dirname warning), page-load + icon-delivery -> 26 passed - closes four Task 25 deferrals - low
Ruling: AC20 and AC25 checked on a local Supabase instead of the shared prod database: supabase/config.toml (gitignored) with enable_confirmations = true and site_url http://localhost:4173, runner outside the repo; closes the AC20 Deferred - low
Deferred: migrations carry no GRANT for anon/authenticated; current Supabase images no longer grant table privileges by default, so a fresh project (local or the planned e2e test project) gets 'permission denied for table rooms' until grants are added (local run used a gitignored seed.sql) - owner
Deferred: WebKit on macOS 14 is a frozen build under Playwright 1.64 (Unknown setting: PushAPIEnabled); run webkit in the Playwright container - owner
Ruling: owner decision 2026-10-25 - visual baselines move to Git LFS in this PR (.gitattributes, 348 PNG pointers; Visual job installs git git-lfs and checks out with lfs: true); squash merge keeps binary PNGs out of main history; reference screenshots of the inspiration service go to a separate private io-upstars repo, requested in skills-aiassist - low
Deferred: RoleBadge, CardsArea, Timer, SlotMachine tooltips not checked for the same double announcement - follow-up
Ruling: owner allows the local preview check to create one room in the shared prod database - low
Deferred: root AGENTS.md Workflow still recommends git-worktree-isolation vs the 2026-10-25 one-branch learning - session-learnings triage
Ruling: owner decision 2026-10-25 - deviation from Vue parity in this PR: the room page links the current player to the signed-in user whenever the player has no user_id (auto-rejoin after signing in outside the room AuthModal left players.user_id null, so the avatar never showed; Vue main had the same gap); replaces handleAuthSuccess; roomPage.spec 'room page account link' x3, test:ci 449 - low
```

### Task 22: old Vue spec → React test

Method: the `it`/`test` names in each spec from `3034743^` were compared with `tests/unit/**`, and differences were reviewed manually.

| # | Vue spec | React test | Note |
|---|---|---|---|
| 1 | components/AppIcon.spec.ts | components/AppIcon.spec.tsx | 4/4, ported in 59e8bc4 |
| 2 | components/AppModal.spec.ts | components/AppModal.spec.tsx | 4/5 by name; cancel → Escape unless lockDismiss |
| 3 | components/AppTooltip.spec.ts | components/AppTooltip.spec.tsx | focusin/focusout → focus/blur |
| 4 | components/CardsArea.spec.ts | components/CardsArea.spec.tsx | 2/2, more checks |
| 5 | components/ConfigureCardDeckModal.spec.ts | components/ConfigureCardDeckModal.spec.tsx | 3/3 |
| 6 | components/PlayerRow.spec.ts | components/PlayerRow.spec.tsx | 6/7; Escape + focus restored |
| 7 | components/ResultsArea.spec.ts | components/ResultsArea.spec.tsx | 7/7 |
| 8 | components/RoomBackgroundModal.spec.ts | components/RoomBackgroundModal.spec.tsx | 9/9 |
| 9 | components/SlotMachine.spec.ts | components/SlotMachine.spec.tsx | 2/2 |
| 10 | components/Timer.spec.ts | components/Timer.spec.tsx | 14/14 |
| 11 | components/UserSettingsModal.spec.ts | components/UserSettingsModal.spec.tsx | 12/12 |
| 12 | composables/useAppUpdate.spec.ts | hooks/useAppUpdate.spec.ts | 10/10 |
| 13 | composables/useCountdown.spec.ts | hooks/useCountdown.spec.ts | 2/2 |
| 14 | composables/useDylanAvatar.spec.ts | hooks/useDylanAvatar.spec.ts | 6/6 |
| 15 | composables/useMenuKeyboard.spec.ts | hooks/useMenuKeyboard.spec.tsx | 8/8; hook without a consumer (Task 23) |
| 16 | composables/useSoundVolume.spec.ts | hooks/useSoundVolume.spec.ts | 8/8 |
| 17 | composables/useTheme.spec.ts | hooks/useTheme.spec.ts | 3/3 |
| 18 | i18n.spec.ts | i18n.spec.ts | persistLocale also updates language |
| 19 | pages/roomPage.spec.ts | pages/roomPage.spec.tsx | 14/14 |
| 20 | pwa.spec.ts | pwa.spec.ts | 6/6 |
| 21 | stores/auth.spec.ts | stores/auth.spec.ts | 3/3 |
| 22 | stores/players.spec.ts | stores/players.spec.ts | 17/17 |
| 23 | stores/presence.spec.ts | stores/presence.spec.ts | 9/9 |
| 24 | stores/profiles.spec.ts | stores/profiles.spec.ts | 6/6 |
| 25 | stores/room.spec.ts | stores/room.spec.ts | 30/30 |
| 26 | swReloadClients.spec.ts | swReloadClients.spec.ts | 4/4 |
| 27 | utils/alignment.spec.ts | utils/alignment.spec.ts | 7/7 |
| 28 | utils/authValidation.spec.ts | utils/authValidation.spec.ts | 3/3 |
| 29 | utils/avatarImage.spec.ts | utils/avatarImage.spec.ts | 5/5 |
| 30 | utils/backgroundImage.spec.ts | utils/backgroundImage.spec.ts | 11/11 |
| 31 | utils/cardDecks.spec.ts | utils/cardDecks.spec.ts | 5/5 |
| 32 | utils/iconCss.spec.ts | utils/iconCss.spec.ts | 7/7 |
| 33 | utils/iconManifest.spec.ts | utils/iconManifest.spec.ts | 18/18; dice faces again from PlayerRow.tsx (59e8bc4) |
| 34 | utils/iconResolver.spec.ts | utils/iconResolver.spec.ts | 4/4 |
| 35 | utils/iconSubset.spec.ts | utils/iconSubset.spec.ts | 4/4 |
| 36 | utils/resultCelebration.spec.ts | utils/resultCelebration.spec.ts | 16/16 |
| 37 | utils/resultCohorts.spec.ts | utils/resultCohorts.spec.ts | 13/13 |
| 38 | utils/roundStats.spec.ts | utils/roundStats.spec.ts | 11/11 |
| 39 | utils/shields.spec.ts | utils/shields.spec.ts | 11/11 |
| 40 | utils/slotMachine.spec.ts | utils/slotMachine.spec.ts | 6/6 |
| 41 | utils/timerAlarm.spec.ts | utils/timerAlarm.spec.ts | 8/8 |
| 42 | utils/useClickOutside.spec.ts | hooks/useClickOutside.spec.tsx | 3/3; hook without a consumer (Task 23) |

New React specs without a Vue predecessor: AppHeader, AuthModal, HistoryModal, PasswordInput, PlayerEditModal,
useCardLabel, useRipple, authPages, home. Updated baselines: none.
Verify: INCOMPLETE compact tree 91eee5b5652792c583628176f3935657d39f0805 2026-10-25 23:58 (README Install + supabase:local; clean-Mac sequence not run here)
Review R1: code reviewer codex gpt-6.1-sol effort low, range 5ed0b18..10cd0d9, tree 77a7509ba2e86d8e5e17b1e68e18564ea29c35ea, Intent FINDINGS / System PASS / Craft PASS, ~$0.49 (Codex 5h window 100% -> 86%, weekly 86% -> 84%)
Finding R1-codex-F1: Important README.md:253 - clean-Mac e2e path never installs the Playwright browser
Received R1: R1-codex-F1 ACCEPT - README Local Supabase adds pnpm exec playwright install chromium; Re-review: not needed (one-line docs fix)
Ruling: owner 2026-10-26 - CI e2e against a local Supabase on the runner, Detect secrets dropped from required checks; visual baselines no longer stored (348 PNG, Git LFS and visual-baselines.yml removed), Visual compares the PR base render with the head via scripts/visual-compare.sh
Verify: PASS full tree 9616cb761efc173b1a1c60bba056379b5353bc17 2026-10-26 00:52
Verify: PASS full tree 5d3e2c8f1f4ba2ca0801f13e17ee6e3902b152c8 2026-10-26 01:08

Review R2: code reviewer antigravity gemini-4-argon effort medium, base b1966d22e1eff384bac7e46ca056fa9b3aa7836f head 4e938643e29655cbcf2b5c7ee6794a4345810acf, tree 5d3e2c8f1f4ba2ca0801f13e17ee6e3902b152c8, Intent PASS / System FINDINGS / Craft PASS; Critical 0 Important 0 Minor 1; run /var/folders/90/7q5z35ds6nsckrxxgpllp4wh0000gn/T/cross-review/20261026-013226; tokens 361939 input, 2393575 cached, 18885 output, 7751 reasoning; cost unknown
Finding R2-antigravity-F1: Minor - Select portal allegedly conflicts with AppModal showModal top-layer
Received R2: R2-antigravity-F1 REJECT - current AppModal.tsx:25-48 uses Base UI Dialog modal="trap-focus" and render={<dialog open />}, with no showModal() call; current select.tsx Positioner is z-[1400], not the reported z-[1100]. The claimed native modal top-layer mechanism is absent. No code change; Re-review: not needed (no accepted finding).
Ruling R2 set-aside: legacy spec wording on stored visual baselines and Detect secrets stays superseded by the explicit owner decision; current-player user_id linking is an authorized deviation; ffc localization and CSS parity remain outside this review fix scope. Suggestions not applied.
Round review 2: no accepted findings; reviewer claim rejected against current source; runtime services not rechecked by reviewer.
Review R2 so-upstars: PR #46 review on 6d059540f42f98104a0c4ef820df1c9504d2d338, tree 3fa81eac6149a80b7409dcc321705719c948ac20, Intent FINDINGS / System FINDINGS / Craft FINDINGS; Critical 0 Important 3 Minor 17
Received R2 so-upstars: R2-C-F1 ACCEPT - claude-review gate decides on the required jobs only (REQUIRED_JOBS); R2-A-F1 ACCEPT - AuthPageLayout wires the header like the Vue pages; R2-A-F2 ACCEPT - /ffc uses t(), inits auth, mounts AuthModal and UserSettingsModal; Re-review: needed (gate and page behavior), the automatic R3 review covers it
Received R2 so-upstars: ACCEPT A-F3 (replace navigation after sign-in), A-F4 (shared init promise), A-F5 (fallbackLng en as in Vue), A-F6 (unmount test), A-F9 (comment removed), A-F13 (unused ui/switch.tsx removed), C-F2, C-F3, C-F4, C-F5, C-F6; REJECT A-F7 (Date.now() in render fails the react purity lint), A-F10 (not reproduced, join e2e green), C-F7 (gitignored import is the session-learnings design); DEFER A-F8, A-F11, A-F12
Ruling: owner 2026-10-26 via R2 - shadcn Switch is not adopted; /ffc and PlayerRow keep .mui-switch (and the /ffc reset button .mui-btn) for pixel parity with the Vue render; spec section 8 updated
Deferred: banner fade-out on hide (R2-A-F8) needs an exit transition for conditionally rendered banners - owner
Deferred: alarm minutes commit on spinner steps (R2-A-F11) needs a native change listener; now commits on blur and Enter - owner
Deferred: AppModal renders <dialog open> without showModal(), so z-[9999] banners draw over an open modal (R2-A-F12) - owner
Round review 3: R2 so-upstars - 3 Important accepted and fixed, 11 Minor fixed, 3 rejected with evidence, 3 deferred
Review R3 so-upstars: PR #46 review on ac23a9e158898f7ee01ed9942e27af52cfc4b8d6, Critical 0 Important 0 Minor 4, verdict ready; follow-ups in issue #51
Received R3 so-upstars: ACCEPT A-F1 (auth init clears its cached promise on failure, test for a retry after a rejected getSession), C-F1 (README names the other-URL rewrite), C-F2 (supabase-local.sh keeps .env/.env.test.bak and prints the replaced URL), C-F3 (visual-compare.sh probes 127.0.0.1 and ::1); Re-review: requested manually from so-upstars
Review R4 so-upstars: PR #46 review on 8ade90db7344190e4bcff65a3a82fafd5b765823, tree d69f5d054cfe3b2e1a6c37b4ee0d212ff8a623a8, Intent PASS / System PASS / Craft FINDINGS; Critical 0 Important 0 Minor 1, all four R3 findings addressed
Received R4 so-upstars: R4-F1 ACCEPT - supabase-local.sh keeps an existing .env.test.bak instead of overwriting it; suggestion scripts/AGENTS.md row accepted; getSession error result left as in the Vue store; Re-review: requested manually from so-upstars
Review R5 so-upstars: PR #46 review on c1f6fc1285aa60dff66bbc3ffb9553a47196f8bc, Intent PASS / System PASS / Craft FINDINGS; Critical 0 Important 0 Minor 1, R4-F1 addressed
Received R5 so-upstars: R5-F1 ACCEPT - the keep-backup branch also requires .env/.env.test to exist, so a missing file prints only "wrote"; Re-review: not needed (log wording in a local script, checked on three states)
Review R6 so-upstars: PR #46 re-review on 614302bbe99130aa6ce99d58588477c43fb4fd77, tree 88c4d51c919b2a0d806801f500346eda31f25a05, Intent PASS / System PASS / Craft PASS; Critical 0 Important 0 Minor 0, R5-F1 addressed
Received R6 so-upstars: no findings to rule on; set-aside items (dangling .env.test symlink, matching URL with missing keys) stay out of scope as pre-existing and outside the fix diff; Re-review: not needed (clean round)
Verify: PASS full tree 7eb9ca0a18b848eaeeb31cc9e3b5060dd71672cb 2026-10-26 18:26
Verify: PASS full tree e9be0a420fcc48d7595f3889d6b8059b7c04fe32 2026-10-26 18:26
Ruling: owner 2026-10-26 - CI jobs E2E and Visual run only on workflow_dispatch while unstable (E2E: Supabase image pulls hit registry rate limits; Visual: about 6 minutes, to be cut to about 1 minute in a follow-up); neither is a required check
Verify: PASS full tree 6231e1cc9bdcb980ae838f8d38f1843189a9edbf 2026-10-26 18:47
Review R7 so-upstars (1384b23, tree 02170168c1b49b5f017dc313126e1caf328d0488): Critical 0, Important 0, Minor 1; ready
Finding R7-F1 Minor: on workflow_dispatch Visual compares with the origin/main tip instead of the PR base the docs describe
Round review 7
Received R7 so-upstars: R7-F1 ACCEPT - the dispatch falls back to git merge-base origin/main HEAD (ci.yml), README names it; set-asides stay out of scope (dispatch-on-main concurrency predates the PR, AC5 superseded by the owner ruling, historical journal line); open question answered by the fix (merge-base); Re-review: not needed (one-line fallback in an advisory dispatch-only job, actionlint and the expansion checked)
Verify: PASS full tree 7a584db25bd1d9a70e02218b2c6c264b460b3a5d 2026-10-26 18:53
Review R8 so-upstars: PR #46 re-review on 2fed0288e470f80a4cf34172505fce9a9d37fba0, tree b9062f99e4a50989ad05258c2a43038b09be77f3, Intent PASS / System PASS / Craft PASS; Critical 0 Important 0 Minor 0, R7-F1 addressed; ready
Received R8 so-upstars: no findings to rule on; Re-review: not needed (clean round)
Merged: PR #46 squash-merged into main as 31aa0b37384102672189df10c1642bdf6a422f2b by io-upstars 2026-10-26 19:40 +0200; head 2fed028, branch deleted

# Migration to React + shadcn/ui (Base UI) + TypeScript 7

Status: approved
Route: design
Date: 2026-10-24

## Goal

Story Poker moves from Vue 3.5 to React 19 and shadcn/ui primitives on Base UI, and from TypeScript 6.x to 7.
For users, the same URLs, localStorage sessions, Supabase data, roles, PWA updates, and the classic / cyberdeck /
matcha palettes in light and dark remain visually unchanged. For developers, the stack changes: shadcn components
in the project code, Base UI underneath, `tsc` from TS 7, and oxlint instead of ESLint.

The owner's motivation: at the time of #14, shadcn-vue had console errors and lagged on resize; the React version
of shadcn proved convenient, and some members of the shadcn and Base UI teams had worked on Material Design,
which informs the application's design.

Parts in build order (all P0-P4 in one branch, followed by one PR to `main`):

1. **P0. Vue visual oracle.** Screenshot suite and baselines from the current application, before any stack changes.
2. **P1. Skeleton.** React 19, Vite, TS 7, oxlint, shadcn (`base`), a palette token bridge, and CI with the same jobs.
   Vue code, Vue tooling, and Vue component tests are removed here; framework-independent utilities and their tests
   remain. P1 provides a React route shell: every route in the URL Schema renders a placeholder, keeping
   `Public pages load` and `Build` (with `icons:audit-build`) green; the icon rendering harness moves to React in
   the same PR. Real screens arrive in P3.
3. **P2. State and infrastructure.** Supabase client, stores, i18n, router, theme, feature flags, PWA registration.
4. **P3. Screens.** Pages, room with Realtime/Presence, modals, menus, charts, widgets; each screen's tests move
   in the same PR as the screen.
5. **P4. Cleanup.** Agent documentation, removal of `.mui-*` classes replaced by shadcn variants, final checks,
   merge into `main`.
6. **P5. Mobile layout (separate spec after P4).** Narrow-screen improvements based on the reference
   `https://app.storypoint.poker/S6W2gjT4`; this spec reserves the work for later.

## Evidence

| Assumption | State | Source |
| --- | --- | --- |
| Base UI has only a React version | verified | base-ui.com: “Base UI is a React library”; package `@base-ui/react` |
| shadcn CLI supports the Vite template and Base UI | verified | `shadcn@4.22.1 init --help`: `-t vite`, `-b base`, default preset `base-nova` |
| `@base-ui/react@1.9.0` is compatible with React 19 | verified | `npm view`: peer `react ^17 \|\| ^18 \|\| ^19`; `react@19.3.1` latest |
| TS 7 is stable | verified | `npm view typescript dist-tags`: `latest 7.0.2` |
| TS 7 lacks the classic compiler API | verified | exports of `typescript@7.0.2`: `.` → `lib/version.cjs`, AST only under `unstable/*` |
| `typescript-eslint` does not support TS 7 | verified | peer `typescript >=4.8.4 <6.1.0` |
| oxlint has type-aware linting on TS 7 | partial: separate `oxlint-tsgolint` package | `npm view`: `oxlint@1.89.0`, `oxlint-tsgolint@7.0.2005` |
| The icon generator parses code using `ts.createSourceFile` and recognizes `.vue` | verified | `scripts/icons/scan.ts:3,53,103` |
| `AGENTS.md` deliberately keeps TS at 6.x for these two reasons | verified | `AGENTS.md`, Tech Stack, line “TypeScript лишається 6.x” (TypeScript remains 6.x) |
| Scope: ~10.2k lines in `app/`, 42 unit specs (15 mount components), 68 `data-testid` | verified | `wc -l`, `grep` |
| There are currently no visual tests | verified | `tests/visual/` is empty |
| Reference at 375 px: full-width player list above a three-column card grid, header with player name, player menu via “⋮” | verified | screenshots of `app.storypoint.poker/S6W2gjT4` at 375 and 1280 px, 2026-10-24 (not saved in the repo: names of real people) |
| Palettes use CSS variables on `html[data-palette][data-theme]`, including per-element radii, shadows, borders, and fonts | verified | `app/assets/AGENTS.md` |
| shadcn keeps one token set (`--background`, `--primary`, `--radius`, ...) | assumed | typical shadcn `components.json` + CSS; checked in P1 |
| The room can be rendered for a screenshot without live Supabase | partial: Realtime/Presence | `tests/fixtures/data/icon-room.json` fixture and room harness for icons exist; REST can be mocked with `page.route` |
| Fonts and antialiasing differ on macOS and Linux, so baselines must be captured in one environment | assumed | general property of Playwright screenshots |

## Decisions

1. **React 19 + shadcn/ui on Base UI.** Full migration to React provides the exact combination requested by the
   owner, at the cost of rewriting the entire frontend. Rejected: shadcn-vue + Reka, given the experience in #14
   and the absence of Base UI; shadcn tokens without primitives, because that omits shadcn components.
2. **One branch, one PR.** P0-P4 are committed to one branch in the main repository directory (without a worktree),
   and one PR reaches `main` at parity, without intermediate squash merges. This was chosen over coexistence of
   Vue and React in `main`: `main` remains operational, but the branch must be updated periodically from `main`.
   Rejected: two frameworks together, requiring two routers and shared state throughout the transition; a separate
   P0 PR to `main` and an integration branch with wave PRs, per the owner's decision of 2026-10-25. Every push
   to the branch has green CI. There is no freeze on `main`: a fix or feature merged into `main` during the
   migration is ported to the React branch; if it changes UI, affected baselines are recaptured in the branch
   under decision 4.
3. **Visual oracle in the branch's first commits (P0).** Baselines are captured from the Vue application before
   Vue is removed, allowing parity to be checked by comparison. The cost is writing some test infrastructure
   (fixtures and Supabase mocking) before migration. `visual` is a new non-required CI job `Visual` in the
   Playwright container; it becomes required after the migration is merged. Owner's decision of 2026-10-26:
   baseline PNGs are not stored in the repo (Git LFS was removed); `scripts/visual-compare.sh` captures a baseline
   from the PR base revision (Vue `main` for the migration) and compares it with the branch head.
4. **Parity threshold: `maxDiffPixelRatio: 0.01` per screenshot.** The 1% threshold was chosen over 0.1%: minor
   Base UI antialiasing differences do not fail the test, while shifts and changes to color, radius, or font are
   caught. Rejected: manual comparison, which is not repeatable. An intentional screen change makes `Visual` red
   on its PR: the reason and diff are described in the PR, and merging follows the owner's explicit “yes”; the
   remaining screens must match the baseline.
5. **Palettes remain the source of truth; shadcn tokens derive from them.** Each shadcn token is defined through
   existing palette variables. This keeps each palette from splitting into two sets, but shadcn component styles
   must be adjusted for per-element variables (`--radius-*`, `--btn-*`, `--paper-border`, `--card-border`,
   `--shadow-*`, fonts). New palette variables may be added if existing values remain unchanged.
6. **TS 7 only: `tsc` for typecheck, oxlint with type-aware rules instead of ESLint, icon generator on
   `typescript/unstable/ast`.** This was chosen over TS 6 under an alias for old tools: one compiler, with a
   dependency on the unstable TS 7 API and another migration (ESLint → oxlint). The historical `AGENTS.md` rule
   “TypeScript лишається 6.x” (TypeScript remains 6.x) is deliberately revoked by this decision.
7. **Replacement stack:** react-router 8 (declarative mode, explicit routes) instead of vue-router, Zustand instead
   of Pinia, react-i18next using the same `uk.json`/`en.json`, ECharts through a custom hook instead of vue-echarts,
   `@testing-library/react` instead of `@vue/test-utils`, a custom Material Design-style ripple instead of `v-wave`.
   Rejected: TanStack Router + Jotai.
8. **What becomes shadcn components:** Dialog (currently AppModal), Tooltip (AppTooltip), DropdownMenu (AppHeader
   and PlayerRow menus), Select (native select in deck settings), Button (`.mui-btn*`), Input, Switch. Cards,
   Timer, SlotMachine, PieChart, and RoleBadge remain custom components. shadcn Button, Input, and Switch variants
   are built on palette variables and replace `.mui-btn*`; the `.mui-*` classes are removed once unused. Rejected:
   moving everything with a similar component to shadcn, since domain widgets have no equivalents. Clarification
   after review R2: Switch was not adopted; the `/ffc` and `PlayerRow` switches remain on `.mui-switch` (and the
   `/ffc` reset button on `.mui-btn`) for pixel equality with the Vue version.
9. **Baselines are captured in a Linux Playwright container of the same version as CI.** The container was chosen
   over local macOS so baselines match for CI and developers, at the cost of requiring Docker for local runs.

10. **Screenshot coverage: 1280 and 375 px, regular player and authenticated moderator roles for room screens.**
    Two widths and roles were chosen over one to catch mobile layout and role-specific UI, at the cost of
    ~500 screenshots and Supabase Auth mocking in P0.

11. **Mobile changes based on the reference are a separate P5 after parity, rather than part of P3.** This keeps
    the 375-px P0 baselines as a faithful migration oracle and separates the redesign from the rewrite. The cost
    is that mobile screens are initially ported with existing defects. In P5, 375-px baselines are recaptured one
    at a time with the owner's approval (Decision 4). Rejected: implementing mobile screens from the reference
    immediately in P3.

## Behavior

1. Every route in the URL Schema opens as before: `/`, `/<roomId>`, `/<slug>` (including the redirect from id to alias),
   `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/ffc`; the slug route handles unknown paths.
2. The React version reads sessions stored in localStorage by the Vue version: auto-rejoin, Recent Rooms, theme,
   palette, language, widget, volume, header seed, feature flags.
3. The theme and palette are applied before the first render (inline script), without a flash of another theme.
4. Roles, moderator and authenticated moderator gates, shields, result circles, consensus salute, timer with alarm,
   countdown and slot widget work according to `DESIGN.md` §11 and the rules in `AGENTS.md`.
5. Keyboard interaction with menus and modals (Enter/Space, Escape, focus trap, focus return) is at least as good as
   it is now; aria relationships for modal and tooltip titles are preserved.
6. PWA: the same `useAppUpdate` rules (hidden tab, idle time, toast) and temporary `sw-reload-clients.js` apply.
7. The browser console has no errors on any route; resizing the window causes no noticeable freezes (this is what
   broke shadcn-vue in #14).

## Contract

The following remains unchanged for external consumers and users:

1. URL Schema and the rules for `isValidRoomSlug()` / `normalizeRoomSlug()`.
2. localStorage keys and formats from the LocalStorage table in `AGENTS.md`.
3. Supabase schema, RLS, Storage bucket, Realtime channels and Presence payload: no database migrations.
4. The `/api/*` Netlify function and its Bearer contract; `public/_redirects`.
5. Locale files `uk.json` / `en.json`: keys and text remain unchanged (the interpolation format can be adapted as
   needed without changing user-facing text).
6. `data-palette` / `data-theme` attributes on `<html>` and palette CSS variables.
7. Existing `data-testid` attributes are preserved so that e2e tests and page objects remain valid.
8. CI job names: `Detect secrets`, `Lint`, `Typecheck`, `Unit tests`, `Build`, `Public pages load`, `E2E`;
   a non-required `Visual` job is added.
9. `pnpm run test:ci` remains the only local check that matches CI.

## Out of scope

1. New features, redesign and UI text changes in P0-P4.
2. Mobile layout requirements based on the reference: these belong in a separate P5 spec.
3. Changes to the database schema, RLS or Netlify function.
4. SSR, Next.js, React Server Components.
5. Removing the temporary `sw-reload-clients.js` (a separate task for the next release).
6. Replacing ECharts or DiceBear.

## Open questions

None. Resolved in the draft; the owner may revisit:

1. Screenshot room: Supabase REST and Auth are mocked with fixtures via `page.route`, the clock is frozen
   (`page.clock`), Realtime/Presence are disabled, and player online status comes from the fixture.
2. shadcn is installed with `init -b base` in the existing Vite project, without the `-t vite` template, to preserve
   `vite.config.ts` with PWA and `envDir`.

## Acceptance criteria

### P0. Visual oracle

1. AC1: `main` has a Playwright project `visual` with screenshots of home, `/login`, `/signup`, `/forgot-password`,
   `/reset-password`, `/ffc`, the join overlay, the room before reveal, the room after reveal with result circles,
   every modal (deck settings, history, trends, round snapshot, room background, player editing, user settings,
   auth), the open AppHeader menu, and the PlayerRow menu.
2. AC2: Every screenshot in AC1 is captured for all 6 combinations of `classic|cyberdeck|matcha` × `light|dark`
   at widths of 1280 and 375 px; room screens and menus are captured as a regular player and an authenticated moderator.
3. AC3: Two consecutive `visual` runs on the Vue version in the Playwright Linux container pass without updating
   baselines.
4. AC4: The `visual` configuration sets `maxDiffPixelRatio: 0.01`, disables animations, and freezes the clock.
5. AC5: CI for a PR to `main` shows the `Visual` job, and it passes on the Vue version.

### P1. Scaffold

1. AC6: After P1, `package.json` contains `react@19`, `react-dom@19`, `@base-ui/react`, `typescript@7`, and `oxlint`.
   It contains none of `vue`, `vue-tsc`, `@vitejs/plugin-vue`, `eslint`, `typescript-eslint`, or `@vue/*`.
2. AC7: After P1, the repository contains no `.vue` files.
3. AC8: `components.json` exists and selects Base UI (`base`); shadcn components live in the project code.
4. AC9: `pnpm run typecheck` runs `tsc` with TS 7 and passes.
5. AC10: `pnpm run lint` runs oxlint with type-aware rules and passes.
6. AC11: `pnpm run icons:check` passes and finds icons in `.tsx` files.
7. AC12: Every shadcn color, radius, and shadow token in CSS is defined through a palette variable. None uses a literal.
8. AC13: Every push to the migration branch has all required jobs from Contract passing; after P1, every route in
   URL Schema responds with 200 and renders the React shell.

### P2. State and infrastructure

1. AC14: Opening a room with a localStorage session created by the Vue version automatically returns the player
   to the room with the same `playerId`.
2. AC15: The React version applies values of `sp-theme`, `sp-palette`, `sp-lang`, `sp-side-widget`, `sp-volume`,
   and `FEATURE_FLAGS` written by the Vue version without resetting them.
3. AC16: The first frame of a page with `sp-palette=cyberdeck` and `sp-theme=light` already has these attributes on `<html>`.

### P3. Screens

1. AC17: The `visual` suite from P0 passes on the React version against the Vue render from `main`; every screen
   with an intentional difference has a reason, diff, and owner approval in the PR.
2. AC18: Every behavior covered by the current 42 unit specs has a React test that passes in
   `pnpm run test:unit` (specs may be combined or split).
3. AC19: `test:e2e:pages` and `test:e2e:icons` pass.
4. AC20: Before merging into `main`, E2E `critical-flows` passes from the migration branch head against the test
   Supabase project (two browsers: voting, reveal, reset, kick, renaming).
5. AC21: Keyboard tests for menus and modals ported from Vue pass (Enter/Space opens, Escape closes, focus returns
   to the trigger).
6. AC22: On every route in URL Schema, the browser console has no `error` after loading and after resizing the
   window from 1280 to 375 px.

### P4. Cleanup and merge

1. AC23: `pnpm run test:ci` passes on the migration branch head.
2. AC24: `AGENTS.md` and nested `AGENTS.md` files describe the React stack; the line «TypeScript лишається 6.x»
   ("TypeScript remains at 6.x") is absent.
3. AC25: A local preview from the migration branch head (without `deploy:stage` or a merge into `main`) opens a
   room and synchronizes a vote between two tabs; the shared production database schema remains unchanged.

## Security Model

This security model records the assumptions for this historical migration design.

Trusted: the owner's decisions in the session and `AGENTS.md` instructions. Untrusted: npm package contents and
code generated by the shadcn CLI; the generated code is reviewed in the diff before commit, as is any dependency.
New dependencies (React, Base UI, shadcn, Zustand, react-router, react-i18next, oxlint, Testing Library) are added
explicitly and listed in the PR description. `SUPABASE_SECRET_KEY` and `STORYPOKER_API_TOKEN` remain server-side:
the client bundle reads only `VITE_*`, and `icons:audit-build` continues to check this. Network calls during the build
are limited to `pnpm install` and `shadcn add`; visual tests use mocked Supabase responses without real credentials.

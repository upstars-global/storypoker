# AGENTS.md

Guidance for coding agents (Claude Code, Codex) working with this repository.
`CLAUDE.md` is an import shim (`@AGENTS.md`); this file is the single source of truth. Change `CLAUDE.md` only when
changing the import scheme; do not create symlinks between them.

## Communication
- **Language:** Ukrainian (українська мова) in chat.
- **English only:** project files (including `README.md`, `AGENTS.md`, `DESIGN.md`, and `docs/`), commit messages, PR
  titles and descriptions, PR and issue comments, code comments, and CI artifacts.
- **Constraint:** `project_doc_max_bytes` limits the project `AGENTS.md` chain from the root to the starting cwd; the
  Codex home file does not count toward this budget. `.codex/config.toml` sets 64 KiB (the Codex default is 32 KiB):
  Codex does not open an untrusted project, so this config applies in every session. Check chains against
  `project_doc_max_bytes` in `.codex/config.toml`. Codex silently truncates text beyond the limit. `CLAUDE.md` inlines
  this entire file, so every root byte is always loaded. Details specific to one directory belong in that directory's
  file (see Repository map). Before adding a section, move an existing one out. The detailed product specification is
  `DESIGN.md`.

## Workflow
- **`main` is protected:** squash-merge PRs only, direct push is forbidden even for admins (`enforce_admins`); comments
  must be resolved, strict mode is off (updating the branch from `main` is optional), approval is not required.
  Required checks are job `name:` values, not job IDs: `Lint` / `Typecheck` / `Unit tests` /
  `Build` / `Public pages load`. E2E and Visual are absent from CI: before squashing a PR, run a green
  `pnpm run test:pre-squash` locally (colima); squashing without it requires the owner's decision.
- **Charts use ECharts only.** Activate skill `echarts` before working on charts; details: `app/components/AGENTS.md`.
- **Branches:** a plan with subagents uses one branch in the main directory, no git worktree or intermediate squash into
  `main`, and one PR
- **Pace:** for a long plan, commit and push after each completed task, during the pause between subagents

## Workflow sequences
Names come from `ls .claude/skills/`; do not invoke invented names. `/code-review` and `/security-review` are slash
commands, not skills. CI check = `pnpm run test:ci` - app checks required before completing a task with repository
changes. After changes to the reviewer workflow, its helpers, or CI, run the Python workflow fixtures separately;
commands are in `.github/AGENTS.md`. For read-only audits follow the invoked skill's restrictions.
- **New feature:** `specify` → `plan-craft` → `implement`; as needed `typescript` · `echarts` ·
  `web-debug`; tests: `vitest` and/or `web-debug`; finish: `cr-request` →
  `verify` → CI check
- **Bug / regression:** `debugging` → `vitest` → `verify` → CI check
- **Supabase (DB / Auth / RLS / Storage):** `vitest` → `/security-review` → CI check
- **Refactoring:** `specify` → `vitest` → CI check
- **Received code review:** `cr-received` → (fixes) → `verify` → CI check
- **Prose (docs, README, UI copy, commits):** `dashfix` · `negafix`
- **Branch closure:** `finalize`

## Project Overview
**Story Poker** is Planning Poker for Agile teams: rooms, hidden voting with cards from one of 8 presets or a custom
subset, simultaneous reveal, round history, room aliases, moderator authentication, and profiles with avatars.

Context sources: `DESIGN.md` (design + audit §10, mechanics §11), `docs/roadmap.md` (initiative index in
`docs/initiatives/`) and `docs/completed.md`, `docs/{plans,specs}/` and legacy `docs/superpowers/{plans,specs}/`
(iteration plans and specifications), `docs/tasks/` (one-off operational instructions), `docs/audits/` (dated audit
snapshots; index in its `README.md`).

## Repository map
Codex captures the `AGENTS.md` chain from the root to the starting cwd at the start of a session.
Claude Code loads nested `CLAUDE.md` files importing their corresponding `AGENTS.md` files when reading files in a
directory. Open the relevant instructions explicitly before editing.

| Scope | Contents | Instructions |
| --- | --- | --- |
| `app/` | React SPA; hub with scope map and invariants | `app/AGENTS.md` |
| `app/assets/` | Tailwind v4 CSS-first config, shadcn token bridge, MUI classes, 3 palettes | `app/assets/AGENTS.md` |
| `app/components/` | AppModal/AppTooltip/AppMenu, shadcn `ui/`, icons, ECharts, slot | `app/components/AGENTS.md` |
| `app/pages/` | routes, Realtime subscriptions, reconciliation | `app/pages/AGENTS.md` |
| `app/stores/` | Zustand: auth/room/players/presence/profiles | `app/stores/AGENTS.md` |
| `app/utils/` | card decks, shields, alignment formulas | `app/utils/AGENTS.md` |
| `supabase/` | table schema, migrations, RLS, Storage bucket | `supabase/AGENTS.md` |
| `netlify/` | read-only `/api/*` function, Bearer token | `netlify/AGENTS.md` |
| `tests/` | Vitest unit + Playwright e2e and `visual` | `tests/AGENTS.md` |
| `scripts/` | lifecycle hooks, skills (`\ <name>` - intentionally disabled), icon generator | `scripts/AGENTS.md` |
| `.github/` | CI workflows, `pr-auto-review.yml` auto-review | `.github/AGENTS.md` |

Other paths: `public/_redirects` (`/* /index.html 200`, required for SPA routing on Netlify), `index.html` (head/meta +
inline theme script), `test-results/` (gitignored artifacts).

## Tech Stack
- **Framework:** React 19 + Vite 8 (Rolldown bundler, `@vitejs/plugin-react`) SPA, functional `.tsx` components;
  code in `app/`, hooks in `app/hooks/`
- **Routing:** `react-router@8` (declarative, `app/router.tsx`); **State:** Zustand 5; **i18n:** `i18next` +
  `react-i18next`, locales `app/i18n/locales/{uk,en}.json`
- **Styling:** Tailwind v4 via `@tailwindcss/vite`, CSS-first config - `app/assets/css/main.css`
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **PWA:** `vite-plugin-pwa` (Workbox, `prompt`) - manifest and `runtimeCaching` in `vite.config.ts` (not a separate
  file); `app/pwa.ts` applies the new version under `useAppUpdate` rules (hidden tab, idle time, toast);
  `skipWaiting: true` and `importScripts: ['sw-reload-clients.js']` (`public/`: the new worker reloads tabs upon
  activation because the old `autoUpdate` bundle does not reload itself) are temporary. Remove them in the next release
  along with the exception in `scripts/audit-icon-build.ts`;
  splash `theme_color`/`background_color` = `#212121`, aligned with `<meta name="theme-color">` in `index.html`
- **UI:** shadcn/ui (style `base-nova` on `@base-ui/react`) in `app/components/ui/`, local icons via CSS mask
  (`app/components/AGENTS.md`), ripple via custom `useRipple` hook, DiceBear, Roboto 300-700;
  **Charts:** `echarts` via `echarts/core` and the `useEChart` hook
- **Node/pnpm:** Node >=24.15.0, pnpm >=12.14.0 (`packageManager` in `package.json`)
- **TypeScript 7, pin exactly `7.0.2`:** `scripts/icons/scan.ts` uses unstable `typescript/unstable/*`; upgrade only
  with a green `icons:check`. Native `tsc` is the optional `@typescript/typescript-<platform>` package: installing
  without optional deps leaves typecheck and the scanner without it. Lint uses `oxlint --type-aware`
  (`oxlint-tsgolint`); there is no ESLint

## Common Commands

Before local checks run `sh scripts/check-local.sh`: the wrapper checks Node before calling pnpm and sets `CI=1` so
auto-install does not remove local skills via postinstall. Change the Node version before the wrapper; do not invoke
it via pnpm, which can start auto-install before the check.

`package.json` is the source of truth for the full script list. Only non-obvious details are listed here:

```bash
pnpm install         # preinstall → scripts/setup.sh (creates .env/, .agents/, .claude/settings.json)
                     # postinstall → scripts/skills.sh (network skl-x add; skills-lock.json; skipped in CI)
pnpm run test:unit   # canonical unit run; both `pnpm test` and `test:unit` are `vitest run`
pnpm run test:e2e:pages   # public pages load smoke (page-load only; CI job adds icon-delivery); locally use
                          # dummy VITE_SUPABASE_* from ci.yml, details in `tests/AGENTS.md`
pnpm run test:visual [<ref>]   # render <ref> (default origin/main) as the tree baseline; locally in a Playwright container
pnpm run test:pre-squash [<ref>]   # before squash: local Supabase + e2e chromium/webkit + visual against <ref>
                                   # (default merge-base with origin/main) in a Playwright container; reports in test-results/pre-squash
pnpm run test:ci     # app portion of CI: icons:check + lint + typecheck + test:unit + build + icons:audit-build
                     # Python workflow fixtures run separately; commands in .github/AGENTS.md
pnpm run deploy:{stage,prod}   # Netlify alias / prod deploy; CLI builds by itself (--no-build disables it). CLI defaults
                     # to dev context, build to production; deploy:prod pins both with --context production
```
Stage and local execution use the same production Supabase database: before merging, do not run `deploy:stage` without
the owner's decision, and do not change the schema or RLS. Perform manual checks on local preview (creating a test room
is allowed).

CI is `.github/workflows/ci.yml`. The target is each job within ~2 min (owner decision 2026-10-26),
`timeout-minutes` is 4; shard a check that exceeds the target or move it to `scripts/pre-squash.sh` instead of
raising the timeout. Each run has parallel job IDs `lint`/`typecheck` (`icons:check` + `typecheck`)/`unit`
(`test:unit:coverage`)/ `build`/`page-load` (Playwright projects `page-load` and `icon-delivery` with dummy
Supabase credentials on the runner's Google Chrome via `PLAYWRIGHT_CHANNEL=chrome`: no apt, which hung on a
slow mirror). A separate `review-workflow` job (`Review workflow fixtures`) runs the Python unittest suite
`test_claude_review.py`; it is required for the auto-review gate. E2E (Supabase startup alone takes ~90 s, apt
for WebKit hung) and Visual were moved from CI to local `test:pre-squash` (owner decision 2026-10-27); Visual
is still unstable, and its failure is not a review defect; CI does not deploy. Netlify builds production
itself from the repo (`netlify.toml`, `command = "pnpm run build"`) with its own site env; the `build` job
builds `dist` only for `icons:audit-build` with placeholder credentials, so it must not be shipped.
`.github/workflows/pr-auto-review.yml` is non-required PR auto-review by `so-upstars`; mechanics, gate, agent
permissions, and accepted trade-offs are in `.github/AGENTS.md`.

## Environment Setup
`pnpm-lock.yaml` - committed (required for `pnpm install --frozen-lockfile`). Do NOT add it to `.gitignore`.
The Vite plugin's peer dependency became a direct `devDependency` because its virtual module imports it
(`virtual:pwa-register` → `workbox-window`); pnpm does not hoist peers. Reproduce the CI build in a clean
worktree with `pnpm install --frozen-lockfile --ignore-scripts`; run `test:ci` there with the `build` job's
placeholder credentials (`VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_KEY=placeholder`):
without `.env/` `icons:audit-build` fails because the Supabase client is stripped from the bundle.

All env files are in `/.env/` (gitignored except `*.example`). Vite reads them through `envDir: '.env'` in
`vite.config.ts`: `/.env/.env.local` (personal overrides), `/.env/.env` (team defaults), `/.env/.env.test`
(test Supabase project credentials for Playwright).

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...        # publishable client key
# SUPABASE_SECRET_KEY=...    # server-side only, WITHOUT VITE_ prefix
```

Client code reads through `import.meta.env.VITE_*` (only `VITE_*` enters the browser bundle).

## URL Schema
- `/` - home + Recent Rooms; `/<roomId>` - room by 8-character ID; `/<slug>` - alias (ID URL redirects)
- `/login`, `/signup`, `/forgot-password`, `/reset-password` - auth routes; `/ffc` - Feature Flags console

`isValidRoomSlug()` accepts 1-32 characters `[a-z0-9-]`, without a leading or trailing hyphen; `normalizeRoomSlug()`
cleans the string but does not check length. New top-level routes overlap with `[slug].tsx`; add an explicit page or
introduce a prefix.

## LocalStorage
| Key | Value |
| --- | --- |
| `storypoker_session_<roomId>` | `{ playerId, playerName, lastVisitedAt }` for auto-rejoin and Recent Rooms |
| `sp-theme` / `sp-palette` | `light\|dark` / `classic\|cyberdeck\|matcha` - details in `app/assets/AGENTS.md` |
| `sp-room-header-<urlParam>` | `{ roomName, playerName }` - seed for AppHeader to prevent header jumps on reload |
| `sp-lang` | `uk \| en`; read in `app/i18n.tsx`, written by `persistLocale()`. Default is `uk` |
| `sp-side-widget` | `timer \| slot` - details in `app/components/AGENTS.md` |
| `sp-volume` | `0`-`1`, volume for all sounds; default `0` (muted), unmute sets `0.1`. Written by `useSoundVolume()` |
| `FEATURE_FLAGS` | `/ffc` override: `countdownEnabled`, `iconsLucide`, `iconsRounded`, `example` - `app/configs/` |

## Roles
- **Player:** vote, rename self, set own shields, leave room, **toggle own moderator flag** (self-promote/demote -
  available to anyone, including non-moderators); history/trends/theme/language/widget/slot have no role restrictions
- **Moderator (`is_moderator`, no auth required):** reveal, reset votes, last-round toggle, countdown (silent/dry/wet),
  start new round, poll question setup, configure deck, kick players, timer controls (reset/pause/resume/±30s), timer
  alarm (interval + mute for the entire room) - all gated by `isModerator` in `CardsArea.tsx` and prop
  `canControl={isModerator}` in `Timer.tsx`, client-side only (RLS `using (true)`)
- **Authorized moderator (`isModerator && user`):** rename room, set slug/name, room background, rename other players +
  set their shields. Detailed matrix: `DESIGN.md` §11.1-11.2
- **Shields:** `app/utils/shields.ts` - role is selected from `PLAYER_ROLES` via `RolePicker.tsx` (JoinOverlay +
  PlayerEditModal), based on `RoleBadge.tsx`, and written to `players.shields` as one shield via `shieldForRoleTag()`;
  there are no custom roles: legacy shield `custom:*` means "no role" (DEV) everywhere except the API
  (`netlify/AGENTS.md`). `SHIELD_CATALOG` (role/focus/stack/qa/lead) remains for lookup; the icon picker was removed.
  `voteCohortFor()` in `app/utils/resultCohorts.ts` determines the raw role; players without a role and those who left
  are DEV

1. **Result circles:** chips filter the team's flow, groups DEV/BE/FE/SRE || QA/AQA/GQA || PO || SM
   (`resultKeyFor()`). A DEV or QA group with no selected chips has one shared circle; selected chips produce only their
   circles; PO/SM have a circle only with a chip. An excluded vote is visible only in the list (red badge), and does not
   enter circles, totals, or `round_history`. `voting`/`vote_question`/`goal_clarity` decks have no chips
   (`usesResultChips()`), count all votes, and give each role a separate circle.
   Order DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM. Sizes and contract: `DESIGN.md` §11.9.
2. **Circle settings:** 9 chips in `ConfigureCardDeckModal`; Save writes a subset to `room_state.result_cohorts`
   (`[]` with no chips; QA/GQA/AQA/PO/SM require migration `021`). Unknown values are ignored.
3. **Statistics:** history, trends, and home use the raw built-in role (legacy `custom:*` is DEV). Overall score uses
   the estimator pool DEV/BE/FE/SRE/QA/GQA/AQA; without their votes it uses all votes. Home and trends use numeric
   rounds. Formulas: `app/utils/AGENTS.md`; legacy API contract for agilecharts: `netlify/AGENTS.md`.
4. **Consensus:** fireworks + decision-sound when at least one result circle is unanimous with ≥ 2 votes. Details:
   `app/utils/AGENTS.md`.

## Code Style
- No code comments; names should explain behavior. 2 spaces, no tabs, one trailing newline
- TypeScript throughout: `.ts` in hooks/utils/stores, `.tsx` for components and pages
- No wrapper abstractions that only rename functions
- UI text must go through i18n if the component is already localized
- `.vscode/settings.json` is intentionally in the repo: shared VS Code settings for Scrum Office teammates so everyone
  configures the project consistently. Personal-looking keys in it are not a review defect; change only with team consent

## Security
- Do not print secrets or full env values; use placeholders in examples
- `SUPABASE_SECRET_KEY` / `sb_secret_...` and `STORYPOKER_API_TOKEN` are server-side only, never in the client bundle
  (no `VITE_` prefix; `STORYPOKER_API_TOKEN` is set in Netlify site env, not in `/.env/`)

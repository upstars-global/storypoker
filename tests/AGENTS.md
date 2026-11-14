# Tests

Unit tests: Vitest + happy-dom, with a separate `vitest.config.ts` (`include`: `tests/unit/**/*.spec.{ts,tsx}`,
`tests/components/**`, `tests/integration/**`; `passWithNoTests`, no setup file). Existing tests are in
`tests/unit/{stores,utils,components,hooks,pages}/` (`tests/{a11y,server,integration,components}/` currently contain only
`.gitkeep`); use `.spec.tsx` for a spec with JSX or ref. Artifacts are in `test-results/` (`coverage/`, `playwright/`,
`playwright-report/`); `coverage/` and `playwright-report/` intentionally remain in `.gitignore`, and
`scripts/migrate-test-artifacts.sh` (preinstall) moves them from the old root paths. The fake Supabase client and
Realtime payload for `setSupabase()` / `applyChange()` are in `tests/support/helpers/fakeSupabase.ts` (`asSupabase`,
`changePayload`); do not use `as any`. `resetStores()` (`tests/support/helpers/`) resets store state between tests.
In vitest, `virtual:pwa-register` aliases the stub `tests/support/stubs/pwaRegister.ts`; set its behavior with `vi.mock`.
For a page test (`tests/unit/pages/`), use Testing Library `render` in `<MemoryRouter initialEntries>` + `<Routes>` with
real `react-router` and i18n; mock child components with `vi.mock('~/components/X', ...)` and store actions by replacing
`useXStore.setState({ action: vi.fn() })` before render. Do not name a file `[slug].spec.tsx`: brackets in a vitest filter
are a character class. Check exact time after `vi.setSystemTime` with `vi.useFakeTimers({ toFake: ['Date'] })`: with
`shouldAdvanceTime: true`, the clock advances during `await`, and the test intermittently fails in CI.
`pnpm run typecheck` covers `app/**`, `tests/unit/**`, the harness and `tests/{e2e,page-objects,visual}/**` (`tests/e2e/tsconfig.json`).
A unit test reading repository files uses `import x from '<path>?raw'` or `import.meta.glob(..., { query: '?raw',
import: 'default', eager: true })` (`agentsSkills.spec.ts`), instead of `node:fs`: `types` in `tsconfig.json` excludes `node`.
E2E: Playwright in `tests/e2e/` requires `.env/.env.test`, written locally by `pnpm run supabase:local` (local
Supabase in colima, README "Local Supabase"); CI has no e2e: before squash, `pnpm run test:pre-squash` (`scripts/AGENTS.md`)
runs the `chromium` and `webkit` projects in a Playwright container with `CI=1` (2 workers, 1 retry), and passes
`.env/.env.test` through `--env-file` because the config does not read the file under `CI`. Without `E2E_BASE_URL`,
Playwright builds and starts `pnpm run preview` on `:4173` (`reuseExistingServer: !CI` reuses a local process on 4173);
set `E2E_BASE_URL` to test an already running server. `playwright.config.ts` passes `VITE_SUPABASE_*` to the server
only from the shell (otherwise `''`, which overrides `.env/.env`), so run local `page-load` with dummy values from the
CI job and with `CI=1`: without it, the config reads `.env/.env.test` with `override`, and after `supabase:local` the room
cases reach local Supabase past the fake. `CI=1 VITE_SUPABASE_URL=https://dummy.supabase.co
VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only pnpm run test:e2e:pages`. `CI=1` also disables
`reuseExistingServer`: when `:4173` is occupied, build dist with the same dummy values, start `vite preview` on another
port and pass it in `E2E_BASE_URL`. The palette init-script test in `page-load.spec.ts` is valid only on a built preview
(`E2E_BASE_URL` pointing to `vite dev` gives an unreliable result). WebKit on macOS 14 is a frozen build
(`Unknown setting: PushAPIEnabled`): run such projects in `mcr.microsoft.com/playwright:v<version>-noble` with
`--network host`; mount sources from `~` (colima does not mount `/tmp`) read-only and copy them inside the container before
`pnpm install`.

## Visual (`tests/visual/`)

The `visual` project (absent from CI, only local and in `test:pre-squash`; currently unstable) takes screenshots of public
pages, the room and modals in 3 palettes × 2 themes × 1280/375 px; `maxDiffPixelRatio: 0.01`, `retries: 0`.
`playwright.config.ts` adds the project and its server (`:4174`, build in `test-results/visual-dist` with a fixed fake
Supabase URL) only when `visual` is named in `--project`: use `--project=visual <filter>`, because Playwright reads
`--project visual <path>` as multiple project names. `tests/visual/support/fakeSupabase.ts` mocks Supabase network traffic,
scenes are in `support/scene.ts`; only Google Fonts are allowed through. There are no baseline PNGs in the repository:
`pnpm run test:visual [<ref>]` (`scripts/visual-compare.sh`, default `origin/main`) builds `<ref>` via `git archive` in
`test-results/visual-base-*`, captures it with `--update-snapshots=all` in `test-results/visual-baselines/`
(`STORYPOKER_VISUAL_DIST` previews a ready dist without building), and compares it with the working tree. A screen that
fails on `<ref>` has no baseline and fails during comparison. Capture in `mcr.microsoft.com/playwright:v1.64.1-noble`
(tag = `@playwright/test` version), as in `test:pre-squash`: rendering on macOS differs from Linux. An intentional design
change makes visual red in `test:pre-squash` for its PR; after merge the new `main` becomes the baseline. Do not commit
screenshots of the service that inspired Story Poker to this public repository: they live in a separate private repository.

## Icon rendering harness (`tests/icon-rendering/`)

An isolated icon rendering harness; it is excluded from the production build and adds no route of its own. It has its own
`vite.config.ts` and Playwright config, and builds the same `AppIcon` as production (CSS mask + inline exception).

`RoomHarness.tsx` mounts real components on a fixture with 15 players; query parameters set the states:
`role`, `view=catalog|room`, `widget=slot`, `paused=1`, `countdown=N`. All players have `is_online: false` by design.

```bash
pnpm run test:icons:harness    # builds the harness and starts preview on :4181
```

Harness screenshots (`page.screenshot`) are only saved in `test-results/`; nothing compares them with a baseline.

`pnpm run typecheck` runs `tests/icon-rendering/tsconfig.json` as its third step, so the `Typecheck` job covers the
harness without changes to `ci.yml`. Add a new tsconfig project explicitly to this script, otherwise CI will not see it.

The A/B history (variant B with a separate `ICON_RENDERER=mask` and interleaved measurements) closed with the migration;
the result is `docs/audits/2026-09-09-icon-rendering-ab.md`.

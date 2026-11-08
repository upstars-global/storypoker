# Icon Rendering A/B Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan task-by-task. Steps use checkbox (`1. [ ]`) syntax for tracking.

**Goal:** Verify local delivery using a room fixture and make an evidence-based inline SVG / CSS mask decision.

**Architecture:** A separate production harness mounts existing components with fixed data and no live backend.
Variant A uses local SVG from the previous plan; B replaces only AppIcon with a span and shared CSS.
The primary DOM, full JS/CSS, and network metrics determine the trade-off; timing measurements check for regressions.

**Tech Stack:** Vue 3.5, Vite 8, Pinia, Iconify utils, Playwright Chromium, Node >=24.15.0, npm >=11.12.0.

## Global Constraints

1. Specification: [icon-rendering-migration-design](../specs/2026-09-09-icon-rendering-migration-design.md).
1. Prerequisite: the [local delivery](2026-09-09-icon-local-delivery.md) plan is fully completed (Tasks 1-6).
  This plan does not complete step 1; it is a separate experiment, and migration is not predetermined.
1. Task 0 (analytical estimate) runs first. Tasks 1-4 run only if B meets the thresholds.
1. Decision thresholds (from the spec, not revised to fit results):

   | Metric | Threshold for B |
   | --- | --- |
   | gzip JS+CSS for the full production graph | B ≤ A + 10 KB |
   | icon DOM elements in the room fixture (the `/core-platform` snapshot state) | reduction ≥ 25 (57 → ≤ 32) |
   | unaccepted visual differences after manual review | 0 |
   | median ready proxy | regression ≤ 1 ms |
   | requests to Iconify providers | 0 in both variants |

   Timing differences ≤ 1 ms are neither an argument for nor against. The same thresholds apply to mixed mode.
1. «Основні метрики: кількість DOM-елементів, розмітка сторінки, повні production JS/CSS (raw/gzip і transfer)
  та запити даних іконок.» (Primary metrics: DOM element count, page markup, full production JS/CSS (raw/gzip and transfer), and icon data requests.)
1. «Без trace висновків про paint не робити.» (Do not draw conclusions about paint without a trace.)
1. «Production-міграція виконується лише після зафіксованого рішення за результатами A/B.» (Production migration happens only after the A/B decision is recorded.)
1. Viewport 1440×900, 15 players, synthetic names/IDs; the live `/core-platform` is not used for writes.
1. Cold/warm are measured separately; A/B alternate. Mask B0 with an inline data URI does not replace B with shared CSS.
1. Harness, assets, and service worker are isolated from deploy dist; no new production route.
1. Isolate work through using-git-worktrees; use frontend-crafting for the UI candidate and web-debug for the browser.
1. Read app/components, app/stores, app/assets, and tests AGENTS.md before the corresponding changes.
1. Artifacts: `test-results/icon-rendering/`; code/tests/commit messages in English, report in Ukrainian.

## File Structure

| Files | Responsibility |
| --- | --- |
| `tests/fixtures/data/icon-room.json`, `tests/icon-rendering/fixture.ts` | fixed data and conversion to props |
| `tests/icon-rendering/index.html`, `main.ts`, `RoomHarness.vue` | test composition of real components |
| `tests/icon-rendering/vite.config.ts`, `playwright.config.ts` | separate production build and isolated tests |
| `tests/icon-rendering/delivery.spec.ts`, `visual.spec.ts` | local set, roles, screenshot, and PWA |
| `tests/icon-rendering/IconMask.vue`, `generate-css.ts`, `icons.css` | experimental B |
| `tests/icon-rendering/measure.spec.ts` | collection of DOM/network/timing metrics |
| `scripts/report-icon-ab.ts` | tables and statistics from JSON results |
| `docs/audits/2026-09-09-icon-rendering-ab.md` | actual conclusion after measurements; do not create in advance |

## Task 0: Analytical Estimate of B Without a Harness

**Files:** Create `scripts/estimate-icon-ab.ts`, `test-results/icon-rendering/estimate.json`;
modify `package.json`, `tsconfig.node.json`.

**Interfaces:** CLI `node scripts/estimate-icon-ab.ts` writes JSON
`{ domElements: { a: number; b: number }; markupBytes: { a: number; b: number }; cssBytes: number;
jsGzipBytes: { a: number; b: number }; verdict: 'proceed' | 'stop' }`.

1. [ ] DOM and markup: for each inputName in the manifest, use the instance count in the `/core-platform` snapshot
  (27 svg / 10 unique / 57 elements / 17 430 B) as A; for B count 1 element and ≈ 60 B per instance.
1. [ ] CSS: in Node generate `getIconsCSS(iconSet, names)` rules from `@iconify/utils` for all resolvedNames
  in the default flagCase and measure raw/gzip; this is the full B-CSS size without the harness.
1. [ ] JS: use the gzip entry chunk from `icons:audit-build` as A; for B subtract the size of `iconCollections.json` and
  estimate the `@iconify/vue` retained by other imports. Record the estimate and assumptions.
1. [ ] Compare with the threshold table in Global Constraints. If B fails the JS+CSS or DOM budget,
  verdict=stop: record the estimate in `docs/audits/2026-09-09-icon-rendering-ab.md`, update the spec status, and
  end the plan without a harness. Otherwise verdict=proceed and continue to Task 1.
1. [ ] Commit `docs: estimate the icon mask candidate before the harness`.

## Task 1: Fixture and Production Harness for A

**Files:** Create `tests/fixtures/data/icon-room.json`, `tests/icon-rendering/fixture.ts`,
`tests/icon-rendering/index.html`, `tests/icon-rendering/main.ts`, `tests/icon-rendering/RoomHarness.vue`,
`tests/icon-rendering/vite.config.ts`, `tests/icon-rendering/playwright.config.ts`,
`tests/icon-rendering/delivery.spec.ts`; modify `package.json`, `tsconfig.node.json`.

**Interfaces:** `HarnessRole = 'guest' | 'player' | 'moderator' | 'authorized-moderator'`;
`makePlayers(): Player[]` returns copies of the fixture; the Player type is from `app/stores/types.ts`.
`/?role=<HarnessRole>&view=room|catalog` selects only local state for the test entry.
`data-testid=icon-harness-ready` appears after Vue nextTick and completion of local initialization.

1. [ ] Add a fixture with 15 records matching the current Player shape: id, room_id, name, is_moderator, vote, user_id,
  shields, created_at, left_at. Use a fixed `room_id='iconroom'`, `2026-09-09T09:00:00.000Z`,
  names `Player 01` ... `Player 15`, roles 7 BE, 6 QA, PO, SM; shields respectively `be`, `qa`, `po`, `sm`.
  vote/user_id/left_at null, fixed created_at, one SM moderator. Do not copy real data.
  `makePlayers` uses structuredClone on the fixture so mutations in one scenario do not change the next.
1. [ ] The first browser test must fail because the harness is missing:

   ```ts
   import { expect, test } from '@playwright/test'

   test('renders the room fixture without a backend', async ({ page }) => {
     const remote: string[] = []
     await page.route('**/*', async route => {
       const url = new URL(route.request().url())
       if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
         remote.push(url.origin)
         await route.abort()
         return
       }
       await route.continue()
     })
     await page.goto('/?role=guest&view=room')
     await expect(page.getByTestId('icon-harness-ready')).toBeVisible()
     await expect(page.getByTestId('players-list')).toContainText('0 / 15')
     await expect(page.getByRole('dialog')).toBeVisible()
     expect(remote).toEqual([])
   })
   ```

1. [ ] Create index.html with `<div id="app"></div>` and module `/main.ts`. main calls registerLocalIcons,
  createPinia, i18n, VWave, memory router, and mounts RoomHarness; do not import the real app/main.ts.
  After mount call useTheme().init() and useSoundVolume().initVolume() as in the current App.
1. [ ] RoomHarness mounts AppHeader, PlayersList, Timer, CardsArea, and JoinOverlay for guest with the same
  geometry as the `app/pages/[slug].vue` template; do not copy the page Realtime logic.
  PlayerRow receives `{ ...player, is_online: false, votePending: false }`; props phase=voting,
  currentPlayerId=null for guest, first player ID for player, SM ID for moderator.
  Auth store remains empty except for authorized-moderator: set a synthetic user and populated profiles cache
  before mount so the AppHeader watch does not call fetchOne. All event handlers change only harness refs.
1. [ ] CardsArea props: activeCards from `DECK_PRESETS` (`app/utils/cardDecks.ts`) for `DEFAULT_PRESET_ID`
  (scrum `defaultActive`), not a custom literal; selectedVote=null,
  isModerator by role, hasVotes=false, canReset=false, countdownCounter=0, countdownRunning=false,
  pollMode=false, voteQuestionMode=false, pollQuestion=null; check last-round state in a separate local scenario.
  Timer: fixed roundStartedAt, phase=voting, pausedAt=null, pausedElapsedMs=0, canControl by role.
  AppHeader: onlineCount=0, roomName='Core Platform', playerName by role; remaining current defaults.
1. [ ] Do not initialize transport to Supabase; any unexpected getSupabase must fail.
  For the authorized scenario the cache contains a user profile before mount. Browser route blocks external requests.
  Fonts: `main.css` imports Geist via `@import url(https://fonts.googleapis.com/...)`, and `index.html`
  has a separate Google Fonts link. The harness Vite plugin removes `@import url(...)` from `main.css` during
  transform, and the harness `index.html` has no font link; rendering uses the system fallback font.
  Record the font difference from production in the report; it is the same for A and B and does not affect icons.
1. [ ] Vite config: root tests/icon-rendering, Vue plugin, the same Tailwind settings/app alias;
  envDir points to an empty test directory without personal env. Copy PWA manifest/workbox settings
  from the current vite.config, scope limited to the test origin; outDir `test-results/icon-rendering/dist-a`.
  Use an absolute app path for the browser alias. Include Node scripts in tsconfig.node.
1. [ ] Add `icons:harness:build` (Vite build with config), `icons:harness:preview` (port 4181),
  `test:icons:harness` (separate Playwright config). Config uses Chromium, viewport 1440×900,
  webServer build+preview, `reuseExistingServer:false`, testDir limited to tests/icon-rendering,
  explicit `use: { serviceWorkers: 'allow' }` (the Task 2 offline test depends on a real SW).
  After the test close its own server; do not touch other dev ports.
1. [ ] `npm run test:icons:harness -- delivery.spec.ts`; paired regression:
  `npm run test:unit -- tests/unit/components/PlayerRow.spec.ts tests/unit/components/CardsArea.spec.ts`.
  Check the icon composition against the described 27/10 snapshot; explain differences by UI state, and do not adjust dummy SVG to fit.
1. [ ] Commit `test: add a deterministic icon room harness`.

## Task 2: Full catalog, visuals, and a real offline reload

**Files:** Modify `tests/icon-rendering/RoomHarness.vue`, `tests/icon-rendering/delivery.spec.ts`,
`tests/icon-rendering/playwright.config.ts`; create `tests/icon-rendering/visual.spec.ts`.

**Interfaces:** `view=catalog` mounts one AppIcon for each inputNames, key=name,
with a `data-icon-name=<resolved-name>` wrapper; the readiness marker follows local iconLoaded for the entire set.

1. [ ] Add a failing catalog test: all inputNames in each flagCase have a nonempty SVG body;
   block the three Iconify hosts and expect zero attempts. Set FEATURE_FLAGS through addInitScript
   before navigation, using a new browser context for each combination because of the resolver cache.
1. [ ] Implement the catalog with the existing AppIcon and name labels; this test UI is not added to the production router.
   In room view, check role controls: availability of Timer pause/resume/reset, CardsArea reveal/countdown,
   header menu, volume changes, and hidden dice/slot states through local refs and event handlers.
1. [ ] Install the clock with `page.clock.install({ time: new Date('2026-09-09T09:05:00.000Z') })`
   and stop it for screenshots. Do not freeze the performance clock for A/B timing runs.
   Take Playwright screenshots with animations disabled and caret hidden, after document.fonts.ready.
1. [ ] Capture room/catalog in light/dark × classic/cyberdeck/matcha × flagCases; set store keys sp-theme,
   sp-palette and FEATURE_FLAGS before mount. Check bounding boxes, computed color, aria-hidden.
   Screenshot paths: `test-results/icon-rendering/a/<role>-<theme>-<palette>-<flags>-<view>.png`.
   Manual review of the contact sheet is required; do not create an empty tests/visual suite as evidence.
1. [ ] The offline test performs a real reload after the service worker is ready, without route mocks:

   ```ts
   import { expect, test } from '@playwright/test'

   test('keeps the icon catalog after an offline reload', async ({ page, context }) => {
     await page.goto('/?view=catalog')
     await expect(page.getByTestId('icon-harness-ready')).toBeVisible()
     await page.evaluate(async () => { await navigator.serviceWorker.ready })
     await page.reload()
     await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
     const count = await page.locator('[data-icon-name] svg').count()
     expect(count).toBeGreaterThan(0)
     await context.setOffline(true)
     await page.reload()
     await expect(page.getByTestId('icon-harness-ready')).toBeVisible()
     await expect(page.locator('[data-icon-name] svg')).toHaveCount(count)
   })
   ```

   The readiness marker checks the contents of each icon, not only the container count. A separate cold-context API
   blocking test rules out a hidden dependency on the Iconify cache.

1. [ ] `npm run test:icons:harness -- delivery.spec.ts visual.spec.ts`; artifacts must include full
   screenshots and a list of tested combinations. Save visual baseline A;
   commit `test: verify local icon visuals and offline reload`.

## Task 3: Static CSS candidate B without duplicated JSON

**Files:** Create `tests/icon-rendering/generate-css.ts`, `tests/icon-rendering/IconMask.vue`,
`tests/icon-rendering/registerMaskIcons.ts`, `tests/icon-rendering/icons.css`,
`tests/unit/utils/iconCss.spec.ts`; modify harness Vite config, package.json.

**Interfaces:** `generateIconCss(): { css: string; classes: Record<string, string> }`;
generated `tests/icon-rendering/iconClasses.json`, sorted full name → `sp-icon-<stable-index>`.
`IconMask` has the same props/fallthrough semantics as AppIcon; resolvedName comes from mapIconName.

1. [ ] The unit test generates CSS from the actual subset and checks one class per resolvedName, no duplicates,
   dimensions for each viewBox, and no unknown names. The unknown-name test must fail explicitly.
   Run `npm run test:unit -- tests/unit/utils/iconCss.spec.ts tests/unit/utils/iconSubset.spec.ts`.
1. [ ] The Node generator reads the committed subset and nine raw app SVGs, using `getIconsCSS(iconSet, names)`
   from `@iconify/utils` for mask rules (one call per collection, shared common rules, no duplication).
   App SVG parsing reuses existing parseSvg semantics through a pure test-side adapter
   and does not import Vite `?raw` into Node. Check all 9 names and viewBox values; preserve stroke/opacity.
1. [ ] Create IconMask with a span, aria-hidden=true, and a class from iconClasses. The 1em height and width/viewBox
   proportions are generated in CSS; existing class/style/events pass through to the root. An unknown resolvedName produces an explicit error.
1. [ ] For B, the Vite plugin substitutes only resolved absolute `app/components/AppIcon.vue` with IconMask,
   `app/lib/registerLocalIcons.ts` with registerMaskIcons (class map validation, no SVG JSON), and the CSS import.
   The common harness remains the same. Substitution must cover direct relative imports, not only alias strings.
1. [ ] CLI `icons:harness:build:b` passes `ICON_RENDERER=mask` through env; outDir dist-b, preview port 4182.
   This is a build-only experiment variable; it is not a new production feature flag. Check module graph B:
   iconCollections.json and full collections must be absent; if JSON remains through another import, account for its size and remove
   the unnecessary import before comparison. Renderer-only B0 may use `Icon mode=mask`, but its metrics must be labeled separately.
1. [ ] Repeat Task 2 tests with mask-adapted readiness: computed maskImage is not none, dimensions are nonzero,
   and screenshots are captured. For B, compare containers and visible output instead of applying the SVG-only count assertion.
   Artifacts: `test-results/icon-rendering/b/`; create an A/B diff and review every difference.
1. [ ] Unit tests + `npm run test:ci`; commit `perf: add an isolated static mask experiment`.
   Production AppIcon and the default build remain SVG.

## Task 4: Measurement and decision

**Files:** Create `tests/icon-rendering/measure.spec.ts`, `scripts/report-icon-ab.ts`,
`docs/audits/2026-09-09-icon-rendering-ab.md`; modify `docs/audits/README.md` and the specification only after results.

**Interfaces:** JSON run `{ variant: 'a'|'b'; cache: 'cold'|'warm'; role: string; flags: string;
   icons: number; iconElements: number; markupBytes: number; cssBytes: number; transferBytes: number;
   readyMs: number; requests: string[] }`. The report reads JSON and does not invent missing measurements.

1. [ ] Before measurement, check both dist outputs with the same production graph auditor and save full
   raw/gzip JS/CSS summaries. Count all loaded CSS rules for B; show DOM bytes in a separate column.
1. [ ] Collect DOM data through browser evaluate:

   ```ts
   const metrics = await page.evaluate(() => {
     const icons = [...document.querySelectorAll('svg.iconify, span.sp-icon')]
     const bytes = (value: string) => new TextEncoder().encode(value).length
     return {
       icons: icons.length,
       iconElements: icons.reduce((n, e) => n + 1 + e.querySelectorAll('*').length, 0),
       markupBytes: icons.reduce((n, e) => n + bytes(e.outerHTML), 0),
       transferBytes: performance.getEntriesByType('resource')
         .reduce((n, e) => n + (e as PerformanceResourceTiming).transferSize, 0),
     }
   })
   ```

   The `page` variable is a Playwright fixture from `test('measures icons', async ({ page }) => { ... })`.
   Add the sp-icon class to IconMask so the selector includes all B icons, including those in room view.
   The network summary through CDP also includes the document and explicitly distinguishes HTTP cache from service worker cache;
   resource timing alone does not represent the full navigation size.

1. [ ] Start with 5 A/B pairs for cold and warm, the primary role=guest from the fixture, and flags as in the initial snapshot
   (`iconsLucide=false`, `iconsRounded=true`). Each pair has a clean context; warm follows the same first load.
   Control player/moderator and all flagCases have functional/visual checks, though 5 timing pairs are not required.
   Record browser/device/CPU/network settings; do not freeze live clocks in timing runs.
1. [ ] Measure ready time to the marker + two requestAnimationFrame calls after local data/CSS; this is an app-ready proxy
   and does not prove rasterization is complete. Calculate median and min/max. Thresholds are fixed in Global Constraints:
   a median regression ≤ 1 ms is acceptable, a difference ≤ 1 ms is not an argument; do not introduce new thresholds after the runs.
1. [ ] If there is a regression or a speedup is to be claimed, run ≥20 pairs with Chrome trace:
   categories devtools.timeline, blink, cc, disabled-by-default-devtools.timeline; separate scripting/style/layout,
   paint and raster tasks. Report median/p95/spread and raw traces. Without a trace, leave the paint conclusion undetermined.
1. [ ] Write a report with commands, versions, fixture hash, cache size, a full bundle table, DOM,
   network, screenshot review and conclusion. Choose A / B / mixed; explain gains, regressions and maintenance.
   Artifact links must be accessible to the reviewer; use CI attachments or a recorded local transfer.
1. [ ] If B is not chosen: retain A and the report, and do not move the experiment into production.
   If B/mixed is chosen: create a separate integration plan with an exact list of exceptions and A/B results;
   this experiment plan does not authorize automatic production migration.
1. [ ] Update the specification status and audit index, run `npm run test:ci`, and conduct code review;
   commit `docs: record the icon rendering experiment decision`.

## Plan self-check

1. Analytical assessment and stop condition: Task 0. Fixture and all states: Tasks 1-2. Static B and full size: Task 3.
1. DOM/network/bundle comparison against fixed thresholds: Task 4. Offline and visual: Task 2 is repeated on B.
1. A/B has one backend-free state, complete manifest rules, and independent caches; the conclusion is not predetermined.

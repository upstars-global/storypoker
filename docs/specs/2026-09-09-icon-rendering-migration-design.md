# Local icon delivery and inline SVG to CSS mask migration verification

**Date:** 2026-09-09
**Status:** Implemented. Local delivery is complete: all icons render from committed data without network
requests. The rendering A/B test is complete - pure mask failed the visual threshold (`app:town-hall` loses its flag), so
**mixed** was selected: CSS mask for monochrome icons and inline SVG for color exceptions. The separate integration plan was folded
into this branch: mixed was built and measured on the production graph (-5 423 B gzip JS+CSS, `@iconify/vue` removed from
bundle). Thresholds and measurements: [2026-09-09 audit](../audits/2026-09-09-icon-rendering-ab.md),
plan: [rendering A/B](../plans/2026-09-09-icon-rendering-ab.md).
**Source:** Browser measurements on `localhost:5173` (storypoker) and `localhost:3000` (agilecharts, after login)
on 2026-09-09 + `app/components/AGENTS.md` §Іконки (Icons)

## Context

Each icon currently renders as an inline `<svg>` through `<Icon>` from `@iconify/vue` (`AppIcon.vue`). Measurements
showed two separate problems: markup weight and an external network dependency.

### storypoker measurements (dev, viewport 1440×900)

| Page | inline `<svg>` | SVG bytes in DOM | average size | DOM nodes |
| --- | --- | --- | --- | --- |
| `/` (home) | 5 | 2 752 B | 550 B | 63 |
| room, 1 player | 19 | 10 380 B | 546 B (max 851 B) | 213 |
| room, 8 players | 33 (18 unique) | 17 688 B | 536 B | 325 |

These are preliminary dev measurements of different UI states; the DOM node column describes the page, not only icons.
`outerHTML` measures serialized markup, not network traffic or DOM memory. In the SPA each instance
creates its own SVG elements, but data for the same icon may be reused from the Iconify cache.
Repeating `<path>` does not mean its data is downloaded again.

### Main scenario: `/core-platform`

Two Chromium runs in clean contexts, dev, viewport 1440×900. The room has 15 players; the state is before joining,
with the invitation open. No player was created for the audit. Both runs produced identical results:

1. 27 SVG icons, 10 unique by `viewBox` + content; frequencies: 14, 3, 3 and seven single occurrences.
2. 17 430 B of `outerHTML` in UTF-8, 57 icon DOM elements, 428 elements in the whole document.
3. 3 requests to `api.iconify.design`: group `ic:round-account-circle/close/dark-mode/palette/volume-down`,
   `tabler:dice-1` ... `dice-6`, group `ic:round-casino/check-circle`.

For the same SVGs, a span was calculated with the current classes, styles and dimensions, with one CSS rule containing an SVG
data URI per unique icon plus a shared mask rule:

| Metric | Current SVG | Estimated span + mask |
| --- | ---: | ---: |
| Icon markup | 17 430 B | 4 668 B |
| CSS for only the 10 icons in this snapshot | not measured here | 6 153 B |
| Icon DOM elements | 57 | 27 |

The estimate gives approximately 73% less markup and 30 fewer elements (approximately 7% of the page).
This is a representation estimate, not a completed migration, visual check or paint measurement.
The sum of markup and CSS in this snapshot is not used as an A/B cost comparison: static B will contain
rules for the entire manifest, while A after step 1 will contain local SVG data in JS.
Compare the page DOM and complete production JS/CSS for both variants separately, including data and runtime.
If B keeps JSON alongside CSS, that duplicated weight also counts toward its budget.
There is no universal benefit threshold such as 1.5-2 repetitions: it depends on SVG, encoding, classes and compression.

### External requests to the Iconify API

In the earlier room-entry scenario, **6** requests to `api.iconify.design` were observed:

```
ic.json?icons=round-account-circle,round-dark-mode,round-palette,round-volume-down
ic.json?icons=round-close
tabler.json?icons=dice-1,dice-2,dice-3,dice-4,dice-5,dice-6
ic.json?icons=round-casino
ic.json?icons=round-fast-forward,round-fast-rewind,round-more-vert,round-pause,round-restart-alt,
  round-stop,round-volume-off
lucide.json?icons=undo
```

This directly contradicts `app/components/AGENTS.md:14`, which calls `ic` «єдиною offline-колекцією» ("the only offline collection").
`@iconify-json/ic` **is installed** (`package.json:30`), but `addCollection` is called only for the `app` prefix
(`app/lib/registerAppIcons.ts:36`); `ic` itself is not imported anywhere in `app/`. Consequences:

1. Icons appear after the network response; layout shift depends on reserved dimensions and needs measurement.
2. Offline, uncached icons may be missing: `runtimeCaching` in `vite.config.ts` covers only Google Fonts,
   and Iconify JSON is not in the app shell precache. `autoUpdate` controls service worker updates.
3. A third-party CDN dependency in the production runtime.
4. The `ic` package contains both `baseline-*` and `round-*`; both paths require local registration.
5. `loadIcons` is imported in `PlayerRow.vue:3` and called near `DICE_FACES` (line 67 in this checkout).
   This is an explicit asynchronous prefetch for dice.

The number of requests depends on the UI, cache and batching. Their list does not prove sequential dependent round trips.

### Reference: agilecharts (`@nuxt/icon`, CSS mask mode)

This is a one-time diagnostic snapshot of another checkout, with no requirement to access it for implementation or CI.

After login (credentials from `agilecharts/.env/.env.local`, `DEV_USER`/`DEV_PASS`):

A repeat check in two clean contexts after login; `/teammates` was opened by hard navigation after `/`:

| Page | span icons | icon markup bytes | icon data requests |
| --- | ---: | ---: | --- |
| `/` | 157 | 16 798 B | 9 to its own API |
| `/teammates` | 2 452 | 282 776 B | 3 to its own API |

A separate measurement provided in review estimates the CSS rules for the agilecharts home page at 47 KB for 53 unique icons.
CSS bytes were not remeasured in this session; the serialization method and raw artifact were not provided.
This estimate is not included in the `outerHTML` column and is not the weight of the future B in storypoker.

Markup for one instance:

```html
<span class="iconify i-lucide:sun" aria-hidden="true" style="font-size:16px;"></span>
```

The SVG is in a shared CSS rule `mask-image: url("data:image/svg+xml,…")`.
Agilecharts loads data through `/api/_nuxt_icon/*`. The absence of direct browser calls to the public
Iconify API does not mean there is no network; server-side calls were not measured in this audit.
CSS mask alone does not provide offline operation.

**Two portability caveats for this reference:**

1. **SSR does not transfer.** Icons are present in the SSR document `/login` (8 × `mask-image` in inline CSS), but this
   is a property of Nuxt/SSR, not the render mode. storypoker is a Vite SPA; icons will not be in the initial document under
   any mode. This is not an argument for migration.
2. **The mechanism differs from a Tailwind plugin.** `@nuxt/icon` does not use Tailwind: the trace shows
   `@nuxt/icon/dist/runtime/components/css.js` + `@iconify/utils/lib/css/icon.js` - a `mask-image` rule
   is injected **at runtime** for each unique icon. This is one way to support dynamic binding;
   static CSS generation is also suitable for a finite set (see §Decision, step 2).

The scale of repetition depends on the page and room state. `/core-platform` already has measurable potential
for DOM reduction. The final SVG/span conclusion must account for A/B testing with the same storypoker state.
Comparing two different dev applications does not isolate renderer speed.

## Goal

Remove the runtime dependency on `api.iconify.design`, reduce markup weight and DOM nodes per icon,
while preserving the current component API (`<AppIcon icon="ic:baseline-close" />`) and both feature flags.

## Scope

53 uses of `<AppIcon>` in 11 Vue files (`rg` only over `*.vue`; the example in AGENTS.md is excluded).
Collections in use according to repository measurements:

| Collection | Unique icons | Source |
| --- | --- | --- |
| `lucide` | 44 map values + direct names | **target pack**, also `lucide:undo` and `lucide:id-card` |
| `ic` | baseline + rounded | current default and fallback names outside the map |
| `tabler` | ~13 | slot machine, cards, dice |
| `app` | 9 | local SVGs, already offline |

The exact count and weight are determined by the manifest of actually reachable `AppIcon` input names and their remapping across all flags.
The earlier estimate of about 160 icons did not account for the full rounded set and is not a budget.

`simple-icons` and `game-icons` remain in the legacy `SHIELD_CATALOG`. The current `PlayerRow` obtains a text role
through `roleTagForShields`, and `RoleBadge` displays the tag. `shieldForRoleTag()` returns an ID or `custom:<tag>`;
`custom:` is not an icon collection prefix here. These legacy collections are excluded from the current UI migration.

### Target pack - `lucide`

**Product intent: most icons move to `lucide`.** `MDI_TO_LUCIDE` (`iconMap.ts`) contains
44 mappings; the manifest determines coverage of the reachable UI. The `iconsLucide` flag is currently `enabled: false`
(`app/configs/featureFlags.ts:14-16`) - the pack is prepared but not enabled.

Consequences for step 1 that must be addressed explicitly:

1. **`lucide` is the priority collection for local registration**, including direct uses outside the map.
2. **`ic` cannot be removed even after a full transition.** 9 icons in use have no entry in
   `MDI_TO_LUCIDE` and, under the current `mapIconName()` logic, fall back to the raw name:
   `ic:baseline-add-a-photo`, `ic:baseline-casino`, `ic:baseline-check`, `ic:baseline-language`,
   `ic:baseline-palette`, `ic:baseline-timer`, `ic:baseline-trending-down`, `ic:baseline-trending-flat`,
   `ic:baseline-trending-up`. Both collections are needed for the current flags; even adding to the map will not remove
   `ic` from the path with Lucide disabled. Changing this contract is a separate product task.
3. **While `iconsLucide` is disabled, both sets are needed locally** - otherwise enabling the flag will go to
   the network again. This is the same requirement «обидва варіанти» ("both variants") as for `iconsRounded`.
4. If the decision is made to make `lucide` the default (flag → `true` or removing the branch), this is
   a separate product change outside this spec's scope; the spec only guarantees that both paths work offline.

## Decision

### Step 1 (mandatory, separate from the rest): eliminate network requests

Regardless of the subsequent rendering mode, deliver all collections locally:

1. Add the build dependencies `@iconify-json/lucide` and `@iconify-json/tabler` (`@iconify-json/ic` is already present).
2. Build a manifest from reachable literals, finite dynamic sets, and the results of `mapIconName()` for all four flag combinations; include the fallback and direct names.
3. Select data **at build time**, retaining required aliases, parent data, and dimensions or resolving them into complete records. Runtime filtering of the full imported JSON does not guarantee a small bundle.
4. Register the `lucide`, `ic`, and `tabler` subsets via `addCollection` before mount, retaining the local `app` collection.
5. Check the production artifact for full collections and record raw/gzip JS/CSS before and after.
6. **Budget and chunking:** generated JSON is registered synchronously from `main.ts` and enters the entry chunk. The entry chunk increase is limited to **25 KB gzip** relative to the baseline before step 1. If the limit is exceeded, move `lucide` data to a separate chunk and load it with `await import()` before mount only when `iconsLucide` is enabled; `ic` and `tabler` remain in the entry chunk. Record the decision in the build audit report.
7. Remove the `loadIcons` import and call from `PlayerRow.vue`, along with the obsolete comment above `DICE_FACES`; preserve the array and animation behavior.
8. In the same PR, update `app/components/AGENTS.md`: actual local delivery, 9 `app` icons including `timer`, current collections, and the manifest maintenance rule. The document currently incorrectly calls `ic` an offline collection. Make the update through `maintaining-agent-context`.

This eliminates external icon data loading. Measure the effect on icon appearance time and CLS.

Step 1 can be completed without a room fixture and harness: a Vitest test proves manifest completeness by checking `iconLoaded()` for every input name in all four flag combinations after subset registration, and a browser test of public pages with providers blocked verifies the absence of network requests. The fixture, contact sheet, and offline room check belong to the A/B plan.

**Important for `iconsRounded`:** the flag remaps to `ic:round-*`, so the local set must contain **both** variants of each `ic` icon (`baseline-` and `round-`); otherwise the flag will trigger network requests again. The same applies to `iconsLucide` and `MDI_TO_LUCIDE`.

### Subset mechanism and drift detection

Create the following artifacts in step 1; they do not yet exist in the repository:

1. `app/utils/iconManifest.ts`: an explicit typed `inputNames: readonly string[]` list of reachable input names and a list of finite dynamic sets. Sorting and deduplication are deterministic. The Lucide map remains separate; building the subset from all its values, including legacy values, is unnecessary.
2. A pure resolver `resolveIconName(name, { iconsLucide, iconsRounded })` with the current remap logic; `mapIconName()` remains the public function that reads cached flags and delegates to the resolver. The generator and tests use the resolver without browser state. API behavior and flag precedence are preserved.
3. Node script `scripts/generate-icons.ts`: add `@iconify/utils` as a direct devDependency, read collection JSON only in Node, apply the resolver to inputNames for four flag combinations, and group unique results by prefix. For each name, use `getIconData()` from Iconify utils to obtain complete data with aliases, dimensions, and transformations; missing entries fail generation. Check local `app:` icons against the current registration; preserve their raw-SVG path.
4. Generate committed `app/generated/iconCollections.json` containing only the required complete records. The browser imports this file; `@iconify-json/*` imports and the generator remain outside the browser graph. `icons:generate` updates the file; `icons:check` generates it in memory and compares it with the committed result. Add `icons:check` to `test:ci` and the existing required Typecheck job so CI does not rely on npm lifecycle.
5. Build the initial manifest from actual consumers. Add AST scanning for automatic verification: `@vue/compiler-sfc` as a direct devDependency for Vue template/script and the TypeScript compiler API for TS. Search for complete icon literals in `app/**/*.vue` and `app/**/*.ts`; generated content, legacy `SHIELD_CATALOG`, and internal resolver literals have explicit narrow exceptions with reasons. A literal outside inputNames or mapped outputs fails the check.
6. Maintain a list of the source and allowed values for each dynamic `:icon`; a new dynamic binding without an entry fails the check. Check dice/slot/volume/theme/password values in separate tests against actual arrays and functions. The AST scanner does not prove arbitrary runtime data flow. Add negative tests for a new literal, a new binding, a missing fallback, and a missing alias.

This defines the mechanism before plan-crafting; the plan itself will detail files and commands. Importing a full collection risks increasing the bundle, but its disk size does not equal a guaranteed production transfer size.

### Guard against API fallback

In dev/test, install a controlled transport for Iconify `_api.setFetch` before mount that makes no network requests, records attempts, and returns a rejected Promise. This replaces Iconify's fetch specifically, not the application's global fetch; do not use an empty `addAPIProvider.resources` list as an unverified way to disable the API. Since the library may catch transport errors, also check local availability of the resolved name in AppIcon before rendering: in dev/test, a missing icon must produce an explicit error naming the icon. A negative test with a deliberately unknown name must confirm the diagnostic and zero network requests. In production, test all providers with their addresses blocked and verify the visible result.

### Step 2: CSS mask candidate

The installed `@iconify/vue@5.0.1` supports `<Icon mode="mask">`: this is a pilot with minimal props changes to test masking. Its `--svg` data URI and styles are repeated in each span (`node_modules/@iconify/vue/dist/iconify.js`, render function). This pilot is designated B0; it does not test savings from shared CSS rules and does not replace the main B candidate.

Dynamic props, dice/slot, volume/theme/password, and feature flags have finite sets of values. Static CSS generation is compatible with them: the manifest can generate complete classes for the Tailwind scanner, `@source inline()`, or ready-made CSS. `mapIconName()` and the consumer API are preserved. See [Tailwind: explicitly including classes](https://tailwindcss.com/docs/detecting-classes-in-source-files#safelisting-specific-utilities) and [Iconify for Tailwind 4](https://iconify.design/docs/usage/css/tailwind/tailwind4/).

The first A/B candidate uses CSS generated at build time from the same manifest. Runtime injection through Iconify utils remains an alternative when there is a specific need; it adds browser-side rule generation, a cache of unique rules, and custom maintenance code. A mandatory custom helper or the absence of suitable plugins is not a premise of the decision.

### CSS mask constraints

1. The mask uses one color via `background-color: currentColor`. Check all reachable icons, including `app`, for colors, transparency, and proportions. An audit of legacy brand shields is unnecessary for the current UI.
2. Preserve dimensions, baseline, classes, styles, handlers, `aria-hidden`, and other consumer attributes.
3. Static CSS must be available before the first paint of icons. For the runtime variant, rules must be registered before paint; the assumption of one ready CSS bundle does not apply to it.
4. Multicolor or incompatible icons may remain inline SVG. Mixed mode requires an explicit exception list and the same checks as the main candidate.

## Mandatory A/B testing before the SVG/span conclusion

**A:** local data + current inline SVG after step 1.

**B:** the same set of local icons + span/CSS mask.

Both variants use production builds with identical code outside icon delivery and rendering.
Comparing the current CDN SVG with a local mask does not isolate the effect of the rendering method.

### Protocol

Primary metrics: DOM element count, page markup, complete production JS/CSS (raw/gzip and transfer),
and icon data requests. Timing metrics check for regressions; they need not demonstrate a speedup.
The synthetic insert+layout test supplied in review for N=27 reported medians of 1.20 ms for SVG and 0.75 ms for mask.
The expected effect in this narrow test is approximately 0.45 ms; its applicability to a full render is unproven.
The test did not include Vue/Iconify runtime or rasterization; its script and trace were not supplied, and it was not reproduced here.
The N=500/2000 figures do not justify optimizing a room with 27 icons.

0. Analytical estimate without a harness: calculate deterministic metrics for A and B from the manifest and a
   `/core-platform` snapshot. Derive B's element count and markup bytes from the instance count; calculate B's CSS
   using `getIconsCSS()` on the subset in Node; obtain A's JS from the build audit after step 1. If B does not meet
   the thresholds in the Decision rule section, close the experiment at this step with a report; do not build a harness.
1. Create the fixture and harness described below. Fix the `/core-platform` state: 15 players, roles, votes, UI,
   flags, theme, palette and viewport; cover pre-join, participant and moderator states.
2. Run production preview in the same browser, on the same device, with identical CPU/network settings.
   Document versions, settings and service worker state. Dev/HMR measurements remain diagnostic.
3. Check cold load in a clean context and warm load with equally warmed caches for A and B separately.
   Start with 5 A/B pairs after warming the server; this is sufficient for deterministic DOM/artifact metrics and
   network checks. Present timing data from this small sample as diagnostic with spread, without p95 conclusions.
4. Capture primary metrics, time until all expected icons appear, CLS and the time for identical local UI updates
   (volume, theme, controls appearing). Account for all of B's CSS manifest and all of A's subset JSON/runtime;
   do not add DOM bytes to network transfer. Show shared and variant-specific chunks separately.
   Mask readiness must account for the applied rule and visible result; the presence of a span is insufficient.
5. If there is a regression or a need to claim a speedup, run an extended test with Chrome trace for
   scripting/style/layout/paint and rasterization, at least 20 A/B pairs, median, p95 and spread.
   Before the run, record a practically significant threshold and acceptable regressions for the target device.
   If the difference is comparable to noise, conclude that no speedup was proven; do not expand the experiment
   for a sub-millisecond gain. Do not draw conclusions about paint without a trace.
6. Check visual parity and offline scenarios, and record the conclusion with links to artifacts.

### Fixture, visuals and artifact verification

There is currently no ready-made fixture for a room with 15 players or visual suite. `tests/fixtures/room.ts` provides
cleanup of created Supabase rooms, rather than immutable data. Creating a fixture is a prerequisite for the experiment
and a separate plan task:

1. Add `tests/fixtures/data/icon-room.json`: synthetic IDs/names, 15 players with the role distribution from the audit,
   fixed room settings, time and votes. Do not copy real personal data or credentials.
2. Add a test entry/harness that mounts real room components with this fixture and Pinia state;
   substitute the room/auth/realtime source at the test boundary before mount. Block live Supabase requests.
   Build the harness in production mode identically for A/B, as a separate test entry without a route in the deploy build.
   The smoke test checks the initial state's icon composition/count and role controls; timers, randomness and animations are fixed.
3. Use Playwright to capture identical UI regions before/after, light/dark × three palettes and role states;
   create a contact sheet of all resolved manifest icons for four flag combinations.
   Add assertions for dimensions, visibility and accessible attributes; manually review the baseline and image diff
   so acceptable rasterization differences do not mask missing or shifted icons.
4. Store all screenshots, traces, JSON metrics and the report in `test-results/icon-rendering/`.
   List the tested states and accepted visual differences in the conclusion.
5. `icons:check` compares the exact sets of generated names with the manifest. For the production build, the audit script
   checks the module graph/sourcemap: the browser graph contains no complete `@iconify-json/*/icons.json` files,
   generator or Node dependencies. Control unused icons must be absent from the generated subset.
   The report includes the number of entries/rules, raw/gzip for each JS/CSS chunk and the total loaded chunks for A/B.
   Searching the minified JS for a collection name alone is insufficient.

### Decision rule

The final conclusion must explicitly rely on the A/B results, assessing loading, rendering and DOM separately.
Allowed outcomes: retain inline SVG, switch to mask or adopt a mixed mode.
A migration may be justified by a more compact DOM without a noticeable speedup only with an explicit account of this
tradeoff, the absence of unacceptable regressions and maintenance cost. Until the experiment produces results, mask is
a candidate.

Thresholds are set before the runs and are the same for the analytical estimate and the harness. B is selected only if all are met:

| Metric | Threshold |
| --- | --- |
| Complete gzip JS+CSS for B | ≤ gzip A + 10 KB |
| Icon DOM elements on `/core-platform` | reduction ≥ 25 (from 57 to ≤ 32) |
| Visual deviations after manual contact sheet review | 0 unaccepted |
| Median ready proxy in the harness | regression ≤ 1 ms |
| Requests to icon providers | 0 in both variants |

A timing difference of up to 1 ms is an argument neither for nor against. A mixed mode is assessed against the same
thresholds with an explicit list of exceptions.

## Acceptance criteria

### Local delivery

1. The complete manifest is checked independently of `MDI_TO_LUCIDE`: every reachable input name after remap has
   local data for all four flag combinations. Cover fallback, direct Lucide, dice/slot, rounded and `app`.
   Account for flag values cached in the module: isolate each combination in tests.
   When both flags are enabled, preserve the current Lucide priority over rounded.
2. In clean browser contexts, zero requests go to `api.iconify.design`, `api.simplesvg.com`, `api.unisvg.com`
   and other configured icon providers. Check with `page.on('request')` and by blocking these addresses;
   all expected icons must remain visible.
3. In step 1, cover `/`, `/login`, `/ffc` and the volume popup in the browser. The `/core-platform` fixture,
   participant/moderator states and controls hidden until interaction are checked in the A/B plan.
4. Offline PWA is checked in the A/B plan on the production preview harness after service worker installation.
   A stable data fixture is needed so Supabase unavailability does not mask icon behavior.
   A separate provider-blocking test in a clean context rules out reliance on the Iconify cache.
5. The full manifest Vitest test passes: `iconLoaded()` is true for every input name after remap in
   all four flag combinations; this is the primary evidence of step 1 completeness.
6. Visuals for `/`, `/login`, `/ffc` are preserved in light/dark and three palettes according to Playwright screenshots
   before and after; manual review is recorded in the report. The room is visually checked in the A/B plan.
7. The production artifact contains only the required subset according to the sourcemap audit; entry chunk growth ≤ 25 KB gzip.
8. `npm run test:ci` passes.

### Rendering decision

1. A reproducible A/B report follows the protocol above and includes a conclusion and links to artifacts.
2. Markup savings account for CSS rules; network and timing metrics are presented separately.
3. Dynamic states, both flags and `app` icons pass functional and visual checks.
4. Production migration takes place only after the decision based on A/B results is recorded.

## Work order and risks

1. Implement local delivery in a separate PR under the step 1 plan, check manifest completeness and the bundle budget.
2. Perform the analytical A/B estimate against the thresholds; if the result is negative, record the decision and stop.
3. Otherwise record production baseline A and the `/core-platform` fixture, prepare B, perform A/B and record
   the decision; then plan migration if needed.

The main risks are an incomplete manifest when icons are added, accidental inclusion of entire collections in the bundle,
different room/cache state between runs, visual differences in masks and additional runtime code.
Manifest checks, production artifact audits, fixtures, the A/B protocol and visual checks cover these risks.

## Out of scope

1. Changing the default pack, removing feature flags or changing the `mapIconName()` contract.
2. Returning legacy shield icons to the UI.
3. Nuxt/SSR migration or changes to the initial HTML of the Vite SPA.
4. Charts, including SVG in `PieChart.vue`; `app/components/AGENTS.md` determines their path (ECharts).

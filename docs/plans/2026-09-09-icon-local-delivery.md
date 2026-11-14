# Icon Local Delivery Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan task-by-task. Steps use numbered checkbox (`1. [ ]`) syntax for tracking.

**Goal:** Provide local data for all reachable icons without changing SVG rendering or feature flags.

**Architecture:** An explicit manifest of input names and a pure resolver define the subset for four flag combinations.
A Node generator reads collections and creates committed JSON; the browser registers only this JSON before mount.
Source checks, a runtime guard, and a production graph audit prevent missing icons or full collections from going unnoticed.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript, Node >=24.15.0, npm >=11.12.0, Iconify Vue 5, Vitest, Playwright.

## Global Constraints

1. Specification: [icon-rendering-migration-design](../specs/2026-09-09-icon-rendering-migration-design.md).
2. «При обох увімкнених флагах зберегти поточний пріоритет Lucide над rounded.» (When both flags are enabled, preserve the current precedence of Lucide over rounded.)
3. «Браузер імпортує цей файл; імпорти `@iconify-json/*` та генератор залишаються поза browser graph.» (The browser imports this file; `@iconify-json/*` imports and the generator remain outside the browser graph.)
4. «Production-міграція виконується лише після зафіксованого рішення за результатами A/B.» (Production migration takes place only after a decision based on the A/B results is recorded.)
5. Preserve the AppIcon API, i18n, sizes, events, SVG, both flags, and all local `app:` SVGs.
6. Legacy SHIELD_CATALOG is not a source of required UI icons; `custom:` denotes a role tag.
7. Read `app/AGENTS.md`, `app/components/AGENTS.md`, `app/utils/AGENTS.md`, `tests/AGENTS.md`.
8. Implement in an isolated worktree using `using-git-worktrees`; this plan does not create a worktree.
9. Historical language rule: Write comments and commit messages in English; do not add new explanatory comments in code.
10. Tests: `test-driven-development` + `vitest`; browser: `web-debug`; instructions: `maintaining-agent-context`.
11. Before completion: `requesting-code-review`, `verification-before-completion`, `npm run test:ci`.
12. Stage only the task files. Do not rewrite the unrelated commit `0207241` with electron-to-chromium: it enters
  the branch squash merge with the other commits and is accepted as is.

## Release Boundary and File Structure

This plan ends with working inline SVG delivered locally and is closed by its own checks
(Tasks 1-6). The next independent stage is the [A/B plan](2026-09-09-icon-rendering-ab.md); its result may
leave SVG unchanged and is not a condition for closing this plan.

| Files | Responsibility |
| --- | --- |
| `app/utils/iconResolver.ts`, existing `iconMap.ts` | pure remap and flag reading, respectively |
| `app/utils/iconManifest.ts` | inputNames, dynamicBindings, four flagCases |
| `scripts/icons/scan.ts` | Vue/TS AST inventory and binding coverage check |
| `scripts/icons/subset.ts`, `scripts/generate-icons.ts` | full icon records and CLI generate/check |
| `app/generated/iconCollections.json` | committed subset without Node code |
| `app/lib/registerLocalIcons.ts` | registration of the subset and nine app SVGs |
| `app/lib/iconPolicy.ts`, `AppIcon.vue`, `main.ts` | guard and initialization order |
| `scripts/audit-icon-build.ts` | forbidden modules in sourcemap, raw/gzip report, entry chunk delta ≤ 25 KB gzip |
| `tests/unit/utils/icon*.spec.ts`, `tests/unit/components/AppIcon.spec.ts` | resolver, manifest, subset, guard, |
| | full manifest × 4 flagCases |
| `package.json`, lockfile, CI, `tsconfig.node.json` | dependencies, Node scripts, and required checks |

## Task 1: Pure resolver without behavior changes

**Files:** Create `app/utils/iconResolver.ts`, `tests/unit/utils/iconResolver.spec.ts`;
modify `app/utils/iconMap.ts`, `tsconfig.node.json`.

**Interfaces:** `IconFlags = { iconsLucide: boolean; iconsRounded: boolean }`;
`resolveIconName(name: string, flags: IconFlags): string`. The existing `mapIconName(name: string): string` is retained.

1. [ ] Write the test below, including direct names and fallback:

```ts
import { expect, it } from 'vitest'
import { resolveIconName } from '~/utils/iconResolver'

it('keeps fallback and gives Lucide precedence', () => {
  const both = { iconsLucide: true, iconsRounded: true }
  expect(resolveIconName('ic:baseline-close', both)).toBe('lucide:x')
  expect(resolveIconName('ic:baseline-palette', both)).toBe('ic:baseline-palette')
  expect(resolveIconName('lucide:id-card', both)).toBe('lucide:id-card')
  expect(resolveIconName('lucide:undo', both)).toBe('lucide:undo')
  expect(resolveIconName('ic:baseline-close', {
    iconsLucide: false, iconsRounded: true,
  })).toBe('ic:round-close')
  expect(resolveIconName('ic:baseline-close', {
    iconsLucide: false, iconsRounded: false,
  })).toBe('ic:baseline-close')
})
```

2. [ ] Run `npm run test:unit -- tests/unit/utils/iconResolver.spec.ts tests/unit/utils/slotMachine.spec.ts`.
  The new test should fail because the module is missing; the existing suite should pass.
3. [ ] Move MDI_TO_LUCIDE unchanged into iconResolver and implement this sequence:

```ts
export interface IconFlags { iconsLucide: boolean; iconsRounded: boolean }
export function resolveIconName(name: string, flags: IconFlags): string {
  if (flags.iconsLucide) return MDI_TO_LUCIDE[name] ?? name
  if (flags.iconsRounded && name.startsWith('ic:baseline-')) {
    return 'ic:round-' + name.slice('ic:baseline-'.length)
  }
  return name
}
```

`MDI_TO_LUCIDE` here is the table moved from the existing `app/utils/iconMap.ts`, not a new map.
Preserve useLucide/useRounded caching in iconMap and delegate to the resolver after reading the flags.
Node ESM constraints: `iconResolver.ts` and `iconManifest.ts` have no extensionless value imports (type-only
imports are allowed), Vite aliases, or browser dependencies; Node scripts do not import `iconMap.ts` or
`~/configs/featureFlags`. The generator reads collection JSON through `createRequire` or `with { type: 'json' }`,
and `allowImportingTsExtensions: true` in `tsconfig.node.json` permits `.ts` imports between Node scripts.

4. [ ] Add a parameterized test for all four flagCases and repeat the test command and `npm run typecheck`.
5. [ ] Review the diff: the table and precedence are unchanged; commit `refactor: isolate icon name resolution`.

## Task 2: Manifest and independent source validation

**Files:** Create `app/utils/iconManifest.ts`, `scripts/icons/scan.ts`,
`tests/unit/utils/iconManifest.spec.ts`; modify `package.json`, `package-lock.json`, `tsconfig.node.json`.

**Interfaces:** `inputNames: readonly string[]`, `flagCases: readonly IconFlags[]`;
`dynamicBindings: readonly { file: string; expression: string; names: readonly string[] }[]`;
`scanIconUsage(sources: Record<string, string>):`
`{ literals: string[]; bindings: { file: string; expression: string }[] }`;
`validateIconUsage(usage: ReturnType<typeof scanIconUsage>, names: readonly string[],`
`bindings: typeof dynamicBindings): string[]`.

1. [ ] Write a negative scanner test without reading the manifest as its own oracle:

```ts
import { expect, it } from 'vitest'
import { scanIconUsage, validateIconUsage } from '../../../scripts/icons/scan'

it('reports new literal and undeclared dynamic binding', () => {
  const usage = scanIconUsage({
    'app/components/Probe.vue': '<template><AppIcon icon="lucide:id-card" /><AppIcon :icon="nextIcon" /></template>',
  })
  const issues = validateIconUsage(usage, ['lucide:undo'], [])
  expect(issues.join('\n')).toContain('lucide:id-card')
  expect(issues.join('\n')).toContain('nextIcon')
})
```

2. [ ] Run `npm run test:unit -- tests/unit/utils/iconManifest.spec.ts tests/unit/utils/slotMachine.spec.ts`;
  confirm that the new test FAILs.
3. [ ] Add a direct devDependency on `@vue/compiler-sfc` compatible with the installed Vue; use the existing TypeScript.
  Scan template AST attributes `icon`/`:icon`, script/scriptSetup, and TS through the compiler API;
  ignore literals in comments. Names must match the full `prefix:name`, not a fragment such as `ic:round-`.
4. [ ] Build the manifest from 53 actual AppIcon uses in 11 Vue files. Include values from all ternaries,
  DICE_FACES, SLOT_SYMBOL_WEIGHTS, countdownModeOptions, and volumeIcon in inputNames.
  Record each dynamic binding by file + normalized AST expression, without tying it to a line number.
5. [ ] Exclude only generated files, the resolver internal table, and the SHIELD_CATALOG AST node;
  continue scanning the rest of `shields.ts`. A new TS icon source must be detected without changing a file allowlist.
  Do not move all legacy map values into the subset: outputNames = union resolver(inputNames, flagCases).
6. [ ] Add tests for literal/binding drift, extra dynamicBindings entries, the full dice/slot set,
  absence of legacy `simple-icons`/`game-icons`, and presence of `lucide:id-card` and `lucide:undo`.
  Check dynamic values against actual AST array literals or functional tests of their consumers.
7. [ ] Repeat the test command and typecheck; commit `feat: define and validate the local icon manifest`.

## Task 3: Build-time subset with aliases and deterministic check

**Files:** Create `scripts/icons/subset.ts`, `scripts/generate-icons.ts`, `app/generated/iconCollections.json`,
`tests/unit/utils/iconSubset.spec.ts`; modify `package.json`, `package-lock.json`, `tsconfig.node.json`.

**Interfaces:** `buildCollections(sets: Record<string, IconifyJSON>, names: readonly string[]): IconifyJSON[]`;
`serializeCollections(sets: IconifyJSON[]): string`. `IconifyJSON` is imported from the direct devDependency `@iconify/types`.
CLI `node scripts/generate-icons.ts [--check]`: generate writes the file; check does not write and returns exit 1 on drift.

1. [ ] Write an alias test using the real ic package:

```ts
import { expect, it } from 'vitest'
import ic from '@iconify-json/ic/icons.json'
import { buildCollections } from '../../../scripts/icons/subset'

it('includes only requested records and rejects unknown names', () => {
  const sets = buildCollections({ ic }, ['ic:baseline-close', 'ic:round-close'])
  expect(Object.keys(sets[0]!.icons).sort()).toEqual(['baseline-close', 'round-close'])
  expect(() => buildCollections({ ic }, ['ic:missing-review-fixture'])).toThrow('ic:missing-review-fixture')
})
```

JSON is imported directly: `tsconfig.json` has `resolveJsonModule: true`, unit tests run under Vite, and
`node:module` in `tests/unit/**` would break Typecheck (`types: ["vite/client"]`, without `node`).
The alias case is required because the manifest actually contains lucide aliases `check-circle`, `user-circle`,
`more-vertical`: take them from `@iconify-json/lucide`, compare with `getIconData`, and verify that the result contains
the full body and inherited dimensions/transformations. Because of aliases, the subset is built through
`getIconData`; direct copying of `icons[name]` is not used.

2. [ ] Run `npm run test:unit -- tests/unit/utils/iconSubset.spec.ts tests/unit/utils/iconResolver.spec.ts`;
  confirm that the new test FAILs.
3. [ ] Add direct devDependencies `@iconify/utils`, `@iconify/types`, `@iconify-json/lucide`, `@iconify-json/tabler`.
  Only the Node generator reads these dependencies. Select the data as follows:

```ts
import { getIconData } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'

export function buildCollections(sets: Record<string, IconifyJSON>, names: readonly string[]): IconifyJSON[] {
  const result: Record<string, IconifyJSON> = {}
  for (const fullName of [...new Set(names)].sort()) {
    const [prefix, name] = fullName.split(':')
    if (!prefix || !name || !sets[prefix]) throw new Error(fullName)
    const data = getIconData(sets[prefix], name)
    if (!data) throw new Error(fullName)
    const collection = result[prefix] ??= { prefix, icons: {} }
    collection.icons[name] = data
  }
  return Object.values(result)
}
```

4. [ ] The CLI runs scan/validate, computes all resolvedNames, excludes `app:` from external packages, and
  checks these names against registerAppIcons. Serialization: stable prefix/key order, JSON indent 2, newline.
  `--check` compares the committed file bytes with the expected output; a missing file or unknown CLI flag yields exit 1.
  `serializeCollections()` returns this exact format and has a stability test with reordered inputNames.
5. [ ] Add scripts `icons:generate` and `icons:check`, and Node tsconfig includes `scripts/icons/**/*.ts`,
  `scripts/generate-icons.ts`; run generate, check, and generate again, and confirm there is no new diff.
6. [ ] Repeat the tests and typecheck; commit `feat: generate the offline icon subset at build time`.

## Task 4: Registration before mount and an explicit error for a missing icon

**Files:** Create `app/lib/registerLocalIcons.ts`, `app/lib/iconPolicy.ts`,
`tests/unit/components/AppIcon.spec.ts`; modify `app/main.ts`, `app/components/AppIcon.vue`,
`app/components/PlayerRow.vue`. The existing `registerAppIcons.ts` remains.

**Interfaces:** `registerLocalIcons(): void`; `installIconPolicy(): void`;
`assertLocalIcon(name: string): void`. In dev/test, the guard throws `Missing local icon: <name>`.

1. [ ] Write a test for actual local rendering without mocking Icon:

```ts
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import { registerLocalIcons } from '~/lib/registerLocalIcons'

it('renders a direct Lucide icon from the registered subset', async () => {
  registerLocalIcons()
  const wrapper = mount(AppIcon, { props: { icon: 'lucide:id-card' } })
  await nextTick()
  expect(wrapper.find('svg').exists()).toBe(true)
  expect(wrapper.find('svg').element.childElementCount).toBeGreaterThan(0)
  wrapper.unmount()
})
```

`await nextTick()` is required: `<Icon>` from `@iconify/vue` enables rendering only in `onMounted`, so a synchronous
`find('svg')` immediately after `mount` is empty even when the data is registered.

2. [ ] Run `npm run test:unit -- tests/unit/components/AppIcon.spec.ts tests/unit/components/PlayerRow.spec.ts`;
  confirm that the new test FAILs.
3. [ ] registerLocalIcons registers generated collections via addCollection and calls registerAppIcons.
  In main, replace the registerAppIcons call with registerLocalIcons, followed by installIconPolicy, then createApp/mount.
4. [ ] In dev/test, call `_api.setFetch` with a function that records the attempt and returns a rejected Promise.
  `_api` is an internal export of `@iconify/vue` without stability guarantees; the negative test below captures its
  contract and will fail if the API changes after a package update.
  The guard before Icon calls `iconLoaded(resolved)` and throws an error if data is missing. Leave global fetch unchanged.
  Production retains the library’s current behavior; the check and browser tests guard against omissions.
5. [ ] Add a negative mount test for the unknown `ic:missing-review-fixture`: expect an explicit error and zero
  network transport calls; separately verify that the policy does not change globalThis.fetch.
  Restore the Iconify transport after each test to avoid affecting other suites.
6. [ ] Add a full manifest test in `tests/unit/utils/iconManifest.spec.ts`: after `registerLocalIcons()`,
  expect `iconLoaded(resolveIconName(name, flags))` to be true for each `inputName × flagCases`. This replaces
  the fixture as the coverage check for step 1; the fixture/contact sheet remain in the A/B plan.
7. [ ] In PlayerRow, remove the import, loadIcons call, and obsolete comment above DICE_FACES; retain the array/animation.
  In AppIcon, retain one root Icon, fallthrough attributes, and props.
8. [ ] Run the AppIcon, PlayerRow, CardsArea, and SlotMachine suites and `npm run typecheck`;
  commit `fix: render all application icons from local data`.

## Task 5: Required checks, production graph, and current instructions

**Files:** Create `scripts/audit-icon-build.ts`; modify `package.json`, `tsconfig.node.json`,
`.github/workflows/ci.yml`, `app/components/AGENTS.md`.

**Interfaces:** CLI `node scripts/audit-icon-build.ts <dist-dir>` writes
`test-results/icon-rendering/bundle.json` and exits 1 for a forbidden browser module.
Report: `{ files: { path: string; rawBytes: number; gzipBytes: number }[], forbiddenSources: string[],`
`entryChunk: { gzipBytes: number; baselineGzipBytes: number; deltaGzipBytes: number } }`.

1. [ ] The build audit needs no unit seam: check the actual build sourcemaps already generated by Vite.
  The script reads all JS/CSS artifacts, uses `node:zlib` for gzip, and reads module sources from `.map`; missing sourcemaps cause exit 1.
  Forbid source paths for full `@iconify-json/*/icons.json`, `scripts/generate-icons.ts`, and `scripts/icons/`.
  Allow the generated subset and brief mentions of the library name in a license.
2. [ ] Budget: before step 1 begins, capture the baseline gzip entry chunk from `main` and save it to
  `test-results/icon-rendering/bundle-baseline.json`; the audit calculates the delta and exits 1 if it is > 25 KB gzip.
  If the threshold is exceeded, move the lucide collection into a separate chunk via `await import()` before mount only when
  `iconsLucide` is enabled; ic/tabler remain in the entry chunk. Record the chunking decision in the report.
3. [ ] Add `icons:audit-build`, add `icons:check` at the start of `test:ci`, and add a separate `npm run icons:check` step
  in the `typecheck` job before vue-tsc; retain the job name `Typecheck`. Add an artifact audit after the build in the Build job.
4. [ ] Using maintaining-agent-context, update only the icon section of `app/components/AGENTS.md`:
  actual offline prefixes, 9 app SVGs including timer, the manifest path, generate/check, and the absence of legacy shields in the UI.
  Keep it at ≤200 lines; leave the CLAUDE import shim unchanged.
5. [ ] Run `npm run icons:check`, `npm run test:ci`, and `npm run icons:audit-build`.
  Remove one entry from a temporary copy of the generated JSON and run the check against that copy through the
  serializer/check unit test; expect a mismatch. Do not damage the committed file for a manual check.
6. [ ] Review dependencies and the lockfile: required packages only; commit `ci: enforce the local icon contract`.
7. [x] Type the harness: `tests/icon-rendering/tsconfig.json` extends the root config, adds `node` to `types`,
  and redirects the `~`/`@` aliases to `app/`. It runs as the third step of `npm run typecheck`, so the `Typecheck` job picks it up
  without changes to `ci.yml`. The only finding was that `countdownTimeout` in `useCountdown.ts` was typed as `number`, while
  under `types: ["node"]` `setTimeout` returns `Timeout`; it was changed to `ReturnType<typeof setTimeout>`, a type-only change.
8. [x] `deploy:prod` / `deploy:stage`: checked the CLI 26.2.0 and 27.5.2 sources - `--build` remains a hidden
  deprecated option with `.default(true)`, so the build always runs and only `--no-build` disables it; explicit `--build`
  prints a warning in both versions. The env context resolves at two levels: the CLI defaults to `dev`
  (`getDefaultContext()` returns `production` only for `serve`), while the build step resolves again through
  `@netlify/config` with a `production` default - except for sites with the `use_cached_site_info` feature flag, where
  `siteInfo` from CLI resolution is reused along with the site-level env for the `dev` context (`api/site_info.js` puts
  Envelope variables into `build_settings.env`, where `getUiEnv` reads them), although the build context itself remains
  `production`. There is a third level: `deploy.js` updates `cachedConfig.env` only for an explicit non-`dev` context, while
  `getEnvelopeEnv` fetches functions-scoped env with a default parameter of `dev`, so without the flag this path resolves
  to `dev`. `deploy:prod` carries an explicit `--context production`, fixing the context at all levels; `CONTEXT` in env
  is honored there too. The `options.context && !options.build` guard does not fire because `build` has `.default(true)`.

## Task 6: Browser and visual verification of step 1

**Files:** Create `tests/e2e/icon-delivery.spec.ts`; modify `playwright.config.ts`,
`package.json`, `.github/workflows/ci.yml`.

**Interfaces:** a separate Playwright project `icon-delivery`, without Supabase secrets, with testMatch for only the new file;
locally, `npm run test:e2e:icons` runs this project. Exclude it from the chromium/webkit projects to
avoid duplication. In CI, the Public pages load job makes one call to
`playwright test --project page-load --project icon-delivery` instead of two separate runs.

1. [ ] Write a test that intercepts all three public Iconify hosts before navigation, aborts them,
  records attempts, and checks that `attempts` is empty after the icons become visible. Check `/`, `/login`, `/ffc`,
  and the volume popup on the home page for each of the four FEATURE_FLAGS combinations in a new context.
  Use the existing `data-testid=volume-button`; after clicking, wait for volume-slider.

```ts
import { expect, test } from '@playwright/test'

for (const iconsLucide of [false, true]) {
  for (const iconsRounded of [false, true]) {
    test(`local header icons: ${iconsLucide}/${iconsRounded}`, async ({ page }) => {
      const attempts: string[] = []
      await page.addInitScript(flags => {
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(flags))
      }, { iconsLucide, iconsRounded })
      await page.route(/https:\/\/api\.(iconify\.design|simplesvg\.com|unisvg\.com)\//, async route => {
        attempts.push(route.request().url())
        await route.abort()
      })
      await page.goto('/')
      const volume = page.getByTestId('volume-button')
      await expect(volume.locator('svg')).toBeVisible()
      expect(await volume.locator('svg').evaluate(e => e.childElementCount)).toBeGreaterThan(0)
      await volume.click()
      await expect(page.getByTestId('volume-slider')).toBeVisible()
      expect(attempts).toEqual([])
    })
  }
}
```

Additional route/cold-cache cases use the same initialization before navigation;
each Playwright test receives an independent context.

2. [ ] Verify on production preview: `npm run test:e2e:icons`; in the existing Public pages load job, replace
  the command with `playwright test --project page-load --project icon-delivery` using its dummy Supabase env,
  without renaming the required job or accessing a live room.
3. [ ] Visual verification: save Playwright screenshots of `/`, `/login`, `/ffc` before (from `main`) and after the changes in
  `test-results/icon-rendering/screenshots/`; compare manually, with icon differences treated as blockers. The Vitest test in Task 4
  provides full manifest coverage; fixture/contact sheet/offline room are in the A/B plan, not here.
4. [ ] Save the local delivery report, screenshots, and baseline bundle in test-results/icon-rendering;
  run `npm run test:ci`, `npm run icons:audit-build`, `npm run test:e2e:icons`.
5. [ ] Request code review and address confirmed findings; commit `test: verify offline icon delivery`.
  Integrate the branch through finishing-a-development-branch; direct push to main is prohibited.

## Task 7: Volume slider in theme colors without hover highlighting

**Files:** modify `app/assets/css/main.css`, `app/components/AppHeader.vue`.

**Interfaces:** `.mui-slider` renders with `appearance: none`, so explicit rules draw the track and thumb
for both engines. The fill is passed in the `--fill` CSS variable from the component: `:style="{ '--fill': volumePercent + '%' }"`.

1. [x] Remove reliance on `accent-color`: by itself it colors only the fill and thumb, while Chromium
  still draws its own hover highlight on the native thumb, which the variable does not affect.
2. [x] WebKit: `::-webkit-slider-runnable-track` gets a `linear-gradient` with two stops at `--fill`
  (WebKit has no native filled portion), and `::-webkit-slider-thumb` gets `appearance: none` and `--primary`.
3. [x] Gecko: `::-moz-range-track` uses `--border-input`, and `::-moz-range-progress` and `::-moz-range-thumb`
  use `--primary`. No rule has a hover state, so the color stays the same on hover.
4. [x] Chromium verification: a pixel-by-pixel diff of the control before and during hover on production preview showed 0 changed
  pixels out of 12,400; the control diff of two idle screenshots was also 0; the rig was described as «риг роздільний»
  (the rig is separable). Measured after joining
  a room through JoinOverlay, without bypassing the overlay. On the dev server the diff shows ~1620 pixels, but this is
  the volume popup opening animation, not hover: measure on preview after `document.getAnimations()`.
5. [x] Gecko verification: manual Firefox check on `/core-platform`, 2026-09-09 - the track, fill, and thumb
  use theme colors, and hover does not change them.
6. [x] Colors were checked in all six palette and theme combinations: each produces its own `--primary` shade.

## Plan self-check

1. Resolver/flags: Task 1. Reachable manifest and drift: Task 2. Alias-safe subset: Task 3.
2. Registration/fallback guard/full manifest × flagCases: Task 4. CI, 25 KB gzip bundle budget, AGENTS: Task 5.
3. Browser/visual: Task 6 with its own tests; plan closure does not depend on the A/B plan. Artifacts have paths.
4. The plan does not perform the mask migration or claim that the fixture already exists.

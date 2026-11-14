# 2026-09-09 - Icon rendering A/B: inline SVG versus CSS mask, and migration to mixed

**Date:** 2026-09-09
**Branch:** `icon-rendering-migration`
**Skill and process:** execution of the [rendering A/B plan](../plans/2026-09-09-icon-rendering-ab.md), Tasks 0-4;
prerequisite: completed [local delivery plan](../plans/2026-09-09-icon-local-delivery.md)
**Scope:** isolated `tests/icon-rendering/` harness using real components (AppHeader, PlayersList, Timer,
CardsArea, JoinOverlay), a fixture with 15 players, and no live backend
**Evidence:** runtime measurements in Chromium (20 interleaved pairs), production builds A, B and mixed,
51 screenshot pairs at 1440×900
**Previous audit on this topic:** none; specification:
[icon-rendering-migration-design](../specs/2026-09-09-icon-rendering-migration-design.md)

## Conclusion

**Decision: mixed (CSS mask + inline SVG for color exceptions), implemented in production.** Pure B failed the
visual threshold because of `app:town-hall`, so the mixed approach uses masks for 131 monochrome icons and
ready-made inline markup for the single color exception.

Measurement resolved the main objection to mixed: the concern was that the exception would bring back
`@iconify/vue` and eliminate the savings. The exception renders from committed SVG through `v-html`, so it
needs no runtime: the production graph contains none of `@iconify/vue`, `iconCollections.json`,
`registerAppIcons`, or `iconPolicy`. The package was removed from `dependencies`.

Measured on the real production graph, rather than projected: **-4 904 B gzip** (JS+CSS) compared with the last
inline-SVG build, against a +10 240 B budget. This A/B acceptance criterion is stricter than the permanent
25 KB regression budget in `icons:audit-build`. The flag retains its colors in both themes and the building
follows `currentColor`.

## Thresholds and results

The thresholds are the same as the plan set for B; for mixed they apply to the real production build.

| Metric | Threshold | Measured (mixed) | Result |
| --- | --- | --- | --- |
| gzip JS+CSS production graph | ≤ A + 10 240 B | -4 904 B | pass |
| icon DOM elements (harness) | reduction ≥ 25 | 49 → 23, reduction 26 | pass |
| unaccepted visual differences | 0 | 0 | pass |
| ready proxy median | regression ≤ 1 ms | unresolved across 20 pairs | no regression detected |
| requests to Iconify providers | 0 | 0 | pass |

The timing threshold remains unresolved: paired A/B deltas were -0.2 ms (cold) and -0.35 ms (warm), with a
spread of tens of milliseconds. This supports neither choice, and the decision does not depend on it.

## Build size

These are harness builds, not the production graph. Both variants contain icons for all four flag cases.

| | JS raw | JS gzip | CSS raw | CSS gzip | Total gzip |
| --- | --- | --- | --- | --- | --- |
| A (inline SVG) | 578 910 | 159 149 | 43 491 | 9 636 | 168 785 |
| B (CSS mask) | 524 143 | 143 271 | 98 330 | 19 496 | 162 767 |
| Delta | -54 767 | -15 878 | +54 839 | +9 860 | **-6 018** |

The CSS column covers the entire harness style bundle including Tailwind, not just icon CSS; generated
`icons.css` itself weighs 56 038 B raw.

These are harness figures for A and B. Mixed was measured on a real production build from a clean `npm ci`
and placeholder Supabase credentials: A = 443 202 B (JS 432 345 + CSS 10 857), mixed = 438 298 B
(JS 416 969 + CSS 21 329), delta **-4 904 B**. Measured at the commit carrying this line; each subsequent CSS
commit shifts the number, so remeasure with `npm run icons:audit-build` and update this line when styles change.
Mixed remains close to B rather than returning to A+CSS: the inline exception weighs 418 B raw and requires no runtime.

The B module graph was checked against the sourcemap: `@iconify/vue`, `iconCollections.json`, `AppIcon.vue`,
and `registerAppIcons.ts` are absent; `IconMask.vue` is present. All four are present in A. Neither contains
the prohibited `@iconify-json/*`. The service worker precache has 5 entries in both.

## DOM and markup

| | icons | icon elements | markup bytes |
| --- | --- | --- | --- |
| A | 23 | 49 | 15 254 |
| B | 23 | 23 | 3 939 |

The `/core-platform` snapshot in the spec has 27 instances and 57 elements; the guest-role harness has 23 and 49.
The role is not the cause: the fixture keeps all 15 players at `is_online: false`, and `PlayerRow.vue` hides
vote status icons behind `v-if="player.is_online"`. The harness renders a different, internally consistent state;
it is not an incomplete render. The comparison remains valid because A and B use the same state, and the
ratio of elements per icon matches the snapshot (49/23 = 2.13 versus 57/27 = 2.11). The threshold was not
revised to fit the result. Correcting the viewport to 1440×900 did not change these numbers: both widths are
above the `md` breakpoint.

## Timing

| | cold median | cold min-max | warm median | warm min-max |
| --- | --- | --- | --- | --- |
| A | 124.0 ms | 122.8-173.3 | 90.1 ms | 89.3-92.9 |
| B | 123.5 ms | 122.6-158.8 | 90.1 ms | 89.2-92.6 |

20 interleaved pairs (`interleaved.spec.ts`, `npm run test:icons:measure`): A and B are measured consecutively
within each pair, their order alternates, and each run uses a clean context. This removes machine drift between
variants, which affected the previous sequential run.

The cache class is now partially observed rather than entirely assumed: each run records
`serviceWorkerControlled`, and `icons:report-ab` summarizes it. Warm: 20/20 under service worker control in
both variants; cold: 1/20 (A) and 0/20 (B). `navigator.serviceWorker.controller` proves only that the service
worker controls the page; it does not identify the source of each resource (SW cache, HTTP cache, or network).
That requires CDP or per-resource Resource Timing, neither of which was collected.

| | paired delta median | min-max |
| --- | --- | --- |
| cold | -0.2 ms | -50.7…+16.9 |
| warm | -0.35 ms | -2.1…+2.8 |

Paired deltas have medians of -0.2 ms (cold) and -0.35 ms (warm), with a spread of tens of milliseconds for
cold. The "regression ≤ 1 ms" threshold is **unresolved** by these data: the measured delta is smaller than
both the threshold and its own noise, so it confirms neither a speedup nor compliance with margin. The only
claim is that no regression was detected. No conclusion is drawn about paint: that requires a Chrome trace,
which was not captured.

## Visual verification

51 screenshot pairs at 1440×900: room and catalog × light/dark × classic/cyberdeck/matcha × 4 flag cases,
plus room for player, moderator, and authorized-moderator roles. The contact sheet was manually reviewed again
after correcting the viewport; earlier shots used 1280×720 because of the device preset and were recaptured.

There are no structural differences except in one case. The comparison was a manual review of the contact
sheet; the repository has no pixel-comparison script, so no numerical difference metrics are reported.

**Difference that determined the decision:** `app:town-hall`. Of the nine icons,
`app/assets/icons/town-hall.svg` alone mixes `currentColor` with explicit `fill="#0057B7"` and `fill="#FFD700"`.
`getIconsCSS` puts it in mask mode, which reduces all fills to `currentColor`, making the flag monochrome.
Evidence: `test-results/icon-rendering/diff/town-hall-{a,b}.png`. The other eight `app:` icons are monochrome
and transfer without loss.

Background mode would retain the colors but break theming: the icon would stop following `currentColor`.
There is therefore no CSS-only solution for this file; mixed with inline markup for the exception was chosen.

After migration the contact sheet was recaptured (51 pairs, `test-results/icon-rendering/mixed/`) and checked
against the saved A set (`a-inline-svg/`). No pair has an icon difference; the only difference is the text
«Раунд розпочато Ns тому» ("Round started Ns ago") in one screenshot, caused by clock drift between runs rather than rendering. The flag
was visually checked in light and dark: its colors remain and the building follows `currentColor`.

The contact sheet missed two regressions because both were outside its coverage. Menu icons shrank from 24 to
15 px: `icons.css` was imported unlayered, so `.sp-icon { width: 1em }` beat `.mui-menu-icon { width: 24px }`
from `@layer components` regardless of specificity. Importing it into the same layer fixed this. With
`forced-colors: active`, the mask stayed white on a white background and icons disappeared; the generator now
emits `background-color: CanvasText` under `@media (forced-colors: active)`, and the harness has a regression test.

## Reproduction

```bash
npm run icons:generate                          # four artifacts in app/generated/
npm run test:icons:harness                      # 62 tests on mixed rendering
npm run build && npm run icons:audit-build      # browser graph + JS+CSS budget
```

Versions: Node v24.15.0, Vite 8.2.2, Playwright 1.63.0, Chromium from Playwright 1.63.0.
Fixture `tests/fixtures/data/icon-room.json`, hash `80698c8e5c96fae1823d1352af916fc09d2e751f`.
A/B artifacts: `test-results/icon-rendering/{a-inline-svg,diff,runs}/`; mixed screenshots: `mixed/`.
A/B timing figures were collected by `icons:report-ab` from `runs/interleaved.json`. After migration the harness
builds only the mixed render, and the A/B experiment scripts (`report-icon-ab.ts`, `estimate-icon-ab.ts`,
`interleaved.spec.ts`) were removed with variant B. The A/B runs cannot be reproduced from the current tree;
they are recorded here.

## Measurement limitations

1. `transferBytes` is calculated from Resource Timing and the navigation entry, without CDP. Warm runs confirmed
   service worker control of the page, but did not distinguish the cache source for individual resources:
   SW cache and HTTP cache cannot be distinguished without CDP.
2. The harness renders in a system fallback font: remote Google Fonts were removed for offline runs. This
   deviation is the same for A and B and does not affect icons.
3. Measured size deltas are at harness scale; the production projection is linear and marked as a projection.
4. `RoomHarness` does not pass `show-last-round`; the prop is optional and defaults to `false`, so the harness
   displays the normal voting state. This is neutral for A/B comparison because both variants use the same state.
5. Dynamic room-view states have separate query parameters (`widget=slot`, `paused=1`, `countdown=N`) and are
   checked in `delivery.spec.ts` for both variants: SlotMachine, the paused timer, and the active countdown
   render local icons with zero Iconify requests. Timing and size measurements remain on the default state so
   A/B compares the same icon set. Reveal, header menu, volume changes, and the hidden dice state, also listed
   in the plan, are not covered as separate states: the catalog already proves delivery for each `inputNames`,
   and with `is_online: false` reveal adds no new icon to PlayerRow.
6. All 15 players in the fixture have `is_online: false`: this is a plan requirement (Task 1), not an incomplete render.
7. The harness is built in production mode, so the missing-icon guard is disabled (after migration this is a
   `throw` in `AppIcon.vue`, active only under `import.meta.env.DEV` and in test mode; there is no separate
   `iconPolicy`). Zero Iconify requests in the runs are demonstrated by Playwright-level interception, not this guard.

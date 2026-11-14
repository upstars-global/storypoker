# Room controls cohort chips - implementation plan

**Spec:** docs/specs/2026-11-02-room-controls-cohort-chips-design.md

**Goal:** A moderator enables separate BE/FE/SRE circles with chips. Cards appear three per row below 1024 px,
reset has undo with a different icon, the bottom panel stays in place, reveal remains visible, and everyone gets 3 spins.

**Architecture:** Start with pure grouping logic (the risk is a change to consensus and circles), then add the chip UI
and persistence, reset/undo (room page state + a new store method), the panel/reveal and layout, and finally small changes
(spins, grid) and documentation. Shared state: tasks 2, 3, 4, 5, and 7 edit `app/pages/[slug].tsx`; execute them
sequentially, without parallel waves.

**Stack:** React 19, Zustand 5, Tailwind v4, Supabase JS, Vitest + Testing Library, i18next.

**Execution:** inline

The following constraints and out-of-scope items are historical; tasks 10 and 11 and the AC11 ruling later changed them.

## Global constraints

1. BE, FE, and SRE chips in the deck configuration modal; state is stored in `room_state.result_cohorts`. Choose the
   existing column over a new migration: the check constraint already allows these values, so the schema stays unchanged.
   Rejected: GQA/AQA chips require a constraint migration in production.
2. Undo reset stores a vote snapshot in the client memory of the moderator who pressed reset. Choose client memory over
   a `room_state` field: accidental clicks are corrected immediately, while the database and RLS stay unchanged. Tradeoff:
   another moderator, or the same moderator after a reload, cannot see undo.
3. Undo restores exactly the votes present before reset (a full rollback). Choose a full rollback over «нові голоси
   пріоритетні» ("new votes take priority"): the user's decision is that undo shows only votes from before reset.
4. The bottom button panel has a fixed position independent of the circle area's height. Reveal is always present in the
   panel and becomes disabled (idle) under the same conditions as now (`hasVotes` - at least 2 votes, countdown,
   `canVote`), plus previous-round mode. A fixed-height results area holds the position: circles scale within it. Choose
   reserved height over a sticky/fixed panel: the panel stays in the page flow and does not cover cards on a phone.
5. Show 3 cards per row when the viewport is narrower than 1024 px; card width is one third of the container width minus
   gaps, preserving the 2:3 aspect ratio.
6. All roles get 3 spins per round. Only the count changes; the rule for when PO/SM may spin (`canSpinSlot`) stays as is.

Out of scope: chips for GQA, AQA, PO, SM; undo reset for other moderators or after a reload; changes to statistics,
trends, history, or API; changes to the card grid at widths ≥ 1024 px.

Security Model (historical): Trusted inputs: the user's decisions in that conversation and project instructions.
Untrusted inputs: stored `result_cohorts` (the client filters it to BE/FE/SRE). The change adds no network calls beyond
the existing Supabase updates for `room_state` and `players.vote`; permissions remain client-side (`isModerator`), and
RLS stays unchanged. The vote snapshot lives only in client memory.

## Review focus

1. Consensus and celebration after changing grouping (merging BE/FE/SRE into DEV can make a circle unanimous).
2. Undo during Realtime updates: the snapshot must not be overwritten by reset's own echo update.
3. Fixed circle-area height at 375 px (circles from #72 up to 500 px): check whether labels are clipped.
4. `netlify/functions/room-json.mts` duplicates `resultCohorts.ts`; the API stays unchanged, so leave the duplicate alone.

## Files

| File | Change | Task |
| --- | --- | --- |
| `app/utils/resultCohorts.ts` | `groupResultVotes(players, selected)` with chips | 1 |
| `tests/unit/utils/resultCohorts.spec.ts` | grouping tests (create if absent) | 1 |
| `app/components/ConfigureCardDeckModal.tsx` | BE/FE/SRE chip section, `resultCohorts` in payload | 2 |
| `app/i18n/locales/{uk,en}.json` | chip and undo keys | 2, 3 |
| `app/pages/[slug].tsx` | cohort persistence, reset/undo snapshot, reveal, layout, spins | 2, 3, 4, 5, 7 |
| `tests/unit/components/ConfigureCardDeckModal.spec.tsx` | chip tests | 2 |
| `app/stores/room.ts` | `restoreVotes(snapshot)` | 3 |
| `tests/unit/stores/room.spec.ts` | `restoreVotes` test | 3 |
| `app/components/CardsArea.tsx` | reset button undo state, reveal always in DOM, grid of 3 | 3, 4, 6 |
| `tests/unit/components/CardsArea.spec.tsx` | reset/undo, reveal, and grid tests | 3, 4, 6 |
| `tests/unit/pages/roomPage.spec.tsx` | undo integration, spins, grouping | 2, 3, 7 |
| `app/components/ResultsArea.tsx` | fixed-height area | 5 |
| `tests/unit/components/ResultsArea.spec.tsx` | constant-height test | 5 |
| `AGENTS.md`, `app/utils/AGENTS.md`, `app/components/AGENTS.md`, `DESIGN.md` | circles, undo, and spins documentation | 8 |

## Tasks

### Task 1: Group circles by chips

Change `groupResultVotes` in `app/utils/resultCohorts.ts` to accept a second argument, `selected`. Rules (spec
«Когорти» [Cohorts]): DEV/no role → DEV; BE/FE/SRE → own circle if in `selected`, otherwise DEV; QA/GQA/AQA → QA; PO, SM →
own circles; `custom:<name>` → own circle with a label without the prefix. Filter `selected` to `['BE','FE','SRE']`; null or
`[]` → nothing selected. Keep the current circle order (`ROLE_COHORTS`, then custom). Leave `groupVotesByCohort`,
`estimatorVotes`, `voteCohortFor`, and the netlify duplicate alone. Update the call in `app/pages/[slug].tsx:248` to
`groupResultVotes(visiblePlayers, roomState.result_cohorts)`; consensus is already calculated from `resultGroups`.

**Files:** `app/utils/resultCohorts.ts`, `tests/unit/utils/resultCohorts.spec.ts`, `app/pages/[slug].tsx`

**Consumes:** none

**Produces:** `groupResultVotes(players: readonly { shields: string[] | null; vote: string | null }[], selected: readonly string[] | null | undefined): (ResultGroup & { key: string })[]`; export `SPLITTABLE_COHORTS: readonly string[] = ['BE','FE','SRE']`

**Covers:** AC2, AC3, AC4, AC5, AC6

**Depends on:** none

**RED:** `pnpm exec vitest run tests/unit/utils/resultCohorts.spec.ts` -> new cases (BE+FE in DEV without chips; BE separate with `['BE']`; GQA/AQA in QA; legacy `['DEV','QA']` = no chips; consensus in roomPage) fail

**GREEN:** the same command + `pnpm exec vitest run tests/unit/pages/roomPage.spec.tsx` -> passed

**Commit:** `git add -A -- app/utils/resultCohorts.ts tests/unit/utils/resultCohorts.spec.ts app/pages/[slug].tsx tests/unit/pages/roomPage.spec.tsx`

### Task 2: BE/FE/SRE chips in the deck modal

Add a section with three toggle chips to `ConfigureCardDeckModal` (existing project chip styles or shadcn `Toggle`;
check `app/components/AGENTS.md`). Prop `resultCohorts: string[] | null`; the `CardDeckPayload` payload gets
`resultCohorts: string[]` (BE, FE, SRE order, empty array when no chips are selected). `handleSaveCardDeck` in
`app/pages/[slug].tsx:~620` calls the existing `room.setResultCohorts(payload.resultCohorts)`. Realtime synchronization of
`room_state` already exists; check that `result_cohorts` enters state from the subscription payload. Add a section title
i18n key for uk/en (for example `deck.resultCohorts`: «Окремі кола» / «Separate circles»).

**Files:** `app/components/ConfigureCardDeckModal.tsx`, `app/i18n/locales/uk.json`, `app/i18n/locales/en.json`, `app/pages/[slug].tsx`, `tests/unit/components/ConfigureCardDeckModal.spec.tsx`, `tests/unit/pages/roomPage.spec.tsx`

**Consumes:** `SPLITTABLE_COHORTS` (Task 1), `room.setResultCohorts(cohorts: string[])`

**Produces:** `CardDeckPayload = { deckPreset; cards; resultCohorts: string[] }`

**Covers:** AC1, AC14

**Depends on:** Task 1

**RED:** `pnpm exec vitest run tests/unit/components/ConfigureCardDeckModal.spec.tsx tests/unit/pages/roomPage.spec.tsx` -> cases "exactly 3 chips", "save passes ['BE']", and "Realtime update to result_cohorts changes circles" fail

**GREEN:** the same command -> passed

**Commit:** `git add -A -- app/components/ConfigureCardDeckModal.tsx app/i18n/locales/uk.json app/i18n/locales/en.json app/pages/[slug].tsx tests/unit/components/ConfigureCardDeckModal.spec.tsx tests/unit/pages/roomPage.spec.tsx`

### Task 3: Reset with undo

Store: `restoreVotes(snapshot: Record<string, string>)` in `app/stores/room.ts` performs a full rollback: write each
snapshot player's vote if they are still in the room; set `vote: null` for players outside the snapshot; finish with
`clearPendingVotes()`. Page: state `resetSnapshot: Record<string,string> | null`. Reset → snapshot current votes from
`visiblePlayers`, then `resetVotes()`. Undo → `restoreVotes(snapshot)`, set snapshot to null. Clear the snapshot when
`round_started_at` changes, `phase` transitions to `revealed`, or `isModerator` changes to false; countdown does not clear
it; a reload clears it naturally. `CardsArea` receives `resetUndoAvailable: boolean`: true → undo icon (for example
`ic:baseline-undo`; check the icon registry and `pnpm run icons:check`), aria-label/tooltip `cards.undoReset`
(«Повернути голоси» / «Restore votes»); the button is active regardless of `canReset` (except during countdown). Race:
Realtime echo of the reset itself must not erase the snapshot.

**Files:** `app/stores/room.ts`, `tests/unit/stores/room.spec.ts`, `app/pages/[slug].tsx`, `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`, `tests/unit/pages/roomPage.spec.tsx`, `app/i18n/locales/uk.json`, `app/i18n/locales/en.json`

**Consumes:** `resetVotes()`

**Produces:** `restoreVotes(snapshot: Record<string, string>): Promise<void>`; prop `resetUndoAvailable: boolean` in `CardsArea`

**Covers:** AC8, AC9, AC10, AC15, AC16

**Depends on:** Task 2

**RED:** `pnpm exec vitest run tests/unit/stores/room.spec.ts tests/unit/components/CardsArea.spec.tsx tests/unit/pages/roomPage.spec.tsx` -> reset→undo cases (icon, restoration, overwriting a new vote, departed player, clearing on reveal/new round/loss of moderator, surviving countdown) fail

**GREEN:** the same command -> passed

**Commit:** `git add -A -- app/stores/room.ts tests/unit/stores/room.spec.ts app/pages/[slug].tsx app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx tests/unit/pages/roomPage.spec.tsx app/i18n/locales/uk.json app/i18n/locales/en.json`

### Task 4: Reveal remains visible

In `app/components/CardsArea.tsx:~391`, remove the `!showLastRound &&` condition around reveal; add `showLastRound` to
the `disabled` condition. Leave the other conditions unchanged.

**Files:** `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`

**Consumes:** none

**Produces:** `data-testid="reveal-button"` always in the DOM for a moderator

**Covers:** AC12

**Depends on:** Task 3

**RED:** `pnpm exec vitest run tests/unit/components/CardsArea.spec.tsx` -> "reveal in DOM and disabled when showLastRound" fails

**GREEN:** the same command -> passed

**Commit:** `git add -A -- app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx`

### Task 5: Static bottom panel

The results area (`ResultsArea` and its wrapper in `app/pages/[slug].tsx:~819-840`) and the cards area in the voting phase
reserve the same height at each breakpoint; circles for 1-2 groups (up to 500 px from #72) and 3+ groups
scale to fit without scrolling. Choose the height for the largest state at each breakpoint - `check during execution`
in the browser (`web-debug`) at 375, 768, and 1280 px. Circle labels must not be clipped.

**Files:** `app/components/ResultsArea.tsx`, `app/pages/[slug].tsx`, `tests/unit/components/ResultsArea.spec.tsx`

**Consumes:** none

**Produces:** fixed-height results area (class or CSS variable, document in Task 8)

**Covers:** AC11

**Depends on:** Task 4

**RED:** `pnpm exec vitest run tests/unit/components/ResultsArea.spec.tsx` -> the "container has the same height class for 1, 2, 3+ groups" case fails

**GREEN:** the same command -> passed; plus **Check:** Playwright (`web-debug`) on local preview: the moderator panel `boundingBox().y` is the same for 0/1/2/3+ circles and voting/revealed phases at 375, 768, and 1280 px

**Commit:** `git add -A -- app/components/ResultsArea.tsx app/pages/[slug].tsx tests/unit/components/ResultsArea.spec.tsx`

### Task 6: 3 cards per row < 1024 px

`app/components/CardsArea.tsx:309-315`: below `lg`, a card has width `calc((100% - 2 * gap) / 3)` (using Tailwind
`basis`/`w-`) and aspect ratio 2:3; at `lg` and above, retain 151.66 px and flex-wrap. Do not change the layout at ≥ 1024 px.

**Files:** `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`

**Consumes:** none

**Produces:** none

**Covers:** AC7

**Depends on:** Task 5

**RED:** `pnpm exec vitest run tests/unit/components/CardsArea.spec.tsx` -> the "card has one-third width classes below lg" case fails

**GREEN:** the same command -> passed; plus **Check:** Playwright at 375, 768, and 1023 px - 3 cards with the same `y` in each full row; at 1280 px the screenshot matches `main`

**Commit:** `git add -A -- app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx`

### Task 7: 3 spins for everyone

`app/pages/[slug].tsx:223`: `spinsPerRound = 3` regardless of role; leave `canSpinSlot` unchanged.

**Files:** `app/pages/[slug].tsx`, `tests/unit/pages/roomPage.spec.tsx`

**Consumes:** none

**Produces:** none

**Covers:** AC13

**Depends on:** Task 6

**RED:** `pnpm exec vitest run tests/unit/pages/roomPage.spec.tsx` -> "PO has 3 spins" (`slot-spins-left`) fails

**GREEN:** the same command -> passed

**Commit:** `git add -A -- app/pages/[slug].tsx tests/unit/pages/roomPage.spec.tsx`

### Task 8: Documentation

Update the «Кола результатів / Налаштування кіл» ("Result circles / Circle settings") section in `AGENTS.md`, `app/utils/AGENTS.md` (grouping with chips),
`app/components/AGENTS.md` (3 spins, undo reset, fixed area), and `DESIGN.md` §11 (chips, undo, reveal). Follow
the `project_doc_max_bytes` limit (64 KiB, `.codex/config.toml`) and `dashfix`.

**Files:** `AGENTS.md`, `app/utils/AGENTS.md`, `app/components/AGENTS.md`, `DESIGN.md`

**Consumes:** Tasks 1-7

**Produces:** none

**Covers:** AC1

**Depends on:** Task 7

**Check:** `wc -c AGENTS.md` -> less than 65536; `grep -n "ігнорується" AGENTS.md` -> no mention of `result_cohorts` being ignored

**Commit:** `git add -A -- AGENTS.md app/utils/AGENTS.md app/components/AGENTS.md DESIGN.md`

## Execution record

```text
Base: d981184991ea297ac8fae0ee6d152ceb39fb48b5
Root: /Users/o.hupalov/work/github/storypoker
Branch: feat/room-controls-cohort-chips
Commits: allowed
Initial dirty state: clean
Task 1: done - vitest tests/unit 575 passed, lint + typecheck clean; RED written together with GREEN (tests and impl in one edit)
Task 2: done - vitest tests/unit 576 passed, lint + typecheck clean; AC14 realtime test landed in Task 1
Task 3: done - vitest tests/unit 584 passed, icons:check up to date, lint + typecheck clean; Ruling: icon ic:baseline-undo added to manifest + MDI_TO_LUCIDE (undo-2) over reusing lucide:undo - Lucide hardcode is forbidden - low cost
Task 4: done - vitest tests/unit 588 passed, lint + typecheck clean
Task 5: done - vitest tests/unit 591 passed, lint + typecheck clean; Ruling: AC11 narrowed to voting screen by user ("ні, тільки екран 1"; "no, only screen 1"), spec re-approved; cards and last-round view stacked in one grid cell over fixed-height zone - panel cannot move on toggle; browser y-check of panel not run (harness has no last-round view)
Task 6: done - vitest CardsArea 14 passed; browser (icon harness, Chrome) cards per row: 375 [3,3,3,1], 768 [3,3,3,1], 1023 [3,3,3,1], 1280 [5,5]
Task 7: done - RED spinsLeft 5 != 3, GREEN vitest tests/unit 589 passed, lint + typecheck clean
Task 8: done - AGENTS.md 21507 bytes, no "ігнорується" ("is ignored") for result_cohorts; app/utils, app/components AGENTS.md and DESIGN.md updated
Task 9: done - revealed results rendered in the CardsArea results layer with disabled panel; vitest tests/unit 593 passed, lint + typecheck clean
Task 10: done - moderator panel fixed to viewport bottom, page main reserves bottom padding; vitest tests/unit 595 passed, lint + typecheck clean; harness Chrome: panel y=683 (375x812), y=725 (1280x800)
Task 11: done - GQA/AQA chips, migration 021 written (not applied); vitest tests/unit 597 passed, lint + typecheck clean
Ruling: plan revised after spec re-approval - docs/specs/2026-11-02-room-controls-cohort-chips-design.md
Task 12: done - chip filter (resultKeyFor), uncounted voters red, reveal writes counted votes only, migration 021 with 9 roles (not applied); vitest tests/unit 594 passed, lint + typecheck clean
Task 13: done - legacy custom:* treated as no role (DEV) in app, API unchanged; vitest tests/unit 592 passed, lint + typecheck clean
Task 14: done - panel back under cards, cards-sized zone with scrolling circles layer; vitest tests/unit 591 passed, lint + typecheck clean; harness Chrome screenshot 1280: panel under cards
Task 15: done - ResultsLayer scales up to 6 circles to fit, scrolls from 7; vitest tests/unit 596 passed, lint + typecheck clean
Task 16: done - only circles scale via --result-circle-scale; vitest tests/unit 596 passed, lint + typecheck clean
Task 17: done - one panel button: reveal in voting, new round after reveal; vitest tests/unit 596 passed, lint + typecheck clean
Task 18: done - result chips in one row (modal 760px, compact chips, group dividers; wraps below sm); vitest tests/unit 596 passed, lint + typecheck clean; browser check not run
Task 19: done - below lg chips break into two rows (DEV group | QA, PO, SM); vitest 597 passed, lint + typecheck clean; browser check not run
Task 20: done - poll decks hide chips and skip vote filtering (UI + round_history); vitest 602 passed, lint + typecheck clean
Task 21: done - goal_clarity without chips via usesResultChips(); vitest 609 passed, lint + typecheck clean
Task 22: done - single-vote circle alignment 100 on results screen; vitest 611 passed, lint + typecheck clean
Task 23: done - below lg results layer in flow, cards layer hidden while results shown; vitest 613 passed, lint + typecheck clean
Ruling: review R1 origin automatic - CI auto-review pr-auto-review.yml run 41535775033, PR #73 review 5744196776 on head eaa7efb1373ab670f6fcb0ca295baf4afa8fd669, dispatched after the user's merge plan
Review R1: Intent PASS, System FINDINGS, Craft FINDINGS, 0/0/2, ready with fixes tree 18b4269d3cefc059ff6aa609ac24a4035d892449 reviewer so-upstars auto-review mode code
Finding R1-F1: Minor app/stores/room.ts:177 - Undo clears votes cast after the reset and is not atomic
Finding R1-F2: Minor supabase/AGENTS.md:31 - Stale doc says the UI ignores result_cohorts and has no circle settings
Received R1: R1-F1 PARTIAL, R1-F2 ACCEPT Re-review: not needed
Ruling: R1-F1 keep full rollback, write snapshot votes first and clear only the other players - spec decision 3 (owner chose full rollback over new votes winning) governs the semantics; the reorder removes the all-empty flash the review cites - a vote cast after reset is still lost on undo, as the owner decided
Round review 1: undo write order and a stale schema note
```

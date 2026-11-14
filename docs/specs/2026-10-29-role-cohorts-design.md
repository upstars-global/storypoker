# Role cohorts: circles, trends, history, home, and API

Status: approved
Route: design
Date: 2026-11-01

## Goal

A team in a room sees each role's estimates separately, instead of only DEV versus QA. PR #58 (`ea60eb3`) already gave each role its own result circle and trend chart line. The rest of the application still uses the DEV/QA split: round history, average room alignment on the home page, and the read-only `/api`. QA, GQA, and AQA share a circle, and the overall score in trend cards treats PO/SM differently from the other screens. This specification describes behavior already in production and brings all places under one definition of role:

1. Describe what shipped in #58 as a contract: circles, PO/SM, equal size, and trend lines.
2. Split QA into three roles: QA, GQA, AQA.
3. Move round history, home, and `/api` to roles; add fields to `/api` only, to avoid breaking agilecharts.
4. Provide one definition of the overall round score (estimators excluding PO/SM) for history, home, trend cards, and `/api`.
5. Remove DEV/QA remnants from application code and documentation.
6. Draw the result circle with ECharts instead of custom SVG.
7. Pre-release revision: automatically show a separate circle for every role with votes, including custom roles, remove display settings, and adapt circles to the available width.

Everything is in one specification: the parts share one definition of role and go into one PR.

## Evidence

The original technical notes below describe baseline `ea60eb3`; the new revision changes only the current circles and settings.

| Assumption | State | Source |
| --- | --- | --- |
| Result circles are already calculated by roles DEV/BE/FE/SRE/QA + PO/SM, QA = QA+GQA+AQA | verified | `app/utils/resultCohorts.ts` (`COHORT_BY_TAG`, `PRODUCT_COHORTS`) at `ea60eb3` |
| The saved set of chips is limited by a check constraint to DEV/BE/FE/SRE/QA | verified | `supabase/migrations/017_room_state_result_cohorts.sql:4-5` |
| The trend chart already draws a line per role; cards take the average of roles including PO/SM | verified | `app/components/AlignmentTrendsModal.tsx:164-166` (`roleRoundAlignment`, `overall = average(...)`) |
| Trend cards: “Current” is the last non-null overall score; “Average” is the average of non-null scores; “Trend” compares the second half with the first at ≥ 4 scores, threshold ±1 % | verified | `AlignmentTrendsModal.tsx:202-218` |
| The history list splits votes into DEV/QA and labels DEV as `DEV/FE/BE/SRE` | verified | `app/components/HistoryModal.tsx:76-85`, `:245` |
| The history list calculates average and alignment from estimator votes as one pool, excluding PO/SM and custom roles; if only non-estimators voted, the pool is all votes | verified | `app/utils/roundStats.ts:104-118` `summarizeRound` → `trendCohorts` (`app/utils/shields.ts:161-172`, fallback on line 171) |
| `/api` `average`/`voters` use the same pool (PO/SM and custom roles excluded, same fallback) | verified | `netlify/functions/room-json.mts:98-117` (`trendCohortForShields` returns `null` for PO/SM/custom), `:194-208` |
| The Netlify function does not import from `app/`; the DEV/QA logic is a local copy | verified | `room-json.mts:1-5` (only `@supabase/supabase-js`, comment about absence of `~`) |
| Home calculates room alignment as the average of DEV and QA across all rounds, with no deck filter | verified | `app/pages/index.tsx:42,73-81` → `roundAlignment()` (`roundStats.ts:92-102`) |
| `/api` returns `devAlignment`, `qaAlignment`, `votes[].cohort: 'DEV'\|'QA'`, `average`, `voters`; rounds include only numeric decks with non-null `average` | verified | `room-json.mts:192-217` |
| agilecharts reads these fields and accepts `cohort` only as `'DEV'\|'QA'` | verified | `agilecharts/app/utils/storypoker.ts:17,27-28,59`, `TeamConsistencyTrends.vue:60` |
| The alignment score is an integer 0-100 from deck cards excluding `?`/`☕`, `null` with < 2 such votes | verified | `app/utils/alignment.ts:1-21` |
| A player absent from the visible players (left) counts as DEV, both in the application and `/api` | verified | `app/hooks/useShieldsMap.ts` (only `visiblePlayers`), `room-json.mts:186-189` |
| A role in past rounds comes from the player's current shields, not those at the time of the vote | verified | `round_history.votes` has only `player_id,name,vote`; `useShieldsMap` |
| Celebration: any circle with ≥ 2 votes and one estimate; hidden votes are excluded from circles | verified | `app/utils/resultCelebration.ts:16-24`, `app/pages/[slug].tsx:250-252` |
| ECharts currently loads only with the lazy trend modal | verified | `grep -rln echarts app` → only `AlignmentTrendsModal.tsx`, `useEChart.ts`; `[slug].tsx:70` `lazy()` |
| Eager import of ECharts into the result circle would exceed the entry chunk budget | assumed | budget +25 KiB gzip over baseline (`scripts/audit-icon-build.ts:8`); lazy loading mitigates the risk (decision 10) |
| Owner decision: add new fields to `/api`, leave old ones untouched | verified | user response, Round 1 |
| Owner decision: PO/SM are excluded from the overall score | verified | user response, Round 1 |
| Owner decision: celebration applies to any circle where more than one teammate of that role voted | verified | user response, Round 1 |
| Owner decision: QA, GQA, AQA are three separate roles; GQA/AQA are always enabled, like QA | verified | user responses, Rounds 1-2 |
| Automatic circles replace settings; each custom role has its own circle | verified | owner requirements in chat on 2026-10-31 and confirmation to finish before release on 2026-11-01 |
| Current code still has chips and excludes custom roles from circles | verified | `app/utils/resultCohorts.ts:75-116`, `app/components/ConfigureCardDeckModal.tsx:208-256`, `app/pages/[slug].tsx:248-260` at `64ace6e` |
| Circles already use lazy ECharts; the container needs resize and long-label checks | verified | `app/components/ResultsArea.tsx:29,89-91`, current implementation |

## Decisions

1. Built-in role cohorts: `DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM` in that order. Each custom role gets a separate circle; custom roles follow built-in roles in the order of the first voter from each role in the current room list. A player without a role or absent from visible players is `DEV`.
2. Circles are determined automatically from actual votes after reveal. Only a role with at least one vote is shown, regardless of the number of participants with that role. Three roles with votes produce three circles; of eight roles present and two with votes, two circles appear. Circles without votes are absent.
3. The “Show results” section is removed. Any valid saved value of `room_state.result_cohorts` is ignored during display; saving a deck again does not change this field. The schema and old data remain compatible. Automatic display was chosen over chips at the owner's direct request.
4. Automatic custom circles apply only to current-round results. Built-in cohorts for history, trends, home, and `/api`, the definition of estimators, and API compatibility remain as specified in the decisions below. A custom role's identity is the full saved shield value with the `custom:` prefix; identical values are grouped, and different values are not merged even if the label matches a built-in role's name.

5. The overall round score (average and alignment) uses one pool of estimator votes: roles `DEV, BE, FE, SRE, QA, GQA, AQA`, excluding PO/SM and custom roles. If only non-estimators voted in the round, the pool is all votes. The score is an integer 0-100 from cards excluding `?`/`☕`, `null` with fewer than two such votes. History list, home, trend cards, and `/api` `average`/`voters` use this definition. Take the estimator pool over the average of roles: history and `/api` already calculate it this way, so their numbers do not change. The cost is that home and trend card numbers shift (home previously averaged DEV and QA, cards averaged roles including PO/SM). Rejected: averaging role scores would change historical numbers in history and `/api`.
6. Trend cards retain their formulas; only the input round score changes (decision 5). “Current score” is the last non-null score in the visible period. “Average score” is the rounded average of non-null scores. “Trend” compares the average of the second half of non-null scores to the first at ≥ 4 scores; a change beyond ±1 % is up or down, otherwise stable. Home uses the rounded average of non-null overall scores of numeric deck rounds (`scrum, fibonacci, hours, goal_clarity` and rounds without a preset), the same set of rounds as trends. Take a shared filter over the current “all rounds”: voting rounds no longer enter the room score.
7. `/api` is extended without breaking compatibility. Each round gets `alignments` and `roleVotes`. `alignments` is a sparse object: a key exists only for a role with at least one vote, with an integer 0-100 or `null` value. `roleVotes` contains all votes with a cohort, each with a `role` field. `average`, `voters`, `devAlignment`, `qaAlignment`, and `votes[{name,vote,cohort}]` remain byte-for-byte as they are, as does the set of rounds in the response. Take new fields alongside existing ones over replacement: agilecharts works unchanged, at the cost of retaining a copy of the old DEV/QA split in the function as a legacy contract. Rejected: replacing fields breaks the Estimation Trends tab in agilecharts.
8. Trend chart: one line per role with a score in the visible period; each can be hidden in the legend. “Details” on a line point shows only that role's votes. Take role lines over DEV/QA: for built-in roles, as in circles.
9. History list: if a round's votes with a cohort span two or more roles, the round shows one row per role (colored role badge + card counts), in the order of decision 1. Custom role votes go in the last row without a badge. A round with one role or only custom roles shows one row of counts for all votes, as it does now. Take role rows over DEV/QA rows; take a separate custom row over discarding them: the number of votes in rows equals the number of votes in the round.
10. Celebration and consensus sound stay as they are: they trigger when a visible circle has ≥ 2 votes and one estimate. Any role's circle qualifies, including PO/SM and custom roles; all votes belong to their own circles. “Тіммейтів більше одного” (“More than one teammate”) means ≥ 2 votes in the circle, rather than ≥ 2 players with the role in the room. Take votes over members: one voter among three POs has nobody with whom to reach unanimity.
11. ECharts (pie) draws the result circle in a lazy chunk, like the trend modal. All circles are equal: width 240 px; on a screen where 240 px does not fit, all narrow equally. One vote is a solid circle with the card label; multiple votes are sectors with card labels, using the same palette. The `<ROLE>: <average>` label renders outside the chart and is visible immediately. While the chunk loads or if it fails to load, an empty space of the same size occupies the circle's place, with no on-screen error. Take lazy ECharts over eager: the `icons:audit-build` entry chunk budget; the cost is that the circle appears after the chunk loads (instantly from the PWA cache). Rejected: keeping SVG, due to the `app/components/AGENTS.md` rule “при дотику переписуй на ECharts” (“rewrite to ECharts when touching it”).
12. Role colors use one map everywhere: trend lines, history badges, and round snapshot badge. Existing colors do not change; new colors are GQA `#ff7043`, AQA `#fdd835`, both distinct from QA `#ffa726`.
13. After the transition, no DEV/QA split remains in the application: functions and constants that calculate or label it disappear, and documentation describes only role cohorts. The sole deliberate remnant is the legacy `/api` fields (decision 7), marked in code and documentation as a contract for agilecharts.

## Behavior

**Result circles (after reveal, numeric deck).** Each role with votes gets a circle labeled
`<ROLE>: <average>`. DEV, QA, and Designer produce three circles. Two Designers with the same saved shield vote
into one circle; Designer and Architect vote into separate circles. A custom role named DEV has a separate circle
from the built-in DEV. Participants who have not voted do not create circles; hidden votes are not shown before
reveal. With no votes, there are no role circles. The `voting`, `vote_question`, and `goal_clarity` decks behave as
before (bubbles, clarity score).

**"Configure deck" dialog.** The "Show results" section, its chips, and its tooltip are absent. Preset and card
selection works as before. The vote badge does not turn red because of the old hidden roles setting.

**Responsiveness.** All circles have the same size up to 240 px and wrap onto new rows as width permits. If less
space than one circle is available, it shrinks to the container. At 375 px and 1280 px there is no horizontal
overflow, clipped circle, or overlapping label; long custom role names wrap. Changing width redraws the chart without
reloading the page.

**Trends chart.** One line per role (up to 9), legend toggles, and cards follow decision 6. A round snapshot from a
line shows only that role's votes, with a role badge in the header.

**Round history.** Rows follow decision 9; the average and alignment in a round row follow decision 5 (as before).

**Home (Recent Rooms).** Room alignment follows decision 6.

**`/api`.** As before, plus `alignments` and `roleVotes` for each round; the set of rounds remains unchanged.

**Role in past rounds:** the player's current role; a player no longer among those visible is DEV (as before).

## Contract

1. Built-in cohorts: `DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM`; custom circles have separate stable keys that do not
   collide with built-in role keys. A custom role's label is its name without the `custom:` prefix.
2. `room_state.result_cohorts`: the format and check constraint remain unchanged; the value does not affect circles,
   and saving the deck does not change it. The statistics estimators are only the seven built-in roles excluding
   PO/SM, as in decision 5.
3. `/api` round:
  `{ id, date, week, deck, average, devAlignment, qaAlignment, voters, votes: [{name, vote, cohort: 'DEV'|'QA'}],
  alignments: { <ROLE>?: integer 0-100 | null }, roleVotes: [{ name: string, vote: string, role: <ROLE> }] }`.
  `alignments` contains a key only for a role with at least one vote in the round. `null` means no score: fewer than
  two votes using deck cards other than `?`/`☕`. `roleVotes` contains all votes with a cohort (no custom roles) in
  round order. Legacy fields and the set of rounds are calculated as on `ea60eb3`.
4. Role colors: one map for 9 roles (decision 12).

## Out of scope

1. Changes to agilecharts: migration to `alignments`/`roleVotes` happens separately in that repository.
2. The role at the time of a historical vote: this requires a field in `round_history.votes`.
3. Database migrations and changes to the check constraint.
4. Custom trend lines, custom `/api` keys, and changes to the overall score definition due to new circles.
5. Clients with an old PWA bundle before updating: they show QA as one circle and the old score. The data and schema
  are the same, so there is no breakage; the update arrives through the usual `useAppUpdate` mechanism.

## Open questions

None.

## Acceptance criteria

1. AC1: After reveal in a numeric deck, votes from all nine built-in roles produce nine circles in the order DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM.
2. AC2: Players with GQA and AQA roles appear in `GQA` and `AQA` circles respectively, rather than `QA`.
3. AC3: DEV, QA, and custom Designer with votes produce three separate circles; Designer and Architect alone produce two separate circles without a combined circle.
4. AC4: A vote by a player without a role and a vote by a player who left the room count as DEV in circles, history, trends, and `/api` `roleVotes`.
5. AC5: Three present roles with votes produce three circles; eight present roles with votes from only two produce two circles.
6. AC6: The result_cohorts values null, [], [DEV], and [BE] produce identical role circles for the same set of votes and do not change the badge color due to role hiding.
7. AC7: With no votes after reveal, there are no role circles or confetti; before reveal, role circles do not disclose hidden votes.
8. AC8: The deck configuration dialog contains no "Show results" section, its chips, or its tooltip; saving the preset and cards does not change result_cohorts.
9. AC9: Identical complete custom shields are grouped into one circle, different ones into separate circles; custom:DEV does not merge with built-in DEV, and the label displays the name as plain text; custom circles follow built-in ones in the order of the first participant who voted for each role in the current room list.
10. AC10: At widths of 375 px and 1280 px and after resize, all circles are equal, no wider than 240 px or the container, and have no horizontal overflow; long names wrap without overlap.
11. AC11: ECharts renders the result circle: one vote produces a solid circle with the card label, multiple votes produce sectors with card labels; ECharts is excluded from the entry chunk (`pnpm run icons:audit-build` passes).
12. AC12: While the circle chunk is loading or if loading fails, `<ROLE>: <average>` labels remain visible, the circle placeholder has the same size, and no error appears on screen.
13. AC13: Confetti and sound trigger for any circle with at least two identical votes, including custom, PO, and SM; circles with one vote or different estimates do not trigger them.
14. AC14: The `voting`, `vote_question`, and `goal_clarity` decks show the same result after reveal as on `ea60eb3`.
15. AC15: The trends chart draws a separate line for each of the 9 roles with a score in the period, and each can be hidden in the legend.
16. AC16: "Details" on a role line point opens a snapshot containing only that role's votes and a role badge in the header.
17. AC17: The overall round score in the history list, the trends cards input, and the home page input equal the alignment of the pool of estimator votes excluding PO/SM and custom roles; a round where only PO/SM or custom roles voted is calculated from all votes.
18. AC18: Trends cards are calculated using the formulas in decision 6 from the overall scores in AC17.
19. AC19: Room alignment on the home page is the rounded average of non-null overall scores of its numeric-deck rounds; voting rounds and rounds with `null` are excluded from the average.
20. AC20: Ignoring result_cohorts and adding custom circles do not change history rows, trend lines, home page scores, the definition of estimators, or API fields.
21. AC21: A round in the history list with votes from two or more roles shows one row per role with a role badge in the order `DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM`, with custom role votes in the last row without a badge; a round with one role or only custom roles has one row for all votes.
22. AC22: The `/api` response for the same dataset has the same set of rounds and the same `average`, `voters`, `devAlignment`, `qaAlignment`, and `votes` as on `ea60eb3`.
23. AC23: Every round in `/api` has `alignments` with a key only for each role that voted, with an integer value 0-100 or `null`, and `roleVotes` with a `role` for every vote with a cohort; custom role votes are absent from `roleVotes`.
24. AC24: `/api` continues to return `401` without a Bearer token or with an incorrect token.
25. AC25: `grep -rnE 'trendCohorts|trendCohortForShields|isQaPlayer|DEV_COHORT_LABEL|splitRoundAlignment|TrendCohort' app` finds nothing, and `roundAlignment` (if retained) does not calculate DEV and QA separately; `AGENTS.md`, `DESIGN.md`, and nested `AGENTS.md` files do not describe a DEV/QA split except for legacy `/api` fields.
26. AC26: Trend lines, role badges in history, and the round snapshot badge take the role color from one map; GQA `#ff7043`, AQA `#fdd835`, QA `#ffa726`.
27. AC27: `pnpm run test:ci` passes.

## Security Model

Trusted inputs: owner decisions in this conversation. Untrusted inputs: Supabase data (`round_history.votes`, names,
shields) and requests to `/api`. Player names in `roleVotes` do not go beyond what `votes` already returns and what
anyone in the room can see. The endpoint remains protected by `Authorization: Bearer <STORYPOKER_API_TOKEN>`. The
change adds no network calls, secrets, RLS or schema changes, and the client receives no data it did not already have.
Custom names are displayed as plain text without HTML; long names wrap, and custom role keys do not collide with
built-in keys.

# Utils - decks, roles, formulas

Presets in `app/utils/cardDecks.ts`:

| id | default active |
|---|---|
| `scrum` | `1/2,1,2,3,5,8,13,20,?,☕` |
| `fibonacci` | `1,2,3,5,8,13,21,?,☕` |
| `tshirt` | `S,M,L,XL,?,☕` |
| `hours` | `1/2h,1h,2h,3h,5h,8h,13h,20h,?,☕` |
| `boolean` | `True,False,?,☕` |
| `voting` | `yes,no,☕` (optional `🍺,🚬`) |
| `vote_question` | custom options; default `Option A,Option B,Option C` |
| `goal_clarity` | `1,2,3,4,5` |

`scrum`/`fibonacci` have no `0` or values above 21; `tshirt`/`hours` have `0`, deactivated by default.
`activeCardsForDeck()` filters out stale cards in `active_cards` (from the time of wider decks) before rendering. `☕` is a symbol, not SVG. `setDeckPreset()` writes `deck_preset + defaultActive + poll_question`
(`preset.defaultQuestion ?? null`); `saveCardDeck()` writes only `active_cards`.

`goal_clarity` ("Goal Clarity Score") has the fixed legacy stored question
"Наскільки чітко я розумію Sprint Goals?" (meaning "How clearly do I understand the Sprint Goals?") (`defaultQuestion` on the preset, not a
moderator-typed `poll_question` as in `voting`/`vote_question`). When the preset is `goal_clarity` and the
stored question exactly matches that default, the client displays it in the client's language. It is
calculated as a regular numeric preset (`isNumericPreset` in `roundStats.ts`, `DECK_NAMES` in
`room-json.mts`). After reveal, `ResultsArea.tsx` shows a colored circle with the average score
(`goalClarityScore` prop) instead of PieChart: green `>3.5`, yellow `3.5-2.5`, red `<2.5`; a result of `≤3.5`
prompts the user to rephrase the goal/DoD (`results.goalClarityHint`).

## Alignment formulas

`alignmentScore`/`averageOf` (`alignment.ts`, `roundStats.ts`), raw role cohort definitions
(`resultCohorts.ts`), and the deck fallback are intentionally duplicated in `netlify/functions/room-json.mts`: the Netlify
bundler does not resolve the Vite alias `~/*`. Synchronize changes manually. Legacy API fields have a separate
contract for agilecharts (`netlify/AGENTS.md`). The trends and history pipeline is in `DESIGN.md` §11.3-11.4.

`isNumericPreset` determines which decks enter alignment: `scrum`/`fibonacci`/`hours`/`goal_clarity` +
legacy `deck_preset=null`; poll decks (`voting`/`vote_question`) and non-numeric decks (`tshirt`/`boolean`) are excluded.

`voteCohortFor()` determines the raw role in order DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM; legacy `custom:*`,
a missing role, or a missing player maps to DEV. `COHORT_COLORS` provides shared colors for trend lines and badges
in history and the snapshot. `roleRoundAlignment()` calculates each role separately, including PO/SM.
`summarizeRound()` gets the average and alignment from
`estimatorVotes()`: the DEV/BE/FE/SRE/QA/GQA/AQA pool, or all votes when that pool has no votes.
Alignment is an integer from 0 to 100; fewer than two deck cards excluding `?`/`☕` produce `null`. The home page takes the rounded average of non-null
overall scores from numeric rounds; trend cards use the same overall scores in the visible period.

## Result groups

`groupResultVotes(players, selected)` returns `{ key, label, votes }[]` only for roles with votes.
`selected` is the saved `result_cohorts`; `resultKeyFor(shields, selected)` uses `RESULT_CHIP_GROUPS` to return a circle or
`null` (the vote is not counted): the DEV/QA group uses a combined circle when no chips are selected, and only selected chips when they are; PO/SM
requires a chip. `reveal()` writes only votes with a non-`null` circle to `round_history`. Built-in roles
follow `ROLE_COHORTS` order. The first recognized built-in role in shields determines the group; without one (including
legacy `custom:*`), the group is DEV. Empty votes do not create groups.

Circle grouping is separate from `voteCohortFor()`, `roleRoundAlignment()`, and `estimatorVotes()`: the contracts
for history, trends, home, and API remain unchanged. `normalizeCohorts()`, `resultCohortFor()`, and
`groupVotesByCohort()` are retained for compatibility; the circles UI does not use them.

## Consensus

`resultCelebration.ts → shouldCelebrate(votes, groups)` is the single predicate for fireworks (`ResultsArea.tsx`) and sound
(`isConsensus` in `pages/[slug].tsx`); `groups` are the circles from `groupResultVotes()` (`resultCohorts.ts`).
A group is unanimous when it has exactly one unique estimate **and** ≥ 2 votes.
With no groups, the same rule applies to all votes.
The ≥ 2 threshold matches `DESIGN.md` §11: a `round_history` row is also written only when `votes.length >= 2`.

On the results screen (`AlignmentCard`), a circle with one deck card vote shows alignment 100
(`duplicateSingleVote()` in `[slug].tsx`); history, trends, and home retain the rule "fewer than two votes - `null`".

# Room controls, cohort chips, compact cards

Status: approved
Route: design
Date: 2026-11-02

## Goal

Six changes to the room for moderators and players: restore the moderator's control over which DEV roles appear as
separate circles; make the card grid predictable on tablets and phones; let the moderator undo an accidental vote reset;
fix the position of the bottom button bar so it does not jump; equalize slot machine spins across all roles.

## Evidence

| Assumption | State | Source |
| --- | --- | --- |
| Circles are currently built automatically for every role; the setting is ignored | verified | `groupResultVotes()` in `app/utils/resultCohorts.ts`; AGENTS.md «Налаштування кіл» ("Circle settings") |
| `room_state.result_cohorts text[]` exists; its check allows only DEV/BE/FE/SRE/QA | verified | `supabase/migrations/017_room_state_result_cohorts.sql:1-5` |
| Cohort persistence already exists in the store | verified | `app/stores/room.ts:236` `.update({ result_cohorts })` |
| BE, FE, SRE chips are sufficient; GQA/AQA are always in QA | verified | user decision, Round 1 |
| Reset only clears `players.vote`; previous votes are not saved anywhere | verified | `app/stores/room.ts:155-161` |
| Reset is enabled only when voting is partial | verified | `app/pages/[slug].tsx:237` `canReset` |
| Undo is intended to correct an accidental click | verified | user's words: «якщо кнопка ресет була натиснута випадково, має бути змога зробити undo» ("if the reset button was pressed accidentally, it should be possible to undo") |
| The reveal button is hidden in previous-round mode | verified | `app/components/CardsArea.tsx:391` `{!showLastRound && (` |
| Circle area height changes with the number of groups (up to 500 px for 1-2 groups) | verified | commit 4947bd8 (#72) |
| Card width is fixed at 100/151.66 px; the number per row depends on the screen | verified | `app/components/CardsArea.tsx:315` |
| Spins: 5 for product roles, 3 for the rest | verified | `app/pages/[slug].tsx:223` |
| Breakpoint for 3 cards is below 1024 px | verified | user's answer «так» ("yes"), Round 2 |

## Decisions

Decision IDs are historical identifiers, not list positions.

1. Decision 1: DEV group chips (BE, FE, SRE) and QA group chips (GQA, AQA) appear in the deck settings modal, with state in
   `room_state.result_cohorts`; migration `021` extends the check constraint to GQA/AQA (user decision).
   A chip filters the team's flow: an enabled chip in a group replaces the group's general circle with circles for only
   the selected roles; the remaining roles in the group are not counted.
2. Decision 7: Only counted votes are written to `round_history` on reveal. Choose «писати враховані» ("write counted votes") over a chip
   column in the round or filtering the entire history by current chips: no migration is needed, old history stays unchanged, and
   trends and the API reflect the team's flow. Cost: votes from excluded players are not stored anywhere.
3. Decision 2: Undo reset keeps a snapshot of votes in the memory of the client belonging to the moderator who pressed reset. Choose
   client memory over a field in `room_state`: an accidental click is corrected immediately, and the database and RLS
   remain unchanged. Cost: another moderator, or the same moderator after a reload, cannot see undo.
4. Decision 3: Undo restores exactly the votes present before reset was pressed (a full rollback). Choose a full rollback over «нові голоси
   пріоритетні» ("new votes take priority"): the user decided that undo shows only votes from before reset.
5. Decision 4: The bottom button bar has a fixed position independent of the circle area height. Reveal is always present in the bar
   and becomes disabled (idle) under the same conditions as now (`hasVotes` - at least 2 votes, countdown, `canVote`),
   plus previous-round mode. A fixed-height results area provides the position: circles scale within it. Choose reserved
   height over a sticky/fixed bar: the bar remains in the page flow and does not cover cards on phones.
6. Decision 5: Show 3 cards per row when the viewport is narrower than 1024 px; card width is one third of the container width minus
   gaps, preserving the 2:3 aspect ratio.
7. Decision 6: Spins per round: 3 for all roles. Only the count changes; the rule for when PO/SM can spin (`canSpinSlot`) remains as
   is.

## Behavior

### Cohorts

1. The modal displays chips in groups: DEV / BE / FE / SRE || QA / AQA / GQA || PO || SM.
2. DEV group (DEV, a player without a role, a player who left, BE, FE, SRE):
   1. No group chip is enabled: one overall DEV circle contains all votes in the group.
   2. At least one is enabled: only circles for selected roles appear (the DEV chip includes DEV players and players without a role); the rest of the group is not counted.
3. QA group (QA, GQA, AQA): the same rule applies, with QA as the overall circle. The groups are independent.
4. PO and SM: a circle exists only when its chip is enabled; otherwise the vote is not counted.
5. There are no custom roles: legacy `custom:*` values are counted as no role (DEV) everywhere (circles, statistics, badges); `/api/*` remains unchanged.
6. An uncounted vote is visible only in the player list, and the player is highlighted in red (as in previous versions); it is excluded from circles, total votes, average, consensus, alignment, and `round_history`.
7. The saved array is interpreted as selected chips; unknown values are ignored. Risk: after merge, legacy rooms with `['DEV','BE','FE','SRE','QA']` saved will show DEV/BE/FE/SRE/QA circles without PO and SM.
8. With no chips enabled, an empty array `[]` is saved.
9. Changes to the saved configuration synchronize between clients through Realtime, like the rest of `room_state`.
10. Consensus is calculated across circles after the grouping in this section; the rule "at least one circle is unanimous with ≥ 2 votes" remains unchanged.
11. History, trends, the home page, and the API read `round_history`, so they see only counted votes; formulas remain unchanged.

### Card grid

1. At viewport widths < 1024 px, each full row has exactly 3 cards; the last row may contain 1-2 cards.
2. At widths ≥ 1024 px, behavior remains as it is now.

### Reset with undo

1. State A (normal): the button has a reset icon and the tooltip "Скинути голоси" ("Reset votes"). Clicking it clears votes as it does now and saves a `{playerId → vote}` snapshot for players who had voted.
2. State B (after reset): the same button shows a different icon (undo) and the tooltip "Повернути голоси" ("Restore votes"). Clicking it restores votes exactly from the snapshot: players in the snapshot receive their previous vote, and everyone else has no vote; votes cast after reset are overwritten. The button returns to state A.
3. The button in state B remains enabled even when nobody has voted (the usual `canReset` condition does not apply).
4. The snapshot disappears and the button returns to state A when a new round starts, reveal occurs, or the moderator reloads the page.
5. Players who left the room after reset do not receive a vote.
6. The snapshot survives countdown; if the moderator removes their moderator flag, the snapshot is discarded.

### Bottom panel

1. The moderator panel stays in the same position when switching between cards and previous-round circles and after reveal: circles occupy the same area as cards. After reveal the panel buttons are disabled, and "Новий раунд" ("New round") remains above the panel.
2. Reveal is always visible; it is disabled when there are fewer than 2 votes, countdown is running, the moderator cannot vote, or the previous round is enabled.
3. For 3+ circles, the results area does not scroll: circles shrink to fit the fixed height.

### Slot machine

1. Each player has 3 spins per round regardless of role.

## Contract

1. `room_state.result_cohorts`: `text[] | null`, a subset of `['DEV','BE','FE','SRE','QA','GQA','AQA','PO','SM']`. Reads tolerate legacy values and null.
2. Migration `021`: check constraint `result_cohorts <@ DEV/BE/FE/SRE/QA/GQA/AQA/PO/SM`. There are no new columns or RLS changes.
3. `round_history.votes` contains only counted votes.
4. New uk/en i18n keys for the chips section title and the "Повернути голоси" ("Restore votes") tooltip.

## Out of scope

1. Changing `/api/*` for custom roles.
2. Undo reset for other moderators or after reload.
3. Changing statistics and trend formulas or retroactively changing old rounds.
4. Changing the card grid at widths ≥ 1024 px.

## Open questions

None.

## Acceptance criteria

1. AC1: The modal has DEV, BE, FE, SRE | QA, AQA, GQA | PO | SM chips; saving writes the selected subset to `room_state.result_cohorts`.
2. AC2: With no DEV-group chips, votes from DEV, no role, BE, FE, and SRE form one DEV circle; with no QA-group chips, QA, GQA, and AQA form one QA circle.
3. AC3: With the BE chip enabled, there is a BE circle and no DEV circle; FE, SRE, DEV, and no-role votes do not enter any circle; the same applies to the QA group.
4. AC4: A PO (SM) circle exists only with the PO (SM) chip enabled; otherwise the PO (SM) vote is not counted. A player with legacy `custom:*` counts as DEV.
5. AC5: Unknown values in `result_cohorts` do not affect circles.
6. AC6: Consensus, total votes, average, and alignment are calculated only from counted votes.
7. AC17: A player with an uncounted vote is highlighted in red in the list, and their estimate is visible there.
8. AC18: After reveal, `round_history.votes` contains only counted votes.
9. AC7: At viewport widths of 375, 768, and 1023 px, every full row has exactly 3 cards; at 1280 px, the layout is unchanged relative to `main`.
10. AC8: After reset is clicked, votes are cleared and the button shows the undo icon and "Повернути голоси" ("Restore votes") tooltip.
11. AC9: Clicking again restores votes exactly as they were before reset (votes cast after reset are overwritten or cleared), and returns the button to the reset icon.
12. AC10: A new round, reveal, or moderator reload returns the button to reset state without undo.
13. AC11: The moderator panel sits below the card area and has the same position in every room state (cards, previous round, reveal, any number of circles); up to 6 circles, only the circles shrink proportionally (not text, alignment, or buttons) to fit the area; from 7, the area scrolls; after reveal, panel buttons are disabled.
14. AC12: The reveal button is present in the DOM in every state and disabled with fewer than 2 votes, during countdown, when the moderator cannot vote, and in previous-round mode.
15. AC14: One moderator changing `result_cohorts` changes circle grouping on another client without a reload.
16. AC15: A player who left after reset has no vote after undo.
17. AC16: Countdown in undo state does not clear the snapshot; removing the moderator flag clears it.
18. AC13: A player with the PO or SM role has 3 spins per round, like everyone else.

## Security Model

Trusted inputs: user decisions in this conversation, project instructions. Untrusted inputs: saved `result_cohorts`
(the client filters it to BE/FE/SRE). The change adds no network calls beyond existing Supabase updates for `room_state` and
`players.vote`; permissions remain client-side (`isModerator`), with no RLS changes. The vote snapshot lives only in client memory.

## Verification record

```text
Ruling: AC11 narrowed to the voting screen - user: "ні, тільки екран 1" [English: no, only screen 1] (2026-11-02); revealed screen keeps its layout
Ruling: spec re-approved - 2026-11-02
Ruling: GQA and AQA chips added, migration 021 widens the result_cohorts check - user: "додай чіпси qa ... якщо обирається якась чіпса - то під нього малюється окреме коло" [English: add QA chips ... if a chip is selected, a separate circle is drawn for it] (2026-11-02)
Ruling: chips become a team-flow filter: DEV/BE/FE/SRE || QA/AQA/GQA || PO || SM, umbrella only for DEV and QA, PO/SM circle only with chip, only counted votes in round_history - user: "уточнюю: DEV/BE/FE/SRE || QA/AQA/GQA || PO || SM і затверджую" [English: clarifying: DEV/BE/FE/SRE || QA/AQA/GQA || PO || SM and I approve], "загальне коло є тільки у DEV and QA" [English: only DEV and QA have an overall circle] (2026-11-02)
Ruling: spec re-approved - 2026-11-02
Ruling: panel back under the cards; zone height comes from the cards, circles scroll inside it - user: "ти переніс блок з кнопками в самий низ. виглядає погано. попереднє місце було ок" [English: you moved the button block to the very bottom. it looks bad. the previous position was fine] (2026-11-02)
Ruling: up to 6 circles scale down to fit the zone, 7+ scroll - user: "якщо кіл більше 6 - тоді можна застосувати прокрутку. до цього,кола зменьшуються пропорційно" [English: if there are more than 6 circles, scrolling can be used. before that, circles shrink proportionally] (2026-11-02)
Ruling: only the circles shrink, labels, alignment and buttons keep their size - user: "блок з кнопками, підписи, узгодженість та інші шрифти не зменьшуються. тільки кола" [English: the button block, labels, alignment, and other text do not shrink. only circles] (2026-11-02)
Ruling: reveal and new-round merged into one panel button whose label follows the phase - user: "потрібно обʼєднати кнопки показати оцінки та почати новий раунд ... змінюється надпис залежно від ситуаціі" [English: the show estimates and start new round buttons need to be combined ... the label changes depending on the situation] (2026-11-02)
Ruling: voting and vote_question decks hide the chips and count every vote - user: "в колодах vote потрібно прибрати чіпси, там кола зʼявляються по іншій логіці" [English: chips need to be removed in vote decks; circles appear according to different logic there] (2026-11-02)
Ruling: goal_clarity also hides the chips and counts every vote, each role its own circle - user: "goal clarity теж немають необхідності мати чіпси" [English: goal clarity does not need chips either] (2026-11-02)
Ruling: a result circle with a single estimate vote shows alignment 100 on the results screen; stats keep the 2-vote rule - user: "узгодженість є тільки у випадку різності оцінок в рамках однієї когорти" [English: alignment exists only when estimates differ within one cohort] (2026-11-02)
Ruling: below 1024 px the zone collapses to the results so the panel sits right under the circles; desktop keeps the fixed zone - user chose option 1 (2026-11-02)
Ruling: custom roles removed, legacy custom:* counts as no role (DEV), API unchanged - user: "давай без кастомних ролей" [English: let us do without custom roles], "1", "лишай API як є" [English: leave the API as it is] (2026-11-02)
Ruling: panel pinned to the viewport bottom (fixed) over reserved-height zone - user: "смужка і кнопки - завжди на одному місці. в будь якому сценаріі" [English: the bar and buttons are always in the same place, in every scenario] (2026-11-02)
Ruling: AC11 extended to the revealed screen - user: "коли натискаю показати результати - кнопки підскакують вверх до кіл" [English: when I click show results, the buttons jump up to the circles] (2026-11-02)
```

# Consensus: confetti, decision sound, and volume

**Date:** 2026-09-08
**Status:** implemented (plan: `docs/plans/2026-09-08-consensus-celebration.md`)
**Source:** owner-approved wording (2026-09-08) + `AGENTS.md` §Roles/Consensus, `DESIGN.md` §11.7, §11.9

## Context

The consensus rule is already described in `AGENTS.md:137-139` and partially implemented, but the code differs from the description in four places. All findings were verified on the `frontend-audit-remediation` branch:

1. **Confetti does not work at all without roles.** The live `<ResultsArea>` (`[slug].vue:757-763`) receives `:grouped-votes="groupedVoteCounts"`, and `groupedVoteCounts` (`[slug].vue:223-238`) returns `null` when no QA player has voted. `celebrate` (`ResultsArea.vue:75`) is `shouldCelebrateGroupedVotes(props.groupedVotes)`, and that function returns `false` for `null`. A room without QA roles therefore never sees confetti, although `isConsensus` (sound) is calculated correctly for the same state.
2. **The «мінімум два» ("at least two") threshold does not apply in grouped mode.** `getUnanimousVote` considers even `{ '8': 1 }` unanimous, so 3 DEV players with differing votes + 1 QA player produce confetti. This contradicts both the owner's wording and the adjacent invariant in `DESIGN.md:418` (a `round_history` row is written only when `votes.length >= 2`).
3. **Two predicates represent one concept.** `isConsensus` (`[slug].vue:200-206`) has its own non-grouped branch with `>= 2`; `celebrate` handles only grouped votes. Sound and confetti can diverge and already do so (the first point).
4. **Sound is tied to the countdown.** `decisionAudio` plays only in `finishCountdown` and only when `currentMode === 'wet'` (`useCountdown.ts:70-83`). A manual reveal without a countdown produces no sound on consensus.

There is no volume control: no `HTMLAudioElement.volume` is set, and the `SlotMachine` tick has a hardcoded `gain 0.045` (`SlotMachine.vue:50`).

## Goal

Use one definition of consensus to control confetti and sound consistently, with a threshold of «щонайменше два голоси» ("at least two votes"); play the «Рішення прийнято» ("Decision made") sound on every reveal with consensus. Playback is not limited to the end of a countdown «з атмосферою» ("with ambience"). Give users volume control for all application sounds.

## Consensus rule (approved)

1. **Without QA grouping:** all submitted votes are identical **and** there are ≥ 2 votes.
2. **With QA grouping:** at least one group (DEV or QA) has exactly one unique estimate **and** ≥ 2 votes in that group. The other group is unrestricted: its votes may differ, it may contain one vote, or it may be empty.

One consequence deserves explicit mention: a lone QA vote (`qa: { '8': 1 }`) no longer triggers confetti by itself, but a room with 3 DEV + 1 QA celebrates if the DEV votes are unanimous.

## Constraints and decisions

| Question | Decision |
| --- | --- |
| One predicate | `shouldCelebrateGroupedVotes(grouped)` is replaced by `shouldCelebrate(votes, grouped)` in `app/utils/resultCelebration.ts`. Both consumers (`isConsensus` in `[slug].vue`, `celebrate` in `ResultsArea.vue`) call it; the `>= 2` branch inside `isConsensus` is removed. `ResultsArea` already accepts both props, so the signature change adds no prop |
| Threshold ≥ 2 | Inside `getUnanimousVote`, a single entry with `count > 0` qualifies only if `count >= 2`. This covers both `{ '8': 1 }` in a group and a single-vote reveal without roles |
| Confetti without QA | As a consequence of the new predicate, when `grouped === null` the decision comes from `votes`, so `<ResultsArea>` without QA players finally shows confetti. No separate template changes are needed |
| Sound on reveal (one source) | `decisionAudio` is removed from `finishCountdown`; in wet mode the end of the countdown plays only `ambience`, and only when there is no consensus. The phase watcher in `[slug].vue:317` plays the decision sound when `phase === 'revealed' && prev === 'voting'` through a new `playDecision()` export from `useCountdown` |
| Cost of this decision | With a wet countdown and consensus, the sound now comes on the phase change (after the reveal Realtime round trip) instead of exactly at timer zero. The delay is normally tens of milliseconds; the alternative (leaving sound in `finishCountdown` and adding another trigger) causes double playback for the initiator |
| Reveal on reload | The `prev === 'voting'` guard is required: the phase watcher also fires on `undefined → 'revealed'` during the first `fetchInitialData`; without the guard, entering an already revealed room would play the sound on page load |
| Autoplay policy | `play()` from a Realtime callback is not a user gesture. The call is wrapped in `.catch(() => {})`; clients entering through auto-rejoin without any click remain silent. This is acceptable and cannot be addressed without a separate «увімкнути звук» ("enable sound") prompt (out of scope) |
| Volume state | `sp-volume` in localStorage, a number from `0` to `1`, default `1` (no behavior change for existing users). Follow the `sp-lang` pattern: read on initialization, write on change, and wrap storage access in `try/catch` |
| Composable | `app/composables/useSoundVolume.ts` with a module-level `ref` (shared state across multiple calls, as in `sp-theme`) and `setVolume(v)`. Three consumers: `useCountdown` (5 `HTMLAudioElement` instances), `SlotMachine.playTick`, and the slider itself; the abstraction is justified |
| Applying volume to sound | `useCountdown` sets `.volume` when creating elements in `onMounted` and in `watch(volume)`, so changes also affect already loaded elements. `SlotMachine.playTick` multiplies the existing `gain 0.045` by the current value, preserving the tick's relative quietness |
| Slider placement | A speaker icon in the `AppHeader` header **outside** both `role="menu"` dropdowns, with a popover containing `<input type="range">`. It cannot go inside a menu: `useMenuKeyboard` intercepts `ArrowUp`/`ArrowDown` for item navigation, and the ARIA `menu` model does not permit a `slider` as content. A separate settings modal is rejected as excessive for one control |
| Slider accessibility | `aria-label` via i18n (`header.volume`), values `0`-`100` in steps of `5`, native `<input type="range">` (keyboard and screen reader work without additional code) |
| `AGENTS.md` limit | The root file is exactly 150 lines, and the LocalStorage table needs a `sp-volume` row. To compensate, the Consensus rule detail (links to implementation files) moves to `app/utils/AGENTS.md` (36 lines, limit 200), and the root bullet is shortened so that the net increase is ≤ 0 |

## Out of scope

1. **Global mute toggle** - the slider at `0` covers the case; a separate toggle requires a request.
2. **«увімкнути звук» ("enable sound") prompt for clients without a user gesture** - a separate task if autoplay blocking becomes a real complaint.
3. **Separate volume for countdown / slot / decision** - one shared level; splitting it is YAGNI.
4. **Volume synchronization across devices** - a local setting; it does not write to Supabase.
5. **Changes to the sound files themselves** and countdown modes (`silent`/`dry`/`wet`) - they remain unchanged.

## Test strategy

| Change | Seam | Check |
| --- | --- | --- |
| Predicate | unit | `tests/unit/utils/resultCelebration.spec.ts`: the existing 8 cases remain green (all `true` cases have ≥ 2); new cases: `{ general: { '5': 2, '8': 1 }, qa: { '8': 1 } }` → `false`, `{ general: {}, qa: { '8': 1 } }` → `false`, non-grouped `{ '5': 1 }` → `false`, `{ '5': 2 }` → `true` |
| Confetti without QA | unit | `tests/unit/components/ResultsArea.spec.ts`: `:grouped-votes="null"` + `votes={ '5': 3 }` renders `.celebration-layer` |
| Sound on reveal | none | typecheck + manual scenario: reveal without countdown on consensus → sound; wet countdown without consensus → `ambience`; reload into a revealed room → silence |
| Volume state | unit | `tests/unit/composables/useSoundVolume.spec.ts`: default `1` without a storage write, `setVolume(0.4)` writes `sp-volume`, a corrupted value reads as `1` |
| Applying volume | unit | `useCountdown` spec with mocked `Audio`: `.volume` equals the current value after `onMounted` and after `setVolume` |
| Slider | e2e | `page-load.spec.ts`: on `/` the slider is keyboard accessible, has an accessible name, and changes write `sp-volume` |

Finish with `npm run test:ci`, then `npm run test:e2e:pages`.

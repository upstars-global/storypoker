# E2E coverage beyond smoke

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-05-15
4. Last reviewed: 2026-07-17
5. Related: [spec](../superpowers/specs/2026-05-15-playwright-e2e-tests-design.md)

## Why

The smoke pack (home → create, solo vote → reveal → new round, signup / login)
works, but the main multiplayer scenarios are not covered.

## Expected outcome

E2E covers scenarios that cannot be verified by unit tests: multiple browser
contexts, presence, and realtime.

## Scope

1. Multi-user vote (2 contexts: moderator + player → reveal).
2. Presence (offline, visibility-hidden untrack, reconnect reconciliation).
3. Kick / rename player (self + authorized moderator).
4. Configure Card Deck (preset switch + custom subset, votes are preserved).
5. Timer (start / pause / resume / reset / ±30s, moderator-gating).
6. Round history (votes ≥ 2 → record, view in UI).
7. Slot machine (3 spins per round, jackpot broadcast, `SlotWinBanner`).
8. Alignment trends modal + Recent Rooms alignment column.
9. Password reset flow, room slug aliases, RLS edge cases.

## Dependencies

1. [Dedicated test Supabase project](e2e-test-supabase-project.md).

## Completion criteria

1. The listed scenarios have stable specifications in `tests/e2e/`.

## Next step

Multi-user vote offers the most value for the least cost after the test project.

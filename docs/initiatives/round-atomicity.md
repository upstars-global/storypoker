# Round atomicity

1. Status: Planned
2. Priority: P0
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-07-17

## Why

`reveal()`, `startNewRound()`, and room creation in `app/stores/room.ts` use separate,
non-transactional requests. Two moderators can write two snapshots of the same round;
room creation can leave `rooms` without `room_state`.

## Expected outcome

The round lifecycle and room creation each run in a single transaction with optimistic
concurrency, and the database itself enforces the invariants.

## Scope

1. Postgres RPCs `create_room()`, `reveal_round(expected_started_at)`, and
   `start_new_round()` with transactions.
2. Database constraints on `phase`, `deck_preset`, field lengths, and `room_id NOT NULL`.

## Completion criteria

1. Repeating `reveal` for the same round does not create a second `round_history` record.
2. Room creation either succeeds completely or leaves no orphaned rows.

## Status

1. 2026-10-26: The duplicate snapshot was addressed on the client without a schema change:
   `reveal()` writes `round_history` only when its `update ... where phase <> 'revealed'`
   changed a row. Remaining: update and insert are not one transaction (insert can fail
   after reveal), reveal with a stale `round_started_at`, room creation, and `startNewRound()`.

## Next step

Describe the RPC signatures and conflict behavior for `expected_started_at`.

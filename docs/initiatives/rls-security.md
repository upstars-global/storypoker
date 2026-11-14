# RLS and mutation authorization

1. Status: Planned
2. Priority: P0
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-07-17

## Why

All policies are `using (true)` / `with check (true)` (migrations `001`, `002`, `005`).
With the anon key in the bundle, anyone can change another user's vote or profile,
self-promote to moderator, take over a slug, rewrite `room_state`, and read all
`round_history` and `user_profiles` globally.

## Expected outcome

Write access is restricted to the room context and the record owner; moderator actions
run through controlled server-side procedures rather than from the client.

## Scope

1. Restrict write policies by `room_id`.
2. Allow writes to `user_profiles` only when `auth.uid() = user_id`.
3. Move moderator mutations into security-definer RPCs.

## Completion criteria

1. No policy retains `using (true)` for writes.
2. A client with the anon key cannot change another user's vote, profile, or `room_state`.
3. Moderator actions go through RPCs with permission checks.

## Next step

Prepare a table × operation × allowed condition matrix before writing the migration.

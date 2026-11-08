# Zustand stores

Zustand stores live in `app/stores/`: use `useXStore.getState()` for actions and state, and `useXStore(selector)` in
components. `players.visiblePlayers` is a field that `subscribe` recalculates on every change to `players`. Tests reset
state with `resetStores()` from `tests/support/helpers/resetStores.ts`; it does not reset the module-level
`initialization` (the shared `init()` promise) in `auth.ts` or `inflight` (the Map of in-flight requests) in `profiles.ts`.

1. `auth.ts` - Supabase session, sign in/up/out, password reset/update
2. `room.ts` - room state, create, reveal, new round, deck, resolve, room name/slug
3. `players.ts` - players, optimistic votes, join/rejoin, rename, moderator toggle, set shields, kick/leave, link user
4. `presence.ts` - online `Set<playerId>` via Supabase Presence; on `visibilitychange → hidden`, closes the channel only
   after `AWAY_TIMEOUT_MS` (5 minutes); returning earlier cancels the timer
5. `profiles.ts` - `user_profiles` cache, fetch/upsert, Realtime applyChange
6. `types.ts` - shared TS interfaces (`Player`, `RoomState`, `RoundHistory`, `RoundHistoryVote`, `ConnectionStatus`);
   `UserProfile` lives in `profiles.ts`

`room.restoreVotes()` first writes the snapshot votes, then clears the other players in the room: undo is a full rollback,
and a vote cast after reset also disappears. This is an accepted compromise by owner decision (specification
`docs/specs/2026-11-02-room-controls-cohort-chips-design.md`, decision 3), not a defect for review.

The Supabase client access invariant (`getSupabase()`/`initSupabase()`/`setSupabase(mock)`) is in `app/AGENTS.md`.

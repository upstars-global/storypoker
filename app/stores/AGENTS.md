# Pinia stores

Pinia stores у `app/stores/`:

- `auth.ts` - Supabase session, sign in/up/out, password reset/update
- `room.ts` - room state, create, reveal, new round, deck, resolve, room name/slug
- `players.ts` - players, optimistic votes, join/rejoin, rename, moderator toggle, set shields, kick/leave, link user
- `presence.ts` - online `Set<playerId>` через Supabase Presence; на `visibilitychange → hidden` закриває канал лише
  через `AWAY_TIMEOUT_MS` (5 хв), повернення раніше - скасовує таймер
- `profiles.ts` - `user_profiles` cache, fetch/upsert, Realtime applyChange
- `types.ts` - спільні TS interfaces (`Player`, `RoomState`, `RoundHistory`, `RoundHistoryVote`, `ConnectionStatus`);
  `UserProfile` живе в `profiles.ts`

Stores беруть клієнт через `getSupabase()` з `app/lib/supabase-instance.ts`; `app/main.ts` ініціалізує клієнт через
`initSupabase()`. Тести інжектять mock через `setSupabase(mock)`.


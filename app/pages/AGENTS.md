# Pages - routing and Realtime

## Realtime

`app/pages/[slug].tsx` subscribes in `useEffect` to:

1. `players:<roomId>` → `playersStore.applyChange`
2. `room_state:<roomId>` → `roomStore.applyChange`
3. `rooms:<roomId>` → sync `slug/name/background_*`, redirect between id and slug; the background is an inline `background-image` on the root
4. `user_profiles:<roomId>` → `profilesStore.applyChange`
5. `room:<roomId>` Presence → online players
6. `countdown:<roomId>` broadcast (`self:true`) → synchronized countdown before reveal; the initiator calls `reveal()`.
   Hold-to-start UI (silent/dry/wet, `app/hooks/useCountdown.ts`) - `DESIGN.md` §11.6

Channel callbacks outlive a render: they read fresh values (`isConsensus`, `navigate`, `startCountdown`) from the
`live` ref, which is updated after each render; render variables captured in closures would become stale.

After `'reconnecting' → 'online'` (a Presence channel status transition), a reconciliation refetch runs. In addition,
`document.visibilitychange → visible` triggers `fetchInitialData()` regardless of presence status - Supabase
Realtime does not replay `postgres_changes` missed during a disconnection (a backgrounded tab/app or a brief
network failure), and that interruption does not always appear as 'reconnecting' on the presence channel. An optimistic
vote is written to `pendingVotes[playerId]`; success/realtime ACK clears the entry, and an error rolls it back.

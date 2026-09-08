# Pages - маршрути й Realtime

## Realtime


`app/pages/[slug].vue` підписується на:

- `players:<roomId>` → `playersStore.applyChange`
- `room_state:<roomId>` → `roomStore.applyChange`
- `rooms:<roomId>` → sync `slug/name`, redirect між id і slug
- `user_profiles:<roomId>` → `profilesStore.applyChange`
- `room:<roomId>` Presence → online players
- `countdown:<roomId>` broadcast (`self:true`) → синхронний відлік перед reveal; initiator викликає `reveal()`.
  Hold-to-start UI (silent/dry/wet, `useCountdown.ts`) - `DESIGN.md` §11.6

Після `'reconnecting' → 'online'` (перехід статусу Presence-каналу) виконується reconciliation refetch. Додатково
`document.visibilitychange → visible` теж тригерить `fetchInitialData()` незалежно від presence-статусу - Supabase
Realtime не переграє `postgres_changes`, пропущені під час розриву з'єднання (згорнута вкладка/додаток, короткий
мережевий збій), і цей розрив не завжди проявляється як 'reconnecting' у presence-каналі. Optimistic vote пишеться в
`pendingVotes[playerId]`, success/realtime ACK очищає запис, error робить rollback.


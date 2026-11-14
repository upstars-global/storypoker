# Spec A: Pinia + Realtime Presence

**Date:** 2026-05-04
**Scope:** State management refactor + realtime presence + optimistic vote
**Out of scope:** UI redesign (mobile-first, minimalism) → Spec B

## Problem

Current state:

1. State lives in composables (`useRoom`, `usePlayer`, `useAuth`) with local `ref`s. It is scattered, with no single place to inspect it in DevTools.
2. Realtime via Supabase `postgres_changes` performs a **full refetch** on every event, adding latency and database load.
3. The "Online" status is the `players.is_online` database column, updated via `beforeunload` (unreliable: it often does not fire on mobile).
4. There is no optimistic feedback: a 100-300 ms round trip separates a card click from its actual highlight.
5. There is no connection loss indicator, so the UI simply freezes.

## Goals

1. A card vote appears **instantly** for the current player.
2. Closing the tab/app on mobile → others see you offline within ≤ 1 sec (without stale `is_online`).
3. Temporary network loss → "Reconnecting…" banner + automatic subscription recovery without losing playerId.
4. Realtime events are applied differentially (without a full refetch).
5. One source of truth for presence (Supabase Presence channel, not a database column).

## Non-goals

1. Typing indicators and "думає" ("thinking") animations during voting.
2. Optimistic updates for actions other than cast vote (rename/kick/reveal/start round/save deck wait for ACK).
3. Store persistence via `pinia-plugin-persistedstate` (the current manual localStorage is sufficient).
4. E2E tests.
5. Any UI changes other than the new `ConnectionBanner`; UI redesign goes into Spec B.

## Architecture

### Stores (Pinia)

```
app/stores/
├── auth.ts          # session, user, signIn/signUp/signOut
├── room.ts          # rooms, room_state (phase, active_cards, round_started_at)
├── players.ts       # players[], mutations (vote, rename, kick, leave, toggleModerator)
└── presence.ts      # connection status, online[], visibility, reconnect
```

**Principles:**

1. Each store is one domain unit. Cross-store mutations are forbidden; use exported getters only.
2. The `useRoom`/`usePlayer`/`useAuth` composables are removed completely; stores absorb their logic.
3. Plugins (`supabase`, `vWave`, `clickOutside`) remain.
4. The `[slug].vue` page becomes thin: `onMounted` only calls `roomStore.init(slug)` + `presenceStore.start(slug, playerId)`. Reactive data comes through `storeToRefs`.
5. `playersStore` depends on `presenceStore` for derived `isOnline(playerId)`. `presenceStore` knows nothing about `players`; it only has a `Set<playerId>`.

### Dependencies

1. `pinia` (latest stable, compatible with Nuxt 4)
2. `@pinia/nuxt` (latest)
3. No `pinia-plugin-persistedstate`.

### DB migration

`supabase/migrations/002_drop_is_online.sql`:
```sql
alter table players drop column is_online;
```

`left_at` remains; it represents a separate "Leave room" action, not presence.

## Presence model

### States

```ts
type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'
```

### Signals → transitions

| Event | Transition |
|---|---|
| `roomStore.init()` starts channels | `→ connecting` |
| Channel `subscribed` + presence sync received | `→ online` |
| `document.visibilitychange` → `hidden` | `→ offline` (explicit `untrack` + `unsubscribe`) |
| `document.visibilitychange` → `visible` | `→ connecting` (re-subscribe + track) |
| Supabase channel `error` / `closed` without an explicit leave | `→ reconnecting` |
| Reconnect succeeds | `→ online` |
| `window 'offline'` event | `→ reconnecting` |

### Supabase Presence

1. One channel per room: `room:<roomId>`
2. On join: `channel.track({ playerId })`
3. `presenceStore.online: Set<playerId>` updates on presence events (`sync`/`join`/`leave`)
4. On visibility=hidden, aggressively `untrack` + `unsubscribe` (do not wait for timeout, so others see offline immediately)

### Reconnect banner

1. Global `<ConnectionBanner />` in `app.vue`
2. Height 32px, `position: fixed; top: 0`, visible only when `status === 'reconnecting'`
3. Text: "Reconnecting…" + spinner. No actions
4. Hidden on `'offline'` (explicit backgrounding via visibility), since this is normal behavior on mobile

### Mobile nuance

iOS Safari freezes a tab after ~30 sec in the background. The visibility handler has time to `untrack` before the freeze, so other players see us disappear immediately.

## Optimistic vote flow

### State in `playersStore`

```ts
players: Player[]                      // server state
pendingVotes: Map<playerId, string>    // optimistic overlay for current user only
```

### Getter

```ts
voteOf(playerId): string | null
  // pendingVotes.get(playerId) ?? players.find(...)?.vote ?? null
```

The UI reads `voteOf(currentPlayerId)` and sees the vote immediately.

### Action `castVote(playerId, card)`

1. `pendingVotes.set(playerId, card)` - the UI highlights immediately
2. `await supabase.from('players').update({ vote: card }).eq('id', playerId)`
3. **Success or realtime event with `vote === card`** → `pendingVotes.delete(playerId)`
4. **Error** → `pendingVotes.delete(playerId)` + toast "Failed to save vote, try again". The UI returns to server state.

### Reconciliation

On an UPDATE via realtime: if `players[id].vote === pendingVotes.get(id)`, clear the pending vote.

### Race conditions

1. Rapid clicks 0.5 → 1 → 5: each `castVote` sets a new pending vote + sends an UPDATE. The server executes them in order; the last wins. The UI shows the latest pending vote.
2. Reveal between optimistic set and ACK: the pending vote is irrelevant; a watcher on `roomStore.phase === 'revealed'` clears the map.

### Why only for the current user

Optimistic updates for others do not make sense because their votes are unknown. A realtime event arrives with a payload (~100-200 ms), which is fast enough.

## Realtime differential updates

### Before

```ts
.on('postgres_changes', { event: '*', table: 'players', ... },
    async () => {
      const { data } = await supabase.from('players').select('*')...
      players.value = data
    })
```

### After

```ts
.on('postgres_changes', { event: '*', table: 'players', filter: `room_id=eq.${roomId}` },
    (payload) => playersStore.applyChange(payload))
```

### `playersStore.applyChange(payload)`

```ts
function applyChange(payload: RealtimePostgresChangesPayload<Player>) {
  switch (payload.eventType) {
    case 'INSERT':
      if (!players.find(p => p.id === payload.new.id)) players.push(payload.new)
      break
    case 'UPDATE':
      const idx = players.findIndex(p => p.id === payload.new.id)
      if (idx >= 0) players[idx] = payload.new
      if (pendingVotes.get(payload.new.id) === payload.new.vote) {
        pendingVotes.delete(payload.new.id)
      }
      break
    case 'DELETE':
      players = players.filter(p => p.id !== payload.old.id)
      break
  }
}
```

Note: a DELETE event arrives only on kick (hard delete). Leave room is an UPDATE with `left_at`.

Likewise, `roomStore.applyChange(payload)` handles `room_state`.

### Initial load

`roomStore.init(slug)` performs **one** parallel select from three tables. After that, only deltas.

### Soft-delete

On UPDATE with `left_at != null`, `playersStore` marks `players[idx].left_at`, and the `visiblePlayers` getter filters for `is null`. Do not remove the player from the array (prevents index-flickering).

### Reconciliation refetch

After `'reconnecting' → 'online'`, perform a one-time full select (events may have been missed between disconnect and resubscribe). Only in this case.

## File changes

| Action | Files |
|---|---|
| Create | `app/stores/auth.ts`, `room.ts`, `players.ts`, `presence.ts` |
| Create | `app/components/ConnectionBanner.vue` |
| Create | `supabase/migrations/002_drop_is_online.sql` |
| Create | `app/stores/__tests__/players.spec.ts`, `presence.spec.ts` |
| Delete | `app/composables/useRoom.ts`, `usePlayer.ts`, `useAuth.ts` |
| Update | `app/pages/[slug].vue` (thin wrapper around stores) |
| Update | `app/pages/index.vue` (auth+room via stores) |
| Update | components that read composables move to `useXxxStore()` + `storeToRefs` |
| Update | `app/app.vue` - add `<ConnectionBanner />` |
| Update | `nuxt.config.ts` - add `'@pinia/nuxt'` to `modules` |
| Update | `package.json` - `pinia`, `@pinia/nuxt`, `vitest` (dev) |
| Update | `CLAUDE.md` - new State Management section |

## Testing

Vitest, unit tests in `app/stores/__tests__/`:

1. `playersStore.applyChange()` - INSERT/UPDATE/DELETE/soft-delete
2. `playersStore.castVote()` - optimistic flow + rollback on error + reconciliation with realtime
3. `presenceStore` - state transitions on visibility/network events (mocks for `document.visibilityState`, `navigator.onLine`, fake supabase channel)
4. `roomStore.applyChange()` - phase transitions, active_cards updates

E2E is outside this spec.

## Acceptance criteria

1. A card vote appears instantly for the voter (without waiting for the server).
2. Closing a tab on mobile → others see offline within ≤ 1 sec.
3. Returning to the tab → automatic rejoin without losing playerId.
4. Temporary network loss → "Reconnecting…" banner + auto-reconnect.
5. The `is_online` column is removed; "online" is derived from presence.
6. Realtime events do not trigger refetch (only initial + post-reconnect reconciliation).
7. Old composables are removed, and components consume stores.
8. Vitest suite is green.

## Risks

1. **Supabase Presence quota:** the free tier limits concurrent connections; there is ample headroom for small teams (≤ 50 rooms × ≤ 10 players).
2. **iOS Safari tab freezing** before the visibility handler can `untrack`: unlikely because the handler is synchronous; as a fallback, Supabase itself will remove the player via server-side timeout (~30 sec), with a delay.
3. **Pinia + SSR:** Nuxt in SSG/SSR mode - Pinia works out of the box via `@pinia/nuxt`, but verify that stores are not initialized server-side with window-dependent code (visibility, navigator). Guard with `if (import.meta.client)` in `presenceStore.start()`.

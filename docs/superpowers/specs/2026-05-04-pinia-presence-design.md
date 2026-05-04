# Spec A: Pinia + Realtime Presence

**Date:** 2026-05-04
**Scope:** State management refactor + realtime presence + optimistic vote
**Out of scope:** UI redesign (mobile-first, минімалізм) → Spec B

## Problem

Поточний стан:
- Стан тримається у композаблах (`useRoom`, `usePlayer`, `useAuth`) з локальними `ref`. Розкидано, без єдиного DevTools-візиту.
- Realtime через Supabase `postgres_changes` робить **повний refetch** на будь-яку подію — зайва латенсі та БД-навантаження.
- "Online" статус — `players.is_online` колонка в БД, оновлюється через `beforeunload` (ненадійно: на mobile часто не спрацьовує).
- Немає optimistic feedback: між кліком по карті і реальним підсвічуванням — 100–300 мс round-trip.
- Немає індикатора втрати з'єднання — UI просто застигає.

## Goals

1. Голос за карту відображається у поточного гравця **миттєво**.
2. Закриття вкладки/застосунку на mobile → інші бачать тебе offline ≤ 1 сек (без stale `is_online`).
3. Тимчасова втрата мережі → банер "Reconnecting…" + автоматичне відновлення підписок без втрати playerId.
4. Realtime події застосовуються диференційно (без full refetch).
5. Єдине джерело істини для presence (Supabase Presence channel, не БД-колонка).

## Non-goals

- Typing indicators, "думає" анімації при voting.
- Optimistic для дій крім cast vote (rename/kick/reveal/start round/save deck чекають ACK).
- Persistence stores через `pinia-plugin-persistedstate` (поточний ручний localStorage — достатньо).
- E2E тести.
- Будь-які UI-зміни крім нового `ConnectionBanner` — UI-редизайн іде у Spec B.

## Architecture

### Stores (Pinia)

```
app/stores/
├── auth.ts          # session, user, signIn/signUp/signOut
├── room.ts          # rooms, room_state (phase, active_cards, round_started_at)
├── players.ts       # players[], мутації (vote, rename, kick, leave, toggleModerator)
└── presence.ts      # connection status, online[], visibility, reconnect
```

**Принципи:**
- Кожен store — одна доменна одиниця. Cross-store mutations заборонені — тільки експортовані getters.
- Композаблі `useRoom`/`usePlayer`/`useAuth` видаляються повністю; логіку поглинають stores.
- Plugins (`supabase`, `vWave`, `clickOutside`) лишаються.
- Сторінка `[slug].vue` стає тонкою: `onMounted` лише `roomStore.init(slug)` + `presenceStore.start(slug, playerId)`. Реактивні дані через `storeToRefs`.
- `playersStore` залежить від `presenceStore` для derived `isOnline(playerId)`. `presenceStore` нічого не знає про `players` — лише `Set<playerId>`.

### Залежності

- `pinia` (latest stable, сумісний з Nuxt 4)
- `@pinia/nuxt` (latest)
- Без `pinia-plugin-persistedstate`.

### DB міграція

`supabase/migrations/002_drop_is_online.sql`:
```sql
alter table players drop column is_online;
```

`left_at` лишається — це окрема дія "Leave room", не presence.

## Presence model

### Стани

```ts
type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'
```

### Сигнали → переходи

| Подія | Перехід |
|---|---|
| `roomStore.init()` стартує канали | `→ connecting` |
| Канал `subscribed` + presence sync прийшов | `→ online` |
| `document.visibilitychange` → `hidden` | `→ offline` (явний `untrack` + `unsubscribe`) |
| `document.visibilitychange` → `visible` | `→ connecting` (re-subscribe + track) |
| Supabase channel `error` / `closed` без явного leave | `→ reconnecting` |
| Reconnect успіх | `→ online` |
| `window 'offline'` event | `→ reconnecting` |

### Supabase Presence

- Один канал на кімнату: `room:<roomId>`
- На join: `channel.track({ playerId })`
- `presenceStore.online: Set<playerId>` оновлюється на presence events (`sync`/`join`/`leave`)
- При visibility=hidden — агресивний `untrack` + `unsubscribe` (не чекаємо timeout, щоб інші побачили offline миттєво)

### Reconnect-банер

- Глобальний `<ConnectionBanner />` у `app.vue`
- Висота 32px, `position: fixed; top: 0`, видимий лише при `status === 'reconnecting'`
- Текст: "Reconnecting…" + spinner. Без actions
- При `'offline'` (явний background через visibility) — прихований, бо це нормальна поведінка для mobile

### Mobile-нюанс

iOS Safari морозить таб через ~30 сек у бекграунді. visibility-handler встигає `untrack` до заморозки, тож для інших гравців ми зникаємо одразу.

## Optimistic vote flow

### State у `playersStore`

```ts
players: Player[]                      // server state
pendingVotes: Map<playerId, string>    // optimistic overlay для current user only
```

### Геттер

```ts
voteOf(playerId): string | null
  // pendingVotes.get(playerId) ?? players.find(...)?.vote ?? null
```

UI читає `voteOf(currentPlayerId)` — бачить голос миттєво.

### Action `castVote(playerId, card)`

1. `pendingVotes.set(playerId, card)` — UI підсвічує одразу
2. `await supabase.from('players').update({ vote: card }).eq('id', playerId)`
3. **Success або realtime event з `vote === card`** → `pendingVotes.delete(playerId)`
4. **Error** → `pendingVotes.delete(playerId)` + toast "Failed to save vote, try again". UI повертається до серверного стану.

### Реконсиляція

При UPDATE через realtime: якщо `players[id].vote === pendingVotes.get(id)` — pending чиститься.

### Race conditions

- Швидкі кліки 0.5 → 1 → 5: кожен `castVote` ставить новий pending + посилає UPDATE. Сервер виконує по черзі, останній перемагає. UI показує найсвіжіший pending.
- Reveal між optimistic set і ACK: pending не релевантний, watcher на `roomStore.phase === 'revealed'` чистить map.

### Чому тільки для current user

Оптимізм для інших не має сенсу — невідомо, як вони проголосують. Realtime подія прийде з payload (~100–200 ms) — достатньо швидко.

## Realtime differential updates

### Було

```ts
.on('postgres_changes', { event: '*', table: 'players', ... },
    async () => {
      const { data } = await supabase.from('players').select('*')...
      players.value = data
    })
```

### Стало

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

Примітка: DELETE event надходить лише при kick (hard delete). Leave room — це UPDATE з `left_at`.

Аналогічно `roomStore.applyChange(payload)` для `room_state`.

### Initial load

`roomStore.init(slug)` робить **один** паралельний select з трьох таблиць. Після — лише deltas.

### Soft-delete

UPDATE з `left_at != null` — `playersStore` маркує `players[idx].left_at`, геттер `visiblePlayers` фільтрує `is null`. Не видаляємо з масиву (запобігає index-flickering).

### Reconciliation refetch

Після `'reconnecting' → 'online'` — одноразовий повний select (могли пропустити events між disconnect і resubscribe). Тільки в цьому випадку.

## Файлові зміни

| Дія | Файли |
|---|---|
| Створити | `app/stores/auth.ts`, `room.ts`, `players.ts`, `presence.ts` |
| Створити | `app/components/ConnectionBanner.vue` |
| Створити | `supabase/migrations/002_drop_is_online.sql` |
| Створити | `app/stores/__tests__/players.spec.ts`, `presence.spec.ts` |
| Видалити | `app/composables/useRoom.ts`, `usePlayer.ts`, `useAuth.ts` |
| Оновити | `app/pages/[slug].vue` (тонкий wrapper навколо stores) |
| Оновити | `app/pages/index.vue` (auth+room через stores) |
| Оновити | компоненти, що читали композаблі — переходять на `useXxxStore()` + `storeToRefs` |
| Оновити | `app/app.vue` — додати `<ConnectionBanner />` |
| Оновити | `nuxt.config.ts` — додати `'@pinia/nuxt'` у `modules` |
| Оновити | `package.json` — `pinia`, `@pinia/nuxt`, `vitest` (dev) |
| Оновити | `CLAUDE.md` — нова секція State Management |

## Testing

Vitest, юніт-тести у `app/stores/__tests__/`:

- `playersStore.applyChange()` — INSERT/UPDATE/DELETE/soft-delete
- `playersStore.castVote()` — optimistic flow + rollback при помилці + reconciliation з realtime
- `presenceStore` — переходи стану на visibility/network events (моки на `document.visibilityState`, `navigator.onLine`, fake supabase channel)
- `roomStore.applyChange()` — phase transitions, active_cards updates

E2E — поза цією спекою.

## Acceptance criteria

1. Голос за карту відображається у себе миттєво (без чекання сервера).
2. Закриття вкладки на mobile → інші бачать offline ≤ 1 сек.
3. Повернення у вкладку → автоматичний rejoin без втрати playerId.
4. Тимчасова втрата мережі → банер "Reconnecting…" + auto-reconnect.
5. Колонка `is_online` видалена; "online" обчислюється з presence.
6. Realtime події не тригерять refetch (тільки initial + post-reconnect reconciliation).
7. Старі composables видалені, компоненти споживають stores.
8. Vitest suite — green.

## Risks

- **Supabase Presence quota:** на free tier ліміт concurrent connections — для невеликих команд (≤ 50 кімнат × ≤ 10 гравців) запас великий.
- **iOS Safari зморожування таба** до того, як visibility handler встигне `untrack`: малоймовірно, бо handler синхронний; як fallback — Supabase сам викине через server-side timeout (~30 сек), просто з лагом.
- **Pinia + SSR:** Nuxt у SSG/SSR режимі — Pinia працює коробково через `@pinia/nuxt`, але треба перевірити, що stores не ініціалізуються на server-side з window-залежним кодом (visibility, navigator). Захист — guard `if (import.meta.client)` у `presenceStore.start()`.

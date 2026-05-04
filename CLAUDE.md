# CLAUDE.md

Guidance for Claude Code working with this repository.

## Communication
- **Language**: Ukrainian (українська мова)
- **Constraint**: цей файл — ≤ 200 рядків. Деталі продукту — в `DESIGN.md`

## Project Overview

**Story Poker** — інструмент Planning Poker для Agile-команд: створення кімнат, голосування за складність задач картами Scrum scale (1/2, 1, 2, 3, 5, 8, 13, 20, ?, ☕) або кастомним набором з модалки Configure Card Deck, приховане голосування з одночасним розкриттям.

Продуктова специфікація — `DESIGN.md`. Дорожня карта ітерацій — `docs/superpowers/plans/roadmap.md`. Ескізи та HTML-прототипи — `examples/` (gitignored).

## Tech Stack

- **Framework:** Nuxt 4.4 (Vue 3, Composition API `<script setup>`, `srcDir: app/`)
- **Styling:** Tailwind CSS via `@nuxtjs/tailwindcss` 6, кастомні MUI-like класи в `assets/css/main.css`
- **Backend:** Supabase (Postgres + Realtime + Auth)
- **UI:** `@nuxt/icon`, `v-wave`, `@dicebear/core` (аватари), Google Fonts Roboto 300–700
- **Node:** 24+ (engines не запіновано)

## Common Commands

```bash
npm install
npm run dev       # Dev server (port 3000)
npm run build     # Build
npm run generate  # SSG static pre-render
npm run preview   # Preview production build
```

Усі скрипти Nuxt передають `--dotenv .env.local`, бо за замовчуванням Nuxt 4 завантажує лише `.env`. Не перейменовуй скрипти без потреби.

## Environment Setup

Скопіюй `.env.example` → `.env.local` і заповни:

```
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...     # для server-side, наразі не використовується
```

Підв'язано в `nuxt.config.ts` через `runtimeConfig.public`.

## Database

Міграції в `supabase/migrations/`, накатуються вручну через Supabase SQL Editor:
- `001_initial_schema.sql` — базові таблиці + public RLS
- `002_drop_is_online.sql` — видалена колонка (online йде через Presence)
- `003_update_card_deck.sql` — Pass прибрано, 0.5→1/2, 21→20, оновлений default deck

Таблиці:
- `rooms (id text PK)` — кімнати з 8-символьним ID (`app/utils/roomId.ts`)
- `room_state (room_id PK, phase, active_cards[], round_started_at)` — стан раунду
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, left_at)` — учасники (online → Presence)

**RLS:** усі policies — `public` (read/write для anon-ключа). Окремого backend немає, логіка в клієнті.

**Soft-delete:** `leave room` ставить `left_at`, kick — DELETE. Запити фільтрують `left_at is null`.

## State Management

Pinia stores у `app/stores/`:

- **`auth.ts`** — Supabase session + signIn/signUp/signOut
- **`room.ts`** — `room_state` (phase, active_cards), `create()`, `reveal()`, `startNewRound()`, `saveCardDeck()`, `applyChange()`
- **`players.ts`** — `players[]`, `pendingVotes`, optimistic `castVote()`, CRUD (join/rejoin/rename/kick/leave/linkUser/fetchAll), `applyChange()`, `voteOf()`, `clearPendingVotes()`
- **`presence.ts`** — connection status (`connecting`/`online`/`reconnecting`/`offline`), live `online: Set<playerId>` з Supabase Presence, visibility/network handlers

**Store ↔ Supabase:** stores викликають `getSupabase()` з `app/lib/supabase-instance.ts`. Плагін `app/plugins/supabase.ts` робить `setSupabase(client)` один раз. Тести інжектять mock через `setSupabase(mock)`.

## Realtime

Сторінка `[slug].vue` підписується на `postgres_changes` каналами `players:<roomId>`, `room_state:<roomId>`; payload іде у `xxxStore.applyChange(payload)` — диференційне оновлення, без full refetch. Виняток: після `'reconnecting' → 'online'` робимо одноразовий reconciliation refetch. Realtime має бути **увімкнений у Supabase для обох таблиць**.

**Optimistic vote:** `playersStore.castVote()` пише у `pendingVotes[playerId]` миттєво, потім async UPDATE. Success/realtime ACK чистить запис, error — rollback + throw.

**Presence:** колонка `is_online` НЕ існує — online-статус обчислюється з `presenceStore.online`. Visibility hidden → `untrack` + `unsubscribe` (для mobile).

## Project Structure

```
app/
├── app.vue
├── pages/
│   ├── index.vue          # Головна (створення кімнати)
│   └── [slug].vue         # Кімната (URL: /<roomId>, без /room/)
├── components/            # AppHeader, CardsArea, PlayersList, ConnectionBanner, ...
├── composables/           # useTheme, useDylanAvatar (auth/room/players → stores)
├── stores/                # auth, room, players, presence (Pinia) + __tests__/
├── plugins/               # supabase, vWave, clickOutside
├── lib/                   # supabase-instance (singleton getter)
└── utils/                 # roomId, relativeTime, recentRooms
assets/css/main.css        # MUI-like класи (.mui-btn, .mui-paper, ...)
supabase/migrations/       # 001_initial_schema, 002_drop_is_online, 003_update_card_deck
```

## Testing

```bash
npm test          # vitest run
npm run test:watch
```

Юніт-тести stores у `app/stores/__tests__/`. Vanilla Vitest + happy-dom (без Nuxt контексту). Supabase mock через `setSupabase()` з `app/lib/supabase-instance.ts`.

## URL-схема

- `/` — головна
- `/<roomId>` — кімната (top-level catch-all через `pages/[slug].vue`)

⚠️ Будь-який новий top-level роут (`/about`, `/auth`) перетне `[slug].vue` — додавай як іменовану сторінку (`pages/about.vue` має пріоритет) або вводь префікс типу `/r/<id>`.

## LocalStorage

- `storypoker_session_<roomId>` — `{ playerId, playerName, lastVisitedAt }` для авто-rejoin і списку Recent Rooms на головній (`app/utils/recentRooms.ts`)
- `sp-theme` — `'light' | 'dark'`. Застосовується inline-скриптом у `<head>` (`nuxt.config.ts`) до hydration, щоб уникнути flash

## Code Style

- **Без коментарів** — код самодокументується через імена
- 2 пробіли, без табів, файли закінчуються одним `\n`
- TypeScript у composables/utils, `<script setup lang="ts">` у компонентах
- Без зайвих абстракцій (wrappers, що лише перейменовують функції)

## Security

- Ніколи не друкувати секрети чи повні значення env-змінних
- У прикладах — placeholders
- Service role key (`SUPABASE_SECRET_KEY`) — лише на server-side, ніколи у client bundle

## Ролі

- **Гравець** — голосує, перейменовує себе, виходить з кімнати
- **Модератор** — все вище + розкриває карти, стартує новий раунд, кікає, налаштовує колоду карт

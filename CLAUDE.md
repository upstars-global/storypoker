# CLAUDE.md

Guidance for Claude Code working with this repository.

## Communication
- **Language**: Ukrainian (українська мова)
- **Constraint**: цей файл — ≤ 200 рядків. Деталі продукту — в `DESIGN.md`

## Project Overview

**Story Poker** — Planning Poker для Agile-команд: кімнати, голосування за складність задач картами одного з 5 пресетів (Scrum, Fibonacci *, T-Shirt Size, Hours, Boolean) або кастомним підмножиною з модалки Configure Card Deck, приховане голосування з одночасним розкриттям, історія раундів.

Продуктова специфікація — `DESIGN.md`. Дорожня карта — `docs/superpowers/plans/roadmap.md`. Ескізи — `examples/` (gitignored).

## Tech Stack

- **Framework:** Nuxt 4.4 (Vue 3, Composition API `<script setup>`, `srcDir: app/`)
- **Styling:** Tailwind via `@nuxtjs/tailwindcss` 6, MUI-like класи в `assets/css/main.css`
- **Backend:** Supabase (Postgres + Realtime + Auth)
- **UI:** `@nuxt/icon`, `v-wave`, `@dicebear/core` (аватари), Roboto 300–700
- **Node:** 24+

## Common Commands

```bash
npm install
npm run dev       # Dev (port 3000, --host для LAN/мобільних)
npm run build
npm run generate  # SSG static pre-render
npm run preview
npm test          # vitest run
```

Усі скрипти Nuxt передають `--dotenv .env.local` — Nuxt 4 за замовчуванням читає лише `.env`.

## Environment Setup

`.env.example` → `.env.local`:

```
SUPABASE_URL=...
SUPABASE_KEY=...            # publishable (sb_publishable_...) — клієнтський
# SUPABASE_SECRET_KEY=...   # server-side only, наразі не використовується
```

Підв'язано в `nuxt.config.ts` через `runtimeConfig.public`.

## Database

Єдина міграція в `supabase/migrations/001_initial_schema.sql` — накатується вручну через Supabase SQL Editor. Таблиці:

- `rooms (id text PK)` — 8-символьний ID (`app/utils/roomId.ts`)
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at)` — стан раунду
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, created_at)` — snapshot гравців на момент reveal

**RLS:** усі policies — `public` (read/write для anon-ключа). Окремого backend немає, логіка в клієнті.

**Soft-delete:** `leave` і `kick` ставлять `left_at`. Запити фільтрують `left_at is null`.

**Realtime publication** має бути увімкнений для `players` і `room_state`.

## Card Decks

Пресети визначені в коді — `app/utils/cardDecks.ts`:

| id | name | defaultActive |
|---|---|---|
| `scrum` | Scrum | `1/2,1,2,3,5,8,13,20,?,☕` |
| `fibonacci` | Fibonacci * | `1,2,3,5,8,13,21,?,☕` |
| `tshirt` | T-Shirt Size | `S,M,L,XL,?,☕` |
| `hours` | Hours | `1/2h,1h,2h,3h,5h,8h,13h,20h,?,☕` |
| `boolean` | Boolean | `True,False,?,☕` |

`room_state.deck_preset` зберігає вибір (синх між гравцями), `active_cards` — поточна підмножина (через чекбокси). Зміна пресету в модалці викликає `setDeckPreset()` → пише `deck_preset + defaultActive`. Toggle карток → `saveCardDeck(active_cards)`.

`☕` — символ (не SVG), щоб не ламати legacy дані.

## Round History

`reveal()` оновлює `phase='revealed'` і **додатково** пише рядок у `round_history` зі snapshot гравців (`{player_id, name, vote}[]`). Записуються лише гравці з `vote !== null` (`?`/`☕` — рахуються). Skip коли `votes.length < 2` — соло-голосування не зберігаємо.

Snapshot містить `name`, бо після rename/leave записи історії мають лишатися читабельними без JOIN.

## State Management

Pinia stores у `app/stores/`:

- **`auth.ts`** — Supabase session + signIn/signUp/signOut
- **`room.ts`** — `roomState`, `create()`, `reveal()` (+round_history), `startNewRound()`, `saveCardDeck()`, `setDeckPreset()`, `applyChange()`
- **`players.ts`** — `players[]`, `pendingVotes`, optimistic `castVote()`, CRUD (join/rejoin/rename/kick/leave/linkUser/fetchAll), `applyChange()`, `voteOf()`, `clearPendingVotes()`
- **`presence.ts`** — `status` (connecting/online/reconnecting/offline), live `online: Set<playerId>` через Supabase Presence, visibility/network handlers

**Store ↔ Supabase:** stores викликають `getSupabase()` з `app/lib/supabase-instance.ts`. Плагін `app/plugins/supabase.ts` робить `setSupabase(client)` один раз. Тести інжектять mock через `setSupabase(mock)`.

## Realtime

Сторінка `[slug].vue` підписується на `postgres_changes` каналами `players:<roomId>`, `room_state:<roomId>`; payload → `xxxStore.applyChange(payload)` — диференційне оновлення, без full refetch. Після `'reconnecting' → 'online'` — одноразовий reconciliation refetch.

**Optimistic vote:** `playersStore.castVote()` пише у `pendingVotes[playerId]` миттєво, потім async UPDATE. Success/realtime ACK чистить запис, error — rollback + throw.

**Presence:** колонка `is_online` НЕ існує — online-статус з `presenceStore.online`. Visibility hidden → `untrack` + `unsubscribe` (для mobile).

## Project Structure

```
app/
├── app.vue
├── pages/
│   ├── index.vue          # Створення кімнати + Recent Rooms
│   └── [slug].vue         # Кімната (URL: /<roomId>)
├── components/            # AppHeader, CardsArea, PlayersList, ConfigureCardDeckModal, ...
├── composables/           # useTheme, useDylanAvatar
├── stores/                # auth, room, players, presence (Pinia) + __tests__/
├── plugins/               # supabase, vWave, clickOutside
├── lib/                   # supabase-instance (singleton getter)
└── utils/                 # roomId, relativeTime, recentRooms, cardDecks, authValidation + __tests__/
assets/css/main.css        # MUI-like класи
supabase/migrations/       # 001_initial_schema.sql
tests/setup.ts             # happy-dom bootstrap
vitest.config.ts           # alias '~' → app/
```

## Testing

Юніт-тести у `app/stores/__tests__/` і `app/utils/__tests__/`. Vanilla Vitest + happy-dom (`tests/setup.ts`, `vitest.config.ts`), без Nuxt контексту. Supabase mock через `setSupabase()`.

## URL-схема

- `/` — головна
- `/<roomId>` — кімната (top-level catch-all через `pages/[slug].vue`)

⚠️ Будь-який новий top-level роут (`/about`, `/auth`) перетне `[slug].vue` — додавай як іменовану сторінку (`pages/about.vue` має пріоритет) або вводь префікс `/r/<id>`.

## LocalStorage

- `storypoker_session_<roomId>` — `{ playerId, playerName, lastVisitedAt }` для авто-rejoin + Recent Rooms (`app/utils/recentRooms.ts`)
- `sp-theme` — `'light' | 'dark'`. Inline-скрипт у `<head>` (`nuxt.config.ts`) застосовує до hydration, щоб уникнути flash

## Code Style

- **Без коментарів** — код самодокументується через імена
- 2 пробіли, без табів, файли закінчуються одним `\n`
- TypeScript у composables/utils, `<script setup lang="ts">` у компонентах
- Без зайвих абстракцій (wrappers, що лише перейменовують функції)

## Security

- Ніколи не друкувати секрети чи повні значення env-змінних
- У прикладах — placeholders
- Secret key (`SUPABASE_SECRET_KEY`, `sb_secret_...`) — лише server-side, ніколи у client bundle

## Ролі

- **Гравець** — голосує, перейменовує себе, виходить з кімнати
- **Модератор** — все вище + розкриває карти, стартує новий раунд, кікає, налаштовує колоду карт

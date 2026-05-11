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
- **Styling:** Tailwind v3 via `@nuxtjs/tailwindcss` 6, токени в `tailwind.config.ts`, MUI-like класи в `assets/css/main.css`
- **Backend:** Supabase (Postgres + Realtime + Auth)
- **UI:** `@nuxt/icon`, `v-wave`, `@dicebear/core` (аватари), Roboto 300–700
- **Node:** 24+

## Workflow sequences
> `using-superpowers` runs automatically at session start; do not invoke it manually.

### New feature
`brainstorming` → `writing-plans` → `executing-plans`
During implementation, as needed: `vue` · `nuxt` · `pinia` · `supabase` · `tailwind-design-system` · `vue-best-practices` · `vueuse-functions`
Tests: `test-driven-development` + `vitest` and/or `webapp-testing`
Finish: `verification-before-completion`

### Bug / regression
`systematic-debugging` → `test-driven-development` → `vitest` → `verification-before-completion`

### UI component with design
`frontend-design` → `tailwind-design-system` → `vue` → `webapp-testing` → `verification-before-completion`

### Supabase task (DB / Auth / RLS)
`supabase` → `test-driven-development` → `verification-before-completion`

### Refactoring
`vue-best-practices` → `test-driven-development` → `vitest` → `verification-before-completion`

### Received code review
`receiving-code-review` → (fixes) → `verification-before-completion`

## Common Commands

```bash
npm install
npm run dev       # Dev (port 3000, --host для LAN/мобільних)
npm run build
npm run generate  # SSG static pre-render
npm run preview
npm test          # vitest run
```

## Environment Setup

Усі env-файли — у директорії `/.env/` (вся папка в `.gitignore`, окрім `.env.example`):

- `/.env/.env` — спільні змінні команди (Supabase, у майбутньому Netlify)
- `/.env/.env.local` — персональні змінні користувача (Jira corporate тощо)
- `/.env/.env.example` — шаблон (трекається в git)

`nuxt.config.ts` викликає `dotenv.config()` для обох файлів: спочатку `.env.local` (override), потім `.env` (defaults). `runtimeConfig.public` пробрасує `SUPABASE_URL`/`SUPABASE_KEY` у клієнт.

Шаблон значень:

```
SUPABASE_URL=...
SUPABASE_KEY=...            # publishable (sb_publishable_...) — клієнтський
# SUPABASE_SECRET_KEY=...   # server-side only, наразі не використовується
```

## Database

Єдина міграція в `supabase/migrations/001_initial_schema.sql` — накатується вручну через Supabase SQL Editor. Таблиці:

- `rooms (id text PK, slug text unique)` — 8-символьний ID (`app/utils/roomId.ts`); `slug` — опційний людський URL (встановлює модератор)
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
| `scrum` | Scrum Scale | `1/2,1,2,3,5,8,13,20,?,☕` (cards: +`0`,`40`,`100`) |
| `fibonacci` | Fibonacci Sequence | `1,2,3,5,8,13,21,?,☕` (cards: +`0`,`34`,`55`,`89`,`144`) |
| `tshirt` | T-Shirt Sizes | `S,M,L,XL,?,☕` (cards: +`0`,`XS`,`XXL`) |
| `hours` | Hours | `1/2h,1h,2h,3h,5h,8h,13h,20h,?,☕` (cards: +`0`,`40h`,`100h`) |
| `boolean` | Boolean | `True,False,?,☕` |

`0` є в картах кожного пресету (крім boolean), але деактивований за замовчуванням.

`room_state.deck_preset` зберігає вибір (синх між гравцями), `active_cards` — поточна підмножина (через чекбокси). Зміна пресету в модалці викликає `setDeckPreset()` → пише `deck_preset + defaultActive`. Toggle карток → `saveCardDeck(active_cards)`.

`☕` — символ (не SVG), щоб не ламати legacy дані.

## Round History

`reveal()` оновлює `phase='revealed'` і **додатково** пише рядок у `round_history` зі snapshot гравців (`{player_id, name, vote}[]`). Записуються лише гравці з `vote !== null` (`?`/`☕` — рахуються). Skip коли `votes.length < 2` — соло-голосування не зберігаємо.

Snapshot містить `name`, бо після rename/leave записи історії мають лишатися читабельними без JOIN.

## State Management

Pinia stores у `app/stores/`:

- **`auth.ts`** — Supabase session + signIn/signUp/signOut
- **`room.ts`** — `roomState`, `create()`, `reveal()` (+round_history), `startNewRound()`, `saveCardDeck()`, `setDeckPreset()`, `resolveRoom()`, `setSlug()`, `applyChange()`
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
- `/<roomId>` — кімната за внутрішнім ID
- `/<slug>` — кімната за людським URL (alias; обидва ведуть на одну кімнату)

`[slug].vue` на mount викликає `resolveRoom(urlParam)` → отримує `{ id, slug }`. Якщо URL прийшов як id і slug існує — `router.replace(/<slug>)`. Realtime/presence/session завжди по внутрішньому `id`.

`normalizeRoomSlug()` / `isValidRoomSlug()` — в `app/utils/roomId.ts`. Slug: 2–32 символи, `[a-z0-9-]`, без дефісу на початку/кінці.

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
- **Модератор** (авторизований) — все вище + розкриває карти, стартує новий раунд, кікає, перейменовує інших гравців, налаштовує колоду карт, задає slug кімнати

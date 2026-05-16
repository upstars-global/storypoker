# CLAUDE.md

Guidance for Claude Code working with this repository.

## Communication
- **Language:** Ukrainian (українська мова)
- **Constraint:** цей файл — ≤ 200 рядків. Детальна продуктова специфікація — `DESIGN.md`.

## Project Overview

**Story Poker** — Planning Poker для Agile-команд: кімнати, приховане голосування картами одного з 5 пресетів або кастомним піднабором, одночасне розкриття, історія раундів, room aliases, авторизація модераторів, профілі з аватарами.

Джерела контексту:
- `DESIGN.md` — дизайн-специфікація + audit (розділ 10)
- `ROADMAP.md` — статус, design gaps, iter-цілі
- `docs/superpowers/plans/` і `docs/superpowers/specs/` — iter-плани і специфікації окремих фіч
- `examples/` — ескізи, gitignored

## Tech Stack

- **Framework:** Nuxt 4.4, Vue 3, Composition API `<script setup>`, `srcDir: app/`
- **Styling:** Tailwind v3 через `@nuxtjs/tailwindcss` 6, токени в `tailwind.config.ts`, MUI-like класи в `assets/css/main.css`
  - utilities: `text-{primary,body,muted,disabled,inverse,danger,success}`, `bg-{app,appbar,paper,elevated,overlay,skeleton}`, `border` (DEFAULT = `var(--border)`), `shadow-{1..8}`
  - button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46 / 23rad / `#607d8b`), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`
- **State:** Pinia 3 через `@pinia/nuxt`
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **i18n:** `@nuxtjs/i18n`, strategy `no_prefix`, локалі `i18n/locales/{uk,en}.json`
- **UI:** `@nuxt/icon` + `@iconify-json/ic` (`ic:baseline-*`); local `app:` icons only `moderator`, `deciding`, `offline`, `leave-room`; `v-wave`, DiceBear, Roboto 300–700
- **Node/npm:** Node >=24.15.0, npm >=11.12.0

## Common Commands

```bash
npm install
npm run dev          # Nuxt dev, port 3000, --host already enabled
npm run build
npm run generate     # static pre-render for Netlify
npm run preview
npm run lint         # ESLint
npm run typecheck    # vue-tsc via nuxt typecheck
npm test             # vitest run
npm run test:watch
npm run test:unit    # vitest run
npm run test:unit:watch
npm run test:unit:coverage
npm run test:e2e     # playwright — all e2e tests (local only, needs .env.test)
npm run test:e2e:smoke   # smoke flows (local only)
npm run test:ci      # lint + typecheck + unit + build (what CI runs)
```

CI is `.github/workflows/ci.yml`: `npm ci`, `npm run test:ci` (lint + typecheck + unit tests + build); E2E runs when E2E secrets exist; deploy runs `npm run generate` on `main` when checks pass and Netlify secrets exist.

## Environment Setup

`package-lock.json` — committed (required for `npm ci` in CI). Do NOT add it back to `.gitignore`.

Усі env-файли — у `/.env/` (папка gitignored, окрім `/.env/.env.example` і `/.env/.env.test.example`):

- `/.env/.env.local` — персональні override
- `/.env/.env` — командні defaults
- `/.env/.env.test` — креди тестового Supabase project для Playwright (gitignored)
- `nuxt.config.ts` спочатку вантажить `.env.local`, потім `.env`

Шаблон:

```bash
SUPABASE_URL=...
SUPABASE_KEY=...            # publishable client key
# SUPABASE_SECRET_KEY=...   # server-side only, не класти в client bundle
```

`nuxt.config.ts` мапить ці змінні в `runtimeConfig.public.supabaseUrl/supabaseKey`; клієнтський код читає їх через `useRuntimeConfig().public`.

## Database

Міграції в `supabase/migrations/` накатуються вручну через Supabase SQL Editor:

- `001_initial_schema.sql` — `rooms`, `room_state`, `players`, `round_history`, public RLS
- `002_rooms_update_policy.sql` — public update для `rooms`
- `003_rooms_name.sql` — `rooms.name`
- `004_rooms_realtime.sql` — Realtime publication для `rooms`
- `005_user_profiles.sql` — `user_profiles`, public RLS, Realtime publication
- `006_room_state_timer.sql` — `room_state.paused_at`, `room_state.paused_elapsed_ms` для керованого таймера
- `007_players_room_state_realtime.sql` — Realtime publication для `players` і `room_state`

Таблиці:
- `rooms (id text PK, slug text unique, name text, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms)`
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, created_at)`
- `user_profiles (user_id uuid PK, avatar_style, avatar_seed, updated_at)`

RLS зараз public read/write для anon key; окремого backend немає, логіка в клієнті. `leave` і `kick` — soft-delete через `left_at`; UI працює з `left_at is null`.

## Card Decks

Пресети в `app/utils/cardDecks.ts`:

| id | default active |
|---|---|
| `scrum` | `1/2,1,2,3,5,8,13,20,?,☕` |
| `fibonacci` | `1,2,3,5,8,13,21,?,☕` |
| `tshirt` | `S,M,L,XL,?,☕` |
| `hours` | `1/2h,1h,2h,3h,5h,8h,13h,20h,?,☕` |
| `boolean` | `True,False,?,☕` |

`0` є в усіх небулевих пресетах, але деактивований за замовчуванням. `☕` — символ, не SVG. `setDeckPreset()` пише `deck_preset + defaultActive`; `saveCardDeck()` пише тільки `active_cards`.

## Round History

`reveal()` оновлює `room_state.phase='revealed'` і пише `round_history` зі snapshot `{player_id,name,vote}[]` тільки коли `votes.length >= 2`. `?` і `☕` рахуються як голоси. Snapshot містить `name`, щоб історія лишалась читабельною після rename/leave.

## State Management

Pinia stores у `app/stores/`:

- `auth.ts` — Supabase session, sign in/up/out, password reset/update
- `room.ts` — room state, create, reveal, new round, deck, resolve, room name/slug
- `players.ts` — players, optimistic votes, join/rejoin, rename, moderator toggle, kick/leave, link user
- `presence.ts` — online `Set<playerId>` через Supabase Presence і reconnect/visibility handlers
- `profiles.ts` — `user_profiles` cache, fetch/upsert, Realtime applyChange
- `types.ts` — спільні TS interfaces (`Player`, `RoomState`, `RoundHistory`, `RoundHistoryVote`, `UserProfile`)

Stores беруть клієнт через `getSupabase()` з `app/lib/supabase-instance.ts`; `app/plugins/supabase.ts` робить `setSupabase(client)`. Тести інжектять mock через `setSupabase(mock)`.

## Realtime

`app/pages/[slug].vue` підписується на:

- `players:<roomId>` → `playersStore.applyChange`
- `room_state:<roomId>` → `roomStore.applyChange`
- `rooms:<roomId>` → sync `slug/name`, redirect між id і slug
- `user_profiles:<roomId>` → `profilesStore.applyChange`
- `room:<roomId>` Presence → online players

Після `'reconnecting' → 'online'` виконується reconciliation refetch. Optimistic vote пишеться в `pendingVotes[playerId]`, success/realtime ACK очищає запис, error робить rollback.

## Project Structure

```text
app/
├── pages/        # index, [slug], login, signup, forgot-password, reset-password
├── components/   # AppHeader, CardsArea, PlayersList, modals, icons
├── composables/  # useTheme, useDylanAvatar
├── stores/       # auth, room, players, presence, profiles
├── plugins/      # supabase, vWave, clickOutside
├── lib/          # supabase-instance
└── utils/        # roomId, cardDecks, authValidation, recentRooms, playerRoles, relativeTime
assets/css/main.css
i18n/locales/{uk,en}.json
supabase/migrations/*.sql
tests/
├── unit/stores|utils/   # Vitest unit tests (alias ~ → app/)
├── fixtures/            # Playwright fixtures (room, auth)
├── page-objects/        # Playwright POMs
├── support/test.ts      # merged Playwright test export
├── support/setup/       # vitest.ts setup
├── e2e/                 # smoke.spec.ts, critical-flows.spec.ts
vitest.config.ts
playwright.config.ts
```

## Testing

Unit tests: Vitest + happy-dom, без Nuxt runtime. Лежать у `tests/unit/`; alias `~` → `app/`. E2E: Playwright у `tests/e2e/`; потребує `.env/.env.test`. Локально зупини dev server на `:3000` або задай `E2E_BASE_URL`, бо Playwright має `reuseExistingServer: true`.

## URL Schema

- `/` — home + Recent Rooms
- `/<roomId>` — кімната за 8-символьним id
- `/<slug>` — alias кімнати; якщо slug існує, URL з id редиректиться на slug
- `/login`, `/signup`, `/forgot-password`, `/reset-password` — auth routes

`normalizeRoomSlug()` / `isValidRoomSlug()` приймають 2–32 символи `[a-z0-9-]`, без дефісу на початку/кінці. Нові top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або вводь префікс.

## LocalStorage

- `storypoker_session_<roomId>` — `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms
- `sp-theme` — `light | dark`; inline script у `nuxt.config.ts` застосовує тему до hydration

## Code Style

- Без коментарів у коді; імена мають пояснювати поведінку
- 2 пробіли, без табів, один trailing newline
- TypeScript у composables/utils/stores; `<script setup lang="ts">` у Vue SFC
- Без wrapper-абстракцій, які тільки перейменовують функції
- UI-тексти мають проходити через i18n, якщо компонент вже локалізований

## Roles

- **Player:** vote, rename self, leave room
- **Moderator:** reveal, start new round, configure deck; own moderator toggle доступний у меню гравця
- **Authorized moderator:** rename room, rename/kick other players, set slug/name; контролі таймера (reset/pause/resume/±30s)

## Security

- Не друкувати секрети або повні env values
- У прикладах використовувати placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` — тільки server-side, ніколи в client bundle

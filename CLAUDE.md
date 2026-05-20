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

- **Framework:** Vue 3.5 + Vite 8 (Rolldown bundler) SPA, Composition API `<script setup>`, `srcDir: app/`
- **Routing:** `vue-router@5` — явні маршрути в `app/router.ts`, без file-based routing
- **Styling:** Tailwind v4 через PostCSS (`@tailwindcss/postcss` + autoprefixer), CSS-first config у `app/assets/css/main.css` (`@theme`, `@utility`, `@custom-variant dark`), MUI-like класи там само
  - text utilities з `@theme --color-*`: `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`
  - bg utilities через `@utility`: `bg-{app,appbar,paper,elevated,overlay,skeleton}`
  - дефолтний `border` зберігає колір `var(--border)` через `@layer base` override (v4 default — `currentColor`); `border-input` — явний `@utility`
  - `shadow-{1..4,8}` — значення живуть у `@theme`; `text-mui-{h2,body,table,caption}` — `--text-mui-*` + `--line-height`/`--letter-spacing` modifiers
  - button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46 / 23rad / `#607d8b`), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`
- **State:** Pinia 3 (без auto-imports — явні `from 'pinia'`)
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **i18n:** `vue-i18n@11` (runtime compilation, `legacy: false`, `globalInjection: true`), локалі `app/i18n/locales/{uk,en}.json`
- **UI:** `@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`); custom collection `app:` для `moderator`, `deciding`, `offline`, `leave-room` — зареєстровано через `addCollection` у `app/lib/registerAppIcons.ts`; `v-wave`, DiceBear, Roboto 300–700
- **Node/npm:** Node >=24.15.0, npm >=11.12.0

## Common Commands

```bash
npm install
npm run dev          # Vite dev, port 3000 (host enabled)
npm run build        # vite build → dist/
npm run preview      # vite preview, port 3000
npm run lint         # ESLint flat config
npm run typecheck    # vue-tsc --noEmit
npm test             # vitest run
npm run test:watch
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
npm run test:e2e
npm run test:e2e:smoke
npm run test:ci      # lint + typecheck + unit + build (CI runs this)
```

CI is `.github/workflows/ci.yml`: `npm ci`, `npm run test:ci` (lint + typecheck + unit tests + build); E2E runs when E2E secrets exist; deploy runs `npm run build` on `main` when checks pass and Netlify secrets exist.

## Environment Setup

`package-lock.json` — committed (required for `npm ci`). Do NOT add it back to `.gitignore`.

Усі env-файли — у `/.env/` (gitignored, окрім `*.example`). Vite читає через `envDir: '.env'` у `vite.config.ts`:
- `/.env/.env.local` — персональні override
- `/.env/.env` — командні defaults
- `/.env/.env.test` — креди тестового Supabase project для Playwright

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...        # publishable client key
# SUPABASE_SECRET_KEY=...    # server-side only, БЕЗ VITE_ префіксу
```

Клієнтський код читає через `import.meta.env.VITE_*` (тільки `VITE_*` потрапляють у browser bundle).

## Database

Міграції в `supabase/migrations/` — накатуються вручну через Supabase SQL Editor (`001`–`007`: schema, RLS, Realtime, timer, user_profiles). Таблиці:
- `rooms (id text PK, slug text unique, name text, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms)`
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, created_at)`
- `user_profiles (user_id uuid PK, avatar_style, avatar_seed, updated_at)`

RLS зараз public read/write для anon key; логіка в клієнті. `leave` і `kick` — soft-delete через `left_at`; UI працює з `left_at is null`.

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

Stores беруть клієнт через `getSupabase()` з `app/lib/supabase-instance.ts`; `app/main.ts` ініціалізує клієнт через `initSupabase()`. Тести інжектять mock через `setSupabase(mock)`.

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
/
├── index.html             # head/meta + theme inline script
├── vite.config.ts
├── postcss.config.js
├── tsconfig.json, tsconfig.node.json
├── eslint.config.js
├── netlify.toml
├── public/
│   ├── _redirects         # /*  /index.html  200
│   └── favicon.svg
├── app/
│   ├── main.ts            # entry: createApp + pinia + router + i18n + plugins
│   ├── router.ts          # явні 6 routes
│   ├── i18n.ts            # createI18n
│   ├── App.vue            # <RouterView />
│   ├── pages/             # index, [slug], login, signup, forgot-password, reset-password
│   ├── components/        # AppHeader, CardsArea, PlayersList, modals, icons
│   ├── composables/       # useTheme, useDylanAvatar
│   ├── stores/            # auth, room, players, presence, profiles
│   ├── directives/        # clickOutside
│   ├── lib/               # supabase-instance, registerAppIcons
│   ├── utils/             # roomId, cardDecks, authValidation, recentRooms, playerRoles, relativeTime
│   ├── i18n/locales/{uk,en}.json
│   └── assets/css/main.css, assets/icons/
├── supabase/migrations/*.sql
└── tests/
    ├── unit/stores|utils/   # Vitest (alias ~ → app/)
    ├── fixtures/, page-objects/, support/, e2e/
```

## Testing

Unit tests: Vitest + happy-dom. Лежать у `tests/unit/`; alias `~` → `app/`. E2E: Playwright у `tests/e2e/`; потребує `.env/.env.test`. Локально зупини dev server на `:3000` або задай `E2E_BASE_URL`, бо Playwright має `reuseExistingServer: true`.

## URL Schema

- `/` — home + Recent Rooms
- `/<roomId>` — кімната за 8-символьним id
- `/<slug>` — alias кімнати; якщо slug існує, URL з id редиректиться на slug
- `/login`, `/signup`, `/forgot-password`, `/reset-password` — auth routes

`normalizeRoomSlug()` / `isValidRoomSlug()` приймають 2–32 символи `[a-z0-9-]`, без дефісу на початку/кінці. Нові top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або вводь префікс.

## LocalStorage

- `storypoker_session_<roomId>` — `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms
- `sp-theme` — `light | dark`; inline script у `index.html` застосовує тему до завантаження JS

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

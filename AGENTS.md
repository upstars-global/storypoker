# CLAUDE.md

Guidance for Claude Code working with this repository.

## Communication
- **Language:** Ukrainian (українська мова)
- **Constraint:** цей файл - ≤ 256 рядків. Детальна продуктова специфікація - `DESIGN.md`.

## Workflow
- **Заборонено git worktrees.** Не створюй linked worktrees (`git worktree add`, `EnterWorktree`, `isolation: "worktree"`). Працюй у головному робочому каталозі; ізоляцію роби через гілки.

## Project Overview

**Story Poker** - Planning Poker для Agile-команд: кімнати, приховане голосування картами одного з 7 пресетів або кастомним піднабором, одночасне розкриття, історія раундів, room aliases, авторизація модераторів, профілі з аватарами.

Джерела контексту: `DESIGN.md` (дизайн + audit §10), `ROADMAP.md` (статус, gaps, iter-цілі), `docs/superpowers/{plans,specs}/` (iter-плани і специфікації), `examples/` (ескізи, gitignored).

## Tech Stack

- **Framework:** Vue 3.5 + Vite 8 (Rolldown bundler) SPA, Composition API `<script setup>`, `srcDir: app/`
- **Routing:** `vue-router@5` - явні маршрути в `app/router.ts` (7 routes, без file-based routing)
- **Styling:** Tailwind v4 через `@tailwindcss/vite` (нативний Vite-плагін; без PostCSS/autoprefixer - vendor-prefixing робить вбудований Lightning CSS), CSS-first config у `app/assets/css/main.css` (`@theme`, `@utility`, `@custom-variant dark`), MUI-like класи там само
  - text utilities з `@theme --color-*`: `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`
  - bg utilities через `@utility`: `bg-{app,appbar,paper,elevated,overlay,skeleton}`
  - дефолтний `border` зберігає колір `var(--border)` через `@layer base` override (v4 default - `currentColor`); `border-input` - явний `@utility`
  - `shadow-{1..4,8}` - значення живуть у `@theme`; `text-mui-{h2,body,table,caption}` - `--text-mui-*` + `--line-height`/`--letter-spacing` modifiers
  - button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46 / 23rad / `#607d8b`), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`
- **State:** Pinia 3 (без auto-imports - явні `from 'pinia'`)
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **i18n:** `vue-i18n@11` (runtime compilation, `legacy: false`, `globalInjection: true`), локалі `app/i18n/locales/{uk,en}.json`
- **PWA:** `vite-plugin-pwa` (Workbox, `autoUpdate`) - manifest і `runtimeCaching` в `vite.config.ts` (не окремий файл); splash `theme_color`/`background_color` = `#212121`, узгоджені з `<meta name="theme-color">` в `index.html`
- **UI:** `@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`, єдина offline-колекція); `simple-icons:*`/`game-icons:*`/`tabler:*`/`lucide:*` резолвляться через Iconify API; custom collection `app:` (`moderator`, `deciding`, `offline`, `leave-room`, `bank`, `town-hall`, `fibonacci`, `scrum`) через `addCollection` у `app/lib/registerAppIcons.ts`. Іконки рендеряться через `<AppIcon>`, який проганяє назву крізь `mapIconName()` (`app/utils/iconMap.ts`): флаг `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову lucide-іконку треба додати в `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`. Також `v-wave`, DiceBear, Roboto 300–700
- **Components:** `AppModal` (native `<dialog>`, `app/components/AppModal.vue`) - props `open: boolean, lockDismiss?: boolean`, emit `close`; `AppTooltip` (`app/components/AppTooltip.vue`) - props `side?, sideOffset?`, slots `#trigger` `#content`; `useClickOutside` (`app/composables/useClickOutside.ts`) - використовується в AppHeader та PlayerRow для закриття dropdown-меню
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
npm run test:e2e:pages   # public pages load smoke (project page-load, no Supabase)
npm run test:e2e:ui  # Playwright UI mode
npm run test:ci      # lint + typecheck + unit + build (CI runs this)
npm run deploy:{stage,prod}   # Netlify alias / prod deploy
```

CI is `.github/workflows/ci.yml`: `npm ci`, `npm run test:ci` (lint + typecheck + unit tests + build); the `page-load` job runs always (unconditional public-pages smoke via `test:e2e:pages` with dummy Supabase creds); E2E runs when E2E secrets exist; deploy runs `npm run build` on `main` when checks (incl. page-load) pass and Netlify secrets exist.

## Environment Setup

`package-lock.json` - committed (required for `npm ci`). Do NOT add it back to `.gitignore`.

Усі env-файли - у `/.env/` (gitignored, окрім `*.example`). Vite читає через `envDir: '.env'` у `vite.config.ts`:
- `/.env/.env.local` - персональні override
- `/.env/.env` - командні defaults
- `/.env/.env.test` - креди тестового Supabase project для Playwright

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...        # publishable client key
# SUPABASE_SECRET_KEY=...    # server-side only, БЕЗ VITE_ префіксу
```

Клієнтський код читає через `import.meta.env.VITE_*` (тільки `VITE_*` потрапляють у browser bundle).

## Database

Міграції в `supabase/migrations/` - накатуються через Supabase SQL Editor або Management API (`001`–`010`: schema, RLS, Realtime, timer, user_profiles, player shields, poll_question, history deck). Таблиці:
- `rooms (id text PK, slug text unique, name text, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms, poll_question)`
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, shields text[], created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, deck_preset, created_at)`
- `user_profiles (user_id uuid PK, avatar_style, avatar_seed, updated_at)`

RLS зараз public read/write для anon key; логіка в клієнті. `leave` і `kick` - soft-delete через `left_at`; UI працює з `left_at is null`.

## Card Decks

Пресети в `app/utils/cardDecks.ts`:

| id | default active |
|---|---|
| `scrum` | `1/2,1,2,3,5,8,13,20,?,☕` |
| `fibonacci` | `1,2,3,5,8,13,21,?,☕` |
| `tshirt` | `S,M,L,XL,?,☕` |
| `hours` | `1/2h,1h,2h,3h,5h,8h,13h,20h,?,☕` |
| `boolean` | `True,False,?,☕` |
| `voting` | `yes,no,☕` (опційні `🍺,🚬`) |
| `vote_question` | кастомні опції; дефолт `Option A,Option B,Option C` |

`0` є в усіх небулевих оцінювальних пресетах (не у `voting`/`vote_question`), але деактивований за замовчуванням. `☕` - символ, не SVG. `setDeckPreset()` пише `deck_preset + defaultActive`; `saveCardDeck()` пише тільки `active_cards`.

## Round History

`reveal()` оновлює `room_state.phase='revealed'` і пише `round_history` зі snapshot `{player_id,name,vote}[]` тільки коли `votes.length >= 2`. `?` і `☕` рахуються як голоси. Snapshot містить `name`, щоб історія лишалась читабельною після rename/leave. Also зберігає `active_cards`/`deck_preset` знятого раунду. Формули `alignmentScore`/`averageOf` і pipeline графіка узгодженості (`AlignmentTrendsModal.vue`) - `DESIGN.md` §11.3–11.4. Ручного CSV-експорту немає (видалено) - `netlify/functions/room-json.mts` покриває цю потребу.

## Зовнішні інтеграції

`netlify/functions/room-json.mts` - read-only Netlify Function (`path: '/api/*'`, дефолтна `netlify/functions` без явного `[functions]` у `netlify.toml`):
- `GET /api/<roomId|slug>.json` → `{room, rounds:[{id,date,week,deck,average,devAlignment,qaAlignment,voters}]}` для однієї кімнати
- `GET /api/teams.json` → `{teams:[{room,rounds:[...]}]}` по **всіх** кімнатах у базі

Захищено shared-secret: `Authorization: Bearer <STORYPOKER_API_TOKEN>` (env var, server-side only, БЕЗ `VITE_` префіксу - ставиться в Netlify site env, не в `/.env/`). Без заголовка чи з неправильним токеном - `401`; якщо `STORYPOKER_API_TOKEN` не заданий на сервері - `500` (`server misconfigured`). Той самий Bearer-патерн, що й `fe-weekly-report.post.ts` у agilecharts - саме agilecharts (`server/utils/storypokerFiles.ts`) додає цей заголовок на кожен запит.

Колода в `rounds` визначається автоматично (`isNumericPreset`-логіка: `scrum`/`fibonacci`/`hours` + legacy `deck_preset=null`), poll-колоди (`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключаються з узгодженості. Читає `rooms`+`round_history`+`players` напряму через `@supabase/supabase-js` (той самий `VITE_SUPABASE_*`), рахунок `alignmentScore`/`averageOf`/DEV-QA split - навмисно продубльований з `app/utils/alignment.ts`/`roundStats.ts`/`shields.ts` (Netlify bundler не резолвить Vite alias `~/*`) - зміни формул синхронізувати вручну в обох місцях. Споживач - `agilecharts` (сусідній репо, Nuxt), вкладка "Estimation Trends" (`app/components/team/TeamConsistencyTrends.vue`).

## State Management

Pinia stores у `app/stores/`:

- `auth.ts` - Supabase session, sign in/up/out, password reset/update
- `room.ts` - room state, create, reveal, new round, deck, resolve, room name/slug
- `players.ts` - players, optimistic votes, join/rejoin, rename, moderator toggle, set shields, kick/leave, link user
- `presence.ts` - online `Set<playerId>` через Supabase Presence; на `visibilitychange → hidden` закриває канал лише через `AWAY_TIMEOUT_MS` (5 хв), повернення раніше - скасовує таймер
- `profiles.ts` - `user_profiles` cache, fetch/upsert, Realtime applyChange
- `types.ts` - спільні TS interfaces (`Player`, `RoomState`, `RoundHistory`, `RoundHistoryVote`, `UserProfile`)

Stores беруть клієнт через `getSupabase()` з `app/lib/supabase-instance.ts`; `app/main.ts` ініціалізує клієнт через `initSupabase()`. Тести інжектять mock через `setSupabase(mock)`.

## Realtime

`app/pages/[slug].vue` підписується на:

- `players:<roomId>` → `playersStore.applyChange`
- `room_state:<roomId>` → `roomStore.applyChange`
- `rooms:<roomId>` → sync `slug/name`, redirect між id і slug
- `user_profiles:<roomId>` → `profilesStore.applyChange`
- `room:<roomId>` Presence → online players
- `countdown:<roomId>` broadcast (`self:true`) → синхронний відлік перед reveal; initiator викликає `reveal()`. Hold-to-start UI (silent/dry/wet, `useCountdown.ts`) - `DESIGN.md` §11.6

Після `'reconnecting' → 'online'` виконується reconciliation refetch. Optimistic vote пишеться в `pendingVotes[playerId]`, success/realtime ACK очищає запис, error робить rollback.

## Project Structure

```text
/
├── index.html             # head/meta + theme inline script
├── vite.config.ts
├── tsconfig.json, tsconfig.node.json
├── eslint.config.js
├── netlify.toml
├── public/
│   ├── _redirects         # /*  /index.html  200
│   └── favicon.svg
├── app/
│   ├── main.ts            # entry: createApp + pinia + router + i18n + plugins
│   ├── router.ts          # явні 7 routes
│   ├── i18n.ts            # createI18n
│   ├── App.vue            # <RouterView />
│   ├── pages/             # index, [slug], login, signup, forgot-password, reset-password, ffc
│   ├── components/        # AppHeader, CardsArea, PlayersList, modals, icons
│   ├── composables/       # useTheme, useDylanAvatar, useCountdown, useCardLabel, useClickOutside
│   ├── stores/            # auth, room, players, presence, profiles
│   ├── lib/               # supabase-instance, registerAppIcons
│   ├── configs/           # featureFlags (runtime toggles з localStorage)
│   ├── utils/             # roomId, cardDecks, authValidation, recentRooms, shields, resultCelebration, relativeTime, iconMap, alignment, roundStats
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

- `/` - home + Recent Rooms
- `/<roomId>` - кімната за 8-символьним id
- `/<slug>` - alias кімнати; якщо slug існує, URL з id редиректиться на slug
- `/login`, `/signup`, `/forgot-password`, `/reset-password` - auth routes
- `/ffc` - Feature Flags console (override з localStorage, key `FEATURE_FLAGS`)

`normalizeRoomSlug()` / `isValidRoomSlug()` приймають 2–32 символи `[a-z0-9-]`, без дефісу на початку/кінці. Нові top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або вводь префікс.

## LocalStorage

- `storypoker_session_<roomId>` - `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms
- `sp-theme` - `light | dark`; `sp-palette` - `classic | cyberdeck | matcha` (повноцінні теми, кожна має light/dark: cyberdeck - неоновий термінал, Geist Mono, гострі кути, неонові рамки/тіні, єдиний дозволений градієнт в appbar; matcha - м'яка округла, Nunito, великі радіуси). Теми задають змінні `--font-app/--font-display/--radius-*/--btn-text/--btn-transform/--paper-border/--card-border/--shadow-*` у `main.css` через `html[data-palette=…][data-theme=…]`; inline script у `index.html` застосовує обидва атрибути до завантаження JS; вибір - меню в AppHeader (`PALETTES` з `useTheme.ts`)
- `FEATURE_FLAGS` - override flags з `app/configs/featureFlags.ts` (керується на `/ffc`)
- `sp-side-widget` - `timer | slot`; лівий віджет кімнати перемикається кнопкою в хедері блоку (Timer ↔ SlotMachine). Слот: 3 барабани, зважена випадковість (`utils/slotMachine.ts`; символи - tabler icon-id у `SLOT_SYMBOL_WEIGHTS`, рендеряться через `<AppIcon>`), 3 спіни на гравця за раунд (скидаються за `round_started_at`), джекпот = 3 однакові символи → broadcast `slot-win` на `countdown:<roomId>` каналі → `SlotWinBanner` (fixed-оверлей поверх AppHeader + невеликий салют, «+1 вихідний день») у всіх учасників

## Code Style

- Без коментарів у коді; імена мають пояснювати поведінку
- 2 пробіли, без табів, один trailing newline
- TypeScript у composables/utils/stores; `<script setup lang="ts">` у Vue SFC
- Без wrapper-абстракцій, які тільки перейменовують функції
- UI-тексти мають проходити через i18n, якщо компонент вже локалізований

## Roles

- **Player:** vote, rename self, set own shields, leave room, **toggle own moderator flag** (self-promote/demote - доступно будь-кому, не лише поточному модератору); history/trends/theme/language/widget/slot - без ролевих обмежень
- **Moderator (`is_moderator`, не потребує auth):** reveal, reset votes, last-round toggle, countdown (silent/dry/wet), start new round, poll question setup, configure deck, kick players, контролі таймера (reset/pause/resume/±30s) - усе гейтиться `v-if="isModerator"` в `CardsArea.vue`/`Timer.vue`, client-side only (RLS `using (true)`)
- **Authorized moderator (`isModerator && user`):** rename room, set slug/name, rename other players + set їхні shields. Детальна матриця - `DESIGN.md` §11.1–11.2
- **Shields:** `app/utils/shields.ts` - роль обирається з `PLAYER_ROLES` через `RolePicker.vue` (спільний селектор у JoinOverlay+PlayerEditModal) на базі `RoleBadge.vue` (те саме відображення у PlayerRow) і пишеться як один shield у `players.shields` через `shieldForRoleTag()` (кастомні - префікс `custom:`); `SHIELD_CATALOG` (групи role/focus/stack/qa/lead) лишився тільки для лукапу, icon-picker з UI прибрано; `isQaPlayer()` виводить QA-гравців в окрему пилу
- **Consensus:** при QA-розщепленні салют + decision-sound тригерять, якщо **хоча б одна** група (DEV/QA) одноголосна; без QA - всі голоси однакові (≥ 2). Логіка в `utils/resultCelebration.ts → shouldCelebrateGroupedVotes`; sound через `isConsensus` у `pages/[slug].vue`

## Security

- Не друкувати секрети або повні env values
- У прикладах використовувати placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` - тільки server-side, ніколи в client bundle

# AGENTS.md
Guidance for coding agents working with this repo.

## Conventions
- **Файли інструкцій:** канонічний файл - `AGENTS.md`, поруч лежить `CLAUDE.md` з єдиним рядком `@AGENTS.md`. Писати треба в `AGENTS.md`; `CLAUDE.md` чіпати лише при зміні схеми імпорту. Symlink-ів між ними не робити.
- **Розмір інструкцій:** менше 200 рядків і ~20 КБ. Тема довша за ~800 символів іде підпунктами (рядок-простиня не обходить ліміт). Тут живуть інваріанти й гочі; деталі механік - `DESIGN.md` §11 і `docs/specs/`; повторювана процедура - у skill, не в інструкціях. Перед додаванням нової секції - стиснути наявне, прибирати «очевидне з коду».
- **Тільки англійська:** `README.md`, commit messages, назви й описи PR, коментарі в PR та issues, коментарі в коді, CI-артефакти. Українською лишається спілкування в чаті й внутрішня документація (`AGENTS.md`, `DESIGN.md`, `docs/`).
- **Git worktrees:** для ізольованої реалізації дозволено створювати worktree через `using-git-worktrees`; наявні незакомічені зміни основного каталогу лишати недоторканими.
- **Діаграми - тільки ECharts.** Перед будь-якою роботою з графіками активуй skill `echarts`. Нові діаграми пиши на Apache ECharts; `AlignmentTrendsModal.vue` уже мігрований, саморобний SVG лишився тільки в `PieChart.vue` - при дотику переписуй на ECharts.

## Project Overview
**Story Poker** - Planning Poker для Agile-команд: кімнати, приховане голосування картами одного з 8 пресетів або кастомним піднабором, одночасне розкриття, історія раундів, room aliases, авторизація модераторів, профілі з аватарами.

Джерела контексту: `DESIGN.md` (дизайн + audit §10, механіки §11), `docs/roadmap.md` (індекс ініціатив у `docs/initiatives/`) і `docs/completed.md`, `docs/{plans,specs}/` і legacy `docs/superpowers/{plans,specs}/` (iter-плани і специфікації), `docs/tasks/` (разові операційні інструкції).

## Workflow sequences
> Джерело істини для назв - `ls .claude/skills/`; вигаданих skills не викликати. Code review / security review - вбудовані слеш-команди (`/code-review`, `/security-review`), не skills.

### New feature
`scope-triage` → `plan-crafting` → `executing-plans` (паралельні незалежні задачі - `dispatching-parallel-agents` / `subagent-driven-development`)
During implementation, as needed: `typescript` · `echarts` · `web-debug`
Tests: `test-driven-development` + `vitest` and/or `web-debug`
Finish: `requesting-code-review` → `verification-before-completion` → **CI check**
### Bug / regression
`systematic-debugging` → `test-driven-development` → `verification-before-completion` → **CI check**
### Supabase task (DB / Auth / RLS / Storage)
`test-driven-development` → `/security-review` → **CI check**
### Refactoring
`scope-triage` → `test-driven-development` → **CI check**
### Received code review
`receiving-code-review` → (fixes) → `verification-before-completion` → **CI check**
### Prose (docs, README, UI copy, commits)
`dashfix` · `negafix`
### Закриття гілки
`finishing-a-development-branch`

> **CI check** = `npm run test:ci` - обов'язково перед завершенням будь-якої задачі.

## Tech Stack
- **Framework:** Vue 3.5 + Vite 8 (Rolldown bundler) SPA, Composition API `<script setup>`; код у `app/`, alias `~` і `@` → `app/` (`vite.config.ts` + `vitest.config.ts`)
- **Routing:** `vue-router@5` - явні маршрути в `app/router.ts` (без file-based routing)
- **Styling:** Tailwind v4 через `@tailwindcss/vite` (нативний Vite-плагін; без PostCSS/autoprefixer - vendor-prefixing робить вбудований Lightning CSS), CSS-first config у `app/assets/css/main.css` (`@theme`, `@utility`, `@custom-variant dark`), MUI-like класи там само
  - text utilities з `@theme --color-*`: `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`
  - bg utilities через `@utility`: `bg-{app,appbar,paper,elevated,overlay,skeleton}`
  - дефолтний `border` зберігає колір `var(--border)` через `@layer base` override (v4 default - `currentColor`); `border-input` - явний `@utility`
  - `shadow-{1..4,8}` - значення живуть у `@theme`; `text-mui-{h2,body,table,caption}` - `--text-mui-*` + `--line-height`/`--letter-spacing` modifiers
  - button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46 / 23rad / `#607d8b`), `.mui-btn-sm`, `.mui-btn-text`, `.mui-btn-secondary`
- **State:** Pinia 4 (без auto-imports - явні `from 'pinia'`)
- **Charts:** `echarts` + `vue-echarts` (тільки потрібні модулі через `echarts/core` + `use([...])` заради розміру бандла) - графік тренди узгодженості (`AlignmentTrendsModal.vue`)
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **i18n:** `vue-i18n@11` (runtime compilation, `legacy: false`, `globalInjection: true`), локалі `app/i18n/locales/{uk,en}.json`
- **PWA:** `vite-plugin-pwa` (Workbox, `autoUpdate`) - manifest і `runtimeCaching` в `vite.config.ts` (не окремий файл); splash `theme_color`/`background_color` = `#212121`, узгоджені з `<meta name="theme-color">` в `index.html`
- **UI:** `@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`, єдина offline-колекція); `simple-icons:*`/`game-icons:*`/`tabler:*`/`lucide:*` резолвляться через Iconify API; custom collection `app:` через `addCollection` у `app/lib/registerAppIcons.ts`. Іконки рендеряться через `<AppIcon>`, який проганяє назву крізь `mapIconName()` (`app/utils/iconMap.ts`): флаг `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову lucide-іконку треба додати в `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`. Також `v-wave`, DiceBear, Roboto 300–700
- **Components:** `AppModal` (native `<dialog>`) - props `open: boolean, lockDismiss?: boolean`, emit `close`, контент загортається в `AppModalPaper` (`style="max-width: …"` задає ширину модалки); `AppTooltip` - props `side?, sideOffset?`, slots `#trigger` `#content`; `useClickOutside` - закриття dropdown-меню в AppHeader та PlayerRow
- **Node/npm:** Node >=24.15.0, npm >=11.12.0

## Commands
Скрипти - `package.json#scripts`. Неочевидне:
- `npm install`: preinstall → `scripts/setup.sh` (створює `.env/`, `.agents/`, `.claude/settings.json`; `scripts/migrate-test-artifacts.sh` переносить legacy `coverage/`/`playwright-report/` у `test-results/`), postinstall → `scripts/skills.sh` (мережеві `npx skills add`, `skills-lock.json`). Окремо: `npm run setup` / `npm run skills` / `npm run clean`.
- `npm run test:ci` = lint + typecheck + unit + build - те, що ганяє CI.
- `npm run dev` - порт 5173 без `--host`; `npm run preview` - 4173.
- `test:e2e*` потребує `.env/.env.test` (локально нема); `test:e2e:pages` - project `page-load` без Supabase. Без `E2E_BASE_URL` Playwright сам збирає і запускає preview на `:4173` (`reuseExistingServer: !CI` - локальний процес перевикористовується); задай `E2E_BASE_URL`, щоб тестувати вже запущений сервер.
- `deploy:{stage,prod}` - `npx netlify-cli` alias / prod.

CI - `.github/workflows/ci.yml`: паралельні jobs `lint`/`typecheck`/`unit` (`test:unit:coverage`)/`build`/`page-load` (`test:e2e:pages` з dummy Supabase-кредами) на кожен run; `e2e` - тільки коли задані E2E-секрети; `deploy` на `main` бере `dist` з артефакту `build` (checkout + `npm ci` лишаються - Netlify CLI бандлить `netlify/functions` з репо), якщо всі перевірки пройшли (`e2e` може бути skipped) і є Netlify-секрети.

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
Міграції в `supabase/migrations/` накатуються вручну через Supabase SQL Editor або Management API, у порядку номерів файлів. Таблиці:
- `rooms (id text PK, slug text unique, name text, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms, poll_question)`
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, shields text[], created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, deck_preset, created_at)`
- `user_profiles (user_id uuid PK, avatar_style, avatar_seed, avatar_url, updated_at)`

RLS зараз public read/write для anon key; логіка в клієнті. Виняток - `user_profiles`: select лишається public, а insert/update (`014`) тільки `to authenticated` для власного рядка (`auth.uid() = user_id`); `avatar_url` (`015`) зберігає лише відносний шлях, check-констрейнт - точно `user_id || '/avatar.webp'` (абсолютний URL вказував би на довільний `*.supabase.co` проєкт), `avatar_style` - check-констрейнт до трьох DiceBear-стилів. `leave` і `kick` - soft-delete через `left_at`; UI працює з `left_at is null`.

Кастомні аватарки (спека - `docs/specs/2026-08-02-custom-avatar-upload-design.md`, міграції `012`–`015`):
- Storage bucket `avatars`: public read; select/insert/update/delete `to authenticated` лише для об'єкта `name = auth.uid() || '/avatar.webp'` (щоб бакет не був безкоштовним хостингом). SELECT-політика обов'язкова - storage-api робить upsert/delete через `returning`. Серверні ліміти бакета дзеркалять клієнтські `AVATAR_MAX_FILE_BYTES` (5 MB) і `AVATAR_ACCEPT` (png/jpeg/webp).
- Фіксований шлях `<user_id>/avatar.webp`, upload з `upsert: true` (без сиріт). Клієнт кропить/стискає до 256×256 WebP (`app/utils/avatarImage.ts`).
- Зняття аватарки: спершу профіль `avatar_url: null`, потім best-effort delete файлу - осиротілий об'єкт перезапишеться наступним upload, тоді як зворотний порядок лишав би всім клієнтам битий `avatar_url`.
- Непорожній `avatar_url` вмикає кастомний рендер (`avatarSrcFor()` в `useDylanAvatar.ts`; public URL збирає `avatarDisplayUrl()` через `getPublicUrl()`, кеш-інвалідація `?v=<updated_at>`, offline grayscale через CSS filter). `avatar_style` завжди лишається останнім DiceBear-стилем - fallback і зняття картинки повертають саме його.

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
| `goal_clarity` | `1,2,3,4,5` |

`0` є в усіх небулевих оцінювальних пресетах (не у `voting`/`vote_question`/`goal_clarity`), але деактивований за замовчуванням. `☕` - символ, не SVG. `setDeckPreset()` пише `deck_preset + defaultActive + poll_question` (`preset.defaultQuestion ?? null`); `saveCardDeck()` пише тільки `active_cards`.

`goal_clarity` ("Goal Clarity Score") - фіксоване питання "Наскільки чітко я розумію Sprint Goals?" (`defaultQuestion` на пресеті, не moderator-typed `poll_question`, як у `voting`/`vote_question`); рахується як звичайний числовий пресет (`isNumericPreset` у `roundStats.ts`, `DECK_NAMES` у `room-json.mts`). Після reveal `ResultsArea.vue` показує не PieChart, а кольорове коло з середнім балом (`goalClarityScore` prop): зелене `>3.5`, жовте `3.5-2.5`, червоне `<2.5`; за результатом `≤3.5` - підказка переформулювати ціль/DoD (`results.goalClarityHint`). Деталі - `DESIGN.md` §11.7.

## Round History
`reveal()` оновлює `room_state.phase='revealed'` і пише `round_history` зі snapshot `{player_id,name,vote}[]` тільки коли `votes.length >= 2`. `?` і `☕` рахуються як голоси. Snapshot містить `name`, щоб історія лишалась читабельною після rename/leave. Також зберігає `active_cards`/`deck_preset` знятого раунду. Формули `alignmentScore`/`averageOf` і pipeline графіка узгодженості (`AlignmentTrendsModal.vue`) - `DESIGN.md` §11.3–11.4. Ручного CSV-експорту немає (видалено) - `netlify/functions/room-json.mts` покриває цю потребу.

## Зовнішні інтеграції
`netlify/functions/room-json.mts` - read-only Netlify Function (`path: '/api/*'`, дефолтна `netlify/functions` без явного `[functions]` у `netlify.toml`). Споживач - `agilecharts` (сусідній репо, Nuxt; `server/utils/storypokerFiles.ts`, вкладка "Estimation Trends").
- `GET /api/<roomId|slug>.json` → `{room, rounds:[{id,date,week,deck,average,devAlignment,qaAlignment,voters,votes:[{name,vote,cohort}]}]}` для однієї кімнати
- `GET /api/teams.json` → `{teams:[{room,rounds:[...]}]}` по **всіх** кімнатах у базі
- `votes` - per-player знімок раунду (`cohort: 'DEV'|'QA'` - той самий `isQaPlayer` спліт, що й `devAlignment`/`qaAlignment`) для round-snapshot drill-down в agilecharts. Імена гравців тут не ширші за видимі будь-кому в кімнаті; ендпоінт token-gated.
- Auth: `Authorization: Bearer <STORYPOKER_API_TOKEN>` (env var, server-side only, БЕЗ `VITE_` - ставиться в Netlify site env, не в `/.env/`). Без заголовка чи з неправильним токеном - `401`; токен не заданий на сервері - `500` (`server misconfigured`). Той самий Bearer-патерн, що й `fe-weekly-report.post.ts` у agilecharts.
- Колода в `rounds` визначається `isNumericPreset`-логікою (`scrum`/`fibonacci`/`hours`/`goal_clarity` + legacy `deck_preset=null`); poll-колоди (`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключаються з узгодженості.
- Читає `rooms`+`round_history`+`players` напряму через `@supabase/supabase-js` (той самий `VITE_SUPABASE_*`). Рахунок `alignmentScore`/`averageOf`/DEV-QA split **навмисно продубльований** з `app/utils/alignment.ts`/`roundStats.ts`/`shields.ts` (Netlify bundler не резолвить Vite alias `~/*`) - зміни формул синхронізувати вручну в обох місцях.

## State Management
Pinia stores у `app/stores/`:
- `auth.ts` - Supabase session, sign in/up/out, password reset/update
- `room.ts` - room state, create, reveal, new round, deck, resolve, room name/slug
- `players.ts` - players, optimistic votes, join/rejoin, rename, moderator toggle, set shields, kick/leave, link user
- `presence.ts` - online `Set<playerId>` через Supabase Presence; на `visibilitychange → hidden` закриває канал лише через `AWAY_TIMEOUT_MS` (5 хв), повернення раніше - скасовує таймер
- `profiles.ts` - `user_profiles` cache, fetch/upsert, Realtime applyChange
- `types.ts` - спільні TS interfaces (`Player`, `RoomState`, `RoundHistory`, `RoundHistoryVote`, `ConnectionStatus`); `UserProfile` живе в `profiles.ts`

Stores беруть клієнт через `getSupabase()` з `app/lib/supabase-instance.ts`; `app/main.ts` ініціалізує клієнт через `initSupabase()`. Тести інжектять mock через `setSupabase(mock)`.

## Realtime
`app/pages/[slug].vue` підписується на:
- `players:<roomId>` → `playersStore.applyChange`
- `room_state:<roomId>` → `roomStore.applyChange`
- `rooms:<roomId>` → sync `slug/name`, redirect між id і slug
- `user_profiles:<roomId>` → `profilesStore.applyChange`
- `room:<roomId>` Presence → online players
- `countdown:<roomId>` broadcast (`self:true`) → синхронний відлік перед reveal (initiator викликає `reveal()`) і події слота `slot-spin-start`/`slot-spin-end`/`slot-win`. Hold-to-start UI (silent/dry/wet, `useCountdown.ts`) - `DESIGN.md` §11.6

Після `'reconnecting' → 'online'` (перехід статусу Presence-каналу) виконується reconciliation refetch. Додатково `document.visibilitychange → visible` теж тригерить `fetchInitialData()` незалежно від presence-статусу - Supabase Realtime не переграє `postgres_changes`, пропущені під час розриву з'єднання (згорнута вкладка/додаток, короткий мережевий збій), і цей розрив не завжди проявляється як 'reconnecting' у presence-каналі. Optimistic vote пишеться в `pendingVotes[playerId]`, success/realtime ACK очищає запис, error робить rollback.

## Project Structure
Що не видно з дерева файлів:
- `index.html` - head/meta + inline script теми (застосовує `data-theme`/`data-palette` до завантаження JS)
- `public/_redirects` - `/*  /index.html  200` (SPA fallback, дублюється в `netlify.toml`)
- `app/` - `main.ts` (createApp + pinia + router + i18n + plugins), `router.ts`, `i18n.ts`, `pages/`, `components/`, `composables/`, `stores/`, `lib/` (supabase-instance, registerAppIcons, database.types), `configs/featureFlags.ts` (runtime toggles з localStorage), `utils/`, `i18n/locales/`, `assets/css/main.css`, `assets/icons/`
- `netlify/functions/` - Netlify Functions (`/api/*`)
- `supabase/migrations/*.sql`
- `scripts/` - npm lifecycle hooks (`setup.sh`, `skills.sh`, `clean.sh`, `migrate-test-artifacts.sh`)
- `tests/` - `unit/{stores,utils,components,composables}/` (Vitest), `e2e/` (Playwright), `fixtures/`, `page-objects/`, `support/`; `test-results/` gitignored (`coverage/`, `playwright/`, `playwright-report/`)

## Testing
Unit tests: Vitest + happy-dom, конфіг - окремий `vitest.config.ts` (`include`: `tests/unit/**`, `tests/components/**`, `tests/integration/**`; `passWithNoTests`, setup - `tests/support/setup/vitest.ts`; alias `~` і `@` → `app/`). Наявні тести - у `tests/unit/`; `tests/{a11y,visual,server,integration,components}/` поки лише `.gitkeep`. `coverage/` і `playwright-report/` у корені лишаються в `.gitignore` навмисно як legacy-шляхи. E2E - див. Commands.

## URL Schema
- `/` - home + Recent Rooms
- `/<roomId>` - кімната за 8-символьним id
- `/<slug>` - alias кімнати; якщо slug існує, URL з id редиректиться на slug
- `/login`, `/signup`, `/forgot-password`, `/reset-password` - auth routes
- `/ffc` - Feature Flags console (override з localStorage, key `FEATURE_FLAGS`)

`normalizeRoomSlug()` / `isValidRoomSlug()` приймають 2–32 символи `[a-z0-9-]`, без дефісу на початку/кінці. Нові top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або вводь префікс.

## LocalStorage
- `storypoker_session_<roomId>` - `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms
- `sp-theme` - `light | dark`; `sp-palette` - `classic | cyberdeck | matcha` (повноцінні теми, кожна має light/dark: cyberdeck - неоновий термінал, Geist Mono, гострі кути, неонові рамки/тіні, єдиний дозволений градієнт в appbar; matcha - м'яка округла, Nunito, великі радіуси). Теми задають змінні `--font-app/--font-display/--radius-*/--btn-text/--btn-transform/--paper-border/--card-border/--shadow-*` у `main.css` через `html[data-palette=…][data-theme=…]`; вибір - меню в AppHeader (`PALETTES` з `useTheme.ts`)
- `sp-room-header-<urlParam>` - `{ roomName, playerName }`; сід для AppHeader у `[slug].vue`, щоб при релоаді кімнати хедер малювався одразу у фінальній геометрії (назва кімнати і гравець приходять через 2 round-trip і зсували весь правий кластер). Перезаписується щоразу, коли `currentPlayer` резолвиться
- `sp-lang` - `uk | en`; читається в `app/i18n.ts` при створенні i18n, пишеться з меню мов у AppHeader (`persistLocale()`). Дефолт - `uk`
- `FEATURE_FLAGS` - override flags з `app/configs/featureFlags.ts` (керується на `/ffc`): `countdownEnabled` (hold-to-start відлік перед reveal), `iconsLucide`, `iconsRounded`, `example`
- `sp-side-widget` - `timer | slot`; лівий віджет кімнати перемикається кнопкою в хедері блоку (Timer ↔ SlotMachine). Слот (`DESIGN.md` §11.8, `utils/slotMachine.ts`): 3 барабани, зважена випадковість, джекпот = 3 однакові символи. Спіни на раунд: 3, для `PO`/`SM` - 5 (`spinsPerRound` у `[slug].vue`; скидаються за `round_started_at`). Гейт `canSpinSlot`: `PO`/`SM` завжди, решта лише після власного голосу і поки хтось ще не проголосував. Єдиний видимий іншим ефект - кубик і блимання імені в `PlayerRow.vue` (через broadcast `countdown:<roomId>`)

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
- **Shields:** `app/utils/shields.ts` - роль обирається з `PLAYER_ROLES` через `RolePicker.vue` (спільний селектор у JoinOverlay+PlayerEditModal) на базі `RoleBadge.vue` (те саме відображення у PlayerRow) і пишеться як один shield у `players.shields` через `shieldForRoleTag()` (кастомні - префікс `custom:`); `SHIELD_CATALOG` лишився тільки для лукапу, icon-picker з UI прибрано; `isQaPlayer()` виводить QA-гравців в окрему пилу
- **Consensus:** при QA-розщепленні салют + decision-sound тригерять, якщо **хоча б одна** група (DEV/QA) одноголосна; без QA - всі голоси однакові (≥ 2). Логіка в `utils/resultCelebration.ts → shouldCelebrateGroupedVotes`; sound через `isConsensus` у `pages/[slug].vue`

## Security
- Не друкувати секрети або повні env values; у прикладах - placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` і `STORYPOKER_API_TOKEN` - тільки server-side, ніколи в client bundle

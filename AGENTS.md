# AGENTS.md

Guidance for coding agents (Claude Code, Codex) working with this repository.
`CLAUDE.md` - це import-shim (`@AGENTS.md`); єдине джерело правди - цей файл.

## Communication
- **Language:** Ukrainian (українська мова)
- **Тільки англійська:** `README.md`, commit messages, назви й описи PR, коментарі в PR та issues, коментарі в коді,
  CI-артефакти. Українською лишається спілкування в чаті й внутрішня документація (`AGENTS.md`, `DESIGN.md`, `docs/`).
- **Constraint:** цей файл - ≤ 28 KB, рядок - ≤ 120 символів. Ліміт байтовий, не рядковий: Codex
  обриває збір інструкцій на `project_doc_max_bytes` (default 32 KiB), а `CLAUDE.md` інлайнить цей
  файл цілком, тож кожен байт - always-loaded. Зараз ~27 KB (83% ліміту); нову секцію додавай, лише
  винісши стару в `DESIGN.md` або `docs/`. Детальна продуктова специфікація - `DESIGN.md`.

## Workflow
- **`main` захищений:** тільки PR зі squash-merge; required checks `test` / `page-load` + strict-режим
  і розв'язані коментарі, approve не потрібен. `e2e` не required - скіпається без E2E-секретів.
- **Діаграми - тільки ECharts.** Перед будь-якою роботою з графіками активуй skill `echarts`. Нові діаграми пиши на
  Apache ECharts; `AlignmentTrendsModal.vue` уже мігрований, саморобний SVG лишився тільки в `PieChart.vue` - при дотику
  переписуй на ECharts.

## Project Overview

**Story Poker** - Planning Poker для Agile-команд: кімнати, приховане голосування картами одного з 8 пресетів або
кастомним піднабором, одночасне розкриття, історія раундів, room aliases, авторизація модераторів, профілі з аватарами.

Джерела контексту: `DESIGN.md` (дизайн + audit §10), `docs/roadmap.md` (індекс ініціатив у
`docs/initiatives/`) і `docs/completed.md`, `docs/{plans,specs}/` і legacy
`docs/superpowers/{plans,specs}/` (iter-плани і специфікації), `docs/tasks/` (разові операційні
інструкції), `docs/audits/` (датовані знімки аудитів; індекс - `docs/audits/README.md`).

## Tech Stack

- **Framework:** Vue 3.5 + Vite 8 (Rolldown bundler) SPA, Composition API `<script setup>`; код у `app/`, alias `~` і
  `@` → `app/` (`vite.config.ts` + `vitest.config.ts`)
- **Routing:** `vue-router@5` - явні маршрути в `app/router.ts`, без file-based routing
- **Styling:** Tailwind v4 через `@tailwindcss/vite` (нативний Vite-плагін; без PostCSS/autoprefixer - vendor-prefixing
  робить вбудований Lightning CSS), CSS-first config у `app/assets/css/main.css` (`@theme`, `@utility`, `@custom-variant
  dark`), MUI-like класи там само
  - text utilities з `@theme --color-*`:
    `text-{primary,body,muted,disabled,inverse,danger,success,appbar-{subtle,muted,emphasis}}`
  - bg utilities через `@utility`: `bg-{app,appbar,paper,elevated,overlay,skeleton}`
  - дефолтний `border` зберігає колір `var(--border)` через `@layer base` override (v4 default - `currentColor`);
    `border-input` - явний `@utility`
  - `shadow-{1..4,8}` - значення живуть у `@theme`; `text-mui-{h2,body,table,caption}` - `--text-mui-*` +
    `--line-height`/`--letter-spacing` modifiers
  - button modifiers (compose з `.mui-btn`): `.mui-btn-md` (180×46, `--radius-btn` 23px,
    `--btn-md-bg`/`--btn-md-bg-hover` за палітрою), `.mui-btn-sm`, `.mui-btn-text`,
    `.mui-btn-secondary`
- **State:** Pinia 4 (без auto-imports - явні `from 'pinia'`)
- **Charts:** `echarts` + `vue-echarts` (тільки потрібні модулі через `echarts/core` + `use([...])` заради розміру
  бандла) - графік тренди узгодженості (`AlignmentTrendsModal.vue`)
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **i18n:** `vue-i18n@11` (runtime compilation, `legacy: false`, `globalInjection: true`), локалі
  `app/i18n/locales/{uk,en}.json`
- **PWA:** `vite-plugin-pwa` (Workbox, `autoUpdate`) - manifest і `runtimeCaching` в `vite.config.ts` (не окремий файл);
  splash `theme_color`/`background_color` = `#212121`, узгоджені з `<meta name="theme-color">` в `index.html`
- **UI:** `@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`, єдина offline-колекція);
  `simple-icons:*`/`game-icons:*`/`tabler:*`/`lucide:*` резолвляться через Iconify API; custom collection `app:`
  (`moderator`, `deciding`, `offline`, `leave-room`, `bank`, `town-hall`, `fibonacci`, `scrum`) через `addCollection` у
  `app/lib/registerAppIcons.ts`. Іконки рендеряться через `<AppIcon>`, який проганяє назву крізь `mapIconName()`
  (`app/utils/iconMap.ts`): флаг `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову lucide-іконку треба додати в
  `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`. Також `v-wave`, DiceBear, Roboto 300–700
- **Components:** `AppModal` (native `<dialog>`, `app/components/AppModal.vue`) - props `open: boolean, lockDismiss?:
  boolean`, emit `close`, контент загортається в `AppModalPaper` (`style="max-width: …"` задає ширину модалки);
  `AppTooltip` (`app/components/AppTooltip.vue`) - props `side?, sideOffset?`, slots `#trigger` `#content`;
  `useClickOutside` (`app/composables/useClickOutside.ts`) - використовується в AppHeader та PlayerRow для закриття
  dropdown-меню
- **Node/npm:** Node >=24.15.0, npm >=11.12.0

## Common Commands

`package.json` - джерело правди для повного списку скриптів. Тут лише неочевидне:

```bash
npm install          # preinstall → scripts/setup.sh (створює .env/, .agents/, .claude/settings.json)
                     # postinstall → scripts/skills.sh (мережеві npx skills add; skills-lock.json)
npm run test:unit    # канонічний unit-run; `npm test` і `test:unit` - обидва `vitest run`
npm run test:e2e:pages   # public pages load smoke (project page-load, без Supabase)
npm run test:ci      # lint + typecheck + test:unit + build - саме це біжить CI
npm run deploy:{stage,prod}   # Netlify alias / prod deploy
```

CI - `.github/workflows/ci.yml`: `npm ci`, `npm run test:ci`; job `page-load` виконується завжди
(smoke публічних сторінок через `test:e2e:pages` з dummy Supabase-кредами); E2E - тільки коли задані
E2E-секрети; deploy - `npm run build` на `main`, якщо перевірки (включно з `page-load`) пройшли і є
Netlify-секрети.

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

Міграції в `supabase/migrations/` - нумеровані послідовно, накатуються вручну через Supabase SQL
Editor або Management API (не CLI-міграції, тож застосований стан бази не виводиться з репо).
Таблиці:
- `rooms (id text PK, slug text unique, name text, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms,
  poll_question)`
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, shields text[], created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, deck_preset, created_at)`
- `user_profiles (user_id uuid PK, avatar_style, avatar_seed, avatar_url, updated_at)`

RLS зараз public read/write для anon key; логіка в клієнті. Виняток - `user_profiles`: select лишається public, а
insert/update з `014` тільки `to authenticated` для власного рядка (`auth.uid() = user_id`); з `015` `avatar_url`
зберігає лише відносний шлях і обмежений check-констрейнтом до точного `user_id || '/avatar.webp'` (абсолютний URL
вказував би на довільний `*.supabase.co` проєкт), а `avatar_style` - check-констрейнтом до трьох DiceBear-стилів.
`leave` і `kick` - soft-delete через `left_at`; UI працює з `left_at is null`.

Кастомні аватарки: Storage bucket `avatars` (public read; select/insert/update/delete `to authenticated`;
SELECT-політика обов'язкова, бо storage-api робить upsert/delete через `returning`). Міграція `012` додає її і виставляє
серверні ліміти бакета: `file_size_limit = 5242880` (5 MB, як `AVATAR_MAX_FILE_BYTES`) і `allowed_mime_types =
image/png,image/jpeg,image/webp` (як `AVATAR_ACCEPT`); `013` звужує всі чотири політики з «своя тека» до єдиного
дозволеного об'єкта `name = auth.uid() || '/avatar.webp'`, щоб бакет не був безкоштовним хостингом. Фіксований шлях
`<user_id>/avatar.webp` (upload з `upsert: true`, без сиріт). Зняття аватарки пише профіль (`avatar_url: null`) першим,
а видалення файлу робить best-effort - осиротілий об'єкт перезапишеться наступним upload, тоді як зворотний порядок
лишав би всім клієнтам битий `avatar_url`. Клієнт кропить/стискає до 256×256 WebP (`app/utils/avatarImage.ts`),
непорожній `avatar_url` (відносний шлях `<user_id>/avatar.webp`) вмикає кастомний рендер (`avatarSrcFor()` в
`useDylanAvatar.ts`; public URL збирає `avatarDisplayUrl()` через `getPublicUrl()`, кеш-інвалідація `?v=<updated_at>`,
offline grayscale через CSS filter), а `avatar_style` завжди лишається останнім DiceBear-стилем - fallback і зняття
картинки повертають саме його. Спека - `docs/specs/2026-08-02-custom-avatar-upload-design.md`.

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

`0` є в усіх небулевих оцінювальних пресетах (не у `voting`/`vote_question`/`goal_clarity`), але деактивований за
замовчуванням. `☕` - символ, не SVG. `setDeckPreset()` пише `deck_preset + defaultActive + poll_question`
(`preset.defaultQuestion ?? null`); `saveCardDeck()` пише тільки `active_cards`.

`goal_clarity` ("Goal Clarity Score") - фіксоване питання "Наскільки чітко я розумію Sprint Goals?" (`defaultQuestion`
на пресеті, не moderator-typed `poll_question`, як у `voting`/`vote_question`); рахується як звичайний числовий пресет
(`isNumericPreset` у `roundStats.ts`, `DECK_NAMES` у `room-json.mts`). Після reveal `ResultsArea.vue` показує не
PieChart, а кольорове коло з середнім балом (`goalClarityScore` prop): зелене `>3.5`, жовте `3.5-2.5`, червоне `<2.5`;
за результатом `≤3.5` - підказка переформулювати ціль/DoD (`results.goalClarityHint`).

## Round History

`reveal()` оновлює `room_state.phase='revealed'` і пише `round_history` зі snapshot `{player_id,name,vote}[]` тільки
коли `votes.length >= 2`. `?` і `☕` рахуються як голоси. Snapshot містить `name`, щоб історія лишалась читабельною після
rename/leave. Також зберігає `active_cards`/`deck_preset` знятого раунду. Формули `alignmentScore`/`averageOf` і
pipeline графіка узгодженості (`AlignmentTrendsModal.vue`) - `DESIGN.md` §11.3–11.4. Ручного CSV-експорту немає
(видалено) - `netlify/functions/room-json.mts` покриває цю потребу.

## Зовнішні інтеграції

`netlify/functions/room-json.mts` - read-only Netlify Function (`path: '/api/*'`, дефолтна `netlify/functions` без
явного `[functions]` у `netlify.toml`):
- `GET /api/<roomId|slug>.json` → `{room,
  rounds:[{id,date,week,deck,average,devAlignment,qaAlignment,voters,votes:[{name,vote,cohort}]}]}` для однієї кімнати
- `GET /api/teams.json` → `{teams:[{room,rounds:[...]}]}` по **всіх** кімнатах у базі

`votes` - per-player знімок раунду (`name`+`vote`+`cohort: 'DEV'|'QA'`, той самий `isQaPlayer` спліт, що й
`devAlignment`/`qaAlignment`) - додано для round-snapshot drill-down в agilecharts (клік по точці графіка → хто як
голосував). Імена гравців тут не ширші за те, що й так видно будь-кому, хто заходить у кімнату; ендпоінт і так
token-gated.

Захищено shared-secret: `Authorization: Bearer <STORYPOKER_API_TOKEN>` (env var, server-side only, БЕЗ `VITE_` префіксу
- ставиться в Netlify site env, не в `/.env/`). Без заголовка чи з неправильним токеном - `401`; якщо
`STORYPOKER_API_TOKEN` не заданий на сервері - `500` (`server misconfigured`). Той самий Bearer-патерн, що й
`fe-weekly-report.post.ts` у agilecharts - саме agilecharts (`server/utils/storypokerFiles.ts`) додає цей заголовок на
кожен запит.

Колода в `rounds` визначається автоматично (`isNumericPreset`-логіка: `scrum`/`fibonacci`/`hours`/`goal_clarity` +
legacy `deck_preset=null`), poll-колоди (`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключаються з
узгодженості. Читає `rooms`+`round_history`+`players` напряму через `@supabase/supabase-js` (той самий
`VITE_SUPABASE_*`), рахунок `alignmentScore`/`averageOf`/DEV-QA split - навмисно продубльований з
`app/utils/alignment.ts`/`roundStats.ts`/`shields.ts` (Netlify bundler не резолвить Vite alias `~/*`) - зміни формул
синхронізувати вручну в обох місцях. Споживач - `agilecharts` (сусідній репо, Nuxt), вкладка "Estimation Trends"
(`app/components/team/TeamConsistencyTrends.vue`).

## State Management

Pinia stores у `app/stores/`:

- `auth.ts` - Supabase session, sign in/up/out, password reset/update
- `room.ts` - room state, create, reveal, new round, deck, resolve, room name/slug
- `players.ts` - players, optimistic votes, join/rejoin, rename, moderator toggle, set shields, kick/leave, link user
- `presence.ts` - online `Set<playerId>` через Supabase Presence; на `visibilitychange → hidden` закриває канал лише
  через `AWAY_TIMEOUT_MS` (5 хв), повернення раніше - скасовує таймер
- `profiles.ts` - `user_profiles` cache, fetch/upsert, Realtime applyChange
- `types.ts` - спільні TS interfaces (`Player`, `RoomState`, `RoundHistory`, `RoundHistoryVote`, `ConnectionStatus`);
  `UserProfile` живе в `profiles.ts`

Stores беруть клієнт через `getSupabase()` з `app/lib/supabase-instance.ts`; `app/main.ts` ініціалізує клієнт через
`initSupabase()`. Тести інжектять mock через `setSupabase(mock)`.

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

## Project Structure

Дерево виводиться з `ls`; тут - лише межі й неочевидне:

- `app/` - весь клієнтський код, alias `~` і `@` → `app/`. Підтеки за призначенням: `pages/`
  (маршрути з `router.ts`), `components/`, `composables/`, `stores/`, `utils/`, `lib/`
  (`supabase-instance`, `registerAppIcons`, `database.types`), `configs/` (`featureFlags`),
  `i18n/locales/`, `assets/css/main.css` (весь Tailwind-конфіг і MUI-класи)
- `tests/` - `unit/` під Vitest; `e2e/` під Playwright; `fixtures/`, `page-objects/`, `support/`
- `supabase/migrations/*.sql` - див. §Database
- `netlify/functions/room-json.mts` - див. §Зовнішні інтеграції
- `scripts/` - `clean.sh`, `setup.sh`, `skills.sh`, `migrate-test-artifacts.sh` (npm lifecycle hooks)
- `index.html` - head/meta + inline-скрипт теми (застосовує `data-theme`/`data-palette` до JS)
- `public/_redirects` - `/* /index.html 200`, обов'язковий для SPA-роутингу на Netlify
- `test-results/` - gitignored артефакти (`coverage/`, `playwright/`, `playwright-report/`)

## Testing

Unit tests: Vitest + happy-dom, конфіг - окремий `vitest.config.ts` (`include`: `tests/unit/**`, `tests/components/**`,
`tests/integration/**`; `passWithNoTests`, setup - `tests/support/setup/vitest.ts`). Наявні тести - у
`tests/unit/{stores,utils,components,composables}/` (`tests/{a11y,visual,server,integration,components}/` поки лише
`.gitkeep`). Артефакти - у `test-results/` (`coverage/`, `playwright/`, `playwright-report/`); `coverage/` і
`playwright-report/` лишаються в `.gitignore` навмисно, `scripts/migrate-test-artifacts.sh` (preinstall) переносить їх
зі старих кореневих шляхів. E2E: Playwright у `tests/e2e/`; потребує `.env/.env.test`, якого локально нема - job `e2e` у
CI пропускається без секретів, тож реально біжить лише проєкт `page-load`. Без `E2E_BASE_URL` Playwright сам збирає і
запускає `npm run preview` на `:4173` (`reuseExistingServer: !CI` - локальний процес на 4173 перевикористовується);
задай `E2E_BASE_URL`, щоб тестувати вже запущений сервер.

## URL Schema

- `/` - home + Recent Rooms
- `/<roomId>` - кімната за 8-символьним id
- `/<slug>` - alias кімнати; якщо slug існує, URL з id редиректиться на slug
- `/login`, `/signup`, `/forgot-password`, `/reset-password` - auth routes
- `/ffc` - Feature Flags console (override з localStorage, key `FEATURE_FLAGS`)

`normalizeRoomSlug()` / `isValidRoomSlug()` приймають 2–32 символи `[a-z0-9-]`, без дефісу на початку/кінці. Нові
top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або вводь префікс.

## LocalStorage

- `storypoker_session_<roomId>` - `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms
- `sp-theme` - `light | dark`; `sp-palette` - `classic | cyberdeck | matcha` (повноцінні теми, кожна має light/dark:
  cyberdeck - неоновий термінал, Geist Mono, гострі кути, неонові рамки/тіні, єдиний дозволений градієнт в appbar;
  matcha - м'яка округла, Nunito, великі радіуси). Теми задають змінні
  `--font-app/--font-display/--radius-*/--btn-text/--btn-transform/--paper-border/--card-border/--shadow-*` у `main.css`
  через `html[data-palette=…][data-theme=…]`; inline script у `index.html` застосовує обидва атрибути до завантаження
  JS; вибір - меню в AppHeader (`PALETTES` з `useTheme.ts`)
- `sp-room-header-<urlParam>` - `{ roomName, playerName }`; сід для AppHeader у `[slug].vue`, щоб при релоаді кімнати
  хедер малювався одразу у фінальній геометрії (назва кімнати і гравець приходять через 2 round-trip і зсували весь
  правий кластер). Перезаписується щоразу, коли `currentPlayer` резолвиться
- `sp-lang` - `uk | en`; читається в `app/i18n.ts` при створенні i18n, пишеться з меню мов у AppHeader
  (`persistLocale()`). Дефолт - `uk`
- `FEATURE_FLAGS` - override flags з `app/configs/featureFlags.ts` (керується на `/ffc`): `countdownEnabled`
  (hold-to-start відлік перед reveal), `iconsLucide`, `iconsRounded`, `example`
- `sp-side-widget` - `timer | slot`; лівий віджет кімнати перемикається кнопкою в хедері блоку (Timer ↔ SlotMachine).
  Слот: 3 барабани, зважена випадковість (`utils/slotMachine.ts`), 3 спіни на гравця за раунд (скидаються за
  `round_started_at`), джекпот = 3 однакові символи. Спін гейтиться `canSpinSlot` (`[slug].vue`) - `PO`/`SM` завжди,
  решта лише після власного голосу і поки хтось ще не проголосував. Стан спіну/виграшу транслюється broadcast-каналом
  `countdown:<roomId>` (`slot-spin-start`/`slot-spin-end`/`slot-win`), єдиний видимий ефект - кубик і блимання імені в
  `PlayerRow.vue`. Деталі механіки й анімацій - `DESIGN.md` §11.8

## Code Style

- Без коментарів у коді; імена мають пояснювати поведінку
- 2 пробіли, без табів, один trailing newline
- TypeScript у composables/utils/stores; `<script setup lang="ts">` у Vue SFC
- Без wrapper-абстракцій, які тільки перейменовують функції
- UI-тексти мають проходити через i18n, якщо компонент вже локалізований

## Roles

- **Player:** vote, rename self, set own shields, leave room, **toggle own moderator flag** (self-promote/demote -
  доступно будь-кому, не лише поточному модератору); history/trends/theme/language/widget/slot - без ролевих обмежень
- **Moderator (`is_moderator`, не потребує auth):** reveal, reset votes, last-round toggle, countdown (silent/dry/wet),
  start new round, poll question setup, configure deck, kick players, контролі таймера (reset/pause/resume/±30s) - усе
  гейтиться `v-if="isModerator"` в `CardsArea.vue`/`Timer.vue`, client-side only (RLS `using (true)`)
- **Authorized moderator (`isModerator && user`):** rename room, set slug/name, rename other players + set їхні shields.
  Детальна матриця - `DESIGN.md` §11.1–11.2
- **Shields:** `app/utils/shields.ts` - роль обирається з `PLAYER_ROLES` через `RolePicker.vue` (спільний селектор у
  JoinOverlay+PlayerEditModal) на базі `RoleBadge.vue` (те саме відображення у PlayerRow) і пишеться як один shield у
  `players.shields` через `shieldForRoleTag()` (кастомні - префікс `custom:`); `SHIELD_CATALOG` (групи
  role/focus/stack/qa/lead) лишився тільки для лукапу, icon-picker з UI прибрано; `isQaPlayer()` виводить QA-гравців в
  окрему пилу
- **Consensus:** при QA-розщепленні салют + decision-sound тригерять, якщо **хоча б одна** група (DEV/QA) одноголосна;
  без QA - всі голоси однакові (≥ 2). Логіка в `utils/resultCelebration.ts → shouldCelebrateGroupedVotes`; sound через
  `isConsensus` у `pages/[slug].vue`

## Security

- Не друкувати секрети або повні env values
- У прикладах використовувати placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` - тільки server-side, ніколи в client bundle

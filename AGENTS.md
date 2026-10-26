# AGENTS.md

Guidance for coding agents (Claude Code, Codex) working with this repository.
`CLAUDE.md` - це import-shim (`@AGENTS.md`); єдине джерело правди - цей файл. `CLAUDE.md` чіпати лише при зміні
схеми імпорту, symlink-ів між ними не робити.

## Communication
- **Language:** Ukrainian (українська мова)
- **Тільки англійська:** `README.md`, commit messages, назви й описи PR, коментарі в PR та issues, коментарі в коді,
  CI-артефакти. Українською лишається спілкування в чаті й внутрішня документація (`AGENTS.md`, `DESIGN.md`, `docs/`).
- **Constraint:** бюджет інструкцій Codex - `project_doc_max_bytes`, дефолт 32 KiB на весь ланцюг: файл із
  домівки Codex, цей корінь і всі вкладені `AGENTS.md` від кореня до робочого каталогу. Орієнтир - 28 KiB на
  ланцюг; понад межу збір обривається мовчки. `CLAUDE.md` інлайнить цей файл цілком, тож кожен корінний байт -
  always-loaded. Деталь, що стосується лише одного каталогу, живе у файлі того каталогу (див. Repository map),
  а не тут. Перед додаванням нової секції - винести наявну. Детальна продуктова специфікація - `DESIGN.md`.

## Workflow
- **`main` захищений:** тільки PR зі squash-merge, прямий push заборонено й адмінам (`enforce_admins`); розв'язані
  коментарі, strict-режим вимкнений (оновлювати гілку з `main` не обов'язково), approve не потрібен.
  Required checks - це `name:` job-ів, а не job ids: `Detect secrets` / `Lint` / `Typecheck` / `Unit tests` /
  `Build` / `Public pages load`. `E2E` не required (скіпається без E2E-секретів).
- **Діаграми - тільки ECharts.** Перед роботою з графіками активуй skill `echarts`; деталі - `app/components/AGENTS.md`.
- **Git worktrees:** ізольована робота - через `git-worktree-isolation`; незакомічені зміни основного каталогу не чіпати

## Workflow sequences
Назви - з `ls .claude/skills/`, вигаданих не викликати; `/code-review` і `/security-review` - слеш-команди, не skills.
CI check = `pnpm run test:ci` - обов'язково перед завершенням будь-якої задачі.
- **New feature:** `specify` → `plan-craft` → `implement`; за потреби `typescript` · `echarts` ·
  `web-debug`; тести - `tdd` + `vitest` і/або `web-debug`; фініш - `cr-request` →
  `verify` → CI check
- **Bug / regression:** `debugging` → `tdd` → `verify` → CI check
- **Supabase (DB / Auth / RLS / Storage):** `tdd` → `/security-review` → CI check
- **Refactoring:** `specify` → `tdd` → CI check
- **Received code review:** `cr-received` → (fixes) → `verify` → CI check
- **Prose (docs, README, UI copy, commits):** `dashfix` · `negafix`
- **Закриття гілки:** `finalize`

## Project Overview
**Story Poker** - Planning Poker для Agile-команд: кімнати, приховане голосування картами одного з 8 пресетів або
кастомним піднабором, одночасне розкриття, історія раундів, room aliases, авторизація модераторів, профілі з аватарами.

Джерела контексту: `DESIGN.md` (дизайн + audit §10, механіки §11), `docs/roadmap.md` (індекс ініціатив у
`docs/initiatives/`) і `docs/completed.md`, `docs/{plans,specs}/` і legacy `docs/superpowers/{plans,specs}/` (iter-плани
і специфікації), `docs/tasks/` (разові операційні інструкції), `docs/audits/` (датовані знімки аудитів; індекс -
`README.md` там само).

## Repository map
Вкладені `AGENTS.md` завантажуються за розташуванням файлу, який редагуєш (Claude Code - on-demand, Codex - лише
якщо cwd усередині). Стартуючи з кореня, відкривай потрібний файл явно.

| Scope | Що всередині | Інструкції |
| --- | --- | --- |
| `app/` | Vue SPA; хаб зі scope map і інваріантами | `app/AGENTS.md` |
| `app/assets/` | Tailwind v4 CSS-first config, MUI-класи, 3 палітри | `app/assets/AGENTS.md` |
| `app/components/` | AppModal/AppTooltip, іконки, ECharts, слот-віджет | `app/components/AGENTS.md` |
| `app/pages/` | маршрути, Realtime-підписки, reconciliation | `app/pages/AGENTS.md` |
| `app/stores/` | Pinia: auth/room/players/presence/profiles | `app/stores/AGENTS.md` |
| `app/utils/` | колоди карт, shields, формули узгодженості | `app/utils/AGENTS.md` |
| `supabase/` | схема таблиць, міграції, RLS, Storage-бакет | `supabase/AGENTS.md` |
| `netlify/` | read-only `/api/*` функція, Bearer-токен | `netlify/AGENTS.md` |
| `tests/` | Vitest unit + Playwright e2e | `tests/AGENTS.md` |
| `scripts/` | lifecycle hooks, skills (`\ <name>` - навмисно вимкнений), генератор іконок | `scripts/AGENTS.md` |

Решта: `public/_redirects` (`/* /index.html 200`, обов'язковий для SPA-роутингу
на Netlify), `index.html` (head/meta + inline-скрипт теми), `test-results/` (gitignored артефакти).

## Tech Stack
- **Framework:** Vue 3.5 + Vite 8 (Rolldown bundler) SPA, Composition API `<script setup>`; код у `app/`
- **Routing:** `vue-router@5`; **State:** Pinia 4; **i18n:** `vue-i18n@11`, локалі `app/i18n/locales/{uk,en}.json`
- **Styling:** Tailwind v4 через `@tailwindcss/vite`, CSS-first config - `app/assets/css/main.css`
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **PWA:** `vite-plugin-pwa` (Workbox, `prompt`) - manifest і `runtimeCaching` в `vite.config.ts` (не окремий
  файл); нову версію застосовує `app/pwa.ts` за правилами `useAppUpdate` (прихована вкладка, простій, тост);
  `skipWaiting: true` і `importScripts: ['sw-reload-clients.js']` (`public/`: новий worker при активації
  перезавантажує вкладки, бо старий `autoUpdate`-бандл сам не перезавантажується) - тимчасово, прибрати
  наступним релізом разом із винятком у `scripts/audit-icon-build.ts`;
  splash `theme_color`/`background_color` = `#212121`, узгоджені з `<meta name="theme-color">` в `index.html`
- **UI:** локальні іконки через CSS mask (`app/components/AGENTS.md`), `v-wave`, DiceBear, Roboto 300-700;
  **Charts:** `echarts` + `vue-echarts`
- **Node/pnpm:** Node >=24.15.0, pnpm >=12.14.0 (`packageManager` у `package.json`)
- **TypeScript лишається 6.x:** TS 7 (Go-порт) не має JS compiler API, на якому стоїть `scripts/icons/scan.ts`
  (`ts.createSourceFile`, падає `icons:check`), а peer `typescript-eslint` - `<6.1.0`; мажор від `ncu` не бери

## Common Commands
`package.json` - джерело правди для повного списку скриптів. Тут лише неочевидне:

```bash
pnpm install         # preinstall → scripts/setup.sh (створює .env/, .agents/, .claude/settings.json)
                     # postinstall → scripts/skills.sh (мережевий skl-x add; skills-lock.json; у CI пропускається)
pnpm run test:unit   # канонічний unit-run; `pnpm test` і `test:unit` - обидва `vitest run`
pnpm run test:e2e:pages   # public pages load smoke (лише page-load; CI-job додає icon-delivery)
pnpm run test:ci     # icons:check + lint + typecheck + test:unit + build - саме це біжить CI
pnpm run deploy:{stage,prod}   # Netlify alias / prod deploy; CLI сам збирає (--no-build вимикає). CLI дефолтить
                     # контекст dev, збірка - production; deploy:prod пінить обидва через --context production
```

CI - `.github/workflows/ci.yml`: паралельні job ids `detect-secrets`/`lint`/`typecheck` (`icons:check` + `typecheck`)/
`unit` (`test:unit:coverage`)/`build`/`page-load` (Playwright-проєкти `page-load` і `icon-delivery` з dummy
Supabase-кредами) на кожен run; `e2e` - тільки коли задані E2E-секрети;
деплою в CI немає. Прод збирає сам Netlify з репо (`netlify.toml`, `command = "pnpm run build"`) зі своїм site env;
job `build` збирає `dist` лише для `icons:audit-build` і з placeholder-кредами, тож шипити його не можна.
`.github/workflows/claude-review.yml` - не required: на не-draft PR після зеленого `CI` (а також на
ready_for_review, запит рев'ю і `workflow_dispatch` з `pr_number`) Claude проходить `cr-request` і лишає PR review
від `so-upstars` (секрети `SO_UPSTARS_PR_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`; модель - repo variable `CLAUDE_REVIEW_MODEL`).
Автоматичний прогін рев'юїть head, коли на PR ще немає рев'ю бота з маркером `<!-- claude-review`, або коли в
`### Summary` останнього такого рев'ю Critical чи Important > 0, воно було на іншому head і таких рев'ю менше 3;
запит рев'ю в `so-upstars` і `workflow_dispatch` обходять цей ліміт, але зелений CI потрібен усім: запит чекає
на нього, а dispatch на незеленому CI лише ставить статус `error`. Мітка `skip-auto-review`
вимикає будь-яке рев'ю PR (і на запит, і dispatch), PR від ботів і від `so-upstars` воркфлоу не рев'юїть.
Скіл `cr-request` береться з `sentimony/agentic-workflow` на SHA з repo variable `REVIEW_SKILLS_REF` (дефолт у
воркфлоу - повний SHA тегу `v0.0.4`, `a5cf04b2…`) і копіюється в `~/.claude/skills`. Дія відновлює `.claude` з
`main` лише на подіях `pull_request`, а не на `workflow_run`/`workflow_dispatch`, тож крок `Prepare review target`
сам прибирає з checkout усі `.claude/` і `CLAUDE.local.md` (вкладені теж), `.mcp.json` і `.claude.json`; base-копії
`.claude/` теж (вкладена тека теж вантажиться), обидві сторони змін є в `diff.patch` - це прийнятий компроміс, а не
дефект для рев'ю.
Агент не має shell (`--disallowedTools "Bash"`: read-only команди, як `printenv`, читають env)
і `gh`, читає лише workspace і `~/.claude/skills` (`blockReadsOutsideWorkingDirectories`), `.git/` йому закритий
(`Read(./.git/**)`: в `.git/config` лежить токен дії), а пише лише тіло у файл. Лог, дифф, base-копії, tree і
`pr.json` (опис; рев'ю й коментарі лише OWNER/MEMBER/COLLABORATOR) йому готує `Prepare review target` в
`auto-review-target/`; PR, що трекає цю теку чи `auto-review-out/`, валить job. Job `publish` перевіряє тіло й
свіжість head, а PAT має тільки крок `post` (звіряє, що токен належить `so-upstars`) - гарантія лише для копії з
`main`, прогони `pull_request` беруть воркфлоу з гілки PR. `publish` перевіряє структуру тіла (маркер, підпис
останнім рядком, вердикти й лічильники з `### Summary`, розмір, токеноподібні рядки), а не його зміст: це прийнятий
компроміс, а не дефект для рев'ю - статус дорадчий, рев'ю читає людина;
хід і підсумок - commit status `Claude review` на head PR. Повторне рев'ю - Request / Re-request review у
`so-upstars` (за незеленого CI чекає на зелений). Правки воркфлоу для `workflow_run` діють лише після злиття
(копія з `main`), для `pull_request`-подій - одразу з гілки PR, для `workflow_dispatch` - з ref, на якому його
запущено. Job `review` має групу `concurrency` за номером PR: новіший прогін після гейту (і dispatch чи запит на
тому ж head) скасовує поточне рев'ю, старий head дістає `error`. Постить лише власник статусу (чий URL у
статусі), тож dispatch і авторев'ю одного head, як і новий гейт між перевіркою власника й фінальним статусом
старого прогону, можуть лишити `error` без рев'ю - прийнятий компроміс, а не дефект для рев'ю: хибного рев'ю
немає, Re-request review лікує.
Схвалення PAT в org бачить лише адмін (`so-upstars` - member, API дає `404`); працездатність перевіряй за
прогоном `Claude review` і PR review `so-upstars` з `<!-- claude-review sha=`. GitHub не дає запросити рев'ю в
автора PR, а PR від `so-upstars` воркфлоу пропускає: шлях `review_requested` перевіряй на PR іншого акаунта.

## Environment Setup
`pnpm-lock.yaml` - committed (required for `pnpm install --frozen-lockfile`). Do NOT add it to `.gitignore`.

Усі env-файли - у `/.env/` (gitignored, окрім `*.example`). Vite читає через `envDir: '.env'` у `vite.config.ts`:
`/.env/.env.local` (персональні override), `/.env/.env` (командні defaults), `/.env/.env.test` (креди тестового
Supabase project для Playwright).

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...        # publishable client key
# SUPABASE_SECRET_KEY=...    # server-side only, БЕЗ VITE_ префіксу
```

Клієнтський код читає через `import.meta.env.VITE_*` (тільки `VITE_*` потрапляють у browser bundle).

## URL Schema
- `/` - home + Recent Rooms; `/<roomId>` - кімната за 8-символьним id; `/<slug>` - alias (URL з id редиректиться)
- `/login`, `/signup`, `/forgot-password`, `/reset-password` - auth routes; `/ffc` - Feature Flags console

`isValidRoomSlug()` приймає 1-32 символи `[a-z0-9-]`, без дефісу на початку/кінці; `normalizeRoomSlug()` чистить
рядок, але довжину не перевіряє. Нові top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або
вводь префікс.

## LocalStorage
| Ключ | Значення |
| --- | --- |
| `storypoker_session_<roomId>` | `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms |
| `sp-theme` / `sp-palette` | `light\|dark` / `classic\|cyberdeck\|matcha` - деталі `app/assets/AGENTS.md` |
| `sp-room-header-<urlParam>` | `{ roomName, playerName }` - сід для AppHeader, щоб хедер не стрибав при релоаді |
| `sp-lang` | `uk \| en`; читається в `app/i18n.ts`, пишеться `persistLocale()`. Дефолт - `uk` |
| `sp-side-widget` | `timer \| slot` - деталі `app/components/AGENTS.md` |
| `sp-volume` | `0`-`1`, гучність усіх звуків; дефолт `0` (muted), unmute дає `0.1`. Пише `useSoundVolume()` |
| `FEATURE_FLAGS` | `/ffc` override: `countdownEnabled`, `iconsLucide`, `iconsRounded`, `example` - `app/configs/` |

## Roles
- **Player:** vote, rename self, set own shields, leave room, **toggle own moderator flag** (self-promote/demote -
  доступно будь-кому, не лише поточному модератору); history/trends/theme/language/widget/slot - без ролевих обмежень
- **Moderator (`is_moderator`, не потребує auth):** reveal, reset votes, last-round toggle, countdown (silent/dry/wet),
  start new round, poll question setup, configure deck, kick players, контролі таймера (reset/pause/resume/±30s),
  будильник таймера (інтервал + mute для всієї кімнати) - усе гейтиться `v-if="isModerator"` в
  `CardsArea.vue`/`Timer.vue`, client-side only (RLS `using (true)`)
- **Authorized moderator (`isModerator && user`):** rename room, set slug/name, room background, rename other players + set їхні shields.
  Детальна матриця - `DESIGN.md` §11.1-11.2
- **Shields:** `app/utils/shields.ts` - роль обирається з `PLAYER_ROLES` через `RolePicker.vue` (спільний селектор у
  JoinOverlay+PlayerEditModal) на базі `RoleBadge.vue` (те саме відображення у PlayerRow) і пишеться як один shield у
  `players.shields` через `shieldForRoleTag()` (кастомні - префікс `custom:`); `SHIELD_CATALOG` (групи
  role/focus/stack/qa/lead) лишився тільки для лукапу, icon-picker з UI прибрано; `isQaPlayer()` дає DEV/QA-спліт
  для історії, трендів і API
- **Кола результатів:** після reveal - коло на когорту DEV/BE/FE/SRE/QA (QA = QA+GQA+AQA, завжди показується),
  набір - чіпи «Показувати результати» в «Налаштувати колоду» (`room_state.result_cohorts`, `null` = DEV+QA). DEV увімкнено
  - загальне коло: вимкнені BE/FE/SRE зливаються в нього; DEV вимкнено - голоси DEV і вимкнених ролей приховані, бейдж
  червоний. PO/SM і кастомні - поза колами й трендами; без ролі й ті, хто вийшов, - DEV; у трендах усі розробники - один DEV
  (`resultCohortFor()` у `resultCohorts.ts`, `trendCohorts()` у `shields.ts`)
- **Consensus:** салют + decision-sound, коли хоча б одне коло результатів одноголосне з ≥ 2 голосами. Деталі -
  `app/utils/AGENTS.md`

## Code Style
- Без коментарів у коді; імена мають пояснювати поведінку. 2 пробіли, без табів, один trailing newline
- TypeScript у composables/utils/stores; `<script setup lang="ts">` у Vue SFC
- Без wrapper-абстракцій, які тільки перейменовують функції
- UI-тексти мають проходити через i18n, якщо компонент вже локалізований
- `.vscode/settings.json` у репо навмисно: спільні налаштування VS Code для тіммейтів Scrum Office, щоб проєкт у всіх був налаштований однаково. Особисті на вигляд ключі в ньому - не дефект для рев'ю; змінювати лише за згодою команди

## Security
- Не друкувати секрети або повні env values; у прикладах - placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` і `STORYPOKER_API_TOKEN` - тільки server-side, ніколи в client bundle
  (без `VITE_` префіксу; `STORYPOKER_API_TOKEN` ставиться в Netlify site env, не в `/.env/`)

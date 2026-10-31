# AGENTS.md

Guidance for coding agents (Claude Code, Codex) working with this repository.
`CLAUDE.md` - це import-shim (`@AGENTS.md`); єдине джерело правди - цей файл. `CLAUDE.md` чіпати лише при зміні
схеми імпорту, symlink-ів між ними не робити.

## Communication
- **Language:** Ukrainian (українська мова)
- **Тільки англійська:** `README.md`, commit messages, назви й описи PR, коментарі в PR та issues, коментарі в коді,
  CI-артефакти. Українською лишається спілкування в чаті й внутрішня документація (`AGENTS.md`, `DESIGN.md`, `docs/`).
- **Constraint:** `project_doc_max_bytes` обмежує проєктний ланцюг `AGENTS.md` від кореня до стартового cwd; домашній
  файл Codex до цього бюджету не входить. `.codex/config.toml` задає 64 KiB (стандарт Codex - 32 KiB): недовірений
  проєкт Codex не відкриває, тож цей config діє в кожній сесії. Ланцюжки перевіряй проти `project_doc_max_bytes` з
  `.codex/config.toml`. При перевищенні ліміту Codex мовчки обрізає текст. `CLAUDE.md` інлайнить цей файл цілком,
  тож кожен корінний байт - always-loaded. Деталь, що стосується лише одного каталогу, живе у файлі того каталогу
  (див. Repository map), а не тут. Перед додаванням нової секції - винести наявну. Детальна продуктова
  специфікація - `DESIGN.md`.

## Workflow
- **`main` захищений:** тільки PR зі squash-merge, прямий push заборонено й адмінам (`enforce_admins`); розв'язані
  коментарі, strict-режим вимкнений (оновлювати гілку з `main` не обов'язково), approve не потрібен.
  Required checks - це `name:` job-ів, а не job ids: `Lint` / `Typecheck` / `Unit tests` /
  `Build` / `Public pages load`. E2E і Visual у CI немає: перед squash PR - зелений `pnpm run test:pre-squash`
  локально (colima), squash без нього - лише за рішенням власника.
- **Діаграми - тільки ECharts.** Перед роботою з графіками активуй skill `echarts`; деталі - `app/components/AGENTS.md`.
- **Гілки:** план із сабагентами - одна гілка в основній теці, без git worktree і проміжних squash у `main`, один PR
- **Темп:** у довгому плані комміть і пуш після кожної завершеної задачі, у паузі між сабагентами

## Workflow sequences
Назви - з `ls .claude/skills/`, вигаданих не викликати; `/code-review` і `/security-review` - слеш-команди, не skills.
CI check = `pnpm run test:ci` - app-перевірки, обов'язкові перед завершенням задачі зі змінами в репозиторії.
Після змін reviewer workflow, його helpers або CI окремо запускай parity і Python workflow fixtures;
команди - `.github/AGENTS.md`. Для read-only аудитів дотримуйся обмежень викликаного скіла.
- **New feature:** `specify` → `plan-craft` → `implement`; за потреби `typescript` · `echarts` ·
  `web-debug`; тести - `vitest` і/або `web-debug`; фініш - `cr-request` →
  `verify` → CI check
- **Bug / regression:** `debugging` → `vitest` → `verify` → CI check
- **Supabase (DB / Auth / RLS / Storage):** `vitest` → `/security-review` → CI check
- **Refactoring:** `specify` → `vitest` → CI check
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
Codex фіксує ланцюг `AGENTS.md` від кореня до стартового cwd на початку сесії.
Claude Code підвантажує вкладені `CLAUDE.md`, які імпортують відповідні `AGENTS.md`,
при читанні файлів каталогу. Перед редагуванням відкривай потрібні інструкції явно.

| Scope | Що всередині | Інструкції |
| --- | --- | --- |
| `app/` | React SPA; хаб зі scope map і інваріантами | `app/AGENTS.md` |
| `app/assets/` | Tailwind v4 CSS-first config, міст токенів shadcn, MUI-класи, 3 палітри | `app/assets/AGENTS.md` |
| `app/components/` | AppModal/AppTooltip/AppMenu, shadcn `ui/`, іконки, ECharts, слот | `app/components/AGENTS.md` |
| `app/pages/` | маршрути, Realtime-підписки, reconciliation | `app/pages/AGENTS.md` |
| `app/stores/` | Zustand: auth/room/players/presence/profiles | `app/stores/AGENTS.md` |
| `app/utils/` | колоди карт, shields, формули узгодженості | `app/utils/AGENTS.md` |
| `supabase/` | схема таблиць, міграції, RLS, Storage-бакет | `supabase/AGENTS.md` |
| `netlify/` | read-only `/api/*` функція, Bearer-токен | `netlify/AGENTS.md` |
| `tests/` | Vitest unit + Playwright e2e і `visual` | `tests/AGENTS.md` |
| `scripts/` | lifecycle hooks, skills (`\ <name>` - навмисно вимкнений), генератор іконок | `scripts/AGENTS.md` |
| `.github/` | CI-воркфлоу, авторев'ю `claude-review.yml` | `.github/AGENTS.md` |

Решта: `public/_redirects` (`/* /index.html 200`, обов'язковий для SPA-роутингу
на Netlify), `index.html` (head/meta + inline-скрипт теми), `test-results/` (gitignored артефакти).

## Tech Stack
- **Framework:** React 19 + Vite 8 (Rolldown bundler, `@vitejs/plugin-react`) SPA, функціональні компоненти `.tsx`;
  код у `app/`, хуки - `app/hooks/`
- **Routing:** `react-router@8` (declarative, `app/router.tsx`); **State:** Zustand 5; **i18n:** `i18next` +
  `react-i18next`, локалі `app/i18n/locales/{uk,en}.json`
- **Styling:** Tailwind v4 через `@tailwindcss/vite`, CSS-first config - `app/assets/css/main.css`
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **PWA:** `vite-plugin-pwa` (Workbox, `prompt`) - manifest і `runtimeCaching` в `vite.config.ts` (не окремий
  файл); нову версію застосовує `app/pwa.ts` за правилами `useAppUpdate` (прихована вкладка, простій, тост);
  `skipWaiting: true` і `importScripts: ['sw-reload-clients.js']` (`public/`: новий worker при активації
  перезавантажує вкладки, бо старий `autoUpdate`-бандл сам не перезавантажується) - тимчасово, прибрати
  наступним релізом разом із винятком у `scripts/audit-icon-build.ts`;
  splash `theme_color`/`background_color` = `#212121`, узгоджені з `<meta name="theme-color">` в `index.html`
- **UI:** shadcn/ui (style `base-nova` на `@base-ui/react`) у `app/components/ui/`, локальні іконки через CSS mask
  (`app/components/AGENTS.md`), ripple - власний хук `useRipple`, DiceBear, Roboto 300-700;
  **Charts:** `echarts` через `echarts/core` і хук `useEChart`
- **Node/pnpm:** Node >=24.15.0, pnpm >=12.14.0 (`packageManager` у `package.json`)
- **TypeScript 7, пін точно `7.0.2`:** `scripts/icons/scan.ts` стоїть на нестабільному `typescript/unstable/*` - версію
  піднімай лише з зеленим `icons:check`. Нативний `tsc` - optional-пакет `@typescript/typescript-<platform>`: install
  без optional deps лишає без нього typecheck і сканер. Lint - `oxlint --type-aware` (`oxlint-tsgolint`), ESLint немає

## Common Commands

Перед локальними перевірками запускай `sh scripts/check-local.sh`: wrapper
перевіряє Node до виклику pnpm і задає `CI=1`, щоб auto-install не запускав
видалення локальних скілів через postinstall. Змінюй версію Node до wrapper;
не викликай його через pnpm, який може почати auto-install раніше за перевірку.

`package.json` - джерело правди для повного списку скриптів. Тут лише неочевидне:

```bash
pnpm install         # preinstall → scripts/setup.sh (створює .env/, .agents/, .claude/settings.json)
                     # postinstall → scripts/skills.sh (мережевий skl-x add; skills-lock.json; у CI пропускається)
pnpm run test:unit   # канонічний unit-run; `pnpm test` і `test:unit` - обидва `vitest run`
pnpm run test:e2e:pages   # public pages load smoke (лише page-load; CI-job додає icon-delivery); локально - з
                          # dummy VITE_SUPABASE_* з ci.yml, деталі `tests/AGENTS.md`
pnpm run test:visual [<ref>]   # рендер <ref> (дефолт origin/main) - еталон для дерева; локально - у контейнері Playwright
pnpm run test:pre-squash [<ref>]   # перед squash: локальний Supabase + e2e chromium/webkit + visual проти <ref>
                                   # (дефолт merge-base з origin/main) у контейнері Playwright; звіти - test-results/pre-squash
pnpm run test:ci     # app-частина CI: icons:check + lint + typecheck + test:unit + build + icons:audit-build
                     # parity і Python workflow fixtures запускаються окремо; команди - .github/AGENTS.md
pnpm run deploy:{stage,prod}   # Netlify alias / prod deploy; CLI сам збирає (--no-build вимикає). CLI дефолтить
                     # контекст dev, збірка - production; deploy:prod пінить обидва через --context production
```
Stage і локальний запуск ходять в одну прод-базу Supabase: до злиття не запускай `deploy:stage` без рішення
власника й не міняй схему чи RLS; ручні перевірки - на локальному preview (тестову кімнату створювати можна).

CI - `.github/workflows/ci.yml`. Ціль - кожен job до ~2 хв (рішення власника 2026-10-26), `timeout-minutes` - 4;
перевірку, що виходить за ціль, шардують або переносять у `scripts/pre-squash.sh`, а не піднімають timeout.
На кожен run паралельні job ids `lint`/`typecheck` (`icons:check` + `typecheck`)/`unit`
(`test:unit:coverage`)/ `build`/`page-load` (Playwright-проєкти `page-load` і `icon-delivery` з dummy
Supabase-кредами на Google Chrome раннера через `PLAYWRIGHT_CHANNEL=chrome`: без apt, який зависав на
повільному дзеркалі). Окремий job `review-workflow` (`Review workflow fixtures`) запускає parity self-test і
дві Python unittest suites; він обов'язковий для gate авторевʼю. E2E (лише старт Supabase ~90 с, apt для
WebKit зависав) і Visual винесені з CI в локальний `test:pre-squash` (рішення власника 2026-10-27); Visual
поки нестабільний, його збій - не дефект для рев'ю; деплою в CI немає. Прод збирає сам Netlify з репо
(`netlify.toml`, `command = "pnpm run build"`) зі своїм site env; job `build` збирає `dist` лише для
`icons:audit-build` і з placeholder-кредами, тож шипити його не можна.
`.github/workflows/claude-review.yml` - не required авторев'ю PR від `so-upstars`; механіка, гейт, права агента й
прийняті компроміси - `.github/AGENTS.md`.

## Environment Setup
`pnpm-lock.yaml` - committed (required for `pnpm install --frozen-lockfile`). Do NOT add it to `.gitignore`.
Peer Vite-плагіна, який імпортує його віртуальний модуль (`virtual:pwa-register` → `workbox-window`), став прямою
`devDependency`: pnpm peer-и не hoist-ить. Збірку як у CI відтворюй у чистому worktree з
`pnpm install --frozen-lockfile --ignore-scripts`; `test:ci` там запускай з placeholder-кредами job `build`
(`VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_KEY=placeholder`): без `.env/` `icons:audit-build`
падає, бо клієнт Supabase вирізається з бандла.

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
рядок, але довжину не перевіряє. Нові top-level routes перетинаються з `[slug].tsx`; додавай явну сторінку або
вводь префікс.

## LocalStorage
| Ключ | Значення |
| --- | --- |
| `storypoker_session_<roomId>` | `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms |
| `sp-theme` / `sp-palette` | `light\|dark` / `classic\|cyberdeck\|matcha` - деталі `app/assets/AGENTS.md` |
| `sp-room-header-<urlParam>` | `{ roomName, playerName }` - сід для AppHeader, щоб хедер не стрибав при релоаді |
| `sp-lang` | `uk \| en`; читається в `app/i18n.tsx`, пишеться `persistLocale()`. Дефолт - `uk` |
| `sp-side-widget` | `timer \| slot` - деталі `app/components/AGENTS.md` |
| `sp-volume` | `0`-`1`, гучність усіх звуків; дефолт `0` (muted), unmute дає `0.1`. Пише `useSoundVolume()` |
| `FEATURE_FLAGS` | `/ffc` override: `countdownEnabled`, `iconsLucide`, `iconsRounded`, `example` - `app/configs/` |

## Roles
- **Player:** vote, rename self, set own shields, leave room, **toggle own moderator flag** (self-promote/demote -
  доступно будь-кому, не лише поточному модератору); history/trends/theme/language/widget/slot - без ролевих обмежень
- **Moderator (`is_moderator`, не потребує auth):** reveal, reset votes, last-round toggle, countdown (silent/dry/wet),
  start new round, poll question setup, configure deck, kick players, контролі таймера (reset/pause/resume/±30s),
  будильник таймера (інтервал + mute для всієї кімнати) - усе гейтиться `isModerator` у
  `CardsArea.tsx` і prop `canControl={isModerator}` у `Timer.tsx`, client-side only (RLS `using (true)`)
- **Authorized moderator (`isModerator && user`):** rename room, set slug/name, room background, rename other players + set їхні shields.
  Детальна матриця - `DESIGN.md` §11.1-11.2
- **Shields:** `app/utils/shields.ts` - роль обирається з `PLAYER_ROLES` через `RolePicker.tsx` (JoinOverlay +
  PlayerEditModal) на базі `RoleBadge.tsx` і пишеться в `players.shields` як один shield через `shieldForRoleTag()`;
  кастомні ролі мають префікс `custom:`, навіть коли назва збігається зі стандартною роллю.
  `SHIELD_CATALOG` (role/focus/stack/qa/lead) лишився для лукапу, icon-picker прибрано. Сиру роль визначає
  `voteCohortFor()` у
  `app/utils/resultCohorts.ts`; без ролі й ті, хто вийшов, - DEV
- **Кола результатів:** порядок - DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM. Чіпи «Показувати результати» в
  «Налаштувати колоду»: DEV/BE/FE/SRE перемикаються, QA/GQA/AQA/PO/SM завжди увімкнені й заблоковані.
  `room_state.result_cohorts`: `null` = чотири чіпи розробників, `[]` = жодного; старе значення `QA` ігнорується.
  DEV увімкнено - вимкнені BE/FE/SRE зливаються в нього; DEV вимкнено - голоси DEV і вимкнених ролей приховані,
  бейдж червоний. Кастомні ролі - поза колами й рольовими трендами; коли голосували лише вони - одне загальне коло.
  Історія, тренди, головна й нові поля API беруть сиру роль незалежно від чіпів. Загальний бал - пул оцінювачів
  DEV/BE/FE/SRE/QA/GQA/AQA; без їхніх голосів - усі голоси. Головна й тренди беруть числові раунди.
  Формули - `app/utils/AGENTS.md`, legacy-контракт API для agilecharts - `netlify/AGENTS.md`
- **Consensus:** салют + decision-sound, коли хоча б одне коло результатів одноголосне з ≥ 2 голосами. Деталі -
  `app/utils/AGENTS.md`

## Code Style
- Без коментарів у коді; імена мають пояснювати поведінку. 2 пробіли, без табів, один trailing newline
- TypeScript скрізь: `.ts` у hooks/utils/stores, `.tsx` для компонентів і сторінок
- Без wrapper-абстракцій, які тільки перейменовують функції
- UI-тексти мають проходити через i18n, якщо компонент вже локалізований
- `.vscode/settings.json` у репо навмисно: спільні налаштування VS Code для тіммейтів Scrum Office, щоб проєкт у всіх був налаштований однаково. Особисті на вигляд ключі в ньому - не дефект для рев'ю; змінювати лише за згодою команди

## Security
- Не друкувати секрети або повні env values; у прикладах - placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` і `STORYPOKER_API_TOKEN` - тільки server-side, ніколи в client bundle
  (без `VITE_` префіксу; `STORYPOKER_API_TOKEN` ставиться в Netlify site env, не в `/.env/`)

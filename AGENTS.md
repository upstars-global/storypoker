# AGENTS.md

Guidance for coding agents (Claude Code, Codex) working with this repository.
`CLAUDE.md` - це import-shim (`@AGENTS.md`); єдине джерело правди - цей файл. `CLAUDE.md` чіпати лише при зміні
схеми імпорту, symlink-ів між ними не робити.

## Communication
- **Language:** Ukrainian (українська мова)
- **Тільки англійська:** `README.md`, commit messages, назви й описи PR, коментарі в PR та issues, коментарі в коді,
  CI-артефакти. Українською лишається спілкування в чаті й внутрішня документація (`AGENTS.md`, `DESIGN.md`, `docs/`).
- **Constraint:** кореневий `AGENTS.md` - ≤ 155 рядків, рядок - ≤ 120 символів. Деталь, що стосується лише одного
  каталогу, живе у файлі того каталогу (див. Repository map), а не тут. Перед додаванням нової секції - винести
  наявну. Вкладені `AGENTS.md` - ≤ 200 рядків. Codex обриває збір інструкцій на `project_doc_max_bytes`
  (default 32 KiB), а `CLAUDE.md` інлайнить цей файл цілком, тож кожен корінний байт - always-loaded.
  Детальна продуктова специфікація - `DESIGN.md`.

## Workflow
- **`main` захищений:** тільки PR зі squash-merge; strict-режим, розв'язані коментарі, approve не потрібен.
  Required checks - це `name:` job-ів, а не job ids: `Detect secrets` / `Lint` / `Typecheck` / `Unit tests` /
  `Build` / `Public pages load`. `E2E` не required (скіпається без E2E-секретів).
- **Діаграми - тільки ECharts.** Перед роботою з графіками активуй skill `echarts`; деталі - `app/components/AGENTS.md`.
- **Git worktrees:** ізольована робота - через `using-git-worktrees`; незакомічені зміни основного каталогу не чіпати

## Workflow sequences
Назви - з `ls .claude/skills/`, вигаданих не викликати; `/code-review` і `/security-review` - слеш-команди, не skills.
CI check = `npm run test:ci` - обов'язково перед завершенням будь-якої задачі.
- **New feature:** `scope-triage` → `plan-crafting` → `executing-plans` (незалежні задачі -
  `dispatching-parallel-agents` / `subagent-driven-development`); за потреби `typescript` · `echarts` · `web-debug`;
  тести - `test-driven-development` + `vitest` і/або `web-debug`; фініш - `requesting-code-review` →
  `verification-before-completion` → CI check
- **Bug / regression:** `systematic-debugging` → `test-driven-development` → `verification-before-completion` → CI check
- **Supabase (DB / Auth / RLS / Storage):** `test-driven-development` → `/security-review` → CI check
- **Refactoring:** `scope-triage` → `test-driven-development` → CI check
- **Received code review:** `receiving-code-review` → (fixes) → `verification-before-completion` → CI check
- **Prose (docs, README, UI copy, commits):** `dashfix` · `negafix`
- **Закриття гілки:** `finishing-a-development-branch`

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

Решта: `scripts/` (npm lifecycle hooks), `public/_redirects` (`/* /index.html 200`, обов'язковий для SPA-роутингу
на Netlify), `index.html` (head/meta + inline-скрипт теми), `test-results/` (gitignored артефакти).

## Tech Stack
- **Framework:** Vue 3.5 + Vite 8 (Rolldown bundler) SPA, Composition API `<script setup>`; код у `app/`
- **Routing:** `vue-router@5`; **State:** Pinia 4; **i18n:** `vue-i18n@11`, локалі `app/i18n/locales/{uk,en}.json`
- **Styling:** Tailwind v4 через `@tailwindcss/vite`, CSS-first config - `app/assets/css/main.css`
- **Backend:** Supabase Postgres + Realtime + Presence + Auth
- **PWA:** `vite-plugin-pwa` (Workbox, `autoUpdate`) - manifest і `runtimeCaching` в `vite.config.ts` (не окремий
  файл); splash `theme_color`/`background_color` = `#212121`, узгоджені з `<meta name="theme-color">` в `index.html`
- **UI:** локальні іконки через CSS mask (`app/components/AGENTS.md`), `v-wave`, DiceBear, Roboto 300–700;
  **Charts:** `echarts` + `vue-echarts`
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

CI - `.github/workflows/ci.yml`: паралельні job ids `detect-secrets`/`lint`/`typecheck` (`icons:check` + `typecheck`)/
`unit` (`test:unit:coverage`)/`build`/`page-load` (Playwright-проєкти `page-load` і `icon-delivery` з dummy
Supabase-кредами) на кожен run; `e2e` - тільки коли задані E2E-секрети;
деплою в CI немає. Прод збирає сам Netlify з репо (`netlify.toml`, `command = "npm run build"`) зі своїм site env;
job `build` збирає `dist` лише для `icons:audit-build` і з placeholder-кредами, тож шипити його не можна.

## Environment Setup
`package-lock.json` - committed (required for `npm ci`). Do NOT add it back to `.gitignore`.

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

`normalizeRoomSlug()` / `isValidRoomSlug()` приймають 2–32 символи `[a-z0-9-]`, без дефісу на початку/кінці. Нові
top-level routes перетинаються з `[slug].vue`; додавай явну сторінку або вводь префікс.

## LocalStorage
| Ключ | Значення |
| --- | --- |
| `storypoker_session_<roomId>` | `{ playerId, playerName, lastVisitedAt }` для auto-rejoin і Recent Rooms |
| `sp-theme` / `sp-palette` | `light\|dark` / `classic\|cyberdeck\|matcha` - деталі `app/assets/AGENTS.md` |
| `sp-room-header-<urlParam>` | `{ roomName, playerName }` - сід для AppHeader, щоб хедер не стрибав при релоаді |
| `sp-lang` | `uk \| en`; читається в `app/i18n.ts`, пишеться `persistLocale()`. Дефолт - `uk` |
| `sp-side-widget` | `timer \| slot` - деталі `app/components/AGENTS.md` |
| `sp-volume` | `0`–`1`, гучність усіх звуків; дефолт `0.5`. Читається/пишеться `useSoundVolume()` |
| `FEATURE_FLAGS` | `/ffc` override: `countdownEnabled`, `iconsLucide`, `iconsRounded`, `example` (`featureFlags.ts`) |

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
- **Consensus:** салют + decision-sound при одноголосності з ≥ 2 голосами: з QA-розщепленням - хоча б в одній
  групі (DEV/QA), без нього - серед усіх голосів. Деталі - `app/utils/AGENTS.md`

## Code Style
- Без коментарів у коді; імена мають пояснювати поведінку. 2 пробіли, без табів, один trailing newline
- TypeScript у composables/utils/stores; `<script setup lang="ts">` у Vue SFC
- Без wrapper-абстракцій, які тільки перейменовують функції
- UI-тексти мають проходити через i18n, якщо компонент вже локалізований

## Security
- Не друкувати секрети або повні env values; у прикладах - placeholders
- `SUPABASE_SECRET_KEY` / `sb_secret_...` і `STORYPOKER_API_TOKEN` - тільки server-side, ніколи в client bundle
  (без `VITE_` префіксу; `STORYPOKER_API_TOKEN` ставиться в Netlify site env, не в `/.env/`)

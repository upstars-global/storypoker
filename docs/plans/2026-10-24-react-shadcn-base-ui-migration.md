# Міграція на React + shadcn/ui (Base UI) + TypeScript 7 - implementation plan

**Spec:** docs/specs/2026-10-24-react-shadcn-base-ui-migration-design.md

**Goal:** Story Poker працює на React 19 + shadcn/ui (Base UI) + TS 7 з oxlint. Набір `visual`, знятий з Vue-версії,
проходить на React (оновлені еталони схвалені власником), `pnpm run test:ci` зелений, React-версія злита в `main`
одним PR з гілки міграції.

**Architecture:** Чотири хвилі за частинами спеки. Усі хвилі - одна гілка `2610242233-dev-session` в основній теці й один PR #46 у `main`
без проміжних злиттів. P0 (Tasks 1-6): спершу спайк
найризикованішого (TS 7 API для сканера іконок і type-aware oxlint), потім фреймворко-незалежний набір `visual`, що
бачить застосунок лише через URL, `data-testid`, ролі й підмінену мережу Supabase, тож без змін ганяється і на Vue,
і на React. Кожна наступна хвиля - коміти в ту саму гілку з зеленим CI на push. P1 (Tasks 7-9): спершу видалення Vue, потім React-оболонка, яка тримає зеленим required
`Public pages load` (layout зі skip link, хедер із гучністю, `AppIcon`, `/ffc`; решта маршрутів - заглушки), далі
перемикання на TS 7 і oxlint. P2 (Tasks 10-13): стан і інфраструктура без UI - сторі, i18n, тема/прапори/звук,
PWA, сесії. P3 (Tasks 14-22): shadcn-примітиви на мосту токенів, потім екрани від простих до кімнати, потім
паритет. P4 (Tasks 23-25): зачистка CSS, документація, фінальні ворота й PR у `main`. Хвилі послідовні; всередині
P3 Tasks 16-17 і 20 незалежні після Task 15, решта йде по порядку. Спільний стан між задачами - лише контракти з
Contract спеки. Паралельних агентів план не потребує.

**Stack:** React 19.3, react-dom 19.3, `@base-ui/react` 1.9, shadcn CLI 4.22 (`init -b base`), Tailwind v4
(`@tailwindcss/vite`), Vite 8 + `@vitejs/plugin-react`, vite-plugin-pwa, react-router 8 (declarative), Zustand 5,
react-i18next + i18next, echarts 6 (без `vue-echarts`), Supabase JS 2, TypeScript 7 (`tsc`), oxlint +
`oxlint-tsgolint` (type-aware), Vitest 5 + happy-dom + `@testing-library/react`, Playwright 1.64.1 (образ
`mcr.microsoft.com/playwright:v1.64.1-noble` для `visual`), pnpm 12. Скіли за задачами: `shadcn`,
`frontend-crafting`, `typescript`, `vitest`, `tdd`, `web-debug`, `echarts`.

**Execution:** subagents

## Global constraints

### Decisions

1. **React 19 + shadcn/ui на Base UI.** Беремо повну міграцію на React, а не shadcn-vue на Reka UI: так
   виходить саме та зв'язка, яку просив власник, ціною переписування всього фронтенду. Відкинуто:
   shadcn-vue + Reka - досвід #14 і немає Base UI; лише токени shadcn без примітивів - без shadcn-компонентів.
2. **Одна гілка, один PR.** P0-P4 комітяться в одну гілку в основній теці репо (без worktree), і в `main` іде
   один PR на паритеті без проміжних squash-злиттів. Беремо її, а не співіснування Vue і React у `main`: `main`
   лишається робочим, але гілку треба періодично оновлювати з `main`. Відкинуто: два фреймворки разом - два
   роутери й спільний стан на весь перехід; окремий PR P0 у `main` і інтеграційна гілка з PR-ами хвиль - рішення
   власника 2026-10-25. Кожен push у гілку має зелений CI. Заморозки `main` немає: фікс чи фіча, злиті в `main`
   під час міграції, переносяться в гілку на React; якщо вони змінюють UI, зачеплені еталони перезнімаються в
   гілці за правилом рішення 4.
3. **Візуальний оракул - перші коміти гілки (P0).** Еталони знімаються з Vue-застосунку до видалення Vue, тож
   паритет перевіряється порівнянням, а не на око. Ціна - частину тестової інфраструктури (фікстури, підміна
   Supabase) пишемо до міграції. `visual` - новий не-required CI job `Visual` у контейнері Playwright; до
   required він стає після злиття міграції.
4. **Поріг паритету - `maxDiffPixelRatio: 0.01` на скріншот.** Беремо 1%, а не 0.1%: дрібна різниця
   антиаліасингу Base UI не валить тест, але зміщення, інший колір, радіус чи шрифт ловляться. Відкинуто:
   ручне звірення - не повторюється. Еталон можна оновити лише поштучно: причина й диф описані в PR, оновлення
   діє після явного «так» власника; решта еталонів не змінюється.
5. **Палітри лишаються джерелом правди, shadcn-токени виводяться з них.** Кожен токен shadcn задається через
   наявні змінні палітри, а не навпаки. Так одна палітра не роз'їжджається на два набори, але стилі
   shadcn-компонентів доводиться правити під per-element змінні (`--radius-*`, `--btn-*`, `--paper-border`,
   `--card-border`, `--shadow-*`, шрифти). Нові змінні палітр додавати можна, якщо наявні не змінюють значень.
6. **Тільки TS 7: `tsc` для typecheck, oxlint з type-aware правилами замість ESLint, генератор іконок на
   `typescript/unstable/ast`.** Беремо це, а не TS 6 під alias для старих інструментів: один компілятор, але
   залежність від нестабільного API TS 7 і ще одна міграція (ESLint → oxlint). Правило «TypeScript лишається
   6.x» в `AGENTS.md` свідомо скасовується.
7. **Стек замін:** react-router 8 (declarative mode, явні маршрути) замість vue-router, Zustand замість Pinia,
   react-i18next на тих самих `uk.json`/`en.json`, ECharts через власний хук замість vue-echarts,
   `@testing-library/react` замість `@vue/test-utils`, власний ripple у стилі Material Design замість `v-wave`.
   Відкинуто: TanStack Router + Jotai.
8. **Що стає shadcn-компонентами:** Dialog (зараз AppModal), Tooltip (AppTooltip), DropdownMenu (меню
   AppHeader і PlayerRow), Select (нативний select у налаштуваннях колоди), Button (`.mui-btn*`), Input, Switch.
   Карти, Timer, SlotMachine, PieChart, RoleBadge лишаються власними компонентами. Варіанти shadcn Button,
   Input і Switch будуються на змінних палітр і замінюють `.mui-btn*`; самі `.mui-*` класи видаляються, коли
   ними ніхто не користується. Відкинуто: переводити на shadcn усе, що має схожий компонент, - доменні віджети
   не мають відповідників.
9. **Еталони знімаються в Linux-контейнері Playwright тієї ж версії, що в CI.** Беремо контейнер, а не
   локальний macOS: еталони однакові для CI й розробника, але локальний прогін потребує Docker.

10. **Покриття скріншотів: 1280 і 375 px, ролі звичайного гравця й авторизованого модератора для екранів
    кімнати.** Беремо дві ширини й дві ролі, а не одну: ловиться мобільний layout і рольовий UI, ціною
    ~500 скріншотів і підміни Supabase Auth уже в P0.

11. **Мобільні правки за референсом - окрема частина P5 після паритету, а не в P3.** Беремо окрему частину:
    375-px еталони з P0 лишаються чесним оракулом міграції, а редизайн не змішується з переписуванням. Ціна -
    мобільні екрани спершу переносяться з наявними вадами. У P5 375-px еталони перезнімаються поштучно з
    схвалення власника (Decision 4). Відкинуто: робити мобільні екрани за референсом одразу в P3.

### Out of scope

- Нові функції, редизайн, зміна текстів UI у P0-P4.
- Вимоги до мобільного layout за референсом: вони йдуть в окрему спеку P5.
- Зміни схеми БД, RLS, Netlify-функції.
- SSR, Next.js, React Server Components.
- Видалення тимчасового `sw-reload-clients.js` (окрема задача наступного релізу).
- Заміна ECharts чи DiceBear.

### Security Model

Довірене: рішення власника в сесії, інструкції `AGENTS.md`. Недовірене: вміст npm-пакетів і код, який
генерує shadcn CLI; він переглядається в diff перед комітом, як і будь-яка залежність. Нові залежності
(React, Base UI, shadcn, Zustand, react-router, react-i18next, oxlint, Testing Library) додаються явно й
перелічуються в описі PR. `SUPABASE_SECRET_KEY` і `STORYPOKER_API_TOKEN` лишаються server-side: клієнтський
бандл читає тільки `VITE_*`, `icons:audit-build` перевіряє це далі. Мережеві виклики при збиранні - лише
`pnpm install` і `shadcn add`; візуальні тести працюють на підмінених відповідях Supabase без реальних кредів.

## Review focus

- Підміна Supabase у `visual` не покриває Realtime/Presence: розбіжності поведінки при живих подіях (reconciliation,
  presence-статус, broadcast `countdown:<roomId>`) ловлять лише unit-тести сторів і `critical-flows`.
- Перший кадр: inline-скрипт теми в `index.html` має відпрацювати до React-рендеру; скріншоти знімаються після
  завантаження і спалаху не бачать.
- Порядок фокусу й aria в shadcn Dialog/DropdownMenu/Select на Base UI проти власних Vue-компонентів поза сценаріями
  клавіатурних тестів (Tab-цикл усередині модалки, `aria-describedby`).
- Сумісність localStorage: формати, записані Vue-версією, читаються новим кодом без міграції - особливо
  `storypoker_session_*` і `FEATURE_FLAGS` з невідомими ключами.
- Сканер іконок на нестабільному API TS 7: оновлення `typescript` може його зламати; `icons:check` має падати
  голосно, а не повертати порожній список.
- `icons:audit-build`: бюджет gzip 25 KiB для іконок і відсутність `iconCollections.json` у production graph після
  зміни бандлера на React.
- Продуктивність resize (причина відмови від shadcn-vue в #14) перевіряється лише відсутністю помилок у консолі;
  вимір часу кадру тестом не покритий.

## Files

| File | Change | Task |
| --- | --- | --- |
| `playwright.config.ts` | modified: проєкт `visual` (viewports 1280/375, `maxDiffPixelRatio: 0.01`, `animations: 'disabled'`), окремий `webServer` env з фейковим Supabase URL | 2 |
| `tests/visual/support/fakeSupabase.ts` | new: `page.route` для `**/rest/v1/**`, `**/auth/v1/**`, `**/storage/v1/**`; `page.routeWebSocket` для `**/realtime/v1/**` | 2 |
| `tests/visual/support/scene.ts` | new: `openScene(page, { palette, theme, role, path, viewport })` - localStorage, сесія Supabase, `page.clock` | 2 |
| `tests/fixtures/data/visual-room.json` | new: кімната, `room_state`, гравці, голоси, історія раундів | 2 |
| `tests/visual/public.spec.ts` | new: home, auth-сторінки, `/ffc` | 3 |
| `tests/visual/room.spec.ts` | new: join overlay, кімната до/після reveal, меню AppHeader і PlayerRow | 4 |
| `tests/visual/modals.spec.ts` | new: вісім модалок | 5 |
| `tests/visual/__screenshots__/**` | new: еталони з Linux-контейнера | 6 |
| `.github/workflows/ci.yml` | modified: job `Visual` (Task 6); job `Lint` без ESLint (Task 8) | 6, 8 |
| `.github/workflows/visual-baselines.yml` | new: `workflow_dispatch`, `--update-snapshots`, еталони артефактом | 6 |
| `app/**/*.vue`, `app/App.vue`, `app/main.ts`, `app/router.ts`, `app/i18n.ts`, `app/__preview.ts` | deleted | 7 |
| `app/main.tsx`, `app/App.tsx`, `app/router.tsx` | new: React-вхід, layout, маршрути з URL Schema | 7 |
| `app/components/AppIcon.tsx`, `app/components/AppHeader.tsx`, `app/pages/ffc.tsx` | new: порти для `Public pages load` (хедер спершу з гучністю, тема/мова/палітра - Task 12) | 7, 12 |
| `app/pages/*.tsx` | new: заглушки (Task 7), справжні сторінки (Tasks 16-19) | 7, 16-19 |
| `tests/unit/components/**`, `tests/unit/pages/**` | deleted (Task 7), React-тести (Tasks 15-21) | 7, 15-21 |
| `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html` | modified: plugin-react, `jsx: react-jsx`, вхід `main.tsx` | 7 |
| `package.json`, `pnpm-lock.yaml` | modified: залежності й скрипти | 7, 8, 10, 11, 14 |
| `eslint.config.js` | deleted | 8 |
| `.oxlintrc.json` | new | 8 |
| `scripts/icons/scan.ts` | modified: `.tsx` (Task 7, TS 6), API TS 7 (Task 8) | 7, 8 |
| `tests/unit/utils/iconSubset.spec.ts`, `tests/unit/utils/iconManifest.spec.ts` | modified: кейси `.tsx` | 7, 8 |
| `tests/icon-rendering/**` | modified: React harness (catalog у Task 9, room у Task 21) | 9, 21 |
| `app/stores/*.ts` | modified: Pinia → Zustand | 10 |
| `app/lib/supabase-instance.ts` | unchanged API (`initSupabase`, `getSupabase`, `setSupabase`) | 10 |
| `tests/unit/stores/*.spec.ts`, `tests/support/helpers/fakeSupabase.ts` | modified: Zustand | 10 |
| `app/i18n.ts` → `app/i18n.tsx` | new: i18next, інтерполяція `{`/`}` | 11 |
| `tests/unit/i18n.spec.ts` | modified | 11 |
| `app/composables/*.ts` → `app/hooks/*.ts` | modified: React-хуки (`useTheme`, `useSoundVolume`, `useCountdown`, `useAppUpdate`, `useDylanAvatar`, `useCardLabel`, `useClickOutside`, `useMenuKeyboard`) | 12, 13 |
| `tests/unit/composables/*.spec.ts` → `tests/unit/hooks/*.spec.ts` | modified | 12, 13 |
| `app/pwa.ts`, `tests/unit/pwa.spec.ts` | modified, якщо потрібно для React-тосту | 13 |
| `components.json`, `app/components/ui/*.tsx`, `app/lib/utils.ts` | new: shadcn Base UI (button, input, switch, dialog, tooltip, dropdown-menu, select) | 14 |
| `app/assets/css/main.css` | modified: міст токенів (Task 14), видалення невикористаних `.mui-*` (Task 23) | 14, 23 |
| `app/hooks/useRipple.ts` | new: ripple замість `v-wave` | 14 |
| `app/components/*.tsx` | new: порти компонентів | 15-21 |
| `tests/e2e/page-load.spec.ts` | modified: маршрути × resize без помилок консолі | 22 |
| `tests/e2e/critical-flows.spec.ts`, `tests/page-objects/*.ts` | modified лише за потреби селекторів | 22 |
| `AGENTS.md`, `app/**/AGENTS.md`, `tests/AGENTS.md`, `scripts/AGENTS.md`, `DESIGN.md` | modified: React-стек | 24 |

## Tasks

### Task 1: Спайк TS 7 API і type-aware oxlint

**Files:** none (тимчасова тека поза репо)

**Consumes:** `scripts/icons/scan.ts` (поточний `collectFromScript`), `typescript@7.0.2` exports `./unstable/*`

**Produces:** `Ruling:` у журналі: чим сканер парсить `.tsx` на TS 7 (`typescript/unstable/sync` або
`unstable/ast` + парсер) і як `oxlint --type-aware` знаходить `tsgolint`; або `blocked` з причиною, і тоді
повернення в `specify` за Decision 6.

**Covers:** none (знімає ризик для AC10, AC11)

**Depends on:** none

**Check:** скрипт у тимчасовій теці на TS 7 повертає літерали `'ic:baseline-home'` з `<AppIcon name="ic:baseline-home" />`
і з `const x = cond ? 'ic:a' : 'ic:b'` у `.tsx`; `npx oxlint --type-aware` на тому самому файлі з `no-floating-promises`
знаходить навмисне порушення -> обидва результати є

**Commit:** none (спайк без коміту)

### Task 2: Інфраструктура `visual`

**Files:** `playwright.config.ts`, `tests/visual/support/fakeSupabase.ts`, `tests/visual/support/scene.ts`,
`tests/fixtures/data/visual-room.json`

**Consumes:** схема таблиць (`app/lib/database.types.ts`), формат сесії Supabase Auth у localStorage
(`sb-<ref>-auth-token`), ключі localStorage з `AGENTS.md`

**Produces:** проєкт Playwright `visual` (тільки `tests/visual/**`, Desktop Chrome, `expect.toHaveScreenshot`
з `maxDiffPixelRatio: 0.01` і `animations: 'disabled'`); `openScene(page, { palette, theme, role, path, viewport })`,
де `role: 'guest' | 'player' | 'authorized-moderator'`, `viewport: 1280 | 375`; константи `PALETTES`, `THEMES`,
`VIEWPORTS`. Інваріанти: жоден запит не йде в мережу (непідмінений запит Supabase - помилка тесту), годинник
заморожений на `2026-09-09T09:05:00Z`, `sp-volume=0`, `FEATURE_FLAGS={}`, шрифти дочекані (`document.fonts.ready`).
Сценарії, що мають бути передбачувані: кімната за 8-символьним id і за alias, гравець з/без сесії
`storypoker_session_<roomId>`.

**Covers:** AC4

**Depends on:** Task 1

**RED:** `pnpm exec playwright test --project visual` -> `No tests found`

**GREEN:** `pnpm exec playwright test --project=visual tests/visual/support` -> тест-самоперевірка `openScene`
(атрибути `data-palette`/`data-theme` на `<html>`, нуль непідмінених запитів) passed

**Commit:** `git add -A -- playwright.config.ts tests/visual tests/fixtures/data/visual-room.json`

### Task 3: Скріншоти публічних екранів

**Files:** `tests/visual/public.spec.ts`

**Consumes:** `openScene` (Task 2)

**Produces:** скріншоти `public-<screen>-<palette>-<theme>-<viewport>.png` для `home`, `login`, `signup`,
`forgot-password`, `reset-password`, `ffc`

**Covers:** AC1, AC2

**Depends on:** Task 2

**RED:** `pnpm exec playwright test --project=visual public` -> падає: еталонів немає

**GREEN:** `pnpm exec playwright test --project=visual public --update-snapshots && pnpm exec playwright test --project=visual public` -> 72 passed (локальні еталони, у git не йдуть)

**Commit:** `git add -A -- tests/visual/public.spec.ts`

### Task 4: Скріншоти кімнати й меню

**Files:** `tests/visual/room.spec.ts`

**Consumes:** `openScene`, `visual-room.json` (Task 2)

**Produces:** скріншоти `room-<state>-<role>-<palette>-<theme>-<viewport>.png`: `join` (guest), `voting`, `revealed`
(кола результатів), `header-menu`, `player-menu`; ролі `player` і `authorized-moderator` для всіх, крім `join`

**Covers:** AC1, AC2

**Depends on:** Task 2

**RED:** `pnpm exec playwright test --project=visual room` -> падає: еталонів немає

**GREEN:** те саме з `--update-snapshots`, потім без -> passed

**Commit:** `git add -A -- tests/visual/room.spec.ts tests/fixtures/data/visual-room.json`

### Task 5: Скріншоти модалок

**Files:** `tests/visual/modals.spec.ts`

**Consumes:** `openScene` (Task 2)

**Produces:** скріншоти `modal-<name>-<role>-<palette>-<theme>-<viewport>.png` для `configure-deck`, `history`,
`trends`, `round-snapshot`, `room-background`, `player-edit`, `user-settings`, `auth`; ролі - як у Task 4, модалки
лише для авторизованого модератора знімаються тільки в цій ролі

**Covers:** AC1, AC2

**Depends on:** Task 4

**RED:** `pnpm exec playwright test --project=visual modals` -> падає: еталонів немає

**GREEN:** те саме з `--update-snapshots`, потім без -> passed

**Commit:** `git add -A -- tests/visual/modals.spec.ts`

### Task 6: CI job `Visual` і еталони з контейнера

**Files:** `.github/workflows/ci.yml`, `.github/workflows/visual-baselines.yml`, `tests/visual/__screenshots__/**`

**Consumes:** проєкт `visual` (Tasks 2-5)

**Produces:** job `name: Visual` (`container: mcr.microsoft.com/playwright:v1.64.1-noble`, не required, артефакт
`test-results/` при падінні); воркфлоу `visual-baselines.yml` (`workflow_dispatch`, той самий контейнер,
`--update-snapshots`, артефакт `visual-baselines`). Локально Docker немає, тож еталони беруться лише з цього
артефакту; так само в Tasks 22 і 25.

**Covers:** AC3, AC5

**Depends on:** Task 5

**Check:** `actionlint .github/workflows/ci.yml .github/workflows/visual-baselines.yml` -> без помилок; запуск
`visual-baselines` на гілці P0, коміт артефакту, потім два прогони `CI` на PR у `main` -> `Visual` зелений обидва
рази без змін еталонів

**Commit:** `git add -A -- .github/workflows/ci.yml .github/workflows/visual-baselines.yml tests/visual/__screenshots__`

### Task 7: Vue геть, React-оболонка

**Files:** усі `app/**/*.vue`, `app/main.ts`, `app/router.ts`, `app/__preview.ts`, `tests/unit/components/**`,
`tests/unit/pages/**`, `tests/icon-rendering/RoomHarness.vue`, `tests/icon-rendering/main.ts`, `app/main.tsx`,
`app/App.tsx`, `app/router.tsx`, `app/components/AppIcon.tsx`, `app/components/AppHeader.tsx`, `app/pages/*.tsx`,
`vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `index.html`, `package.json`, `pnpm-lock.yaml`,
`scripts/icons/scan.ts`, `tests/unit/utils/iconSubset.spec.ts`

**Consumes:** URL Schema, `app/utils/*` (без змін), `app/generated/*`

**Produces:** `<App>` з skip link `a[href="#main"]` → `main#main`, `<AppHeader>` з `data-testid="volume-button"` і
`volume-slider`, `<AppIcon name>` з тією самою розміткою `span.sp-icon-root`; маршрути `/`, `/login`, `/signup`,
`/forgot-password`, `/reset-password`, `/ffc`, `/:slug`; `/ffc` - повний порт (перемикачі `#ffc-<flag>`); решта -
заглушка `main#main`. Сканер читає `.ts`/`.tsx` на TS 6 (`ScriptKind.TSX`) і не знає `.vue`. Залежності:
-`vue`, `pinia`, `vue-router`, `vue-i18n`, `vue-echarts`, `v-wave`, `@vitejs/plugin-vue`, `@vue/*`, `vue-tsc`;
+`react`, `react-dom`, `react-router@8`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`,
`@testing-library/react`. `pinia`/`vue-i18n` прибираються тут, бо сторі й i18n до Task 10-11 ніхто не імпортує.
Unit-спеки утиліт лишаються без змін.

**Covers:** AC7, AC13

**Depends on:** Task 6

**RED:** `pnpm exec playwright test --project page-load --project icon-delivery` після видалення Vue -> падає
(немає застосунку)

**GREEN:** `pnpm run icons:check && pnpm exec tsc --noEmit -p tsconfig.json && pnpm run test:unit && pnpm run build && pnpm exec playwright test --project page-load --project icon-delivery` -> усе зелене; `git ls-files '*.vue'` -> порожньо

**Commit:** `git add -A -- app tests/unit tests/icon-rendering vite.config.ts vitest.config.ts tsconfig.json index.html package.json pnpm-lock.yaml scripts/icons`

### Task 8: TypeScript 7 і oxlint

**Files:** `package.json`, `pnpm-lock.yaml`, `eslint.config.js`, `.oxlintrc.json`, `tsconfig.node.json`,
`scripts/icons/scan.ts`, `tests/unit/utils/iconSubset.spec.ts`, `.github/workflows/ci.yml`

**Consumes:** `Ruling` Task 1

**Produces:** `typecheck` = `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tests/icon-rendering/tsconfig.json`
на `typescript@7`; `lint` = `oxlint --type-aware` з правилами, еквівалентними нинішнім (`no-explicit-any` і
`no-unused-vars` з `^_` - warn) плюс react/react-hooks; сканер на API TS 7 за рулінгом Task 1. Пакетів `eslint*`,
`typescript-eslint`, `@vue/*` немає.

**Covers:** AC6, AC9, AC10, AC11

**Depends on:** Task 7

**RED:** новий кейс у `iconSubset.spec.ts` - `.tsx` з тернарним `name` - на сканері TS 6 після бампу до TS 7 ->
`Cannot find module` / помилка імпорту API

**GREEN:** `pnpm run test:ci` -> зелений; `pnpm exec tsc -v` -> `Version 7.`; `pnpm run lint` -> oxlint, 0 errors

**Commit:** `git add -A -- package.json pnpm-lock.yaml eslint.config.js .oxlintrc.json tsconfig.node.json scripts/icons tests/unit/utils .github/workflows/ci.yml`

### Task 9: Harness іконок - catalog на React

**Files:** `tests/icon-rendering/main.tsx`, `tests/icon-rendering/CatalogHarness.tsx`, `tests/icon-rendering/vite.config.ts`,
`tests/icon-rendering/tsconfig.json`, `tests/icon-rendering/visual.spec.ts`

**Consumes:** `AppIcon` (Task 7)

**Produces:** `view=catalog` рендерить усі іконки маніфесту; `view=room` до Task 21 повертає заглушку і його тести
позначені `test.fixme` з посиланням на Task 21

**Covers:** AC13

**Depends on:** Task 8

**RED:** `pnpm run test:icons:harness` -> падає (немає `main.ts`)

**GREEN:** `pnpm run test:icons:harness` -> catalog passed, room - fixme

**Commit:** `git add -A -- tests/icon-rendering`

### Task 10: Сторі на Zustand

**Files:** `app/stores/{auth,room,players,presence,profiles}.ts`, `tests/unit/stores/*.spec.ts`,
`tests/support/helpers/fakeSupabase.ts`, `package.json`, `pnpm-lock.yaml`

**Consumes:** `getSupabase()`/`setSupabase()`, `app/stores/types.ts`

**Produces:** `useAuthStore`, `useRoomStore`, `usePlayersStore`, `usePresenceStore`, `useProfilesStore` (Zustand,
ті самі імена дій і полів, що в Pinia; дії доступні через `useXStore.getState()`). Інваріанти з поточних тестів:
`applyChange()` для insert/update/delete Realtime-payload, reconciliation після reconnect, порядок гравців.

**Covers:** AC18

**Depends on:** Task 9

**RED:** `pnpm run test:unit tests/unit/stores` на переписаних спеках -> падає (сторі ще Pinia/відсутні)

**GREEN:** `pnpm run test:unit tests/unit/stores` -> усі кейси, що були в Vue-версії, passed

**Commit:** `git add -A -- app/stores tests/unit/stores tests/support/helpers package.json pnpm-lock.yaml`

### Task 11: i18n на react-i18next

**Files:** `app/i18n.tsx`, `tests/unit/i18n.spec.ts`, `package.json`, `pnpm-lock.yaml`

**Consumes:** `app/i18n/locales/{uk,en}.json` (без змін), ключ `sp-lang`

**Produces:** `i18n` (i18next, `interpolation: { prefix: '{', suffix: '}', escapeValue: false }`, `fallbackLng: 'uk'`),
`persistLocale(lang)`; локалі не змінюються (у них 11 рядків з `{name}`, плюралів і linked-повідомлень немає)

**Covers:** AC15, AC18

**Depends on:** Task 9

**RED:** `pnpm run test:unit tests/unit/i18n.spec.ts` -> падає

**GREEN:** те саме -> passed, включно з кейсом `sp-lang=en` до ініціалізації; `git diff --stat main -- app/i18n/locales` -> порожньо

**Commit:** `git add -A -- app/i18n.tsx tests/unit/i18n.spec.ts package.json pnpm-lock.yaml`

### Task 12: Тема, палітра, прапори, звук

**Files:** `app/hooks/{useTheme,useSoundVolume,useClickOutside,useMenuKeyboard,useCardLabel,useDylanAvatar}.ts`,
`tests/unit/hooks/*.spec.ts`, `app/components/AppHeader.tsx`, `index.html`, `tests/e2e/page-load.spec.ts`

**Consumes:** `PALETTES`, ключі `sp-theme`, `sp-palette`, `sp-volume`, `FEATURE_FLAGS`

**Produces:** хуки з тими самими поверненими значеннями й побічними ефектами в localStorage, що й composables;
AppHeader отримує меню теми/палітри/мови. Inline-скрипт `index.html` не змінюється.

**Covers:** AC15, AC16, AC18

**Depends on:** Task 11

**RED:** `pnpm run test:unit tests/unit/hooks` -> падає

**GREEN:** те саме -> passed; `pnpm exec playwright test --project page-load` -> passed; тест у `page-load`:
`addInitScript` ставить `sp-palette=cyberdeck`, `sp-theme=light`, перша `DOMContentLoaded` вже має атрибути -> passed

**Commit:** `git add -A -- app/hooks app/composables app/components/AppHeader.tsx tests/unit/hooks tests/unit/composables tests/e2e/page-load.spec.ts index.html`

### Task 13: Таймер, countdown, PWA-оновлення

**Files:** `app/hooks/{useCountdown,useAppUpdate}.ts`, `app/pwa.ts`, `tests/unit/hooks/{useCountdown,useAppUpdate}.spec.ts`,
`tests/unit/pwa.spec.ts`, `tests/unit/swReloadClients.spec.ts`

**Consumes:** `virtual:pwa-register` (стаб у vitest), `public/sw-reload-clients.js` (без змін)

**Produces:** ті самі правила застосування оновлення (прихована вкладка, простій, тост) і countdown silent/dry/wet

**Covers:** AC18

**Depends on:** Task 12

**RED:** `pnpm run test:unit tests/unit/hooks tests/unit/pwa.spec.ts` -> падає

**GREEN:** те саме -> passed

**Commit:** `git add -A -- app/hooks app/composables app/pwa.ts tests/unit/hooks tests/unit/composables tests/unit/pwa.spec.ts`

### Task 14: shadcn на Base UI і міст токенів

**Files:** `components.json`, `app/components/ui/{button,input,switch,dialog,tooltip,dropdown-menu,select}.tsx`,
`app/lib/utils.ts`, `app/assets/css/main.css`, `app/hooks/useRipple.ts`, `package.json`, `pnpm-lock.yaml`

**Consumes:** змінні палітр із `main.css`; скіл `shadcn`

**Produces:** `components.json` з базою `base`, aliases на `~/components/ui` і `~/lib/utils`; токени shadcn
(`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--accent`, `--border`, `--input`,
`--ring`, `--popover`, `--radius`, тіні) визначені через `var(--<палітра>)`; варіанти Button (`md`, `sm`, `text`,
`secondary`), що відтворюють `.mui-btn*`; `useRipple()` з параметрами `v-wave` (currentColor, 0.35 → 0, 400 ms,
ease-out). Встановлення: `pnpm dlx shadcn@latest init -b base` у наявному проєкті, потім `shadcn add` семи
компонентів.

**Covers:** AC8, AC12

**Depends on:** Task 13

**Check:** `grep` по блоку shadcn-токенів у `main.css` не знаходить жодного кольору/радіуса/тіні літералом (лише
`var(...)`) -> 0 збігів; `node -e "console.log(require('./components.json'))"` показує базу `base`;
`pnpm run test:ci` -> зелений

**Commit:** `git add -A -- components.json app/components/ui app/lib/utils.ts app/assets/css/main.css app/hooks/useRipple.ts package.json pnpm-lock.yaml`

### Task 15: Модалка, tooltip, меню на shadcn + клавіатурні тести

**Files:** `app/components/AppModalPaper.tsx`, `tests/unit/components/{AppModal,AppTooltip,PlayerRow}.spec.tsx`,
`app/components/AppHeader.tsx`

**Consumes:** `Dialog`, `Tooltip`, `DropdownMenu` (Task 14); поведінкові кейси з видалених Vue-тестів (`git show main:tests/unit/components/AppModal.spec.ts` тощо)

**Produces:** спосіб використання Dialog з `lockDismiss` (Escape і клік поза модалкою не закривають), зв'язок
`aria-labelledby`/`aria-describedby`; меню AppHeader на DropdownMenu. Порти тих самих кейсів: Enter/Space відкриває,
Escape закриває, фокус повертається на тригер, tooltip має `role="tooltip"` і `aria-describedby`.

**Covers:** AC18, AC21

**Depends on:** Task 14

**RED:** перенесені спеки -> падають (компонентів немає)

**GREEN:** `pnpm run test:unit tests/unit/components` -> passed

**Commit:** `git add -A -- app/components tests/unit/components`

### Task 16: Auth-сторінки

**Files:** `app/pages/{login,signup,forgot-password,reset-password}.tsx`, `app/components/{AuthModal,PasswordInput}.tsx`

**Consumes:** `useAuthStore` (Task 10), `authValidation.ts`, Button/Input (Task 14)

**Produces:** сторінки з тими самими полями, валідацією, редиректами й `data-testid`, що у Vue

**Covers:** AC17

**Depends on:** Task 15

**Check:** `pnpm exec playwright test --project=visual public -g "login|signup|forgot|reset"` локально проти
еталонів з гілки (порівняння лише орієнтовне на macOS) і прогін job `Visual` у PR -> ці скріншоти зелені або
кожна розбіжність винесена на схвалення

**Commit:** `git add -A -- app/pages app/components`

### Task 17: Home і Recent Rooms

**Files:** `app/pages/index.tsx`

**Consumes:** `recentRooms.ts`, `roomId.ts`, сторі

**Produces:** створення кімнати й список Recent Rooms з `storypoker_session_*`

**Covers:** AC17

**Depends on:** Task 15

**Check:** job `Visual` у PR -> `public-home-*` зелені

**Commit:** `git add -A -- app/pages/index.tsx`

### Task 18: Кімната - ядро

**Files:** `app/pages/[slug].tsx`, `app/components/{JoinOverlay,PlayersList,PlayerRow,RoleBadge,RolePicker,CardsArea,ResultsArea,PieChart,AlignmentCard,ConnectionBanner}.tsx`,
`tests/unit/pages/roomPage.spec.tsx`, `tests/unit/components/{CardsArea,ResultsArea,PlayerRow}.spec.tsx`

**Consumes:** сторі (Task 10), shadcn (Task 14), `shields.ts`, `resultCohorts.ts`, `resultCelebration.ts`, `cardDecks.ts`

**Produces:** маршрут `/:slug` з редиректом id → alias, Realtime-підписками й reconciliation як у Vue, auto-rejoin
зі `storypoker_session_<roomId>`; гейти ролей за `DESIGN.md` §11; консенсус-салют. `PieChart` лишається
SVG-портом без переходу на ECharts: перехід змінить вигляд (правило «переписуй при дотику» з
`app/components/AGENTS.md` відкладається до P5 або окремої задачі).

**Covers:** AC14, AC17, AC18

**Depends on:** Task 17

**RED:** `roomPage.spec.tsx` - кейс «сесія з localStorage у форматі Vue повертає гравця під тим самим `playerId`» -> падає

**GREEN:** `pnpm run test:unit tests/unit/pages tests/unit/components` -> passed; job `Visual` -> `room-*` зелені або на схваленні

**Commit:** `git add -A -- app/pages app/components tests/unit/pages tests/unit/components`

### Task 19: Віджети - Timer, SlotMachine, countdown

**Files:** `app/components/{Timer,SlotMachine}.tsx`, `tests/unit/components/{Timer,SlotMachine}.spec.tsx`

**Consumes:** `useCountdown`, `timerAlarm.ts`, `slotMachine.ts`, broadcast `countdown:<roomId>`

**Produces:** перемикання `sp-side-widget`, будильник, ліміт 3 спіни, події `slot-spin-start`/`slot-spin-end`/`slot-win`

**Covers:** AC18

**Depends on:** Task 18

**RED:** перенесені спеки -> падають

**GREEN:** `pnpm run test:unit tests/unit/components` -> passed

**Commit:** `git add -A -- app/components tests/unit/components`

### Task 20: Модалки

**Files:** `app/components/{ConfigureCardDeckModal,HistoryModal,AlignmentTrendsModal,RoundSnapshotModal,RoomBackgroundModal,PlayerEditModal,UserSettingsModal,UpdateBanner}.tsx`,
`app/hooks/useEChart.ts`, `tests/unit/components/{ConfigureCardDeckModal,RoomBackgroundModal,UserSettingsModal}.spec.tsx`

**Consumes:** Dialog/Select/Switch (Task 14), сторі, скіл `echarts`

**Produces:** `useEChart(ref, option)` - init через `echarts/core` + `use([...])`, `resize` на ResizeObserver,
`dispose` на unmount; Select у налаштуваннях колоди (закритий стан збігається з нативним; розбіжність - на схвалення)

**Covers:** AC17, AC18

**Depends on:** Task 15

**RED:** перенесені спеки -> падають

**GREEN:** `pnpm run test:unit tests/unit/components` -> passed; job `Visual` -> `modal-*` зелені або на схваленні

**Commit:** `git add -A -- app/components app/hooks tests/unit/components`

### Task 21: Harness іконок - room

**Files:** `tests/icon-rendering/RoomHarness.tsx`, `tests/icon-rendering/main.tsx`, `tests/icon-rendering/visual.spec.ts`,
`tests/icon-rendering/delivery.spec.ts`

**Consumes:** компоненти кімнати (Tasks 18-20), `fixture.ts`

**Produces:** query-параметри `role`, `view`, `widget`, `paused`, `countdown` як у Vue-harness; `test.fixme` з
Task 9 знято

**Covers:** AC13

**Depends on:** Task 20

**RED:** зняти `fixme` -> тести room падають

**GREEN:** `pnpm run test:icons:harness` -> усі passed

**Commit:** `git add -A -- tests/icon-rendering`

### Task 22: Паритет і перевірка консолі

**Files:** `tests/e2e/page-load.spec.ts`, `tests/visual/__screenshots__/**` (лише схвалені), `tests/e2e/critical-flows.spec.ts`,
`tests/page-objects/*.ts`

**Consumes:** усі екрани (Tasks 16-21)

**Produces:** тест у `page-load`: кожен маршрут з URL Schema (кімната - на фейковому Supabase) без `console.error`
після завантаження і після `setViewportSize` 1280 → 375; таблиця в журналі «стара спека → новий тест» для 42
Vue-спек; список оновлених еталонів, кожен з причиною, дифом і «так» власника

**Covers:** AC17, AC18, AC19, AC20, AC22

**Depends on:** Task 21

**Check:** job `Visual` зелений; `pnpm exec playwright test --project page-load --project icon-delivery` -> passed;
`pnpm exec playwright test --project chromium tests/e2e/critical-flows.spec.ts` з `.env/.env.test` на тестовому
Supabase -> passed; кожна з 42 спек має рядок у таблиці

**Commit:** `git add -A -- tests/e2e tests/page-objects tests/visual/__screenshots__`

### Task 23: Зачистка CSS

**Files:** `app/assets/css/main.css`

**Consumes:** варіанти shadcn Button/Input/Switch (Task 14)

**Produces:** у `main.css` немає `.mui-*` класів без використання в `app/**/*.tsx`

**Covers:** AC17

**Depends on:** Task 22

**Check:** для кожного `.mui-*` селектора з `main.css` `grep -r` по `app/**/*.tsx` -> є використання; job `Visual` -> зелений

**Commit:** `git add -A -- app/assets/css/main.css`

### Task 24: Документація агентів

**Files:** `AGENTS.md`, `app/AGENTS.md`, `app/assets/AGENTS.md`, `app/components/AGENTS.md`, `app/pages/AGENTS.md`,
`app/stores/AGENTS.md`, `app/utils/AGENTS.md`, `tests/AGENTS.md`, `scripts/AGENTS.md`, `DESIGN.md`, `README.md`

**Consumes:** фактичний стан після Tasks 7-23; скіл `maintaining-agent-context`

**Produces:** опис React-стеку, Zustand, react-i18next, shadcn/Base UI, oxlint, TS 7, `visual`; рядок «TypeScript
лишається 6.x» видалено; корінь `AGENTS.md` у межах 28 KiB

**Covers:** AC24

**Depends on:** Task 23

**Check:** `grep -rn "TypeScript лишається 6.x\|vue-tsc\|Pinia\|vue-router\|\.vue\b" AGENTS.md app tests scripts --include=AGENTS.md` -> 0 збігів; `wc -c AGENTS.md` -> ≤ 28672

**Commit:** `git add -A -- AGENTS.md app tests/AGENTS.md scripts/AGENTS.md DESIGN.md README.md`

### Task 25: Фінальні ворота й злиття

**Files:** none

**Consumes:** голова `2610242233-dev-session`

**Produces:** PR #46 `2610242233-dev-session` → `main`

**Covers:** AC23, AC25

**Depends on:** Task 24

**Check:** `pnpm run test:ci` -> зелений; локальний `pnpm run build && pnpm run preview` з голови гілки, дві вкладки на
`localhost`: вхід у кімнату, голос в одній з'являється в другій -> так; CI на PR -> усі required і `Visual` зелені;
без `deploy:stage` і без злиття

**Commit:** none (злиття через `finalize`)

## Execution record

```text
Base: b1966d22e1eff384bac7e46ca056fa9b3aa7836f   Root: /Users/ihororlovskyi/work/github/io-upstars/storypoker   Branch: 2610242233-dev-session
Initial dirty state: .gitignore, AGENTS.md, scripts/skills.sh
Ruling: baseline pnpm run test:ci -> exit 0 on b1966d2 - recorded before Task 1 - none
Ruling: P0 runs in place on 2610242233-dev-session (== origin/main); spec and plan are committed with Task 2 as docs - P0 PR needs them in main for the integration branch - low
Task 1: done - /tmp/ts7-spike (subagent opus): node scripts/demo.ts -> [ic:a, ic:b, ic:baseline-home] from .tsx; oxlint --type-aware -> typescript(no-floating-promises) on src/sample.tsx; rechecked by controller
Ruling: scan.ts on TS 7 parses via typescript/unstable/sync (API + updateSnapshot + program.getSourceFile) with unstable/ast guards (isStringLiteral || isNoSubstitutionTemplateLiteral) and node.forEachChild; one API per scan, close() in finally - TS 7 has no createSourceFile, oxc-parser not needed - medium: unstable/* may change, so typescript pinned exactly
Ruling: TS 7 API spawns native tsc from optional @typescript/typescript-<platform>; installs must keep optional deps - Task 8 adds it to the CI check - medium
Ruling: oxlint --type-aware via oxlint-tsgolint devDependency, no typescript peer needed - verified in /tmp/ts7-spike-nots - low
Task 2: done - (subagent opus) controller rerun: playwright test tests/visual/support --project visual -> 12 passed; lint 0; typecheck 0; page-load+icon-delivery with dummy creds -> 16 passed; bare --list -> 22 tests (no visual)
Ruling: plan commands use --project=visual <filter> - Playwright 1.64.1 reads `--project visual <path>` as several project names - low
Ruling: visual project and its server (port 4174, fixed fake Supabase URL) load only when visual is named in --project, so bare test:e2e and CI e2e keep their old scope; Task 6 must pass --project=visual - medium: argv parsing in playwright.config.ts
Ruling: Google Fonts (fonts.googleapis.com, fonts.gstatic.com) pass through to the network in visual; everything else is blocked - self-hosting fonts changes the app and is out of P0 scope - medium: font CDN drift can move baselines
Deferred: tests/AGENTS.md still describes tests/visual as .gitkeep-only; typecheck does not cover tests/visual/** - Task 24
Task 3: done - (subagent sonnet) controller rerun: playwright test --project=visual public -> 72 passed against local baselines; lint 0; local PNGs stay untracked until Task 6
Task 4: done - (subagent opus) controller rerun: playwright test --project=visual -> 192 passed (72 public + 12 support + 108 room); lint 0
Ruling: room join screenshot is viewport-only, other room states full-page - overlay backdrop covers only the viewport - low
Deferred: room header overflows horizontally at 375 px (full page 463-473 px wide, account button off-screen); current Vue behavior, captured in baselines - P5 mobile spec
Task 5: done - (subagent opus) controller rerun: playwright test --project=visual -> 336 passed (modals 144 incl. 24 trends-chart clips); lint 0; typecheck 0
Round task-5 1: trends screenshot passes at 1% even with chart lines missing; add chart-clipped screenshot and separate DEV/QA lines in fixture
Ruling: trends gets a second screenshot clipped to the ECharts plot area (TRENDS_PLOT_INSET); with clock jump 0 all 24 chart clips fail - full-modal shot misses absent lines at 1% - medium: classic dark margin only 1.1-1.4%, stricter threshold would break Decision 4
Ruling: fixture QA alignment 71 vs DEV 86 in two history rounds (Emery 8->13, 5->8) so both trend lines are visible - only scene.ts reads the fixture - low
Ruling: ECharts animation completes by advancing the frozen clock 5 s and back to FROZEN_NOW in the spec, no app change - low
Task 6: done - actionlint 0; Visual baselines run 40140558827 success; CI run 40140903128 on e86533d attempts 1 and 2 -> Visual success, all required checks success, baselines unchanged
Ruling: Visual project runs with retries 0 so a flaky screenshot cannot pass on retry - low
Ruling: baselines = artifact visual-baselines of run 40140558827 (PR #46, label update-visual-baselines), 348 PNGs, replace local macOS captures - owner approved push and draft PR - low
Ruling: visual-baselines also runs on pull_request labeled update-visual-baselines (job-level if, no concurrency) - workflow_dispatch needs the file on main - low
Ruling: Visual and baselines jobs run in playwright:v1.64.1-noble with --user root, HOME=/root - container defaults to HOME=/github/home - low: confirmed only by a real run
Task 7: done - (subagent opus) commit 3034743; controller rerun with CI dummy VITE_SUPABASE_* : icons:check, typecheck (3 projects), lint 0, test:unit 158 passed, build, icons:audit-build (delta -275849 B gzip), playwright page-load + icon-delivery 16 passed; git ls-files *.vue -> empty
Task 8: done - (subagent opus) commit 31dbdd8; controller rerun: tsc -v -> Version 7.0.2; test:ci exit 0 (oxlint --type-aware 0 errors, 159 unit tests); icons:audit-build passed; page-load + icon-delivery 16 passed; no eslint/@vue packages in package.json
Task 9: done - (subagent opus) commit 88f2d29; controller rerun: test:icons:harness -> 30 passed (24 catalog screenshots), 33 skipped (room view fixme -> Task 21); typecheck 0; lint 0
Task 10: done - (subagent opus) commit c97094c; store specs 65 -> 69 cases, all 65 titles kept; controller rerun: test:ci exit 0, 228 unit tests
Task 11: done - (subagent sonnet) commit e252dcf; i18n spec 3 -> 5 cases incl. sp-lang=en before init; git diff --stat main -- app/i18n/locales empty; controller rerun: test:ci exit 0, 233 unit tests
Task 12: done - (subagent opus) commit b8d878a; hook specs 28 old cases kept, 36 total; controller rerun: test:ci exit 0 (269 unit tests), page-load + icon-delivery 17 passed incl. new init-script palette test; index.html unchanged
Task 13: done - 6324620 + 6ff3ed7 (opus): test:ci exit 0 (281 unit), page-load + icon-delivery 17 passed, no composables in excludes, app/pwa.ts override gone
Task 14: done - 9152423 (opus): test:ci exit 0 (290 unit), page-load + icon-delivery 17 passed, main.css diff additions only + @source {ts,tsx}, tsc 7.0.2, Button computed styles = .mui-btn* in 6 palettes x 2 widths
Task 15: done - 9f287b8 (opus): test:unit components 21 passed, test:ci exit 0 (311 unit), page-load + icon-delivery 17 passed, header menu checked in built preview
Task 16: done - 707c57e; controller rerun: pnpm run test:ci -> exit 0 (329 tests); page-load + icon-delivery -> 17 passed; CI Visual on PR #46 pending
Task 17: done - 0be53b7; controller rerun: pnpm run test:ci -> exit 0 (336 tests); page-load + icon-delivery -> 17 passed
Task 18: done - 7c74a63; controller rerun: pnpm run test:ci -> exit 0 (375 passed, 1 todo); page-load + icon-delivery -> 17 passed; room-* baselines wait for Task 19 (Timer in every room shot)
Task 19: done - a6f7669; controller rerun: pnpm run test:ci -> exit 0 (407 passed, 1 todo); page-load + icon-delivery -> 17 passed; CI Visual run 40213360416 pending
Task 20: done - 3ae6d5d, e3e0e5a; controller rerun: pnpm run test:ci -> exit 0 (445 tests); page-load + icon-delivery -> 17 passed; CI run 40215942021 all green incl. Visual (full set: public, room, modals, scenes)
Task 21: done - 5ef37b3; controller rerun: pnpm run test:icons:harness -> 63 passed; pnpm run test:ci -> exit 0 (445 tests)
Task 22: done - 90428d8 (opus) + 59e8bc4 (controller: AppIcon spec port, dice faces from PlayerRow.tsx); controller rerun: pnpm run test:ci -> exit 0 (449 tests); page-load + icon-delivery -> 26 passed (9 new AC22 console cases); AC20 unverified - missing credentials: .env/.env.test for critical-flows (CI E2E skipped without secrets); no baselines updated
Task 23: done - dbf7c8f, 85c8cf5, c11cf11 (opus); controller rerun: pnpm run test:ci -> exit 0 (440 tests: -11 with removed hooks, +2 new); page-load + icon-delivery -> 26 passed; every remaining .mui-* in main.css has a use in app/**/*.tsx; CI Visual on c11cf11 pending
Task 24: done - 890a2c2, 07bff8e (opus); controller rerun: stale-stack grep over AGENTS.md files -> 0; wc -c AGENTS.md -> 17621 (<= 28672), heaviest chain app/components 27303 B; pnpm run test:ci -> exit 0 (440 tests); CI run on c11cf11 all green incl. Visual (Task 23 CSS cleanup)
Task 25: done - c8b6a3d (baselines in Git LFS), 9cf9668 (merge origin/main #28/#29/#31, ResultsArea hyphen port); CI run 40229322347 on 9cf9668 all green incl. Visual from LFS (E2E skipped, no secrets); local Supabase (colima + supabase start, 20/20 migrations) -> playwright chromium x3 -> 15 passed, full test:e2e in mcr.microsoft.com/playwright:v1.64.1-noble -> 33 passed (critical-flows two browsers: vote, reveal, reset, rename, kick on the built preview = AC20, AC25); pnpm run test:ci -> exit 0 (446 tests); nothing merged or deployed
Ruling: owner decision 2026-10-25 - P0-P4 stay on 2610242233-dev-session in the main checkout, no worktrees, no P0 squash into main, one PR #46 at parity; spec Decisions 2-3 and AC13/20/23/25 updated to match - main fixes during migration get ported into this branch - low
Ruling: Vue-based stores/composables and their specs are excluded in tsconfig.json and vitest.config.ts instead of ported - Tasks 10-13 own the ports - high if forgotten: each of Tasks 10-13 must drop its exclude entries or its RED/GREEN proves nothing
Ruling: AppIcon prop is name (Vue used icon); scanner and iconManifest bindings follow; inputNames unchanged - low
Ruling: eslint-plugin-vue stack kept until Task 8 deletes eslint.config.js - low
Ruling: tests/icon-rendering vite.config.ts and tsconfig.json moved to plugin-react/tsx in Task 7 to keep typecheck green - Task 9 still owns the harness - low
Deferred: @testing-library/dom peer of @testing-library/react not installed - Task 15
Deferred: docs/audits/icon-bundle-baseline.json is stale after the Vue removal (delta -275 KiB) - Task 23
Deferred: playwright.config.ts sets VITE_SUPABASE_* to '' without shell env, so local page-load needs the CI dummy values (pre-existing) - Task 24 docs
Ruling: RED failed with TypeError reading ts.ScriptKind.TSX (TS 7 main export is only lib/version.cjs), not Cannot find module - same cause, different text - low
Ruling: oxlint = correctness at error + react/rules-of-hooks, react/exhaustive-deps warn, typescript/no-floating-promises error, no-explicit-any and no-unused-vars ^_ warn; Task 7 exclude list mirrored in ignorePatterns - Tasks 10-13 remove entries there too - medium
Ruling: per-file overrides for Playwright fixtures ({}, use), generated database.types.ts, deliberate stubs in pwa.spec.ts and swReloadClients.spec.ts, String(unknown) in tests/visual fakeSupabase - test or generated code only - low
Deferred: .oxlintrc.json rules-of-hooks off for app/pwa.ts (useAppUpdate is not a hook yet) - Task 12 removes the override when porting
Deferred: AGENTS.md "TypeScript лишається 6.x", README ESLint mentions, vitest.config.ts __dirname warning - Task 24
Ruling: delivery.spec.ts room-view tests also fixme until Task 21 (they load view=room) - outside Task 9 Files but same cause - low
Deferred: app/assets/css/main.css @source still globs {vue,ts}, not tsx (Tailwind auto-detection covers it today) - Task 14
Ruling: visiblePlayers is a stored field recomputed by usePlayersStore.subscribe on players change - stable array identity for React selectors - low
Ruling: room actions snapshot roomId/roomState via get() at call start instead of re-reading after each await; reveal's history row uses round_started_at/active_cards/deck_preset that reveal itself does not change - low
Ruling: app/stores/AGENTS.md heading and access/reset notes updated with the port - outside Files, belongs to the stores scope - low
Deferred: tests/AGENTS.md still names deleted tests/support/setup/vitest.ts; auth initialized flag and profiles pending-fetch cache are module-level and not reset by resetStores() - Task 24 / when a test needs it
Ruling: fallbackLng uk per plan (Vue had fallbackLocale en) - uk.json and en.json have identical key sets, so no visible difference - low
Ruling: persistLocale also calls i18n.changeLanguage (Vue switched locale at the call site) - callers in Tasks 12/16-19 must not switch twice - low
Ruling: app/main.tsx imports ~/i18n so html lang and i18next init before render - low
Ruling: theme and volume state in Zustand vanilla stores (themeStore, soundVolumeStore) exported for non-component code; stores read localStorage on creation - low
Ruling: header menus share one plain HeaderMenu component (button + list) for Task 15 to swap to Base UI Menu; account menu holds only language items until Tasks 16-18 - low
Ruling: useClickOutside/useMenuKeyboard specs are .spec.tsx (oxlint react(refs)); vitest include and tsconfig include extended to tests/unit/**/*.tsx - low
Ruling: profiles.ts type import moved to ~/hooks/useDylanAvatar; iconManifest gets the header's two dynamic bindings - forced by the composable deletion - low
Deferred: correction - the app/pwa.ts rules-of-hooks override belongs to Task 13 (useAppUpdate), not Task 12 - Task 13
Deferred: App.tsx does not call useTheme init() / initVolume() as App.vue did (inline script covers html attrs today) - Task 13 wires them
Deferred: page-load init-script test reads attrs at the first module script; only valid on the built preview, not the dev server - Task 24 docs
Ruling: Task 13 landed in two commits - the owner asked for periodic /commit-all checkpoints (6324620 also carries the owner's .gitignore, AGENTS.md, scripts/skills.sh edits) - low
Ruling: App.tsx calls soundVolumeStore.getState().initVolume() instead of useSoundVolume() - avoids re-rendering the app on volume change - low
Ruling: useAppUpdate rules live in exported appUpdateStore (pwa.ts calls getState().scheduleUpdate) - low
Deferred: app/AGENTS.md, tests/AGENTS.md, app/components/AGENTS.md, app/pages/AGENTS.md still mention composables - Task 24
Deferred: StrictMode double-mount in dev creates 5 unused Audio objects in useCountdown (cleanup correct) - Task 19
Ruling: components.json has no `base` field; shadcn encodes Base UI as style "base-nova" (`shadcn info --json` -> base: "base") - AC8 checked that way - low
Ruling: :root --radius-input: 4px is the classic palette default (existing var(--radius-input, 4px) fallbacks), not a shadcn token literal - low
Ruling: palette --primary/--border and text utilities --color-primary/--color-muted are kept; shadcn code uses bg-(--primary), bg-(--muted) instead of bg-primary/bg-muted - later ui code must follow - medium
Ruling: init output trimmed (Geist fontsource, base-layer outline-ring/border rules, oklch :root/.dark blocks, chart/sidebar/card tokens) to keep visuals identical - low
Ruling: Button variants default/text/secondary, sizes default/sm/md; useRipple() is a callback ref not attached by Button - low
Deferred: lucide-react icons in ui/dialog, dropdown-menu, select break the local-icon rule (icons:check misses React icons) - Task 15/20 swap to AppIcon
Deferred: shadcn CLI in dependencies only for shadcn/tailwind.css import; consider devDependencies or inlining its variants - Task 23
Deferred: app/lib/utils.ts re-exports cn, unused (components import "cn") - Task 23
Deferred: switch thumb --bg-app vs Vue #fafafa; dialog footer "Close" untranslated - Task 15/20
Deferred: app/assets/AGENTS.md lacks the token bridge description - Task 24
Ruling: owner 2026-10-25 - lucide-react icons inside app/components/ui stay as shadcn generates them; supersedes the lucide Deferred above; rule updated in app/components/AGENTS.md - low
Ruling: PlayerRow.spec ports the keyboard/menu cases against AppMenu/AppMenuItem (PlayerRow comes in Task 18); RoleBadge is-excluded cases owed by Task 18 - low
Ruling: AppModal renders the Base UI popup as <dialog open class="app-modal"> with .mui-modal-overlay inside, modal="trap-focus" (no scroll lock); AppModalPaper close calls onClose directly so it works under lockDismiss - low
Ruling: AppTooltip adds role="tooltip" + aria-describedby itself and keeps the popup mounted (Base UI sets neither) - low
Deferred: tests/visual/room.spec.ts:65 row.getByRole('menu') breaks with the portaled menu - selector fix, not a baseline - Task 18
Deferred: RoleBadge is-excluded cases from the Vue PlayerRow spec - Task 18
Deferred: AppModalPaper onPointerDown stopPropagation may stop Base UI outside-click close for a Select inside a modal - Task 20
Deferred: always-mounted tooltips per PlayerRow - watch resize performance - Task 18
Deferred: useClickOutside, useMenuKeyboard used only by their specs; unused dropdown-menu submenu/checkbox/radio parts - Task 23
Deferred: header menu placement at 375 px under Base UI collision avoidance - Task 22 Visual run
Ruling: app/pages/AuthPageLayout.tsx added outside Task 16 Files - shared header + paper shell of the four auth pages - low
Ruling: signup skips the user redirect while signUp is in flight; page forms submit only via form submit (Vue also fired keyup.enter, double submit) - low
Ruling: auth pages keep native inputs with .mui-input; ui/input.tsx not bridged (its utilities override the floating label) - low
Deferred: forgot-password classic light/dark at 1280 differs 0.02 locally on macOS (caption wraps) - CI Visual run 40208875784 on 0be53b7 passes it (macOS font metrics only) - closed
Deferred: Sign in / Sign up / Sign out items in the AppHeader account menu - Task 18
Deferred: AuthModal not mounted yet; modal-auth-* baselines - Task 18
Deferred: ripple may vanish when the submit label text changes; wrap the label in a span - Task 20
Ruling: react-router 7.18.4 -> 8.5.0 by owner decision 2026-10-25; spec decision 7 updated - v8 breaking changes hit only framework/data mode and react-router-dom, unused here; test:ci exit 0 (329), page-load + icon-delivery 17 passed - low
Ruling: home mounts AppHeader without props; returning player's header avatar seed (headerPlayerName) dropped until the header gets auth/profile props - no baseline covers it - low
Deferred: home headerPlayerName avatar seed, AuthModal and UserSettingsModal on home - Task 18 / Task 20
Ruling: CI Visual run 40208875784 on 0be53b7: 79 passed (all public login/signup/forgot/reset/home, 1280 + 375), 257 failed only in room.spec, modals.spec and room scene self-checks - routes still stubs until Tasks 18-21 - low
Ruling: Task 18 touched AppIcon (aria-label), AppTooltip (className), AppMenu (sideOffset/alignOffset), AppHeader (room/auth/countdown items), router.tsx (no Titled on /:slug), index.tsx (header player name, AuthModal), main.css (confetti + slot-winner blink), iconManifest (2 dynamic entries), room.spec.ts:65 page.getByRole('menu'); PageStub.tsx deleted - deferred items and Vue scoped styles - low
Ruling: ConnectionBanner mounts in the room page, not App.tsx, without fade - Presence runs only in the room; no baseline covers it - low
Deferred: Timer/SlotMachine, side-widget setting, spin counts and outgoing slot broadcasts - Task 19
Deferred: PlayerRow Edit, header History/Trends/Configure deck/Room background/Account settings handlers, save handlers for player edit/deck/alarm/background, roomPage HistoryModal todo - Task 20
Deferred: tests/visual/modals.spec.ts:135 row.getByRole('menuitem') portal selector - Task 20
Deferred: home.spec "creates a room" flaked once (lastVisitedAt off 40 ms under advancing fake time) - failed CI Unit tests on a6f7669; fixed in a97d1e5 (fake only Date) - closed
Deferred: build warns about chunks > 500 kB - Task 23
Ruling: useCountdown mount() reuses Audio objects via ??= instead of lazy creation - countdown needs audio.duration early; StrictMode test added - low
Ruling: Timer reveal duration uses the last 1 s tick (react purity forbids Date.now() in render); alarm firing computed in render, chime from an effect; alarm minutes input uncontrolled, commits on blur/Enter - lint rules; behavior covered by specs - low
Deferred: PO/SM get 5 slot spins per round in Vue code, docs (AGENTS.md, app/components/AGENTS.md, DESIGN.md 11.8) say 3 - kept Vue behavior; fix docs - Task 24
Deferred: authPages.spec flaky "document is not defined" from a useRipple timer after env teardown (1 of 5 runs) - Task 23
Deferred: SlotMachine reel animation unchecked in a real browser - Task 21 harness widget=slot
Ruling: CI Visual run 40213360416 on a6f7669: 204 passed (all public, room.spec and scene self-checks), 132 failed only in modals.spec - modals are Task 20 - low
Ruling: Task 20 extra paths - app/hooks/useShieldsMap.ts (shared by History/Trends), AppModal initialFocus, RolePicker className, ui/select.tsx positioner z-[1400] (above .mui-modal-overlay 1300), wiring in [slug].tsx/index.tsx/App.tsx, .room-background-frame CSS, trend icon binding, ripple label spans in the auth pages and AuthModal, modals.spec selectors (page.getByRole('menuitem'), canvas instead of x-vue-echarts) - low
Ruling: AlignmentTrendsModal loads lazily - eager load put the entry 108 KB gzip over the icons:audit-build budget; first Trends open fetches ~188 KB gzip - medium
Ruling: RoundSnapshotModal renders nested inside History/Trends - siblings let Tab escape the snapshot; UpdateBanner without fade; deck preset list opens below the field (alignItemWithTrigger=false) - low
Ruling: AppModalPaper onPointerDown stopPropagation kept - Select outside press closes the list, not the modal (test + browser) - low
Deferred: deck Select chevron 1 px shorter with rounded ends vs native - owner approval of the modal-configure-deck baselines - CI Visual 40215942021 passes at 1% threshold, no baseline update - closed
Deferred: configure-deck classic light 375 chip rows wrap differently (chips ~1 px wider than the Vue light baseline; Vue dark agrees with React) - CI Visual 40215942021 passes at 1% threshold, no baseline update - closed
Deferred: skip link text read from uk.json directly, not via i18n - Task 23
Ruling: harness side-column icon count 36 -> 37 - the moderator alarm toggle (c88391c, #32) never updated the count because the harness does not run in CI; Vue Timer had the same button - low
Ruling: harness renders the ready marker immediately, showJoin starts from role === 'guest' (react set-state-in-effect); theme/volume init inside RoomHarness - low
Ruling: SlotMachine checked in Chromium via the harness (widget=slot): 3 reels spin 1100/1700/2300 ms, settle on result symbols, no console errors - closes the Task 19 deferral - low
Deferred: harness room screenshots are saved but never compared to a reference - Task 23 or a separate task
Ruling: Task 22 extra paths - tests/e2e/smoke.spec.ts (reveal needs 2 votes since 2858fc3, second voter context), tests/visual/support/{fakeSupabase,scene}.ts optional supabaseUrl for the AC22 room cases - low
Ruling: AC22 RED evidence - injected console.error on /ffc and a setTimeout throw on /login both failed the test, reverted - low
Deferred: AC20 critical-flows and smoke against the test Supabase - needs .env/.env.test or CI E2E secrets; realtime sync between two browsers and AuthPage.login unchecked - owner
Deferred: no tsconfig covers tests/e2e/** and tests/page-objects/** (checked once with a temporary tsconfig, tsc 7.0.2 exit 0) - Task 25
Deferred: AppIcon sets aria-hidden together with aria-label, so the label is never announced - Task 23
Ruling: Task 23 extra paths - useClickOutside/useMenuKeyboard deleted with specs (no consumer), useRipple tracks and cancels pending waves on unmount (authPages flake root cause, 10/10 runs), skip link via t('common.skipToContent'), AppIcon with aria-label renders role=img without aria-hidden, shadcn moved to devDependencies; ui/dropdown-menu.tsx unused parts kept as generated - low
Ruling: build chunk > 500 kB warning kept - icons:audit-build requires a single assets/index-*.js and measures the entry with CSS; manualChunks breaks that contract - medium
Deferred: docs/audits/icon-bundle-baseline.json measured on Vue, delta -78880 B gzip makes the 25 KB budget slack - re-measure with real credentials - owner
Deferred: PlayerRow status icons now carry aria-label and sit in an AppTooltip trigger with aria-describedby - likely announced twice (Vue never announced it) - Task 25
Deferred: tw-animate-css is build-time only but in dependencies - Task 25
Deferred: harness room screenshots - recommend toHaveScreenshot with container baselines or moving room view to tests/visual - owner
Deferred: app/assets/AGENTS.md:15-16 lists removed .mui-btn-sm/.mui-btn-text/.mui-btn-secondary; app/components/AGENTS.md:8 mentions useClickOutside - Task 24
Ruling: Task 24 closes the docs deferrals (tests/visual, dummy env, resetStores module state, init-script preview, composables, token bridge, PO/SM 5 spins, removed mui classes); DESIGN.md §1-§10 audit notes left as dated history; netlify/AGENTS.md TeamConsistencyTrends.vue names the neighbouring Nuxt repo, correct - low
Deferred: vitest.config.ts __dirname warning (code) - Task 25
Ruling: owner decision 2026-10-25 - nothing is merged; one shared prod database must keep working until the merge, so no deploy:stage and every check runs locally; spec AC25 and Task 25 Check updated - low
Ruling: Task 25 pre-gate fixes 851cf1f (tests/e2e/tsconfig.json covers e2e, page-objects, visual; 4th typecheck step), 2f05045 (AppTooltip describeTrigger=false for PlayerRow status/moderator/dice icons, labelled once), ad9e347 (tw-animate-css to devDependencies, vitest.config.ts without __dirname); controller rerun: pnpm run test:ci -> exit 0 (446 tests, no __dirname warning), page-load + icon-delivery -> 26 passed - closes four Task 25 deferrals - low
Ruling: AC20 and AC25 checked on a local Supabase instead of the shared prod database: supabase/config.toml (gitignored) with enable_confirmations = true and site_url http://localhost:4173, runner outside the repo; closes the AC20 Deferred - low
Deferred: migrations carry no GRANT for anon/authenticated; current Supabase images no longer grant table privileges by default, so a fresh project (local or the planned e2e test project) gets 'permission denied for table rooms' until grants are added (local run used a gitignored seed.sql) - owner
Deferred: WebKit on macOS 14 is a frozen build under Playwright 1.64 (Unknown setting: PushAPIEnabled); run webkit in the Playwright container - owner
Ruling: owner decision 2026-10-25 - visual baselines move to Git LFS in this PR (.gitattributes, 348 PNG pointers; Visual job installs git git-lfs and checks out with lfs: true); squash merge keeps binary PNGs out of main history; reference screenshots of the inspiration service go to a separate private io-upstars repo, requested in skills-aiassist - low
Deferred: RoleBadge, CardsArea, Timer, SlotMachine tooltips not checked for the same double announcement - follow-up
Ruling: owner allows the local preview check to create one room in the shared prod database - low
Deferred: root AGENTS.md Workflow still recommends git-worktree-isolation vs the 2026-10-25 one-branch learning - session-learnings triage
Ruling: owner decision 2026-10-25 - deviation from Vue parity in this PR: the room page links the current player to the signed-in user whenever the player has no user_id (auto-rejoin after signing in outside the room AuthModal left players.user_id null, so the avatar never showed; Vue main had the same gap); replaces handleAuthSuccess; roomPage.spec 'room page account link' x3, test:ci 449 - low
```

### Task 22: стара Vue-спека → React-тест

Метод: назви `it`/`test` кожної спеки з `3034743^` звірено з `tests/unit/**`, розбіжності прочитано вручну.

| # | Vue-спека | React-тест | Примітка |
|---|---|---|---|
| 1 | components/AppIcon.spec.ts | components/AppIcon.spec.tsx | 4/4, портовано в 59e8bc4 |
| 2 | components/AppModal.spec.ts | components/AppModal.spec.tsx | 4/5 за назвою; cancel → Escape unless lockDismiss |
| 3 | components/AppTooltip.spec.ts | components/AppTooltip.spec.tsx | focusin/focusout → focus/blur |
| 4 | components/CardsArea.spec.ts | components/CardsArea.spec.tsx | 2/2, більше перевірок |
| 5 | components/ConfigureCardDeckModal.spec.ts | components/ConfigureCardDeckModal.spec.tsx | 3/3 |
| 6 | components/PlayerRow.spec.ts | components/PlayerRow.spec.tsx | 6/7; Escape + повернення фокуса |
| 7 | components/ResultsArea.spec.ts | components/ResultsArea.spec.tsx | 7/7 |
| 8 | components/RoomBackgroundModal.spec.ts | components/RoomBackgroundModal.spec.tsx | 9/9 |
| 9 | components/SlotMachine.spec.ts | components/SlotMachine.spec.tsx | 2/2 |
| 10 | components/Timer.spec.ts | components/Timer.spec.tsx | 14/14 |
| 11 | components/UserSettingsModal.spec.ts | components/UserSettingsModal.spec.tsx | 12/12 |
| 12 | composables/useAppUpdate.spec.ts | hooks/useAppUpdate.spec.ts | 10/10 |
| 13 | composables/useCountdown.spec.ts | hooks/useCountdown.spec.ts | 2/2 |
| 14 | composables/useDylanAvatar.spec.ts | hooks/useDylanAvatar.spec.ts | 6/6 |
| 15 | composables/useMenuKeyboard.spec.ts | hooks/useMenuKeyboard.spec.tsx | 8/8; хук без споживача (Task 23) |
| 16 | composables/useSoundVolume.spec.ts | hooks/useSoundVolume.spec.ts | 8/8 |
| 17 | composables/useTheme.spec.ts | hooks/useTheme.spec.ts | 3/3 |
| 18 | i18n.spec.ts | i18n.spec.ts | persistLocale оновлює ще й language |
| 19 | pages/roomPage.spec.ts | pages/roomPage.spec.tsx | 14/14 |
| 20 | pwa.spec.ts | pwa.spec.ts | 6/6 |
| 21 | stores/auth.spec.ts | stores/auth.spec.ts | 3/3 |
| 22 | stores/players.spec.ts | stores/players.spec.ts | 17/17 |
| 23 | stores/presence.spec.ts | stores/presence.spec.ts | 9/9 |
| 24 | stores/profiles.spec.ts | stores/profiles.spec.ts | 6/6 |
| 25 | stores/room.spec.ts | stores/room.spec.ts | 30/30 |
| 26 | swReloadClients.spec.ts | swReloadClients.spec.ts | 4/4 |
| 27 | utils/alignment.spec.ts | utils/alignment.spec.ts | 7/7 |
| 28 | utils/authValidation.spec.ts | utils/authValidation.spec.ts | 3/3 |
| 29 | utils/avatarImage.spec.ts | utils/avatarImage.spec.ts | 5/5 |
| 30 | utils/backgroundImage.spec.ts | utils/backgroundImage.spec.ts | 11/11 |
| 31 | utils/cardDecks.spec.ts | utils/cardDecks.spec.ts | 5/5 |
| 32 | utils/iconCss.spec.ts | utils/iconCss.spec.ts | 7/7 |
| 33 | utils/iconManifest.spec.ts | utils/iconManifest.spec.ts | 18/18; грані кубика знову з PlayerRow.tsx (59e8bc4) |
| 34 | utils/iconResolver.spec.ts | utils/iconResolver.spec.ts | 4/4 |
| 35 | utils/iconSubset.spec.ts | utils/iconSubset.spec.ts | 4/4 |
| 36 | utils/resultCelebration.spec.ts | utils/resultCelebration.spec.ts | 16/16 |
| 37 | utils/resultCohorts.spec.ts | utils/resultCohorts.spec.ts | 13/13 |
| 38 | utils/roundStats.spec.ts | utils/roundStats.spec.ts | 11/11 |
| 39 | utils/shields.spec.ts | utils/shields.spec.ts | 11/11 |
| 40 | utils/slotMachine.spec.ts | utils/slotMachine.spec.ts | 6/6 |
| 41 | utils/timerAlarm.spec.ts | utils/timerAlarm.spec.ts | 8/8 |
| 42 | utils/useClickOutside.spec.ts | hooks/useClickOutside.spec.tsx | 3/3; хук без споживача (Task 23) |

Нові React-спеки без Vue-попередника: AppHeader, AuthModal, HistoryModal, PasswordInput, PlayerEditModal,
useCardLabel, useRipple, authPages, home. Оновлених еталонів: немає.
Verify: INCOMPLETE compact tree 91eee5b5652792c583628176f3935657d39f0805 2026-10-25 23:58 (README Install + supabase:local; clean-Mac sequence not run here)
Review R1: code reviewer codex gpt-6.1-sol effort low, range 5ed0b18..10cd0d9, tree 77a7509ba2e86d8e5e17b1e68e18564ea29c35ea, Intent FINDINGS / System PASS / Craft PASS, ~$0.49 (Codex 5h window 100% -> 86%, weekly 86% -> 84%)
Finding R1-codex-F1: Important README.md:253 - clean-Mac e2e path never installs the Playwright browser
Received R1: R1-codex-F1 ACCEPT - README Local Supabase adds pnpm exec playwright install chromium; Re-review: not needed (one-line docs fix)
Ruling: owner 2026-10-26 - CI e2e against a local Supabase on the runner, Detect secrets dropped from required checks; visual baselines no longer stored (348 PNG, Git LFS and visual-baselines.yml removed), Visual compares the PR base render with the head via scripts/visual-compare.sh
Verify: PASS full tree 9616cb761efc173b1a1c60bba056379b5353bc17 2026-10-26 00:52
Verify: PASS full tree 5d3e2c8f1f4ba2ca0801f13e17ee6e3902b152c8 2026-10-26 01:08
Review R2 so-upstars: PR #46 review on 6d059540f42f98104a0c4ef820df1c9504d2d338, tree 3fa81eac6149a80b7409dcc321705719c948ac20, Intent FINDINGS / System FINDINGS / Craft FINDINGS; Critical 0 Important 3 Minor 17
Received R2 so-upstars: R2-C-F1 ACCEPT - claude-review gate decides on the required jobs only (REQUIRED_JOBS); R2-A-F1 ACCEPT - AuthPageLayout wires the header like the Vue pages; R2-A-F2 ACCEPT - /ffc uses t(), inits auth, mounts AuthModal and UserSettingsModal; Re-review: needed (gate and page behavior), the automatic R3 review covers it
Received R2 so-upstars: ACCEPT A-F3 (replace navigation after sign-in), A-F4 (shared init promise), A-F5 (fallbackLng en as in Vue), A-F6 (unmount test), A-F9 (comment removed), A-F13 (unused ui/switch.tsx removed), C-F2, C-F3, C-F4, C-F5, C-F6; REJECT A-F7 (Date.now() in render fails the react purity lint), A-F10 (not reproduced, join e2e green), C-F7 (gitignored import is the session-learnings design); DEFER A-F8, A-F11, A-F12
Ruling: owner 2026-10-26 via R2 - shadcn Switch is not adopted; /ffc and PlayerRow keep .mui-switch (and the /ffc reset button .mui-btn) for pixel parity with the Vue render; spec section 8 updated
Deferred: banner fade-out on hide (R2-A-F8) needs an exit transition for conditionally rendered banners - owner
Deferred: alarm minutes commit on spinner steps (R2-A-F11) needs a native change listener; now commits on blur and Enter - owner
Deferred: AppModal renders <dialog open> without showModal(), so z-[9999] banners draw over an open modal (R2-A-F12) - owner
Round review 3: R2 so-upstars - 3 Important accepted and fixed, 11 Minor fixed, 3 rejected with evidence, 3 deferred
Review R3 so-upstars: PR #46 review on ac23a9e158898f7ee01ed9942e27af52cfc4b8d6, Critical 0 Important 0 Minor 4, verdict ready; follow-ups in issue #51
Received R3 so-upstars: ACCEPT A-F1 (auth init clears its cached promise on failure, test for a retry after a rejected getSession), C-F1 (README names the other-URL rewrite), C-F2 (supabase-local.sh keeps .env/.env.test.bak and prints the replaced URL), C-F3 (visual-compare.sh probes 127.0.0.1 and ::1); Re-review: requested manually from so-upstars

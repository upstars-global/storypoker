# Міграція на React + shadcn/ui (Base UI) + TypeScript 7 - implementation plan

**Spec:** docs/specs/2026-10-24-react-shadcn-base-ui-migration-design.md

**Goal:** Story Poker працює на React 19 + shadcn/ui (Base UI) + TS 7 з oxlint. Набір `visual`, знятий з Vue-версії,
проходить на React (оновлені еталони схвалені власником), `pnpm run test:ci` зелений, React-версія злита в `main`
одним PR з інтеграційної гілки.

**Architecture:** Чотири хвилі за частинами спеки. P0 (Tasks 1-6) - гілка від `main` і PR у `main`: спершу спайк
найризикованішого (TS 7 API для сканера іконок і type-aware oxlint), потім фреймворко-незалежний набір `visual`, що
бачить застосунок лише через URL, `data-testid`, ролі й підмінену мережу Supabase, тож без змін ганяється і на Vue,
і на React. Після злиття P0 від `main` відгалужується інтеграційна гілка `react-migration`; кожна наступна хвиля -
PR у неї з зеленим CI. P1 (Tasks 7-9): спершу видалення Vue, потім React-оболонка, яка тримає зеленим required
`Public pages load` (layout зі skip link, хедер із гучністю, `AppIcon`, `/ffc`; решта маршрутів - заглушки), далі
перемикання на TS 7 і oxlint. P2 (Tasks 10-13): стан і інфраструктура без UI - сторі, i18n, тема/прапори/звук,
PWA, сесії. P3 (Tasks 14-22): shadcn-примітиви на мосту токенів, потім екрани від простих до кімнати, потім
паритет. P4 (Tasks 23-25): зачистка CSS, документація, фінальні ворота й PR у `main`. Хвилі послідовні; всередині
P3 Tasks 16-17 і 20 незалежні після Task 15, решта йде по порядку. Спільний стан між задачами - лише контракти з
Contract спеки. Паралельних агентів план не потребує.

**Stack:** React 19.3, react-dom 19.3, `@base-ui/react` 1.9, shadcn CLI 4.22 (`init -b base`), Tailwind v4
(`@tailwindcss/vite`), Vite 8 + `@vitejs/plugin-react`, vite-plugin-pwa, react-router 7 (declarative), Zustand 5,
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
2. **Інтеграційна гілка.** P1-P4 вливаються PR-ами в довгоживучу гілку, у `main` іде один PR на паритеті.
   Беремо її, а не співіснування Vue і React у `main`: `main` лишається робочим, але гілку треба періодично
   оновлювати з `main`. Відкинуто: два фреймворки разом - два роутери й спільний стан на весь перехід.
   Кожен PR в інтеграційну гілку має зелений CI. Заморозки `main` немає: фікс чи фіча, злиті в `main` під час
   міграції, переносяться в гілку на React; якщо вони змінюють UI, еталони перезнімаються в `main` тим самим PR.
   Гілка відгалужується від `main` після злиття P0, тож набір `visual` і еталони вже в ній.
3. **Візуальний оракул - окремий PR у `main` до міграції (P0).** Еталони знімаються з Vue-застосунку, тож
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
7. **Стек замін:** react-router 7 (declarative mode, явні маршрути) замість vue-router, Zustand замість Pinia,
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
+`react`, `react-dom`, `react-router@7`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`,
`@testing-library/react`. `pinia`/`vue-i18n` прибираються тут, бо сторі й i18n до Task 10-11 ніхто не імпортує.
Unit-спеки утиліт лишаються без змін.

**Covers:** AC7, AC13

**Depends on:** Task 6 (P0 злитий у `main`, гілка `react-migration` від нього)

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
еталонів з `main` (порівняння лише орієнтовне на macOS) і прогін job `Visual` у PR -> ці скріншоти зелені або
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

**Consumes:** голова `react-migration`

**Produces:** PR `react-migration` → `main`

**Covers:** AC23, AC25

**Depends on:** Task 24

**Check:** `pnpm run test:ci` -> зелений; `pnpm run deploy:stage` з голови гілки, дві вкладки на stage-URL: вхід у
кімнату, голос в одній з'являється в другій -> так; CI на PR у `main` -> усі required і `Visual` зелені

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
Task 7: pending
Task 8: pending
Task 9: pending
Task 10: pending
Task 11: pending
Task 12: pending
Task 13: pending
Task 14: pending
Task 15: pending
Task 16: pending
Task 17: pending
Task 18: pending
Task 19: pending
Task 20: pending
Task 21: pending
Task 22: pending
Task 23: pending
Task 24: pending
Task 25: pending
```

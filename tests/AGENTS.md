# Tests

Unit tests: Vitest + happy-dom, конфіг - окремий `vitest.config.ts` (`include`: `tests/unit/**/*.spec.{ts,tsx}`,
`tests/components/**`, `tests/integration/**`; `passWithNoTests`, setup-файла немає). Наявні тести - у
`tests/unit/{stores,utils,components,hooks,pages}/` (`tests/{a11y,server,integration,components}/` поки лише
`.gitkeep`); спека з JSX чи ref - `.spec.tsx`. Артефакти - у `test-results/` (`coverage/`, `playwright/`,
`playwright-report/`); `coverage/` і `playwright-report/` лишаються в `.gitignore` навмисно,
`scripts/migrate-test-artifacts.sh` (preinstall) переносить їх зі старих кореневих шляхів. Фейковий Supabase-клієнт і
Realtime-payload для `setSupabase()` / `applyChange()` - `tests/support/helpers/fakeSupabase.ts` (`asSupabase`,
`changePayload`), без `as any`. Стан stores між тестами скидає `resetStores()` (`tests/support/helpers/`).
`virtual:pwa-register` у vitest веде alias на заглушку `tests/support/stubs/pwaRegister.ts`; поведінку задавай `vi.mock`.
Тест сторінки (`tests/unit/pages/`) - Testing Library `render` у `<MemoryRouter initialEntries>` + `<Routes>` з
реальними `react-router` і i18n; дочірні компоненти мокай `vi.mock('~/components/X', ...)`, дії stores - підміною
`useXStore.setState({ action: vi.fn() })` до render. Файл не називай `[slug].spec.tsx`: у фільтрі vitest дужки -
character class. Точний час після `vi.setSystemTime` звіряй з `vi.useFakeTimers({ toFake: ['Date'] })`: з
`shouldAdvanceTime: true` годинник іде під час `await`, і тест періодично падає в CI.
`pnpm run typecheck` бере `app/**`, `tests/unit/**`, harness і `tests/{e2e,page-objects,visual}/**` (`tests/e2e/tsconfig.json`).
E2E: Playwright у `tests/e2e/`; потребує `.env/.env.test`, якого локально нема - job `e2e` у CI пропускається без
секретів, тож реально біжать лише проєкти `page-load` і `icon-delivery`. Без `E2E_BASE_URL` Playwright сам збирає і
запускає `pnpm run preview` на `:4173` (`reuseExistingServer: !CI` - локальний процес на 4173 перевикористовується);
задай `E2E_BASE_URL`, щоб тестувати вже запущений сервер. `playwright.config.ts` передає серверу `VITE_SUPABASE_*`
лише з shell (інакше `''`, і це перебиває `.env/.env`), тож локальний `page-load` запускай із dummy-значеннями з
CI-job: `VITE_SUPABASE_URL=https://dummy.supabase.co VITE_SUPABASE_KEY=sb_publishable_dummy_key_for_page_load_smoke_only
pnpm run test:e2e:pages`. Тест init-script палітри в `page-load.spec.ts` коректний лише на зібраному preview
(`E2E_BASE_URL` на `vite dev` дає недостовірний результат).

## Visual (`tests/visual/`)

Проєкт `visual` (не required CI-job `Visual`) знімає скріншоти публічних сторінок, кімнати й модалок у 3 палітрах ×
2 темах × 1280/375 px; `maxDiffPixelRatio: 0.01`, `retries: 0`. `playwright.config.ts` додає проєкт і його сервер
(`:4174`, збірка в `test-results/visual-dist` з фіксованим фейковим Supabase URL) лише коли `visual` названо в
`--project`: пиши `--project=visual <filter>`, бо `--project visual <path>` Playwright читає як кілька назв проєктів.
Мережу Supabase підміняє `tests/visual/support/fakeSupabase.ts`, сцени - `support/scene.ts`; назовні пропускаються
лише Google Fonts. Еталони `tests/visual/__screenshots__/` - Linux-рендери з образу
`mcr.microsoft.com/playwright:v1.64.1-noble` (тег = версія `@playwright/test`): на macOS локальний прогін
розходиться, звіряй у тому самому контейнері (Docker). Еталон оновлюється поштучно, з причиною й дифом у PR і після
«так» власника: label `update-visual-baselines` на PR запускає `.github/workflows/visual-baselines.yml`, артефакт
`visual-baselines` - нові PNG.

## Icon rendering harness (`tests/icon-rendering/`)

Ізольований стенд рендеру іконок; у production-збірку не потрапляє, власного роуту не додає. Має власні
`vite.config.ts` і Playwright-конфіг, збирає той самий `AppIcon`, що й production (CSS mask + inline-виняток).

`RoomHarness.tsx` монтує реальні компоненти на fixture з 15 гравців; стани задаються query-параметрами:
`role`, `view=catalog|room`, `widget=slot`, `paused=1`, `countdown=N`. Всі гравці `is_online: false` за планом.

```bash
pnpm run test:icons:harness    # сам збирає harness і піднімає preview на :4181
```

Скріншоти harness (`page.screenshot`) лише зберігаються в `test-results/`, з еталоном їх ніщо не звіряє.

`tests/icon-rendering/tsconfig.json` прогонить третім кроком `pnpm run typecheck`, тому job `Typecheck` бере
harness без змін у `ci.yml`. Новий tsconfig-проєкт треба явно дописати в цей скрипт, інакше CI його не побачить.

Історія A/B (варіант B з окремим `ICON_RENDERER=mask` і переплетені заміри) закрита разом із міграцією;
результат - `docs/audits/2026-09-09-icon-rendering-ab.md`.

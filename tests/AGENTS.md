# Tests

Unit tests: Vitest + happy-dom, конфіг - окремий `vitest.config.ts` (`include`: `tests/unit/**`, `tests/components/**`,
`tests/integration/**`; `passWithNoTests`, setup - `tests/support/setup/vitest.ts`). Наявні тести - у
`tests/unit/{stores,utils,components,composables,pages}/` (`tests/{a11y,visual,server,integration,components}/` поки лише
`.gitkeep`). Артефакти - у `test-results/` (`coverage/`, `playwright/`, `playwright-report/`); `coverage/` і
`playwright-report/` лишаються в `.gitignore` навмисно, `scripts/migrate-test-artifacts.sh` (preinstall) переносить їх
зі старих кореневих шляхів. Фейковий Supabase-клієнт і Realtime-payload для `setSupabase()` /
`applyChange()` - `tests/support/helpers/fakeSupabase.ts` (`asSupabase`, `changePayload`), без `as any`.
`virtual:pwa-register` у vitest веде alias на заглушку `tests/support/stubs/pwaRegister.ts`; поведінку задавай `vi.mock`.
Тест сторінки (`tests/unit/pages/`) - `shallowMount` з реальним `vue-router` (`createMemoryHistory`) і
i18n; дії stores мокай `vi.spyOn` на інстансах активної pinia до mount, другу pinia в `global.plugins`
не став - шпигуни опиняться на іншому store. Файл не називай `[slug].spec.ts`: у фільтрі vitest дужки -
character class.
E2E: Playwright у `tests/e2e/`; потребує `.env/.env.test`, якого локально нема - job `e2e` у CI пропускається без
секретів, тож реально біжить лише проєкт `page-load`. Без `E2E_BASE_URL` Playwright сам збирає і запускає
`pnpm run preview` на `:4173` (`reuseExistingServer: !CI` - локальний процес на 4173 перевикористовується); задай
`E2E_BASE_URL`, щоб тестувати вже запущений сервер.

## Icon rendering harness (`tests/icon-rendering/`)

Ізольований стенд рендеру іконок; у production-збірку не потрапляє, власного роуту не додає. Має власні
`vite.config.ts` і Playwright-конфіг, збирає той самий `AppIcon`, що й production (CSS mask + inline-виняток).

`RoomHarness.vue` монтує реальні компоненти на fixture з 15 гравців; стани задаються query-параметрами:
`role`, `view=catalog|room`, `widget=slot`, `paused=1`, `countdown=N`. Всі гравці `is_online: false` за планом.

```bash
pnpm run test:icons:harness    # сам збирає harness і піднімає preview на :4181
```

`tests/icon-rendering/tsconfig.json` прогонить третім кроком `pnpm run typecheck`, тому job `Typecheck` бере
harness без змін у `ci.yml`. Новий tsconfig-проєкт треба явно дописати в цей скрипт, інакше CI його не побачить.

Історія A/B (варіант B з окремим `ICON_RENDERER=mask` і переплетені заміри) закрита разом із міграцією;
результат - `docs/audits/2026-09-09-icon-rendering-ab.md`.

# Tests

Unit tests: Vitest + happy-dom, конфіг - окремий `vitest.config.ts` (`include`: `tests/unit/**`, `tests/components/**`,
`tests/integration/**`; `passWithNoTests`, setup - `tests/support/setup/vitest.ts`). Наявні тести - у
`tests/unit/{stores,utils,components,composables}/` (`tests/{a11y,visual,server,integration,components}/` поки лише
`.gitkeep`). Артефакти - у `test-results/` (`coverage/`, `playwright/`, `playwright-report/`); `coverage/` і
`playwright-report/` лишаються в `.gitignore` навмисно, `scripts/migrate-test-artifacts.sh` (preinstall) переносить їх
зі старих кореневих шляхів. E2E: Playwright у `tests/e2e/`; потребує `.env/.env.test`, якого локально нема - job `e2e` у
CI пропускається без секретів, тож реально біжить лише проєкт `page-load`. Без `E2E_BASE_URL` Playwright сам збирає і
запускає `npm run preview` на `:4173` (`reuseExistingServer: !CI` - локальний процес на 4173 перевикористовується);
задай `E2E_BASE_URL`, щоб тестувати вже запущений сервер.

## Icon rendering harness (`tests/icon-rendering/`)

Ізольований A/B-стенд рендеру іконок; у production-збірку не потрапляє, власного роуту не додає. Має власні
`vite.config.ts` і два Playwright-конфіги. Змінна `ICON_RENDERER=mask` перемикає варіант B: аліаси підміняють
`AppIcon.vue` на `IconMask.vue` і `registerLocalIcons` на `registerMaskIcons.ts`, порт `4182` замість `4181`,
артефакти в `dist-b` замість `dist-a`. Без неї збирається варіант A (inline SVG).

`RoomHarness.vue` монтує реальні компоненти на fixture з 15 гравців; стани задаються query-параметрами:
`role`, `view=catalog|room`, `widget=slot`, `paused=1`, `countdown=N`. Всі гравці `is_online: false` за планом.

```bash
npm run icons:harness:css                       # генерує icons.css + iconClasses.json для B
npm run test:icons:harness                      # варіант A, 62 тести (сам збирає і піднімає preview)
ICON_RENDERER=mask npm run test:icons:harness   # варіант B, 62 тести
npm run test:icons:measure                      # 20 переплетених пар A/B, пише runs/interleaved.json
npm run icons:report-ab                         # зводить заміри + вагу; падає на порушенні module graph
```

Результат експерименту - `docs/audits/2026-09-09-icon-rendering-ab.md` (рішення: залишено A).

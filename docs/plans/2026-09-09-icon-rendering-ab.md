# Icon Rendering A/B Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевірити локальну доставку на fixture кімнати та прийняти доказове рішення inline SVG / CSS mask.

**Architecture:** Окремий production harness монтує чинні компоненти з незмінними даними без живого backend.
Варіант A використовує локальний SVG із попереднього плану, B замінює тільки AppIcon на span зі спільним CSS.
Основні метрики DOM, повного JS/CSS і мережі визначають компроміс; часові виміри перевіряють регресії.

**Tech Stack:** Vue 3.5, Vite 8, Pinia, Iconify utils, Playwright Chromium, Node >=24.15.0, npm >=11.12.0.

## Global Constraints

- Специфікація: [icon-rendering-migration-design](../specs/2026-09-09-icon-rendering-migration-design.md).
- Передумова: повністю завершений план [локальної доставки](2026-09-09-icon-local-delivery.md) (Tasks 1-6).
  Цей план не закриває крок 1; він є окремим експериментом, міграція не визначена наперед.
- Task 0 (аналітична оцінка) виконується першим. Tasks 1-4 виконуються лише якщо B проходить пороги.
- Пороги рішення (з спеки, не переглядаються під результати):

| Метрика | Поріг для B |
| --- | --- |
| gzip JS+CSS повного production graph | B ≤ A + 10 KB |
| icon DOM elements на fixture кімнати (стан знімка `/core-platform`) | зменшення ≥ 25 (57 → ≤ 32) |
| неприйняті візуальні розбіжності після ручного перегляду | 0 |
| медіана ready proxy | регресія ≤ 1 мс |
| запити до Iconify провайдерів | 0 в обох варіантах |

  Часові розбіжності ≤ 1 мс не є аргументом ні за, ні проти. Для mixed режиму діють ті самі пороги.
- «Основні метрики: кількість DOM-елементів, розмітка сторінки, повні production JS/CSS (raw/gzip і transfer)
  та запити даних іконок.»
- «Без trace висновків про paint не робити.»
- «Production-міграція виконується лише після зафіксованого рішення за результатами A/B.»
- Viewport 1440×900, 15 гравців, синтетичні імена/ID; жива `/core-platform` не використовується для записів.
- Cold/warm вимірюються окремо; A/B чергуються. Mask B0 з inline data URI не замінює B зі спільним CSS.
- Harness, assets і service worker ізольовані від deploy dist; жодного нового production route.
- Ізоляція роботи через using-git-worktrees; UI-кандидат через frontend-crafting, browser через web-debug.
- Прочитати app/components, app/stores, app/assets і tests AGENTS.md перед відповідними змінами.
- Артефакти: `test-results/icon-rendering/`; код/тести/commit messages англійською, звіт українською.

## Структура файлів

| Файли | Відповідальність |
| --- | --- |
| `tests/fixtures/data/icon-room.json`, `tests/icon-rendering/fixture.ts` | сталі дані й перетворення на props |
| `tests/icon-rendering/index.html`, `main.ts`, `RoomHarness.vue` | тестова композиція реальних компонентів |
| `tests/icon-rendering/vite.config.ts`, `playwright.config.ts` | окрема production збірка та ізольовані тести |
| `tests/icon-rendering/delivery.spec.ts`, `visual.spec.ts` | локальний набір, ролі, screenshot і PWA |
| `tests/icon-rendering/IconMask.vue`, `generate-css.ts`, `icons.css` | експериментальний B |
| `tests/icon-rendering/measure.spec.ts` | збір DOM/network/timing метрик |
| `scripts/report-icon-ab.ts` | таблиці й статистика з JSON results |
| `docs/audits/2026-09-09-icon-rendering-ab.md` | фактичний висновок після вимірів, не створювати наперед |

## Task 0: Аналітична оцінка B без harness

**Files:** Create `scripts/estimate-icon-ab.ts`, `test-results/icon-rendering/estimate.json`;
modify `package.json`, `tsconfig.node.json`.

**Interfaces:** CLI `node scripts/estimate-icon-ab.ts` пише JSON
`{ domElements: { a: number; b: number }; markupBytes: { a: number; b: number }; cssBytes: number;
jsGzipBytes: { a: number; b: number }; verdict: 'proceed' | 'stop' }`.

- [ ] DOM і markup: для кожного inputName з manifest узяти кількість інстансів на знімку `/core-platform`
  (27 svg / 10 унікальних / 57 елементів / 17 430 B) як A; для B рахувати 1 елемент і ≈ 60 B на інстанс.
- [ ] CSS: у Node згенерувати правила `getIconsCSS(iconSet, names)` з `@iconify/utils` для всіх resolvedNames
  дефолтної flagCase і зважити raw/gzip; це повна вага B-CSS без harness.
- [ ] JS: узяти gzip entry chunk з `icons:audit-build` як A; для B відняти вагу `iconCollections.json` і
  оцінити `@iconify/vue`, що лишається через інші імпорти. Оцінку записати з припущеннями.
- [ ] Порівняти з таблицею порогів у Global Constraints. Якщо B не проходить бюджет JS+CSS або DOM,
  verdict=stop: записати оцінку в `docs/audits/2026-09-09-icon-rendering-ab.md`, оновити статус спеки і
  завершити план без harness. Інакше verdict=proceed і перейти до Task 1.
- [ ] Commit `docs: estimate the icon mask candidate before the harness`.

## Task 1: Fixture і production harness для A

**Files:** Create `tests/fixtures/data/icon-room.json`, `tests/icon-rendering/fixture.ts`,
`tests/icon-rendering/index.html`, `tests/icon-rendering/main.ts`, `tests/icon-rendering/RoomHarness.vue`,
`tests/icon-rendering/vite.config.ts`, `tests/icon-rendering/playwright.config.ts`,
`tests/icon-rendering/delivery.spec.ts`; modify `package.json`, `tsconfig.node.json`.

**Interfaces:** `HarnessRole = 'guest' | 'player' | 'moderator' | 'authorized-moderator'`;
`makePlayers(): Player[]` повертає копії fixture; тип Player із `app/stores/types.ts`.
`/?role=<HarnessRole>&view=room|catalog` обирає лише локальний стан тестового entry.
`data-testid=icon-harness-ready` з’являється після Vue nextTick і завершення локальної ініціалізації.

- [ ] Додати fixture з 15 записів форми чинного Player: id, room_id, name, is_moderator, vote, user_id,
  shields, created_at, left_at. Використати фіксований `room_id='iconroom'`, `2026-09-09T09:00:00.000Z`,
  імена `Player 01` ... `Player 15`, ролі 7 BE, 6 QA, PO, SM; shields відповідно `be`, `qa`, `po`, `sm`.
  vote/user_id/left_at null, created_at фіксований, один модератор SM. Не копіювати реальні дані.
  `makePlayers` робить structuredClone fixture, щоб мутація одного сценарію не змінювала наступний.
- [ ] Перший browser test має впасти через відсутній harness:

```ts
import { expect, test } from '@playwright/test'

test('renders the room fixture without a backend', async ({ page }) => {
  const remote: string[] = []
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      remote.push(url.origin)
      await route.abort()
      return
    }
    await route.continue()
  })
  await page.goto('/?role=guest&view=room')
  await expect(page.getByTestId('icon-harness-ready')).toBeVisible()
  await expect(page.getByTestId('players-list')).toContainText('0 / 15')
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(remote).toEqual([])
})
```

- [ ] Створити index.html із `<div id="app"></div>` та module `/main.ts`. main викликає registerLocalIcons,
  createPinia, i18n, VWave, memory router і mount RoomHarness; реальний app/main.ts не імпортувати.
  Після mount викликати useTheme().init() та useSoundVolume().initVolume() як у чинному App.
- [ ] RoomHarness монтує AppHeader, PlayersList, Timer, CardsArea і JoinOverlay для guest у тій самій
  геометрії, що template `app/pages/[slug].vue`; не копіювати логіку Realtime сторінки.
  PlayerRow отримує `{ ...player, is_online: false, votePending: false }`; props phase=voting,
  currentPlayerId=null для guest, ID першого гравця для player, ID SM для moderator.
  Auth store лишається порожнім, крім authorized-moderator: задати синтетичного user й заповнений profiles cache
  до mount, щоб watch AppHeader не викликав fetchOne. Усі event handlers змінюють тільки refs harness.
- [ ] CardsArea props: activeCards з `DECK_PRESETS` (`app/utils/cardDecks.ts`) для `DEFAULT_PRESET_ID`
  (scrum `defaultActive`), не власний літерал; selectedVote=null,
  isModerator за role, hasVotes=false, canReset=false, countdownCounter=0, countdownRunning=false,
  pollMode=false, voteQuestionMode=false, pollQuestion=null; last-round стан перевірити окремим локальним сценарієм.
  Timer: roundStartedAt фіксований, phase=voting, pausedAt=null, pausedElapsedMs=0, canControl за role.
  AppHeader: onlineCount=0, roomName='Core Platform', playerName за role; решта чинних defaults.
- [ ] Transport до Supabase не ініціалізувати; будь-який неочікуваний getSupabase має впасти.
  Для авторизованого сценарію cache містить user profile до mount. Browser route блокує зовнішні запити.
  Шрифти: `main.css` імпортує Geist через `@import url(https://fonts.googleapis.com/...)`, `index.html`
  має окремий link на Google Fonts. Harness Vite plugin вирізає `@import url(...)` з `main.css` під час
  transform, а harness `index.html` не містить font link; рендер іде системним fallback-шрифтом.
  Відхилення шрифту від production зафіксувати в звіті; воно однакове для A і B і не впливає на іконки.
- [ ] Vite config: root tests/icon-rendering, Vue plugin, ті самі Tailwind settings/alias app;
  envDir на порожній тестовий каталог, без персональних env. Скопіювати PWA manifest/workbox налаштування
  з чинного vite.config, scope тільки тестового origin; outDir `test-results/icon-rendering/dist-a`.
  Для browser alias використовувати абсолютний app шлях. Node scripts включити в tsconfig.node.
- [ ] Додати `icons:harness:build` (Vite build із config), `icons:harness:preview` (порт 4181),
  `test:icons:harness` (окремий Playwright config). Config використовує Chromium, viewport 1440×900,
  webServer build+preview, `reuseExistingServer:false`, testDir тільки tests/icon-rendering,
  явний `use: { serviceWorkers: 'allow' }` (offline test Task 2 залежить від реального SW).
  Після тесту закривати саме свій server; чужі dev-порти не чіпати.
- [ ] `npm run test:icons:harness -- delivery.spec.ts`; paired regression:
  `npm run test:unit -- tests/unit/components/PlayerRow.spec.ts tests/unit/components/CardsArea.spec.ts`.
  Перевірити склад іконок проти описаного знімка 27/10; різницю пояснити станом UI, не підганяти dummy SVG.
- [ ] Commit `test: add a deterministic icon room harness`.

## Task 2: Повний каталог, visual і справжній offline reload

**Files:** Modify `tests/icon-rendering/RoomHarness.vue`, `tests/icon-rendering/delivery.spec.ts`,
`tests/icon-rendering/playwright.config.ts`; create `tests/icon-rendering/visual.spec.ts`.

**Interfaces:** `view=catalog` монтує по одному AppIcon для кожного inputNames, key=name,
обгортка `data-icon-name=<resolved-name>`; marker готовності після локального iconLoaded для всього набору.

- [ ] Додати failing catalog test: усі inputNames у кожній flagCase мають непорожній SVG body;
  блокувати три Iconify hosts і очікувати нуль attempts. FEATURE_FLAGS встановлювати через addInitScript
  до navigation, новий browser context для кожної комбінації через кеш resolver.
- [ ] Реалізувати catalog із чинним AppIcon та підписами імен; це test UI, він не додається до production router.
  На room view перевірити role controls: доступність Timer pause/resume/reset, CardsArea reveal/countdown,
  header menu, зміни volume і приховані стани dice/slot через локальні refs та event handlers.
- [ ] Зафіксувати годинник `page.clock.install({ time: new Date('2026-09-09T09:05:00.000Z') })`,
  зупинити його на час screenshot. Не заморожувати performance clock для часових A/B-прогонів.
  Playwright screenshots робити з animations disabled і caret hide, дочекатися document.fonts.ready.
- [ ] Зняти room/catalog у light/dark × classic/cyberdeck/matcha × flagCases; store keys sp-theme,
  sp-palette і FEATURE_FLAGS задавати до mount. Перевірити bounding boxes, computed color, aria-hidden.
  Screenshot paths: `test-results/icon-rendering/a/<role>-<theme>-<palette>-<flags>-<view>.png`.
  Ручний перегляд контактного аркуша є обов’язковим; не створювати порожню tests/visual suite як доказ.
- [ ] Offline test виконує реальний reload після ready service worker, без route mocks:

```ts
import { expect, test } from '@playwright/test'

test('keeps the icon catalog after an offline reload', async ({ page, context }) => {
  await page.goto('/?view=catalog')
  await expect(page.getByTestId('icon-harness-ready')).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  const count = await page.locator('[data-icon-name] svg').count()
  expect(count).toBeGreaterThan(0)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('icon-harness-ready')).toBeVisible()
  await expect(page.locator('[data-icon-name] svg')).toHaveCount(count)
})
```

Marker готовності перевіряє вміст кожної іконки, а не лише кількість контейнерів. Окремий cold-context тест
блокування API виключає приховану залежність від кешу Iconify.
- [ ] `npm run test:icons:harness -- delivery.spec.ts visual.spec.ts`; artifacts мають містити повні
  screenshots і перелік перевірених комбінацій. Зберегти visual baseline A;
  commit `test: verify local icon visuals and offline reload`.

## Task 3: Статичний CSS-кандидат B без дубльованого JSON

**Files:** Create `tests/icon-rendering/generate-css.ts`, `tests/icon-rendering/IconMask.vue`,
`tests/icon-rendering/registerMaskIcons.ts`, `tests/icon-rendering/icons.css`,
`tests/unit/utils/iconCss.spec.ts`; modify harness Vite config, package.json.

**Interfaces:** `generateIconCss(): { css: string; classes: Record<string, string> }`;
generated `tests/icon-rendering/iconClasses.json`, sorted full name → `sp-icon-<stable-index>`.
`IconMask` має ті самі props/fallthrough semantics, що AppIcon; resolvedName через mapIconName.

- [ ] Unit test генерує CSS із реального subset і перевіряє один клас на resolvedName, відсутність повторів,
  dimensions для кожного viewBox, відсутність unknown names. Test невідомого імені має впасти явно.
  Run `npm run test:unit -- tests/unit/utils/iconCss.spec.ts tests/unit/utils/iconSubset.spec.ts`.
- [ ] Генератор у Node читає committed subset і дев’ять raw app SVG, використовує `getIconsCSS(iconSet, names)`
  з `@iconify/utils` для правил mask (один виклик на колекцію, спільні common rules, без дублювання).
  Парсинг app SVG повторно використовує чинні parseSvg semantics через чистий test-side adapter,
  не імпортує Vite `?raw` у Node. Перевірити всі 9 імен та viewBox, не втратити stroke/opacity.
- [ ] Створити IconMask зі span, aria-hidden=true, класом із iconClasses. Пропорції 1em висоти й width/viewBox
  генеруються в CSS; поточні class/style/події передаються на корінь. Невідомий resolvedName дає явну помилку.
- [ ] Для B Vite plugin підміняє тільки resolved absolute `app/components/AppIcon.vue` на IconMask,
  `app/lib/registerLocalIcons.ts` на registerMaskIcons (валідація class map, без SVG JSON) та CSS import.
  Common harness залишається однаковим. Підміна потрібна також прямим відносним імпортам, не лише alias-рядкам.
- [ ] CLI `icons:harness:build:b` передає `ICON_RENDERER=mask` через env; outDir dist-b, preview порт 4182.
  Це build-only experiment variable, не новий production feature flag. Перевірити module graph B:
  немає iconCollections.json і full collections; якщо JSON залишається через інший import, врахувати вагу й усунути
  непотрібний import до порівняння. У renderer-only B0 дозволено `Icon mode=mask`, але його метрики маркувати окремо.
- [ ] Повторити Task 2 tests із mask-адаптованою готовністю: computed maskImage не none, ненульові розміри,
  screenshots. На B не застосовувати SVG-only count assertion; порівнювати containers і видимий результат.
  Артефакти `test-results/icon-rendering/b/`; створити A/B diff і переглянути всі відхилення.
- [ ] Unit tests + `npm run test:ci`; commit `perf: add an isolated static mask experiment`.
  Production AppIcon і default build залишаються SVG.

## Task 4: Вимірювання і рішення

**Files:** Create `tests/icon-rendering/measure.spec.ts`, `scripts/report-icon-ab.ts`,
`docs/audits/2026-09-09-icon-rendering-ab.md`; modify `docs/audits/README.md` і специфікацію лише після результатів.

**Interfaces:** JSON run `{ variant: 'a'|'b'; cache: 'cold'|'warm'; role: string; flags: string;
  icons: number; iconElements: number; markupBytes: number; cssBytes: number; transferBytes: number;
  readyMs: number; requests: string[] }`. Report читає JSON, не вигадує відсутні виміри.

- [ ] Перед measurement перевірити обидва dist тим самим production graph auditor та зберегти повні
  raw/gzip JS/CSS summaries. Порахувати всі завантажені CSS-правила B; DOM-байти показувати окремою колонкою.
- [ ] Збирати DOM через browser evaluate:

```ts
const metrics = await page.evaluate(() => {
  const icons = [...document.querySelectorAll('svg.iconify, span.sp-icon')]
  const bytes = (value: string) => new TextEncoder().encode(value).length
  return {
    icons: icons.length,
    iconElements: icons.reduce((n, e) => n + 1 + e.querySelectorAll('*').length, 0),
    markupBytes: icons.reduce((n, e) => n + bytes(e.outerHTML), 0),
    transferBytes: performance.getEntriesByType('resource')
      .reduce((n, e) => n + (e as PerformanceResourceTiming).transferSize, 0),
  }
})
```

Змінна `page` є Playwright fixture з `test('measures icons', async ({ page }) => { ... })`.
На IconMask додати клас sp-icon, щоб selector враховував усі B-іконки, включно з room view.
Network summary через CDP також враховує document і явно розрізняє HTTP cache/service worker cache;
resource timing сам по собі не є повною вагою navigation.
- [ ] Почати з 5 пар A/B для cold і warm, головний role=guest із fixture, flags як у початковому знімку
  (`iconsLucide=false`, `iconsRounded=true`). Кожна пара має чистий context; warm після однакового першого load.
  Контрольні player/moderator та всі flagCases мають функціональні/visual перевірки, не обов’язково 5 пар timing.
  Browser/device/CPU/network settings фіксувати; live clocks не заморожувати в timing runs.
- [ ] Час ready міряти до marker + двох requestAnimationFrame після локальних даних/CSS; це app-ready proxy,
  не доказ завершеної растеризації. Порахувати медіану й min/max. Пороги фіксовані в Global Constraints:
  регресія медіани ≤ 1 мс допустима, різниця ≤ 1 мс не є аргументом; нових порогів після прогонів не вводити.
- [ ] Якщо є регресія або потрібно заявити прискорення, виконати ≥20 пар з Chrome trace:
  категорії devtools.timeline, blink, cc, disabled-by-default-devtools.timeline; окремо scripting/style/layout,
  paint і raster tasks. Подати медіану/p95/розкид, сирі traces. Без trace лишити висновок про paint невизначеним.
- [ ] Записати звіт із командами, версіями, fixture hash, обсягом кешу, full bundle таблицею, DOM,
  мережею, screenshot review і висновком. Вибір: A / B / mixed; пояснити виграш, регресії й підтримку.
  Посилання на артефакти мають бути доступні рев’юеру; CI attachments або зафіксована локальна передача.
- [ ] Якщо B не обраний: зберегти A й звіт, не переносити експеримент у production.
  Якщо B/mixed обраний: окремий план інтеграції з точним списком винятків і результатами A/B;
  цей план експерименту не авторизує автоматичну production-міграцію.
- [ ] Оновити статус спеки й індекс аудиту, `npm run test:ci`, code review;
  commit `docs: record the icon rendering experiment decision`.

## Самоперевірка плану

- Аналітична оцінка й stop-умова: Task 0. Fixture й усі стани: Tasks 1-2. Статичний B і повна вага: Task 3.
- Порівняння DOM/network/bundle проти фіксованих порогів: Task 4. Offline і visual: Task 2 повторюється на B.
- A/B має один backend-free стан, повні правила manifest і незалежні кеші; висновок не заданий наперед.

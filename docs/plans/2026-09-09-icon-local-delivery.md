# Icon Local Delivery Implementation Plan

> **For agentic workers:** Use subagent-driven-development (recommended) or executing-plans to execute the plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Забезпечити локальними даними всі досяжні іконки без зміни SVG-рендеру та фіче-флагів.

**Architecture:** Явний manifest вхідних імен і чистий resolver визначають subset для чотирьох комбінацій
флагів. Node-генератор читає колекції й створює committed JSON; браузер реєструє лише цей JSON до mount.
Перевірки джерел, runtime guard і аудит production graph не дозволяють приховати пропущені іконки або повні колекції.

**Tech Stack:** Vue 3.5, Vite 8, TypeScript, Node >=24.15.0, npm >=11.12.0, Iconify Vue 5, Vitest, Playwright.

## Global Constraints

- Специфікація: [icon-rendering-migration-design](../specs/2026-09-09-icon-rendering-migration-design.md).
- «При обох увімкнених флагах зберегти поточний пріоритет Lucide над rounded.»
- «Браузер імпортує цей файл; імпорти `@iconify-json/*` та генератор залишаються поза browser graph.»
- «Production-міграція виконується лише після зафіксованого рішення за результатами A/B.»
- Зберегти API AppIcon, i18n, розміри, події, SVG, обидва флаги й усі локальні `app:` SVG.
- Legacy SHIELD_CATALOG не є джерелом потрібних UI-іконок; `custom:` означає tag ролі.
- Прочитати `app/AGENTS.md`, `app/components/AGENTS.md`, `app/utils/AGENTS.md`, `tests/AGENTS.md`.
- Реалізацію виконувати в ізольованому worktree через `using-git-worktrees`; цей план не створює worktree.
- Коментарі й commit messages англійською; нові пояснювальні коментарі в коді не додавати.
- Тести: `test-driven-development` + `vitest`; браузер: `web-debug`; інструкції: `maintaining-agent-context`.
- Перед фінішем `requesting-code-review`, `verification-before-completion`, `npm run test:ci`.
- Stage лише файли задачі. Сторонній commit `0207241` з electron-to-chromium не переписувати: він потрапляє в
  squash-merge гілки разом з іншими комітами і приймається як є.

## Межа релізу та структура файлів

Цей план завершується працездатним inline SVG з локальною доставкою і закривається власними перевірками
(Tasks 1-6). Наступний незалежний етап - [A/B-план](2026-09-09-icon-rendering-ab.md); його результат може
залишити SVG незмінним і не є умовою закриття цього плану.

| Файли | Відповідальність |
| --- | --- |
| `app/utils/iconResolver.ts`, чинний `iconMap.ts` | чистий remap і читання флагів відповідно |
| `app/utils/iconManifest.ts` | inputNames, dynamicBindings, чотири flagCases |
| `scripts/icons/scan.ts` | AST-інвентаризація Vue/TS і перевірка binding coverage |
| `scripts/icons/subset.ts`, `scripts/generate-icons.ts` | повні icon records і CLI generate/check |
| `app/generated/iconCollections.json` | committed subset без Node-коду |
| `app/lib/registerLocalIcons.ts` | реєстрація subset і дев’яти app SVG |
| `app/lib/iconPolicy.ts`, `AppIcon.vue`, `main.ts` | guard і порядок ініціалізації |
| `scripts/audit-icon-build.ts` | заборонені модулі в sourcemap, raw/gzip звіт, дельта entry chunk ≤ 25 KB gzip |
| `tests/unit/utils/icon*.spec.ts`, `tests/unit/components/AppIcon.spec.ts` | resolver, manifest, subset, guard, |
| | повний manifest × 4 flagCases |
| `package.json`, lockfile, CI, `tsconfig.node.json` | залежності, Node scripts і required checks |

## Task 1: Чистий resolver без зміни поведінки

**Files:** Create `app/utils/iconResolver.ts`, `tests/unit/utils/iconResolver.spec.ts`;
modify `app/utils/iconMap.ts`, `tsconfig.node.json`.

**Interfaces:** `IconFlags = { iconsLucide: boolean; iconsRounded: boolean }`;
`resolveIconName(name: string, flags: IconFlags): string`. Поточний `mapIconName(name: string): string` зберігається.

- [ ] Написати тест нижче, включно з прямими іменами й fallback:

```ts
import { expect, it } from 'vitest'
import { resolveIconName } from '~/utils/iconResolver'

it('keeps fallback and gives Lucide precedence', () => {
  const both = { iconsLucide: true, iconsRounded: true }
  expect(resolveIconName('ic:baseline-close', both)).toBe('lucide:x')
  expect(resolveIconName('ic:baseline-palette', both)).toBe('ic:baseline-palette')
  expect(resolveIconName('lucide:id-card', both)).toBe('lucide:id-card')
  expect(resolveIconName('lucide:undo', both)).toBe('lucide:undo')
  expect(resolveIconName('ic:baseline-close', {
    iconsLucide: false, iconsRounded: true,
  })).toBe('ic:round-close')
  expect(resolveIconName('ic:baseline-close', {
    iconsLucide: false, iconsRounded: false,
  })).toBe('ic:baseline-close')
})
```

- [ ] Запустити `npm run test:unit -- tests/unit/utils/iconResolver.spec.ts tests/unit/utils/slotMachine.spec.ts`.
  Новий тест має падати через відсутній модуль, існуючий suite має проходити.
- [ ] Перенести незмінену MDI_TO_LUCIDE в iconResolver, реалізувати послідовність:

```ts
export interface IconFlags { iconsLucide: boolean; iconsRounded: boolean }
export function resolveIconName(name: string, flags: IconFlags): string {
  if (flags.iconsLucide) return MDI_TO_LUCIDE[name] ?? name
  if (flags.iconsRounded && name.startsWith('ic:baseline-')) {
    return 'ic:round-' + name.slice('ic:baseline-'.length)
  }
  return name
}
```

`MDI_TO_LUCIDE` тут є перенесеною таблицею з чинного `app/utils/iconMap.ts`, не новою мапою.
Зберегти кешування useLucide/useRounded в iconMap і делегувати resolver після читання флагів.
Обмеження Node ESM: `iconResolver.ts` і `iconManifest.ts` не мають extensionless value-імпортів (type-only
імпорти дозволені), Vite alias і browser dependencies; Node-скрипти не імпортують `iconMap.ts` та
`~/configs/featureFlags`. Генератор читає JSON колекцій через `createRequire` або `with { type: 'json' }`,
а `.ts`-імпорти між Node-скриптами дозволяє `allowImportingTsExtensions: true` у `tsconfig.node.json`.
- [ ] Додати параметризований тест усіх чотирьох flagCases і повторити команду тестів та `npm run typecheck`.
- [ ] Переглянути diff: таблиця і пріоритет без змін; commit `refactor: isolate icon name resolution`.

## Task 2: Manifest і незалежна перевірка джерел

**Files:** Create `app/utils/iconManifest.ts`, `scripts/icons/scan.ts`,
`tests/unit/utils/iconManifest.spec.ts`; modify `package.json`, `package-lock.json`, `tsconfig.node.json`.

**Interfaces:** `inputNames: readonly string[]`, `flagCases: readonly IconFlags[]`;
`dynamicBindings: readonly { file: string; expression: string; names: readonly string[] }[]`;
`scanIconUsage(sources: Record<string, string>):`
`{ literals: string[]; bindings: { file: string; expression: string }[] }`;
`validateIconUsage(usage: ReturnType<typeof scanIconUsage>, names: readonly string[],`
`bindings: typeof dynamicBindings): string[]`.

- [ ] Написати негативний тест scanner без читання manifest як його власного oracle:

```ts
import { expect, it } from 'vitest'
import { scanIconUsage, validateIconUsage } from '../../../scripts/icons/scan'

it('reports new literal and undeclared dynamic binding', () => {
  const usage = scanIconUsage({
    'app/components/Probe.vue': '<template><AppIcon icon="lucide:id-card" /><AppIcon :icon="nextIcon" /></template>',
  })
  const issues = validateIconUsage(usage, ['lucide:undo'], [])
  expect(issues.join('\n')).toContain('lucide:id-card')
  expect(issues.join('\n')).toContain('nextIcon')
})
```

- [ ] Запустити `npm run test:unit -- tests/unit/utils/iconManifest.spec.ts tests/unit/utils/slotMachine.spec.ts`;
  підтвердити FAIL нового тесту.
- [ ] Додати пряму devDependency `@vue/compiler-sfc`, сумісну з установленим Vue; використати наявний TypeScript.
  Сканувати template AST атрибути `icon`/`:icon`, script/scriptSetup і TS через compiler API;
  літерали в коментарях не враховувати. Імена мають відповідати повному `prefix:name`, не фрагменту `ic:round-`.
- [ ] Скласти manifest із 53 фактичних AppIcon-використань у 11 Vue-файлах. Значення всіх тернарників,
  DICE_FACES, SLOT_SYMBOL_WEIGHTS, countdownModeOptions і volumeIcon включити в inputNames.
  Записати кожен dynamic binding за file + нормалізованим AST expression, без прив’язки до номера рядка.
- [ ] Виключити тільки generated, внутрішню таблицю resolver і AST-вузол SHIELD_CATALOG;
  решту `shields.ts` продовжувати сканувати. Нове джерело іконок у TS має виявлятися без зміни allowlist файлів.
  Не переносити всі legacy map values в subset: outputNames = union resolver(inputNames, flagCases).
- [ ] Додати тести literal/binding drift, зайвих записів dynamicBindings, повного dice/slot набору,
  відсутності legacy `simple-icons`/`game-icons`, наявності `lucide:id-card` і `lucide:undo`.
  Динамічні значення звіряти з реальними AST-літералами масивів або функціональними тестами їх споживачів.
- [ ] Повторити команду тестів і typecheck; commit `feat: define and validate the local icon manifest`.

## Task 3: Build-time subset з aliases і детермінованим check

**Files:** Create `scripts/icons/subset.ts`, `scripts/generate-icons.ts`, `app/generated/iconCollections.json`,
`tests/unit/utils/iconSubset.spec.ts`; modify `package.json`, `package-lock.json`, `tsconfig.node.json`.

**Interfaces:** `buildCollections(sets: Record<string, IconifyJSON>, names: readonly string[]): IconifyJSON[]`;
`serializeCollections(sets: IconifyJSON[]): string`. `IconifyJSON` імпортується з прямої devDependency `@iconify/types`.
CLI `node scripts/generate-icons.ts [--check]`: generate записує файл; check не пише й повертає exit 1 при дрейфі.

- [ ] Написати alias-тест, використавши реальний пакет ic:

```ts
import { expect, it } from 'vitest'
import ic from '@iconify-json/ic/icons.json'
import { buildCollections } from '../../../scripts/icons/subset'

it('includes only requested records and rejects unknown names', () => {
  const sets = buildCollections({ ic }, ['ic:baseline-close', 'ic:round-close'])
  expect(Object.keys(sets[0]!.icons).sort()).toEqual(['baseline-close', 'round-close'])
  expect(() => buildCollections({ ic }, ['ic:missing-review-fixture'])).toThrow('ic:missing-review-fixture')
})
```

JSON імпортується напряму: `tsconfig.json` має `resolveJsonModule: true`, unit-тести працюють під Vite, а
`node:module` в `tests/unit/**` зламав би Typecheck (`types: ["vite/client"]`, без `node`).
Alias-випадок обов’язковий, бо manifest реально містить lucide-aliases `check-circle`, `user-circle`,
`more-vertical`: узяти їх з `@iconify-json/lucide`, звірити з `getIconData` і перевірити, що результат містить
повний body та успадковані dimensions/transformations. Саме через aliases subset будується через
`getIconData`, а не через пряме копіювання `icons[name]`.
- [ ] Запустити `npm run test:unit -- tests/unit/utils/iconSubset.spec.ts tests/unit/utils/iconResolver.spec.ts`;
  підтвердити FAIL нового тесту.
- [ ] Додати прямі devDependencies `@iconify/utils`, `@iconify/types`, `@iconify-json/lucide`, `@iconify-json/tabler`.
  Залежності читаються тільки Node-генератором. Дані вибирати так:

```ts
import { getIconData } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'

export function buildCollections(sets: Record<string, IconifyJSON>, names: readonly string[]): IconifyJSON[] {
  const result: Record<string, IconifyJSON> = {}
  for (const fullName of [...new Set(names)].sort()) {
    const [prefix, name] = fullName.split(':')
    if (!prefix || !name || !sets[prefix]) throw new Error(fullName)
    const data = getIconData(sets[prefix], name)
    if (!data) throw new Error(fullName)
    const collection = result[prefix] ??= { prefix, icons: {} }
    collection.icons[name] = data
  }
  return Object.values(result)
}
```

- [ ] CLI запускає scan/validate, обчислює всі resolvedNames, виключає `app:` з зовнішніх пакетів і
  звіряє ці імена з registerAppIcons. Серіалізація: стабільний порядок prefixes/keys, JSON indent 2, newline.
  `--check` порівнює байти committed файла з очікуваним; відсутній файл і невідомий прапорець CLI дають exit 1.
  `serializeCollections()` повертає саме цей формат і має тест стабільності при переставлених inputNames.
- [ ] Додати scripts `icons:generate` і `icons:check`, Node tsconfig include `scripts/icons/**/*.ts`,
  `scripts/generate-icons.ts`; запустити generate, check і повторний generate, підтвердити відсутність нового diff.
- [ ] Повторити тести й typecheck; commit `feat: generate the offline icon subset at build time`.

## Task 4: Реєстрація до mount і явна помилка пропущеної іконки

**Files:** Create `app/lib/registerLocalIcons.ts`, `app/lib/iconPolicy.ts`,
`tests/unit/components/AppIcon.spec.ts`; modify `app/main.ts`, `app/components/AppIcon.vue`,
`app/components/PlayerRow.vue`. Чинний `registerAppIcons.ts` зберігається.

**Interfaces:** `registerLocalIcons(): void`; `installIconPolicy(): void`;
`assertLocalIcon(name: string): void`. У dev/test guard кидає `Missing local icon: <name>`.

- [ ] Написати тест реального локального рендеру, не підмінюючи Icon:

```ts
import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppIcon from '~/components/AppIcon.vue'
import { registerLocalIcons } from '~/lib/registerLocalIcons'

it('renders a direct Lucide icon from the registered subset', async () => {
  registerLocalIcons()
  const wrapper = mount(AppIcon, { props: { icon: 'lucide:id-card' } })
  await nextTick()
  expect(wrapper.find('svg').exists()).toBe(true)
  expect(wrapper.find('svg').element.childElementCount).toBeGreaterThan(0)
  wrapper.unmount()
})
```

`await nextTick()` обов’язковий: `<Icon>` з `@iconify/vue` вмикає рендер лише в `onMounted`, тож синхронний
`find('svg')` одразу після `mount` порожній навіть при зареєстрованих даних.
- [ ] Запустити `npm run test:unit -- tests/unit/components/AppIcon.spec.ts tests/unit/components/PlayerRow.spec.ts`;
  підтвердити FAIL нового тесту.
- [ ] registerLocalIcons реєструє generated collections через addCollection і викликає registerAppIcons.
  У main замінити виклик registerAppIcons на registerLocalIcons, далі installIconPolicy, далі createApp/mount.
- [ ] У dev/test викликати `_api.setFetch` з функцією, що реєструє спробу і повертає rejected Promise.
  `_api` - внутрішній експорт `@iconify/vue` без гарантій стабільності; його контракт фіксує негативний тест
  нижче, який упаде при зміні API після оновлення пакета.
  Guard перед Icon викликає `iconLoaded(resolved)` і кидає помилку, якщо даних немає. Глобальний fetch не змінювати.
  Production лишає чинну поведінку бібліотеки; захист від пропусків забезпечують check і browser tests.
- [ ] Додати негативний mount невідомого `ic:missing-review-fixture`: очікувати явну помилку й нуль
  викликів мережевого transport; окремо перевірити, що policy не змінює globalThis.fetch.
  Відновлювати Iconify transport після кожного тесту, щоб не впливати на інші suites.
- [ ] Додати тест повного manifest у `tests/unit/utils/iconManifest.spec.ts`: після `registerLocalIcons()`
  для кожного `inputName × flagCases` очікувати `iconLoaded(resolveIconName(name, flags))` true. Це заміняє
  fixture як перевірку покриття кроку 1; fixture/contact sheet залишаються в A/B-плані.
- [ ] У PlayerRow прибрати імпорт, виклик loadIcons і застарілий коментар над DICE_FACES, зберегти масив/анімацію.
  У AppIcon зберегти один кореневий Icon, fallthrough attributes і props.
- [ ] Прогнати AppIcon, PlayerRow, CardsArea, SlotMachine suites та `npm run typecheck`;
  commit `fix: render all application icons from local data`.

## Task 5: Required checks, production graph і актуальні інструкції

**Files:** Create `scripts/audit-icon-build.ts`; modify `package.json`, `tsconfig.node.json`,
`.github/workflows/ci.yml`, `app/components/AGENTS.md`.

**Interfaces:** CLI `node scripts/audit-icon-build.ts <dist-dir>` пише
`test-results/icon-rendering/bundle.json`, exit 1 для забороненого browser module.
Звіт: `{ files: { path: string; rawBytes: number; gzipBytes: number }[], forbiddenSources: string[],`
`entryChunk: { gzipBytes: number; baselineGzipBytes: number; deltaGzipBytes: number } }`.

- [ ] Для аудиту збірки unit seam не потрібний: перевіряти реальні build sourcemaps, які Vite вже генерує.
  Скрипт читає всі JS/CSS artifacts, gzip через `node:zlib`, module sources з `.map`; відсутні sourcemaps дають exit 1.
  Заборонити source paths повних `@iconify-json/*/icons.json`, `scripts/generate-icons.ts`, `scripts/icons/`.
  Не забороняти generated subset або коротку згадку назви бібліотеки в ліцензії.
- [ ] Бюджет: до початку кроку 1 зняти baseline gzip entry chunk з `main` і зберегти в
  `test-results/icon-rendering/bundle-baseline.json`; аудит рахує дельту і дає exit 1, якщо вона > 25 KB gzip.
  Якщо поріг перевищено, lucide-колекцію винести в окремий chunk через `await import()` до mount лише при
  увімкненому `iconsLucide`; ic/tabler залишаються в entry chunk. Рішення про chunking записати в звіт.
- [ ] Додати `icons:audit-build`, `icons:check` на початок `test:ci`, окремий крок `npm run icons:check`
  у job `typecheck` перед vue-tsc; зберегти job name `Typecheck`. У job Build після build додати artifact audit.
- [ ] Через maintaining-agent-context оновити тільки секцію іконок `app/components/AGENTS.md`:
  реальні offline prefixes, 9 app SVG включно з timer, шлях manifest, generate/check і відсутність legacy шилдів у UI.
  Залишити ≤200 рядків; CLAUDE import-shim не змінювати.
- [ ] Запустити `npm run icons:check`, `npm run test:ci`, `npm run icons:audit-build`.
  У тимчасовій копії generated JSON прибрати один запис і виконати check проти цієї копії через unit-тест
  serializer/check; очікувати mismatch. Не псувати committed файл для ручної перевірки.
- [ ] Переглянути залежності й lockfile: тільки потрібні пакети; commit `ci: enforce the local icon contract`.

## Task 6: Браузерна й візуальна перевірка кроку 1

**Files:** Create `tests/e2e/icon-delivery.spec.ts`; modify `playwright.config.ts`,
`package.json`, `.github/workflows/ci.yml`.

**Interfaces:** окремий Playwright project `icon-delivery`, без Supabase secrets, testMatch тільки нового файла;
локально `npm run test:e2e:icons` запускає цей project. Виключити його з chromium/webkit projects, щоб
уникнути дублювання. У CI job Public pages load виконує один виклик
`playwright test --project page-load --project icon-delivery` замість двох окремих запусків.

- [ ] Написати тест, який перехоплює всі три публічні Iconify hosts до navigation, abort-ить їх,
  збирає attempts і перевіряє `attempts` порожнім після видимості іконок. Перевірити `/`, `/login`, `/ffc`
  і volume popup на головній для кожної з чотирьох комбінацій FEATURE_FLAGS у новому контексті.
  Використати існуючий `data-testid=volume-button`; після кліку дочекатися volume-slider.

```ts
import { expect, test } from '@playwright/test'

for (const iconsLucide of [false, true]) {
  for (const iconsRounded of [false, true]) {
    test(`local header icons: ${iconsLucide}/${iconsRounded}`, async ({ page }) => {
      const attempts: string[] = []
      await page.addInitScript(flags => {
        localStorage.setItem('FEATURE_FLAGS', JSON.stringify(flags))
      }, { iconsLucide, iconsRounded })
      await page.route(/https:\/\/api\.(iconify\.design|simplesvg\.com|unisvg\.com)\//, async route => {
        attempts.push(route.request().url())
        await route.abort()
      })
      await page.goto('/')
      const volume = page.getByTestId('volume-button')
      await expect(volume.locator('svg')).toBeVisible()
      expect(await volume.locator('svg').evaluate(e => e.childElementCount)).toBeGreaterThan(0)
      await volume.click()
      await expect(page.getByTestId('volume-slider')).toBeVisible()
      expect(attempts).toEqual([])
    })
  }
}
```

Додаткові route/cold-cache випадки використовують ту саму ініціалізацію до navigation;
кожний Playwright test отримує незалежний контекст.
- [ ] Перевірити на production preview: `npm run test:e2e:icons`; у наявному job Public pages load замінити
  команду на `playwright test --project page-load --project icon-delivery` з його dummy Supabase env,
  без перейменування required job і без звернень до живої кімнати.
- [ ] Візуальна перевірка: Playwright screenshots `/`, `/login`, `/ffc` до (з `main`) і після змін у
  `test-results/icon-rendering/screenshots/`; порівняти вручну, розбіжності в іконках - блокер. Повне
  покриття manifest дає Vitest-тест Task 4; fixture/contact sheet/offline room - у A/B-плані, не тут.
- [ ] Зберегти звіт локальної доставки, screenshots і baseline bundle в test-results/icon-rendering;
  виконати `npm run test:ci`, `npm run icons:audit-build`, `npm run test:e2e:icons`.
- [ ] Запросити code review, усунути підтверджені зауваження; commit `test: verify offline icon delivery`.
  Інтеграцію гілки виконувати через finishing-a-development-branch; прямий push у main заборонений.

## Самоперевірка плану

- Resolver/flags: Task 1. Reachable manifest і дрейф: Task 2. Alias-safe subset: Task 3.
- Реєстрація/fallback guard/повний manifest × flagCases: Task 4. CI, bundle-бюджет 25 KB gzip, AGENTS: Task 5.
- Browser/visual: Task 6 власними тестами; закриття плану не залежить від A/B-плану. Артефакти мають шляхи.
- План не виконує міграцію mask і не стверджує наявності fixture, якої ще немає.

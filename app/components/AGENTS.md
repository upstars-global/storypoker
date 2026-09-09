# Components - контракти й іконки

## Спільні компоненти

- `AppModal` (native `<dialog>`, `AppModal.vue`) - props `open: boolean, lockDismiss?: boolean`, emit `close`;
  контент загортається в `AppModalPaper` (`style="max-width: …"` задає ширину модалки)
- `AppTooltip` (`AppTooltip.vue`) - props `side?, sideOffset?`, slots `#trigger` `#content`
- `useClickOutside` (`app/composables/useClickOutside.ts`) - закриття dropdown-меню в AppHeader та PlayerRow
- `RolePicker.vue` - спільний селектор ролі (JoinOverlay + PlayerEditModal) на базі `RoleBadge.vue`;
  каталог ролей і запис у `players.shields` - `app/utils/AGENTS.md`

## Іконки

Усі іконки - offline, мережевих запитів до Iconify немає, `@iconify/vue` у бандлі відсутній. Рендер - CSS mask:
`<AppIcon>` віддає `<span class="sp-icon-root sp-icon sp-icon-<prefix>-<name>">`, а стилі приходять зі
згенерованого `app/generated/icons.css` (`app/main.ts` імпортує його першим).

Виняток - кольорові іконки. `app/generated/coloredIcons.json` тримає їх готову розмітку, `<AppIcon>` вставляє її
через `v-html` у `<span class="sp-icon-root sp-icon-inline">`. Зараз виняток один: `app:town-hall` (кнопка
countdown «wet») змішує `currentColor` з `#0057B7`/`#FFD700`, і mask-режим зводить усі заливки до `currentColor`.
Список винятків - `COLORED_ICONS` у `scripts/icons/coloredIcons.ts`; генератор сам детектує фіксовані заливки і
падає, якщо детекція розходиться зі списком у будь-який бік.

Рендер проганяє назву крізь `mapIconName()` (`app/utils/iconMap.ts` читає флаги і делегує чистому
`resolveIconName()` в `app/utils/iconResolver.ts`): `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову
lucide-іконку треба додати в `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`.

Джерело істини для subset - `app/utils/iconManifest.ts` (`inputNames` + `dynamicBindings` + чотири `flagCases`).
Додав нову іконку - додай ім'я туди й перегенеруй: `npm run icons:generate` пише чотири артефакти в
`app/generated/` (`iconCollections.json`, `icons.css`, `iconClasses.json`, `coloredIcons.json`).
Сканер звіряє `names` кожного binding-а з літералами, знайденими в джерелах, тож застарілий запис падає. Зворотний
напрямок не покривається: літерал невідомої колекції, схований у змінній поза icon-контекстом, статично
нерозрізненний з Tailwind-варіантом (`sm:hidden`), тож його ловить `throw` у dev/test, а не сканер.
`npm run icons:check` (у job `Typecheck` і на початку `test:ci`) падає на дрейфі будь-якого з них,
`npm run icons:audit-build` стежить за browser graph і бюджетом JS+CSS. У dev/test пропущена іконка кидає
`Missing local icon: <name>`. Legacy `simple-icons:*`/`game-icons:*` лишилися тільки в `SHIELD_CATALOG` для
лукапу і в UI не рендеряться. З чотирьох артефактів рантайм читає три: `iconCollections.json` - fixture для
unit-тестів, і `icons:audit-build` падає, якщо він потрапляє в production graph.

## Діаграми

Тільки ECharts (`echarts` + `vue-echarts`, модулі через `echarts/core` + `use([...])` заради розміру бандла).
Перед роботою з графіками активуй skill `echarts`. `AlignmentTrendsModal.vue` уже мігрований; саморобний SVG
лишився в `PieChart.vue` - при дотику переписуй на ECharts.

## Side widget і слот

`sp-side-widget` (`timer | slot`) - лівий віджет кімнати перемикається кнопкою в хедері блоку (Timer ↔ SlotMachine).
Слот: 3 барабани, зважена випадковість (`utils/slotMachine.ts`), 3 спіни на гравця за раунд (скидаються за
`round_started_at`), джекпот = 3 однакові символи. Спін гейтиться `canSpinSlot` (`[slug].vue`) - `PO`/`SM` завжди,
решта лише після власного голосу і поки хтось ще не проголосував. Стан спіну/виграшу транслюється broadcast-каналом
`countdown:<roomId>` (`slot-spin-start`/`slot-spin-end`/`slot-win`), єдиний видимий ефект - кубик і блимання імені в
`PlayerRow.vue`. Деталі механіки й анімацій - `DESIGN.md` §11.8

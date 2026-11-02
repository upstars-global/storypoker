# Components - контракти й іконки

## Спільні компоненти

- `AppModal.tsx` - Base UI Dialog (`ui/dialog`), popup рендериться як `<dialog open class="app-modal">` з
  `.mui-modal-overlay` всередині, `modal="trap-focus"` (без scroll lock); props `open, lockDismiss?, labelledby?,
  describedby?, initialFocus?, onClose`. Контент загортається в `AppModalPaper` (`style={{ maxWidth }}` задає ширину)
- `AppTooltip.tsx` - Base UI Tooltip; props `side?, sideOffset?, className?, trigger` (ReactElement), вміст -
  `children`; сам ставить `role="tooltip"` і `aria-describedby`, popup лишається змонтованим
- `AppMenu`/`AppMenuItem` (`AppMenu.tsx`, на `ui/dropdown-menu`) - меню AppHeader і PlayerRow; меню порталиться в
  `body`, тож у тестах шукай `page.getByRole('menu')`, а не всередині рядка
- `useRipple()` (`app/hooks/useRipple.ts`) - callback ref Material-ripple: `ref={useRipple()}` на кнопці;
  `Button` з `ui/` його сам не чіпляє. Текст кнопки, що змінюється, загортай у `<span>`, щоб хвиля не зникала
- `RolePicker.tsx` - спільний селектор ролі (JoinOverlay + PlayerEditModal) на базі `RoleBadge.tsx`;
  каталог ролей і запис у `players.shields` - `app/utils/AGENTS.md`
- `app/components/ui/` - згенеровані shadcn CLI примітиви (`button`, `dialog`, `dropdown-menu`, `select`,
  `tooltip`, `input`); стилі - лише через міст токенів (`app/assets/AGENTS.md`). Switch не прийнятий: перемикачі
  `/ffc` і `PlayerRow` лишаються на `.mui-switch` (як і кнопка скидання в `/ffc` на `.mui-btn`) заради піксельної
  рівності з Vue-версією

## Іконки

Усі іконки - offline, мережевих запитів до Iconify і Iconify-рантайму в бандлі немає. Рендер - CSS mask:
`<AppIcon name="…">` віддає `<span class="sp-icon-root sp-icon sp-icon-<prefix>-<name>">`, а стилі приходять зі
згенерованого `app/generated/icons.css` (`main.css` імпортує його в `layer(components)`).

Виняток - кольорові іконки. `app/generated/coloredIcons.json` тримає їх готову розмітку, `<AppIcon>` вставляє
її через `dangerouslySetInnerHTML` у `<span class="sp-icon-root sp-icon-inline">`. Зараз виняток один: `app:town-hall`
(кнопка countdown «wet») змішує `currentColor` з `#0057B7`/`#FFD700`, і mask-режим зводить усі заливки до `currentColor`.
Список винятків - `COLORED_ICONS` у `scripts/icons/coloredIcons.ts`; генератор сам детектує фіксовані заливки і
падає, якщо детекція розходиться зі списком у будь-який бік.

Набір іконок - Material (`ic:*`); Lucide вмикається лише прапором `iconsLucide`, нові `lucide:*` хардкодити в
компонентах не можна. Наявні винятки: `lucide:id-card` і volume-тріо `lucide:volume-x`/`volume-1`/`volume-2`
(AppHeader) та `lucide:undo` (CardsArea). Shadcn-компоненти в `app/components/ui/` лишають свої іконки з
`lucide-react`, як їх генерує shadcn; правило вище стосується іконок застосунку поза `ui/`.
Рендер проганяє назву крізь `mapIconName()` (`app/utils/iconMap.ts` читає флаги і делегує чистому
`resolveIconName()` в `app/utils/iconResolver.ts`): `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову
lucide-іконку треба додати в `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`.

Джерело істини для subset - `app/utils/iconManifest.ts` (`inputNames` + `dynamicBindings` + чотири `flagCases`).
Додав нову іконку - додай ім'я туди й перегенеруй: `pnpm run icons:generate` пише чотири артефакти в
`app/generated/` (`iconCollections.json`, `icons.css`, `iconClasses.json`, `coloredIcons.json`).
Сканер звіряє `names` кожного binding-а з літералами, знайденими в джерелах, тож застарілий запис падає. Зворотний
напрямок не покривається: літерал невідомої колекції, схований у змінній поза icon-контекстом, статично
нерозрізненний з Tailwind-варіантом (`sm:hidden`), тож його ловить `throw` у dev/test, а не сканер.
`pnpm run icons:check` (у job `Typecheck` і на початку `test:ci`) падає на дрейфі будь-якого з них,
`pnpm run icons:audit-build` стежить за browser graph і бюджетом JS+CSS. У dev/test пропущена іконка кидає
`Missing local icon: <name>`. Legacy `simple-icons:*`/`game-icons:*` лишилися тільки в `SHIELD_CATALOG` для
лукапу і в UI не рендеряться. Рантайм читає три артефакти з чотирьох; `iconCollections.json` у бандл не йде -
це fixture для unit-тестів, і `icons:audit-build` падає, якщо він потрапляє в production graph.

## Діаграми

Тільки ECharts: модулі через `echarts/core` + `use([...])` заради розміру бандла, рендер - хук
`useEChart(containerRef, option)` (`app/hooks/useEChart.ts`: init, `ResizeObserver`, `setOption` з
`notMerge`, dispose). Перед роботою з графіками активуй skill `echarts`. `AlignmentTrendsModal.tsx`
вантажиться через `lazy()` у `[slug].tsx`, `PieChart.tsx` - через `lazy()` у `ResultsArea.tsx`:
eager-імпорт виводить entry за бюджет `icons:audit-build`. Кола використовують ECharts pie з
`SVGRenderer` і явним `{ renderer: "svg" }`. За однієї чи двох груп контейнери ростуть до 500 px
(`flex: 1 1 280px`); діаметр кола - 80% контейнера для різних оцінок і 98% для однієї унікальної оцінки.
У великих контейнерах розмір цифр - 6% ширини для секторів і 12% для суцільного кола.
За трьох і більше груп контейнери мають ширину до 240 px, діаметр - 80%. Контейнери звужуються до
доступної ширини й переносяться на нові рядки; довгі назви ролей переносяться без накладень.
Одна унікальна оцінка дає суцільне коло, кілька - сектори з підписами карт. Групи з `groupResultVotes()` включають
проголосовані вбудовані й кастомні ролі; `ResultsArea` та `AlignmentCard` використовують стабільний ключ
групи окремо від підпису (для legacy-викликів - fallback на підпис). Підпис `<ROLE>: <середнє>`
рендериться поза графіком одразу; під час завантаження чанка або його збою лишається порожнє місце того
самого розміру без екранної помилки.

Коли потрібен конкретний renderer, передай його явно третім аргументом
`useEChart(containerRef, option, { renderer: "svg" })` або `"canvas"`.
Реєстрація `SVGRenderer` через `use([...])` не задає renderer конкретного
instance; ECharts за замовчуванням використовує Canvas.

## Side widget і слот

`sp-side-widget` (`timer | slot`) - лівий віджет кімнати перемикається кнопкою в хедері блоку (Timer ↔ SlotMachine).
Слот: 3 барабани, зважена випадковість (`utils/slotMachine.ts`), за раунд 3 спіни на гравця, у `PO`/`SM` - 5
(`spinsPerRound`, скидаються за `round_started_at`), джекпот = 3 однакові символи. Спін гейтиться `canSpinSlot`
(`[slug].tsx`) - `PO`/`SM` завжди, решта лише після власного голосу і поки хтось ще не проголосував. Стан
спіну/виграшу транслюється broadcast-каналом `countdown:<roomId>` (`slot-spin-start`/`slot-spin-end`/`slot-win`),
єдиний видимий ефект - кубик і блимання імені в `PlayerRow.tsx`. Деталі механіки й анімацій - `DESIGN.md` §11.8

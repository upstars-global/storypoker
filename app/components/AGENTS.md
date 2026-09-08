# Components - контракти й іконки

## Спільні компоненти

- `AppModal` (native `<dialog>`, `AppModal.vue`) - props `open: boolean, lockDismiss?: boolean`, emit `close`;
  контент загортається в `AppModalPaper` (`style="max-width: …"` задає ширину модалки)
- `AppTooltip` (`AppTooltip.vue`) - props `side?, sideOffset?`, slots `#trigger` `#content`
- `useClickOutside` (`app/composables/useClickOutside.ts`) - закриття dropdown-меню в AppHeader та PlayerRow
- `RolePicker.vue` - спільний селектор ролі (JoinOverlay + PlayerEditModal) на базі `RoleBadge.vue`;
  каталог ролей і запис у `players.shields` - `app/utils/AGENTS.md`

## Іконки

Усі іконки - offline, мережевих запитів до Iconify немає. Prefixes `ic:`, `lucide:`, `tabler:` беруться з
committed subset `app/generated/iconCollections.json`; custom collection `app:` (`moderator`, `deciding`, `offline`,
`leave-room`, `bank`, `town-hall`, `fibonacci`, `scrum`, `timer`) - через `addCollection` у
`app/lib/registerAppIcons.ts`. Обидва реєструє `registerLocalIcons()` (`app/lib/registerLocalIcons.ts`), який
`app/main.ts` кличе до mount, далі `installIconPolicy()`.

Рендер - через `<AppIcon>`, який проганяє назву крізь `mapIconName()` (`app/utils/iconMap.ts` читає флаги і делегує
чистому `resolveIconName()` в `app/utils/iconResolver.ts`): `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову
lucide-іконку треба додати в `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`.

Джерело істини для subset - `app/utils/iconManifest.ts` (`inputNames` + `dynamicBindings` + чотири `flagCases`).
Додав нову іконку - додай ім'я туди й перегенеруй: `npm run icons:generate`; `npm run icons:check` (у job `Typecheck`
і на початку `test:ci`) падає на дрейфі, `npm run icons:audit-build` стежить за browser graph і бюджетом entry chunk.
У dev/test пропущена іконка кидає `Missing local icon: <name>` замість тихого мережевого fallback.
Legacy `simple-icons:*`/`game-icons:*` лишилися тільки в `SHIELD_CATALOG` для лукапу і в UI не рендеряться.

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

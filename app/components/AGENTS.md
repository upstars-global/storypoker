# Components - контракти й іконки

## Спільні компоненти

- `AppModal` (native `<dialog>`, `AppModal.vue`) - props `open: boolean, lockDismiss?: boolean`, emit `close`;
  контент загортається в `AppModalPaper` (`style="max-width: …"` задає ширину модалки)
- `AppTooltip` (`AppTooltip.vue`) - props `side?, sideOffset?`, slots `#trigger` `#content`
- `useClickOutside` (`app/composables/useClickOutside.ts`) - закриття dropdown-меню в AppHeader та PlayerRow
- `RolePicker.vue` - спільний селектор ролі (JoinOverlay + PlayerEditModal) на базі `RoleBadge.vue`;
  каталог ролей і запис у `players.shields` - `app/utils/AGENTS.md`

## Іконки

`@iconify/vue` + `@iconify-json/ic` (`ic:baseline-*`, єдина offline-колекція);
`simple-icons:*`/`game-icons:*`/`tabler:*`/`lucide:*` резолвляться через Iconify API; custom collection `app:`
(`moderator`, `deciding`, `offline`, `leave-room`, `bank`, `town-hall`, `fibonacci`, `scrum`) через `addCollection`
у `app/lib/registerAppIcons.ts`. Рендер - через `<AppIcon>`, який проганяє назву крізь `mapIconName()`
(`app/utils/iconMap.ts`): флаг `iconsLucide` ремапить `ic:baseline-*`→`lucide:*` (нову lucide-іконку треба додати
в `MDI_TO_LUCIDE`, інакше fallback на raw), `iconsRounded`→`ic:round-*`.

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

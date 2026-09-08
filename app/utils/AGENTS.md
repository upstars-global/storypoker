# Utils - колоди, ролі, формули



Пресети в `app/utils/cardDecks.ts`:

| id | default active |
|---|---|
| `scrum` | `1/2,1,2,3,5,8,13,20,?,☕` |
| `fibonacci` | `1,2,3,5,8,13,21,?,☕` |
| `tshirt` | `S,M,L,XL,?,☕` |
| `hours` | `1/2h,1h,2h,3h,5h,8h,13h,20h,?,☕` |
| `boolean` | `True,False,?,☕` |
| `voting` | `yes,no,☕` (опційні `🍺,🚬`) |
| `vote_question` | кастомні опції; дефолт `Option A,Option B,Option C` |
| `goal_clarity` | `1,2,3,4,5` |

`0` є в усіх небулевих оцінювальних пресетах (не у `voting`/`vote_question`/`goal_clarity`), але деактивований за
замовчуванням. `☕` - символ, не SVG. `setDeckPreset()` пише `deck_preset + defaultActive + poll_question`
(`preset.defaultQuestion ?? null`); `saveCardDeck()` пише тільки `active_cards`.

`goal_clarity` ("Goal Clarity Score") - фіксоване питання "Наскільки чітко я розумію Sprint Goals?" (`defaultQuestion`
на пресеті, не moderator-typed `poll_question`, як у `voting`/`vote_question`); рахується як звичайний числовий пресет
(`isNumericPreset` у `roundStats.ts`, `DECK_NAMES` у `room-json.mts`). Після reveal `ResultsArea.vue` показує не
PieChart, а кольорове коло з середнім балом (`goalClarityScore` prop): зелене `>3.5`, жовте `3.5-2.5`, червоне `<2.5`;
за результатом `≤3.5` - підказка переформулювати ціль/DoD (`results.goalClarityHint`).

## Формули узгодженості

`alignmentScore`/`averageOf` (`app/utils/alignment.ts`, `roundStats.ts`) і DEV/QA-спліт (`shields.ts`) навмисно
продубльовані в `netlify/functions/room-json.mts` - Netlify bundler не резолвить Vite alias `~/*`. Зміну формули
синхронізувати вручну в обох місцях. Pipeline графіка узгодженості (`AlignmentTrendsModal.vue`) - `DESIGN.md`
§11.3–11.4.

`isNumericPreset` вирішує, які колоди потрапляють в узгодженість: `scrum`/`fibonacci`/`hours`/`goal_clarity` +
legacy `deck_preset=null`; poll-колоди (`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключені.

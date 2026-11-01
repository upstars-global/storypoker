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

`scrum`/`fibonacci` не мають `0` і нічого понад 21; `tshirt`/`hours` мають `0`, деактивований за замовчуванням.
Застарілі карти в `active_cards` (з часів ширших колод) відсікає `activeCardsForDeck()` перед рендером. `☕` - символ, не SVG. `setDeckPreset()` пише `deck_preset + defaultActive + poll_question`
(`preset.defaultQuestion ?? null`); `saveCardDeck()` пише тільки `active_cards`.

`goal_clarity` ("Goal Clarity Score") - фіксоване питання "Наскільки чітко я розумію Sprint Goals?" (`defaultQuestion`
на пресеті, не moderator-typed `poll_question`, як у `voting`/`vote_question`); рахується як звичайний числовий пресет
(`isNumericPreset` у `roundStats.ts`, `DECK_NAMES` у `room-json.mts`). Після reveal `ResultsArea.tsx` замість
PieChart показує кольорове коло з середнім балом (`goalClarityScore` prop): зелене `>3.5`, жовте `3.5-2.5`, червоне `<2.5`;
за результатом `≤3.5` - підказка переформулювати ціль/DoD (`results.goalClarityHint`).

## Формули узгодженості

`alignmentScore`/`averageOf` (`alignment.ts`, `roundStats.ts`), визначення сирих рольових когорт
(`resultCohorts.ts`) і фолбек колоди навмисно продубльовані в `netlify/functions/room-json.mts`: Netlify
bundler не резолвить Vite alias `~/*`. Зміни синхронізувати вручну. Legacy-поля API мають окремий
контракт для agilecharts (`netlify/AGENTS.md`). Pipeline трендів та історії - `DESIGN.md` §11.3-11.4.

`isNumericPreset` вирішує, які колоди потрапляють в узгодженість: `scrum`/`fibonacci`/`hours`/`goal_clarity` +
legacy `deck_preset=null`; poll-колоди (`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключені.

`voteCohortFor()` визначає сиру роль у порядку DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM; кастомна роль дає
`null`, відсутня роль або гравець - DEV. `COHORT_COLORS` - спільні кольори ліній трендів і бейджів
історії та знімка. `roleRoundAlignment()` рахує кожну роль окремо, включно з PO/SM.
Гравці, які вийшли, теж отримують фолбек DEV.
`summarizeRound()` бере середнє й узгодженість із
`estimatorVotes()`: пул DEV/BE/FE/SRE/QA/GQA/AQA, а коли їхніх голосів немає - усі голоси.
Узгодженість має ціле значення 0-100; менше двох карт колоди без `?`/`☕` дають `null`. Головна бере округлене середнє не-null
загальних балів числових раундів; картки трендів - ті самі загальні бали у видимому періоді.

## Автоматичні групи результатів

Роль обирається з `PLAYER_ROLES` (`shields.ts`) через `RolePicker.tsx` (JoinOverlay + PlayerEditModal)
на базі `RoleBadge.tsx` і пишеться в `players.shields` як один shield через `shieldForRoleTag()`.
Кастомні ролі мають префікс `custom:`, навіть коли назва збігається зі стандартною роллю.
`SHIELD_CATALOG` (role/focus/stack/qa/lead) лишився для лукапу, icon-picker прибрано.

`groupResultVotes(players)` повертає `{ key, label, votes }[]` лише для ролей із голосами. Вбудовані ролі
йдуть у порядку `ROLE_COHORTS`, кастомні - після них за першим проголосувавшим учасником у списку кімнати.
Ключ кастомної ролі - повний shield `custom:...`, підпис - назва без префікса. Однакові shields групуються;
`custom:DEV` і DEV мають різні ключі й кола. Перша розпізнана вбудована або кастомна роль у shields визначає
групу; без неї - DEV. Порожні голоси не створюють груп.

Групування кіл відокремлене від `voteCohortFor()`, `roleRoundAlignment()` і `estimatorVotes()`: контракти
історії, трендів, головної та API лишаються незмінними. `normalizeCohorts()`, `resultCohortFor()` і
`groupVotesByCohort()` збережені для сумісності; UI кіл їх не використовує. `room_state.result_cohorts`
ігнорується під час показу, збереження колоди його не змінює.
Секції «Показувати результати» й чіпів немає; збережене налаштування не приховує голосів
і не робить бейдж червоним. Розміри кіл і детальний контракт - `DESIGN.md` §11.9.

## Consensus

`resultCelebration.ts → shouldCelebrate(votes, groups)` - єдиний предикат для салюту (`ResultsArea.tsx`) і звуку
(`isConsensus` у `pages/[slug].tsx`); `groups` - автоматичні кола з `groupResultVotes()` (`resultCohorts.ts`),
включно з кастомними. Одноголосною вважається група з рівно однією унікальною оцінкою **і** ≥ 2 голосами.
Без груп те саме правило застосовується до всіх голосів.
Поріг ≥ 2 узгоджений з `DESIGN.md` §11: рядок `round_history` теж пишеться лише при `votes.length >= 2`.

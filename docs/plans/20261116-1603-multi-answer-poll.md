# Multi-answer poll - implementation plan

**Spec:** docs/specs/2026-11-16-multi-answer-poll-design.md

**Goal:** У `vote_question` модератор вмикає чекбокс мультивибору біля питання; гравці обирають кілька відповідей,
бульбашки рахують вибори, над ними - «Учасників, що проголосували: N».

**Architecture:** Спершу схема й стор (колонка `poll_multiple`, скидання на новий раунд і зміну колоди), потім
чисті утиліти формату голосу (`\n`-рядок у порядку колоди), далі UI налаштування й голосування в `CardsArea`,
потім підрахунок і проводка в `[slug].tsx`, наприкінці відображення результатів і бейджа. Утиліти до UI, бо
підрахунок, голосування й бейдж споживають один формат. Waves: n/a - задачі послідовні, `[slug].tsx` спільний
для кількох із них.

**Stack:** React 19, TypeScript 7, Zustand 5, Supabase, i18next, Vitest (`pnpm run test:unit`), oxlint, `tsc`.

**Base check:** `sh scripts/check-local.sh && pnpm run test:unit` - project default.

**Execution:** inline

## Global constraints

Decisions (зі специфікації, дослівно):

1. Мультивибір - лише в `vote_question`. У «Vote - Y/N» (`voting`) його немає. Рішення користувача: «1 vote-question».
2. Чекбокс ставить модератор разом із питанням до «Почати голосування»; під час раунду режим не змінюється. Беремо
   це, а не перемикання посеред раунду: інакше треба вирішувати долю вже поставлених кількох відповідей.
3. Відповіді гравця зберігаються в наявному `players.vote` одним рядком: вибрані відповіді в порядку колоди,
   з'єднані `\n`. Режим зберігає нова колонка `room_state.poll_multiple boolean not null default false` (міграція
   `023`). Беремо це, а не нову колонку `players.votes text[]`: скидання й undo, оптимістичні голоси, знімок
   попереднього раунду і `round_history` лишаються без змін. `\n` безпечний роздільник, бо поле відповіді його не
   пропускає.
4. Бейдж гравця після reveal показує всі вибрані відповіді через кому, кожну обрізану, як зараз, до 8 символів.
5. Під бульбашкою, як і зараз, кількість виборів цієї відповіді. У режимі мультивибору над бульбашками ще й рядок
   «Учасників, що проголосували: N» (en: «Voters: N»), бо сума під бульбашками може бути більшою за кількість людей.
   Формулювання з двокрапкою обходить плюральні форми, яких у локалях немає. N - на всю кімнату, бо бульбашки
   опитувальних колод - один ряд на кімнату, без рольових кіл.
6. Підрахунок для бульбашок і рольових груп ділить рядок голосу за `\n` незалежно від режиму: одиночний голос
   `\n` не містить, тож результат для нього не змінюється.
7. Чекбокс до старту - локальний стан браузера модератора, як і чернетки питання й відповідей; іншим модераторам
   він не транслюється.
8. «Скинути голоси» не змінює `poll_multiple`: раунд і питання лишаються ті самі.
9. Знімок попереднього раунду додатково зберігає, чи був мультивибір, і кількість учасників, що проголосували, щоб
   перегляд показував той самий рядок над бульбашками.

Out of scope (дослівно):

1. Мультивибір у `voting` («Vote - Y/N») і в числових колодах.
2. Ліміт на кількість відповідей одного гравця.
3. Зміна режиму посеред раунду.
4. Відображення раундів з опитувань в історії й трендах.
5. Захист від однакових текстів відповідей (наявна поведінка).

Security Model (дослівно):

1. Довірені входи: рішення користувача в розмові. Недовірені: текст питань і відповідей від модератора, значення
   `players.vote`.
2. Як і решта модераторських дій, чекбокс гейтиться лише на клієнті (`isModerator`); RLS `using (true)` не
   змінюється, нові політики не потрібні.
3. Складений `players.vote` рендериться як текст через React, без `dangerouslySetInnerHTML`.
4. Міграція `023` лише додає колонку з дефолтом; секретів і серверних ключів зміна не торкається.

Проєктне обмеження: локальний запуск і stage ходять у прод-базу Supabase; до злиття схему прод-бази не змінювати.
Міграцію `023` застосовує власник після злиття (погоджено в специфікації); ручна перевірка в браузері - на
локальному Supabase (`pnpm run supabase:local`) або після міграції.

## Review focus

1. Швидкі кліки в мультивиборі: наступне значення будується з `voteOf()` (pending має пріоритет) - перевір, що
   два кліки поспіль не гублять першу відповідь.
2. Знімок попереднього раунду і reset-undo зберігають рядок голосу як є - роздільник не має губитись.
3. `ResultsArea` для числових колод: розбиття за `\n` не змінює підрахунок.
4. Порядок «міграція до деплою» (Contract 1) - тестами не покривається.

## Files

| File | Change | Task |
| --- | --- | --- |
| `supabase/migrations/023_room_state_poll_multiple.sql` | new: колонка `poll_multiple` | 1 |
| `app/lib/database.types.ts` | modified: `poll_multiple` у Row/Insert/Update `room_state` | 1 |
| `app/stores/types.ts` | modified: `poll_multiple` у `RoomState`, якщо тип не виводиться з `database.types` | 1 |
| `app/stores/room.ts` | modified: `setPollMultiple`, скидання в `startNewRound` і `setDeckPreset` | 1 |
| `tests/unit/stores/room.spec.ts` | modified: тести стору | 1 |
| `app/utils/pollAnswers.ts` | new: формат мультивідповіді | 2 |
| `tests/unit/utils/pollAnswers.spec.ts` | new | 2 |
| `app/utils/resultCohorts.ts` | modified: `groupResultVotes` ділить голос | 3 |
| `tests/unit/utils/resultCohorts.spec.ts` | modified | 3 |
| `app/components/CardsArea.tsx` | modified: чекбокс, підказка, кілька вибраних карток | 4 |
| `tests/unit/components/CardsArea.spec.tsx` | modified | 4 |
| `app/pages/[slug].tsx` | modified: підрахунок, голосування, старт, знімок, пропи | 5 |
| `tests/unit/pages/roomPage.spec.tsx` | modified | 5 |
| `app/components/ResultsArea.tsx` | modified: рядок кількості учасників | 6 |
| `tests/unit/components/ResultsArea.spec.tsx` | modified | 6 |
| `app/components/PlayerRow.tsx` | modified: бейдж кількох відповідей | 6 |
| `tests/unit/components/PlayerRow.spec.tsx` | modified | 6 |
| `app/i18n/locales/uk.json`, `app/i18n/locales/en.json` | modified: `poll.multipleAnswers`, `results.voters` | 4, 6 |

## Tasks

### Task 1: Колонка `poll_multiple` і стор

Додай міграцію `supabase/migrations/023_room_state_poll_multiple.sql`:
`alter table room_state add column if not exists poll_multiple boolean not null default false;`. Додай поле в
`app/lib/database.types.ts` (Row: `poll_multiple: boolean`, Insert/Update: `poll_multiple?: boolean`) і в
`RoomState`, якщо він описаний вручну в `app/stores/types.ts`. У `app/stores/room.ts`: новий метод
`setPollMultiple(multiple: boolean): Promise<void>` (update `room_state.poll_multiple`, кидає помилку Supabase), у
`startNewRound()` і `setDeckPreset()` додай `poll_multiple: false` до наявного update. `resetVotes()` і
`restoreVotes()` не чіпай. Міграцію до прод-бази не застосовуй.

**Files:** `supabase/migrations/023_room_state_poll_multiple.sql`, `app/lib/database.types.ts`, `app/stores/types.ts`,
`app/stores/room.ts`, `tests/unit/stores/room.spec.ts`

**Consumes:** none

**Produces:** `room_state.poll_multiple: boolean`; `useRoomStore.getState().setPollMultiple(multiple: boolean): Promise<void>`

**Covers:** AC9, AC12

**Depends on:** none

Локальна перевірка без прод-бази: unit-тести з mock Supabase (`setSupabase(mock)`).

**RED:** `pnpm vitest run tests/unit/stores/room.spec.ts` -> нові тести падають (`setPollMultiple` не існує;
update `startNewRound`/`setDeckPreset` без `poll_multiple: false`)

**GREEN:** `pnpm vitest run tests/unit/stores/room.spec.ts && pnpm run typecheck` -> усе зелене

**Commit:** `git add -A -- supabase/migrations/023_room_state_poll_multiple.sql app/lib/database.types.ts app/stores/types.ts app/stores/room.ts tests/unit/stores/room.spec.ts`

### Task 2: Утиліти формату мультивідповіді

Новий модуль `app/utils/pollAnswers.ts` з чистими функціями; формат - вибрані відповіді в порядку колоди, з'єднані
`\n`, порожній набір - `null`.

**Files:** `app/utils/pollAnswers.ts`, `tests/unit/utils/pollAnswers.spec.ts`

**Consumes:** none

**Produces:**
1. `MULTI_ANSWER_SEPARATOR = '\n'`
2. `splitVote(vote: string): string[]` - `'A\nC'` -> `['A', 'C']`, `'A'` -> `['A']`
3. `toggleAnswer(current: string | null, card: string, deckOrder: readonly string[]): string | null` - додає або
   прибирає `card`, сортує за `deckOrder`, повертає `null` для порожнього набору; приклади:
   `toggleAnswer('Option C', 'Option A', ['Option A','Option B','Option C'])` -> `'Option A\nOption C'`,
   `toggleAnswer('Option A\nOption C', 'Option C', deck)` -> `'Option A'`, `toggleAnswer('Option A', 'Option A', deck)` -> `null`
4. `countVoters(votes: readonly (string | null)[]): number` - кількість не-null

**Covers:** AC4

**Depends on:** none

**RED:** `pnpm vitest run tests/unit/utils/pollAnswers.spec.ts` -> fail: модуль не знайдено

**GREEN:** `pnpm vitest run tests/unit/utils/pollAnswers.spec.ts` -> усі тести pass

**Commit:** `git add -A -- app/utils/pollAnswers.ts tests/unit/utils/pollAnswers.spec.ts`

### Task 3: Рольові групи ділять голос

У `groupResultVotes()` (`app/utils/resultCohorts.ts`) кожна відповідь з `splitVote(player.vote)` додає 1 до свого
ключа. Одиночні голоси поводяться як раніше.

**Files:** `app/utils/resultCohorts.ts`, `tests/unit/utils/resultCohorts.spec.ts`

**Consumes:** `splitVote` (Task 2)

**Produces:** `groupResultVotes` рахує `'A\nB'` як `{A: 1, B: 1}`

**Covers:** AC6, AC10

**Depends on:** Task 2

**RED:** `pnpm vitest run tests/unit/utils/resultCohorts.spec.ts` -> новий тест на `'A\nB'` падає

**GREEN:** `pnpm vitest run tests/unit/utils/resultCohorts.spec.ts` -> pass, старі тести без змін

**Commit:** `git add -A -- app/utils/resultCohorts.ts tests/unit/utils/resultCohorts.spec.ts`

### Task 4: `CardsArea` - чекбокс, підказка, кілька карток

1. У формі `vote_question` (гілка `voteQuestionMode && isModerator`, до старту) під списком відповідей - чекбокс
   `data-testid="poll-multiple-checkbox"` з підписом `t('poll.multipleAnswers')` («Можна обрати декілька
   відповідей» / «Multiple answers allowed»); стан - локальний `useState(false)`, скидається разом із чернетками,
   коли `pollQuestion` стає `null`.
2. `onStartVoteQuestion(question: string, answers: string[], multiple: boolean)`.
3. Новий проп `pollMultiple: boolean`: коли `pollQuestion` заданий і `pollMultiple`, під заголовком питання -
   підказка `data-testid="poll-multiple-hint"` з тим самим текстом.
4. `selectedVote: string | null` замінює `selectedVotes: readonly string[]`; картка вибрана, коли входить у масив
   (`is-selected`, `aria-pressed`). `onVote(card)` не змінюється.
5. У `voting` і числових колодах чекбокса немає.

**Files:** `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`, `app/i18n/locales/uk.json`,
`app/i18n/locales/en.json`

**Consumes:** none

**Produces:** props `pollMultiple: boolean`, `selectedVotes: readonly string[]`,
`onStartVoteQuestion: (question: string, answers: string[], multiple: boolean) => void`; i18n `poll.multipleAnswers`

**Covers:** AC1, AC2, AC3

**Depends on:** none

**RED:** `pnpm vitest run tests/unit/components/CardsArea.spec.tsx` -> нові тести (чекбокс лише для модератора в
`vote_question`, `multiple` у колбеку старту, підказка, дві картки з `aria-pressed="true"`) падають

**GREEN:** `pnpm vitest run tests/unit/components/CardsArea.spec.tsx` -> pass

**Commit:** `git add -A -- app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx app/i18n/locales/uk.json app/i18n/locales/en.json`

### Task 5: Проводка в `[slug].tsx`

1. `voteCounts` додає 1 за кожну відповідь з `splitVote(p.vote)`.
2. `handleVote(card)`: коли `state.deck_preset === 'vote_question' && state.poll_multiple`, наступне значення -
   `toggleAnswer(players.voteOf(playerId), card, state.active_cards ?? [])`; інакше - як зараз.
3. `handleStartVoteQuestion(question, answers, multiple)` додає `room.setPollMultiple(multiple)` до `Promise.all`.
4. `pollMultiple = roomState.deck_preset === 'vote_question' && roomState.poll_multiple` іде в `CardsArea`;
   `selectedVotes` - `splitVote(voteOf(currentPlayer.id))` або `[]`.
5. `LastRoundSnapshot` отримує `pollMultiple: boolean` і `voterCount: number`; обидва `ResultsArea` дістають
   `voterCount={pollMultiple ? N : null}` (поточний - з `countVoters`, попередній - зі знімка).
6. Гейт слота, `votedCount`, reset-undo не змінюються: вони вже працюють з рядком `vote`.

**Files:** `app/pages/[slug].tsx`, `tests/unit/pages/roomPage.spec.tsx`

**Consumes:** `splitVote`, `toggleAnswer`, `countVoters` (Task 2); `setPollMultiple`, `poll_multiple` (Task 1);
`groupResultVotes` з поділом (Task 3); props `pollMultiple`, `selectedVotes`, `onStartVoteQuestion(…, multiple)`
(Task 4); prop `voterCount?: number | null` (Task 6)

**Produces:** робочий мультивибір у кімнаті

**Covers:** AC3, AC5, AC6, AC8, AC10, AC11

**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 6

Локальна перевірка без прод-бази: `roomPage.spec.tsx` з mock Supabase.

**RED:** `pnpm vitest run tests/unit/pages/roomPage.spec.tsx` -> нові тести падають: у мультивиборі другий клік
пише `'Option A\nOption C'`; reveal з `{A,B}`, `{A}`, `{B,C}` дає під бульбашками 2, 2, 1 і «Учасників, що
проголосували: 3»; reset+undo повертає рядок; гравець DEV з двома відповідями може крутити слот

**GREEN:** `pnpm vitest run tests/unit/pages/roomPage.spec.tsx` -> pass

**Commit:** `git add -A -- app/pages/[slug].tsx tests/unit/pages/roomPage.spec.tsx`

### Task 6: `ResultsArea` і `PlayerRow`

1. `ResultsArea`: опційний проп `voterCount?: number | null`; коли число і показані бульбашки, над ними рядок
   `data-testid="poll-voter-count"` з `t('results.voters', { count })` - «Учасників, що проголосували: {count}» /
   «Voters: {count}» (інтерполяція одинарними дужками).
2. `PlayerRow`: `voteLabel(vote)` ділить `splitVote(vote)`, кожну частину обрізає наявним правилом
   (`truncateVotes` і довжина > 8 -> перші 8), з'єднує `', '`.

**Files:** `app/components/ResultsArea.tsx`, `tests/unit/components/ResultsArea.spec.tsx`,
`app/components/PlayerRow.tsx`, `tests/unit/components/PlayerRow.spec.tsx`, `app/i18n/locales/uk.json`,
`app/i18n/locales/en.json`

**Consumes:** `splitVote` (Task 2)

**Produces:** `ResultsArea` prop `voterCount?: number | null`; i18n `results.voters`

**Covers:** AC6, AC7

**Depends on:** Task 2

**RED:** `pnpm vitest run tests/unit/components/ResultsArea.spec.tsx tests/unit/components/PlayerRow.spec.tsx` ->
нові тести падають (рядок `Учасників, що проголосували: 3`; бейдж `Option A, Option C`; `Option Long1\nB` з
`truncateVotes` -> `Option L, B`)

**GREEN:** та сама команда -> pass

**Commit:** `git add -A -- app/components/ResultsArea.tsx tests/unit/components/ResultsArea.spec.tsx app/components/PlayerRow.tsx tests/unit/components/PlayerRow.spec.tsx app/i18n/locales/uk.json app/i18n/locales/en.json`

### Task 7: Повна перевірка

**Files:** none

**Consumes:** Tasks 1-6

**Produces:** зелений CI-набір

**Covers:** AC5, AC12

**Depends on:** Task 5

**Check:** `sh scripts/check-local.sh && pnpm run test:ci` -> exit 0

**Commit:** n/a - лише фікси, якщо CI їх вимагає, з шляхами відповідних задач

## Short conclusion

1. Сім задач: схема і стор, утиліти формату, групи, `CardsArea`, проводка сторінки, результати й бейдж, CI.
2. Міграція `023` до прод-бази не застосовується в межах плану; ручна перевірка - на локальному Supabase.

## Next step

```text
Перевір Execution record і стан рев'ю в docs/plans/20261116-1603-multi-answer-poll.md. Якщо Execution уже обрано,
запусти implement для цього плану в режимі inline.
```

## Execution record

```text
Base: unset
Task 1: pending
Task 2: pending
Task 3: pending
Task 4: pending
Task 5: pending
Task 6: pending
Task 7: pending
```

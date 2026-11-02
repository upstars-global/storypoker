# Room controls cohort chips - implementation plan

**Spec:** docs/specs/2026-11-02-room-controls-cohort-chips-design.md

**Goal:** Модератор вмикає окремі кола BE/FE/SRE чіпсами, картки на < 1024 px стоять по 3 у рядку, reset має undo з
іншою іконкою, нижня панель не стрибає, reveal не зникає, спінів 3 для всіх.

**Architecture:** Спершу чиста логіка групування (ризик - зміна consensus і кіл), далі UI чіпсів і збереження, потім
reset/undo (стан у сторінці кімнати + новий метод store), далі панель/reveal і layout, наприкінці дрібні зміни
(спіни, сітка) і документація. Shared state: `app/pages/[slug].tsx` правлять задачі 2, 3, 4, 5, 7 - їх виконувати
послідовно, без паралельних хвиль.

**Stack:** React 19, Zustand 5, Tailwind v4, Supabase JS, Vitest + Testing Library, i18next.

**Execution:** inline

## Global constraints

1. Чіпси BE, FE, SRE у модалці налаштування колоди, стан зберігається в `room_state.result_cohorts`. Take наявну колонку
   over нову міграцію: check-констрейнт уже дозволяє ці значення, схему не змінюємо. Rejected: чіпси GQA/AQA - потрібна
   міграція констрейнту в проді.
2. Undo reset зберігає знімок голосів у пам'яті клієнта модератора, який натиснув reset. Take клієнтську пам'ять over
   поле в `room_state`: випадковий клік виправляють одразу, а БД і RLS лишаються без змін. Ціна: інший модератор або
   той самий після релоаду undo не бачить.
3. Undo відновлює рівно ті голоси, які були до натискання reset (повний відкат). Take повний відкат over «нові голоси
   пріоритетні»: рішення користувача - undo показує тільки голоси до reset.
4. Нижня панель кнопок має фіксоване положення, яке не залежить від висоти зони кіл. Reveal завжди присутній у панелі й
   переходить у disabled (idle) за тими самими умовами, що й зараз (`hasVotes` - щонайменше 2 голоси, countdown,
   `canVote`), плюс у режимі попереднього раунду. Позицію забезпечує зона результатів фіксованої висоти: кола
   масштабуються всередині неї. Take зарезервовану висоту over sticky/fixed панель: панель лишається в потоці сторінки
   і не перекриває картки на телефоні.
5. 3 картки в рядку при ширині вікна (viewport) менше 1024 px; ширина картки - третина ширини контейнера мінус
   проміжки, пропорція 2:3 зберігається.
6. Спінів за раунд - 3 для всіх ролей. Змінюється лише кількість: правило, коли PO/SM можуть крутити (`canSpinSlot`),
   лишається як є.

Out of scope: чіпси для GQA, AQA, PO, SM; undo reset для інших модераторів або після релоаду; зміни статистики,
трендів, історії, API; зміна сітки карток на ширині ≥ 1024 px.

Security Model: Trusted inputs: рішення користувача в цій розмові, інструкції проєкту. Untrusted inputs: збережений
`result_cohorts` (клієнт фільтрує до BE/FE/SRE). Зміна не додає мережевих викликів, крім наявних Supabase update для
`room_state` і `players.vote`; права залишаються client-side (`isModerator`), RLS без змін. Знімок голосів живе лише в
пам'яті клієнта.

## Review focus

- Консенсус і салют після зміни групування (злиття BE/FE/SRE у DEV може зробити коло одноголосним).
- Undo під час Realtime-оновлень: знімок не має перезаписатися власним echo-апдейтом reset.
- Фіксована висота зони кіл на 375 px (кола з #72 до 500 px) - чи не обрізаються підписи.
- `netlify/functions/room-json.mts` дублює `resultCohorts.ts` - API не змінюється, дублікат не чіпати.

## Files

| File | Change | Task |
| --- | --- | --- |
| `app/utils/resultCohorts.ts` | `groupResultVotes(players, selected)` з чіпсами | 1 |
| `tests/unit/utils/resultCohorts.spec.ts` | тести групування (створити, якщо немає) | 1 |
| `app/components/ConfigureCardDeckModal.tsx` | секція чіпсів BE/FE/SRE, `resultCohorts` у payload | 2 |
| `app/i18n/locales/{uk,en}.json` | ключі чіпсів і undo | 2, 3 |
| `app/pages/[slug].tsx` | збереження когорт, знімок reset/undo, reveal, layout, спіни | 2, 3, 4, 5, 7 |
| `tests/unit/components/ConfigureCardDeckModal.spec.tsx` | тести чіпсів | 2 |
| `app/stores/room.ts` | `restoreVotes(snapshot)` | 3 |
| `tests/unit/stores/room.spec.ts` | тест `restoreVotes` | 3 |
| `app/components/CardsArea.tsx` | стан undo кнопки reset, reveal завжди в DOM, сітка 3 | 3, 4, 6 |
| `tests/unit/components/CardsArea.spec.tsx` | тести reset/undo, reveal, сітки | 3, 4, 6 |
| `tests/unit/pages/roomPage.spec.tsx` | інтеграція undo, спіни, групування | 2, 3, 7 |
| `app/components/ResultsArea.tsx` | зона фіксованої висоти | 5 |
| `tests/unit/components/ResultsArea.spec.tsx` | тест незмінної висоти | 5 |
| `AGENTS.md`, `app/utils/AGENTS.md`, `app/components/AGENTS.md`, `DESIGN.md` | документація кіл, undo, спінів | 8 |

## Tasks

### Task 1: Групування кіл за чіпсами

Змінити `groupResultVotes` у `app/utils/resultCohorts.ts`, щоб приймала другий аргумент `selected`. Правила (spec
«Когорти»): DEV/без ролі → DEV; BE/FE/SRE → власне коло, якщо в `selected`, інакше DEV; QA/GQA/AQA → QA; PO, SM →
власні; `custom:<name>` → власне з підписом без префікса. `selected` фільтрується до `['BE','FE','SRE']`; null або
`[]` → нічого не виділено. Порядок кіл - як зараз (`ROLE_COHORTS`, потім кастомні). Не чіпати `groupVotesByCohort`,
`estimatorVotes`, `voteCohortFor` і netlify-дублікат. Виклик у `app/pages/[slug].tsx:248` оновити на
`groupResultVotes(visiblePlayers, roomState.result_cohorts)`; consensus уже рахується з `resultGroups`.

**Files:** `app/utils/resultCohorts.ts`, `tests/unit/utils/resultCohorts.spec.ts`, `app/pages/[slug].tsx`

**Consumes:** none

**Produces:** `groupResultVotes(players: readonly { shields: string[] | null; vote: string | null }[], selected: readonly string[] | null | undefined): (ResultGroup & { key: string })[]`; експорт `SPLITTABLE_COHORTS: readonly string[] = ['BE','FE','SRE']`

**Covers:** AC2, AC3, AC4, AC5, AC6

**Depends on:** none

**RED:** `pnpm exec vitest run tests/unit/utils/resultCohorts.spec.ts` -> нові кейси (BE+FE у DEV без чіпсів; BE окремо з `['BE']`; GQA/AQA у QA; legacy `['DEV','QA']` = без чіпсів; consensus у roomPage) падають

**GREEN:** та сама команда + `pnpm exec vitest run tests/unit/pages/roomPage.spec.tsx` -> passed

**Commit:** `git add -A -- app/utils/resultCohorts.ts tests/unit/utils/resultCohorts.spec.ts app/pages/[slug].tsx tests/unit/pages/roomPage.spec.tsx`

### Task 2: Чіпси BE/FE/SRE у модалці колоди

Додати в `ConfigureCardDeckModal` секцію з трьома чіпсами-toggle (наявні стилі чіпсів проєкту або shadcn `Toggle`;
перевірити `app/components/AGENTS.md`). Prop `resultCohorts: string[] | null`, payload `CardDeckPayload` отримує
`resultCohorts: string[]` (порядок BE, FE, SRE, порожній масив без чіпсів). `handleSaveCardDeck` у
`app/pages/[slug].tsx:~620` викликає наявний `room.setResultCohorts(payload.resultCohorts)`. Realtime-синхронізація
`room_state` уже є - перевірити, що `result_cohorts` потрапляє в стан із payload підписки. i18n-ключ заголовка секції
uk/en (наприклад `deck.resultCohorts`: «Окремі кола» / «Separate circles»).

**Files:** `app/components/ConfigureCardDeckModal.tsx`, `app/i18n/locales/uk.json`, `app/i18n/locales/en.json`, `app/pages/[slug].tsx`, `tests/unit/components/ConfigureCardDeckModal.spec.tsx`, `tests/unit/pages/roomPage.spec.tsx`

**Consumes:** `SPLITTABLE_COHORTS` (Task 1), `room.setResultCohorts(cohorts: string[])`

**Produces:** `CardDeckPayload = { deckPreset; cards; resultCohorts: string[] }`

**Covers:** AC1, AC14

**Depends on:** Task 1

**RED:** `pnpm exec vitest run tests/unit/components/ConfigureCardDeckModal.spec.tsx tests/unit/pages/roomPage.spec.tsx` -> кейси «рівно 3 чіпси», «save передає ['BE']», «Realtime-апдейт result_cohorts змінює кола» падають

**GREEN:** та сама команда -> passed

**Commit:** `git add -A -- app/components/ConfigureCardDeckModal.tsx app/i18n/locales/uk.json app/i18n/locales/en.json app/pages/[slug].tsx tests/unit/components/ConfigureCardDeckModal.spec.tsx tests/unit/pages/roomPage.spec.tsx`

### Task 3: Reset з undo

Store: `restoreVotes(snapshot: Record<string, string>)` у `app/stores/room.ts` - повний відкат: кожному гравцю зі
знімка, який ще в кімнаті, пише його голос; гравцям поза знімком - `vote: null`; завершує `clearPendingVotes()`.
Сторінка: стан `resetSnapshot: Record<string,string> | null`. Reset → знімок поточних голосів `visiblePlayers`, потім
`resetVotes()`. Undo → `restoreVotes(snapshot)`, знімок у null. Знімок скидається при зміні `round_started_at`,
переході `phase` у `revealed` і зміні `isModerator` на false; countdown його не скидає; релоад скидає природно.
`CardsArea` отримує `resetUndoAvailable: boolean`: true → іконка undo (наприклад `ic:baseline-undo`; перевірити
наявність у реєстрі іконок і `pnpm run icons:check`), aria-label/tooltip `cards.undoReset` («Повернути голоси» /
«Restore votes»), кнопка активна незалежно від `canReset` (крім countdown). Race: Realtime echo власного reset не має
стирати знімок.

**Files:** `app/stores/room.ts`, `tests/unit/stores/room.spec.ts`, `app/pages/[slug].tsx`, `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`, `tests/unit/pages/roomPage.spec.tsx`, `app/i18n/locales/uk.json`, `app/i18n/locales/en.json`

**Consumes:** `resetVotes()`

**Produces:** `restoreVotes(snapshot: Record<string, string>): Promise<void>`; prop `resetUndoAvailable: boolean` у `CardsArea`

**Covers:** AC8, AC9, AC10, AC15, AC16

**Depends on:** Task 2

**RED:** `pnpm exec vitest run tests/unit/stores/room.spec.ts tests/unit/components/CardsArea.spec.tsx tests/unit/pages/roomPage.spec.tsx` -> кейси reset→undo (іконка, відновлення, перезапис нового голосу, вибулий гравець, скидання на reveal/новий раунд/втрату модератора, переживання countdown) падають

**GREEN:** та сама команда -> passed

**Commit:** `git add -A -- app/stores/room.ts tests/unit/stores/room.spec.ts app/pages/[slug].tsx app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx tests/unit/pages/roomPage.spec.tsx app/i18n/locales/uk.json app/i18n/locales/en.json`

### Task 4: Reveal не зникає

У `app/components/CardsArea.tsx:~391` прибрати умову `!showLastRound &&` навколо reveal; додати `showLastRound` в умову
`disabled`. Інші умови не змінювати.

**Files:** `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`

**Consumes:** none

**Produces:** `data-testid="reveal-button"` завжди в DOM для модератора

**Covers:** AC12

**Depends on:** Task 3

**RED:** `pnpm exec vitest run tests/unit/components/CardsArea.spec.tsx` -> «reveal у DOM і disabled при showLastRound» падає

**GREEN:** та сама команда -> passed

**Commit:** `git add -A -- app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx`

### Task 5: Статична нижня панель

Зона результатів (`ResultsArea` і її обгортка в `app/pages/[slug].tsx:~819-840`) і зона карток у фазі голосування
займають однакову зарезервовану висоту на кожному breakpoint; кола 1-2 груп (до 500 px з #72) і 3+ груп
масштабуються під неї без прокрутки. Висоту обрати під найбільший стан кожного breakpoint - `check during execution`
у браузері (`web-debug`) на 375, 768, 1280 px. Підписи кіл не мають обрізатися.

**Files:** `app/components/ResultsArea.tsx`, `app/pages/[slug].tsx`, `tests/unit/components/ResultsArea.spec.tsx`

**Consumes:** none

**Produces:** зона результатів із фіксованою висотою (клас або CSS-змінна, задокументувати в Task 8)

**Covers:** AC11

**Depends on:** Task 4

**RED:** `pnpm exec vitest run tests/unit/components/ResultsArea.spec.tsx` -> кейс «контейнер має той самий клас висоти для 1, 2, 3+ груп» падає

**GREEN:** та сама команда -> passed; плюс **Check:** Playwright (`web-debug`) на локальному preview: `boundingBox().y` панелі модератора однаковий для 0/1/2/3+ кіл і фаз voting/revealed на 375, 768, 1280 px

**Commit:** `git add -A -- app/components/ResultsArea.tsx app/pages/[slug].tsx tests/unit/components/ResultsArea.spec.tsx`

### Task 6: 3 картки в рядку < 1024 px

`app/components/CardsArea.tsx:309-315`: нижче `lg` картка має ширину `calc((100% - 2 * gap) / 3)` (через `basis`/`w-`
з Tailwind), aspect 2:3; від `lg` - поточні 151.66 px і flex-wrap. Не змінювати розкладку ≥ 1024 px.

**Files:** `app/components/CardsArea.tsx`, `tests/unit/components/CardsArea.spec.tsx`

**Consumes:** none

**Produces:** none

**Covers:** AC7

**Depends on:** Task 5

**RED:** `pnpm exec vitest run tests/unit/components/CardsArea.spec.tsx` -> кейс «картка має класи третини ширини нижче lg» падає

**GREEN:** та сама команда -> passed; плюс **Check:** Playwright на 375, 768, 1023 px - 3 картки з однаковим `y` у кожному повному рядку; на 1280 px скріншот збігається з `main`

**Commit:** `git add -A -- app/components/CardsArea.tsx tests/unit/components/CardsArea.spec.tsx`

### Task 7: 3 спіни для всіх

`app/pages/[slug].tsx:223`: `spinsPerRound = 3` незалежно від ролі; `canSpinSlot` не чіпати.

**Files:** `app/pages/[slug].tsx`, `tests/unit/pages/roomPage.spec.tsx`

**Consumes:** none

**Produces:** none

**Covers:** AC13

**Depends on:** Task 6

**RED:** `pnpm exec vitest run tests/unit/pages/roomPage.spec.tsx` -> «PO має 3 спіни» (`slot-spins-left`) падає

**GREEN:** та сама команда -> passed

**Commit:** `git add -A -- app/pages/[slug].tsx tests/unit/pages/roomPage.spec.tsx`

### Task 8: Документація

Оновити розділ «Кола результатів / Налаштування кіл» у `AGENTS.md`, `app/utils/AGENTS.md` (групування з чіпсами),
`app/components/AGENTS.md` (спіни 3, undo reset, фіксована зона), `DESIGN.md` §11 (чіпси, undo, reveal). Дотримуватись
обмеження `project_doc_max_bytes` (64 KiB, `.codex/config.toml`) і `dashfix`.

**Files:** `AGENTS.md`, `app/utils/AGENTS.md`, `app/components/AGENTS.md`, `DESIGN.md`

**Consumes:** Tasks 1-7

**Produces:** none

**Covers:** AC1

**Depends on:** Task 7

**Check:** `wc -c AGENTS.md` -> менше 65536; `grep -n "ігнорується" AGENTS.md` -> немає згадки про ігнорування `result_cohorts`

**Commit:** `git add -A -- AGENTS.md app/utils/AGENTS.md app/components/AGENTS.md DESIGN.md`

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
Task 8: pending
```

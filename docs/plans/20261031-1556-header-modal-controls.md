# Header controls and modal spacing

**Spec:** none

**Goal:** Перенести керування виглядом і звуком у меню користувача та прибрати
перетини заголовків попапів із кнопкою закриття. Окремий PR націлено на гілку PR63.

**Architecture:** Зберегти useTheme/useSoundVolume та спільні Base UI примітиви.
Відступи й кнопку закриття виправити в AppModalPaper/main.css для всіх його споживачів.

**Stack:** React, Base UI, Tailwind, Vitest, Playwright.

**Execution:** inline - two tasks

## Global constraints

- Окремий PR, що зливається в PR63, без злиття PR63 у main.
- З хедеру перенести вибір теми та слайдер гучності в dropdown користувача.
- Заголовки попапів мають горизонтальні відступи та не перетинаються з close.
- Кнопки закриття попапів без border.
- Стрілка селекта колоди має відступ справа в усіх палітрах.
- Before/After: classic dark, classic light, cyberdeck dark, cyberdeck light,
  matcha dark, matcha light. Збережені рішення локального звіту лишаються чинними.

## Review focus

Клавіатура меню й range, persistence теми/гучності, довгі українські заголовки
на 375px, обидві теми всіх трьох палітр. Обмежити diff новим PR.

## Acceptance criteria

AC1: У закритому меню хедер не показує theme/palette/volume controls; у меню вони доступні гостю й авторизованому користувачу.
AC2: Палітра, light/dark, mute й slider працюють і зберігаються; range доступний клавіатурою, Escape повертає focus.
AC3: У всіх дев'яти AppModalPaper попапів title не перетинається з close на 375/1280px; close без border і тіні, focus visible.
AC4: У селекта колоди правий відступ стрілки не менше16px у всіх шести комбінаціях тем.
AC5: Локальні Before/After впорядковані за вказаними шістьма темами; існуючі audit histories прив'язані до незмінних screenshot IDs.
AC6: test:ci та public-page/icon-delivery Playwright перевірки проходять; новий PR має base гілки PR63.

## Files

| File | Change | Task |
| --- | --- | --- |
| app/components/AppHeader.tsx | Перенести controls | 1 |
| tests/unit/components/AppHeader.spec.tsx | Меню й поведінка controls | 1 |
| tests/e2e/{page-load,icon-delivery}.spec.ts | Відкривати account menu перед controls | 1 |
| app/components/AppModalPaper.tsx, app/assets/css/main.css | Спільні title/close стилі | 2 |
| app/components/ConfigureCardDeckModal.tsx | Правий відступ select | 2 |
| tests/visual/support/scene.ts | dark перед light | 2 |
| visual-review/pr-63/build.py | Локальний порядок Before/After, gitignored у головному checkout | 2 |

## Tasks

### Task 1: Account menu controls

**Files:** app/components/AppHeader.tsx, tests/unit/components/AppHeader.spec.tsx,
tests/e2e/page-load.spec.ts, tests/e2e/icon-delivery.spec.ts

**Consumes:** Наявні AppMenu, useTheme, useSoundVolume.

**Produces:** Controls у dropdown з незмінним persistence API.

**Covers:** AC1, AC2, AC6

**Depends on:** none

**RED:** `pnpm run test:unit -- tests/unit/components/AppHeader.spec.tsx` -> assertion controls hidden before opening account menu fails.

**GREEN:** Та сама команда -> усі тести PASS; Playwright доводить keyboard/persistence.

**Commit:** `git add -A -- app/components/AppHeader.tsx tests/unit/components/AppHeader.spec.tsx tests/e2e/page-load.spec.ts tests/e2e/icon-delivery.spec.ts docs/plans/20261031-1556-header-modal-controls.md`

### Task 2: Modal geometry and visual evidence

**Files:** app/components/AppModalPaper.tsx, app/assets/css/main.css,
app/components/ConfigureCardDeckModal.tsx, tests/visual/support/scene.ts;
локально visual-review/pr-63/build.py у головному checkout.

**Consumes:** Controls у dropdown з незмінним persistence API; усі9споживачів AppModalPaper.

**Produces:** Загальні title/close відступи; впорядковані локальні screenshots та незмінні IDs.

**Covers:** AC3, AC4, AC5, AC6

**Depends on:** Task 1

**Check:** Playwright на375/1280px,3палітри×2теми: title/close rectangles не перетинаються,
border/box-shadow close нульові, select arrow inset>=16px. test:ci PASS.

**Commit:** `git add -A -- app/components/AppModalPaper.tsx app/assets/css/main.css app/components/ConfigureCardDeckModal.tsx tests/visual/support/scene.ts docs/plans/20261031-1556-header-modal-controls.md`

## Execution record

```text
Base: 64ace6e8ebb83de16d0fb899e4df425fc09c6aca
Root: /Users/ihororlovskyi/work/github/io-upstars/storypoker-pr64
Branch: 2610311556-dev-session
Commits: allowed
Initial dirty state: none
Task 1: pending
Task 2: pending
```

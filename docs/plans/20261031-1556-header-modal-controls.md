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

AC7: Локальна сторінка зберігає рішення та чернетки; редагування коментаря оновлює той самий запис, кошик видаляє запис. Після рішення поле й кнопки ховаються; Reject перевіряє обов’язкову причину при натисканні. Передача JSON зберігає latest і timestamped snapshot.
AC8: Повзунок без додаткового border/outline у всіх6темах; classic/dark має світлий fill оригіналу та цифру кольору хедера. Решта5тем зберігають fill/gradient хедера; digit із кожним gradient stop>=4.5.

AC9: Кнопка mute й слайдер у меню користувача займають один рядок, без окремого видимого підпису; доступна назва, клавіатура та persistence збережені.

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


### Task 3: Rejection reasons and header-colored volume thumb

**Files:** app/assets/css/main.css, tests/e2e/page-load.spec.ts;
локальні visual-review/pr-{63,64}/ HTML і capture artifacts у головному checkout.

**Consumes:** Наявні slider mask/number і header CSS tokens; локальні JSON histories із необов'язковим reason.

**Produces:** Header fill/gradient на thumb, контрастний outline та білий digit;
textarea після details, draft persistence й append-only reason records, старі ID/storage keys незмінні.

**Covers:** AC2, AC7, AC8

**Depends on:** Task 2

**RED:** Six-theme slider Playwright matrix ->6failed on header-style equality.

**GREEN:** Same33public/icon cases ->33passed; local page check proves legacy Reject03,
reason draft/reload,5append events, plain-text rendering and JSON export on12/72pair pages.

**Commit:** `git add -A -- app/assets/css/main.css tests/e2e/page-load.spec.ts docs/plans/20261031-1556-header-modal-controls.md`

## Execution record

```text
Base: 64ace6e8ebb83de16d0fb899e4df425fc09c6aca
Root: /Users/ihororlovskyi/work/github/io-upstars/storypoker-pr64
Branch: 2610311556-dev-session
Commits: allowed
Initial dirty state: none
Task 1: pending
Task 2: pending
Ruling: baseline environment - initial new-worktree install omitted native Rolldown binding under a mismatched runtime; explicit Node24.15 install restored it, no source workaround
Task 1: done - RED3fail/548pass before moving controls; GREEN4header tests; Playwright27public/icon-delivery tests PASS, including ArrowDown to native range, Home/End, Escape focus return and appearance persistence
Task 2: in progress - shared9modal selector and close style; select18px padding; six-theme order applied to visual fixtures and local72pair review, unchanged72screenshot IDs/head preserve stored decisions

Task 2: done -108browser cases (9modals×6themes×375/1280) PASS: title text/close no intersection, close border0/shadow none, focus outline visible, close callback fires; select inset>=18px. Short812×375 account menu scrolls within viewport and Escape returns focus.12before/after pairs generated in requested order
Ruling: browser fixture setup - use Vite-versioned router URL to share AppHeader context; initial unversioned import duplicated router context, no app change needed. Focus assertion waits for BaseUI restoration rather than reading synchronously
Ruling: local review72order - manifest groups classic/dark,classic/light,cyberdeck/dark,cyberdeck/light,matcha/dark,matcha/light; original72IDs and reviewed head unchanged, persisted histories retained
Ruling: scope - parent PR63 converted to draft at user's request; child PR targets2610291418-dev-session, no merge authorized

Verify: PASS full tree e32c60ef5fa5b99ca02cbac0aef3f941a2f4811f 2026-10-31 16:11

Review R1: Critical 0 | Important 1 | Minor 0 tree e32c60ef5fa5b99ca02cbac0aef3f941a2f4811f reviewer gpt-6.1-sol mode code
Finding R1-F1: Important tests/visual/support/scene.spec.ts:25 - screenshot matrix self-check still expects light/dark after user-requested dark/light ordering
Round review 1: independent code review; visual harness expected matrix not updated
Ruling: review R1 origin automatic - implementation handoff dispatched fresh reviewer, automatic round1of3
Ruling: R1 set aside local IDs/order artifacts - outside committed boundary; host independently validated unchanged72IDs/head and both local reports
Ruling: R1 set aside actual PR base - finalize will independently verify GitHub base after creating authorized child PR
Ruling: R1 set aside browser geometry/focus - host actual108case browser evidence retained; reviewer static coverage is separate
Ruling: R1 set aside vertical slider arrows - preserve menu navigation with Left/Right/Home/End for native range; existing Playwright proves this reachable behavior
Received R1: R1-F1 ACCEPT Re-review: not needed
Ruling: R1-F1 remedy - change only existing expected THEMES sequence to dark/light; a small test-only fix with executable self-check, no application code changes; include scene.spec.ts under Task2 scope

Ruling: R1-F1 proof - focused matrix self-check RED1failed on old expected order, then full scene.spec.ts GREEN12passed after one expected-sequence replacement at current line19; assertions retained, no runtime edits. Previous verification stale; full checks rerun on new committed tree

Verify: PASS full tree 30169265167a967d7f195dcdf8827229b7708bb7 2026-10-31 16:16
Ruling: final committed checks -551unit tests/53files,27public/icon tests,12visual scene self-checks and108browser geometry cases PASS; R1-F1 proven with RED1/GREEN12, no application diff after independent review

Review R2: Critical 0 | Important 1 | Minor 0 tree 30169265167a967d7f195dcdf8827229b7708bb7 reviewer Copilot-model-unreported mode code
Finding R2-copilot-F1: Important app/components/AppHeader.tsx:211 - relocated thumb uses header white instead of menu foreground, invisible in all light themes; source review5723225885/comment4432014408 original_commit_id63ae507c7cc66dd989a52be623ef995d684e1e07
Ruling: review R2 origin external - requested Copilot review after authorized PR64 push; source key(upstars-global/storypoker,64,5723225885,4432014408), reviewed SHA63ae507
Ruling: source Claude5723225455 on63ae507 - Intent/System/CraftPASS,0findings, limited self-review coverage; host independent R1 covered full diff separately
Received R2: R2-copilot-F1 ACCEPT Re-review: needed
Ruling: R2-copilot-F1 verification - AppHeader is the only knob/value renderer; source CSS uses appbar emphasis (white alpha.85) and appbar background, while every light menu is white. Replace those two colors with text-primary/bg-elevated; preserve range behavior and theme palettes

Ruling: R2-copilot-F1 proof - new real-browser contrast matrix RED3light failures/3dark passes, then all6PASS after semantic colors; thumb/menu>=3 and digit/thumb>=4.5, compositing alpha and paper overlay. Full33public/icon cases pass after one unrelated skip-link retry; provenance unknown, no speculative skip-link change

Verify: PASS full tree 2af82c4ea6d9b95a906e71f130b5a53fa6b23ada 2026-10-31 16:28
Ruling: R2-copilot-F1 committed verification -551unit,33public/icon tests including6contrast cases,12visual self-checks,108modal geometry checks PASS on this tree; no flaky case in final run; source app only2semantic CSS colors changed

Review R3: Critical 0 | Important 0 | Minor 0 tree 2af82c4ea6d9b95a906e71f130b5a53fa6b23ada reviewer gpt-6.1-sol mode re-review
Round review 3: independent scoped slider contrast review; R2-copilot-F1 ADDRESSED
Ruling: review R3 origin automatic - cr-received requested fresh shared CSS fix review; automatic round2of3, independent fingerprint and all token/caller paths checked
Ruling: R3 set aside record/archive and old feature boundary - excluded as scoped; host retains original full R1 review and final runtime evidence
Ruling: R3 set aside R1-F1 - already resolved, current12scene tests prove no regression
Ruling: R3 set aside runtime/CI - host fresh33public/icon,551unit,12scene and108modal checks PASS on identical tree; reviewer read-only evidence remains separate
Verify: PASS full tree 2af82c4ea6d9b95a906e71f130b5a53fa6b23ada 2026-10-31 16:30

Task 3: done - user explicitly requested rejection reason input and header-color/gradient thumb for rejected03; local4HTML variants updated without changing manifests/keys; browser legacy03/draft/save/reload/5history events/export/plain-text/mobile checks PASS. Slider RED6then GREEN33 including all6header-style/gradient checks
Ruling: R2-copilot-F1 superseded by Task 3 - owner's explicit header-fill/gradient choice replaces uniform semantic fill; semantic outline>=3 and white digit>=4.5 against all gradient stops preserve the original visibility requirement
Ruling: approval history identity - current PR64 screenshot IDs and storage key remain stable while captureRevision records changed image versions; earlier decisions stay visible and are labelled previous capture after new images arrive
Ruling: automatic review budget reconciliation - user's15additional rounds remain authorized across the parent/child chain; parentR8 used1, childR1/R3 used2, next scopedR4 will be additional round4of15. Earlier child default-of3 annotations were conservative, not a revocation of user authorization

Verify: PASS full tree e62aa7016947007bb42f33564800204a9a3ea5c0 2026-10-31 17:02
Ruling: Task3 proof - committed551unit/33public+icon/12scene/108modal checks PASS; all6header fill+gradient equality and gradient-stop contrast checks PASS; local HTML legacyReject03/reasons/drafts/export/mobile checks PASS, compound artifact SHA identities in host review brief

Review R4: Critical 0 | Important 0 | Minor 0 tree e62aa7016947007bb42f33564800204a9a3ea5c0 reviewer gpt-6.1-sol mode code
Round review 4: owner header-fill/gradient delta and local rejection editor, compound app tree and4HTML hashes verified
Ruling: review R4 origin automatic - fresh independent source reviewer; parentR8 plus childR1/R3/R4 use additional4of15authorized rounds
Ruling: R4 set aside old modal/table work and multi-tab atomicity - outside current delta; unchanged behavior, no new multi-tab requirement
Ruling: R4 runtime gap - independent source review is distinct from host fresh551unit/33public/12scene/108modal and local reason/reload/export browser proof; all host checks PASS on matching compound identity
Verify: PASS full tree e62aa7016947007bb42f33564800204a9a3ea5c0 2026-10-31 17:06

Review R5: Critical 0 | Important 0 | Minor 6 reviewer owner mode visual
Ruling: review R5 origin user-started - user requested processing submitted visual Rejects; source visual-review/pr-64/submissions/latest.json submittedAt2026-10-31T17:18:50.530272+00:00, capture68fd8849e18e39adf5b1312ccfb652583e131668, reviewed app HEAD2dd496cb286a16c650c314f59ab5f9fe7c5f759a unchanged since capture for slider styles
Finding R5-F1: Minor classic/dark AppHeader - owner asks original Before thumb colors without extra border
Finding R5-F2: Minor classic/light AppHeader - owner asks no rim/border
Finding R5-F3: Minor cyberdeck/dark AppHeader - owner asks no rim/border
Finding R5-F4: Minor cyberdeck/light AppHeader - owner asks no rim/border
Finding R5-F5: Minor matcha/dark AppHeader - owner asks no rim/border
Finding R5-F6: Minor matcha/light AppHeader - owner asks no rim/border
Received R5: R5-F1 ACCEPT; R5-F2 ACCEPT; R5-F3 ACCEPT; R5-F4 ACCEPT; R5-F5 ACCEPT; R5-F6 ACCEPT Re-review: needed
Ruling: R5 source IDs map to manifest themes in the order classic/dark, classic/light, cyberdeck/dark, cyberdeck/light, matcha/dark, matcha/light; historical empty Reject records are not additional findings
Ruling: R5 shared cause - only AppHeader renders mui-slider-knob; CSS adds1px outline in every theme and inverts the classic/dark original colors. Remove outline and restore original classic/dark colors; leave other5header fills/gradients unchanged
Ruling: R5 owner requirement supersedes Task3 outline>=3 and classic/dark header-fill decisions; visible native range focus and all6digit contrast>=4.5 remain tested. Old verification is stale for this explicit visual change
Ruling: AC7 synchronized with owner's subsequent local-review UI requests; local artifacts remain gitignored, submission saved and consumed without changing the owner's decisions
Ruling: R5 focused proof -25public/icon Playwright checks PASS, including all6appearance cases with no border/outline, classic/dark original-color equality, remaining5header-fill/gradient equality and digit contrast

Review R6: Critical 0 | Important 0 | Minor 0 tree 107f71a4adbcc52fcf0ec4f4ae4779fe1fc9f146 reviewer gpt-6.1-sol mode re-review
Round review 6: owner visual R5-F1..F6 ADDRESSED; independent source trace of shared CSS and all6appearance tests
Ruling: review R6 origin automatic - fresh cr-request reviewer, additional round5of15; no new findings. Alpha-fill compositing is a test measurement limitation with no observed contrast failure; original light fill/dark digit retained
Ruling: R6 runtime coverage - host fresh551unit/25public+icon/12scene/108modal checks PASS; local form, reload, export and actual submission-file integration PASS in isolated browser contexts; source reviewer did not run these checks
Verify: PASS full tree 107f71a4adbcc52fcf0ec4f4ae4779fe1fc9f146 2026-10-31 19:27

Review R7: Critical 0 | Important 0 | Minor 1 reviewer owner mode visual
Ruling: review R7 origin user-started - submittedAt2026-10-31T21:14:42.191665+00:00; capture6359199be580ebb94467c9d8be09e079186b432e, current app72f15d63ce3b5300f188b2147268521b87da5304 has identical AppHeader to capture
Finding R7-F1: Minor classic/dark AppHeader - owner asks mute icon and slider on one line like Before
Received R7: R7-F1 ACCEPT Re-review: needed
Ruling: R7-F1 remedy - one flex row containing existing mute Menu.Item and native range; mute width auto overrides full-width menu item, range occupies remaining width; retain accessible volume name, stores, shortcuts and R5 thumb colors
Ruling: R7 focused evidence -6theme cases assert aligned centers, non-overlap and slider width>80; keyboard/mute/persistence suite rerun. Initial width-collapse failure reproduced and corrected by w-auto, not hidden by the assertions
Ruling: local review protocol - prior Approved remains approved in later rounds and auto-collapsed, previous decisions read-only; popup navigation includes only expanded comparisons. Both12/72page browser checks PASS; owner's actual submitted JSON untouched

```

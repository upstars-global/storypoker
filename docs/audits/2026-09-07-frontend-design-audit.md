# Story Poker frontend audit

1. Date: 2026-09-07
2. Branch: `main` (`3bc430b1`, 2026-08-12) with uncommitted changes to `AGENTS.md`, `package.json`,
   `package-lock.json`, and `scripts/skills.sh` (not UI files; they do not affect the findings)
3. Skill: `frontend-crafting` 1.2.1, `review` workflow
   (`Workflow: review · Mode: Operate + Experience · Read:` a realtime Planning Poker console whose
   Operate backbone (voting, reveal, timer, history) carries a deliberately distinctive
   Experience layer (slot machine, hold-to-start countdown, consensus confetti and sound, palette themes);
   home and auth are short utilitarian entry routes, not a Persuade funnel)
4. Scope: 33 `.vue` files (7 pages, 25 components, `App.vue`), `app/assets/css/main.css` (1073 lines),
   `index.html`, `app/router.ts`, `app/i18n.ts`, and the UI behavior of composables and stores
5. Format: read-only static analysis of all 33 `.vue` files and CSS. **No runtime evidence**: the
   browser was not launched in this session, so contrast across the six themes, actual touch target
   geometry, and actual focus order were not measured. Every finding was checked against source code
6. First audit of the project: `docs/audits/` did not exist before this session, so there are no prior findings to compare
7. Status: F-1 through F-11 were closed by `docs/plans/2026-09-08-frontend-audit-remediation.md` (2026-09-08);
   in F-10, the actual defects were the lack of visible focus and an accessible name, while Tab reachability
   was intact (Space already worked on the hidden `<input>`). Runtime items in the "Not checked" section remain open

## Summary

The project has a surprisingly strong technical baseline for a game: all voting cards and controls are
real `<button>` elements, there are zero positive `tabindex` values, one `transition-all`, all `<img>` elements
have `alt`, `focus-visible` provides a visible outline on both button classes, kick has confirmation, and
Timer has six `aria-label` attributes. `AGENTS.md` records the conventions, and 15 unit specifications cover
the stores and utilities.

The Experience layer added motion that the accessibility layer has not caught up with, and the `Operate`
backbone has two gaps in document semantics. Two findings are systemic:

1. **Zero `prefers-reduced-motion` in CSS** (P1, systemic): three `@keyframes` (slot jam, winner blink,
   confetti with 60+ particles) and approximately 15 `transition` declarations have no reduced-motion path.
   The only preference check is in `useTheme.ts` and applies only to the theme view transition.
2. **The document `lang` is fixed to `uk` and never follows the locale** (P1, systemic):
   `index.html:2` serves `lang="uk"`; the language switcher in `AppHeader` writes `sp-lang` and `locale`,
   but does not touch the document attribute. The English UI is spoken using Ukrainian pronunciation rules.

Nine further findings are isolated: `[slug].vue` has no `<main>` or `<h1>` (P1); three icon-only buttons
have descriptions instead of names (P1); a flag toggle in `/ffc` is unreachable by keyboard (P1); the
skip link is missing (P2); `AppModal` does not return focus to its trigger, one defect across nine modals
(P2); a `role="menu"` menu lacks arrow-key support (P2); a vote rollback is silent (P2); the room has no
`<title>` of its own (P2); and Goal Clarity thresholds are hardcoded (P3).

## Method

Static analysis at `3bc430b1`. `rg`, not `grep`: in this shell `grep` is a `ugrep` wrapper that fails on
`--include=*.vue` with `no matches found` (the same gotcha documented in the agilecharts audits).
Multiline extraction of icon-only buttons used `perl -0777` on `<button>…</button>`, excluding those with
`aria-label`/`aria-labelledby`/`sr-only` or any text node. Every hit was opened in the source before being
included in the report; all counts were checked manually.

For absence checks, this project's templates format attributes one per line, so line-oriented `rg` without
`-U` cannot see `@click` several lines below the opening tag. For this reason the first iteration of this
audit falsely reported zero clickable nonsemantic elements. Final counts came from `rg -U --multiline` and
per-element analysis with `perl -0777`, which shows whether each such element has `role`/`tabindex`. Zero
counts as evidence only where the same command returns a nonempty result on a known positive example.

| Surface group | Routes | Mode | Shared primitives |
| --- | --- | --- | --- |
| Room | `/<roomId>`, `/<slug>` | Operate + Experience | `AppHeader`, `CardsArea`, `PlayersList`/`PlayerRow`, `ResultsArea`, `Timer`, `SlotMachine`, `AppModal` |
| Room entry | `/` | Operate | `AppHeader`, Recent Rooms, `mui-field` |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password` | Operate | `<main>`, `PasswordInput`, `mui-field`, `mui-btn` |
| Utility | `/ffc` | Operate | `<main>`, flag toggles |
| Modals (cross-cutting primitive) | 9 instances | both | `AppModal` → `AppModalPaper` |

There are no exclusions: all 7 routes and all 25 components are in scope. `AppModal` was considered in both
modes because it serves both product dialogs (`HistoryModal`, `ConfigureCardDeckModal`) and the blocking
`JoinOverlay`.

## What works well

1. **Almost no silent clickable elements.** Of 17 `@click` instances on nonsemantic tags, 15 are menu items
   with `role="menuitem"`/`role="menuitemradio"`, `tabindex="0"`, and working Enter/Space handling through
   `activateMenuItem` on the parent `role="menu"` (`PlayerRow.vue` 5, `AppHeader.vue` 10); one more is the
   `AppModal.vue:46` overlay with `@click.self` to close, a deliberate modal pattern. This matters here:
   the interface consists of cards, slot reels, and player rows, elements that often become silent `div`s.
   All voting cards, timer controls, and action buttons are real `<button>` elements. The only exception
   without a role and keyboard support is the toggle in `/ffc` (F-10).
2. **`Timer` is a model for the other panels.** Six icon-only controls (`-30s`, reset, pause, resume,
   `+30s`, widget toggle) have `:aria-label` through i18n, so the name is translated with the interface.
   This is the pattern missing from three buttons in `CardsArea`/`PlayerRow`; the F-4 fix is literally a
   copy of the line from `Timer.vue:116`.
3. **`focus-visible` instead of `focus`.** `main.css:447` and `548` apply `outline: 2px solid var(--primary)`
   specifically on `:focus-visible`, so keyboard users see an outline and mouse users do not.
   `outline-offset: -2px` on the round `mui-icon-btn` keeps the outline inside the circle instead of
   drawing a square around it.
4. **Destructive kick has a properly implemented confirmation.** `[slug].vue:870-891` uses an `AppModal`
   with `labelledby="kick-player-modal-title"` and text containing the player's name
   (`room.kickConfirm`, `{ name }`), rather than an abstract "Are you sure?". `requestAnimationFrame`
   before opening (`:564`) deliberately avoids a race with menu closure.
5. **Goal Clarity thresholds are accompanied by text as well as color.** The colored circle
   (`ResultsArea.vue:135-140`) contains the score as text, and `≤3.5` adds a separate hint paragraph, so
   the rule against conveying information by color alone is not violated (the thresholds themselves remain
   a question, F-9).

## Layer 1 - visual and experience critique

**Concept and fit to mode.** The surface knows what it is: a room with a game, rather than an estimation
dashboard. The three palettes (`classic`/`cyberdeck`/`matcha`) each change `--font-app`, `--radius-*`,
`--btn-transform`, and borders, making them genuine themes rather than recolorings or three shades of blue.
`cyberdeck` with Geist Mono and sharp corners and `matcha` with Nunito and large radii could not belong to a
competitor unchanged. The Experience layer (slot, jackpot, confetti) is intentionally excessive for the
estimation task, and that is justified: Planning Poker's retrospective boredom is the problem the product solves.

**Hierarchy.** The room has one appropriate focal point: the card grid in the center, with panels (timer/slot,
players) in the narrower left column `md:w-1/3 lg:w-1/4`. After reveal, the focal point correctly passes to
`ResultsArea`. The hierarchy problem is structural: **the room has no `<h1>`** (the only headings are three
`<h2>` elements, two of them in modals), so a screen reader has no top of the heading tree on the product's
main surface (F-2).

**Typography and space.** The scale lives in `@theme` as `--text-mui-{h2,body,table,caption}` with its own
`--line-height`/`--letter-spacing`, so tokens set the rhythm instead of one-off values. There are zero arbitrary
`text-[…]`/`bg-[#…]` utilities. The weak point is inline `style` for geometry: `ResultsArea.vue:165` calculates
`fontSize` with an expression containing three `Math.*` calls, making the bubble typography impossible to
reproduce outside the code. This is a deliberate compromise for a variable circle size, but it lives outside
the token layer.

**Color.** There are 65 hardcoded hex values in SFCs, 31 of them in `AlignmentTrendsModal.vue`: these are the
ECharts series palette, data rather than surface styles, so moving it into tokens would be the wrong fix. The
actual surface layer is clean. **Note 2026-09-07 (correction after the `AGENTS.md` audit):** the original text of
this paragraph claimed that `#607d8b` in `.mui-btn-md` was a literal in a component class absent as a variable
from the palettes. This was incorrect and inherited from stale wording in `AGENTS.md:29`: in fact,
`main.css:520-527` sets `background-color: var(--btn-md-bg)`, and `#607d8b` is only the classic default for
that variable (`:112`), which the other five palettes override (`:211`, `:257`, `:319`, `:362`). Thus the
surface layer is clean here with no exception; `AGENTS.md:29` itself was corrected in the same session.

**Motion.** Concept and implementation diverge most strongly here. Motion is motivated (the reel should spin,
consensus deserves celebration), but **no animation has a reduced-motion path** (F-1). The confetti sends
60+ particles flying from the center of the screen; for a user with a vestibular disorder this is in the same
category as parallax. On the positive side, there is only one `transition: all` (`ResultsArea.vue:159`), and
even that animates the bubble size, which actually changes.

**Copy.** i18n is used throughout: UI strings go through `$t()`, `uk` is the default, and `en` is the fallback.
Action naming is consistent. Two concerns remain: `role="tooltip"` via `aria-describedby` is used as the
**only** source of meaning for three buttons (F-4), but a tooltip is a description rather than a name; and
`results.goalClarityHint` appears at a `≤3.5` threshold that is not named anywhere (F-9).

## Findings

### Systemic

#### F-1. Zero `prefers-reduced-motion` across the application - P1

1. **Location:** `app/assets/css/main.css` (0 occurrences in 1073 lines); animations:
   `SlotMachine.vue:253,261` (`slot-jam 400ms`), `PlayerRow.vue:402,404` (`win-blink 0.5s ease-in-out 3`),
   `ResultsArea.vue:230,234` (`confetti-burst`), plus approximately 15 `transition` declarations in `main.css`;
   `useTheme.ts:70` is the only preference check, and it applies only to `startViewTransition`.
2. **Issue:** the application has no `@media (prefers-reduced-motion: reduce)`; the system reduced-motion
   setting affects only the theme transition, while confetti, winner blink, and reel jam play in full.
3. **Severity:** P1 (systemic: three different `@keyframes` in three files, with a shared cause: no rule in
   global CSS).
4. **User impact:** a user with a vestibular disorder or motion sensitivity who has enabled the system setting
   receives 60+ confetti particles from the center of the screen at consensus, precisely when they are
   looking closely at the screen. `win-blink` repeats three times and falls into the same flickering category.
   These users have no way to disable the effect: `/ffc` has `countdownEnabled`, but no flag for confetti or
   the slot.
5. **Standard:** quality-gate MUST "Motion": "Respect `prefers-reduced-motion`. Under a
   reduced-motion preference, remove or substantially reduce non-essential movement, especially
   parallax, large translations, and autoplaying motion."
6. **Remediation:** add a global block to `main.css`:
   `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }`
   and **separately** hide the confetti layer (`.celebration-layer { display: none }`), because zeroing the
   duration would leave 60 particles sitting statically on screen. The slot reel needs a discrete substitution:
   show the final symbol without scrolling. Otherwise the link between "I spun → result" disappears. The
   quality gate explicitly says removing motion must not remove information.

#### F-2. Document `lang` is fixed to `uk` and does not follow the language switcher - P1

1. **Location:** `index.html:2` (`<html lang="uk">`); `app/i18n.ts:20` (`locale: storedLocale()`);
   `AppHeader.vue:86-87` (`locale.value = code; persistLocale(code)`). `document.documentElement.lang`
   is not changed anywhere in the codebase.
2. **Issue:** the interface is translated to `en` through the language menu, but the document remains declared
   Ukrainian forever; with `fallbackLocale: 'en'`, even a `uk` session can have individual English strings
   under the same `lang="uk"`.
3. **Severity:** P1 (systemic: affects all 7 routes and all UI strings; the cause is one missing side effect
   in the switcher).
4. **User impact:** a screen reader user who switches the interface to English hears English text pronounced
   according to Ukrainian rules, practically unintelligibly. This user depends most on the correct voice
   engine. Browser auto-translation is also affected because it considers the page Ukrainian.
5. **Standard:** quality-gate CONTEXTUAL "When the interface is translated": "The document's `lang`
   describes its primary language"; plus MUST "the document language is declared": the declared language
   must be accurate as well as present.
6. **Remediation:** set `document.documentElement.lang = storedLocale()` in `app/i18n.ts` when creating i18n,
   and add the same line for `code` in `persistLocale(code)`; leave `lang="uk"` in `index.html` as the default
   before JS loads (the same pattern already used for `data-theme`/`data-palette` by the inline script). Cover
   it with a unit specification modeled on `tests/unit/composables/useTheme.spec.ts`.

### Isolated

#### F-3. The room, the product's primary surface, has no `<main>` or `<h1>` - P1

1. **Location:** `app/pages/[slug].vue:632-721` - the template root is a `<div>`, followed by `<div class="flex flex-1 flex-col md:flex-row …">`;
   the file's only headings are `<h2>` at `:638` (error screen), `:821` and `:875` (modals).
2. **Issue:** unlike the other six pages (`index.vue:150`, four auth pages, `ffc.vue:69` -
   all have `<main>`), the room route has neither a `main` landmark nor a first-level heading;
   in the normal room state there is no `<h2>` at all, so the heading tree starts empty.
3. **Severity:** P1.
4. **User impact:** a screen reader user cannot jump to the main content through the landmark list
   or orient themselves through the heading list, two of the fastest ways to navigate a page. They
   land in the header and must tab through the entire shell to reach the cards. This is the worst
   place for such a gap: users spend their whole session in this room, while they spend ten seconds
   on the correctly marked-up auth pages.
5. **Standard:** quality-gate MUST «Semantics and structure»: «Landmark structure exists: header,
   navigation, main, footer. One `<main>` per page» and «Headings form a real hierarchy, in order».
6. **Remediation:** replace `<div class="flex flex-1 flex-col md:flex-row gap-6 …">` at `:677` with
   `<main>` with the same classes; add an `<h1>` with the room name. The room name is already visible
   in `AppHeader`, so to avoid duplicating the text, either promote it to an `<h1>` in the header
   (it is unique to the page there), or add an `<h1 class="sr-only">` with the room name in
   `[slug].vue`. The first option is preferable: the heading becomes visible and real, rather than
   serving only an auxiliary purpose.

#### F-4. Three icon-only buttons have a description (`aria-describedby`) but no name - P1

1. **Location:** `CardsArea.vue:283` (`lucide:undo`, `@click="emit('toggleLastRound')"`),
   `CardsArea.vue:305` (`ic:baseline-restart-alt`, `data-testid="reset-button"`),
   `PlayerRow.vue:290` (`ic:baseline-more-vert`, player menu). The tooltip mechanism is
   `AppTooltip.vue:16-18`: `trigger.setAttribute('aria-describedby', tooltipId)`.
2. **Issue:** all three are `<button>` elements with `<AppIcon>` as their only child and no
   `aria-label`/`aria-labelledby`/`sr-only`; the wrapping `AppTooltip` deliberately sets
   `aria-describedby` instead of `aria-labelledby`, so the tooltip is a **description** of an
   unnamed button, not its name. This trap is easy to miss: the tooltip is visible, a test that
   checks whether a tooltip exists passes, and the accessible name is empty.
3. **Severity:** P1 (not P0: `PlayerRow.vue:290` has `aria-expanded`, and the `CardsArea` buttons
   remain mouse-accessible and focusable - the controls are available but unnamed).
4. **User impact:** the screen reader says «button» without any indication of its purpose. For
   `reset-button` this is directly dangerous: the user cannot distinguish «reset votes» from any
   other button, and the action destroys the round state for the whole team. For `more-vert` in
   `PlayerRow`, it is unclear whose menu it is because there are many player rows and all buttons
   sound the same.
5. **Standard:** quality-gate MUST «Accessible naming and status»: «Icon-only controls carry an
   accessible name. An icon with no name is an unlabelled button.»
6. **Remediation:** add `:aria-label="$t(...)"` to each of the three, using the same key already
   passed to the tooltip's `#content` - copy the pattern directly from `Timer.vue:116`. For
   `PlayerRow.vue:290`, the name must include the player: `:aria-label="$t('players.menuFor', { name: player.name })"`;
   otherwise all rows will remain indistinguishable. For `toggleLastRound`, the name must reflect
   the state (the button is a toggle, and `transform: scaleX(-1)` shows this only visually): use
   either two keys based on `showLastRound` or `aria-pressed`.

#### F-5. No route has a skip link - P2

1. **Location:** zero occurrences of `skip` in `app/**/*.vue` and `index.html`; `AppHeader.vue:110` -
   a `<header>` with three dropdown menus (palette, language, user), preceding content on all routes.
2. **Issue:** there is no way to bypass the repeated shell.
3. **Severity:** P2 (not P1: the header itself is compact, not a multi-level navigation).
4. **User impact:** each time a room loads, a keyboard user tabs through the header - palette switcher,
   language switcher, user menu - before reaching the cards. In Planning Poker the page rarely
   reloads, but the room is the surface users return to daily. Combined with F-3 (no `main`), there
   is no way to bypass the header at all: neither a skip link nor a landmark exists.
5. **Standard:** quality-gate MUST «Keyboard and focus»: «A skip link lets a keyboard user jump past
   repeated navigation to the main content.»
6. **Remediation:** add an `<a href="#main">` link with `sr-only focus:not-sr-only` classes in
   `App.vue` before `<RouterView />`, and add `id="main"` to the `<main>` element on each page.
   Do this after F-3, because the room currently has no target for the link.

#### F-6. `AppModal` does not return focus to the trigger on close - P2

1. **Location:** `app/components/AppModal.vue:14-25` - `watch` calls `showModal()` and
   `dialogEl.value.focus()` on opening and `close()` on closing; it never saves
   `document.activeElement` before opening or calls `.focus()` after closing (the only `.focus()`
   calls in the codebase are `AppModal.vue:20`, `index.vue:44`, `JoinOverlay.vue:24`,
   `PlayerEditModal.vue:22`, `CardsArea.vue:56`, and none restores focus).
2. **Issue:** native `<dialog>` provides a focus trap and Escape for free (and `onCancel` here
   correctly respects `lockDismiss`), but the browser returns focus to the trigger only for a
   natively closed `<dialog>`; here `close()` is called from `watch`, and focus falls to `<body>`
   after closing.
3. **Severity:** P2 (not P1: focus is not trapped - it can be recovered by tabbing from the start of the page).
4. **User impact:** the modal is a shared primitive (9 instances: history, trends, deck, settings,
   player editing, round snapshot, kick, auth, join). A keyboard user who opens history from the
   header and closes it loses their place and starts tabbing from the beginning of the document -
   nine times per session. A screen reader user also loses context: nothing is announced on close.
5. **Standard:** quality-gate MUST «Keyboard and focus»: «Modals and drawers trap focus deliberately
   while open, return focus to the trigger on close, and close on Escape.»
6. **Remediation:** in `AppModal.vue`, save `document.activeElement` in a `ref` before `showModal()`
   and call `previous?.focus()` after `close()`. One change covers all nine modals, so the fix belongs
   here instead of in each consumer. `tests/unit/components/AppModal.spec.ts` already exists and
   provides a place for a specification.

#### F-7. Menus with `role="menu"` lack arrow-key navigation - P2

1. **Location:** `AppHeader.vue:158,244` and `PlayerRow.vue:308` - `role="menu"` with
   `@keydown.escape`, `@keydown.enter.prevent`, `@keydown.space.prevent` and `activateMenuItem`;
   `ArrowDown`/`ArrowUp` are not handled anywhere in the codebase (zero occurrences).
2. **Issue:** the component declares itself an ARIA menu but implements only part of the keyboard
   contract for that pattern: items are separate tab stops instead of being navigated with arrows
   under a single tab stop.
3. **Severity:** P2.
4. **User impact:** a screen reader user hears «menu» and expects arrow keys, but gets no response;
   tabbing works, so the control is reachable, but its behavior contradicts its declared role. The
   user menu in `AppHeader` has eight `role="menuitem"` elements, or eight tab stops where the
   pattern promises one.
5. **Standard:** quality-gate MUST «Keyboard and focus»: «Custom components built from non-semantic
   elements implement the full keyboard contract for the pattern they imitate, including arrow-key
   behavior where the pattern defines it.»
6. **Remediation:** there are two valid paths, and the choice is a product decision. The cheaper one:
   remove `role="menu"`/`role="menuitem"`, leaving a list of links and buttons - tabbing then matches
   the behavior and no contract is violated. The more complete one: add handling for
   `ArrowDown`/`ArrowUp`/`Home`/`End` with `tabindex="-1"` on all items and `0` on the active one.
   For three small dropdowns, the first path provides more accessibility per unit of code.

#### F-8. Failed vote writes roll back silently - P2

1. **Location:** `app/stores/players.ts:44-58` - on error, `castVote` runs
   `delete pendingVotes.value[playerId]` and `throw e`; `app/pages/[slug].vue:448-451` - the call
   is wrapped in `try { … } catch { }` with an empty body.
2. **Issue:** the optimistic vote rolls back correctly (the store removes `pendingVotes`), but
   the reason is never shown: the `catch` suppresses the error.
3. **Severity:** P2.
4. **User impact:** a player clicks a card, sees it selected, and moments later the selection
   disappears without a message. The most plausible interpretation is a missed click, so the player
   tries again and again. With a persistent error (RLS, network), the player remains the only person
   who has not voted and blocks the team's reveal without knowing why. `ConnectionBanner` does not
   help here: it responds to presence status (`reconnecting`), not a failed write.
5. **Standard:** quality-gate CONTEXTUAL «When the surface holds application state (Operate)»:
   «Optimistic updates reconcile with the server response and roll back visibly on failure»; plus
   MUST «Status that appears without a page change … is announced through a polite live region».
6. **Remediation:** replace the empty `catch` in `[slug].vue` with an error message displayed in a
   live region. `ConnectionBanner.vue` already has the right markup
   (`role="status"` + `aria-live="polite"`, `:14-15`); generalize it into a notification layer
   instead of writing a second such block. This is not the only empty `catch`: `[slug].vue` contains
   7 empty `catch` blocks, which should be reviewed in the same pass.

#### F-9. Goal Clarity thresholds are hardcoded without a named source - P3

1. **Location:** `ResultsArea.vue:50-56` (`n > 3.5` → green `#43a047`, `n < 2.5` → red
   `#e64a19`, yellow `#fbc02d` between them) and `:58-61` (`n <= 3.5` enables `results.goalClarityHint`).
2. **Issue:** three thresholds are literals in the component; neither `AGENTS.md`, `DESIGN.md`, nor
   the i18n string says where `3.5` and `2.5` came from or why the hint appears at `3.5`.
3. **Severity:** P3 (the score itself is displayed as text inside the circle, so the rule against
   relying on color alone is not violated; this concerns the origin of the numbers, not accessibility).
4. **User impact:** a Scrum Master sees a yellow circle for 3.4 and a green one for 3.6 with no
   explanation of the boundary. When discussing the Sprint Goal, they cannot substantiate the
   conclusion that the goal is insufficiently clear: the number looks precise but has no source. A
   future developer who wants to move the boundary will not know whether it was agreed with anyone or
   chosen by eye.
5. **Standard:** quality-gate MUST «Accessible naming and status»: «When that cue needs a threshold
   the brief does not set … name it as an assumption in the list of approximations rather than
   burying it in code as a silent number»; plus «Content and copy»: «Precise-looking figures are
   sourced or labelled as examples».
6. **Remediation:** extract the three numbers into named constants next to the `goal_clarity` preset
   in `app/utils/cardDecks.ts` and add a line in `DESIGN.md` stating that they are the owner's
   product decision and are not derived from data. The choice of values remains with the owner; there
   is no action in this session.

#### F-10. The `/ffc` flag toggle is unreachable by keyboard - P1

1. **Location:** `app/pages/ffc.vue:79-90` - `<span class="mui-switch" @click="toggleFeatureFlag(...)">`,
   containing an `<input type="checkbox" :checked="...">` **without** `v-model`/`@change` or a `<label>`;
   `main.css:941-945` - `.mui-switch input { opacity: 0; width: 0; height: 0; }`.
2. **Issue:** toggling is handled by `@click` on a nonsemantic `<span>`, while the actual checkbox is
   reduced to `0x0` with `opacity: 0`, so it cannot receive focus and its changes are not handled;
   `.track`/`.thumb` draw the visible state. This is not the visually hidden checkbox pattern, which
   keeps the element focusable and controls state through `:checked` + `<label for>`: here the
   checkbox is decorative and the logic is on the `span`.
3. **Severity:** P1.
4. **User impact:** keyboard users cannot toggle any feature flag: a `<span>` without `tabindex` does
   not receive focus, and the zero-sized checkbox with `opacity: 0` cannot be reached by tabbing. A
   screen reader user hears an unnamed checkbox (there is no `<label>` or `aria-label`; the flag name
   is in an adjacent `<div>`), and the announced `checked` state does not change in response to
   actions. The page is a utility page, so this is not P0, but it is the only way to disable
   `countdownEnabled`; the user who needs to disable animation (see F-1) cannot do so with a keyboard.
5. **Standard:** quality-gate MUST «Semantics and structure»: «Use `<button>` for actions ... A `div`
   with a click handler is never navigation: it is invisible to assistive technology, unreachable by
   keyboard»; MUST «Forms»: «Form controls have a programmatically associated label» and «Labels are
   clickable and, for checkboxes and radios, the label shares the control's hit target».
6. **Remediation:** remove `@click` from the `<span>` and make toggling native: add a `<label for>`
   with the flag name (the text already exists in `$t('ffc.flags.<key>.name')`) and
   `@change="toggleFeatureFlag(key)"` on the `<input>` itself. In CSS, replace `width: 0; height: 0`
   with visual hiding that preserves focusability (`position: absolute; inset: 0; opacity: 0` within
   `.mui-switch`), and add a visible outline on `.mui-switch:has(input:focus-visible) .track`. The
   `.thumb`/`.track` state is then controlled through `input:checked ~`, without JS.

#### F-11. The room route has no `<title>` of its own - P2

1. **Location:** `app/router.ts:17` - `{ path: '/:slug', component: RoomPage }` without `meta.title`;
   `:22-24` - `afterEach` gives `'Story Poker'` to any route without `meta.title`; `document.title` is
   not set anywhere else in the codebase (its only use is `router.ts:24`).
2. **Issue:** all six other routes receive `<Title> | Story Poker`, while every room keeps the default
   `Story Poker` without a name or identifier.
3. **Severity:** P2 (MUST, but with a workaround: the room name is visible in the header).
4. **User impact:** a Planning Poker session typically involves several rooms in adjacent tabs, all
   identically labeled and indistinguishable in the tab bar. The same applies to browser history and
   bookmarks: a history search returns many identical `Story Poker` entries with no way to identify
   the needed one. A screen reader user gets identical names in the window list, so the fastest way to
   switch between rooms does not work.
5. **Standard:** quality-gate MUST «Semantics and structure»: «Every page has a unique, descriptive
   title».
6. **Remediation:** set `document.title` in `[slug].vue` when the room name resolves (at the same
   point as the `<h1>` in F-3), in the format `<room name> | Story Poker`; for the first render before
   data arrives, take the name from the existing `sp-room-header-<urlParam>` cache, which exists for
   this purpose. Leave `router.ts` as is: the default is needed until the room resolves.

## Clean baseline (checked today, statically)

| Check | Scope | Result |
| --- | --- | --- |
| `@click` on nonsemantic tags (multiline `rg -U`) | 33 `.vue` | 17: 15 menu items with `role="menuitem*"` + `tabindex="0"` + Enter/Space on the parent `role="menu"`, 1 `AppModal` overlay with `@click.self`, 1 without a role or keyboard support (F-10) |
| positive `tabindex` | 33 | 0 |
| `transition-all` / `transition: all` | 33 + `main.css` | 1 (`ResultsArea.vue:159`, animates the bubble size, which does change) |
| `<img>` without `alt` | 4 uses of `<img>` | 0 |
| arbitrary `text-[…]` / `bg-[#…]` utilities | 33 | 0 |
| icon-only `<button>` without an accessible name (multiline perl) | all `<button>` | 3 (F-4) |
| `<main>` per page | 7 routes | 6 of 7 (F-3) |
| unique `<title>` | 7 routes | 6 of 7 (F-11) |
| `focus-visible` with a visible outline | `.mui-btn`, `.mui-icon-btn` | 2 of 2 (`main.css:447,548`) |
| `@media (prefers-reduced-motion)` | `main.css` 1073 lines | 0 (F-1) |
| live regions (`aria-live`/`role="status"`) | 33 | 1 (`ConnectionBanner.vue:14-15`) |
| `aria-label` on icon-only `Timer` controls | 6 controls | 6 of 6 |
| destructive actions with confirmation | kick, leave | kick - yes (`[slug].vue:870`); leave - no confirmation, but this leaves the user's own room with auto-rejoin through `storypoker_session_<roomId>`, making it reversible |
| hardcoded hex values in SFCs | 33 | 65, of which 31 are the ECharts series palette (data), the rest are in `PieChart`/`AlignmentCard`/`ResultsArea` |
| unit specifications | `tests/unit/**` | 15 files (stores, utilities, composables, 4 components) |

**Not checked (requires a browser):** contrast for all six `palette × theme` combinations (the most
suspect is neon `cyberdeck` on dark), actual touch target size for `.mui-icon-btn` (`padding: 8px`
around a `1.5rem` icon gives ~40 px, below the 44 px guideline for primary touch targets but above
the 24 px minimum - measurement is needed), horizontal overflow in narrow windows, and actual focus
order. These items remain open until a `web-debug` audit.

## Work priorities

1. **F-1** (reduced motion) and **F-2** (`lang` by locale) are systemic; both need a small change in
   one place and yield the greatest improvement per unit of work.
2. **F-3** (`<main>` + `<h1>` in the room), **F-4** (three `aria-label` values), and **F-6** (focus
   return in `AppModal`) are MUST violations on the main surface; F-6 is fixed once for nine modals.
3. **F-10** (keyboard access to the `/ffc` toggle) is a MUST and blocks the workaround for F-1:
   while animation cannot be disabled by flag from the keyboard, a user sensitive to motion has no
   option.
4. **F-5** (skip link) follows F-3 because it needs a `#main` target; **F-11** (room `<title>`) goes
   with F-3 because the room name resolves in the same place.
5. **F-8** (visible vote failure) goes with a review of the seven empty `catch` blocks in `[slug].vue`.
6. **F-7** (menu contract) and **F-9** (Goal Clarity thresholds) require owner decisions: F-7 has two
   legitimate paths, and F-9 concerns the choice of numbers rather than code.
7. In a separate session, run a `web-debug` audit for runtime items outside this report's coverage.

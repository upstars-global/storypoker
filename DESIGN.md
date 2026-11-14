# DESIGN.md - Story Point Poker Room

Analysis of the design system of the page `examples/room.html` (captured from `https://app.storypoint.poker/nG8AOnjC`).

---

## 1. UI stack and architecture

- **Framework:** React + **Material UI 5** (Emotion CSS-in-JS, `MuiPaper-root`, `MuiAppBar-*`, `MuiCard-root`, `MuiMenu-paper`, etc.)
- **Design language:** Material Design 2 (not M3) - classic `elevation 0..24`, rectangular cards with a 4-7px radius, "Material shadow stack" shadows
- **Theme:** automatic via `prefers-color-scheme` (no UI toggle - entirely system-controlled)
- **Icons:** Material Symbols (SVG only, via `@mui/icons-material`)
- **Avatars:** [DiceBear `bottts` 7.x](https://api.dicebear.com/7.x/bottts) - generated from `seed = playerName`
- **Font:** `Roboto, Helvetica, Arial, sans-serif` (from Google Fonts: `Roboto:300,400,500,700` + `Source Sans Pro:300,400,600,700`)

---

## 2. Design tokens

### 2.1 Color palette

#### Brand
| Token | Hex | Purpose |
|---|---|---|
| `primary` | `#455a64` | AppBar, Players header, JOIN ROOM button (Blue Grey 700) |
| `primary.dark-mode` | `#546e7a` | The same primary in the dark theme (Blue Grey 600) |
| `primary.dark` | `#1c313a` | Dark shade for hover/active |
| `accent` | `#00cdcd` | Pinned tab color (brand-tinted) |
| `error` | `rgb(198, 63, 23)` | Destructive states (errors, leave room) |

#### Light theme - surfaces & text
| Role | Value |
|---|---|
| `background.default` | `rgb(250, 250, 250)` ≈ `#fafafa` |
| `background.paper` | `#ffffff` |
| `surface.subtle` | `rgb(245, 245, 245)` ≈ `#f5f5f5` (voting cards) |
| `surface.hover` | `rgb(240, 240, 240)` ≈ `#f0f0f0` |
| `text.primary` | `rgba(0, 0, 0, 0.87)` |
| `text.secondary` | `rgb(97, 97, 97)` (Grey 700) |
| `text.disabled` | `rgba(0, 0, 0, 0.38)` |
| `divider` | `rgba(0, 0, 0, 0.12)` |
| `action.hover` | `rgba(69, 90, 100, 0.04)` (primary @ 4%) |
| `action.selected` | `rgba(69, 90, 100, 0.08)` |

#### Dark theme - surfaces & text
| Role | Value |
|---|---|
| `background.default` | `rgb(33, 33, 33)` ≈ `#212121` |
| `background.paper` | `rgb(51, 51, 51)` ≈ `#333333` |
| `surface.elevated` | `rgb(66, 66, 66)` ≈ `#424242` |
| `text.primary` | `#ffffff` |
| `text.secondary` | `rgb(184, 192, 196)` (cool gray) |
| `text.disabled` | `rgba(255, 255, 255, 0.3)` |
| `divider` | `rgba(255, 255, 255, 0.12)` |
| `action.hover` | `rgba(255, 255, 255, 0.08)` |
| `action.selected` | `rgba(255, 255, 255, 0.12)` |

### 2.2 Typography

Base size - `16px`, Material scale:

| Role | Size | Weight | Example |
|---|---|---|---|
| `h1` | `2.9991rem` (~48px) | 700 | - |
| `h2` | `2.7849rem` (~44px) | 700 | - |
| `h3` | `2.5707rem` (~41px) | 700 | - |
| `h4` | `2rem` | 700 | - |
| `h5` | `1.5rem` | 700 | values on voting cards |
| `h6` | `1.25rem` | 600 | "Players", "Story Point Poker" headings |
| `subtitle1` | `1.125rem` | 500 | - |
| `body1` | `1rem` | 400 | body text |
| `body2` | `0.9375rem` | 400 | labels, metadata |
| `caption` | `0.75em` | 400 | badges, status indicators |

**Weights in the system:** `400 / 500 / 600 / 700` (light is not used)

### 2.3 Shadows (Material elevation stack)

| Level | Value |
|---|---|
| `elevation 0` | `none` |
| `elevation 1` | `0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px rgba(0,0,0,.14), 0 1px 3px rgba(0,0,0,.12)` |
| `elevation 3` | `0 3px 3px -2px ..., 0 3px 4px ..., 0 1px 8px ...` (Players card) |
| `elevation 4` | `0 2px 4px -1px ..., 0 4px 5px ..., 0 1px 10px ...` (AppBar) |
| `elevation 8` | `0 5px 5px -3px ..., 0 8px 10px 1px ..., 0 3px 14px 2px ...` (Menu, Popover) |

In the dark theme, shadows are **retained** (unlike Material 3, where they are replaced by surface tint).

### 2.4 Border radius

| Token | Value | Where |
|---|---|---|
| `radius.none` | `0` | AppBar |
| `radius.sm` | `4px` | Voting cards, input fields |
| `radius.md` | `5px / 7px` | Player rows |
| `radius.pill` | `25px` | JOIN ROOM button (on the login screen) |
| `radius.full` | `50%` | Avatars, IconButton |

### 2.5 Spacing scale

Based on an 8-px grid (Material standard):
`4 / 8 / 16 / 24 / 32 / 48` (px)

Values from the actual code: `padding: 16px / 24px / 32px / 36px`, `margin: 4px / 8px / 24px / 32px`.

---

## 3. Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ AppBar (sticky, 64px tall, primary bg, elevation 4)                │
│  ┌─Logo "Story Point Poker"  ──────── User chip + Avatar IconBtn─┐│
│  └────────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ Players Card    │    │  1  │ │  2  │ │  3  │ │  5  │  ...      │
│  │ (elevation 3)   │    └─────┘ └─────┘ └─────┘ └─────┘           │
│  │  ─ row io       │                                               │
│  │  ─ row Tester   │    ┌─────┐ ┌─────┐ ┌─────┐                    │
│  │  ─ row Тестер   │    │  20 │ │  ?  │ │  ☕ │                    │
│  └─────────────────┘    └─────┘ └─────┘ └─────┘                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- **AppBar:** `sticky` position, `64px` height, `#455a64` background, white text
- **Sidebar (Players):** fixed width ~`260px`, `margin: 16px`, `elevation 3`
- **Vote area:** flex-wrap, cards `~150 × 200px`, gap `16px`, horizontally centered

---

## 4. Components

### 4.1 AppBar
- `MuiAppBar-positionSticky` + `MuiAppBar-colorPrimary`
- Height `64px`, padding-left/right `24px`
- Logo container (h6, weight 600) on the left, username text + IconButton with PersonIcon on the right

### 4.2 Players Card
- `MuiPaper-elevation3`, radius `5px`
- Header: `#455a64` background, white h6 "Players", centered, padding `8px 16px`
- List - `<List>` with rows: avatar + name + status icons + 3-dot menu (current user only)
- Status icons (right): `aria-label="moderator|inactive|player deciding"`
- Row height `48px`, `border-radius: 7px` on hover

### 4.3 Vote Card
- `MuiCard-root` + `MuiPaper-elevation1`
- Size `~150 × 200px`, background `#f5f5f5` (light) / `#424242` (dark)
- Value centered, `font-size: 1.5rem` (h5), `font-weight: 400`, color `text.secondary`
- States:
  - **default:** `elevation 1`, subtle background
  - **hover:** slightly higher background contrast (`#f0f0f0`)
  - **selected:** `elevation 3` + white background in light, or slightly lighter in dark
- Special values: `?` (unknown estimate), `☕` (coffee break) - as emoji (1.5rem)

### 4.4 Player row (in Players list)
- `<ListItem>` with:
  - Avatar (round, 40 × 40, DiceBear bottts; authenticated users can upload their own photo - non-empty `user_profiles.avatar_url` + Storage bucket `avatars`, spec `docs/specs/2026-08-02-custom-avatar-upload-design.md`)
  - Primary text (name) - `body1` 400; **bold 500** for the current user
  - Trailing - status icons (16px, opacity 0.54) + 3-dot IconButton (own row only)

### 4.5 Avatar Menu (top-right)
- `MuiPopover` + `MuiMenu-paper`, `elevation 8`
- Options: `Sign In`, `Sign Up` (for guests)
- 24px icons to the left of the text

### 4.6 Player context menu (3-dot)
- The same `MuiMenu-paper`, options: **Is Moderator** / **Is Observer** (with Switch), **Rename Player**, **Leave Room**
- Switch - standard MUI with the primary color

---

## 5. Iconography

All icons are **Material Symbols / Icons** (SVG, viewBox 24×24):

| Icon | aria-label | Purpose |
|---|---|---|
| `SportsEsports` | - | Gamepad beside the "bot" player (io) |
| `WifiOff` | `inactive` | Player offline |
| `Schedule` (clock) | `player deciding` | Player is still deciding |
| `MilitaryTech` / shield | `moderator` | Room moderator |
| `MoreVert` | - | Player 3-dot menu |
| `AccountCircle` | `account of current user` | Avatar IconButton in AppBar |

**No emoji in place of icons** - structural elements are SVG only. Emoji (`☕`) are used only as a **semantic value** on the vote card.

---

## 6. Interactive states

| State | Light | Dark |
|---|---|---|
| Default surface | `#ffffff` / `#f5f5f5` | `#333` / `#424242` |
| Hover | +`rgba(69,90,100,.04)` | +`rgba(255,255,255,.08)` |
| Active / Pressed | +`rgba(69,90,100,.12)` | +`rgba(255,255,255,.12)` |
| Selected | `elevation 3` + accent border | same |
| Disabled | opacity `.38` | opacity `.5` (text), `.3` (icon) |
| Focus visible | `outline: 2px solid #455a64` (MUI default) | `2px solid #00cdcd` |

---

## 7. Responsiveness

The captured layout is the **desktop layout** (1440 × 900). On mobile, presumably:
- The AppBar remains sticky
- The Players sidebar collapses into an expandable panel or bottom sheet
- Vote cards reflow into 3 columns

> ⚠️ Only one viewport was captured; the mobile variant has not been verified.

---

## 8. Anti-patterns / notes

- ❌ **No theme switch in the UI** - the user depends on system settings. The UX case "I want a dark theme during the day" is not covered
- ❌ **Status icons without tooltips** on the player row - `aria-label` is present, but a hover tooltip does not explain the icon to a user without a screen reader
- ❌ **Vote card contrast in light:** `rgb(97,97,97)` on `#f5f5f5` has a contrast ratio of ~5.7:1 (OK for AA, but not AAA)
- ⚠️ **Material Design 2** instead of M3 - looks somewhat dated (flat shadows, square corners). Moving to MD3 would provide a more modern look (dynamic palette, surface tint, wider `12-16px` radii)
- ⚠️ **DiceBear avatars** are generated through an external API on every render - consider caching or generating them on the client (`@dicebear/core`)

---

## 9. Recommendations for reproduction

If rewriting with a custom stack:

```ts
// Tailwind config (example)
colors: {
  primary: { DEFAULT: '#455a64', dark: '#1c313a', light: '#546e7a' },
  accent:  { DEFAULT: '#00cdcd' },
  surface: {
    light:    { base: '#fafafa', paper: '#ffffff', subtle: '#f5f5f5', hover: '#f0f0f0' },
    dark:     { base: '#212121', paper: '#333333', subtle: '#424242', hover: '#3a3a3a' },
  },
},
fontFamily: { sans: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'] },
borderRadius: { sm: '4px', md: '7px', pill: '25px' },
boxShadow: {
  e1: '0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px rgba(0,0,0,.14), 0 1px 3px rgba(0,0,0,.12)',
  e3: '0 3px 3px -2px rgba(0,0,0,.2), 0 3px 4px rgba(0,0,0,.14), 0 1px 8px rgba(0,0,0,.12)',
  e4: '0 2px 4px -1px rgba(0,0,0,.2), 0 4px 5px rgba(0,0,0,.14), 0 1px 10px rgba(0,0,0,.12)',
  e8: '0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12)',
},
```

**Desired upgrades:**
- Move to MD3 / shadcn/ui for better typography, surface tint, and dynamic theming
- Add a custom theme toggle (persist it in `localStorage`)
- Add tooltips to player status icons
- Animate the transition between themes (`transition: background 200ms ease, color 200ms ease`)
- Move fixed voting values to config (currently Fibonacci `1, 2, 3, 5, 8, 13, 20, ?, ☕`)

---

## 10. Audit of the current implementation (assets/css/main.css)

> Audit as of 2026-05-14. Version: Tailwind v3 via `@nuxtjs/tailwindcss ^6`.

### 10.1 What is implemented

- A complete system of CSS custom properties (`--bg-*`, `--text-*`, `--primary`, `--shadow-*`)
- Dual theme via `html[data-theme='dark|light']` - no flash thanks to an inline script in `<head>` (nuxt.config.ts)
- MUI-like library in `@layer components`: `mui-btn`, `mui-btn-text`, `mui-icon-btn`, `mui-input`, `mui-card`, `mui-menu`, `mui-menu-item`, `mui-modal-overlay`, `mui-modal-paper`, `mui-switch`, `mui-h5`, `mui-h6`, `mui-body`, `mui-caption`, `mui-svg-icon`
- Responsive `mui-card-value` (4 breakpoints: base / 600 / 900 / 1200)
- Consistent shadow scale (1/2/3/4/8 = Material elevation stack)
- ✅ Tailwind tokens registered in `tailwind.config.ts` (previously - item 10.2 #1): `primary`, `primary-hover`, `primary-soft`, `danger`, `success`, `bg-{app,appbar,paper,elevated,overlay,skeleton}`, `text-{primary,body,muted,disabled,inverse}`, `border-{DEFAULT,input}`, `shadow-{1,2,3,4,8}`

### 10.2 Issues found

| # | Issue | Impact |
|---|----------|-------|
| 2 | Inline `style=` in components (AppHeader, [slug].vue, etc.) | Bypasses Tailwind, hard to refactor and maintain |
| 3 | ✅ Fixed - `mui-btn-text:disabled` is defined | - |
| 4 | ✅ Fixed (2026-07-12) - see §10.4 | Cards and panels no longer blend into the background in light mode |

### 10.3 Recommended fixes

**Priority 1 - fix light mode card contrast:** ✅ implemented (2026-07-12) via `--card-border`/`--card-shadow`, see §10.4 - the final solution adds an outline and shadow along with the background change.

**Priority 2 - `mui-btn-text:disabled`:** ✅ already implemented in the codebase.

**Priority 3 - gradually replace inline `style="color: var(--text-*)"` with Tailwind utilities (`text-muted`, `bg-paper`, etc.).** Still relevant; partially done for `text-white` → `text-primary` (§10.4); the remaining inline styles (AppHeader, countdown buttons) remain.

### 10.4 Changes from the 2026-07-12 session

**Card/panel contrast in the light theme (§10.2 #4).** Theme-dependent tokens added to `html[data-theme='light']`:
- `--card-border: 1px solid rgba(0,0,0,0.192)`, `--card-shadow: 0px 1px 2px rgba(0,0,0,0.096)` - read by `.mui-card` (voting cards) and `.mui-icon-btn` (icon buttons)
- `--paper-border: var(--card-border)`, `--paper-shadow: var(--card-shadow)` - read by `.mui-paper` (Players/Timer/AlignmentCard/SlotMachine), as well as `.mui-modal-paper`/`.mui-menu`, which already read `--paper-border`
- For `.mui-icon-btn`, the outline is disabled in dark bars (`.bg-appbar`, `.mui-paper-header`), where it is not needed

**New `.mui-chip` component** (Filter/Choice chip, `border-radius: var(--radius-chip, 999px)`) - replaced the native checkbox grid for deck cards and the `.mui-shield` picker for the third card in `ConfigureCardDeckModal.vue`. `.mui-shield` remained unchanged for player role selection (`PlayerEditModal.vue`).

**`.mui-icon-group`** - a thin shared outline (`border-radius: 999px`, `min-width: 128px`, `min-height: 44px`) combines a group of icon buttons into one block instead of separate borders on each.

**The countdown start mechanism (`CardsArea.vue`) was redesigned:**
- Removed the separate "Please vote" CTA button (`cards.revealCountdown`) and the concept of "short press = selected default mode" (`sp-countdown-mode` in localStorage is no longer used)
- Each of the 3 icons (`No sound` / `Simple sound` / `With atmosphere`) is a self-contained action: **holding for 1.4s** (`pointerdown`/`keydown Enter-Space`, canceled on `pointerup`/`pointerleave`/`blur`, tied to the specific mode so that a neighboring button's `blur` does not cancel another button's hold) fills a thin SVG halo (`stroke-dashoffset` transition, synchronized with `HOLD_MS` in CSS) and starts `startCountdown(mode)`
- Halo: `stroke-width: 2`, color `var(--text-primary)` (theme-dependent: black in light, white in dark), fitted within the button itself (does not extend beyond the group outline)
- While the countdown runs, the `.mui-icon-group` does not disappear - the border remains in place, and the buttons inside are replaced by a centered counter (`countdownCounter`)
- "Simple sound" icon: `app:bank` → custom `app:timer` (a dial with two hands; fixed via `fill-rule="evenodd"` because the contour direction hid the second hand)

**`text-white` → `text-primary`** in headings/statistics/filter tabs (`AlignmentTrendsModal`, `HistoryModal`, `ConfigureCardDeckModal`, `ResultsArea`, `CardsArea`) - white text on the light background of modals was practically invisible in the light theme. White text was retained only where it sits on colored badges/bubbles (a background that does not depend on the theme).

**Vote question (`CardsArea.vue`)** - answer editor: each row received `✕` (any row can be removed, including rows other than the last); "+" was moved to a separate `mui-btn-text` "Add option" button below the list; starting the vote is blocked if an added row is empty.

---

## 11. Features and mechanics

> All role gates below are **client-side only**. RLS on `rooms`/`room_state`/`players`/`round_history` uses `using (true)` (public read/write for the anon key, `supabase/migrations/001_initial_schema.sql`). Role distinctions are not enforced at the database level.

### 11.1 Moderator features

Roles are defined in `app/pages/[slug].tsx`:
```ts
const isModerator = currentPlayer?.is_moderator ?? false
const isAuthorizedModerator = isModerator && !!user
```

**Moderator (`is_moderator`, no authentication required)** - the entire bottom button block in `CardsArea.tsx` (`{isModerator && ...}`), plus several controls outside it:

| Action | Component / handler |
|---|---|
| Reveal estimates | `CardsArea.tsx` reveal-button → `roomStore.reveal()` |
| Reset votes (reset) / restore (undo) | `CardsArea.tsx` reset-button → `roomStore.resetVotes()`; press again → `roomStore.restoreVotes(snapshot)` |
| Show previous round (undo) | `CardsArea.tsx` undo-button → `showLastRound = !showLastRound` |
| Start reveal countdown | `CardsArea.tsx` hold-to-start (silent/with sound/with atmosphere) → `broadcastCountdownStart` - details in §11.6 |
| Start a new round | `ResultsArea.tsx`, `showNewRound={isModerator}` → `roomStore.startNewRound()` |
| Configure a poll (`voting`/`vote_question`) | `CardsArea.tsx`, condition `... && isModerator` → `setPollQuestion`/`startVoteQuestion` |
| Configure the card deck | `AppHeader.tsx` menu → `ConfigureCardDeckModal` (preset and cards; circles are automatic, §11.9) |
| Kick a player | `PlayerRow.tsx`, gate `currentUserIsModerator` → `playersStore.kick` |
| Control the timer (reset/pause/resume/±30s) | `Timer.tsx`, `canControl={isModerator}` (specifically `isModerator`, **not** `isAuthorizedModerator`) |

**Authorized moderator (`isModerator && user`)** - in addition to the list above:

| Action | Component / handler |
|---|---|
| Rename the room / set its slug | `AppHeader.tsx`, nested `user` condition inside `isModerator` → `roomStore.setRoomName(name, slug)` |
| Room background (upload / crop / remove) | `AppHeader.tsx` → `RoomBackgroundModal` (only an `isAuthorizedModerator` who owns the background or when the background has no owner yet) → `roomStore.uploadBackground` / `removeBackground`, §11.10 |
| Rename another player + edit their shields | `PlayerRow.tsx`, gate `currentUserIsAuthorizedModerator` (nested inside the `currentUserIsModerator` block) → `PlayerEditModal` |

### 11.2 Player features

Available to any room participant, regardless of `is_moderator`:

1. Vote for an active card (`CardsArea.tsx`, cards are not role-gated - only `canVote` applies)
2. Rename yourself / set your own shields (`PlayerRow.tsx`, gate `isOwn` → `PlayerEditModal`)
3. Leave the room (`PlayerRow.tsx`, gate `isOwn` → soft-delete `left_at`)
4. **Toggle your own moderator flag** (`PlayerRow.tsx`, gate is only `isOwn`, with no `currentUserIsModerator` check) - anyone can self-promote, not only the current moderator; the UI has no toggle for ANOTHER player's moderator flag
5. View round history / the alignment chart (`AppHeader.tsx`, only gate is `roomName` - the room must have a name; the role is not checked)
6. Switch theme/palette/language, and the Timer ↔ SlotMachine side widget
7. Play the slot machine (3 spins per round for everyone; gating - §11.8)

### 11.3 Alignment chart and trends (`AlignmentTrendsModal.tsx`)

**Data source:** one `roomStore.fetchHistory()` request in `useEffect` on opening - the room's entire
`round_history` (no database-level pagination/date filter). `isNumericPreset()` retains
`scrum`/`fibonacci`/`hours`/`goal_clarity` and rounds without a preset; the latter also require at least
one numeric vote.

**Granularity - one round = one chart point.** Each filtered `round_history` record maps 1:1 to
`ChartPoint {date, alignments, overall, deckPreset, round}`:
`roleRoundAlignment(round, shieldsMap)` supplies role scores, and `summarizeRound(round, shieldsMap).alignment`
supplies the overall score. There is no daily/weekly aggregation.

> ⚠️ `shieldsMap` is built from the current shields of visible players when the modal opens. A role change
recalculates past rounds under the new role; players without a role and those no longer visible count as
DEV. The snapshot does not save the role at the time of voting.

**Filters:**
1. Time window: `30D` / `90D` / `6M` (default) / `1Y` - `cutoff` is calculated from `Date.now()`
2. Deck: `deckFilter` limits results to one `deck_preset` or shows all

**`alignmentScore(votes, deckOrder)` formula (`app/utils/alignment.ts`):**
1. `estimateCards` = deck order minus `{'?', '☕'}`
2. Each vote → its position index in `estimateCards`; votes for `?`/`☕` are excluded
3. If counted votes < 2 → `null`
4. `span = estimateCards.length - 1`; if the deck has one estimate card → `100`
5. `spread = max(index) - min(index)` among votes
6. **`score = round(100 * (1 - spread / span))`** - 100 = everyone chose the same card (or adjacent cards), 0 = the most distant cards in the deck were voted simultaneously

The trends chart draws a separate line for each of DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM with a
non-null score in the visible period (`roleRoundAlignment()` in `roundStats.ts`, raw role - `voteCohortFor()`
in `resultCohorts.ts`). Each line can be toggled in the legend. `COHORT_COLORS` is the shared map for lines
and history and snapshot badges; GQA - `#ff7043`, AQA - `#fdd835`, QA - `#ffa726`. The current round's
automatic circles (§11.9) do not change the history, trends, or home formulas. Legacy `custom:*` counts as DEV.

**Legacy rounds without `active_cards`/`deck_preset`** (fixed 2026-07-26): `alignmentScore` returns
`null` when `deckOrder` is empty, and rounds recorded before migration `010_round_history_deck.sql` have
`active_cards = null` (the oldest also have `deck_preset = null`), so their alignment silently disappeared
from the chart even though their votes are real and numeric. `resolveActiveCards(activeCards, deckPreset)`
(`app/utils/roundStats.ts`) supplies the corresponding preset's `defaultActive` from `cardDecks.ts`, or
`DEFAULT_PRESET_ID` (`'scrum'`) if `deck_preset` is also missing. This is an approximation (the actual deck
at the time of the round may have been narrowed), but is better than losing the point entirely. It is called
in `roleRoundAlignment`/`summarizeRound`, so both `AlignmentTrendsModal` and `HistoryModal` now see these
rounds. It **mirrors** `resolveActiveCards` in `netlify/functions/room-json.mts` (commits
`e1dcf02`/`beca0e5`) - synchronize both places manually when changing the formula.

**Overall round score:** history, home, and trend cards calculate `alignmentScore` using one pool of votes
from DEV/BE/FE/SRE/QA/GQA/AQA estimators, excluding PO/SM (`estimatorVotes()`; legacy `custom:*` is DEV).
If no estimator voted, the pool contains all votes. The estimate average uses the same pool. The score is an
integer from 0-100, or `null` with fewer than two votes for deck cards excluding `?`/`☕`. Home displays the
rounded average of non-null overall scores for numeric rounds; poll and non-numeric decks are excluded. Legacy
API fields for agilecharts retain their contract (`netlify/AGENTS.md`).

**Aggregates over filtered points** use overall round scores:

1. Current score - the last non-null score in the visible period; average - the rounded average of non-null scores
2. Trend - only with ≥4 non-null scores: `pct = (average of newer half - average of older half) / older half × 100`;
  `up` if `pct > 1`, `down` if `< -1`, otherwise `stable`

**Level badges (`alignmentLevel`/`levelColor`):** `Perfect ≥90` (green), `High ≥75` (green), `Medium ≥40` (yellow), `Low <40` (red).

> ⚠️ Horizontal dashed reference lines on the chart (`REF_LINES`: 100/75/50/25, labeled `100%`/`75%`/`50%`/`25%`) are visual grid markers; their positions **do not match exactly** the `alignmentLevel` thresholds (e.g. the line at 50 does not match the text threshold for "Medium", which starts at 40).

**Chart engine - ECharts** (`echarts`, since 2026-07-25; previously hand-written SVG). Only the required modules are loaded (`echarts/core` + `CanvasRenderer`/`LineChart`/`GridComponent`/`TooltipComponent`/`DataZoomComponent`/`MarkLineComponent`, `use([...])`) for bundle size. `useEChart(container, option)` (`app/hooks/useEChart.ts`, resize via `ResizeObserver`) - `chartOption` in `useMemo` builds `xAxis`/`yAxis`/`series`/`tooltip`/`dataZoom` from `points`.

**X axis** - `type: 'category'` with `boundaryGap: false`, data - `weekLabel(date)` (ISO week, `w12`) for each point; the category axis distributes points evenly in order (rather than in proportion to actual time), so rounds close in time do not overlap and the first/last points lie exactly at the chart edges. The line uses `smooth: true` (built-in ECharts smoothing, no manual Catmull-Rom).

**dataZoom timeline below** - a slider (`type: 'slider'`) under the chart with a miniature preview of the line shape (`dataBackground`) + `type: 'inside'` for zoom/pan with the mouse wheel or pinch; it allows zooming into any segment of the time window selected with the `30D/90D/6M/1Y` buttons without changing the filter itself.

**Reference lines** (100/75/50/25%) - a separate invisible series `__refLines` (`data: []`, `silent: true`,
`tooltip.show: false`) with `markLine`, always in `series` regardless of role toggles, so the reference lines
do not disappear with the lines.

**Tooltip** - `trigger: 'item'`, **`triggerOn: 'click'`** (clicking a point shows and "pins" the tooltip;
it hides only on another click or a click on an empty area of the chart - unlike strict hover, this gives
time to move the pointer to the "Details" button, especially at edge points), `enterable: true` (the pointer
can enter the tooltip without closing it). Content - `formatter()` returns HTML: series label + value
(`%`), date, close button `×` (`data-close-tooltip`), and clickable `trends.viewDetails` row
(`data-view-details`, `data-index`). The series label is the raw role tag from `series.name`, and its color is
from `COHORT_COLORS`.

**Round snapshot** - a delegated `document` listener catches clicks on `data-view-details` in the tooltip
(ECharts renders the tooltip in `document.body`), then `points[dataIndex].round` → `selectedRound` →
`RoundSnapshotModal.tsx`. The modal renders inside the current one so Tab does not leave the snapshot; it shows
names and votes from the `round_history.votes` snapshot, with a `RoleBadge` from current shields alongside.
The role comes from the same `shieldsMap`, so the warning about role changes after voting applies.

**Cohort in the round snapshot** - `data-view-details` carries `data-cohort` with the line's role tag
(`params.seriesName`), passed as `cohort` to `RoundSnapshotModal`. The modal filters `round.votes` through
`voteCohortFor()` and shows only votes for that raw role; its badge in the heading uses the color from
`COHORT_COLORS`. If no votes remain after filtering - `trends.noVotesInCohort`.

### 11.4 Round history (`round_history`)

**Schema** (`supabase/migrations/001_initial_schema.sql` + `010_round_history_deck.sql`):
```sql
round_history (
  id uuid PK, room_id text, started_at timestamptz, revealed_at timestamptz,
  votes jsonb, created_at timestamptz,
  active_cards text[], deck_preset text
)
```

**Writing** - `roomStore.reveal()` (`app/stores/room.ts`):
1. No-op if the room/state is absent or `phase` is already `'revealed'` (prevents duplicate writes)
2. Collects `votes = {player_id, name, vote}[]` only from players with a non-empty vote
3. Sets `room_state.phase='revealed'` with a conditional update (`phase <> 'revealed'`, `select('room_id')`); if the timer was paused, freezes `paused_elapsed_ms` (see §11.6)
4. **A `round_history` row is written only when this update changed a row and `votes.length >= 2`** - reveals with one or zero votes do not enter history, and of two simultaneous reveals only the one that won the update writes; the one that changed 0 rows rereads `room_state`, and an update error is logged
5. `active_cards`/`deck_preset` come from the room state at reveal time, so the card in history remains correct even if the deck is changed later

`?` and `☕` count as full votes for recording, but are excluded from `alignmentScore`/`averageOf` (non-numeric). `name` is duplicated in the snapshot so history remains readable after a player is renamed, kicked, or leaves.

**`HistoryModal.tsx`** reads all of `fetchHistory()`, groups by year/quarter, and filters by deck; for
each round it displays `summarizeRound()` (`app/utils/roundStats.ts`): `average` (weighted mean of
numeric votes, `.toFixed(1)`), `alignment` (`alignmentScore`), `counts` (number of votes for each
value), `voterCount`. For poll decks (`voting`/`vote_question`), `average`/`alignment` are always
`null`. Average and alignment use the estimator pool (§11.3); counts and voterCount include all votes.
If votes with a cohort belong to two or more roles, one row per role is shown in the order DEV, BE, FE,
SRE, QA, GQA, AQA, PO, SM (legacy `custom:*` is DEV). If there is one role, one row shows all votes. Grouping uses the raw current role regardless of
room chips.

### 11.5 Export (removed)

Manual CSV export from `HistoryModal` (a button per deck, limited to `scrum`/`fibonacci`) was removed - its role is now served by the public JSON API `netlify/functions/room-json.mts` (`GET /api/<room>.json` and `GET /api/teams.json`), which feeds `agilecharts`. See `netlify/AGENTS.md` for the API contract.

### 11.6 Round timer and reveal countdown mechanics

These are two independent features, both commonly called a "timer":

**A. Round timer (`Timer.tsx`)** - measures the duration of the current voting round.

1. `room_state`: `round_started_at`, `paused_at` (nullable), `paused_elapsed_ms` (`supabase/migrations/006_room_state_timer.sql`)
1. `elapsedMs = max(0, pivot - round_started_at - paused_elapsed_ms)`, where `pivot` = the moment of `reveal` (`Date.now()` frozen at the transition `phase → 'revealed'`), or `paused_at` when paused, or live `now` (one tick per second)
1. **Controls** (`reset`/`pause`/`resume`/`±30s`) - only `showControls = canControl && phase==='voting'`, `canControl={isModerator}` in `[slug].tsx`
   1. `reset` - full restart (`round_started_at=now()`, clears the pause)
   1. `pause`/`resume` - `resume` adds the duration of the pause that just ended to `paused_elapsed_ms`
   1. `±30s` (`adjustTimer`) - shifts `round_started_at`; for "+30s" the shift is capped (`min(cap, ...)`) to prevent moving the start into the future
1. **1-hour limit** (`ROUND_TIMER_CAP_MS` in `app/utils/timerAlarm.ts`) - the displayed time does not grow beyond 1 hour; during `voting` the text becomes "Timer stopped after 1h 0m 0s", and the alarm no longer fires. According to `round_history` (May-October 2026), 92% of rounds are shorter than 45 minutes, and those longer than an hour are mostly rooms left overnight or for days after refinement. When the team returns, meaning `onlineCount` rises above 1, `[slug].tsx` calls `resetTimer(round_started_at)` if `isRoundTimerStale()` and the count starts from zero; a single participant in the room sees the stopped timer, while other `room_state` changes (Pause, ±30s, alarm settings) do not trigger a reset. The write occurs only if `round_started_at` is unchanged and `phase = 'voting'` (compare-and-set), so concurrent clients, manual Reset/±30s, and reveal between the check and the write are not overwritten. Paused time does not count toward the limit
1. If `reveal()` occurs during a pause, `paused_elapsed_ms` is advanced to the moment of reveal and the displayed duration is frozen correctly; in the `revealed` phase, `Timer.tsx` uses `min(revealedAt, paused_at)`, so the duration does not jump by the idle time
1. **Round alarm** - the gear on the left of the widget header (moderator only, `canControl`) expands inline settings: "Alarm after N min" (3-20, default 5; Enter commits the value and removes focus) and a mute bell (sound is on by default). Settings are shared across the room - `room_state.alarm_minutes` / `alarm_muted` (migration `018`, `null` = 5 minutes and sound on), written by `roomStore.setAlarm()`; helpers and bell synthesis are in `app/utils/timerAlarm.ts`. All participants see and hear the alarm
   1. When `elapsedMs` crosses N, 2N or 3N minutes during `voting`, the entire widget flashes (`timer-alarm-blink`) and a synthesized Web Audio bell plays independently of `sp-volume`: 1, 2 and 3 chimes respectively, with the same number of flashes (`ALARM_MAX_BEEPS`). There is no alarm from 4N onward. The timer does not stop: it records how long the task discussion took, so the alarm only reminds participants of the time
   1. A manual pause shifts the next alarm by its duration; reveal and a new round work as usual, and `round_history` is written as before
   1. Fires only when crossing a threshold: there is no alarm after reload if the threshold has already passed; it does not fire while paused or after reveal

**B. Reveal countdown (hold-to-start, `CardsArea.tsx` + `app/hooks/useCountdown.ts`)** - an optional "hype" countdown with sound before the moderator reveals estimates.

1. 3 modes (icons in `.mui-icon-group`): **Countdown without sound** (silent 10s fallback), **Countdown with sound** (`countdown-dry.mp3`, duration = file length), **With ambience** (first `please-vote.mp3`, followed by `countdown-wet.mp3` after it finishes)
1. **Activation - hold for 1.4s** (`pointerdown`/`keydown Enter-Space`), not a short press (the concept of "short press to select the default mode" was removed in this session). Cancelled on `pointerup`/`pointerleave`/`blur`, tied to the specific mode so focus loss from an adjacent button does not cancel another button's hold
1. A thin SVG halo around the button fills in sync with the hold (`stroke-dashoffset` transition = `HOLD_MS`)
1. On completion of the hold: `onStartCountdown(mode)` → `broadcastCountdownStart` sends `{initiatorId, mode}` to the `countdown:<roomId>` broadcast (`self:true`) → **all** clients (including the initiator) start their local `useCountdown().startCountdown(mode, ...)`, synchronized by the sound file/fallback timer
1. Only the initiator's callback calls `roomStore.reveal()` when the countdown finishes naturally
1. `decision-sound` plays on every reveal with consensus (transition `voting → revealed`), regardless of countdown mode; in "With ambience" mode, `ambience.mp3` plays at the end if there is no consensus. The header slider (`sp-volume`) controls the volume of all sounds
1. While the countdown runs, the `.mui-icon-group` border remains visible - the buttons inside are replaced by a centered counter; the `revealPending` flag hides the buttons a little longer, until `phase` actually transitions to `'revealed'` (closes the race between the local timer and the realtime round-trip)
1. The entire block is moderator-only (§11.1)

### 11.7 Goal Clarity Score (`goal_clarity` preset)

A separate preset for a health-check question, not for estimating story points. The stored default is "Наскільки чітко я розумію Sprint Goals?"; its display depends on the locale ("How clearly do I understand the Sprint Goals?" in English).

**Cards** - fixed scale `1,2,3,4,5` (`cards === defaultActive`, no `?`/`☕`/toggle - like `boolean`).

**Fixed question** - `DeckPreset.defaultQuestion` (a new optional field in `app/utils/cardDecks.ts`, unlike the moderator-typed `poll_question` in `voting`/`vote_question`). `setDeckPreset()` writes `poll_question: preset.defaultQuestion ?? null` - the same `room_state.poll_question`/UI display path for the question (`CardsArea.tsx`/`ResultsArea.tsx`) as poll decks, but populated automatically and not edited by voting (it remains until the moderator changes the preset). `CardsArea.tsx` shows the question heading whenever `pollQuestion` exists (`!!pollQuestion`), including outside `pollMode`/`voteQuestionMode`.

**Not a poll deck** - `isPollPreset()` (`roundStats.ts`) deliberately does NOT include `goal_clarity`: voting/reveal/celebration/consensus/alignment badge (`AlignmentCard`) work as for an ordinary numeric preset. `isNumericPreset()` includes it, so rounds appear in `HistoryModal`/`AlignmentTrendsModal`/`room-json.mts` API alongside scrum/fibonacci/hours (the same `alignmentScore` - 0-100 spread-consensus, scale-agnostic).

**Score circle after reveal** (`ResultsArea.tsx`, prop `goalClarityScore`) - instead of PieChart/per-card average (a pie with "1,2,3,4,5" is not informative for a Likert scale), a colored circle with the "raw" average (`averageOf(votes)`, the same `(sum of votes)/(count)`, e.g. 6 participants `3,4,5,4,5,4` → `25/6 = 4.2`):
1. `> 3.5` - green `#43a047`
1. `2.5 ≤ x ≤ 3.5` - yellow `#fbc02d`
1. `< 2.5` - red `#e64a19`

The `3.5` / `2.5` thresholds are the owner's product decision, not derived from data; in code they live as
`GOAL_CLARITY_THRESHOLDS` (`app/utils/cardDecks.ts`) next to the preset, and changing a boundary means changing it there.

For a result of `≤ 3.5` - the `results.goalClarityHint` hint ("The goal isn't clear to the team - consider reformulating the Sprint Goal or the Definition of Done criteria"). The same color triplet as `alignmentLevel`/`levelColor` in `AlignmentTrendsModal.tsx`.

### 11.8 Slot machine (`SlotMachine.tsx`)

The left room widget is switched with a button in the block header (Timer ↔ SlotMachine); the selection is stored in `sp-side-widget` (`timer | slot`).

**Mechanics** - 3 reels, weighted randomness (`utils/slotMachine.ts`; symbols are tabler icon IDs in `SLOT_SYMBOL_WEIGHTS`, rendered through `<AppIcon>`), 3 spins per player per round (`spinsPerRound`, reset by `round_started_at`). Jackpot = 3 identical symbols.

**Spin gating** - `canSpinSlot` (`[slug].tsx`, calculated during render from `roleTagForShields`): always `true` for `PO`/`SM`; for other roles only when `phase==='voting'`, the player has already voted, and at least one person has not yet voted. The slot is an activity "while waiting for others", not an alternative to voting. `SlotMachine.tsx` receives `canSpin` alongside `spinsLeft` and shows `slot.voteFirst` (1.5s, without its own animation) when `spinsLeft > 0` but `canSpin === false`.

**Jam animation** - the spin button remains clickable when `canSpin === false` (`disabled` responds only to `spinning`/`spinsLeft<=0`): a click calls `triggerJam()` instead of spinning - `.slot-window.is-jammed` for 400ms, `@keyframes slot-jam` jerks `.slot-strip` by a few px (staggered `animation-delay` across reels), simulating a jammed lever.

**State broadcast** - everyone can see who is spinning and who won through the `countdown:<roomId>` broadcast channel (not through the `players` table):
1. `SlotMachine.tsx` calls `onSpin`/`onSpinEnd` around the spin animation (`REEL_DURATIONS_MS[2]+150` ≈ 2.45s)
1. `[slug].tsx` sends `slot-spin-start`/`slot-spin-end` with `{playerId}` and maintains `spinningPlayerIds: Set<string>` (a 2.8s safety timer in case `spin-end` is lost)
1. `slot-win` with `{playerId}` sets `slotWinnerId` for 1.6s

**Indicator in `PlayerRow.tsx`** (props `isSpinningSlot`/`isSlotWinner`) - the only visible jackpot effect, with no banner or local highlight on the slot itself. The die (`font-size: 1.125rem`, slightly smaller than the adjacent moderator icon) sits in the name row using the same `AppTooltip` pattern as `app:moderator` - the vote status column remains untouched. The die does not rotate: while the spin runs, its face changes every 120ms (`tabler:dice-1`…`dice-6`, `DICE_FACES`/`diceFaceIndex`), simulating rolling in a cup; it then returns to the default `dice-5`. On a win, the name and die flash together with `.win-blink` (`@keyframes win-blink`, `animation-iteration-count: 3`).

### 11.9 Result circles and cohorts (`resultCohorts.ts`)

After reveal, `ResultsArea.tsx` draws a circle (PieChart + average) for each group included by the chips (item 3).
`groupResultVotes()` returns groups `{ key, label, votes }` in `ROLE_COHORTS` order. A participant without a vote does not create a circle; votes are hidden before reveal, and there are no role circles without votes.

1. **No custom roles:** a legacy `custom:*` shield counts as "no role" (DEV). For a legacy shields array,
   the first recognized built-in role determines the group; without one, DEV is used.
2. **Circles:** `PieChart.tsx` uses ECharts pie with `SVGRenderer` and explicit `{ renderer: "svg" }`,
   loaded through `lazy()` in `ResultsArea`. All circles have the same width up to 240 px, wrap onto new
   rows and shrink equally to the container width; long labels wrap. A width change redraws
   the chart without reloading. One vote produces a solid circle labeled with the card; multiple votes produce sectors with labels
   and the same palette. `<ROLE>: <average>` is visible immediately outside the chart. While the chunk loads or if it
   fails, an empty circle-sized space remains without an on-screen error; ECharts is not in the entry chunk.
3. **Deck and circle chips:** `ConfigureCardDeckModal` has chip groups DEV/BE/FE/SRE || QA/AQA/GQA || PO || SM
   ("Separate result circles"). A DEV or QA group with no selected chips produces one combined circle; with selected chips, only
   their circles; PO/SM produce a circle only with a chip. An excluded vote has a red badge in the list and is outside the circles, totals and
   `round_history`. The field is `text[]` (migration `017`), with a check constraint in migration `021` (9 roles). The old setting does not hide votes or
   turn `RoleBadge` red. `voting`, `vote_question`, `goal_clarity` retain bubbles or the clarity score.
4. **History, trends, home and new API fields:** use the raw built-in role via `cohortForShields()` and
   `voteCohortFor()` (§11.3-11.4). Custom roles remain outside role trends; players without a role and those
   who left count as DEV. Automatic circles do not change statistical formulas, the estimator pool or
   the API; the legacy API contract for agilecharts is in `netlify/AGENTS.md`.
5. **Consensus:** `shouldCelebrate(votes, groups)` triggers fireworks and decision-sound if at least one
   circle has ≥ 2 votes and one estimate.
6. **Alignment on the results screen** (`AlignmentCard`) is calculated across automatic groups.
7. **Previous round** (`lastRound` snapshot) stores group keys, labels and votes at reveal.

### 11.10 Room background (`RoomBackgroundModal.tsx`)

An authenticated moderator sets the room background image; all participants see it, and updates arrive through the `rooms:<roomId>` Realtime channel.

1. **Modal:** the "Room background" item in the header menu. Select JPG/PNG/WebP up to 10 MB → a 16:9 frame in which the image can be dragged (pointer events), zoomed with a 1-3× slider or wheel, and controlled with keyboard arrows and `+`/`-`. The image always covers the frame (`clampFraming`). The "Opacity" slider (10-100%, default 65%) shows the result immediately in preview and is saved separately, without reuploading the image (`setBackgroundOpacity`). "Remove background" removes the current background
1. **Cropping:** `framingSourceRect()` (`app/utils/backgroundImage.ts`) converts the visible portion of the frame to original-image pixels; `encodeBackground()` crops it from the original `ImageBitmap` to WebP (quality 0.8) at up to 1920×1080 without upscaling. Decoding and WebP encoding are shared with avatars (`imageEncoding.ts`)
1. **Storage:** Storage bucket `room-backgrounds`, fixed object `<room_id>/background.webp` (upsert, no orphans), then `rooms.background_url` + `background_updated_at` (cache invalidation `?v=`). Removing the background first writes `background_url: null`; the file is deleted best-effort. Migration `016`; without it upload fails (`Bucket not found`), while rooms open as usual (`resolveRoom` reads `select('*')`)
1. **Rendering:** inline `background-image` on the room page root - tint `backgroundTint(opacity)` = `color-mix(var(--bg-app) (1 - opacity))` over the image, `cover`, `fixed`. `backgroundDisplayUrl()` accepts only a path matching regex `^[A-Za-z0-9-]+/background\.webp$`, because the value goes into CSS `url()` and anyone can insert `rooms.id`
1. **Access:** any authenticated moderator (`isModerator && user`) can set, replace and remove the background; there is no background owner (migration `020`). On the server, Storage policies allow any logged-in user to write, update and delete the object, while the `rooms_guard_background` trigger prevents anonymous users from changing `background_url`, `background_opacity`, `background_updated_at` or `background_owner_id`. The server does not verify moderator status: anyone can write `players.is_moderator`, as with other moderator actions. The `background_owner_id` column remains only for compatibility with older clients

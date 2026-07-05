# Graph Report - storypoker  (2026-07-05)

## Corpus Check
- 78 files · ~54,415 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 733 nodes · 968 edges · 48 communities (34 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8d9b95d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Room Page Layout|Room Page Layout]]
- [[_COMMUNITY_Connection Status UI|Connection Status UI]]
- [[_COMMUNITY_Player Row Component|Player Row Component]]
- [[_COMMUNITY_Modal System|Modal System]]
- [[_COMMUNITY_Authentication|Authentication]]
- [[_COMMUNITY_Vote Alignment Trends|Vote Alignment Trends]]
- [[_COMMUNITY_Pie Chart Visualization|Pie Chart Visualization]]
- [[_COMMUNITY_Icon System|Icon System]]
- [[_COMMUNITY_Round History|Round History]]
- [[_COMMUNITY_App Shell & Header|App Shell & Header]]
- [[_COMMUNITY_Card Deck Configuration|Card Deck Configuration]]
- [[_COMMUNITY_Voting Cards Area|Voting Cards Area]]
- [[_COMMUNITY_Timer Component|Timer Component]]
- [[_COMMUNITY_i18n & Icon Registration|i18n & Icon Registration]]
- [[_COMMUNITY_Round Statistics|Round Statistics]]
- [[_COMMUNITY_Alignment Scoring|Alignment Scoring]]
- [[_COMMUNITY_Room Identifiers|Room Identifiers]]
- [[_COMMUNITY_Presence Design Docs|Presence Design Docs]]
- [[_COMMUNITY_Shadcn Removal Docs|Shadcn Removal Docs]]
- [[_COMMUNITY_UI Icons (Deciding, Leave, Moderator)|UI Icons (Deciding, Leave, Moderator)]]
- [[_COMMUNITY_Countdown Composable|Countdown Composable]]
- [[_COMMUNITY_E2E Testing Docs|E2E Testing Docs]]
- [[_COMMUNITY_UI Icons (Bank, Town Hall)|UI Icons (Bank, Town Hall)]]
- [[_COMMUNITY_UI Icons (Fibonacci, Scrum)|UI Icons (Fibonacci, Scrum)]]
- [[_COMMUNITY_V1 Design Docs|V1 Design Docs]]
- [[_COMMUNITY_CI Zero Duplication Docs|CI Zero Duplication Docs]]
- [[_COMMUNITY_VueVite Migration Docs|Vue/Vite Migration Docs]]
- [[_COMMUNITY_Poll Question Feature Docs|Poll Question Feature Docs]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `Story Poker v1 Implementation Plan` - 22 edges
2. `Pinia + Realtime Presence Implementation Plan` - 19 edges
3. `Vue + Vite Migration — Design` - 15 edges
4. `Playwright Smoke E2E Tests Implementation Plan` - 12 edges
5. `Vue + Vite Migration Implementation Plan` - 12 edges
6. `Spec A: Pinia + Realtime Presence` - 12 edges
7. `Spec — Playwright Smoke E2E Tests` - 11 edges
8. `getSupabase()` - 10 edges
9. `Story Poker — Design Spec v1` - 10 edges
10. `Wiring` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Bank Icon (classical bank building with columns, custom app: collection)` --semantically_similar_to--> `Town Hall Icon (civic building with flag, custom app: collection)`  [INFERRED] [semantically similar]
  app/assets/icons/bank.svg → app/assets/icons/town-hall.svg
- `hasNumericVote()` --calls--> `voteToNumber()`  [EXTRACTED]
  app/components/HistoryModal.vue → app/utils/roundStats.ts
- `fetchInitialData()` --calls--> `getSupabase()`  [EXTRACTED]
  app/pages/[slug].vue → app/lib/supabase-instance.ts
- `subscribeRealtime()` --calls--> `getSupabase()`  [EXTRACTED]
  app/pages/[slug].vue → app/lib/supabase-instance.ts
- `handleJoin()` --calls--> `touchRecentRoom()`  [EXTRACTED]
  app/pages/[slug].vue → app/utils/recentRooms.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pinia + Presence architecture mechanisms** — docs_superpowers_specs_2026_05_04_pinia_presence_design_optimistic_vote_flow, docs_superpowers_specs_2026_05_04_pinia_presence_design_presence_model, docs_superpowers_specs_2026_05_04_pinia_presence_design_differential_updates [EXTRACTED 1.00]
- **Custom primitives replacing shadcn-vue/reka-ui** — docs_superpowers_specs_2026_07_02_remove_shadcn_design_appmodal, docs_superpowers_specs_2026_07_02_remove_shadcn_design_apptooltip, docs_superpowers_specs_2026_07_02_remove_shadcn_design_useclickoutside [EXTRACTED 1.00]

## Communities (48 total, 14 thin omitted)

### Community 0 - "Room Page Layout"
Cohesion: 0.03
Nodes (50): alignmentBlocks, authStore, canReset, { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown }, currentPlayer, currentPlayerId, currentRoomName, currentSlug (+42 more)

### Community 1 - "Connection Status UI"
Cohesion: 0.06
Nodes (37): presence, { status }, getSupabase(), authStore, createRoom(), hasError, headerPlayerName, name (+29 more)

### Community 2 - "Player Row Component"
Cohesion: 0.12
Nodes (15): { avatarDataUri }, cursor, emit, error, history, next(), previewUri, profilesStore (+7 more)

### Community 3 - "Modal System"
Cohesion: 0.06
Nodes (37): dialogEl, emit, onCancel(), onOverlayClick(), props, emit, props, tooltipId (+29 more)

### Community 4 - "Authentication"
Cohesion: 0.10
Nodes (31): confirm, email, emit, errors, loading, password, props, { signIn, signUp } (+23 more)

### Community 5 - "Vote Alignment Trends"
Cohesion: 0.06
Nodes (26): allPoints, availableDecks, avgDev, avgQa, chartData, ChartPoint, currentDevScore, currentQaScore (+18 more)

### Community 6 - "Pie Chart Visualization"
Cohesion: 0.06
Nodes (33): answerDrafts, answerInputs, canVote, cardLabel, countdownMode, countdownModeOptions, emit, props (+25 more)

### Community 7 - "Icon System"
Cohesion: 0.13
Nodes (21): props, resolved, FeatureFlagItem, FeatureFlagKey, FeatureFlags, getFeatureFlags(), getFeatureFlagValue(), getFeaturesFlagsFromLS() (+13 more)

### Community 8 - "Round History"
Cohesion: 0.09
Nodes (16): availableDecks, availableYears, cardLabel, dateFmt, deckFilter, emit, filteredSummaries, groups (+8 more)

### Community 9 - "App Shell & Header"
Cohesion: 0.12
Nodes (13): { avatarDataUri }, countdownBarWidth, emit, headerLabel, { isLight, toggle: toggleTheme }, { locale }, menuOpen, menuRef (+5 more)

### Community 10 - "Card Deck Configuration"
Cohesion: 0.13
Nodes (16): applyPreset(), cardLabel, currentDeck, emit, isVoteQuestion, isVoting, presetId, props (+8 more)

### Community 11 - "Voting Cards Area"
Cohesion: 0.05
Nodes (37): Execution Handoff, Phase 1 — Передумови (blockers), Phase 2 — DOM contract (data-testid атрибути), Phase 3 — gitignore + env scaffolding, Phase 4 — Playwright base setup, Phase 5 — Fixtures + POMs, Phase 6 — Тести, Phase 7 — CI integration (+29 more)

### Community 12 - "Timer Component"
Cohesion: 0.17
Nodes (10): elapsedMs, emit, isPaused, now, pivotMs, props, revealedAt, showControls (+2 more)

### Community 13 - "i18n & Icon Registration"
Cohesion: 0.17
Nodes (9): { init }, Theme, useTheme(), i18n, parseSvg(), registerAppIcons(), initSupabase(), router (+1 more)

### Community 14 - "Round Statistics"
Cohesion: 0.36
Nodes (7): hasNumericVote(), averageOf(), isNumericPreset(), isPollPreset(), RoundSummary, summarizeRound(), voteToNumber()

### Community 15 - "Alignment Scoring"
Cohesion: 0.40
Nodes (4): splitRound(), alignmentScore(), NON_ESTIMATE, isQaPlayer()

### Community 16 - "Room Identifiers"
Cohesion: 0.50
Nodes (3): submitRenameRoom(), isValidRoomSlug(), normalizeRoomSlug()

### Community 17 - "Presence Design Docs"
Cohesion: 0.06
Nodes (32): Acceptance criteria, Action `castVote(playerId, card)`, Architecture, DB міграція, Goals, Initial load, Mobile-нюанс, Non-goals (+24 more)

### Community 19 - "UI Icons (Deciding, Leave, Moderator)"
Cohesion: 0.50
Nodes (4): Deciding Icon (clock/timer face in a circle, shown while a player is deciding on a vote), Leave Room Icon (arrow exiting a rectangle/door, leave-room action), Moderator Icon (gamepad/game-controller glyph marking the room moderator), Offline Icon (wifi-off / crossed-out wifi glyph for offline players)

### Community 29 - "Community 29"
Cohesion: 0.07
Nodes (30): Add, `app/i18n.ts`, `app/main.ts`, `app/router.ts`, Build / Deploy, Context, Dependency changes, Env vars (+22 more)

### Community 30 - "Community 30"
Cohesion: 0.08
Nodes (24): CI integration, Cleanup errors policy, Flow 1 — `tests/e2e/smoke.spec.ts` / create room (Chromium + WebKit), Flow 2 — `tests/e2e/smoke.spec.ts` / solo vote reveal (Chromium + WebKit), Flow 3 — `tests/e2e/critical-flows.spec.ts` / auth (Chromium only), `.github/workflows/ci.yml`, `playwright.config.ts`, Required GitHub secrets (+16 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (22): File Map, Story Poker v1 Implementation Plan, Task 10: Компонент PlayerRow, Task 11: Компонент PlayersList, Task 12: Компонент CardsArea, Task 13: Компонент ResultsArea, Task 14: Компонент ModeratorInsights, Task 15: Компонент ConfigureCardDeckModal (+14 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (22): Cards Area (фаза `voting`), Components, Configure Card Deck Modal, Data Model, Header, localStorage, Moderator Insights Panel, Out of Scope (v2) (+14 more)

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (19): Done, File Structure, Pinia + Realtime Presence Implementation Plan, Task 10: Refactor pages/[slug].vue to use stores, Task 11: Refactor pages/index.vue, Task 12: Update AppHeader and AuthModal to use authStore, Task 13: Delete old composables, run full test + dev smoke, Task 14: Update CLAUDE.md (+11 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (18): AppModal.vue, AppTooltip.vue, Dialog → AppModal (8 файлів), DropdownMenu → inline v-if (1 файл), Select → native (1 файл), Tooltip → AppTooltip (5 файлів), TooltipProvider → видалити (App.vue), useClickOutside.ts (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (16): Notes for the executing agent, Post-implementation, Pre-flight, SUPABASE_SECRET_KEY=...    # server-side only, БЕЗ VITE_ префіксу, Task 10: Docs update + bundle diff, Task 1: Scaffold Vite + remove Nuxt, Task 2: Explicit vue-router + App.vue, Task 3: vue-i18n bootstrap (+8 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (12): { avatarDataUri }, cardLabel, emit, isOwn, menuOpen, menuRef, playerAvatar, profilesStore (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (11): Global Constraints, Remove shadcn-vue Implementation Plan, Task 1: New primitives — AppModal, AppTooltip, useClickOutside + CSS, Task 2: Migrate Dialog → AppModal (8 files), Task 3: Migrate Tooltip → AppTooltip (5 files), Task 4: Migrate Dropdown → inline v-if (AppHeader.vue + PlayerRow.vue), Task 5: Remove TooltipProvider + migrate Select → native, Task 6: CSS cleanup in main.css (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): Варіант A — Supabase SQL Editor (найшвидше), Варіант B — Supabase CLI (якщо проєкт залінковано), Варіант C — пряме підключення (якщо є connection string з паролем БД), Готово, коли, Димова перевірка фічі в застосунку, Задача для Claude Code: застосувати міграцію 009 (poll_question), Контекст, Наслідки відсутньої колонки (поточні баги) (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.28
Nodes (7): AVATAR_STYLES, AvatarStyle, cache, useDylanAvatar(), RealtimePayload, useProfilesStore, UserProfile

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (7): CI Zero-Duplication Design, Job: `deploy`, Job: `test`, Notes, Problem, Removed, Solution

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): emit, onlineCount, props, totalCount

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (4): CI Zero-Duplication Implementation Plan, Task 1: Rewrite `.github/workflows/ci.yml`, Task 2: Delete `.github/workflows/deploy-netlify.yml`, Task 3: Commit

## Knowledge Gaps
- **477 isolated node(s):** `{ init }`, `emit`, `roomStore`, `playersStore`, `{ visiblePlayers }` (+472 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Authentication` to `Room Page Layout`, `Connection Status UI`, `Player Row Component`, `Icon System`, `App Shell & Header`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useProfilesStore` connect `Community 39` to `Room Page Layout`, `Connection Status UI`, `Player Row Component`, `Community 36`, `Icon System`, `App Shell & Header`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `useCardLabel()` connect `Pie Chart Visualization` to `Round History`, `Card Deck Configuration`, `Community 36`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `{ init }`, `emit`, `roomStore` to the rest of the system?**
  _479 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Room Page Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `Connection Status UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._
- **Should `Player Row Component` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
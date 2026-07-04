# Graph Report - .  (2026-07-04)

## Corpus Check
- 91 files · ~54,138 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 473 nodes · 725 edges · 29 communities (22 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Room State & Actions|Room State & Actions]]
- [[_COMMUNITY_Connection & Auth|Connection & Auth]]
- [[_COMMUNITY_Player UI & Avatars|Player UI & Avatars]]
- [[_COMMUNITY_Modal & Overlay System|Modal & Overlay System]]
- [[_COMMUNITY_Authentication Flow|Authentication Flow]]
- [[_COMMUNITY_Alignment Trends|Alignment Trends]]
- [[_COMMUNITY_Charts & Results|Charts & Results]]
- [[_COMMUNITY_App Icons & Feature Flags|App Icons & Feature Flags]]
- [[_COMMUNITY_History & Export|History & Export]]
- [[_COMMUNITY_App Shell & Header|App Shell & Header]]
- [[_COMMUNITY_Card Deck Configuration|Card Deck Configuration]]
- [[_COMMUNITY_Voting & Cards Area|Voting & Cards Area]]
- [[_COMMUNITY_Timer Controls|Timer Controls]]
- [[_COMMUNITY_App Bootstrap & i18n|App Bootstrap & i18n]]
- [[_COMMUNITY_Round Statistics|Round Statistics]]
- [[_COMMUNITY_Alignment Scoring|Alignment Scoring]]
- [[_COMMUNITY_Room ID & Slug Utils|Room ID & Slug Utils]]
- [[_COMMUNITY_Realtime Presence Plan|Realtime Presence Plan]]
- [[_COMMUNITY_ModalTooltip Primitives Plan|Modal/Tooltip Primitives Plan]]
- [[_COMMUNITY_Icon Assets|Icon Assets]]
- [[_COMMUNITY_Countdown Composable|Countdown Composable]]
- [[_COMMUNITY_Playwright E2E Tests|Playwright E2E Tests]]
- [[_COMMUNITY_Game Icons Collection|Game Icons Collection]]
- [[_COMMUNITY_Deck Preset Icons|Deck Preset Icons]]
- [[_COMMUNITY_Story Poker v1 Plan|Story Poker v1 Plan]]
- [[_COMMUNITY_CI Duplication Plan|CI Duplication Plan]]
- [[_COMMUNITY_VueVite Migration Plan|Vue/Vite Migration Plan]]
- [[_COMMUNITY_Poll Deck Feature|Poll Deck Feature]]

## God Nodes (most connected - your core abstractions)
1. `getSupabase()` - 10 edges
2. `useAuthStore` - 9 edges
3. `useCardLabel()` - 7 edges
4. `useProfilesStore` - 7 edges
5. `validateEmail()` - 7 edges
6. `validateRequiredPassword()` - 7 edges
7. `alignmentScore()` - 6 edges
8. `DeckPresetId` - 6 edges
9. `summarizeRound()` - 6 edges
10. `validate()` - 5 edges

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

## Communities (29 total, 7 thin omitted)

### Community 0 - "Room State & Actions"
Cohesion: 0.03
Nodes (50): alignmentBlocks, authStore, canReset, { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown }, currentPlayer, currentPlayerId, currentRoomName, currentSlug (+42 more)

### Community 1 - "Connection & Auth"
Cohesion: 0.06
Nodes (37): presence, { status }, getSupabase(), authStore, createRoom(), hasError, headerPlayerName, name (+29 more)

### Community 2 - "Player UI & Avatars"
Cohesion: 0.06
Nodes (38): { avatarDataUri }, cardLabel, emit, isOwn, menuOpen, menuRef, playerAvatar, profilesStore (+30 more)

### Community 3 - "Modal & Overlay System"
Cohesion: 0.06
Nodes (35): dialogEl, emit, onCancel(), onOverlayClick(), props, emit, props, visible (+27 more)

### Community 4 - "Authentication Flow"
Cohesion: 0.10
Nodes (31): confirm, email, emit, errors, loading, password, props, { signIn, signUp } (+23 more)

### Community 5 - "Alignment Trends"
Cohesion: 0.06
Nodes (26): allPoints, availableDecks, avgDev, avgQa, chartData, ChartPoint, currentDevScore, currentQaScore (+18 more)

### Community 6 - "Charts & Results"
Cohesion: 0.10
Nodes (22): cardLabel, COLORS, data, props, BUBBLE_COLORS, cardLabel, celebrate, celebrationParticles (+14 more)

### Community 7 - "App Icons & Feature Flags"
Cohesion: 0.13
Nodes (21): props, resolved, FeatureFlagItem, FeatureFlagKey, FeatureFlags, getFeatureFlags(), getFeatureFlagValue(), getFeaturesFlagsFromLS() (+13 more)

### Community 8 - "History & Export"
Cohesion: 0.09
Nodes (16): availableDecks, availableYears, cardLabel, dateFmt, deckFilter, emit, filteredSummaries, groups (+8 more)

### Community 9 - "App Shell & Header"
Cohesion: 0.10
Nodes (16): { init }, { avatarDataUri }, countdownBarWidth, emit, headerLabel, { isLight, toggle: toggleTheme }, { locale }, menuOpen (+8 more)

### Community 10 - "Card Deck Configuration"
Cohesion: 0.13
Nodes (16): applyPreset(), cardLabel, currentDeck, emit, isVoteQuestion, isVoting, presetId, props (+8 more)

### Community 11 - "Voting & Cards Area"
Cohesion: 0.14
Nodes (11): answerDrafts, answerInputs, canVote, cardLabel, countdownMode, countdownModeOptions, emit, props (+3 more)

### Community 12 - "Timer Controls"
Cohesion: 0.17
Nodes (10): elapsedMs, emit, isPaused, now, pivotMs, props, revealedAt, showControls (+2 more)

### Community 13 - "App Bootstrap & i18n"
Cohesion: 0.29
Nodes (6): i18n, parseSvg(), registerAppIcons(), initSupabase(), router, routes

### Community 14 - "Round Statistics"
Cohesion: 0.36
Nodes (7): hasNumericVote(), averageOf(), isNumericPreset(), isPollPreset(), RoundSummary, summarizeRound(), voteToNumber()

### Community 15 - "Alignment Scoring"
Cohesion: 0.40
Nodes (4): splitRound(), alignmentScore(), NON_ESTIMATE, isQaPlayer()

### Community 16 - "Room ID & Slug Utils"
Cohesion: 0.50
Nodes (3): submitRenameRoom(), isValidRoomSlug(), normalizeRoomSlug()

### Community 17 - "Realtime Presence Plan"
Cohesion: 0.40
Nodes (5): Pinia + Realtime Presence Implementation Plan, Realtime Differential Updates (applyChange instead of full refetch), Optimistic Vote Flow (pendingVotes + rollback), Presence Model (Supabase Presence, away timeout, reconnect banner), Spec A: Pinia + Realtime Presence

### Community 18 - "Modal/Tooltip Primitives Plan"
Cohesion: 0.40
Nodes (5): Remove shadcn-vue Implementation Plan, AppModal (native <dialog> primitive), AppTooltip (custom tooltip primitive), Remove shadcn-vue Design Spec, useClickOutside composable

### Community 19 - "Icon Assets"
Cohesion: 0.50
Nodes (4): Deciding Icon (clock/timer face in a circle, shown while a player is deciding on a vote), Leave Room Icon (arrow exiting a rectangle/door, leave-room action), Moderator Icon (gamepad/game-controller glyph marking the room moderator), Offline Icon (wifi-off / crossed-out wifi glyph for offline players)

### Community 21 - "Playwright E2E Tests"
Cohesion: 0.67
Nodes (3): Playwright Smoke E2E Tests Implementation Plan, data-testid Selector Contract, Spec — Playwright Smoke E2E Tests

## Knowledge Gaps
- **270 isolated node(s):** `{ init }`, `emit`, `roomStore`, `playersStore`, `{ visiblePlayers }` (+265 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Authentication Flow` to `Room State & Actions`, `Connection & Auth`, `Player UI & Avatars`, `App Icons & Feature Flags`, `App Shell & Header`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `useProfilesStore` connect `Player UI & Avatars` to `Room State & Actions`, `App Shell & Header`, `Connection & Auth`, `App Icons & Feature Flags`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `useCardLabel()` connect `Charts & Results` to `History & Export`, `Player UI & Avatars`, `Card Deck Configuration`, `Voting & Cards Area`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `{ init }`, `emit`, `roomStore` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Room State & Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `Connection & Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._
- **Should `Player UI & Avatars` be split into smaller, more focused modules?**
  _Cohesion score 0.057004830917874394 - nodes in this community are weakly interconnected._
# Graph Report - storypoker  (2026-07-07)

## Corpus Check
- 80 files · ~55,333 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 743 nodes · 992 edges · 47 communities (33 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a1a47c2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
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

## Communities (47 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (50): alignmentBlocks, authStore, canReset, { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown }, currentPlayer, currentPlayerId, currentRoomName, currentSlug (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (40): applyPreset(), cardLabel, currentDeck, emit, isVoteQuestion, isVoting, presetId, props (+32 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (15): { avatarDataUri }, cursor, emit, error, history, next(), previewUri, profilesStore (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (37): dialogEl, emit, onCancel(), onOverlayClick(), props, emit, props, tooltipId (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (32): confirm, email, emit, errors, loading, password, props, { signIn, signUp } (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (26): allPoints, availableDecks, avgDev, avgQa, chartData, ChartPoint, currentDevScore, currentQaScore (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): answerDrafts, answerInputs, canVote, cardLabel, countdownMode, countdownModeOptions, emit, props (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (21): props, resolved, FeatureFlagItem, FeatureFlagKey, FeatureFlags, getFeatureFlags(), getFeatureFlagValue(), getFeaturesFlagsFromLS() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (16): availableDecks, availableYears, cardLabel, dateFmt, deckFilter, emit, filteredSummaries, groups (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (13): { avatarDataUri }, countdownBarWidth, emit, headerLabel, { isLight, toggle: toggleTheme }, { locale }, menuOpen, menuRef (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (22): authStore, createRoom(), hasError, headerPlayerName, name, origin, playersStore, profilesStore (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (37): Execution Handoff, Phase 1 — Передумови (blockers), Phase 2 — DOM contract (data-testid атрибути), Phase 3 — gitignore + env scaffolding, Phase 4 — Playwright base setup, Phase 5 — Fixtures + POMs, Phase 6 — Тести, Phase 7 — CI integration (+29 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (10): elapsedMs, emit, isPaused, now, pivotMs, props, revealedAt, showControls (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (9): { init }, Theme, useTheme(), i18n, parseSvg(), registerAppIcons(), initSupabase(), router (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (7): hasNumericVote(), averageOf(), isNumericPreset(), isPollPreset(), RoundSummary, summarizeRound(), voteToNumber()

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (4): splitRound(), alignmentScore(), NON_ESTIMATE, isQaPlayer()

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (3): submitRenameRoom(), isValidRoomSlug(), normalizeRoomSlug()

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (32): Acceptance criteria, Action `castVote(playerId, card)`, Architecture, DB міграція, Goals, Initial load, Mobile-нюанс, Non-goals (+24 more)

### Community 19 - "Community 19"
Cohesion: 0.50
Nodes (4): Deciding Icon (clock/timer face in a circle, shown while a player is deciding on a vote), Leave Room Icon (arrow exiting a rectangle/door, leave-room action), Moderator Icon (gamepad/game-controller glyph marking the room moderator), Offline Icon (wifi-off / crossed-out wifi glyph for offline players)

### Community 29 - "Community 29"
Cohesion: 0.04
Nodes (46): Notes for the executing agent, Post-implementation, Pre-flight, SUPABASE_SECRET_KEY=...    # server-side only, БЕЗ VITE_ префіксу, Task 10: Docs update + bundle diff, Task 1: Scaffold Vite + remove Nuxt, Task 2: Explicit vue-router + App.vue, Task 3: vue-i18n bootstrap (+38 more)

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
Cohesion: 0.32
Nodes (6): AVATAR_STYLES, AvatarStyle, cache, useDylanAvatar(), useProfilesStore, UserProfile

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
- **482 isolated node(s):** `{ init }`, `emit`, `roomStore`, `playersStore`, `{ visiblePlayers }` (+477 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuthStore` connect `Community 4` to `Community 0`, `Community 2`, `Community 7`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `useProfilesStore` connect `Community 39` to `Community 0`, `Community 2`, `Community 36`, `Community 7`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `useCardLabel()` connect `Community 6` to `Community 8`, `Community 1`, `Community 36`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `{ init }`, `emit`, `roomStore` to the rest of the system?**
  _484 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03076923076923077 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05878084179970972 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
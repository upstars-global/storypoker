# Graph Report - storypoker  (2026-07-08)

## Corpus Check
- 122 files · ~72,505 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1041 nodes · 1382 edges · 75 communities (57 shown, 18 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e64356b`
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
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]

## God Nodes (most connected - your core abstractions)
1. `Story Poker v1 Implementation Plan` - 22 edges
2. `compilerOptions` - 20 edges
3. `CLAUDE.md` - 19 edges
4. `Pinia + Realtime Presence Implementation Plan` - 19 edges
5. `scripts` - 18 edges
6. `Story Poker — Roadmap` - 17 edges
7. `Design Gaps / Open Items` - 17 edges
8. `Vue + Vite Migration — Design` - 15 edges
9. `RoomPage` - 12 edges
10. `Playwright Smoke E2E Tests Implementation Plan` - 12 edges

## Surprising Connections (you probably didn't know these)
- `makeWrapper()` --calls--> `useClickOutside()`  [EXTRACTED]
  tests/unit/utils/useClickOutside.spec.ts → app/composables/useClickOutside.ts
- `Bank Icon (classical bank building with columns, custom app: collection)` --semantically_similar_to--> `Town Hall Icon (civic building with flag, custom app: collection)`  [INFERRED] [semantically similar]
  app/assets/icons/bank.svg → app/assets/icons/town-hall.svg
- `deckName()` --references--> `DECK_PRESETS`  [EXTRACTED]
  app/components/AlignmentTrendsModal.vue → app/utils/cardDecks.ts
- `applyPreset()` --calls--> `getDeck()`  [EXTRACTED]
  app/components/ConfigureCardDeckModal.vue → app/utils/cardDecks.ts
- `deckName()` --references--> `DECK_PRESETS`  [EXTRACTED]
  app/components/HistoryModal.vue → app/utils/cardDecks.ts

## Import Cycles
- 1-file cycle: `tests/support/test.ts -> tests/support/test.ts`
- 1-file cycle: `tests/support/setup/vitest.ts -> tests/support/setup/vitest.ts`

## Hyperedges (group relationships)
- **Pinia + Presence architecture mechanisms** — docs_superpowers_specs_2026_05_04_pinia_presence_design_optimistic_vote_flow, docs_superpowers_specs_2026_05_04_pinia_presence_design_presence_model, docs_superpowers_specs_2026_05_04_pinia_presence_design_differential_updates [EXTRACTED 1.00]
- **Custom primitives replacing shadcn-vue/reka-ui** — docs_superpowers_specs_2026_07_02_remove_shadcn_design_appmodal, docs_superpowers_specs_2026_07_02_remove_shadcn_design_apptooltip, docs_superpowers_specs_2026_07_02_remove_shadcn_design_useclickoutside [EXTRACTED 1.00]

## Communities (75 total, 18 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (50): alignmentBlocks, authStore, canReset, { countdownTimerCounter, countdownTimerTotal, countdownActive, countdownRunning, startCountdown }, currentPlayer, currentPlayerId, currentRoomName, currentSlug (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (47): presence, { status }, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (15): { avatarDataUri }, cursor, emit, error, history, next(), previewUri, profilesStore (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (15): getShield(), isLeadShield(), PLAYER_ROLES, QA_SHIELDS, ROLE_ORDER, ROLE_TAG_BY_SHIELD, roleTagForShields(), roleTagOrder() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (30): email, emit, errors, loading, password, props, { signIn, signUp }, submit() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): allPoints, availableDecks, avgDev, avgQa, chartData, ChartPoint, currentDevScore, currentQaScore (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (33): answerDrafts, answerInputs, canVote, cardLabel, countdownMode, countdownModeOptions, emit, props (+25 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (21): FeatureFlagItem, FeatureFlagKey, FeatureFlags, getFeatureFlags(), getFeatureFlagValue(), getFeaturesFlagsFromLS(), resetFeatureFlagValues(), setFeatureFlagValue() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (19): deckName(), availableDecks, availableYears, cardLabel, dateFmt, deckFilter, deckName(), emit (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (16): { avatarDataUri }, countdownBarWidth, emit, headerLabel, { isLight, toggle: toggleTheme }, langMenuOpen, langMenuRef, { locale } (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (14): __cfgDir, previewBlockedEnv, PUBLIC_ROUTES, AuthFixtures, test, ConsoleFixtures, test, RoomFixtures (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (37): Execution Handoff, Phase 1 — Передумови (blockers), Phase 2 — DOM contract (data-testid атрибути), Phase 3 — gitignore + env scaffolding, Phase 4 — Playwright base setup, Phase 5 — Fixtures + POMs, Phase 6 — Тести, Phase 7 — CI integration (+29 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (10): elapsedMs, emit, isPaused, now, pivotMs, props, revealedAt, showControls (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (10): { init }, Theme, useTheme(), ViewTransitionDocument, i18n, parseSvg(), registerAppIcons(), initSupabase() (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.27
Nodes (9): hasNumericVote(), RoundHistory, averageOf(), isNumericPreset(), isPollPreset(), RoundSummary, summarizeRound(), voteToNumber() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (5): splitRound(), alignmentScore(), NON_ESTIMATE, isQaPlayer(), FIB

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
Cohesion: 0.05
Nodes (35): Done, File Structure, Pinia + Realtime Presence Implementation Plan, Task 10: Refactor pages/[slug].vue to use stores, Task 11: Refactor pages/index.vue, Task 12: Update AppHeader and AuthModal to use authStore, Task 13: Delete old composables, run full test + dev smoke, Task 14: Update CLAUDE.md (+27 more)

### Community 34 - "Community 34"
Cohesion: 0.11
Nodes (18): AppModal.vue, AppTooltip.vue, Dialog → AppModal (8 файлів), DropdownMenu → inline v-if (1 файл), Select → native (1 файл), Tooltip → AppTooltip (5 файлів), TooltipProvider → видалити (App.vue), useClickOutside.ts (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.07
Nodes (28): 10.1 Що реалізовано, 10.2 Виявлені проблеми, 10.3 Рекомендовані виправлення, 10. Аудит поточної реалізації (assets/css/main.css), 1. Стек і архітектура UI, 2.1 Кольорова палітра, 2.2 Типографіка, 2.3 Тіні (Material elevation stack) (+20 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (11): { avatarDataUri }, cardLabel, emit, isOwn, menuOpen, menuRef, playerAvatar, profilesStore (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (11): Global Constraints, Remove shadcn-vue Implementation Plan, Task 1: New primitives — AppModal, AppTooltip, useClickOutside + CSS, Task 2: Migrate Dialog → AppModal (8 files), Task 3: Migrate Tooltip → AppTooltip (5 files), Task 4: Migrate Dropdown → inline v-if (AppHeader.vue + PlayerRow.vue), Task 5: Remove TooltipProvider + migrate Select → native, Task 6: CSS cleanup in main.css (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): Варіант A — Supabase SQL Editor (найшвидше), Варіант B — Supabase CLI (якщо проєкт залінковано), Варіант C — пряме підключення (якщо є connection string з паролем БД), Готово, коли, Димова перевірка фічі в застосунку, Задача для Claude Code: застосувати міграцію 009 (poll_question), Контекст, Наслідки відсутньої колонки (поточні баги) (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.22
Nodes (9): AVATAR_STYLES, AvatarStyle, bottts, cache, dylan, miniavs, useDylanAvatar(), useProfilesStore (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.25
Nodes (7): CI Zero-Duplication Design, Job: `deploy`, Job: `test`, Notes, Problem, Removed, Solution

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): emit, onlineCount, props, totalCount

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (4): CI Zero-Duplication Implementation Plan, Task 1: Rewrite `.github/workflows/ci.yml`, Task 2: Delete `.github/workflows/deploy-netlify.yml`, Task 3: Commit

### Community 48 - "Community 48"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution (+15 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (19): Card Decks, CLAUDE.md, Code Style, Common Commands, Communication, Database, Environment Setup, graphify (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (15): applyPreset(), cardLabel, currentDeck, emit, isVoteQuestion, isVoting, presetId, props (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (20): devDependencies, dotenv, eslint, eslint-plugin-vue, happy-dom, @iconify-json/ic, @playwright/test, tailwindcss (+12 more)

### Community 52 - "Community 52"
Cohesion: 0.11
Nodes (18): scripts, build, deploy:prod, deploy:stage, dev, lint, preview, test (+10 more)

### Community 53 - "Community 53"
Cohesion: 0.12
Nodes (17): Design Gaps / Open Items, G10. Iconify migration ✅, G11. AppHeader on-appbar text tokens ✅, G12. Hex hardcodes в SFC і CSS обходять токени ⏳, G13. Inline `style=` для повторюваних non-color значень ⏳, G14. CSS variables без Tailwind-мапінгу ⏳, G15. Повторювані arbitrary values без extend-токенів ⏳, G16. `mui-btn-text` має дивний `min-width` override (nitpick) ⏳ (+9 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (13): Cross-iter Open Questions, E2E Test Coverage — beyond smoke ⏳ planned, Iter 1 — Foundation + Realtime ✅ DONE, Iter 2 — Auth & Account ⚠️ IN PROGRESS, Iter 3 — Insights & History ⏳ planned, Iter 4 — Estimation Scale ⏳ planned, Player shields ⚠️ DEPLOY-BLOCKED НА МІГРАЦІЇ, Reka UI adoption ✅ DONE (+5 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (11): E2E Tech Debt ⏳, P10. Виділений безкоштовний Supabase test-проєкт ⏳, P1. Mixed signup entry points ⏳, P2. Webkit `testIgnore` без коментаря ⏳, P3. Порожні fixture-папки ⏳, P4. Зайвий `consoleErrors: _consoleErrors` у підписах ⏳, P5. `waitForURL` лямбда замість рядка (nitpick) ✅, P6. `reuseExistingServer` + різні build modes ⏳ (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.20
Nodes (10): dependencies, @dicebear/core, @dicebear/styles, @iconify/vue, pinia, @supabase/supabase-js, v-wave, vue (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.20
Nodes (9): CI/CD (GitHub Actions + Netlify), Install, Run, Run Claude Code In Bypass Mode, Skills, Story Poker, Tests (Vitest), Used (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.22
Nodes (9): 1. P0 — закрити публічний запис у БД, 2. P0 — зробити раунд атомарним, 3. P1 — перестати ігнорувати помилки, 4. P1 — зробити тести реальним захистом, 5. P1 — розділити [slug].vue, 6. P2 — зменшити initial bundle, 7. P2 — зробити Realtime lifecycle детермінованим, 8. P2 — синхронізувати документацію та tooling (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (6): engines, node, npm, name, private, type

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): Bundle metrics, Post-migration tech debt ⏳ planned, Tailwind v4, vue-i18n precompile

### Community 64 - "Community 64"
Cohesion: 0.32
Nodes (7): emit, hasError, name, ROLE_TAGS, submit(), tag, shieldForRoleTag()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (7): emit, nameInput, nameValue, props, ROLE_TAGS, save(), tag

### Community 72 - "Community 72"
Cohesion: 0.38
Nodes (5): dialogEl, emit, onCancel(), onOverlayClick(), props

### Community 73 - "Community 73"
Cohesion: 0.29
Nodes (4): props, tooltipId, visible, wrapperEl

### Community 74 - "Community 74"
Cohesion: 0.40
Nodes (3): props, resolved, emit

## Knowledge Gaps
- **668 isolated node(s):** `$schema`, `plugin`, `@opencode-ai/plugin`, `{ init }`, `emit` (+663 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 51` to `Community 60`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `vitest` connect `Community 51` to `Community 1`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `Story Poker — Roadmap` connect `Community 54` to `Community 33`, `Community 53`, `Community 55`, `Community 59`, `Community 62`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `$schema`, `plugin`, `@opencode-ai/plugin` to the rest of the system?**
  _670 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03125 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05413469735720375 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12418300653594772 - nodes in this community are weakly interconnected._
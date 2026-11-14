# Story Poker Roadmap

1. Last reviewed: 2026-07-17

Each active or future initiative has its own file in [`initiatives/`](initiatives/).
This index is the single current entry point; detailed design and implementation
steps remain in [`superpowers/specs/`](superpowers/specs/) and
[`superpowers/plans/`](superpowers/plans/). The design specification and audit
are in [`DESIGN.md`](../DESIGN.md).

Statuses: `Planned` - a defined outcome or completed spec/plan exists; `Partial` -
part of the outcome is already in the code; `Idea` - separate discovery/design is
needed; `Implemented` - the outcome has been verified in the code; `Descoped` -
the premise no longer matches the accepted decision.

The `Initiated` field is the date when the item was first formulated (in the
root `ROADMAP.md` before migration or in the audit); `Last reviewed` is the date
of the last check of the actual state.

## P0

1. [RLS and mutation authorization](initiatives/rls-security.md) - narrow write policies and add RPCs for moderator actions. `Planned`
2. [Round atomicity](initiatives/round-atomicity.md) - transactional RPCs for reveal / new round / create room. `Planned`

## P1

1. [Error handling](initiatives/error-handling.md) - typed Supabase result, toast with retry, rollback. `Planned`
2. [`[slug].vue` decomposition](initiatives/room-page-decomposition.md) - extract realtime, session and actions into composables. `Planned`
3. [Remove the transitional service worker reload](initiatives/sw-transition-cleanup.md) - `skipWaiting` and `sw-reload-clients.js` in the next release. `Planned`
4. [Auth & Account](initiatives/auth-account.md) - change email / display name, server-side gating of critical actions. `Partial`
5. [Estimation Scale](initiatives/estimation-scale.md) - deck picker when creating a room, saved custom scales. `Partial`

## P2

1. [Realtime lifecycle](initiatives/realtime-lifecycle.md) - zombie channels, unfiltered `user_profiles` channel, inaccurate presence state (false offline / slow leave). `Planned`
2. [`resolveRoom` filter injection](initiatives/resolve-room-filter.md) - validate input before `.or()`. `Planned`
3. [Dedicated test Supabase project](initiatives/e2e-test-supabase-project.md) - the main blocker for E2E. `Planned`
4. [E2E coverage beyond smoke](initiatives/e2e-coverage.md) - multi-user, presence, deck, timer, history. `Planned`
5. [Bundle optimization](initiatives/bundle-optimization.md) - lazy routes and DiceBear split. `Planned`
6. [Production sourcemaps](initiatives/production-sourcemaps.md) - remove `.map` from the production build. `Planned`
7. [Lint strictness and Supabase types](initiatives/lint-and-supabase-types.md) - `--max-warnings 0`, generated types. `Planned`

## P3

1. [vue-i18n precompile](initiatives/vue-i18n-precompile.md) - `@intlify/unplugin-vue-i18n`. `Planned`
2. [Design system - remaining tokens](initiatives/design-system-tokens.md) - accent palette, repeated arbitrary values. `Partial`

## Future ideas

1. [Mobile / tablet layout pass](initiatives/mobile-layout.md).
2. [Visual direction (MD2 → MD3 / shadcn)](initiatives/visual-direction.md).

## Completed

1. [Completed initiatives](completed.md).

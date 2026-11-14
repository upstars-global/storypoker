# Decompose `[slug].vue`

1. Status: Planned
2. Priority: P1
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-07-17

## Why

`app/pages/[slug].vue` has ~600 lines: route resolution, session restore, five
realtime channels, presence, snapshots, countdown, profiles, and all UI actions in
one component.

## Expected outcome

The room page is a thin layout over composables with separate responsibilities;
changes to `route.params.slug` are handled correctly.

## Scope

1. Extract `useRoomSession`, `useRoomRealtime`, `useRoundSnapshot`,
   `useRoomActions`, and `useCountdownBroadcast`.
2. React to changes in `route.params.slug` without a full reload.

## Completion criteria

1. `[slug].vue` holds no direct subscriptions or business logic.
2. Navigation between rooms through the router reconnects channels correctly.

## Next step

Start with `useRoomRealtime`, which is the most isolated.

# Error handling

1. Status: Planned
2. Priority: P1
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-07-17

## Why

Empty `catch {}` blocks in `app/pages/[slug].vue` (×3) and store methods that do
not check `{ error }` silently swallow rename, shields, and vote failures. The
user sees a successful UI when the write has failed.

## Expected outcome

Every mutation has an explicit result: the error is visible to the user, the
state is rolled back, and the action can be retried.

## Scope

1. Typed helper for Supabase results.
2. Loading / error state in stores.
3. Localized toast with retry.
4. Rollback for all optimistic updates, including vote.

## Completion criteria

1. There are no empty `catch {}` blocks in `[slug].vue`.
2. A rename / shields / vote failure shows a message and restores the previous state.

## Next step

Introduce a helper for Supabase results and route `playersStore` through it.

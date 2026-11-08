# Auth & Account

1. Status: Partial
2. Priority: P1
3. Initiated: 2026-05 (Iter 2)
4. Last reviewed: 2026-07-17

## Why

Basic authentication is in place, but the account remains incomplete: users cannot change
their email or display name, and critical actions are gated only on the client.

## Expected outcome

A complete account with management of personal data and server-side verification of
moderator permissions.

## Scope

Done:

1. Sign Up with email confirmation, Sign In + persistent session, password reset.
2. Linking a game to an account (`playersStore.linkUser` → `players.user_id`).
3. Profiles: `user_profiles` (`avatar_style` / `avatar_seed`) + `UserSettingsModal`.

Remaining:

1. OAuth provider (Google / GitHub) - optional.
2. Change the account email and display name (currently only the password can be changed).
3. Restrict critical actions (Reveal, Configure Card Deck) to authenticated moderators.

## Dependencies

1. Server-side gating depends on [RLS and mutation authorization](rls-security.md).

## Completion criteria

1. A user can change their email and display name in the UI.
2. Reveal and Configure Card Deck cannot be performed without the appropriate permissions
   on the database side.

## Next step

Change email and display name; this is not blocked by the RLS work.

# Realtime lifecycle

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-08-02

## Why

`openChannel()` in the presence store can be called again without closing the
previous channel, creating zombie channels. The `user_profiles` channel is
subscribed without a filter, so an update to any profile in the database reaches
all clients.

## Observations

2026-08-02, manual smoke test of custom avatars (headless Playwright, two contexts
in one room): Presence showed an active user as offline several times (a player
with an open tab had an offline icon and a grayscale avatar for the observer),
and in one run, leave after closing the browser took >45 s: the observer still
saw the player online for a long time. Reproducibility is inconsistent: in an
adjacent run, leave arrived in ~1 s. This is probably related to the channel
lifecycle above; check the accuracy of presence state separately when working on
the initiative (headless is a convenient way to reproduce it).

## Expected outcome

Each room maintains exactly one set of channels, and traffic is limited to its
participants.

## Scope

1. Single-flight reconnect + generation guard.
2. `removeChannel()` on cleanup.
3. A filter for the `user_profiles` channel or removal of that channel.

## Completion criteria

1. Repeated `openChannel()` calls leave no channels open.
2. An update to another user's profile does not trigger realtime events in
   unrelated rooms.

## Next step

Check the number of active channels after a series of reconnects in devtools.

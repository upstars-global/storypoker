# `resolveRoom` filter injection

1. Status: Planned
2. Priority: P2
3. Initiated: 2026-06-24 (audit)
4. Last reviewed: 2026-07-17

## Why

`app/stores/room.ts:179` builds `.or()` from the template string
`id.eq.${input},slug.eq.${input}` with raw `input`. Special characters (`,` `.`
`)`) break the PostgREST filter.

## Expected outcome

Resolving a room by id or slug does not depend on the content of the URL string.

## Scope

1. Validate `input` with `isValidRoomSlug` or check for an 8-character id.
2. Alternatively, use two separate `.eq()` queries instead of `.or()`.

## Completion criteria

1. An arbitrary string in the URL returns `not found` instead of a broken query.

## Next step

Add a unit test for `resolveRoom` with special characters in the input string.

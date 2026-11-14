# Estimation Scale

1. Status: Partial
2. Priority: P1
3. Initiated: 2026-05 (Iter 4)
4. Last reviewed: 2026-07-17

## Why

The deck can be changed inside a room, but not when the room is created, and custom
sets do not outlive the room.

## Expected outcome

Users can select and reuse an estimation scale throughout the journey, from room
creation to a set saved on their account.

## Scope

Done:

1. Change the scale in an active room without losing votes - `roomStore.setDeckPreset()`
   + `ConfigureCardDeckModal`.
2. Poll-question preset (`vote_question`, custom options; migration `009`).

Remaining:

1. Picker when creating a room (Scrum / Fibonacci / T-shirt / Hours / Boolean / Custom).
2. Save custom scales to the user's account.
3. Move Configure Card Deck from the modal to a separate tab or room section.

## Completion criteria

1. A room is created with the selected preset from the start.
2. A custom set can be saved and reused in another room.

## Next step

Add the picker when creating a room, as it has the fewest database schema dependencies.

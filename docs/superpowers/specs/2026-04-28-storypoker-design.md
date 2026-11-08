# Story Poker - Design Spec v1

## Overview

Story Poker is a web application for planning poker (estimating User Stories), with real-time synchronization between participants. It uses Jamstack without a custom backend, with Supabase as the database and real-time transport.

## Tech Stack

1. **Framework:** Nuxt 4 (Vue 3, Composition API `<script setup>`)
2. **Styling:** Tailwind CSS 4
3. **Realtime/DB:** Supabase (Postgres + Realtime subscriptions + Presence)
4. **Auth:** Supabase Auth (email + password)
5. **Avatars:** DiceBear Dylan (`@dicebear/core`, `@dicebear/collection`)
6. **UI:** @nuxt/icon, v-wave, Google Fonts Montserrat 400/600

## Data Model

### `rooms`
```sql
id          text PRIMARY KEY   -- 8-char random ID, e.g. "Ob4W3XMI"
created_at  timestamptz DEFAULT now()
```

### `room_state`
```sql
room_id      text PRIMARY KEY REFERENCES rooms(id)
phase        text DEFAULT 'voting'   -- 'voting' | 'revealed'
active_cards text[]  -- array of active cards, e.g. ['0.5','1','2','3','5','8','13','21','?','Pass','☕']
round_started_at timestamptz DEFAULT now()
```

### `players`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
room_id      text REFERENCES rooms(id)
name         text NOT NULL
is_moderator boolean DEFAULT false
vote         text NULL    -- null = has not voted
is_online    boolean DEFAULT true
user_id      uuid NULL REFERENCES auth.users(id)  -- NULL for anonymous users
created_at   timestamptz DEFAULT now()
```

Realtime subscriptions to the `players` and `room_state` tables make all changes immediately visible to everyone in the room.

## localStorage

Key: `storypoker_session_<roomId>`
Value: `{ playerId: string, playerName: string }`

On entry to `/room/[slug]`, the application checks localStorage. If a `playerId` is saved for this room, it connects immediately without showing the name form.

## Pages

### `pages/index.vue` - Home

1. Heading: "Create a planning poker room"
2. Name field with placeholder "Please enter your name"
3. "Create Room" button
4. Validation: if the field is empty, the input has a red border and the room is not created
5. On success: generates an 8-char ID → INSERT into `rooms` + `room_state` + `players` → saves to localStorage → redirects to `/room/[id]`

### `pages/room/[slug].vue` - Room

**On load:**
1. Checks localStorage for this `roomId`
2. If a `playerId` is saved, connects immediately (updates `is_online = true`)
3. Otherwise, shows the join overlay

**Join overlay:**
1. Name field (minimum 1 character)
2. "Join Room" button
3. INSERTs a new player and saves to localStorage

**Layout:**
```
[Header]
[Players panel | Cards / Results area]
[Moderator Insights panel]  ← below Players, moderators only
```

## Components

### Header
1. Left: "Story Point Poker" (logo/name)
2. Right: number of online players + user icon
   1. If not authenticated: dropdown → Sign In / Sign Up / Configure Card Deck (if moderator)
   2. If authenticated: Dylan avatar + name → dropdown → Configure Card Deck (if moderator) / Sign Out

### Players Panel

List of all players in the room:
1. **Online player:** Dylan avatar (colored, seed = name), name, moderator icon (gamepad), status
2. **Offline player:** gray avatar, gray name, "no wifi" icon

Statuses in the right column:
1. `voting` phase: empty = has not voted, ✓ = voted (value hidden)
2. `revealed` phase: shows the numeric vote value

**`⋮` menu (own row - all players):**
1. Rename
2. Become a moderator / Stop being a moderator (toggle)
3. Leave the room

**`⋮` menu (another player's row - authenticated moderator only):**
1. Kick Player → removes the player from the room (DELETE from `players`)

### Cards Area (`voting` phase)

Card grid: `0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, ☕`
(only active cards from `room_state.active_cards` are displayed)

1. The selected card is highlighted in blue
2. Click → UPDATE `players.vote`
3. "Reveal Estimates" button (moderator only) → UPDATE `room_state.phase = 'revealed'`

### Results Area (`revealed` phase)

1. Pie chart - sectors are proportional to the number of votes for each value, with different colors
2. Numeric vote values are visible in the player list
3. "Start New Estimation Round" button (moderator only) → resets all votes to NULL, phase → 'voting', updates `round_started_at`

### Moderator Insights Panel

Visible only to players with `is_moderator = true`.
Displays: "This round started N minutes ago" (relative time from `round_started_at`).

### Configure Card Deck Modal

Available only to moderators through the header menu.

1. Dropdown: only "Fibonacci scale" (first iteration)
2. Full pool of cards in the scale: `0, 0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, ☕`
3. Checkbox next to each card to enable/disable it
4. Active by default: `0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, ☕`
5. "Save Card Deck" button → UPDATE `room_state.active_cards` → synchronizes to everyone

### Sign In / Sign Up Modal

1. Fields: email + password
2. Sign In / Sign Up button
3. Supabase Auth (`supabase.auth.signInWithPassword` / `signUp`)
4. After sign-in: `players.user_id` is updated for the current player

## Roles & Permissions

| Action | Anonymous | Anonymous moderator | Authenticated | Authenticated moderator |
|---|:---:|:---:|:---:|:---:|
| Vote | ✓ | ✓ | ✓ | ✓ |
| Rename self | ✓ | ✓ | ✓ | ✓ |
| Become a moderator | ✓ | - | ✓ | - |
| Reveal Estimates | - | ✓ | - | ✓ |
| Start New Round | - | ✓ | - | ✓ |
| Configure Card Deck | - | ✓ | - | ✓ |
| Kick Player | - | - | - | ✓ |

## Realtime Flow

1. A player joins → subscribes to `players` WHERE `room_id = X` and `room_state` WHERE `room_id = X`
2. Any change (vote, phase, new player) → Supabase sends an UPDATE to all subscribers
3. On browser close → `beforeunload` → UPDATE `is_online = false`
4. On return → UPDATE `is_online = true`, restores the old `playerId` from localStorage

## Out of Scope (v2)

1. Re-estimate button
2. Analytics (Team Alignment Trends)
3. OAuth (Microsoft, Google)
4. Multiple card scales

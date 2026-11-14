# Task for Claude Code: apply migration 009 (poll_question)

> Handoff for a teammate. Give this file to your Claude Code session (or perform the steps manually).
> This historical handoff specified Ukrainian for communication. Follow the current user instructions for the response language.

## Context

A new feature was added: the **Voting** deck (Planning Poker, `storypoker` repository).
The code is already in `main`, but **does not work** because the Supabase database lacks the `room_state.poll_question` column.

Migrations are applied **manually** (see `CLAUDE.md` → Database). The migration file is already in the repository:
`supabase/migrations/009_room_state_poll_question.sql`.

### Effects of the missing column (current bugs)

1. `room.startNewRound()` writes `poll_question: null` → the database rejects the request → the phase does not reset from `revealed` to `voting` → **the “Start New Estimation Round” button does not work for any deck** (a regression affecting all decks, including Voting).
2. Without returning to the `voting` phase, **the question input does not appear**.
3. `room.setDeckPreset()` and `room.setPollQuestion()` also fail.

## Why the previous agent could not do this

The project only has PostgREST keys (`VITE_SUPABASE_KEY`, `SUPABASE_SECRET_KEY=sb_secret_…`),
which **do not permit DDL** (`ALTER TABLE`). Supabase CLI, `psql`, a Postgres connection string,
and an RPC for executing SQL are unavailable. A person with dashboard / database access must add the column.

## What to do

Apply migration `009` to the **prod** Supabase project (and to the test project in `.env/.env.test` if running E2E).

### Option A - Supabase SQL Editor (fastest)

Open **Supabase Dashboard → SQL Editor** for the target project and run:

```sql
alter table room_state
  add column if not exists poll_question text;
```

### Option B - Supabase CLI (if the project is linked)

```bash
npx supabase link --project-ref <PROJECT_REF>   # once
npx supabase db push
```

### Option C - direct connection (if you have a connection string with the database password)

```bash
psql "<POSTGRES_CONNECTION_STRING>" -f supabase/migrations/009_room_state_poll_question.sql
```

## Verification (required)

The column must exist and be accessible for select using the client key.
Create a temporary script, run it, and delete it:

```bash
cat > ./check_poll.mjs <<'EOF'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(
  readFileSync('.env/.env', 'utf8').split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_KEY)
const { error } = await sb.from('room_state').select('poll_question').limit(1)
console.log(error ? 'MISSING: ' + error.message : 'OK: poll_question exists')
EOF
node ./check_poll.mjs; rm -f ./check_poll.mjs
```

Expected output: `OK: poll_question exists`.

## Feature smoke test in the app

1. Run `npm run dev` and enter a room as a moderator.
2. “Configure Card Deck” → select **“Vote - Y/N”**. For / Against are fixed (disabled checkboxes); select the third card (☕ / 🍺 / 🚬). Save.
3. The question field appears above the cards → enter a question → **“Start voting”**. The cards are disabled until then.
4. Vote (≥2 players), then reveal. The question text appears above the charts in the results.
5. **“Start New Estimation Round”** → the phase resets, the question is cleared, and the cards are disabled again until a new question is entered.

## Done when

1. The verification script prints `OK: poll_question exists`.
2. The “Start New Estimation Round” button works.
3. The full scenario in “Feature smoke test in the app” passes with the “Voting” deck.

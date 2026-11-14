# Supabase - schema, migrations, RLS

Database schema and access policies. Stores reading these tables are in `app/stores/AGENTS.md`;
the read-only API over them is in `netlify/AGENTS.md`.

## Database
Migrations in `supabase/migrations/` are sequentially numbered and applied manually through the Supabase SQL
Editor or Management API (`POST /v1/projects/<ref>/database/query` with a personal `sbp_` token from
`.env/.env.local`). The local e2e stack is `pnpm run supabase:local` (`scripts/supabase-local.sh`): the CLI fails from the root
because `.env` is a directory, so the script runs it from `~/.cache/storypoker-supabase` through a symlink; GRANTs for
`anon`/`authenticated` are only in `seed.sql` (locally), absent from migrations. The database has no migration history:
before applying, check the state via `information_schema`, apply multiple files in one transaction, and after DDL run
`notify pgrst, 'reload schema';`.
To check Postgres behavior itself (racing `UPDATE ... WHERE` statements, locking, isolation) without Docker, use a temporary
Homebrew cluster: `initdb -D <tmp>/data -A trust -U postgres`,
`pg_ctl -D <tmp>/data -o "-p <port> -k <tmp> -c listen_addresses=''" -w start`,
sessions with `psql -h <tmp> -p <port> -U postgres -d postgres`, and finally `pg_ctl -D <tmp>/data -w stop`;
remove the directory only afterward. The port is not exposed externally; PostgREST and RLS cannot be checked this way.
Check RLS with a live probe that leaves nothing behind: put the migration and checks in one `do` block ending in
`raise exception` with the results (Management API rolls everything back and returns them in the error text). Set role and user with
`set_config('role', 'authenticated', true)` and `set_config('request.jwt.claims', ...)` with `sub`, then query as
owner and as another user (claims persist until the end of the block: before the other user's query, use a new `set_config` with their
`sub`). Storage always blocks direct `delete from storage.objects` ("Direct deletion from storage tables is not
allowed"), so the delete policy can only be checked via the Storage API. In storage policies with a subquery against a
table with a `name` column (`rooms`), write `objects.name`: unqualified `name` is taken from the subquery table
(this broke `016`, fixed in `019`).
Tables:
1. `rooms (id text PK, slug text unique, name text, background_url, background_updated_at, background_opacity, background_owner_id, created_at)`
2. `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms, poll_question, result_cohorts[], alarm_minutes, alarm_muted)`
  (`result_cohorts` from `017`), check constraint: 9 roles `DEV/BE/FE/SRE/QA/GQA/AQA/PO/SM` (`021_room_state_result_chips`).
  The field stores selected result chips: saving the deck writes it via `setResultCohorts()`, and
  `groupResultVotes()` uses it to filter circles and counted votes (contract in `app/utils/AGENTS.md`). Data is not migrated.
  Timer alarm from `018` (`alarm_minutes` 3-20, `null` = 5 min)
3. `players (id uuid PK, room_id, name, is_moderator, vote, user_id, shields text[], created_at, left_at)`
4. `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, deck_preset, created_at)`
5. `user_profiles (user_id uuid PK, avatar_style, avatar_seed, avatar_url, updated_at)`

RLS currently allows public read/write with the anon key; logic is in the client. Exception: `user_profiles` select remains public, while
insert/update from `014` are only `to authenticated` for the user's own row (`auth.uid() = user_id`); from `015` `avatar_url`
stores only a relative path and is limited by a check constraint to exactly `user_id || '/avatar.webp'` (an absolute URL
could point to any `*.supabase.co` project), and `avatar_style` is limited by a check constraint to three DiceBear styles.
`leave` and `kick` are soft deletes via `left_at`; the UI uses `left_at is null`.

Custom avatars: Storage bucket `avatars` (public read; select/insert/update/delete `to authenticated`;
the SELECT policy is required because storage-api uses `returning` for upsert/delete). Migration `012` adds it and sets
server-side bucket limits: `file_size_limit = 5242880` (5 MB, matching `AVATAR_MAX_FILE_BYTES`) and `allowed_mime_types =
image/png,image/jpeg,image/webp` (matching `AVATAR_ACCEPT`); `013` narrows all four policies from "own folder" to the single
allowed object `name = auth.uid() || '/avatar.webp'` to prevent the bucket from becoming free hosting. Fixed path
`<user_id>/avatar.webp` (upload with `upsert: true`, no orphans). Removing an avatar writes the profile (`avatar_url: null`) first,
and deletes the file best-effort - an orphaned object will be overwritten by the next upload, whereas the reverse order
would leave all clients with a broken `avatar_url`. The client crops/compresses to 256×256 WebP (`app/utils/avatarImage.ts`),
a nonempty `avatar_url` (relative path `<user_id>/avatar.webp`) enables custom rendering (`avatarSrcFor()` in
`useDylanAvatar.ts`; `avatarDisplayUrl()` builds the public URL via `getPublicUrl()`, cache invalidation `?v=<updated_at>`,
offline grayscale via CSS filter), and `avatar_style` always remains the last DiceBear style - fallback and image removal
return to it. Spec: `docs/specs/2026-08-02-custom-avatar-upload-design.md`.

Room background (`016`, policies fixed in `019`, owner removed in `020`):
bucket `room-backgrounds` (public read, 2 MB, `image/webp` only), four policies `to authenticated` for the single
object `<room_id>/background.webp` of an existing room; any logged-in user can write, update and delete
(moderator status is only a client-side gate: anyone can write `players.is_moderator` and `user_id`). The
`rooms_guard_background` trigger blocks anonymous changes to `background_url`, `background_opacity`, `background_updated_at` and
`background_owner_id`. The client no longer reads or writes `background_owner_id`; the column remains because old clients
still make a claim - it can be dropped in a separate migration. `rooms.background_url` is limited by a
check constraint to `id || '/background.webp'`, `background_updated_at` is for cache invalidation `?v=`, `background_opacity` (0.1-1, `null` = 0.65) is background opacity. The modal supports cropping
(drag/zoom in a 16:9 frame), the client crops the frame to WebP ≤ 1920×1080 (`app/utils/backgroundImage.ts`, encoding shared with avatars - `imageEncoding.ts`); the UI is only for an
authorized moderator. Removing the background, like an avatar, first writes `background_url: null`; file deletion is best-effort.
`backgroundDisplayUrl()` (`stores/room.ts`) accepts only the path matching the regex because the value goes into CSS `url()` and anyone
can insert `rooms.id`.

## Round history snapshot

`reveal()` updates `room_state.phase='revealed'` with the condition `phase <> 'revealed'` and writes `round_history` with a snapshot
`{player_id,name,vote}[]` only when that update changed a row and `votes.length >= 2`; for 0 rows it rereads
`room_state`. `?` and `☕` count as votes. The snapshot contains `name` so history remains readable after
rename/leave. It also stores `active_cards`/`deck_preset` of the revealed round. Alignment formulas are in
`app/utils/AGENTS.md`. There is no manual CSV export (removed) - `netlify/functions/room-json.mts` covers that need.

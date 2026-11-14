# Netlify functions

Read-only API over Supabase. The schema of the tables it reads is in `supabase/AGENTS.md`;
the formulas duplicated here are in `app/utils/AGENTS.md`.

## External integrations

`netlify/functions/room-json.mts` is a read-only Netlify Function (`path: '/api/*'`, the default `netlify/functions` without
an explicit `[functions]` in `netlify.toml`):
- `GET /api/<roomId|slug>.json` → `{room, rounds}` for one room; round fields:
  `id,date,week,deck,average,devAlignment,qaAlignment,voters,votes,alignments,roleVotes`
- `GET /api/teams.json` → `{teams:[{room,rounds:[...]}]}` for **all** rooms in the database

**Legacy agilecharts contract:** `average`, `voters`, `devAlignment`, `qaAlignment`,
`votes[{name,vote,cohort}]` and the set of rounds are unchanged. `votes` is a per-player snapshot with
`cohort: "DEV"|"QA"`; this is the intentionally retained DEV/QA split (`trendCohorts`): DEV = DEV/BE/FE/SRE, QA =
QA/GQA/AQA. PO/SM/custom roles are excluded when estimator votes exist; otherwise all votes go to DEV. Those without a role
and those who left are DEV. `voters` and `average` use the same pool. The agilecharts drill-down uses these fields;
migrating the consumer to the new fields is separate work. Names expose no more than the data visible to room participants,
and the endpoint remains token-gated.

**New fields:** `alignments` is a sparse object with keys DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM only
for roles that voted; values are integers from 0-100 or `null` if fewer than two votes use deck cards other than
`?`/`☕`. `roleVotes` contains all votes with a standard cohort as `{name,vote,role}` in snapshot order,
including PO/SM; custom roles are excluded. The raw current role comes from visible players' shields;
players without a role and absent players are DEV. Persisted `result_cohorts` and automatic custom circles for the current
round do not affect the API.

Protected by a shared secret: `Authorization: Bearer <STORYPOKER_API_TOKEN>` (env var, server-side only, NO `VITE_` prefix
- set in Netlify site env, not in `/.env/`). A missing or incorrect token returns `401`; if
`STORYPOKER_API_TOKEN` is unset on the server, it returns `500` (`server misconfigured`). The same Bearer pattern as
`fe-weekly-report.post.ts` in agilecharts - agilecharts itself (`server/utils/storypokerFiles.ts`) adds this header to
every request.

The deck in `rounds` is determined automatically (`isNumericPreset`:
`scrum`/`fibonacci`/`hours`/`goal_clarity` + legacy `deck_preset=null`); poll decks
(`voting`/`vote_question`) and non-numeric decks (`tshirt`/`boolean`) are excluded. The remaining rounds must have a non-null
`average` and at least one non-null legacy `devAlignment`/`qaAlignment` score; adding roles does not change this filter.
Reads `rooms`+`round_history`+`players` directly through `@supabase/supabase-js` (the same
`VITE_SUPABASE_*`). `alignmentScore`/`averageOf`, deck fallback and raw role determination are intentionally
duplicated from `app/utils/alignment.ts`/`roundStats.ts`/`resultCohorts.ts`: the Netlify bundler does not
resolve the Vite alias `~/*`. The legacy split for agilecharts remains local to the function; manually synchronize changes
to shared formulas. The consumer is `agilecharts` (neighboring repo, Nuxt), the
"Estimation Trends" tab (`app/components/team/TeamConsistencyTrends.vue`).

The function ships with the Netlify production build from `main`; no separate deployment is needed. Verify with
`netlify api listSiteDeploys` (`commit_ref`, `available_functions`) and a live request with a Bearer token.

# Netlify functions

Read-only API поверх Supabase. Схема таблиць, з яких читає, - `supabase/AGENTS.md`;
формули, продубльовані тут, - `app/utils/AGENTS.md`.

## Зовнішні інтеграції


`netlify/functions/room-json.mts` - read-only Netlify Function (`path: '/api/*'`, дефолтна `netlify/functions` без
явного `[functions]` у `netlify.toml`):
- `GET /api/<roomId|slug>.json` → `{room,
  rounds:[{id,date,week,deck,average,devAlignment,qaAlignment,voters,votes:[{name,vote,cohort}]}]}` для однієї кімнати
- `GET /api/teams.json` → `{teams:[{room,rounds:[...]}]}` по **всіх** кімнатах у базі

`votes` - per-player знімок раунду (`name`+`vote`+`cohort: 'DEV'|'QA'`, той самий `isQaPlayer` спліт, що й
`devAlignment`/`qaAlignment`) - додано для round-snapshot drill-down в agilecharts (клік по точці графіка → хто як
голосував). Імена гравців тут не ширші за те, що й так видно будь-кому, хто заходить у кімнату; ендпоінт і так
token-gated.

Захищено shared-secret: `Authorization: Bearer <STORYPOKER_API_TOKEN>` (env var, server-side only, БЕЗ `VITE_` префіксу
- ставиться в Netlify site env, не в `/.env/`). Без заголовка чи з неправильним токеном - `401`; якщо
`STORYPOKER_API_TOKEN` не заданий на сервері - `500` (`server misconfigured`). Той самий Bearer-патерн, що й
`fe-weekly-report.post.ts` у agilecharts - саме agilecharts (`server/utils/storypokerFiles.ts`) додає цей заголовок на
кожен запит.

Колода в `rounds` визначається автоматично (`isNumericPreset`-логіка: `scrum`/`fibonacci`/`hours`/`goal_clarity` +
legacy `deck_preset=null`), poll-колоди (`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключаються з
узгодженості. Читає `rooms`+`round_history`+`players` напряму через `@supabase/supabase-js` (той самий
`VITE_SUPABASE_*`), рахунок `alignmentScore`/`averageOf`/DEV-QA split - навмисно продубльований з
`app/utils/alignment.ts`/`roundStats.ts`/`shields.ts` (Netlify bundler не резолвить Vite alias `~/*`) - зміни формул
синхронізувати вручну в обох місцях. Споживач - `agilecharts` (сусідній репо, Nuxt), вкладка "Estimation Trends"
(`app/components/team/TeamConsistencyTrends.vue`).


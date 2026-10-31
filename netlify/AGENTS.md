# Netlify functions

Read-only API поверх Supabase. Схема таблиць, з яких читає, - `supabase/AGENTS.md`;
формули, продубльовані тут, - `app/utils/AGENTS.md`.

## Зовнішні інтеграції


`netlify/functions/room-json.mts` - read-only Netlify Function (`path: '/api/*'`, дефолтна `netlify/functions` без
явного `[functions]` у `netlify.toml`):
- `GET /api/<roomId|slug>.json` → `{room, rounds}` для однієї кімнати; поля раунду:
  `id,date,week,deck,average,devAlignment,qaAlignment,voters,votes,alignments,roleVotes`
- `GET /api/teams.json` → `{teams:[{room,rounds:[...]}]}` по **всіх** кімнатах у базі

**Legacy-контракт agilecharts:** `average`, `voters`, `devAlignment`, `qaAlignment`,
`votes[{name,vote,cohort}]` і набір раундів збережені без змін. `votes` - per-player snapshot з
`cohort: "DEV"|"QA"`; це свідомо збережений DEV/QA-спліт (`trendCohorts`): DEV = DEV/BE/FE/SRE, QA =
QA/GQA/AQA. PO/SM/кастомні відсутні, якщо є голоси оцінювачів; без них усі голоси йдуть у DEV. Без ролі
й ті, хто вийшов, - DEV. `voters` і `average` беруть той самий пул. Ці поля використовує drill-down в
agilecharts; перехід споживача на нові поля робиться окремо. Імена не ширші за видимі учасникам кімнати
дані, ендпоінт лишається token-gated.

**Нові поля:** `alignments` - розріджений об’єкт з ключами DEV, BE, FE, SRE, QA, GQA, AQA, PO, SM лише
для ролей, що голосували; значення - ціле 0-100 або `null`, якщо менше двох голосів картами колоди без
`?`/`☕`. `roleVotes` містить усі голоси зі стандартною когортою як `{name,vote,role}` у порядку
snapshot, включно з PO/SM; кастомних ролей немає. Сира поточна роль береться з shields видимих гравців,
без ролі й відсутні гравці - DEV. Збережений `result_cohorts` і автоматичні кастомні кола поточного
раунду на API не впливають.

Захищено shared-secret: `Authorization: Bearer <STORYPOKER_API_TOKEN>` (env var, server-side only, БЕЗ `VITE_` префіксу
- ставиться в Netlify site env, не в `/.env/`). Без заголовка чи з неправильним токеном - `401`; якщо
`STORYPOKER_API_TOKEN` не заданий на сервері - `500` (`server misconfigured`). Той самий Bearer-патерн, що й
`fe-weekly-report.post.ts` у agilecharts - саме agilecharts (`server/utils/storypokerFiles.ts`) додає цей заголовок на
кожен запит.

Колода в `rounds` визначається автоматично (`isNumericPreset`:
`scrum`/`fibonacci`/`hours`/`goal_clarity` + legacy `deck_preset=null`); poll-колоди
(`voting`/`vote_question`) і нечислові (`tshirt`/`boolean`) виключені. Далі лишаються раунди з не-null
`average` і хоча б одним не-null legacy-балом `devAlignment`/`qaAlignment`; додавання ролей цей фільтр
не змінює. Читає `rooms`+`round_history`+`players` напряму через `@supabase/supabase-js` (той самий
`VITE_SUPABASE_*`). `alignmentScore`/`averageOf`, фолбек колоди й визначення сирої ролі навмисно
продубльовані з `app/utils/alignment.ts`/`roundStats.ts`/`resultCohorts.ts`: Netlify bundler не
резолвить Vite alias `~/*`. Legacy-поділ для agilecharts лишається локально у функції; зміни спільних
формул синхронізувати вручну. Споживач - `agilecharts` (сусідній репо, Nuxt), вкладка
"Estimation Trends" (`app/components/team/TeamConsistencyTrends.vue`).

Функція виходить разом із prod-білдом Netlify з `main`, окремого деплою не треба. Перевірка -
`netlify api listSiteDeploys` (`commit_ref`, `available_functions`) і живий запит із Bearer-токеном.

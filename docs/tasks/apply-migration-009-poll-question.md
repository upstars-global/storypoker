# Задача для Claude Code: застосувати міграцію 009 (poll_question)

> Хендоф для тіммейта. Передай цей файл своїй сесії Claude Code (або виконай кроки вручну).
> Мова спілкування в репозиторії — українська.

## Контекст

Додано нову фічу — колода **«Голосовалка»** (Planning Poker, репозиторій `storypoker`).
Код уже в `main`, але **неробочий**, бо в БД Supabase бракує колонки `room_state.poll_question`.

Міграції накатуються **вручну** (див. `CLAUDE.md` → Database). Файл міграції вже є в репо:
`supabase/migrations/009_room_state_poll_question.sql`.

### Наслідки відсутньої колонки (поточні баги)

- `room.startNewRound()` пише `poll_question: null` → запит відхиляється БД → фаза не скидається з `revealed` на `voting` → **кнопка «Почати новий раунд» не діє для будь-якої колоди** (регресія, не лише голосовалка).
- Не повертаючись у фазу `voting`, **не зʼявляється поле введення питання**.
- `room.setDeckPreset()` і `room.setPollQuestion()` теж падають.

## Чому це не зміг зробити попередній агент

У проєкті доступні лише PostgREST-ключі (`VITE_SUPABASE_KEY`, `SUPABASE_SECRET_KEY=sb_secret_…`),
які **не дозволяють DDL** (`ALTER TABLE`). Немає Supabase CLI, `psql`, connection string до Postgres
та RPC для виконання SQL. Тому колонку має додати людина з доступом до дашборду / БД.

## Що треба зробити

Застосувати міграцію `009` до **prod** Supabase-проєкту (і до тестового проєкту в `.env/.env.test`, якщо ганяєте E2E).

### Варіант A — Supabase SQL Editor (найшвидше)

Відкрити **Supabase Dashboard → SQL Editor** потрібного проєкту і виконати:

```sql
alter table room_state
  add column if not exists poll_question text;
```

### Варіант B — Supabase CLI (якщо проєкт залінковано)

```bash
npx supabase link --project-ref <PROJECT_REF>   # одноразово
npx supabase db push
```

### Варіант C — пряме підключення (якщо є connection string з паролем БД)

```bash
psql "<POSTGRES_CONNECTION_STRING>" -f supabase/migrations/009_room_state_poll_question.sql
```

## Перевірка (обовʼязково)

Колонка має існувати й бути доступною для select через клієнтський ключ.
Створи тимчасовий скрипт, прожени, видали:

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

Очікуваний вивід: `OK: poll_question exists`.

## Димова перевірка фічі в застосунку

1. `npm run dev`, зайти в кімнату модератором.
2. «Налаштувати колоду» → вибрати **«Голосовалка»**. За/Проти зафіксовані (disabled-чекбокси), обрати третю картку (☕ / 🍺 / 🚬). Зберегти.
3. Над картами зʼявляється поле питання → написати → **«Почати голосування»**. До цього картки заблоковані.
4. Проголосувати (≥2 гравці), розкрити. У результатах над діаграмами видно текст питання.
5. **«Почати новий раунд»** → фаза скидається, питання очищується, картки знову заблоковані до нового питання.

## Готово, коли

- Перевірочний скрипт друкує `OK: poll_question exists`.
- Кнопка «Почати новий раунд» працює.
- На колоді «Голосовалка» проходить увесь сценарій з п. «Димова перевірка».

# Supabase - схема, міграції, RLS

Схема БД і політики доступу. Стори, що читають ці таблиці - `app/stores/AGENTS.md`;
read-only API поверх них - `netlify/AGENTS.md`.

## Database
Міграції в `supabase/migrations/` - нумеровані послідовно, накатуються вручну через Supabase SQL
Editor або Management API (`POST /v1/projects/<ref>/database/query` з особистим `sbp_`-токеном з
`.env/.env.local`). Локальний стек для e2e - `pnpm run supabase:local` (`scripts/supabase-local.sh`): CLI з кореня
падає, бо `.env` - тека, тож скрипт запускає його з `~/.cache/storypoker-supabase` через symlink; GRANT-и для
`anon`/`authenticated` - лише в `seed.sql` (локально), у міграціях їх немає. Історії міграцій у базі немає:
перед накатом звір стан через `information_schema`, кілька файлів - однією транзакцією, після DDL -
`notify pgrst, 'reload schema';`.
RLS перевіряй живою пробою, що нічого не лишає: міграцію й перевірки - в один `do`-блок, який закінчується
`raise exception` з результатами (Management API відкочує все й повертає їх у тексті помилки). Роль і користувач -
`set_config('role', 'authenticated', true)` і `set_config('request.jwt.claims', ...)` з `sub`, далі запит як
власник і як чужий (claims до кінця блоку не скидаються: перед запитом як чужий - новий `set_config` з його
`sub`). Пряме `delete from storage.objects` Storage блокує завжди («Direct deletion from storage tables is not
allowed»), тож delete-політику так не перевірити - лише через Storage API. У storage-політиках із підзапитом до
таблиці з колонкою `name` (`rooms`) пиши `objects.name`: некваліфікований `name` береться з таблиці підзапиту
(так зламався `016`, виправив `019`).
Таблиці:
- `rooms (id text PK, slug text unique, name text, background_url, background_updated_at, background_opacity,
  background_owner_id, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms,
  poll_question, result_cohorts[], alarm_minutes, alarm_muted)` - `result_cohorts` з `017`, check-констрейнт на
  `DEV/BE/FE/SRE/QA`, `null` = DEV+QA; будильник таймера з `018` (`alarm_minutes` 3-20, `null` = 5 хв)
- `players (id uuid PK, room_id, name, is_moderator, vote, user_id, shields text[], created_at, left_at)`
- `round_history (id uuid PK, room_id, started_at, revealed_at, votes jsonb, deck_preset, created_at)`
- `user_profiles (user_id uuid PK, avatar_style, avatar_seed, avatar_url, updated_at)`

RLS зараз public read/write для anon key; логіка в клієнті. Виняток - `user_profiles`: select лишається public, а
insert/update з `014` тільки `to authenticated` для власного рядка (`auth.uid() = user_id`); з `015` `avatar_url`
зберігає лише відносний шлях і обмежений check-констрейнтом до точного `user_id || '/avatar.webp'` (абсолютний URL
вказував би на довільний `*.supabase.co` проєкт), а `avatar_style` - check-констрейнтом до трьох DiceBear-стилів.
`leave` і `kick` - soft-delete через `left_at`; UI працює з `left_at is null`.

Кастомні аватарки: Storage bucket `avatars` (public read; select/insert/update/delete `to authenticated`;
SELECT-політика обов'язкова, бо storage-api робить upsert/delete через `returning`). Міграція `012` додає її і виставляє
серверні ліміти бакета: `file_size_limit = 5242880` (5 MB, як `AVATAR_MAX_FILE_BYTES`) і `allowed_mime_types =
image/png,image/jpeg,image/webp` (як `AVATAR_ACCEPT`); `013` звужує всі чотири політики з «своя тека» до єдиного
дозволеного об'єкта `name = auth.uid() || '/avatar.webp'`, щоб бакет не був безкоштовним хостингом. Фіксований шлях
`<user_id>/avatar.webp` (upload з `upsert: true`, без сиріт). Зняття аватарки пише профіль (`avatar_url: null`) першим,
а видалення файлу робить best-effort - осиротілий об'єкт перезапишеться наступним upload, тоді як зворотний порядок
лишав би всім клієнтам битий `avatar_url`. Клієнт кропить/стискає до 256×256 WebP (`app/utils/avatarImage.ts`),
непорожній `avatar_url` (відносний шлях `<user_id>/avatar.webp`) вмикає кастомний рендер (`avatarSrcFor()` в
`useDylanAvatar.ts`; public URL збирає `avatarDisplayUrl()` через `getPublicUrl()`, кеш-інвалідація `?v=<updated_at>`,
offline grayscale через CSS filter), а `avatar_style` завжди лишається останнім DiceBear-стилем - fallback і зняття
картинки повертають саме його. Спека - `docs/specs/2026-08-02-custom-avatar-upload-design.md`.

Фон кімнати (`016`, політики виправлені в `019`, власника знято в `020`):
bucket `room-backgrounds` (public read, 2 MB, лише `image/webp`), чотири політики `to authenticated` на єдиний
об'єкт `<room_id>/background.webp` існуючої кімнати; запис, оновлення й видалення - будь-якому залогіненому
(модераторство - лише клієнтський гейт: `players.is_moderator` і `user_id` пише будь-хто). Тригер
`rooms_guard_background` блокує анонімам зміну `background_url`, `background_opacity`, `background_updated_at` і
`background_owner_id`. `background_owner_id` клієнт більше не читає й не пише; колонка лишилась, бо старі клієнти
ще роблять claim, - її можна дропнути окремою міграцією. `rooms.background_url` обмежений
check-констрейнтом до `id || '/background.webp'`, `background_updated_at` - кеш-інвалідація `?v=`, `background_opacity` (0.1-1, `null` = 0.65) - непрозорість фону. Модалка дає кадрувати
(drag/zoom у рамці 16:9), клієнт ріже кадр у WebP ≤ 1920×1080 (`app/utils/backgroundImage.ts`, спільне кодування з аватарками - `imageEncoding.ts`); UI лише для
authorized moderator. Зняття фону, як і аватарки, спершу пише `background_url: null`, файл видаляється best-effort.
`backgroundDisplayUrl()` (`stores/room.ts`) пропускає лише шлях за regex, бо значення йде в CSS `url()`, а `rooms.id`
може вставити будь-хто.

## Round history snapshot

`reveal()` оновлює `room_state.phase='revealed'` і пише `round_history` зі snapshot `{player_id,name,vote}[]` тільки
коли `votes.length >= 2`. `?` і `☕` рахуються як голоси. Snapshot містить `name`, щоб історія лишалась читабельною
після rename/leave. Також зберігає `active_cards`/`deck_preset` знятого раунду. Формули узгодженості -
`app/utils/AGENTS.md`. Ручного CSV-експорту немає (видалено) - `netlify/functions/room-json.mts` покриває цю потребу.

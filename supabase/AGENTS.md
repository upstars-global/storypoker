# Supabase - схема, міграції, RLS

Схема БД і політики доступу. Стори, що читають ці таблиці - `app/stores/AGENTS.md`;
read-only API поверх них - `netlify/AGENTS.md`.

## Database
Міграції в `supabase/migrations/` - нумеровані послідовно, накатуються вручну через Supabase SQL
Editor або Management API (не CLI-міграції, тож застосований стан бази не виводиться з репо).
Таблиці:
- `rooms (id text PK, slug text unique, name text, created_at)`
- `room_state (room_id PK, phase, deck_preset, active_cards[], round_started_at, paused_at, paused_elapsed_ms,
  poll_question)`
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

## Round history snapshot

`reveal()` оновлює `room_state.phase='revealed'` і пише `round_history` зі snapshot `{player_id,name,vote}[]` тільки
коли `votes.length >= 2`. `?` і `☕` рахуються як голоси. Snapshot містить `name`, щоб історія лишалась читабельною
після rename/leave. Також зберігає `active_cards`/`deck_preset` знятого раунду. Формули узгодженості -
`app/utils/AGENTS.md`. Ручного CSV-експорту немає (видалено) - `netlify/functions/room-json.mts` покриває цю потребу.

# Завантаження власної картинки для аватарки

**Дата:** 2026-08-02
**Статус:** реалізовано (з хардьонінгом за підсумками двох раундів ревʼю - див. «Захисні міграції»)

## Контекст

Аватарки зараз генеруються через DiceBear (`useDylanAvatar.ts`): три стилі (`bottts`, `dylan`, `miniavs`) + seed, збережені в `user_profiles (avatar_style, avatar_seed)`. Гравці без auth отримують аватар за seed = ім'я. Авторизовані користувачі обирають стиль і "перегортають" seed в `UserSettingsModal.vue`. Кастомних зображень немає.

## Мета

Дати авторизованому користувачу можливість завантажити власну картинку як аватар - з клієнтським кропом/стисненням, зберіганням у Supabase Storage і синхронізацією через існуючий Realtime-канал `user_profiles`.

## Обмеження та рішення

| Питання | Рішення |
|---|---|
| Хто може | Тільки авторизовані користувачі (`user`), як і решта налаштувань профілю |
| Де зберігати | Supabase Storage, bucket `avatars`, public read |
| Шлях файлу | `<user_id>/avatar.webp` - фіксований, upload з `upsert: true`, тому старий файл перезаписується без сиріт |
| Формат/розмір | Клієнт приймає `image/png`, `image/jpeg`, `image/webp` до 5 MB; canvas робить center-crop до квадрата, downscale до 256×256, конвертує у WebP (quality 0.85) - результат зазвичай < 50 KB |
| Схема БД | `user_profiles.avatar_url text` (nullable) зберігає **відносний шлях** `<user_id>/avatar.webp` (не абсолютний URL - його клієнт збирає через `getPublicUrl()`); кастомність визначається непорожнім `avatar_url`, а `avatar_style` завжди лишається останнім DiceBear-стилем |
| Кеш-інвалідація | До URL додається `?v=<updated_at>` - Realtime-подія оновлює `updated_at`, всі клієнти перерендерюють `<img>` |
| Offline-стан (grayscale) | Для custom-аватарів - CSS `filter: grayscale(1)` замість DiceBear-параметра |
| Fallback | Якщо `avatar_url` порожній - рендер DiceBear за `avatar_seed` і збереженим `avatar_style` |
| Видалення | Кнопка "Прибрати картинку" в модалці: `avatar_url: null` + best-effort `storage.remove()`; `avatar_style` не чіпався, тому попередній DiceBear-стиль відновлюється автоматично |

## Зміни в БД

Міграція `011_user_profiles_avatar_url.sql`:

```sql
alter table user_profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- read: public (bucket і так public); write/delete: тільки власна тека auth.uid()
create policy "avatar owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "avatar owner update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "avatar owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

(Обгортки `do $$ ... exception when duplicate_object $$` - як у наявних міграціях.)

На відміну від решти таблиць (public RLS), storage-політики одразу прив'язані до `auth.uid()` - upload доступний лише авторизованим, і лише у власну теку. Це не змінює клієнтської логіки: анонімні гравці до кастомних аватарів доступу і не мають.

## Захисні міграції (за підсумками ревʼю)

- `012_avatars_storage_hardening.sql` - SELECT-політика на `storage.objects` (storage-api робить upsert/delete через `returning`) + серверні ліміти бакета: `file_size_limit = 5242880`, `allowed_mime_types = image/png,image/jpeg,image/webp`.
- `013_avatars_fixed_object_name.sql` - усі чотири політики звужено з «своя тека» до єдиного об'єкта `name = auth.uid()::text || '/avatar.webp'`, щоб бакет не був безкоштовним хостингом.
- `014_user_profiles_ownership.sql` - insert/update на `user_profiles` лише `to authenticated` для власного рядка (`auth.uid() = user_id`), select лишається public; нормалізація legacy `avatar_style = 'custom'` → `'bottts'`.
- `015_avatar_url_relative_path.sql` - `avatar_url` переведено з абсолютного URL на відносний шлях і запінено check-констрейнтом до точного `user_id || '/avatar.webp'` (абсолютний URL проходив би й для чужого `*.supabase.co` проєкту); `avatar_style` обмежено check-констрейнтом до `bottts | dylan | miniavs`.

## Контракт відмов (неатомарність upload → upsert)

Пара «storage upload → profile upsert» не атомарна, і це усвідомлений trade-off на користь фіксованого шляху (політики `013` вимагають точного імені об'єкта, версійовані імена їх зламали б):

- Падіння upload - профіль не пишеться, користувач бачить `errorUploadFailed`, retry з тієї ж модалки.
- Падіння upsert після успішного upload - осиротілий об'єкт тимчасово не збігається з профілем; pending blob зберігається в модалці, повторний Save знову завантажує і дописує профіль (закріплено тестом «recovers by re-uploading when the profile write fails after a successful upload»). Битого `<img>` не виникає - клієнти рендерять лише те, що в `avatar_url`.
- Зняття аватарки пише профіль (`avatar_url: null`) першим, а `storage.remove()` - best-effort: осиротілий об'єкт перезапишеться наступним upload, тоді як зворотний порядок лишав би всім клієнтам битий `avatar_url`.

## Нові модулі

### `app/utils/avatarImage.ts`

```ts
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024
export const AVATAR_SIZE = 256
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'

export function isAcceptedImageType(file: File): boolean
export async function processAvatarImage(file: File): Promise<Blob>
```

`processAvatarImage`: `createImageBitmap(file)` → center-crop до квадрата → малювання на `OffscreenCanvas`/`<canvas>` 256×256 → `convertToBlob({ type: 'image/webp', quality: 0.85 })`. Кидає `Error('file-too-large' | 'unsupported-type' | 'decode-failed')` - модалка мапить коди на i18n-повідомлення.

### Розширення `profiles.ts` store

```ts
export interface UserProfile {
  user_id: string
  avatar_style: AvatarStyle
  avatar_seed: string
  avatar_url: string | null
}

async function uploadAvatar(userId: string, blob: Blob): Promise<string> // → шлях об'єкта `<user_id>/avatar.webp`
async function removeAvatar(userId: string): Promise<void>
```

- `uploadAvatar`: `storage.from('avatars').upload(`${userId}/avatar.webp`, blob, { upsert: true, contentType: 'image/webp' })` → повертає той самий відносний шлях, який і записується в `avatar_url`. Профіль пише модалка через існуючий `upsert()` (стиль + url разом, один запис).
- `removeAvatar`: `storage.from('avatars').remove([...])`; профіль знову ж оновлює модалка.
- Усі `select` в `fetchOne`/`fetchMany` розширюються на `avatar_url`.

### Спільний рендер-хелпер

`avatarSrcFor(profile, fallbackSeed, grayscale)` - додається в `useDylanAvatar.ts` (не новий файл): якщо `profile?.avatar_url` непорожній → `avatarDisplayUrl(path, updated_at)` резолвить шлях у public URL через `getSupabase().storage.from('avatars').getPublicUrl()` і додає `?v=<updated_at>`, `cssGrayscale` віддається для CSS-фільтра; інакше - поточна DiceBear-логіка за `avatar_seed`/`avatar_style`. Використовується у трьох місцях рендеру: `PlayerRow.vue`, `AppHeader.vue`, прев'ю в `UserSettingsModal.vue`.

## UI: UserSettingsModal

- До ряду стилів (`Robots | Dylan | Miniavs`) додається четверта кнопка `{{ $t('userSettings.styleCustom') }}`.
- При виборі custom замість prev/next-стрілок показується:
  - прев'ю (поточний `avatar_url` або плейсхолдер `ic:baseline-add-a-photo`)
  - прихований `<input type="file" :accept="AVATAR_ACCEPT">`, тригер - клік по прев'ю або кнопка "Обрати файл"
  - кнопка "Прибрати картинку" (`mui-btn-text`), якщо url є
- Обраний файл проганяється через `processAvatarImage` одразу (прев'ю з `URL.createObjectURL(blob)`), upload у Storage - тільки по "Save".
- "Save" при custom: `uploadAvatar()` → `upsert({ avatar_style: <незмінний DiceBear-стиль>, avatar_url, avatar_seed })` (seed і стиль зберігаються для fallback/відновлення).
- Помилки процесингу/upload - через існуючий `error`-блок модалки.

## Рендеринг

- `PlayerRow.vue` / `AppHeader.vue`: `avatarDataUri(...)` виклики замінюються на `avatarSrcFor(...)`; для custom offline-гравця на `<img>` вішається `style="filter: grayscale(1)"`.
- Анонімні гравці - без змін (DiceBear за ім'ям).

## i18n

Нові ключі в `uk.json`/`en.json` (`userSettings.*`): `styleCustom`, `chooseFile`, `removeImage`, `errorFileTooLarge`, `errorUnsupportedType`, `errorDecodeFailed`, `errorUploadFailed`.

## Що НЕ входить

- Ручний кроп-редактор (drag/zoom) - тільки автоматичний center-crop
- Аватарки для неавторизованих гравців
- Модерація/NSFW-фільтрація зображень
- Міграція існуючих DiceBear-аватарів

## Критерії успіху

- Авторизований користувач завантажує PNG/JPEG/WebP до 5 MB → бачить свій аватар у хедері та списку гравців; інші учасники кімнати бачать його без перезавантаження (Realtime)
- Повторне завантаження замінює файл (без накопичення у Storage), кеш інвалідовано через `?v=`
- "Прибрати картинку" повертає DiceBear-аватар
- Offline custom-аватар - у grayscale
- Анонімний клієнт не може писати в bucket `avatars` (RLS)
- `npm run test:ci` зелений

# Custom avatar image upload

**Date:** 2026-08-02
**Status:** implemented (with hardening after two review rounds - see "Hardening migrations")

## Context

Avatars are currently generated through DiceBear (`useDylanAvatar.ts`): three styles (`bottts`, `dylan`, `miniavs`) plus a seed, stored in `user_profiles (avatar_style, avatar_seed)`. Players without auth receive an avatar with seed = name. Authenticated users choose a style and cycle the seed in `UserSettingsModal.vue`. There are no custom images.

## Goal

Allow an authenticated user to upload a custom image as an avatar, with client-side cropping and compression, storage in Supabase Storage, and synchronization through the existing `user_profiles` Realtime channel.

## Constraints and decisions

| Question | Decision |
|---|---|
| Who can upload | Only authenticated users (`user`), as with other profile settings |
| Storage | Supabase Storage, bucket `avatars`, public read |
| File path | `<user_id>/avatar.webp` is fixed; upload uses `upsert: true`, so the old file is overwritten without orphans |
| Format and size | The client accepts `image/png`, `image/jpeg`, `image/webp` up to 5 MB; canvas center-crops to a square, downscales to 256×256, and converts to WebP (quality 0.85); the result is usually < 50 KB |
| DB schema | `user_profiles.avatar_url text` (nullable) stores the **relative path** `<user_id>/avatar.webp`. It does not store an absolute URL; the client constructs that through `getPublicUrl()`. A non-empty `avatar_url` indicates a custom avatar, while `avatar_style` always remains the last DiceBear style |
| Cache invalidation | `?v=<updated_at>` is appended to the URL; the Realtime event updates `updated_at`, and all clients re-render `<img>` |
| Offline state (grayscale) | Custom avatars use CSS `filter: grayscale(1)` in place of a DiceBear parameter |
| Fallback | If `avatar_url` is empty, render DiceBear using `avatar_seed` and the stored `avatar_style` |
| Removal | The "Прибрати картинку" ("Remove image") button in the modal sets `avatar_url: null` and calls best-effort `storage.remove()`; `avatar_style` is untouched, so the previous DiceBear style is restored automatically |

## Database changes

Migration `011_user_profiles_avatar_url.sql`:

```sql
alter table user_profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- read: public (bucket is already public); write/delete: only the user's own auth.uid() folder
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

(`do $$ ... exception when duplicate_object $$` wrappers, as in the existing migrations.)

Unlike the other tables (public RLS), storage policies are tied to `auth.uid()` from the start: upload is available only to authenticated users, and only to their own folder. This does not change the client logic: anonymous players do not have access to custom avatars.

## Hardening migrations (following review)

1. `012_avatars_storage_hardening.sql` - SELECT policy on `storage.objects` (storage-api performs upsert/delete through `returning`) plus server-side bucket limits: `file_size_limit = 5242880`, `allowed_mime_types = image/png,image/jpeg,image/webp`.
2. `013_avatars_fixed_object_name.sql` - all four policies narrowed from "own folder" to the single object `name = auth.uid()::text || '/avatar.webp'`, so the bucket cannot be used as free hosting.
3. `014_user_profiles_ownership.sql` - insert/update on `user_profiles` only `to authenticated` for the user's own row (`auth.uid() = user_id`), select remains public; normalize legacy `avatar_style = 'custom'` to `'bottts'`.
4. `015_avatar_url_relative_path.sql` - `avatar_url` changed from an absolute URL to a relative path and pinned by a check constraint to the exact `user_id || '/avatar.webp'` (an absolute URL would also pass for another `*.supabase.co` project); `avatar_style` restricted by a check constraint to `bottts | dylan | miniavs`.

## Failure contract (non-atomic upload → upsert)

The "storage upload → profile upsert" pair is not atomic. This is a deliberate trade-off for a fixed path: policies `013` require an exact object name, and versioned names would break them.

1. Upload failure: the profile is not written, the user sees `errorUploadFailed`, and can retry from the same modal.
2. Upsert failure after a successful upload: the orphaned object temporarily does not match the profile; the pending blob remains in the modal, and another Save uploads it again and writes the profile (covered by the test "recovers by re-uploading when the profile write fails after a successful upload"). No broken `<img>` appears because clients render only what is in `avatar_url`.
3. Removing an avatar writes the profile (`avatar_url: null`) first, and `storage.remove()` is best-effort: the next upload overwrites the orphaned object. The reverse order would leave every client with a broken `avatar_url`.

## New modules

### `app/utils/avatarImage.ts`

```ts
export const AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024
export const AVATAR_SIZE = 256
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'

export function isAcceptedImageType(file: File): boolean
export async function processAvatarImage(file: File): Promise<Blob>
```

`processAvatarImage`: `createImageBitmap(file)` → center-crop to a square → draw on `OffscreenCanvas`/`<canvas>` 256×256 → `convertToBlob({ type: 'image/webp', quality: 0.85 })`. Throws `Error('file-too-large' | 'unsupported-type' | 'decode-failed')`; the modal maps the codes to i18n messages.

### `profiles.ts` store extension

```ts
export interface UserProfile {
  user_id: string
  avatar_style: AvatarStyle
  avatar_seed: string
  avatar_url: string | null
}

async function uploadAvatar(userId: string, blob: Blob): Promise<string> // → object path `<user_id>/avatar.webp`
async function removeAvatar(userId: string): Promise<void>
```

1. `uploadAvatar`: ``storage.from('avatars').upload(`${userId}/avatar.webp`, blob, { upsert: true, contentType: 'image/webp' })`` → returns the same relative path that is written to `avatar_url`. The modal writes the profile through the existing `upsert()` (style + url together, one write).
2. `removeAvatar`: `storage.from('avatars').remove([...])`; the modal also updates the profile.
3. All `select` calls in `fetchOne`/`fetchMany` are extended with `avatar_url`.

### Shared rendering helper

`avatarSrcFor(profile, fallbackSeed, grayscale)` is added to `useDylanAvatar.ts` (not a new file): if `profile?.avatar_url` is non-empty, `avatarDisplayUrl(path, updated_at)` resolves the path to a public URL through `getSupabase().storage.from('avatars').getPublicUrl()` and appends `?v=<updated_at>`, while `cssGrayscale` is returned for the CSS filter. Otherwise, use the current DiceBear logic based on `avatar_seed`/`avatar_style`. It is used in three rendering locations: `PlayerRow.vue`, `AppHeader.vue`, and the preview in `UserSettingsModal.vue`.

## UI: UserSettingsModal

1. A fourth button, `{{ $t('userSettings.styleCustom') }}`, is added to the style row (`Robots | Dylan | Miniavs`).
2. When custom is selected, the following appears in place of the prev/next arrows:
   1. A preview (the current `avatar_url` or the `ic:baseline-add-a-photo` placeholder).
   2. A hidden `<input type="file" :accept="AVATAR_ACCEPT">`, triggered by clicking the preview or the "Обрати файл" ("Choose file") button.
   3. The "Прибрати картинку" ("Remove image") button (`mui-btn-text`), if a url exists.
3. The selected file is processed through `processAvatarImage` immediately (preview from `URL.createObjectURL(blob)`); upload to Storage happens only on "Save".
4. "Save" for custom: `uploadAvatar()` → `upsert({ avatar_style: <unchanged DiceBear style>, avatar_url, avatar_seed })` (the seed and style are retained for fallback and restoration).
5. Processing/upload errors use the modal's existing `error` block.

## Rendering

1. `PlayerRow.vue` / `AppHeader.vue`: `avatarDataUri(...)` calls are replaced with `avatarSrcFor(...)`; a custom offline player's `<img>` gets `style="filter: grayscale(1)"`.
2. Anonymous players remain unchanged (DiceBear based on name).

## i18n

New keys in `uk.json`/`en.json` (`userSettings.*`): `styleCustom`, `chooseFile`, `removeImage`, `errorFileTooLarge`, `errorUnsupportedType`, `errorDecodeFailed`, `errorUploadFailed`.

## Out of scope

1. Manual crop editor (drag/zoom); only automatic center-crop is included.
2. Avatars for unauthenticated players.
3. Image moderation/NSFW filtering.
4. Migration of existing DiceBear avatars.

## Success criteria

1. An authenticated user uploads PNG/JPEG/WebP up to 5 MB and sees their avatar in the header and player list; other room participants see it without reloading (Realtime).
2. A subsequent upload replaces the file (without accumulation in Storage); the cache is invalidated through `?v=`.
3. "Прибрати картинку" ("Remove image") restores the DiceBear avatar.
4. An offline custom avatar is grayscale.
5. An anonymous client cannot write to the `avatars` bucket (RLS).
6. `npm run test:ci` is green.

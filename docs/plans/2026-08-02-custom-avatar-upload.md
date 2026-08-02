# Custom Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users upload their own avatar image (client-side crop/compress to 256×256 WebP, stored in Supabase Storage bucket `avatars`), rendered everywhere DiceBear avatars render today, synced via the existing `user_profiles` Realtime channel.

**Architecture:** New nullable `user_profiles.avatar_url` column storing the relative object path `<user_id>/avatar.webp`; custom-ness is derived from a non-empty `avatar_url` while `avatar_style` keeps the last DiceBear style (the `'custom'` sentinel was dropped during review). Fixed storage path with `upsert: true` (no orphans). New `app/utils/avatarImage.ts` for validation + canvas processing; `avatarSrcFor()` helper in `useDylanAvatar.ts` unifies custom-vs-DiceBear resolution for `PlayerRow`, `AppHeader`, `UserSettingsModal`. Offline grayscale for custom avatars via CSS filter.

**Spec:** `docs/specs/2026-08-02-custom-avatar-upload-design.md`

**Tech Stack:** Vue 3.5, TypeScript, Pinia, Supabase (Postgres + Storage + Realtime), Vitest. No new dependencies.

## Global Constraints

- `npm run typecheck` and `npm test` must pass after every task
- 2 spaces, no tabs, single trailing newline; no code comments unless WHY is non-obvious
- UI strings go through i18n (`uk.json` + `en.json`)
- Never expose `SUPABASE_SECRET_KEY`; client uses the existing publishable key + auth session
- Commit after each task

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/011_user_profiles_avatar_url.sql`
- Modify: `app/lib/database.types.ts` (add `avatar_url` to `user_profiles` Row/Insert/Update)
- Modify: `app/stores/profiles.ts` (`UserProfile` interface only)

---

- [x] **Step 1.1: Write migration 011**

`supabase/migrations/011_user_profiles_avatar_url.sql` per spec: `alter table user_profiles add column if not exists avatar_url text;`, insert bucket `avatars` (`public = true`, `on conflict do nothing`), three `storage.objects` policies (insert/update/delete) gated by `bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]`, each wrapped in `do $$ ... exception when duplicate_object then null; end $$;` like migrations 001–010.

- [x] **Step 1.2: Apply migration to Supabase (SQL Editor or Management API)**

Verify: `select column_name from information_schema.columns where table_name = 'user_profiles';` includes `avatar_url`; bucket `avatars` exists and is public.

- [x] **Step 1.3: Update `database.types.ts`**

Add `avatar_url: string | null` to `user_profiles.Row`, `avatar_url?: string | null` to `Insert` and `Update`.

- [x] **Step 1.4: Update `UserProfile` in `profiles.ts`**

```ts
export interface UserProfile {
  user_id: string
  avatar_style: AvatarStyle
  avatar_seed: string
  avatar_url: string | null
  updated_at?: string | null
}
```

Extend both `select(...)` strings in `fetchOne`/`fetchMany` to `'user_id, avatar_style, avatar_seed, avatar_url, updated_at'`.

- [x] **Step 1.5: Typecheck + test**

```bash
npm run typecheck && npm test
```

Fix any fallout from the widened `avatar_style` type (call sites that pass `profile.avatar_style` into `avatarDataUri` will fail typecheck - temporary casts are NOT allowed; those call sites are rewritten in Task 3, so if needed reorder: do Task 3's helper first. Preferred: land Steps 1.4 and Task 3 in one commit if typecheck cannot pass in isolation).

- [x] **Step 1.6: Commit**

```bash
git add supabase/migrations/011_user_profiles_avatar_url.sql app/lib/database.types.ts app/stores/profiles.ts
git commit -m "feat: add avatar_url column and avatars storage bucket"
```

---

### Task 2: Image processing util

**Files:**
- Create: `app/utils/avatarImage.ts`
- Test: `tests/unit/utils/avatarImage.spec.ts`

**Interfaces:**
- Produces: `AVATAR_MAX_FILE_BYTES = 5 * 1024 * 1024`, `AVATAR_SIZE = 256`, `AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'`
- Produces: `isAcceptedImageType(file: File): boolean`
- Produces: `processAvatarImage(file: File): Promise<Blob>` - throws `Error` with message `'file-too-large' | 'unsupported-type' | 'decode-failed'`

---

- [x] **Step 2.1: Write failing tests**

`tests/unit/utils/avatarImage.spec.ts`: `isAcceptedImageType` accepts png/jpeg/webp `File`s and rejects `image/gif`, `text/plain`; `processAvatarImage` rejects with `'file-too-large'` for a `File` faked over 5 MB and `'unsupported-type'` for gif. Canvas pipeline is not exercisable in happy-dom - do NOT test the happy path here; mock `createImageBitmap` absence gracefully (guard test with `typeof createImageBitmap`).

- [x] **Step 2.2: Implement `avatarImage.ts`**

`processAvatarImage`: validate type/size first (throw before any decode), then `createImageBitmap(file)` (wrap failure → `'decode-failed'`), compute square center-crop (`const side = Math.min(bitmap.width, bitmap.height)`), draw onto 256×256 canvas (`OffscreenCanvas` when available, else `document.createElement('canvas')`), export WebP `quality: 0.85` (`convertToBlob` / `toBlob` promisified).

- [x] **Step 2.3: Verify**

```bash
npm run test:unit -- avatarImage && npm run typecheck
```

- [x] **Step 2.4: Commit**

```bash
git add app/utils/avatarImage.ts tests/unit/utils/avatarImage.spec.ts
git commit -m "feat: add avatar image validation and canvas processing util"
```

---

### Task 3: Store actions + render helper

**Files:**
- Modify: `app/stores/profiles.ts` (add `uploadAvatar`, `removeAvatar`)
- Modify: `app/composables/useDylanAvatar.ts` (add `avatarSrcFor`)
- Modify: `app/components/PlayerRow.vue`, `app/components/AppHeader.vue` (switch to helper)
- Test: `tests/unit/stores/profiles.spec.ts` (new)

**Interfaces:**
- Produces: `uploadAvatar(userId: string, blob: Blob): Promise<string>` - storage upsert-upload to `` `${userId}/avatar.webp` ``, returns the object path (clients resolve the public URL via `avatarDisplayUrl()`)
- Produces: `removeAvatar(userId: string): Promise<void>` - `storage.from('avatars').remove([`${userId}/avatar.webp`])`
- Produces: `avatarSrcFor(profile: UserProfile | null, fallbackSeed: string, grayscale: boolean): { src: string, cssGrayscale: boolean }` - non-empty `avatar_url` → `{ src: avatarDisplayUrl(path, updated_at), cssGrayscale: grayscale }` (public URL via `getPublicUrl()` + `?v=` cache buster); otherwise existing `avatarDataUri` path with `cssGrayscale: false`

---

- [x] **Step 3.1: Add store actions**

`uploadAvatar`/`removeAvatar` via `getSupabase().storage.from('avatars')`; throw on error (modal handles display). Profile row itself is still written through the existing `upsert()` by the caller - keep actions storage-only.

- [x] **Step 3.2: Write store tests**

New `tests/unit/stores/profiles.spec.ts` following the mock pattern of `tests/unit/stores/*.spec.ts` (inject mock via `setSupabase`): `uploadAvatar` calls `upload` with `{ upsert: true, contentType: 'image/webp' }` and returns the object path; `removeAvatar` calls `remove` with the right path; `fetchOne` selects `avatar_url`.

- [x] **Step 3.3: Add `avatarSrcFor` to `useDylanAvatar.ts`**

Return shape per Interfaces. Keep `avatarDataUri` exported and untouched.

- [x] **Step 3.4: Switch `PlayerRow.vue`**

Replace the `playerAvatar` computed with `avatarSrcFor(profile, props.player.name, !props.player.is_online)`; bind `:src="playerAvatar.src"` and `:style="playerAvatar.cssGrayscale ? { filter: 'grayscale(1)' } : undefined"` (merge with existing static styles).

- [x] **Step 3.5: Switch `AppHeader.vue`**

Same substitution in `myAvatarUri` computed (grayscale always `false` here).

- [x] **Step 3.6: Verify**

```bash
npm run typecheck && npm test
```

- [x] **Step 3.7: Commit**

```bash
git add app/stores/profiles.ts app/composables/useDylanAvatar.ts app/components/PlayerRow.vue app/components/AppHeader.vue tests/unit/stores/profiles.spec.ts
git commit -m "feat: custom avatar storage actions and unified avatar resolution"
```

---

### Task 4: UserSettingsModal UI + i18n

**Files:**
- Modify: `app/components/UserSettingsModal.vue`
- Modify: `app/i18n/locales/uk.json`, `app/i18n/locales/en.json`

---

- [x] **Step 4.1: Add i18n keys**

`userSettings.styleCustom`, `chooseFile`, `removeImage`, `errorFileTooLarge`, `errorUnsupportedType`, `errorDecodeFailed`, `errorUploadFailed` in both locales.

- [x] **Step 4.2: Extend the modal**

- Fourth style button `styleCustom` (`style` ref widens to `AvatarStyle | 'custom'`; initial value from profile).
- When `style === 'custom'`: hide prev/next arrows; show preview `<img>` (pending blob object-URL → else `profile.avatar_url` → else `ic:baseline-add-a-photo` placeholder button), hidden `<input type="file" :accept="AVATAR_ACCEPT">` triggered by preview click and a `chooseFile` button, plus a `mui-btn-text` `removeImage` button when an url exists.
- File select → `processAvatarImage` immediately; map thrown codes to i18n errors; keep resulting blob in a ref, preview via `URL.createObjectURL` (revoke on replace/unmount).
- `save()` when custom: if pending blob → `await profilesStore.uploadAvatar(user.id, blob)`; then `upsert({ user_id, avatar_style: <preserved DiceBear style>, avatar_seed: seed, avatar_url: <object path> })`. If remove was chosen → upsert with `avatar_url: null` first, then best-effort `removeAvatar()`; the untouched `avatar_style` restores the previous DiceBear avatar. Non-custom save keeps current behavior but writes `avatar_url: null`.

- [x] **Step 4.3: Verify + manual smoke**

```bash
npm run typecheck && npm test && npm run dev
```

Manual: upload jpeg → header avatar updates; second browser (same room) sees new avatar without reload; re-upload replaces; remove restores DiceBear; offline custom avatar grays out.

- [x] **Step 4.4: Commit**

```bash
git add app/components/UserSettingsModal.vue app/i18n/locales/uk.json app/i18n/locales/en.json
git commit -m "feat: custom avatar upload UI in user settings"
```

---

### Task 5: Docs

**Files:**
- Modify: `AGENTS.md` (Database section: `user_profiles` gets `avatar_url`; mention bucket `avatars` + migration `011`)
- Modify: `DESIGN.md` (profile/avatar section if present)

---

- [x] **Step 5.1: Update docs and commit**

```bash
git add AGENTS.md DESIGN.md
git commit -m "docs: document custom avatar upload"
```

---

## Verification Checklist

- [x] Authenticated user uploads PNG/JPEG/WebP ≤ 5 MB → avatar appears in AppHeader and PlayerRow
- [x] Other room participants see the change live (Realtime `user_profiles`)
- [x] Re-upload overwrites `<user_id>/avatar.webp` (single object in bucket), `?v=` busts cache
- [x] Remove image → DiceBear avatar restored
- [x] Offline player with custom avatar renders grayscale
- [x] Anonymous client cannot write to `avatars` bucket (RLS denies)
- [x] `npm run test:ci` passes

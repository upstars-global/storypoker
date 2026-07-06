# Remove shadcn-vue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove 7 npm packages (reka-ui, shadcn-vue, class-variance-authority, clsx, tailwind-merge, tw-animate-css, @lucide/vue) by replacing their usage with native HTML, plain Vue, and two new thin wrapper components.

**Architecture:** Create `AppModal.vue` (native `<dialog>`) and `AppTooltip.vue` (positioned div) as drop-in replacements for reka-ui Dialog/Tooltip primitives. Replace the DropdownMenu in AppHeader and PlayerRow with inline `v-if` + a new `useClickOutside` composable. Replace the Select in ConfigureCardDeckModal with a native `<select>`. All CSS classes already exist in `main.css`.

**Tech Stack:** Vue 3.5, TypeScript, Vitest, Tailwind v4. No new dependencies.

## Global Constraints

- `npm run typecheck` must pass after every task
- `npm test` must pass (no regressions in unit tests)
- No changes to visual appearance or behavior — pure structural swap
- Keep all existing `.mui-*` CSS classes; do not rename or restructure them
- 2 spaces, no tabs; single trailing newline in all files
- No comments in code unless the WHY is non-obvious
- Commit after each task

---

### Task 1: New primitives — AppModal, AppTooltip, useClickOutside + CSS

**Files:**
- Create: `app/components/AppModal.vue`
- Create: `app/components/AppTooltip.vue`
- Create: `app/composables/useClickOutside.ts`
- Modify: `app/assets/css/main.css` (add dialog + tooltip utility styles)
- Test: `tests/unit/utils/useClickOutside.spec.ts`

**Interfaces:**
- Produces: `AppModal` — props `{ open: boolean, lockDismiss?: boolean }`, emits `close`
- Produces: `AppTooltip` — props `{ side?: 'top'|'bottom'|'left'|'right', sideOffset?: number }`, slots `#trigger` `#content`
- Produces: `useClickOutside(target: Ref<HTMLElement | null>, handler: () => void): void`

---

- [ ] **Step 1.1: Add CSS for dialog and tooltip positioning to main.css**

In `app/assets/css/main.css`, append after the last rule (before end of file):

```css
dialog.app-modal {
  background: transparent;
  border: none;
  padding: 0;
  overflow: visible;
}
dialog.app-modal::backdrop {
  display: none;
}

.app-tooltip-top    { position: absolute; bottom: calc(100% + var(--tt-offset, 6px)); left: 50%; transform: translateX(-50%); pointer-events: none; }
.app-tooltip-bottom { position: absolute; top:    calc(100% + var(--tt-offset, 6px)); left: 50%; transform: translateX(-50%); pointer-events: none; }
.app-tooltip-left   { position: absolute; right:  calc(100% + var(--tt-offset, 6px)); top:  50%; transform: translateY(-50%); pointer-events: none; }
.app-tooltip-right  { position: absolute; left:   calc(100% + var(--tt-offset, 6px)); top:  50%; transform: translateY(-50%); pointer-events: none; }
```

- [ ] **Step 1.2: Create AppModal.vue**

Create `app/components/AppModal.vue`:

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  open: boolean
  lockDismiss?: boolean
}>()
const emit = defineEmits<{ close: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)

watch(() => props.open, async (val) => {
  await nextTick()
  if (!dialogEl.value) return
  if (val) {
    if (!dialogEl.value.open) dialogEl.value.showModal()
  } else {
    if (dialogEl.value.open) dialogEl.value.close()
  }
})

function onCancel(e: Event) {
  e.preventDefault()
  if (!props.lockDismiss) emit('close')
}

function onOverlayClick() {
  if (!props.lockDismiss) emit('close')
}
</script>

<template>
  <dialog ref="dialogEl" class="app-modal" @cancel="onCancel">
    <div class="mui-modal-overlay" @click.self="onOverlayClick">
      <slot />
    </div>
  </dialog>
</template>
```

- [ ] **Step 1.3: Create AppTooltip.vue**

Create `app/components/AppTooltip.vue`:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
}>(), {
  side: 'top',
  sideOffset: 6,
})

const visible = ref(false)
</script>

<template>
  <div
    style="display: inline-flex; position: relative; align-items: center;"
    @mouseenter="visible = true"
    @mouseleave="visible = false"
    @focusin="visible = true"
    @focusout="visible = false"
  >
    <slot name="trigger" />
    <div
      v-show="visible"
      class="mui-tooltip-content"
      :class="`app-tooltip-${props.side}`"
      :style="`--tt-offset: ${props.sideOffset}px;`"
    >
      <slot name="content" />
    </div>
  </div>
</template>
```

- [ ] **Step 1.4: Create useClickOutside.ts**

Create `app/composables/useClickOutside.ts`:

```ts
import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export function useClickOutside(target: Ref<HTMLElement | null>, handler: () => void): void {
  function listener(e: MouseEvent) {
    if (!target.value || target.value.contains(e.target as Node)) return
    handler()
  }
  onMounted(() => document.addEventListener('mousedown', listener, true))
  onUnmounted(() => document.removeEventListener('mousedown', listener, true))
}
```

- [ ] **Step 1.5: Write the failing test for useClickOutside**

Create `tests/unit/utils/useClickOutside.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useClickOutside } from '~/composables/useClickOutside'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

function makeWrapper(handler: () => void) {
  const target = ref<HTMLElement | null>(null)
  const Comp = defineComponent({
    setup() {
      useClickOutside(target, handler)
      return () => h('div', { ref: (el) => { target.value = el as HTMLElement } })
    },
  })
  return mount(Comp)
}

describe('useClickOutside', () => {
  it('calls handler when clicking outside the target', async () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).toHaveBeenCalledOnce()
    document.body.removeChild(outside)
    wrapper.unmount()
  })

  it('does not call handler when clicking inside the target', async () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    wrapper.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('removes listener on unmount', () => {
    const handler = vi.fn()
    const wrapper = makeWrapper(handler)
    wrapper.unmount()
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(handler).not.toHaveBeenCalled()
    document.body.removeChild(outside)
  })
})
```

- [ ] **Step 1.6: Run the test — expect it to fail**

```bash
npm run test:unit -- useClickOutside
```

Expected: FAIL with "Cannot find module '~/composables/useClickOutside'" (file was created in step 1.4, this should actually pass — if `@vue/test-utils` is not installed this will fail differently; proceed to next step)

- [ ] **Step 1.7: Run the test — expect it to pass**

```bash
npm run test:unit -- useClickOutside
```

Expected: all 3 tests PASS. If `@vue/test-utils` is missing from devDependencies, check `package.json` — if absent, skip this test file and delete it (component mounting test requires it). Run `npm run typecheck` instead to verify the composable.

- [ ] **Step 1.8: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 1.9: Commit**

```bash
git add app/components/AppModal.vue app/components/AppTooltip.vue app/composables/useClickOutside.ts app/assets/css/main.css tests/unit/utils/useClickOutside.spec.ts
git commit -m "feat: add AppModal, AppTooltip, useClickOutside — reka-ui replacements"
```

---

### Task 2: Migrate Dialog → AppModal (8 files)

**Files:**
- Modify: `app/components/AuthModal.vue`
- Modify: `app/components/HistoryModal.vue`
- Modify: `app/components/UserSettingsModal.vue`
- Modify: `app/components/AlignmentTrendsModal.vue`
- Modify: `app/components/PlayerEditModal.vue`
- Modify: `app/components/JoinOverlay.vue`
- Modify: `app/components/ConfigureCardDeckModal.vue`
- Modify: `app/pages/[slug].vue`

**Interfaces:**
- Consumes: `AppModal` from Task 1

The migration pattern for every file:

**Remove from `<script setup>`:**
```ts
import {
  DialogRoot, DialogPortal, DialogOverlay, DialogContent,
  DialogTitle, DialogDescription, DialogClose,
} from 'reka-ui'
```

**Add to `<script setup>`:**
```ts
import AppModal from '~/components/AppModal.vue'
```

**Replace in template:**
```html
<!-- BEFORE -->
<DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
  <DialogPortal>
    <DialogOverlay class="mui-modal-overlay">
      <DialogContent class="mui-modal-paper" @pointerdown.stop>
        <DialogTitle as="h2" ...>Title</DialogTitle>
        <DialogDescription as="p" ...>Desc</DialogDescription>
        ...content...
        <DialogClose class="..." :aria-label="...">×</DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</DialogRoot>

<!-- AFTER -->
<AppModal :open="true" @close="emit('close')">
  <div class="mui-modal-paper" @pointerdown.stop>
    <h2 ...>Title</h2>
    <p ...>Desc</p>
    ...content...
    <button class="..." :aria-label="..." @click="emit('close')">×</button>
  </div>
</AppModal>
```

Key rules:
- `DialogTitle as="h2"` → `<h2>` (keep all classes/styles)
- `DialogDescription as="p"` → `<p>` (keep all classes/styles)
- `DialogClose` → `<button>` with `@click="emit('close')"` (keep all classes/styles)
- For `v-if`-gated dialogs in `[slug].vue`: `:open="showRenameRoom"` and `@close="showRenameRoom = false"`

---

- [ ] **Step 2.1: Migrate AuthModal.vue**

Replace the entire `<script setup>` import block and `<template>`:

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
```

Replace the entire `<template>`:
```vue
<template>
  <AppModal :open="true" @close="emit('close')">
    <div class="mui-modal-paper" @pointerdown.stop>
      <h2 class="mui-h5 text-center">
        {{ mode === 'signin' ? $t('common.signIn') : $t('common.signUp') }}
      </h2>
      <p
        v-if="mode === 'signup'"
        class="mui-caption text-center mt-2 text-muted"
      >
        {{ $t('auth.gainModeratorPowers') }}
      </p>
      <div class="flex flex-col gap-3 mt-6">
        <div>
          <input
            v-model.trim="email"
            type="email"
            :placeholder="$t('common.emailPlaceholder')"
            autocomplete="email"
            class="mui-input"
            :class="{ 'is-error': errors.email }"
            @keyup.enter="submit"
          />
          <p v-if="errors.email" class="text-sm mt-1 text-danger">{{ errors.email }}</p>
        </div>

        <div>
          <div v-if="mode === 'signin'" class="flex items-center justify-between gap-3 mb-1">
            <span class="mui-caption">{{ $t('common.password') }}</span>
            <RouterLink to="/forgot-password" class="mui-caption underline hover:no-underline text-primary" @click="emit('close')">
              {{ $t('auth.forgotPassword') }}
            </RouterLink>
          </div>
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
            :placeholder="$t('common.passwordPlaceholder')"
            class="mui-input"
            :class="{ 'is-error': errors.password }"
            @keyup.enter="submit"
          />
          <p v-if="errors.password" class="text-sm mt-1 text-danger">{{ errors.password }}</p>
        </div>

        <div v-if="mode === 'signup'">
          <input
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            :placeholder="$t('common.confirmPasswordPlaceholder')"
            class="mui-input"
            :class="{ 'is-error': errors.confirm }"
            @keyup.enter="submit"
          />
          <p v-if="errors.confirm" class="text-sm mt-1 text-danger">{{ errors.confirm }}</p>
        </div>

        <p v-if="errors.server" class="text-sm text-danger">{{ errors.server }}</p>
        <div class="flex justify-center mt-2">
          <button class="mui-btn" :disabled="loading" @click="submit">
            {{ loading ? (mode === 'signin' ? $t('auth.signingIn') : $t('auth.signingUp')) : (mode === 'signin' ? $t('common.signIn') : $t('common.signUp')) }}
          </button>
        </div>
      </div>
      <button
        class="mui-icon-btn absolute"
        style="top: 8px; right: 8px;"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
      </button>
    </div>
  </AppModal>
</template>
```

- [ ] **Step 2.2: Migrate JoinOverlay.vue**

JoinOverlay must NOT close on ESC or backdrop click — use `lock-dismiss`.

Also remove `@escape-key-down` and `@interact-outside` attributes (no longer needed).

Also remove Tooltip imports from this file — those are handled in Task 3. For now, replace the reka-ui import line with imports for AppModal and AppTooltip:

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
import AppTooltip from '~/components/AppTooltip.vue'
```

Replace `<template>`:
```vue
<template>
  <AppModal :open="true" lock-dismiss @close="emit('close')">
    <div class="mui-modal-paper" @pointerdown.stop>
      <h2 class="mui-h5 text-center">{{ $t('join.title') }}</h2>
      <p class="mui-caption text-center mt-2 text-muted">
        {{ $t('join.subtitle') }}
      </p>
      <div class="flex flex-col gap-4 mt-6">
        <input
          v-model="name"
          type="text"
          :placeholder="$t('join.namePlaceholder')"
          class="mui-input w-full"
          :class="{ 'is-error': hasError }"
          @keyup.enter="submit"
        />
        <section>
          <h3 class="text-mui-caption font-semibold uppercase tracking-wide text-muted mb-2">
            {{ $t('players.roleLabel') }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <AppTooltip v-for="opt in ROLE_TAGS" :key="opt" side="top" :side-offset="6">
              <template #trigger>
                <button
                  type="button"
                  class="mui-shield"
                  style="padding: 6px 12px;"
                  :class="{ 'is-selected': tag === opt }"
                  :aria-pressed="tag === opt"
                  @click="tag = tag === opt ? '' : opt"
                >
                  {{ opt }}
                </button>
              </template>
              <template #content>{{ $t(`players.roleNames.${opt}`, opt) }}</template>
            </AppTooltip>
          </div>
        </section>
        <div class="flex justify-center">
          <button class="mui-btn" @click="submit">{{ $t('join.joinRoom') }}</button>
        </div>
      </div>
      <button
        v-wave
        class="mui-icon-btn absolute"
        style="top: 8px; right: 8px;"
        :aria-label="$t('common.close')"
        @click="emit('close')"
      >
        <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
      </button>
    </div>
  </AppModal>
</template>
```

- [ ] **Step 2.3: Migrate HistoryModal.vue**

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
```

In template: replace `<DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">` and all nested `Dialog*` tags following the same pattern as Step 2.1. `DialogTitle as="h2"` → `<h2>`, `DialogClose` → `<button @click="emit('close')">`.

- [ ] **Step 2.4: Migrate UserSettingsModal.vue**

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
```

In template: apply the same pattern. This modal has `style="max-width: 420px; padding: 32px 40px 40px;"` on `DialogContent` — move that `style` to the `<div class="mui-modal-paper">`.

- [ ] **Step 2.5: Migrate AlignmentTrendsModal.vue**

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
```

In template: apply the same pattern. `DialogTitle as="h2"` → `<h2>`. Check for any `style` on `DialogContent` and move it to the inner div.

- [ ] **Step 2.6: Migrate PlayerEditModal.vue**

PlayerEditModal has both Dialog AND Tooltip. Replace the full reka-ui import with AppModal + AppTooltip.

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
import AppTooltip from '~/components/AppTooltip.vue'
```

In template: apply Dialog→AppModal pattern. For the Tooltip wrapping the role shields, apply AppTooltip pattern (same as JoinOverlay step 2.2). Keep the existing inner content identical.

- [ ] **Step 2.7: Migrate ConfigureCardDeckModal.vue**

ConfigureCardDeckModal has Dialog + Select (Select stays reka-ui until Task 5). Replace only the Dialog imports now.

In `<script setup>`, change the import block from:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'reka-ui'
```
to:
```ts
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'reka-ui'
import AppModal from '~/components/AppModal.vue'
```

In template: apply Dialog→AppModal pattern. `DialogContent` here has `style="max-width: 560px; padding: 32px 40px 40px;"` — move that to `<div class="mui-modal-paper">`. The Select block inside remains unchanged.

- [ ] **Step 2.8: Migrate pages/[slug].vue**

`[slug].vue` has two separate `DialogRoot` blocks: rename-room dialog and kick-confirm dialog. Both are v-if-gated.

In `<script setup>`, replace:
```ts
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
```
with:
```ts
import AppModal from '~/components/AppModal.vue'
```

For **rename-room** dialog (currently `<DialogRoot v-if="showRenameRoom" default-open @update:open="...">`):
```vue
<AppModal :open="showRenameRoom" @close="showRenameRoom = false">
  <div class="mui-modal-paper" @pointerdown.stop>
    <h2 class="mui-h5 mb-4">{{ $t('room.renameTitle') }}</h2>
    <!-- keep the existing content between DialogTitle and DialogClose unchanged -->
    <button
      class="mui-icon-btn absolute"
      style="top: 8px; right: 8px;"
      :aria-label="$t('common.close')"
      @click="showRenameRoom = false"
    >
      <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
    </button>
  </div>
</AppModal>
```

For **kick-confirm** dialog (currently `<DialogRoot v-if="kickTargetId" default-open @update:open="...">`):
```vue
<AppModal :open="!!kickTargetId" @close="kickTargetId = null">
  <div class="mui-modal-paper" @pointerdown.stop>
    <!-- keep the existing content between DialogTitle and DialogClose unchanged -->
    <button
      class="mui-icon-btn absolute"
      style="top: 8px; right: 8px;"
      :aria-label="$t('common.close')"
      @click="kickTargetId = null"
    >
      <AppIcon class="mui-svg-icon" icon="ic:baseline-close" style="font-size: 1.5rem;" />
    </button>
  </div>
</AppModal>
```

- [ ] **Step 2.9: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If errors about missing `reka-ui` symbols — check that all `Dialog*` imports were removed from every file.

- [ ] **Step 2.10: Build check**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 2.11: Commit**

```bash
git add app/components/AuthModal.vue app/components/HistoryModal.vue app/components/UserSettingsModal.vue app/components/AlignmentTrendsModal.vue app/components/PlayerEditModal.vue app/components/JoinOverlay.vue app/components/ConfigureCardDeckModal.vue "app/pages/[slug].vue"
git commit -m "feat: migrate Dialog → AppModal in all 8 files"
```

---

### Task 3: Migrate Tooltip → AppTooltip (5 files)

**Files:**
- Modify: `app/components/CardsArea.vue`
- Modify: `app/components/Timer.vue`
- Modify: `app/components/PlayerRow.vue`
- (JoinOverlay and PlayerEditModal already done in Task 2)

**Interfaces:**
- Consumes: `AppTooltip` from Task 1

Migration pattern for each file:

**Remove from `<script setup>`:**
```ts
import { TooltipRoot, TooltipTrigger, TooltipPortal, TooltipContent } from 'reka-ui'
```

**Add to `<script setup>`:**
```ts
import AppTooltip from '~/components/AppTooltip.vue'
```

**Replace in template:**
```html
<!-- BEFORE -->
<TooltipRoot>
  <TooltipTrigger as-child>
    <button>...</button>
  </TooltipTrigger>
  <TooltipPortal>
    <TooltipContent class="mui-tooltip-content" side="top" :side-offset="6">
      {{ label }}
    </TooltipContent>
  </TooltipPortal>
</TooltipRoot>

<!-- AFTER -->
<AppTooltip side="top" :side-offset="6">
  <template #trigger>
    <button>...</button>
  </template>
  <template #content>{{ label }}</template>
</AppTooltip>
```

Note: drop the `class="mui-tooltip-content"` from the content slot — `AppTooltip` applies it automatically.

---

- [ ] **Step 3.1: Migrate CardsArea.vue**

CardsArea has 3 tooltip instances (one for the reveal/reset area, two for countdown mode options). All follow the pattern above.

In `<script setup>`, remove `TooltipRoot, TooltipTrigger, TooltipPortal, TooltipContent` from the reka-ui import. If no other reka-ui symbols remain, remove the entire `from 'reka-ui'` import. Add `import AppTooltip from '~/components/AppTooltip.vue'`.

In template, find each `<TooltipRoot>` block and apply the pattern above.

- [ ] **Step 3.2: Migrate Timer.vue**

Timer has 5 tooltip instances (reset, pause, resume, adjust-30 buttons). Timer currently imports only `TooltipRoot, TooltipTrigger, TooltipPortal, TooltipContent` from reka-ui.

In `<script setup>`, replace the full reka-ui import with:
```ts
import AppTooltip from '~/components/AppTooltip.vue'
```

In template, replace all 5 `<TooltipRoot>` blocks with `<AppTooltip>`.

- [ ] **Step 3.3: Migrate PlayerRow.vue**

PlayerRow has ~9 tooltip instances AND a Dropdown (Dropdown is migrated in Task 4). Replace only tooltip imports now; keep DropdownMenu* imports temporarily.

In `<script setup>`, change the reka-ui import from:
```ts
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from 'reka-ui'
```
to:
```ts
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from 'reka-ui'
import AppTooltip from '~/components/AppTooltip.vue'
```

In template, replace all `<TooltipRoot>` blocks with `<AppTooltip>`. The DropdownMenu blocks remain unchanged.

- [ ] **Step 3.4: Typecheck and test**

```bash
npm run typecheck && npm test
```

Expected: no errors, all tests PASS.

- [ ] **Step 3.5: Commit**

```bash
git add app/components/CardsArea.vue app/components/Timer.vue app/components/PlayerRow.vue
git commit -m "feat: migrate Tooltip → AppTooltip in CardsArea, Timer, PlayerRow"
```

---

### Task 4: Migrate Dropdown → inline v-if (AppHeader.vue + PlayerRow.vue)

**Files:**
- Modify: `app/components/AppHeader.vue`
- Modify: `app/components/PlayerRow.vue`

**Interfaces:**
- Consumes: `useClickOutside` from Task 1

Key mapping:
- `DropdownMenuRoot` → wrapper `<div ref="menuRef" style="position: relative;">`
- `DropdownMenuTrigger` → trigger `<button>` with `@click="menuOpen = !menuOpen"`
- `DropdownMenuPortal` → remove (no portal needed)
- `DropdownMenuContent` → `<ul v-if="menuOpen" class="mui-menu z-50" style="position: absolute; right: 0; top: calc(100% + 4px); min-width: ...">`
- `DropdownMenuItem @select="..."` → `<li class="mui-menu-item" role="menuitem" @click="...; menuOpen = false">`
- `DropdownMenuCheckboxItem @select.prevent="fn"` → `<li class="mui-menu-item" role="menuitem" @click.stop="fn">` (no close)
- `DropdownMenuSeparator` → `<hr class="mui-divider">`

---

- [ ] **Step 4.1: Migrate AppHeader.vue**

In `<script setup>`, replace the full reka-ui import with:
```ts
import { useClickOutside } from '~/composables/useClickOutside'
```

Add to the script body (after existing refs):
```ts
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })
```

Replace the entire dropdown block in the template (from `<DropdownMenuRoot>` to `</DropdownMenuRoot>`) with:

```vue
<div ref="menuRef" style="position: relative;">
  <button
    v-wave
    class="mui-icon-btn text-white"
    style="--hover-bg: rgba(255,255,255,0.08);"
    :aria-label="$t('header.currentUserAccount')"
    :aria-expanded="menuOpen"
    data-testid="account-menu-button"
    @click="menuOpen = !menuOpen"
  >
    <img
      v-if="myAvatarUri"
      :src="myAvatarUri"
      class="w-7 h-7 rounded-full"
      :alt="playerName"
      :style="{ opacity: profileFetched ? 1 : 0, transition: 'opacity 0.15s' }"
    >
    <AppIcon
      v-else
      class="mui-svg-icon"
      icon="ic:baseline-account-circle"
      style="font-size: 1.5rem;"
    />
  </button>

  <ul
    v-if="menuOpen"
    class="mui-menu z-50"
    role="menu"
    style="position: absolute; right: 0; top: calc(100% + 4px); min-width: 240px;"
    @keydown.escape="menuOpen = false"
  >
    <template v-if="isModerator">
      <li
        v-wave
        class="mui-menu-item whitespace-nowrap"
        role="menuitem"
        tabindex="0"
        @click="emit('openCardDeck'); menuOpen = false"
        @keydown.enter="emit('openCardDeck'); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-settings" />
        {{ $t('header.configureCardDeck') }}
      </li>
      <li
        v-if="user"
        v-wave
        class="mui-menu-item whitespace-nowrap"
        role="menuitem"
        tabindex="0"
        @click="emit('openRenameRoom'); menuOpen = false"
        @keydown.enter="emit('openRenameRoom'); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-edit" />
        {{ $t('header.renameRoom') }}
      </li>
      <hr class="mui-divider">
    </template>

    <template v-if="user">
      <li
        v-wave
        class="mui-menu-item whitespace-nowrap"
        role="menuitem"
        tabindex="0"
        @click="emit('openAccountSettings'); menuOpen = false"
        @keydown.enter="emit('openAccountSettings'); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-settings" />
        {{ $t('header.accountSettings') }}
      </li>
      <hr class="mui-divider">
    </template>

    <li
      v-wave
      class="mui-menu-item whitespace-nowrap"
      role="menuitem"
      tabindex="0"
      @click="emit('openHistory'); menuOpen = false"
      @keydown.enter="emit('openHistory'); menuOpen = false"
    >
      <AppIcon class="mui-menu-icon" icon="ic:baseline-history" />
      {{ $t('header.history') }}
    </li>
    <li
      v-wave
      class="mui-menu-item whitespace-nowrap"
      role="menuitem"
      tabindex="0"
      @click="emit('openAlignmentTrends'); menuOpen = false"
      @keydown.enter="emit('openAlignmentTrends'); menuOpen = false"
    >
      <AppIcon class="mui-menu-icon" icon="ic:baseline-trending-up" />
      {{ $t('header.alignmentTrends') }}
    </li>
    <hr class="mui-divider">

    <li
      v-wave
      class="mui-menu-item whitespace-nowrap"
      role="menuitem"
      tabindex="0"
      @click.stop="toggleTheme"
    >
      <AppIcon class="mui-menu-icon" :icon="isLight ? 'ic:baseline-light-mode' : 'ic:baseline-dark-mode'" />
      <span class="flex-1">{{ isLight ? $t('header.lightTheme') : $t('header.darkTheme') }}</span>
      <span class="mui-switch">
        <input type="checkbox" :checked="isLight" tabindex="-1" readonly>
        <span class="track" />
        <span class="thumb" />
      </span>
    </li>

    <template v-if="!user">
      <hr class="mui-divider">
      <li
        v-wave
        class="mui-menu-item whitespace-nowrap"
        role="menuitem"
        tabindex="0"
        data-testid="auth-sign-in-menu-item"
        @click="emit('openSignIn'); menuOpen = false"
        @keydown.enter="emit('openSignIn'); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-login" />
        {{ $t('common.signIn') }}
      </li>
      <li
        v-wave
        class="mui-menu-item whitespace-nowrap"
        role="menuitem"
        tabindex="0"
        @click="emit('openSignUp'); menuOpen = false"
        @keydown.enter="emit('openSignUp'); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-person-add" />
        {{ $t('common.signUp') }}
      </li>
    </template>
    <template v-else>
      <hr class="mui-divider">
      <li
        v-wave
        class="mui-menu-item whitespace-nowrap"
        role="menuitem"
        tabindex="0"
        data-testid="auth-sign-out-menu-item"
        @click="emit('signOut'); menuOpen = false"
        @keydown.enter="emit('signOut'); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-logout" />
        {{ $t('common.signOut') }}
      </li>
    </template>
  </ul>
</div>
```

Also add `ref` to the imports from Vue: `import { ref, computed, watch, nextTick } from 'vue'` already includes `ref`.

- [ ] **Step 4.2: Migrate PlayerRow.vue dropdown**

In `<script setup>`, remove all remaining reka-ui imports. Add useClickOutside:
```ts
import { useClickOutside } from '~/composables/useClickOutside'
```

Add to script body:
```ts
const menuRef = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
useClickOutside(menuRef, () => { menuOpen.value = false })
```

Replace the dropdown block in template (the last `<div style="width: 36px; height: 36px;">` block containing `DropdownMenuRoot`):

```vue
<div
  ref="menuRef"
  class="flex items-center justify-center"
  style="width: 36px; height: 36px; position: relative;"
>
  <button
    v-if="isOwn || currentUserIsAuthorizedModerator"
    v-wave
    class="mui-icon-btn"
    style="padding: 4px;"
    :aria-expanded="menuOpen"
    @click="menuOpen = !menuOpen"
  >
    <AppIcon
      class="mui-svg-icon text-muted dark:text-inverse"
      icon="ic:baseline-more-vert"
      style="font-size: 1.5rem;"
    />
  </button>

  <ul
    v-if="menuOpen"
    class="mui-menu z-50"
    role="menu"
    style="position: absolute; right: 0; top: calc(100% + 4px); min-width: 200px;"
    @keydown.escape="menuOpen = false"
  >
    <template v-if="isOwn">
      <li
        v-wave
        class="mui-menu-item"
        role="menuitem"
        tabindex="0"
        @click.stop="emit('toggleModerator', player.id, !player.is_moderator)"
      >
        <AppIcon class="mui-menu-icon" icon="app:moderator" />
        <span class="flex-1">{{ $t('players.isModerator') }}</span>
        <span class="mui-switch">
          <input type="checkbox" :checked="player.is_moderator" tabindex="-1" readonly>
          <span class="track" />
          <span class="thumb" />
        </span>
      </li>
      <li
        v-wave
        class="mui-menu-item"
        role="menuitem"
        tabindex="0"
        @click="emit('edit', player.id); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-edit" />
        {{ $t('players.edit') }}
      </li>
      <li
        v-wave
        class="mui-menu-item"
        role="menuitem"
        tabindex="0"
        @click="emit('leave', player.id); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="app:leave-room" />
        {{ $t('players.leaveRoom') }}
      </li>
    </template>
    <template v-else-if="currentUserIsAuthorizedModerator">
      <li
        v-wave
        class="mui-menu-item"
        role="menuitem"
        tabindex="0"
        @click="emit('edit', player.id); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-edit" />
        {{ $t('players.edit') }}
      </li>
      <li
        v-wave
        class="mui-menu-item"
        role="menuitem"
        tabindex="0"
        @click="emit('kick', player.id); menuOpen = false"
      >
        <AppIcon class="mui-menu-icon" icon="ic:baseline-person-remove" />
        {{ $t('players.kickPlayer') }}
      </li>
    </template>
  </ul>
</div>
```

Also add `ref` to the Vue import in PlayerRow.vue: `import { computed, ref } from 'vue'`.

- [ ] **Step 4.3: Typecheck and test**

```bash
npm run typecheck && npm test
```

Expected: no errors, all tests PASS.

- [ ] **Step 4.4: Commit**

```bash
git add app/components/AppHeader.vue app/components/PlayerRow.vue
git commit -m "feat: migrate DropdownMenu → inline v-if in AppHeader and PlayerRow"
```

---

### Task 5: Remove TooltipProvider + migrate Select → native

**Files:**
- Modify: `app/App.vue`
- Modify: `app/components/ConfigureCardDeckModal.vue`

**Interfaces:**
- After this task: zero reka-ui usage remains in any file

---

- [ ] **Step 5.1: Remove TooltipProvider from App.vue**

Replace `app/App.vue` entirely:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import ConnectionBanner from '~/components/ConnectionBanner.vue'
import { useTheme } from '~/composables/useTheme'

const { init } = useTheme()
onMounted(() => init())
</script>

<template>
  <div class="min-h-screen bg-app text-body">
    <ConnectionBanner />
    <RouterView />
  </div>
</template>
```

- [ ] **Step 5.2: Replace Select → native in ConfigureCardDeckModal.vue**

In `<script setup>`, remove the remaining reka-ui import entirely:
```ts
// Remove this whole block:
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'reka-ui'
```

In the template, replace the `<SelectRoot>` block (inside the `<div class="mt-7 flex justify-center">`):

```vue
<div class="mt-7 flex justify-center">
  <select
    class="mui-input"
    style="min-width: 240px; cursor: pointer;"
    :value="presetId"
    @change="(e) => applyPreset((e.target as HTMLSelectElement).value as DeckPresetId)"
  >
    <option
      v-for="p in DECK_PRESETS"
      :key="p.id"
      :value="p.id"
    >{{ p.name }}</option>
  </select>
</div>
```

- [ ] **Step 5.3: Verify zero reka-ui usage**

```bash
grep -r "reka-ui" app/ --include="*.vue" --include="*.ts"
```

Expected: no output. If any file still imports from reka-ui, fix it before proceeding.

- [ ] **Step 5.4: Typecheck and test**

```bash
npm run typecheck && npm test
```

Expected: no errors, all tests PASS.

- [ ] **Step 5.5: Commit**

```bash
git add app/App.vue app/components/ConfigureCardDeckModal.vue
git commit -m "feat: remove TooltipProvider, replace Select with native in ConfigureCardDeckModal"
```

---

### Task 6: CSS cleanup in main.css

**Files:**
- Modify: `app/assets/css/main.css`

Remove all shadcn-specific CSS blocks from `main.css`. The app's own `.mui-*` classes, `@theme`, and theme variables remain untouched.

---

- [ ] **Step 6.1: Remove `@import "tw-animate-css"` (line 6)**

Delete the line:
```css
@import "tw-animate-css";
```

- [ ] **Step 6.2: Remove `@import "shadcn-vue/tailwind.css"` (line 8)**

Delete the line:
```css
@import "shadcn-vue/tailwind.css";
```

- [ ] **Step 6.3: Remove the `@theme inline` block**

Delete the entire block that starts with `@theme inline {` and ends with its closing `}`. This block maps shadcn CSS variables to Tailwind color tokens (`--color-sidebar-*`, `--color-chart-*`, `--color-ring`, `--color-input`, `--color-border`, `--color-destructive`, `--color-accent*`, `--color-muted-foreground`, `--color-secondary*`, `--color-primary-foreground`, `--color-popover*`, `--color-card*`, `--color-foreground`, `--color-background`, `--radius-*`, `--font-sans`, `--font-heading`).

- [ ] **Step 6.4: Remove shadcn `:root { --background: oklch... }` block**

Delete the `:root` block that contains `--background: oklch(1 0 0)`, `--foreground`, `--card`, `--popover`, `--primary: oklch(0.205 0 0)`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border: oklch(0.922 0 0)`, `--input`, `--ring`, `--chart-1` through `--chart-5`, `--radius`, `--sidebar` and related sidebar vars.

- [ ] **Step 6.5: Remove shadcn `html[data-theme='dark'] { --background: oklch... }` block**

Delete the `html[data-theme='dark']` block that contains `--background: oklch(0.145 0 0)`, `--foreground: oklch(0.985 0 0)`, etc. (The app's own `html[data-theme='dark']` block which sets `--bg-app`, `--primary: #546e7a`, etc. must remain.)

- [ ] **Step 6.6: Clean up `@layer base`**

The current `@layer base` block:
```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop {
    border-color: var(--border);
  }
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    @apply font-sans;
  }
}
```

Replace with:
```css
@layer base {
  *,
  ::after,
  ::before,
  ::backdrop {
    border-color: var(--border);
  }
}
```

(Remove `@apply border-border outline-ring/50` — uses shadcn tokens. Remove `@apply bg-background text-foreground` — uses shadcn tokens; the app sets body colors directly below. Remove `@apply font-sans` — font set in `html, body { font-family: ... }` below.)

- [ ] **Step 6.7: Build and verify**

```bash
npm run build
```

Expected: no errors. Check browser: dark mode background should still be `rgb(33,33,33)`, text primary `rgb(245,245,245)`.

- [ ] **Step 6.8: Commit**

```bash
git add app/assets/css/main.css
git commit -m "chore: remove shadcn CSS imports and token blocks from main.css"
```

---

### Task 7: Remove packages and delete files

**Files:**
- Delete: `app/lib/utils.ts`
- Delete: `components.json`
- Modify: `package.json` (via npm remove)
- Modify: `package-lock.json` (auto-updated)

---

- [ ] **Step 7.1: Verify utils.ts has no importers**

```bash
grep -r "lib/utils\|from '~/lib/utils'" app/ --include="*.vue" --include="*.ts"
```

Expected: no output. If any file imports from `~/lib/utils`, fix it first.

- [ ] **Step 7.2: Delete utils.ts and components.json**

```bash
rm app/lib/utils.ts components.json
```

- [ ] **Step 7.3: Remove npm packages**

```bash
npm remove reka-ui shadcn-vue class-variance-authority clsx tailwind-merge tw-animate-css @lucide/vue
```

- [ ] **Step 7.4: Verify packages are gone**

```bash
grep -E "reka-ui|shadcn-vue|class-variance|tailwind-merge|tw-animate|@lucide" package.json
```

Expected: no output.

- [ ] **Step 7.5: Full test suite**

```bash
npm run typecheck && npm test && npm run build
```

Expected: all pass, no errors.

- [ ] **Step 7.6: Commit**

```bash
git add package.json package-lock.json
git rm app/lib/utils.ts components.json
git commit -m "chore: remove shadcn-vue and all 6 associated packages"
```

---

### Task 8: Update docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

---

- [ ] **Step 8.1: Update README.md**

Remove the line `* [Reka UI](https://reka-ui.com)` from the **Used** section.

- [ ] **Step 8.2: Update CLAUDE.md — UI section**

Find the **UI** bullet in the Tech Stack section. It currently lists `reka-ui@2.9.8` and references shadcn-vue. Update to remove those references and add the new primitives. The key changes:
- Remove: `reka-ui@2.9.8 (headless Radix-Vue port) — TooltipProvider в App.vue, dialog/popover/switch-примітиви в модалках, CardsArea, AppHeader, PlayerRow, Timer, [slug].vue`
- Remove: shadcn-vue paragraph (`shadcn-vue ініціалізовано...`)
- Add (to Components bullet): `AppModal` (native `<dialog>`, `app/components/AppModal.vue`), `AppTooltip` (`app/components/AppTooltip.vue`), `useClickOutside` (`app/composables/useClickOutside.ts`)

- [ ] **Step 8.3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: remove reka-ui and shadcn-vue references, document new primitives"
```

---

## Verification Checklist

After all tasks are complete, manually verify in the browser (`npm run dev`):

- [ ] Modals open on click and close via: X button, ESC key, backdrop click
- [ ] JoinOverlay modal does NOT close on ESC or backdrop click
- [ ] Tooltips appear on hover over player avatars, role tags, moderator icon, vote icons, timer buttons, card area buttons
- [ ] AppHeader dropdown opens/closes on avatar button click; closes when clicking outside
- [ ] PlayerRow dropdown (⋮ button) opens/closes; moderator toggle works without closing menu; leave/kick/edit close menu
- [ ] Deck preset selector in ConfigureCardDeckModal switches presets correctly
- [ ] Light/dark theme toggle in header menu works
- [ ] `npm run typecheck` — no errors
- [ ] `npm test` — all pass
- [ ] `npm run build` — no errors
- [ ] `grep -r "reka-ui\|shadcn-vue" app/` — no output

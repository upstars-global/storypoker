# Remove shadcn-vue and Dependencies

**Date:** 2026-07-02
**Status:** approved

## Context

shadcn-vue and reka-ui are used exclusively as headless primitives for four UI patterns: Dialog, Tooltip, Select, and DropdownMenu. No shadcn UI components (`app/components/ui/`) are installed. All CSS classes for the replacements are already defined in `main.css`. The dependencies add bundle weight, conflict with design system tokens, and offer no advantage over native browser APIs.

## Goal

Remove 7 npm packages without any regression in UI behavior or appearance.

## Dependencies to Remove

| Package | Current usage |
|---|---|
| `reka-ui` | Dialog, Tooltip, Select, DropdownMenu primitives - 13 files |
| `shadcn-vue` | `@import` in `main.css`, CLI generator |
| `class-variance-authority` | only `app/lib/utils.ts` - nobody imports it |
| `clsx` | only `app/lib/utils.ts` |
| `tailwind-merge` | only `app/lib/utils.ts` |
| `tw-animate-css` | `@import` in `main.css` - unused |
| `@lucide/vue` | no direct imports; icon names in `iconMap.ts` resolve through the Iconify API |

Removal command:
```bash
npm remove reka-ui shadcn-vue class-variance-authority clsx tailwind-merge tw-animate-css @lucide/vue
```

## New Components

### AppModal.vue

**Location:** `app/components/AppModal.vue`

**Props:**
1. `open: boolean` - controls visibility

**Emits:**
1. `close` - closing (ESC, backdrop click)

**Slots:**
1. `default` - modal content (each modal supplies its own `.mui-modal-paper`)

**Behavior:**
1. `<dialog>` receives the `mui-modal-overlay` class (fixed overlay with flex centering), as `DialogOverlay` does now
2. `watch(open, val => val ? dialogEl.showModal() : dialogEl.close())`
3. ESC: `@cancel.prevent="$emit('close')"`
4. Backdrop click: `@click.self="$emit('close')"` on `<dialog>` - fires only if the target is `<dialog>` itself (the area outside `.mui-modal-paper`)
5. `@pointerdown.stop` remains on `.mui-modal-paper` in each modal (prevents bubbling)
6. It does not add its own `.mui-modal-paper`; that remains in each modal as it does now

**Why native `<dialog>`:** built-in focus trap, ESC, backdrop, and aria-modal come for free. Support is 96%+.

### AppTooltip.vue

**Location:** `app/components/AppTooltip.vue`

**Props:**
1. `side?: 'top' | 'bottom' | 'left' | 'right'` - default `'top'`
2. `sideOffset?: number` - default `6` (px)

**Slots:**
1. `#trigger` - trigger element (rendered using the `as-child` pattern or a wrapper)
2. `#content` - tooltip content

**Behavior:**
1. Show: `mouseenter` / `focusin` on the trigger
2. Hide: `mouseleave` / `focusout` on the trigger
3. Positioning: `position: absolute` relative to a `position: relative` wrapper
4. The `.mui-tooltip-content` class on the content (already exists in `main.css`)
5. `pointer-events: none` on the tooltip

### useClickOutside.ts

**Location:** `app/composables/useClickOutside.ts`

**Signature:**
```ts
function useClickOutside(target: Ref<HTMLElement | null>, handler: () => void): void
```

**Behavior:** `addEventListener('mousedown', cb, true)` on `document` in `onMounted`, cleanup in `onUnmounted`. Calls `handler` if the click is outside `target.value`.

## Replacement Map

### Dialog → AppModal (8 files)

Files: `AuthModal.vue`, `ConfigureCardDeckModal.vue`, `HistoryModal.vue`, `JoinOverlay.vue`, `PlayerEditModal.vue`, `UserSettingsModal.vue`, `AlignmentTrendsModal.vue`, `pages/[slug].vue`

**Pattern before:**
```vue
<DialogRoot default-open @update:open="(open) => { if (!open) emit('close') }">
  <DialogPortal>
    <DialogOverlay class="mui-modal-overlay">
      <DialogContent class="mui-modal-paper" @pointerdown.stop>
        <DialogTitle as="h2">...</DialogTitle>
        <DialogDescription as="p">...</DialogDescription>
        <DialogClose @click="emit('close')">×</DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</DialogRoot>
```

**Pattern after:**
```vue
<AppModal :open="true" @close="emit('close')">
  <div class="mui-modal-paper" @pointerdown.stop>
    <h2>...</h2>
    <p>...</p>
    <button @click="emit('close')">×</button>
  </div>
</AppModal>
```

### Tooltip → AppTooltip (5 files)

Files: `CardsArea.vue`, `Timer.vue`, `PlayerRow.vue`, `JoinOverlay.vue`, `PlayerEditModal.vue`

**Pattern before:**
```vue
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
```

**Pattern after:**
```vue
<AppTooltip side="top" :side-offset="6">
  <template #trigger>
    <button>...</button>
  </template>
  <template #content>{{ label }}</template>
</AppTooltip>
```

### Select → native (1 file)

File: `ConfigureCardDeckModal.vue`

`SelectRoot/Trigger/Value/Portal/Content/Viewport/Item/ItemText` → `<select class="mui-input" v-model="…">` with `<option v-for>`. Values are simple strings (DeckPresetId); custom rendering is unnecessary.

### DropdownMenu → inline v-if (1 file)

File: `AppHeader.vue`

`DropdownMenuRoot/Trigger/Portal/Content/Item/CheckboxItem/Separator` → `v-if="menuOpen"` + `useClickOutside`. The CSS classes `.mui-menu`, `.mui-menu-item`, and `.mui-divider` already exist. `menuOpen = ref(false)`.

### TooltipProvider → remove (App.vue)

Remove `import { TooltipProvider }` and the `<TooltipProvider>` wrapper, leaving only `<RouterView />`.

## Files to Remove

1. `app/lib/utils.ts` - `cn()` is unused
2. `components.json` - shadcn CLI config

## CSS Changes (main.css)

**Remove:**
1. `@import "shadcn-vue/tailwind.css"`
2. `@import "tw-animate-css"`
3. The entire `@theme inline { ... }` block (shadcn tokens)
4. The shadcn `:root { --background: oklch... }` block
5. The shadcn `html[data-theme='dark'] { --background: oklch... }` block

**Fix `@layer base`** - replace shadcn applies with direct CSS:
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

## Changes to CLAUDE.md and README.md

1. `CLAUDE.md` - remove the shadcn-vue paragraph from the Components section; remove `reka-ui` from the UI library list; add `AppModal`, `AppTooltip`, and `useClickOutside` as custom primitives
2. `README.md` - remove the line `* [Reka UI](https://reka-ui.com)` from the Used section

## Success Criteria

1. `npm run typecheck` completes without errors
2. `npm test` passes without regressions
3. `npm run build` completes without errors
4. All 7 packages are absent from `node_modules` and `package.json`
5. Modals open and close; ESC and backdrop clicks work
6. Tooltips appear on hover/focus
7. The dropdown in AppHeader opens and closes on an outside click
8. Select in ConfigureCardDeckModal switches presets

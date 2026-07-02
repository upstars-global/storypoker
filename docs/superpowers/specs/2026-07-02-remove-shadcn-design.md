# Видалення shadcn-vue та залежностей

**Дата:** 2026-07-02
**Статус:** затверджено

## Контекст

shadcn-vue і reka-ui використовуються виключно як headless-примітиви для чотирьох UI-патернів: Dialog, Tooltip, Select, DropdownMenu. Жодного shadcn UI-компонента (`app/components/ui/`) не встановлено. Усі CSS класи для замінників вже визначені у `main.css`. Залежності додають вагу бандлу, конфліктують із токенами системи дизайну і не дають жодної переваги понад рідні браузерні API.

## Мета

Видалити 7 npm-пакетів без жодної регресії у поведінці або зовнішньому вигляді UI.

## Залежності до видалення

| Пакет | Поточне використання |
|---|---|
| `reka-ui` | Dialog, Tooltip, Select, DropdownMenu примітиви — 13 файлів |
| `shadcn-vue` | `@import` у `main.css`, CLI-генератор |
| `class-variance-authority` | тільки `app/lib/utils.ts` — ніхто не імпортує |
| `clsx` | тільки `app/lib/utils.ts` |
| `tailwind-merge` | тільки `app/lib/utils.ts` |
| `tw-animate-css` | `@import` у `main.css` — не використовується |
| `@lucide/vue` | жодних прямих imports; назви іконок у `iconMap.ts` резолвляться через Iconify API |

Команда видалення:
```bash
npm remove reka-ui shadcn-vue class-variance-authority clsx tailwind-merge tw-animate-css @lucide/vue
```

## Нові компоненти

### AppModal.vue

**Розташування:** `app/components/AppModal.vue`

**Props:**
- `open: boolean` — керує видимістю

**Emits:**
- `close` — закриття (ESC, клік на backdrop)

**Slots:**
- `default` — вміст модалки (кожна модалка сама задає `.mui-modal-paper`)

**Поведінка:**
- `<dialog>` отримує клас `mui-modal-overlay` (fixed overlay з flex-centering) — так само як `DialogOverlay` зараз
- `watch(open, val => val ? dialogEl.showModal() : dialogEl.close())`
- ESC: `@cancel.prevent="$emit('close')"`
- Клік на backdrop: `@click.self="$emit('close')"` на `<dialog>` — спрацьовує лише якщо target є самим `<dialog>` (область поза `.mui-modal-paper`)
- `@pointerdown.stop` залишається на `.mui-modal-paper` у кожній модалці (запобігає bubbling)
- Не додає власного `.mui-modal-paper` — він залишається у кожній модалці як зараз

**Чому native `<dialog>`:** вбудований focus trap, ESC, backdrop, aria-modal — безкоштовно. Підтримка 96%+.

### AppTooltip.vue

**Розташування:** `app/components/AppTooltip.vue`

**Props:**
- `side?: 'top' | 'bottom' | 'left' | 'right'` — default `'top'`
- `sideOffset?: number` — default `6` (px)

**Slots:**
- `#trigger` — елемент-тригер (рендериться через `as-child` паттерн або обгортку)
- `#content` — вміст тултіпу

**Поведінка:**
- Показ: `mouseenter` / `focusin` на тригері
- Приховання: `mouseleave` / `focusout` на тригері
- Позиціонування: `position: absolute` відносно `position: relative` обгортки
- Клас `.mui-tooltip-content` на контенті (вже існує у `main.css`)
- `pointer-events: none` на тултіпі

### useClickOutside.ts

**Розташування:** `app/composables/useClickOutside.ts`

**Сигнатура:**
```ts
function useClickOutside(target: Ref<HTMLElement | null>, handler: () => void): void
```

**Поведінка:** `addEventListener('mousedown', cb, true)` на `document` у `onMounted`, cleanup у `onUnmounted`. Викликає `handler` якщо клік не всередині `target.value`.

## Карта замінників

### Dialog → AppModal (8 файлів)

Файли: `AuthModal.vue`, `ConfigureCardDeckModal.vue`, `HistoryModal.vue`, `JoinOverlay.vue`, `PlayerEditModal.vue`, `UserSettingsModal.vue`, `AlignmentTrendsModal.vue`, `pages/[slug].vue`

**Патерн до:**
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

**Патерн після:**
```vue
<AppModal :open="true" @close="emit('close')">
  <div class="mui-modal-paper" @pointerdown.stop>
    <h2>...</h2>
    <p>...</p>
    <button @click="emit('close')">×</button>
  </div>
</AppModal>
```

### Tooltip → AppTooltip (5 файлів)

Файли: `CardsArea.vue`, `Timer.vue`, `PlayerRow.vue`, `JoinOverlay.vue`, `PlayerEditModal.vue`

**Патерн до:**
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

**Патерн після:**
```vue
<AppTooltip side="top" :side-offset="6">
  <template #trigger>
    <button>...</button>
  </template>
  <template #content>{{ label }}</template>
</AppTooltip>
```

### Select → native (1 файл)

Файл: `ConfigureCardDeckModal.vue`

`SelectRoot/Trigger/Value/Portal/Content/Viewport/Item/ItemText` → `<select class="mui-input" v-model="…">` з `<option v-for>`. Значення — прості рядки (DeckPresetId), кастомний рендеринг не потрібен.

### DropdownMenu → inline v-if (1 файл)

Файл: `AppHeader.vue`

`DropdownMenuRoot/Trigger/Portal/Content/Item/CheckboxItem/Separator` → `v-if="menuOpen"` + `useClickOutside`. CSS класи `.mui-menu`, `.mui-menu-item`, `.mui-divider` вже є. `menuOpen = ref(false)`.

### TooltipProvider → видалити (App.vue)

Прибрати `import { TooltipProvider }`, прибрати обгортку `<TooltipProvider>` — залишити тільки `<RouterView />`.

## Файли до видалення

- `app/lib/utils.ts` — `cn()` ніде не використовується
- `components.json` — shadcn CLI конфіг

## Зміни в CSS (main.css)

**Видалити:**
- `@import "shadcn-vue/tailwind.css"`
- `@import "tw-animate-css"`
- Весь блок `@theme inline { ... }` (shadcn-токени)
- Shadcn `:root { --background: oklch... }` блок
- Shadcn `html[data-theme='dark'] { --background: oklch... }` блок

**Виправити `@layer base`** — замінити shadcn applies на прямий CSS:
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

## Зміни в CLAUDE.md та README.md

- `CLAUDE.md` — прибрати абзац про shadcn-vue з секції Components; прибрати `reka-ui` з переліку UI-бібліотек; додати `AppModal`, `AppTooltip`, `useClickOutside` як власні примітиви
- `README.md` — прибрати рядок `* [Reka UI](https://reka-ui.com)` з секції Used

## Критерії успіху

- `npm run typecheck` без помилок
- `npm test` без регресій
- `npm run build` без помилок
- Всі 7 пакетів відсутні у `node_modules` і `package.json`
- Модалки відкриваються/закриваються, ESC і backdrop клік працюють
- Тултіпи показуються при hover/focus
- Дропдаун у AppHeader відкривається і закривається кліком поза
- Select у ConfigureCardDeckModal перемикає пресети

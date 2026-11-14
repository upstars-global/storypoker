# Виправлення за аудитом фронтенду 2026-09-07

**Дата:** 2026-09-08
**Статус:** реалізовано (план - `docs/plans/2026-09-08-frontend-audit-remediation.md`)
**Джерело:** `docs/audits/2026-09-07-frontend-design-audit.md` (11 знахідок, F-1…F-11)

## Контекст

Аудит `frontend-crafting` (read-only, статичний) підтвердив міцний baseline (справжні `<button>`, `focus-visible`,
`aria-label` у `Timer`, kick із підтвердженням) і виявив два системні розриви - відсутність
`prefers-reduced-motion` і зафіксований `lang="uk"` - плюс дев'ять ізольованих дефектів семантики, іменування й
клавіатурного контракту. Усі знахідки перевірені повторно на поточній гілці `upd-deps-and-agent-context`:
код у названих локаціях збігається з аудитом.

Два уточнення до аудиту, які змінюють обсяг:

- **F-9:** `DESIGN.md` §11.7 уже документує пороги `> 3.5` / `2.5 ≤ x ≤ 3.5` / `< 2.5`. Бракує не документа, а
  фрази про походження чисел і іменованих констант у коді. Значення не змінюються.
- **F-7:** «дешевий шлях» (зняти `role="menu"`) лишає `<li tabindex="0" @click>` без ролі, тобто створює саме
  німі клікабельні елементи, за відсутність яких аудит хвалить проєкт; до того ж `PlayerRow.spec.ts` і
  `activateMenuItem` спираються на ці ролі. Обрано повний контракт стрілок через спільний composable.

## Мета

Закрити всі MUST-порушення з аудиту так, щоб користувач клавіатури, скрінрідера або з чутливістю до руху міг
пройти повний цикл кімнати (вхід, голосування, reveal, історія, вихід) без втрати інформації й контролю. Кожна
знахідка отримує unit- або e2e-специфікацію там, де є тестовий шов; решта - typecheck + ручний сценарій.

## Обмеження та рішення

| Питання | Рішення |
| --- | --- |
| Reduced motion - CSS (F-1) | Глобальний блок `@media (prefers-reduced-motion: reduce)` наприкінці `main.css` поза `@layer`: `animation-duration`, `animation-iteration-count`, `transition-duration` → мінімум для `*`; `.celebration-layer { display: none }`, бо нульова тривалість лишила б 60 частинок статично на екрані |
| Reduced motion - слот (F-1) | `SlotMachine.spin()` читає `matchMedia('(prefers-reduced-motion: reduce)')`: у reduced-режимі барабани одразу показують фінальні символи, `startTickLoop` (звук під час руху) пропускається, `spinEnd`/`win` емітяться через фіксовані 300 мс, а не `REEL_DURATIONS_MS[2] + 150`. Інші гравці бачать спін за власним налаштуванням |
| Reduced motion - `win-blink` (F-1) | Покривається глобальним правилом. Інформація не втрачається: переможець має `aria-label`/текст `players.slotWinner` і іконку кубика |
| `lang` документа (F-2) | `app/i18n.ts` виставляє `document.documentElement.lang` при ініціалізації (`storedLocale()`) і всередині `persistLocale(code)`. `index.html` лишає `lang="uk"` як дефолт до JS - той самий патерн, що `data-theme` інлайн-скриптом |
| `<main>` + `<h1>` кімнати (F-3) | Обгортка `<div class="flex flex-1 …">` у `[slug].vue` стає `<main id="main" tabindex="-1">`; not-found-гілка теж отримує `<main>`. Назва кімнати в `AppHeader` рендериться як `<h1>` замість `<span>` лише в гілці `v-if="roomName"`; на home/auth/ffc хедер не змінюється |
| Імена icon-only кнопок (F-4) | `CardsArea`: `toggleLastRound` - статичний `:aria-label="$t('cards.lastRound')"` + `:aria-pressed="showLastRound"` (стандартний toggle-патерн, тултип як `aria-describedby` далі перемикає текст); reset - `:aria-label="$t('cards.reset')"`. `PlayerRow`: `:aria-label="$t('players.menuFor', { name: player.name })"`, новий ключ в обох локалях |
| Skip-link (F-5) | `<a href="#main">` у `App.vue` перед `ConnectionBanner`, класи `sr-only focus:not-sr-only` + `mui-btn`; текст `common.skipToContent`. Усі 7 `<main>` отримують `id="main" tabindex="-1"` (без `tabindex` частина браузерів не переносить фокус на ціль якоря). Залежить від F-3 |
| Повернення фокуса `AppModal` (F-6) | Перед `showModal()` запам'ятати `document.activeElement`; повернути фокус і у гілці `open → false` watch-а, і в `onBeforeUnmount`, бо 8 із 10 споживачів монтуються з `:open="true"` і зникають через `v-if`. Одна зміна закриває всі екземпляри |
| Меню зі стрілками (F-7) | Новий composable `app/composables/useMenuKeyboard.ts` (три вживання: `AppHeader` ×2, `PlayerRow`): `ArrowDown`/`ArrowUp` циклічно, `Home`/`End`, `Enter`/`Space` активують, `Escape` закриває; пункти `tabindex="-1"`, при відкритті фокус на перший пункт, при закритті - назад на кнопку-тригер, але лише якщо фокус був усередині меню (закриття через `useClickOutside` фокус не чіпає). Селектор `[role^="menuitem"]` виправляє наявну прогалину: `activateMenuItem` шукав лише `menuitem`, тож `menuitemradio` (палітра, мова) не активувалися з Enter |
| Видимий провал голосу (F-8) | У `[slug].vue` постійно присутній контейнер `role="status" aria-live="polite"` під сіткою карт; порожні `catch` на `handleVote` (:450) і `handleSaveEdit` (:552) пишуть у нього `room.voteFailed` / `room.saveFailed`, авто-очищення через 5 с. Решта п'ять порожніх `catch` - гарди `localStorage` і rejoin-fallback, вони легітимні й не чіпаються |
| Пороги Goal Clarity (F-9) | `GOAL_CLARITY_THRESHOLDS = { clear: 3.5, unclear: 2.5 }` в `app/utils/cardDecks.ts` поруч із пресетом; `ResultsArea` читає константи. У `DESIGN.md` §11.7 - одне речення: пороги є продуктовим рішенням власника, не похідною з даних |
| Тумблер `/ffc` (F-10) | `<span @click>` → `<label class="mui-switch">` з `<input type="checkbox" @change>` **першим** сиблінгом (селектори `input:checked + .track` / `~ .thumb` лишаються), `sr-only`-текст імені прапорця всередині label. CSS: нове правило `label.mui-switch input` - `position: absolute; inset: 0; width: 100%; height: 100%` (фокусований), контур через `label.mui-switch:has(input:focus-visible) .track`. Селектор звужено до `label`, бо декоративний `.mui-switch` у `<span>` в меню `PlayerRow` має лишитися неклікабельним |
| `<title>` кімнати (F-11) | `watch` у `[slug].vue` на `[route.path, currentRoomName ?? currentSlug ?? headerSeed.roomName]` з `flush: 'post'` ставить `<назва> \| Story Poker`; `flush: 'post'` потрібен, бо `router.afterEach` спрацьовує синхронно під час `router.replace` на slug і перезаписує заголовок дефолтом. `router.ts` не змінюється |

## Поза скоупом

- **Шар сповіщень / toast з retry** - ініціатива `docs/initiatives/error-handling.md` (P1). F-8 тут навмисно
  мінімальний: один live-region у кімнаті.
- **Значення порогів Goal Clarity** - лишаються `3.5` / `2.5`; зміна - рішення власника.
- **Runtime-перевірки** (контраст шести тем, touch-таргети, порядок фокуса) - окрема сесія `web-debug`, як
  зазначено в аудиті.
- **Прапорець «вимкнути салют/слот» у `/ffc`** - не потрібен після F-1: системний параметр покриває кейс.

## Тестова стратегія

| Знахідка | Шов | Перевірка |
| --- | --- | --- |
| F-1 CSS | немає | `rg -c 'prefers-reduced-motion' app/assets/css/main.css` = 1, `npm run build` |
| F-1 слот | unit | `tests/unit/components/SlotMachine.spec.ts`: мок `matchMedia`, після кліку кожен барабан має 1 клітинку, `spinEnd` через 300 мс |
| F-2 | unit | `tests/unit/i18n.spec.ts`: `persistLocale('en')` → `lang="en"`; модуль з `sp-lang=en` у storage → `lang="en"` |
| F-3, F-11 | немає | typecheck + ручний сценарій (landmark `main`, `h1`, вкладка з назвою кімнати після `router.replace`) |
| F-4 | unit | `PlayerRow.spec.ts` (ім'я з гравцем), новий `CardsArea.spec.ts` (`aria-label`, `aria-pressed`) |
| F-5 | e2e | `page-load.spec.ts`: перший Tab на `/` фокусує skip-link, Enter → `document.activeElement` = `main#main` |
| F-6 | unit | `AppModal.spec.ts`: фокус повертається на тригер після `open=false` і після unmount |
| F-7 | unit | `tests/unit/composables/useMenuKeyboard.spec.ts` + `PlayerRow.spec.ts` (ArrowDown переводить фокус) |
| F-8 | немає | typecheck + ручний сценарій (offline → клік по карті → текст у `role="status"`) |
| F-9 | unit | `cardDecks.spec.ts`: константи експортовані і мають очікувані значення |
| F-10 | e2e | `page-load.spec.ts`: на `/ffc` Tab до чекбокса, Space перемикає `checked` і `FEATURE_FLAGS` у storage |

Фініш - `npm run test:ci` (lint + typecheck + unit + build), потім `npm run test:e2e:pages`.

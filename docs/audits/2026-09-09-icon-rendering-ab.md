# 2026-09-09 — A/B рендеру іконок: inline SVG проти CSS mask

**Дата:** 2026-09-09
**Гілка:** `icon-rendering-migration`, SHA `d68546b`
**Скіл і процес:** виконання плану [A/B рендеру](../plans/2026-09-09-icon-rendering-ab.md), Tasks 0–4;
передумова — завершений план [локальної доставки](../plans/2026-09-09-icon-local-delivery.md)
**Обсяг:** ізольований harness `tests/icon-rendering/` на реальних компонентах (AppHeader, PlayersList, Timer,
CardsArea, JoinOverlay), fixture з 15 гравців, без живого backend
**Формат доказів:** runtime-заміри в Chromium, production-збірки обох варіантів, 51 пара скріншотів
**Попередній аудит тієї ж теми:** немає; специфікація —
[icon-rendering-migration-design](../specs/2026-09-09-icon-rendering-migration-design.md)

## Висновок

**Обрано mixed.** Варіант B (статичний CSS mask) проходить усі кількісні пороги, але провалює візуальний:
`app:town-hall` втрачає кольори прапора. Це єдина знайдена візуальна розбіжність і вона не приймається.

Рекомендація: mask для монохромних іконок, inline SVG для кольорових винятків. Наразі виняток рівно один.
Цей експеримент не авторизує production-міграцію. Точний список винятків і механізм їх рендеру — окремий план
інтеграції, як вимагає план A/B.

## Пороги і результат

| Метрика | Поріг для B | Виміряно | Результат |
| --- | --- | --- | --- |
| gzip JS+CSS повного graph | B ≤ A + 10 240 B | B − A = −6 096 B | pass |
| icon DOM elements | зменшення ≥ 25 | 49 → 23, зменшення 26 | pass |
| неприйняті візуальні розбіжності | 0 | 1 (`app:town-hall`) | **fail** |
| медіана ready proxy | регресія ≤ 1 мс | −1.8 мс (cold), 0.0 мс (warm) | pass |
| запити до Iconify провайдерів | 0 в обох | 0 і 0 | pass |

## Вага збірки

Harness-збірки, не production graph. Обидва варіанти несуть іконки всіх чотирьох flag cases.

| | JS raw | JS gzip | CSS raw | CSS gzip | Разом gzip |
| --- | --- | --- | --- | --- | --- |
| A (inline SVG) | 573 946 | 157 451 | 42 370 | 9 384 | 166 835 |
| B (CSS mask) | 519 179 | 141 539 | 97 209 | 19 200 | 160 739 |
| Дельта | −54 767 | −15 912 | +54 839 | +9 816 | **−6 096** |

Проєкція на production: A = 443 191 B, B ≈ 437 095 B gzip. Обидва в межах бюджету.

Module graph B перевірений по sourcemap: немає `@iconify/vue`, `iconCollections.json`, `AppIcon.vue`,
`registerAppIcons.ts`; є `IconMask.vue`. У A всі чотири присутні. Заборонених `@iconify-json/*` немає в обох.
Precache service worker — 5 записів в обох.

## DOM і розмітка

| | icons | icon elements | markup bytes |
| --- | --- | --- | --- |
| A | 23 | 49 | 15 254 |
| B | 23 | 23 | 3 939 |

Знімок `/core-platform` у спеці має 27 інстансів і 57 елементів; harness для ролі guest дає 23 і 49, бо гість не
бачить per-player меню й контролів таймера. Співвідношення елементів на іконку (2.1) збігається зі знімком, тож
на 27 інстансах зменшення було б близько 30. Поріг не переглядався під результат.

## Час

| | cold median | cold min–max | warm median | warm min–max |
| --- | --- | --- | --- | --- |
| A | 126.7 мс | 123.9–143.1 | 73.9 мс | 72.6–91.4 |
| B | 124.9 мс | 122.8–143.1 | 73.9 мс | 73.6–74.8 |

5 пар A/B, cold і warm окремо, кожна пара — чистий context. Різниця медіан −1.8 мс лежить усередині розкиду A
(19 мс), тож це не доказ прискорення. Регресії не виявлено. Висновків про paint не робимо: для цього потрібні
≥ 20 пар із Chrome trace, які не виконувались.

## Візуальна перевірка

51 пара скріншотів: room і catalog × light/dark × classic/cyberdeck/matcha × 4 flag cases, плюс room для ролей
player, moderator, authorized-moderator. Ручний перегляд контактного аркуша виконано.

Структурних відмінностей немає ніде, крім одного випадку. Порівняння з порогом на канал > 48 дає 159 пікселів на
кадр 1280×840 без концентрації в жодній клітинці каталогу — це антиаліасинг.

**Єдина неприйнята розбіжність:** `app:town-hall`. Файл `app/assets/icons/town-hall.svg` єдиний серед дев'яти
змішує `currentColor` з явними `fill="#0057B7"` і `fill="#FFD700"`. `getIconsCSS` кладе його в mask-режим, який
зводить усі заливки до `currentColor`, тож прапор стає монохромним. Докази —
`test-results/icon-rendering/diff/town-hall-{a,b}.png`. Решта вісім іконок `app:` монохромні й переносяться без втрат.

Background-режим зберіг би кольори, але зламав би темізацію: іконка перестала б слідувати `currentColor`.
Тому CSS-only рішення для цього файлу не існує.

## Відтворення

```bash
npm run icons:harness:css
npm run test:icons:harness                      # варіант A, 58 тестів
ICON_RENDERER=mask npm run test:icons:harness   # варіант B, 58 тестів
npm run icons:report-ab
```

Версії: Node v24.15.0, Vite 8.2.2, Playwright 1.63.0, Chromium із Playwright 1.63.0.
Fixture `tests/fixtures/data/icon-room.json`, hash `80698c8e5c96fae1823d1352af916fc09d2e751f`.
Артефакти: `test-results/icon-rendering/{a,b,diff,runs,dist-a,dist-b}/`.

## Обмеження замірів

- `transferBytes` рахується з Resource Timing і navigation entry, без CDP. Розділення HTTP-кешу і кешу service
  worker не виконувалось, тож warm-прогін — це HTTP-warm, не гарантовано SW-controlled.
- Harness рендериться системним fallback-шрифтом: віддалені Google Fonts вирізані, щоб прогін був офлайновим.
  Відхилення однакове для A і B і не впливає на іконки.
- Виміряні дельти ваги — harness-масштабу; проєкція на production лінійна й позначена як проєкція.

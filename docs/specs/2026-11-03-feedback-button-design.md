# Report issue tab

Status: approved
Route: note
Date: 2026-11-03

## Goal

Будь-який відвідувач може відкрити GitHub Issues проєкту з постійної вкладки Report issue на правому краю екрана
(issue #65); при наведенні або фокусі вкладка показує GIF-прев'ю зі Storage Story Poker.

## Decisions

1. Вкладка Report issue (issue #65) замінює кнопку фідбеку в хедері - рішення користувача: «роби #65 замість кнопки
   в хедері». Посилання - `https://github.com/upstars-global/storypoker/issues`, нова вкладка.
2. Вкладка - вертикальна, `fixed` на правому краю посередині вікна, на всіх сторінках, підпис з i18n.
3. GIF зберігається в новому публічному бакеті `app-assets` (міграція `022`: public read, 6 MB, лише `image/gif`,
   без клієнтських write-політик) за шляхом `report-issue/nice.gif`. Take новий бакет over наявні `avatars` /
   `room-backgrounds`: їхні політики й MIME-ліміти прив'язані до одного об'єкта користувача чи кімнати.
4. GIF (5,5 MB) вантажиться лише після першого наведення чи фокусу, не з першим рендером.
5. Окремий PR від `main`, незалежний від PR #73.

## Acceptance criteria

- AC1: На кожній сторінці є вкладка Report issue на правому краю, що відкриває `https://github.com/upstars-global/storypoker/issues` у новій вкладці (`noopener noreferrer`).
- AC2: Наведення або фокус клавіатурою показує GIF з public URL `app-assets/report-issue/nice.gif`; до першої взаємодії запиту за GIF немає.
- AC3: Вкладка має видимий стан фокусу й лишається клікабельною на 375 px і 1280 px.

## Verification record

```text
Ruling: header feedback button replaced by the issue #65 right-edge tab - user: "роби #65 замість кнопки в хедері" (2026-11-03)
Ruling: spec re-approved - 2026-11-03
```

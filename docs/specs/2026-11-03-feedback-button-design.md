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
4. GIF (5,5 MB) вантажиться лише після першого наведення чи фокусу, не з першим рендером. З
   `prefers-reduced-motion: reduce` прев'ю не показується й не вантажиться.
5. Окремий PR від `main`, незалежний від PR #73.
6. На тач-пристроях прев'ю немає (issue #65, Owner decisions, п. 5): `pointerenter` показує прев'ю лише для
   `pointerType` `mouse` і `pen`, `focus` не показує його, коли `(hover: none)`; на таких пристроях GIF не
   запитується, тап одразу веде за посиланням.
7. Нижче 640 px (`sm`) вкладка показує лише іконку `ic:baseline-feedback` з наявного пайплайна іконок (issue #65,
   Owner decisions, п. 7); підпис лишається доступним ім'ям (`aria-label` і `sr-only`), від 640 px - вертикальний
   текст.

## Acceptance criteria

- AC1: На кожній сторінці є вкладка Report issue на правому краю, що відкриває `https://github.com/upstars-global/storypoker/issues` у новій вкладці (`noopener noreferrer`).
- AC2: Наведення або фокус клавіатурою показує GIF з public URL `app-assets/report-issue/nice.gif`; до першої взаємодії запиту за GIF немає.
- AC4: З `prefers-reduced-motion: reduce` наведення й фокус не показують і не запитують GIF.
- AC3: Вкладка має видимий стан фокусу й лишається клікабельною на 375 px і 1280 px.
- AC5: `pointerenter` з `pointerType` `touch` і `focus` при `(hover: none)` не рендерять прев'ю й не запитують GIF.
- AC6: Нижче 640 px вкладка показує лише іконку й має доступне ім'я з `t('reportIssue.label')`; від 640 px видно вертикальний текст.

## Verification record

```text
Ruling: header feedback button replaced by the issue #65 right-edge tab - user: "роби #65 замість кнопки в хедері" (2026-11-03)
Ruling: spec re-approved - 2026-11-03
Ruling: no GIF preview under prefers-reduced-motion - requested in the user's pasted brief (2026-11-03)
Ruling: review R3 origin user-started - so-upstars review 5744990507 on 8861e11, requested by the user's brief
Received: R3 on 8861e116103cc10ceb61a520dc9ec02680227796 - Critical 0, Important 0, Minor 1
Finding: R3-F1 Minor ACCEPT - spec lacked the touch-skip and icon-only decisions; added Decisions 6-7 and AC5-AC6
Ruling: touch-skip and icon-only below 640 px recorded as owner decisions - user's brief: "Внеси в PR #76 дві правки, щоб він відповідав рішенням власника в описі issue #65 (розділ Owner decisions, пункти 5 і 7)" (2026-11-03)
Ruling: spec re-approved - 2026-11-03
Round review 1: R3 - 1 accepted, 0 rejected
```

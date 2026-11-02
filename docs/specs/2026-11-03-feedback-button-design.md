# Feedback button

Status: approved
Route: note
Date: 2026-11-03

## Goal

Будь-який відвідувач (гравець, модератор, гість) може залишити фідбек про Story Poker в один клік з хедера.
Фідбек потрапляє в GitHub Issues репозиторію `upstars-global/storypoker`.

## Decisions

1. Фідбек - нове GitHub Issue. Кнопка відкриває у новій вкладці сторінку
   `https://github.com/upstars-global/storypoker/issues/new` з префілом заголовка й тексту. Take посилання на
   issue over таблицю в Supabase чи зовнішню форму: рішення користувача; без змін БД і без секретів у клієнті.
   Ціна: потрібен акаунт GitHub, а репозиторій публічний, тож текст фідбеку видно всім.
2. Кнопка - іконка в `AppHeader` праворуч, поруч з меню акаунта, на всіх сторінках, з підказкою й aria-label
   «Залишити фідбек» / «Send feedback» (i18n).
3. Префіл: заголовок `Feedback: `, тіло - лише короткий шаблон (що сталося, що очікували). Технічного контексту
   (шлях сторінки, id чи назва кімнати, мова, тема, імена, голоси) немає - рішення користувача.
4. Окремий PR від `main`, незалежний від PR #73.

## Acceptance criteria

- AC1: У хедері на головній і в кімнаті є кнопка-іконка з aria-label і підказкою з i18n (uk/en).
- AC2: Натискання відкриває у новій вкладці (`target="_blank"`, `rel="noopener noreferrer"`) URL
  `https://github.com/upstars-global/storypoker/issues/new` з параметрами `title` і `body`.
- AC3: `title` дорівнює `Feedback: `, `body` - фіксований шаблон без даних сторінки, кімнати чи гравця.

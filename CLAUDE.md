# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Communication
- **Language**: Ukrainian (українська мова)

## Project Overview

**Story Poker** - метод для оцінювання складності завдань (User Stories) в Agile розробці програмного забезпечення, що базується на консенсусі та гейміфікації. Він дозволяє швидко та ефективно оцінити обсяг робіт, використовуючи карти, що відповідають послідовності Фібоначчі - 0.5, 1, 2, 3, 5, 8, 13, 21.

Основні переваги методу:
* **Залученість**: всі члени команди беруть участь в оцінюванні, що підвищує відповідальність за результат.
* **Уникнення** "групового мислення": оцінка відбувається приховано, тому думка керівника чи експерта не тисне на інших.
* **Швидкість**: дозволяє оцінити великий беклог за короткий час.

Security
- Never print secrets or full environment variable values.
- Use placeholders for secrets in examples.

## Tech Stack

- **Framework:** Nuxt 4.4.2 (Vue 3, Composition API `<script setup>`)
- **Styling:** Tailwind CSS 6
- **Sessions:** Supabase
- **UI:** @nuxt/icon, @nuxt/image, v-wave, Google Fonts (Montserrat 400/600)
- **Node:** 24.15.0 (pinned in `.nvmrc`)

## Common Commands

```bash
npm run dev       # Dev server
npm run build     # Build for production
npm run generate  # SSG (static pre-render)
npm run preview   # Preview production build
```

## Project Structure

```
app/
├── pages/
│   └── room/[slug].vue   # Poker Room
│   ├── index.vue         # Home
```

## Data Model

Coming soon

## LocalStorage Sessions

Створені кімнати та користувачі зберігаються між сесіями.

## Code Style

- **Коментарі в коді**: не використовуємо. Код має бути самодокументованим через назви змінних і функцій.

## Key Architecture Decisions

- **No backend** — статичний Jamstack

## Ролі

Гравець - має право брати участь у естімації, перейменовувати своє імʼя, призначати себе модератором, виходити з кімнтаи

Модератор - всі ті права що і гравець, а також має право створювати кімнати, відкривати карти, стартувати нову естімацію, видаляти гравців, галочками відмічати "складність" карт, які беруть участь

## Сторінки

Головна:
1. Iнпут, з лейблом Please enter your name.
2. Кнопка Create room.
Валідація, якщо інпут пустий, кімната не може бути створена, при кліку на кнопку підсвічується бордер інпута червоним.

Сторінка кімнати:
1. Список гравців
2. Карти (0.5, 1, 2, 3, 5, 8, 13, 21, ?, Pass, Coffe)
3. Кнопка Start Estimating/Reveral Estimates

## Процесс

1. Створення кімнати на головній
2. Кімната має роут, наприклад /room//Ob4W3XMI
3. Знаючи урл /room//Ob4W3XMI, гравці приєлнуються до кімнати
4. Вводять імʼя мінімум з 1 символа
5. Натискають на кнопку Join Room
6. Голосують
7. Модератор бачить хто вже проголосував
8. Перегортає карти - клік по кнопці Reveral Estimates
9. Можна стартувати нову естімацію - клік по кнопці Start Estimating
10. Сессія памʼятає імена користувачів, і наступного разу заходять вже навіть без введеня імені

# Ескізи

Головна examples/Screenshot 2026-04-28 at 20.32.35.png
Кімната examples/Screenshot 2026-04-28 at 20.33.32.png
Відданий голос examples/Screenshot 2026-04-28 at 20.34.11.png
Результат голосування examples/Screenshot 2026-04-28 at 20.34.34.png

## Приклад html

Головна examples/index.html
Кімната examples/room.html

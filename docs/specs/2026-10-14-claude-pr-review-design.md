# Автоматичне ревʼю PR через Claude від імені `so-upstars`

**Дата:** 2026-10-14
**Статус:** затверджено (план - `docs/plans/2026-10-14-claude-pr-review.md`)
**Джерело:** запит власника в сесії 2026-10-14

## Контекст

Ревʼю PR зараз запускається вручну з локальної сесії: агент проходить скіл `review-request` і публікує коментар
через `gh` від акаунта з `GH_ACC=so-upstars` у `.env/.env`. Цей підхід має дві вади:

- **Залежить від ноутбука.** Ревʼю немає, поки хтось не попросить його в сесії.
- **Спільний активний акаунт `gh`.** Інші сесії на тій самій машині перемикають активний акаунт, тож коментар
  уже раз вийшов від `io-upstars` і його довелося видаляти й публікувати заново.

## Мета

Кожен не-draft PR у `upstars-global/storypoker` автоматично отримує один англомовний коментар із результатом
скілу `review-request`, автор коментаря - `so-upstars`.

## Рішення

GitHub Actions workflow `.github/workflows/claude-review.yml` на офіційному `anthropics/claude-code-action@v1`.

- **Тригер:** `pull_request` з `types: [opened, ready_for_review, reopened]`. `synchronize` не входить:
  ревʼю на кожен push - окреме рішення, його легко додати пізніше.
- **Фільтр job:** PR не draft, гілка з цього ж репо (у PR із форків секретів немає), автор не бот.
- **Ідентичність:** fine-grained PAT акаунта `so-upstars` у секреті `SO_UPSTARS_PR_TOKEN` іде і в
  `github_token` action, і в `GH_TOKEN` для `gh pr comment`. Доступ PAT - лише цей репозиторій: Pull requests RW,
  Issues RW, Contents R. `gh-switch` у CI не потрібен і не встановлюється.
- **Доступ до моделі:** секрет `CLAUDE_CODE_OAUTH_TOKEN` (видає `claude setup-token`).
- **Скіл:** скіли не закомічені, їх ставить `postinstall`. Workflow ставить лише `review-request` тим самим
  `skl-x@0.4.8`, що й `scripts/skills.sh`.
- **Межа ревʼю:** `base.sha...head.sha` з події (від merge base); checkout з `fetch-depth: 0`, щоб обидва коміти були локально.
- **Інструменти агента:** лише читання репо, git-читання, `gh pr view/diff/comment`, Skill і субагенти. Без
  редагування файлів репо (лише тимчасове тіло коментаря в `/tmp`), push і інших записів у GitHub.
- **Конкурентність:** одна група на номер PR з `cancel-in-progress`.

## Безпека

- Тригер саме `pull_request`, не `pull_request_target`: код PR не отримує секретів у контексті base-репо.
- PR із форків і від ботів відсіюються умовою job до запуску action.
- Коментар, створений PAT, не породжує подію `pull_request`, тож workflow не запускає сам себе.
- Вміст диффу - дані, а не інструкції (`review-request`, §Security Model); набір інструментів обмежений
  `--allowedTools`, тож prompt injection у диффі не дає запису поза `gh pr comment`.

## Не входить

- Ревʼю на кожен push (`synchronize`), inline-коментарі, автоматичні фікси (`review-resolution`).
- GitHub App з окремим `[bot]`-акаунтом: свідомо обрано `so-upstars`.
- Required check: job не входить у захист `main`.

## Ручні кроки власника

1. Створити fine-grained PAT від `so-upstars` з правами вище й додати як `SO_UPSTARS_PR_TOKEN`.
2. Виконати `claude setup-token` і додати результат як `CLAUDE_CODE_OAUTH_TOKEN`.

Без секретів job падає на кроці action; на required checks це не впливає.

## Критерії приймання

- Не-draft PR з гілки цього репо отримує один коментар від `so-upstars` з чотирма вердиктами `review-request`.
- Draft PR не запускає job; переведення в ready - запускає.
- PR з форка або від бота - job `skipped`.

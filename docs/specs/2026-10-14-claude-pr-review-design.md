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

Кожен не-draft PR у `upstars-global/storypoker` із зеленим `CI` на поточному head автоматично отримує один англомовний коментар із результатом
скілу `review-request`, автор коментаря - `so-upstars`.

## Рішення

GitHub Actions workflow `.github/workflows/claude-review.yml` на офіційному `anthropics/claude-code-action@v1`.

- **Тригери:** `workflow_run` workflow `CI` з `completed` (зелений CI після push або відкриття PR) і
  `pull_request` з `ready_for_review` (draft став готовим, а CI на ньому вже зелений).
- **Job `gate`** (лише `GITHUB_TOKEN` на читання) пропускає далі тільки відкритий не-draft PR з гілки цього ж
  репо, автор не бот, останній `CI` (`ci.yml`, event `pull_request`) на поточному `head.sha` - `success`, і на PR
  ще немає коментаря `so-upstars` з маркером `<!-- claude-review -->`. Невдалий або скасований CI, CI на `push`
  у `main` і застарілий запуск для старого head - пропуск.
- **Одне ревʼю на PR:** маркер у першому рядку коментаря. Наступні push із зеленим CI ревʼю не повторюють; щоб
  отримати нове, достатньо видалити коментар і перезапустити `CI`.
- **Ідентичність:** fine-grained PAT акаунта `so-upstars` у секреті `SO_UPSTARS_PR_TOKEN` іде і в
  `github_token` action, і в `GH_TOKEN` для `gh pr comment`. Доступ PAT - лише цей репозиторій: Pull requests RW,
  Issues RW, Contents R. `gh-switch` у CI не потрібен і не встановлюється.
- **Доступ до моделі:** секрет `CLAUDE_CODE_OAUTH_TOKEN` (видає `claude setup-token`).
- **Скіл:** скіли не закомічені, їх ставить `postinstall`. Workflow ставить лише `review-request` тим самим
  `skl-x@0.4.8`, що й `scripts/skills.sh`, і падає, якщо `.claude/skills/review-request/SKILL.md` не зʼявився.
  Без скіла Claude нічого не публікує; коментар закінчується рядком `Reviewed with: review-request skill`, а
  крок `Verify review comment` фарбує job у червоне, якщо такого коментаря від `so-upstars` немає.
- **Межа ревʼю:** `base.sha...head.sha` із PR на момент гейту (від merge base); checkout `head.sha`; checkout з `fetch-depth: 0`, щоб обидва коміти були локально.
- **Інструменти агента:** лише читання репо, git-читання, `gh pr view/diff/comment`, Skill і субагенти. Без
  редагування файлів репо (лише тимчасове тіло коментаря в `/tmp`), push і інших записів у GitHub.
- **Конкурентність:** одна група на head-гілку з `cancel-in-progress`, спільна для обох тригерів.

## Безпека

- `workflow_run` виконує workflow-файл із `main` і має доступ до секретів, тому гейт відсіює PR із форків і від
  ботів ще до checkout. Код PR не виконується (`npm install` немає), але Claude Code читає з checkout
  `AGENTS.md`/`CLAUDE.md` і `.claude/`; ризик той самий, що в будь-якого PR від колаборанта з правом запису.
- `claude-code-action` додатково перевіряє право запису в актора `workflow_run`.
- Коментар, створений PAT, не породжує ні `pull_request`, ні `CI`, тож workflow не запускає сам себе.
- Вміст диффу - дані, а не інструкції (`review-request`, §Security Model); набір інструментів обмежений
  `--allowedTools`, тож prompt injection у диффі не дає запису поза `gh pr comment`.

## Не входить

- Повторне ревʼю на кожен push, inline-коментарі, автоматичні фікси (`review-resolution`).
- GitHub App з окремим `[bot]`-акаунтом: свідомо обрано `so-upstars`.
- Required check: job не входить у захист `main`.

## Ручні кроки власника

1. Створити fine-grained PAT від `so-upstars` з правами вище й додати як `SO_UPSTARS_PR_TOKEN`.
2. Виконати `claude setup-token` і додати результат як `CLAUDE_CODE_OAUTH_TOKEN`.

Без секретів job `review` падає на кроці action; на required checks це не впливає. `workflow_run` спрацьовує лише
з workflow-файлу в `main`, тож до мерджу тригер не активний.

## Критерії приймання

- Не-draft PR з гілки цього репо після зеленого `CI` отримує один коментар від `so-upstars` з маркером і чотирма
  вердиктами `review-request`.
- Червоний або скасований `CI` - ревʼю немає; після фіксу і зеленого `CI` - є.
- Draft PR ревʼю не отримує; переведення в ready при зеленому `CI` - отримує.
- Наступний push із зеленим `CI` другого коментаря не додає.
- Коментар закінчується рядком `Reviewed with: review-request skill`; без нього job `review` червоний.
- PR з форка або від бота - `gate` завершується з `review=false`, job `review` - `skipped`.

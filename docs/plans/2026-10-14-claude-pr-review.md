# Claude PR Review Implementation Plan

**Goal:** Кожен не-draft PR із зеленим `CI` отримує автоматичний коментар із результатом `review-request` від `so-upstars`.

**Architecture:** Окремий workflow `.github/workflows/claude-review.yml` на `anthropics/claude-code-action@v1`;
скіл ставиться в job через `skl-x@0.4.8`; ідентичність - PAT `so-upstars` у `github_token` і `GH_TOKEN`.

**Spec:** `docs/specs/2026-10-14-claude-pr-review-design.md`

**Tech Stack:** GitHub Actions, `claude-code-action@v1`, `skl-x@0.4.8`, `gh`. Нових npm-залежностей немає.

## Global Constraints

- Фініш - `npm run test:ci`
- Коміти, PR, коментарі й prompt у workflow - англійською; `docs/` і `AGENTS.md` - українською
- `git add` лише файли з блоку **Files**; незакомічені зміни поза задачею не чіпати
- Секрети не друкувати й не комітити

---

### Task 1: Workflow

**Files:**
- Create: `.github/workflows/claude-review.yml`

- [x] **Step 1.1:** Тригери `workflow_run` (`CI`, `completed`) і `pull_request` (`ready_for_review`), `concurrency` на
  head-гілку.
- [x] **Step 1.2:** Job `gate`: відкритий не-draft PR з цього репо, автор не `Bot`, останній `ci.yml` на `head.sha` -
  `success`, немає коментаря `so-upstars` з маркером `<!-- claude-review -->`. Вихід - номер PR, base і head.
- [x] **Step 1.3:** `actions/checkout@v4` на `head.sha` з `fetch-depth: 0`, `setup-node@v4` (24), встановлення `review-request`.
- [x] **Step 1.4:** `claude-code-action@v1` з `claude_code_oauth_token`, `github_token`, prompt із межею
  `base.sha...head.sha` і `--allowedTools` лише на читання та `gh pr view/diff/comment`.
- [x] **Step 1.5:** YAML парситься; скрипт гейта проходить `bash -n` і сухий прогін на реальних PR (#36 - `review=true`,
  #35 - закритий, порожній `pull_requests` і форк - пропуск).
- [x] **Step 1.6:** Перевірка скіла: `test -f .claude/skills/review-request/SKILL.md` після встановлення, у prompt -
  нічого не публікувати без скіла й закінчувати тіло рядком `Reviewed with: review-request skill`, крок
  `Verify review comment` шукає цей рядок у коментарях `so-upstars`.

### Task 2: Документація

**Files:**
- Create: `docs/specs/2026-10-14-claude-pr-review-design.md`
- Create: `docs/plans/2026-10-14-claude-pr-review.md`
- Modify: `AGENTS.md` (абзац про CI)

- [x] **Step 2.1:** Спека з рішенням, безпекою, ручними кроками й критеріями приймання.
- [x] **Step 2.2:** У `AGENTS.md` - два рядки про новий не-required workflow і його секрети.

### Task 3: Перевірка й PR

- [x] **Step 3.1:** `npm run test:ci` зелений.
- [x] **Step 3.2:** Коміт, push гілки `claude-pr-review`, PR від `so-upstars`.
- [ ] **Step 3.3 (власник):** додати секрети `SO_UPSTARS_PR_TOKEN` і `CLAUDE_CODE_OAUTH_TOKEN`.
- [ ] **Step 3.4:** Після мерджу й секретів - відкрити тестовий не-draft PR і перевірити критерії приймання
  зі спеки. До мерджу `workflow_run` не активний, тож цей PR сам ревʼю не отримає.

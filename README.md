# Story Poker

_Vibe Story Poker - Every story point counts_

[![Netlify Status](https://api.netlify.com/api/v1/badges/09bec6c8-94fe-4c39-b159-2c54e9a3c309/deploy-status)](https://app.netlify.com/projects/storypok/deploys)

A web-based planning poker tool that helps Scrum and Agile teams estimate tasks in a fun, collaborative, and efficient way.

### Used
* [Vue](https://vuejs.org)
* [Vite](https://vitejs.dev)
* [Supabase](https://supabase.com)
* [Netlify](https://netlify.com)
* [Tailwind](https://tailwindcss.com)
* [Iconify](https://icon-sets.iconify.design)
* [DiceBear](https://www.dicebear.com/)

### Install
```zsh
npm i
```

### Run
Створи `/.env/.env` (Supabase, спільне для команди) та `/.env/.env.local` (персональне, наприклад Jira) на основі `/.env/.env.example`.
```zsh
npm run dev
```

### Tests (Vitest)
```zsh
npm test
```

Coverage (для CI або локально):
```zsh
npm run test:ci
```

### CI/CD (GitHub Actions + Netlify)
- CI: `.github/workflows/ci.yml` запускає `npm ci` і `npm run test:ci` на PR та `main`; Playwright E2E запускається, якщо задані E2E secrets.
- CD: той самий workflow деплоїть на Netlify при пуші в `main`, якщо основні checks пройшли й задані Netlify secrets; E2E блокує deploy тільки коли запускається і падає.
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`

### Run Claude Code In Bypass Mode
```zsh
claude --dangerously-skip-permissions
```

### Skills
```zsh
# META
npx skills add anthropics/claude-plugins-official -s claude-md-improver -a claude-code -y

# FRONTEND
npx skills add giuseppe-trisciuoglio/developer-kit -s tailwind-css-patterns -a claude-code -y
npx skills add anthropics/skills -s frontend-design -a claude-code -y

# TESTS
npx skills add anthropics/skills -s webapp-testing -a claude-code -y
npx skills add antfu/skills -s vitest -a claude-code -y
npx skills add currents-dev/playwright-best-practices-skill -a claude-code -y

# SUPABASE
# npx skills add supabase/agent-skills -s supabase -a claude-code -y

# WORKFLOW
# npx skills add obra/superpowers -s brainstorming -a codex -a claude-code -y
# npx skills add obra/superpowers -s writing-plans -a codex -a claude-code -y
# npx skills add obra/superpowers -s dispatching-parallel-agents -a codex -a claude-code -y
# npx skills add obra/superpowers -s executing-plans -a codex -a claude-code -y
# npx skills add obra/superpowers -s subagent-driven-development -a codex -a claude-code -y
# npx skills add obra/superpowers -s systematic-debugging -a codex -a claude-code -y
# npx skills add obra/superpowers -s test-driven-development -a codex -a claude-code -y
# npx skills add obra/superpowers -s using-git-worktrees -a codex -a claude-code -y
# npx skills add obra/superpowers -s verification-before-completion -a codex -a claude-code -y
# npx skills add obra/superpowers -s receiving-code-review -a codex -a claude-code -y
# npx skills add obra/superpowers -s requesting-code-review -a codex -a claude-code -y
# npx skills add obra/superpowers -s finishing-a-development-branch -a codex -a claude-code -y

# DESIGN
# npx skills add better-auth/better-icons -s better-icons -a codex -a claude-code -y
# npx skills add wshobson/agents -s tailwind-design-system -a codex -a claude-code -y
```

### Як подивитись скільки і яких скілів використовували агенти
```zsh
npm i -g skillio

skl usg -p 3h
```

### Have fun! ;)
###

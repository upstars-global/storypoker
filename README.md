# Story Poker

_Vibe Story Poking - Every story point counts_

[![Netlify Status](https://api.netlify.com/api/v1/badges/09bec6c8-94fe-4c39-b159-2c54e9a3c309/deploy-status)](https://app.netlify.com/projects/storypok/deploys)

A web-based planning poker tool that helps Scrum and Agile teams estimate tasks in a fun, collaborative, and efficient way.

### Used
* [Vue.js](https://vuejs.org)
* [Nuxt](https://nuxt.com)
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
- CI: `.github/workflows/ci.yml` запускає `npm ci`, `npm run test:ci`, `npm run build` на PR та `main`.
- CD: `.github/workflows/deploy-netlify.yml` деплоїть на Netlify при пуші в `main`, якщо задані secrets:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`

### Run Claude Code In Bypass Mode
```zsh
claude --dangerously-skip-permissions
```

### Skills
```zsh
npx skills add anthropics/skills@frontend-design -y
npx skills add anthropics/skills@webapp-testing -y
# npx skills add anthropics/claude-plugins-official@claude-md-improver -y
npx skills add obra/superpowers@brainstorming -y
npx skills add obra/superpowers@writing-plans -y
npx skills add obra/superpowers@executing-plans -y
npx skills add obra/superpowers@subagent-driven-development -y
npx skills add obra/superpowers@dispatching-parallel-agents -y
npx skills add obra/superpowers@test-driven-development -y
npx skills add obra/superpowers@systematic-debugging -y
npx skills add obra/superpowers@verification-before-completion -y
npx skills add obra/superpowers@receiving-code-review -y
npx skills add obra/superpowers@requesting-code-review -y
npx skills add obra/superpowers@using-git-worktrees -y
npx skills add obra/superpowers@finishing-a-development-branch -y
```

### Як подивитись скільки і яких скілів використовували агенти
```zsh
npm i -g skillio

skl used -p 3h
```

### Have fun! ;)

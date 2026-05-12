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
```sh
npm i
```

### Run
Створи `/.env/.env` (Supabase, спільне для команди) та `/.env/.env.local` (персональне, наприклад Jira) на основі `/.env/.env.example`.
```sh
npm run dev
```

### Tests (Vitest)
```sh
npm test
```

Coverage (для CI або локально):
```sh
npm run test:ci
```

### CI/CD (GitHub Actions + Netlify)
- CI: `.github/workflows/ci.yml` запускає `npm ci`, `npm run test:ci`, `npm run build` на PR та `main`.
- CD: `.github/workflows/deploy-netlify.yml` деплоїть на Netlify при пуші в `main`, якщо задані secrets:
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`

### Run Claude Code In Bypass Mode
```sh
claude --dangerously-skip-permissions
```

### Skills
```sh
npx skills add obra/superpowers@using-superpowers -a claude-code -y
npx skills add obra/superpowers@brainstorming -a claude-code -y
npx skills add obra/superpowers@writing-plans -a claude-code -y
npx skills add obra/superpowers@executing-plans -a claude-code -y
npx skills add obra/superpowers@test-driven-development -a claude-code -y
npx skills add obra/superpowers@systematic-debugging -a claude-code -y
npx skills add obra/superpowers@verification-before-completion -a claude-code -y
npx skills add obra/superpowers@receiving-code-review -a claude-code -y
npx skills add anthropics/skills@frontend-design -a claude-code -y
npx skills add anthropics/skills@webapp-testing -a claude-code -y
npx skills add antfu/skills@vitest -a claude-code -y
npx skills add antfu/skills@vue -a claude-code -y
npx skills add antfu/skills@nuxt -a claude-code -y
npx skills add antfu/skills@pinia -a claude-code -y
npx skills add antfu/skills@vue-best-practices -a claude-code -y
npx skills add antfu/skills@vueuse-functions -a claude-code -y
npx skills add wshobson/agents@tailwind-design-system -a claude-code -y
npx skills add supabase/agent-skills@supabase -a claude-code -y
npx skills add anthropics/claude-plugins-official@claude-md-improver -a codex -y
```

### Як подивитись скільки і яких скілів використовували агенти
```sh
npm i -g skillio

npx skl used -a claude-code codex -p 1d
```

### Have fun! ;)

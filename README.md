# Story Poker

_Vibe Story Poker - Every story point counts_

[![Netlify Status](https://api.netlify.com/api/v1/badges/09bec6c8-94fe-4c39-b159-2c54e9a3c309/deploy-status)](https://app.netlify.com/projects/storypok/deploys)

A web-based planning poker tool that helps Scrum and Agile teams estimate tasks in a fun, collaborative, and efficient way.

### Used
* [Vue](https://vuejs.org)
* [Vite](https://vitejs.dev)
* [Pinia](https://pinia.vuejs.org)
* [Vue Router](https://router.vuejs.org)
* [Vue I18n](https://vue-i18n.intlify.dev)
* [Tailwind](https://tailwindcss.com)
* [Supabase](https://supabase.com)
* [Netlify](https://netlify.com)
* [Iconify](https://icon-sets.iconify.design)
* [DiceBear](https://www.dicebear.com/)
* [v-wave](https://v-wave.graham42.com)

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
npx skills add anthropics/claude-plugins-official -s claude-md-improver -a codex claude-code -y

# FRONTEND
npx skills add anthropics/skills -s frontend-design -a codex claude-code -y
# npx skills add giuseppe-trisciuoglio/developer-kit -s tailwind-css-patterns -a codex claude-code -y
# npx skills add skilld-dev/vue-ecosystem-skills -s reka-ui-skilld -a codex claude-code -y
# npx skills add unovue/shadcn-vue -s shadcn-vue -a codex claude-code -y

# TESTS
npx skills add anthropics/skills -s webapp-testing -a codex claude-code -y
# npx skills add antfu/skills -s vitest -a codex claude-code -y
# npx skills add currents-dev/playwright-best-practices-skill -a codex claude-code -y

# SUPABASE
# npx skills add supabase/agent-skills -s supabase -a codex claude-code -y
# npx skills add supabase/agent-skills -s supabase-postgres-best-practices -a codex claude-code -y

# WORKFLOW
npx skills add obra/superpowers -s brainstorming -a codex claude-code -y
npx skills add obra/superpowers -s writing-plans -a codex claude-code -y
npx skills add obra/superpowers -s dispatching-parallel-agents -a codex claude-code -y
npx skills add obra/superpowers -s executing-plans -a codex claude-code -y
npx skills add obra/superpowers -s subagent-driven-development -a codex claude-code -y
npx skills add obra/superpowers -s systematic-debugging -a codex claude-code -y
npx skills add obra/superpowers -s test-driven-development -a codex claude-code -y
# npx skills add obra/superpowers -s using-git-worktrees -a codex claude-code -y
# npx skills add obra/superpowers -s verification-before-completion -a codex claude-code -y
# npx skills add obra/superpowers -s receiving-code-review -a codex claude-code -y
# npx skills add obra/superpowers -s requesting-code-review -a codex claude-code -y
# npx skills add obra/superpowers -s finishing-a-development-branch -a codex claude-code -y

# DESIGN
# npx skills add better-auth/better-icons -s better-icons -a codex claude-code -y
# npx skills add wshobson/agents -s tailwind-design-system -a codex claude-code -y
# npx impeccable skills install
# npx impeccable skills uninstall

# GRAPH
# uv tool install graphifyy
# than in project folder
# graphify install --project
# uninstall
# uv tool uninstall graphifyy

# TOKENOMICS
# npx skills add forrestchang/andrej-karpathy-skills -s karpathy-guidelines -a codex claude-code -y
# npx skills add dietrichgebert/ponytail -s ponytail -a codex claude-code -y

# TYPESCRIPT
npx skills add sickn33/antigravity-awesome-skills -s typescript-expert -a codex claude-code -y

```

### Як подивитись скільки і яких скілів використовували агенти
```zsh
npm i -g skillio

skl usg -p 3h
```

### Have fun! ;)
###

# Story Poker
* _Vibe Story Poking_
* _Every story point counts_

A web-based planning poker tool that helps Scrum and Agile teams estimate tasks in a fun, collaborative, and efficient way.

### Used
* [Vue.js](https://vuejs.org)
* [Nuxt](https://nuxt.com)
* [Supabase](https://supabase.com)
* [Netlify](https://netlify.com)
* [Tailwind](https://tailwindcss.com)
* [Iconify](https://icon-sets.iconify.design)
* [DceBear](https://www.dicebear.com/)

### Install
```sh
npm i
```

### Run
Створи `/.env/.env` (Supabase, спільне для команди) та `/.env/.env.local` (персональне, наприклад Jira) на основі `/.env/.env.example`.
```sh
npm run dev
```

### Run Claude Code In Bypass Mode
```sh
claude --dangerously-skip-permissions
```

### Skills
```sh
npx skills add anthropics/claude-plugins-official@claude-md-improver -a claude-code -y
npx skills add obra/superpowers@brainstorming -a claude-code -y
npx skills add obra/superpowers@executing-plans -a claude-code -y
npx skills add netlify/context-and-tools@netlify-cli-and-deploy -a claude-code -y
npx skills add antfu/skills@nuxt -a claude-code -y
npx skills add antfu/skills@pinia -a claude-code -y
npx skills add anthropics/skills@skill-creator -a claude-code -y
npx skills add supabase/agent-skills@supabase -a claude-code -y
npx skills add obra/superpowers@systematic-debugging -a claude-code -y
npx skills add wshobson/agents@tailwind-design-system -a claude-code -y
npx skills add obra/superpowers@test-driven-development -a claude-code -y
npx skills add obra/superpowers@verification-before-completion -a claude-code -y
npx skills add antfu/skills@vite -a claude-code -y
npx skills add antfu/skills@vitest -a claude-code -y
npx skills add antfu/skills@vue -a claude-code -y
npx skills add antfu/skills@vue-best-practices -a claude-code -y
npx skills add antfu/skills@vue-router-best-practices -a claude-code -y
npx skills add antfu/skills@vue-testing-best-practices -a claude-code -y
npx skills add antfu/skills@vueuse-functions -a claude-code -y
npx skills add anthropics/skills@webapp-testing -a claude-code -y
npx skills add obra/superpowers@writing-plans -a claude-code -y
npx skills add obra/superpowers@writing-skills -a claude-code -y
```

### Як подивитись скільки і яких скілів використовували агенти
```sh
npm i -g skillio

npx skls used -a claude-code codex -p 2h
```

### Have fun! ;)

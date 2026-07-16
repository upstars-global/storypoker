# Story Poker

_Vibe Story Poker - Every story point counts_

[![Netlify Status](https://api.netlify.com/api/v1/badges/09bec6c8-94fe-4c39-b159-2c54e9a3c309/deploy-status)](https://app.netlify.com/projects/storypok/deploys)

A web-based planning poker tool that helps Scrum and Agile teams estimate tasks in a fun, collaborative, and efficient way.

### Used:
* <img src="https://cdn.simpleicons.org/nodedotjs" width="16" height="16"> [Node.js](https://nodejs.org)
* <img src="https://cdn.simpleicons.org/typescript" width="16" height="16"> [TypeScript](https://www.typescriptlang.org)
* <img src="https://cdn.simpleicons.org/vuedotjs" width="16" height="16"> [Vue](https://vuejs.org)
* <img src="https://cdn.simpleicons.org/vite" width="16" height="16"> [Vite](https://vitejs.dev)
* <img src="https://cdn.simpleicons.org/pinia" width="16" height="16"> [Pinia](https://pinia.vuejs.org)
* <img src="https://cdn.simpleicons.org/vuedotjs" width="16" height="16"> [Vue Router](https://router.vuejs.org)
* <img src="https://api.iconify.design/logos/i18next.svg" width="16" height="16"> [Vue I18n](https://vue-i18n.intlify.dev)
* <img src="https://cdn.simpleicons.org/tailwindcss" width="16" height="16"> [Tailwind](https://tailwindcss.com)
* <img src="https://cdn.simpleicons.org/pwa" width="16" height="16"> [Vite PWA](https://vite-pwa-org.netlify.app)
* <img src="https://cdn.simpleicons.org/supabase" width="16" height="16"> [Supabase](https://supabase.com)
* <img src="https://cdn.simpleicons.org/netlify" width="16" height="16"> [Netlify](https://netlify.com)
* <img src="https://cdn.simpleicons.org/iconify" width="16" height="16"> [Iconify](https://icon-sets.iconify.design)
* <img src="https://cdn.simpleicons.org/simpleicons" width="16" height="16"> [Simple Icons](https://simpleicons.org)
* <img src="https://api.iconify.design/tabler/mood-smile.svg" width="16" height="16"> [DiceBear](https://www.dicebear.com/)
* <img src="https://api.iconify.design/tabler/ripple.svg" width="16" height="16"> [v-wave](https://v-wave.graham42.com)
* <img src="https://cdn.simpleicons.org/vitest" width="16" height="16"> [Vitest](https://vitest.dev)
* <img src="https://api.iconify.design/logos/playwright.svg" width="16" height="16"> [Playwright](https://playwright.dev)

### Install
```bash
npm i
```

### Run
Створи `/.env/.env` (Supabase, спільне для команди) та `/.env/.env.local` (персональне, наприклад Jira) на основі `/.env/.env.example`.
```bash
npm run dev
```

### Tests (Vitest)
```bash
npm test
```

Coverage (для CI або локально):
```bash
npm run test:ci
```

### CI/CD (GitHub Actions + Netlify)
- CI: `.github/workflows/ci.yml` запускає `npm ci` і `npm run test:ci` на PR та `main`; Playwright E2E запускається, якщо задані E2E secrets.
- CD: той самий workflow деплоїть на Netlify при пуші в `main`, якщо основні checks пройшли й задані Netlify secrets; E2E блокує deploy тільки коли запускається і падає.
  - `NETLIFY_AUTH_TOKEN`
  - `NETLIFY_SITE_ID`

### Run Claude Code In Bypass Mode
```bash
claude --dangerously-skip-permissions
```

### Skills
* [scripts/skills.sh](scripts/skills.sh)

### Як подивитись скільки і яких скілів використовували агенти
```bash
npm i -g skillio
skl usg -p 3h
```

Have fun! ;)

# CI Zero-Duplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge two duplicate GitHub Actions workflow files into one, eliminating double test runs on push to `main`.

**Architecture:** Replace `ci.yml` (test-only) and `deploy-netlify.yml` (test+deploy) with a single `ci.yml` containing a `test` job and a `deploy` job that depends on `test` via `needs:`. Jobs still run on isolated runners so each needs its own setup steps, but tests execute exactly once per event.

**Tech Stack:** GitHub Actions YAML, `actions/checkout@v4`, `actions/setup-node@v4`, `netlify/actions/cli@master`

---

### Task 1: Rewrite `.github/workflows/ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace the file contents**

Replace the entire content of `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    concurrency:
      group: ci-test-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install
        run: npm ci

      - name: Unit tests
        run: npm run test:ci

      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: ${{ github.ref == 'refs/heads/main' && secrets.NETLIFY_AUTH_TOKEN != '' && secrets.NETLIFY_SITE_ID != '' }}
    runs-on: ubuntu-latest
    timeout-minutes: 15
    concurrency:
      group: ci-deploy-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install
        run: npm ci

      - name: Build (static)
        run: npm run generate

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=.output/public --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

- [ ] **Step 2: Verify the file is valid YAML**

```bash
node -e "const fs = require('fs'); const yaml = require('js-yaml'); yaml.load(fs.readFileSync('.github/workflows/ci.yml', 'utf8')); console.log('OK')" 2>/dev/null || python3 -c "import yaml, sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Stage the change**

```bash
git add .github/workflows/ci.yml
```

---

### Task 2: Delete `.github/workflows/deploy-netlify.yml`

**Files:**
- Delete: `.github/workflows/deploy-netlify.yml`

- [ ] **Step 1: Delete the file**

```bash
git rm .github/workflows/deploy-netlify.yml
```

Expected output: `rm '.github/workflows/deploy-netlify.yml'`

---

### Task 3: Commit

- [ ] **Step 1: Commit both changes**

```bash
git commit -m "$(cat <<'EOF'
ci: merge test+deploy into single workflow, node 20→24
EOF
)"
```

Expected: commit created on current branch.

- [ ] **Step 2: Verify working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

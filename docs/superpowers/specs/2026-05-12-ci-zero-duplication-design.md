# CI Zero-Duplication Design

**Date:** 2026-05-12
**Branch:** avatar-editor

## Problem

Two separate workflow files (`.github/workflows/ci.yml` and `.github/workflows/deploy-netlify.yml`) duplicate `checkout`, `setup-node`, `npm ci`, and `npm run test:ci`. On every push to `main`, tests run twice — once per file.

## Solution

Merge into a single `.github/workflows/ci.yml` with two jobs:

### Job: `test`
- Triggers: `pull_request` (any branch), `push: [main]`
- Steps: `checkout` → `setup-node 24 + npm cache` → `npm ci` → `npm run test:ci` → `npm run build`

### Job: `deploy`
- `needs: test` (runs only after `test` succeeds)
- `if: github.ref == 'refs/heads/main' && secrets.NETLIFY_AUTH_TOKEN != '' && secrets.NETLIFY_SITE_ID != ''`
- Steps: `checkout` → `setup-node 24 + npm cache` → `npm ci` → `npm run generate` → `netlify deploy --prod`

### Removed
- `.github/workflows/deploy-netlify.yml` — deleted entirely

## Notes

- Node version bumped from 20 → 24 (matches `CLAUDE.md` requirement)
- `deploy` job still needs its own `checkout`+`setup-node`+`npm ci` because GitHub Actions jobs run on isolated runners
- `cancel-in-progress: true` concurrency preserved on both jobs independently

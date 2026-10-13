#!/usr/bin/env sh
set -e

npx -y --prefer-online skl-x -v
# npx -y skills -v
# npx -y --prefer-online skl-x rm . -y -m sm

# A "\ name" line disables that skill on purpose: skl-x gets " name" and skips it

# SENTIMONY SKILLS https://github.com/sentimony/skills
npx -y --prefer-online skl-x add sentimony/skills -s \
  scope-triage \
  \ scope-check \
  plan-crafting \
  inline-plan-dev \
  subagent-plan-dev \
  git-worktree-isolation \
  parallel-agents \
  tdd \
  cross-review \
  review-request \
  review-resolution \
  debugging \
  web-debug \
  \ webapp-debugger \
  verification-gate \
  branch-finish \
  commit-all \
  gh-switch \
  frontend-crafting \
  vitest \
  typescript \
  echarts \
  prose-crafting \
  dashfix \
  negafix \
  maintaining-agent-context \
  secret-hygiene \
  \ skill-crafting \
  -a codex claude-code -y -m sm

# LOCAL SKILLS
skills_local="$(dirname "$0")/skills.local.sh"
if [ -f "$skills_local" ]; then
  sh "$skills_local"
fi

# MATTPOCOCK SKILLS https://github.com/mattpocock/skills
# npx -y --prefer-online skl-x add mattpocock/skills -s \
#   \ grill-me \
#   \ grill-with-docs \
#   \ grilling \
#   \ domain-modeling \
#   improve-codebase-architecture \
#   \ writing-for-agents \
#   -a codex claude-code -y -m sm

# SHADCN UI https://github.com/shadcn/ui
# npx -y --prefer-online skl-x add shadcn/ui -s \
#   \ migrate-radix-to-base \
#   shadcn \
#   -a codex claude-code -y -m sm

# CLOUDFLARE SKILLS https://github.com/cloudflare/skills
# npx -y --prefer-online skl-x add cloudflare/skills -s \
#   wrangler \
#   cloudflare-one \
#   workers-best-practices \
#   durable-objects \
#   -a codex claude-code -y -m sm

# npx -y --prefer-online skl-x -v
# npx -y --prefer-online skl-x ls -g
# npx -y --prefer-online skl-x ls
# npx -y --prefer-online skl-x cst
# npx -y --prefer-online skl-x usg -p 2d

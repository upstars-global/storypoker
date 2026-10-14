#!/usr/bin/env sh
set -e

npx -y --prefer-online skl-x@0.4.8 -v
# npx -y skills -v
# npx -y --prefer-online skl-x@0.4.8 rm . -y -m sm

# A "\ name" line disables that skill on purpose: skl-x gets " name" and skips it

# SENTIMONY SKILLS https://github.com/sentimony/skills
npx -y --prefer-online skl-x@0.4.8 add sentimony/skills -s \
  scope-triage \
  scope-check \
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

# npx -y --prefer-online skl-x@0.4.8 -v
# npx -y --prefer-online skl-x@0.4.8 ls -g
# npx -y --prefer-online skl-x@0.4.8 ls
# npx -y --prefer-online skl-x@0.4.8 cst
# npx -y --prefer-online skl-x@0.4.8 usg -p 2d

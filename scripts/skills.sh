#!/usr/bin/env sh
set -e

echo "npx -y skillio -v" && npx -y skillio -v
echo "npx -y skills -v" && npx -y skills -v
# echo "npx -y skillio ls" && npx -y skillio ls
echo "npx -y skillio rm . -y" && npx -y skillio rm . -y

# SENTIMONY SKILLS
# All at once
# npx skills add sentimony/skills -a codex claude-code -y
# Or each separately
npx skills add https://github.com/sentimony/skills -s \
  web-debug \
  vitest \
  typescript \
  echarts \
  scope-triage \
  plan-crafting \
  dashfix \
  negafix \
  commit-all \
  maintaining-agent-context \
  frontend-crafting \
  tdd \
  debugging \
  review-request \
  review-resolution \
  verification-gate \
  git-worktree-isolation \
  parallel-agents \
  inline-plan-dev \
  subagent-plan-dev \
  branch-finish \
  -a codex claude-code -y

# MATTPOCOCK SKILLS
npx skills add https://github.com/mattpocock/skills -s \
  grill-me \
  grill-with-docs \
  grilling \
  domain-modeling \
  -a codex claude-code -y

echo "npx -y skillio ls" && npx -y skillio ls

#!/usr/bin/env sh
set -e

echo "npx -y skillio -v" && npx -y skillio -v
echo "npx -y skills -v" && npx -y skills -v
# echo "npx -y skillio ls" && npx -y skillio ls
echo "npx -y skillio rm . -y" && npx -y skillio rm . -y

# MATTPOCOCK SKILLS
# npx skills add https://github.com/mattpocock/skills -s \
#   \ grill-me \
#   \ grill-with-docs \
#   \ grilling \
#   \ domain-modeling \
#   \ improve-codebase-architecture \
#   -a codex claude-code -y

# SENTIMONY SKILLS
# All at once
# npx skills add sentimony/skills -a codex claude-code -y
# Or each separately
npx skills add https://github.com/sentimony/skills -s \
  scope-triage \
  plan-crafting \
  inline-plan-dev \
  subagent-plan-dev \
  git-worktree-isolation \
  parallel-agents \
  tdd \
  review-request \
  review-resolution \
  debugging \
  web-debug \
  verification-gate \
  branch-finish \
  commit-all \
  frontend-crafting \
  vitest \
  typescript \
  echarts \
  prose-crafting \
  dashfix \
  negafix \
  maintaining-agent-context \
  \ skill-crafting \
  -a codex claude-code -y

echo "npx -y skillio ls" && npx -y skillio ls

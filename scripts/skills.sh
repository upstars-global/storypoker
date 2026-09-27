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
  git-worktree-isolation \
  parallel-agents \
  inline-plan-dev \
  subagent-plan-dev \
  tdd \
  debugging \
  review-request \
  review-resolution \
  verification-gate \
  commit-all \
  branch-finish \
  maintaining-agent-context \
  prose-crafting \
  dashfix \
  negafix \
  frontend-crafting \
  web-debug \
  vitest \
  typescript \
  echarts \
  \ skill-crafting \
  -a codex claude-code -y

echo "npx -y skillio ls" && npx -y skillio ls

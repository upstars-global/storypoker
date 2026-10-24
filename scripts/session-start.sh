#!/usr/bin/env sh
# Claude Code SessionStart hook (wired by setup.sh): refresh the project skills, then ask
# Claude Code to rescan them. Hook stdout becomes model context, so only the JSON reaches it.
cd "$(dirname "$0")/.." && pnpm run skills >/dev/null 2>&1
echo '{"hookSpecificOutput":{"hookEventName":"SessionStart","reloadSkills":true}}'

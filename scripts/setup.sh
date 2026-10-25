#!/usr/bin/env sh
set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

mkdir -p \
  "$PROJECT_ROOT/.agents/skills" \
  "$PROJECT_ROOT/.claude/skills" \
  "$PROJECT_ROOT/.env"

touch \
  "$PROJECT_ROOT/.env/.env" \
  "$PROJECT_ROOT/.env/.env.local"

SETTINGS="$PROJECT_ROOT/.claude/settings.json"
if [ ! -f "$SETTINGS" ]; then
  printf '%s\n' \
    '{' \
    '  "attribution": {' \
    '    "commits": false,' \
    '    "pullRequests": false' \
    '  },' \
    '  "hooks": {' \
    '    "SessionStart": [' \
    '      {' \
    '        "matcher": "startup",' \
    '        "hooks": [' \
    '          {' \
    '            "type": "command",' \
    '            "command": "sh \"$CLAUDE_PROJECT_DIR/scripts/session-start.sh\"",' \
    '            "timeout": 120,' \
    '            "statusMessage": "Updating project skills"' \
    '          }' \
    '        ]' \
    '      }' \
    '    ]' \
    '  }' \
    '}' > "$SETTINGS"
elif command -v jq >/dev/null 2>&1; then
  TMP=$(mktemp)
  # The SessionStart hook is added once; a later run finds it by its command and leaves it.
  jq --arg cmd 'sh "$CLAUDE_PROJECT_DIR/scripts/session-start.sh"' '
    .attribution.commits = (.attribution.commits // false)
    | .attribution.pullRequests = (.attribution.pullRequests // false)
    | if any(.hooks.SessionStart[]?.hooks[]?; .command == $cmd) then .
      else .hooks.SessionStart += [{matcher: "startup", hooks: [{type: "command", command: $cmd,
        timeout: 120, statusMessage: "Updating project skills"}]}] end
  ' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"
else
  echo "warning: jq not found, skipping attribution and hook merge in $SETTINGS" >&2
fi

sh "$SCRIPT_DIR/migrate-test-artifacts.sh"

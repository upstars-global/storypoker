#!/bin/sh
# Check the runtime before pnpm can auto-install dependencies or run lifecycle hooks.
set -eu
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 24 || (major === 24 && minor < 15)) { console.error("Local checks require Node >=24.15.0; select the runtime before invoking pnpm."); process.exit(1); }'
CI=1
export CI
exec pnpm run test:ci

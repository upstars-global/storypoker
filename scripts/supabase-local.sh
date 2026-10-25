#!/bin/sh
# Starts the local Supabase stack (Docker via colima) and writes .env/.env.test for Playwright e2e.
# The CLI runs from a separate workdir because the repo's .env is a directory, which the CLI cannot read.
set -e

repo="$(cd "$(dirname "$0")/.." && pwd)"
workdir="${STORYPOKER_SUPABASE_WORKDIR:-$HOME/.cache/storypoker-supabase}"
env_test="$repo/.env/.env.test"

mkdir -p "$workdir"
ln -sfn "$repo/supabase" "$workdir/supabase"
# The start summary prints the local keys; CI logs of this public repo must not carry them.
supabase start --workdir "$workdir" -x studio,imgproxy,vector,analytics,edge-runtime,functions >/dev/null

status="$(supabase status --workdir "$workdir" -o env 2>/dev/null)"
value() { printf '%s\n' "$status" | sed -n "s/^$1=\"\{0,1\}\([^\"]*\)\"\{0,1\}\$/\1/p"; }
api_url="$(value API_URL)"
client_key="$(value PUBLISHABLE_KEY)"
service_key="$(value SERVICE_ROLE_KEY)"

if [ -e "$env_test" ]; then
  echo "$env_test exists, left unchanged"
else
  mkdir -p "$repo/.env"
  cat > "$env_test" <<EOF
VITE_SUPABASE_URL=$api_url
VITE_SUPABASE_KEY=$client_key
SUPABASE_URL=$api_url
SUPABASE_KEY=$client_key
SUPABASE_TEST_SERVICE_ROLE_KEY=$service_key
E2E_TEST_USER_EMAIL=e2e-user@storypoker-test.dev
E2E_TEST_USER_PASSWORD=$(openssl rand -hex 16)
EOF
  echo "wrote $env_test"
fi

email="$(sed -n 's/^E2E_TEST_USER_EMAIL=//p' "$env_test")"
password="$(sed -n 's/^E2E_TEST_USER_PASSWORD=//p' "$env_test")"
docker exec supabase_db_storypoker psql -U postgres -qtAc "delete from auth.users where email = '$email'"
code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$api_url/auth/v1/admin/users" \
  -H "apikey: $service_key" -H "Authorization: Bearer $service_key" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"$password\",\"email_confirm\":true}")"
case "$code" in
  200) echo "created e2e test user $email" ;;
  *) echo "creating e2e test user failed: HTTP $code" >&2; exit 1 ;;
esac

echo "Supabase API: $api_url, Mailpit: $(value MAILPIT_URL)"

#!/usr/bin/env bash
# CI health checks for the Tally app. Exits non-zero on the first failure.
set -euo pipefail

step() {
  echo ""
  echo "=== $1 ==="
}

step "Lint"
npm run lint

step "Build"
npm run build

step "Supabase credentials"
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "Missing SUPABASE_URL or SUPABASE_ANON_KEY repository secrets." >&2
  exit 1
fi

base="${SUPABASE_URL%/}"
auth=(-H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

step "Supabase auth health"
curl -fsS "${base}/auth/v1/health"
echo

step "Supabase PostgREST (ledger_entries, limit 1)"
curl -fsS "${auth[@]}" -H "Accept: application/json" \
  "${base}/rest/v1/ledger_entries?select=id&limit=1"
echo

if [ -n "${APP_URL:-}" ]; then
  step "Live app (${APP_URL})"
  live="${APP_URL%/}"
  code="$(curl -fsS -o /dev/null -w "%{http_code}" "${live}/primary")"
  if [ "${code}" != "200" ]; then
    echo "Expected HTTP 200 from ${live}/primary, got ${code}" >&2
    exit 1
  fi
  echo "GET /primary → ${code}"
fi

echo ""
echo "All health checks passed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

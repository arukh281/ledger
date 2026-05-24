#!/usr/bin/env bash
# Lint, build, and Supabase connectivity (also keeps Free-tier project awake).
set -euo pipefail

step() {
  echo ""
  echo "=== $1 ==="
}

SUPABASE_URL="$(printf '%s' "${SUPABASE_URL:-}" | tr -d '[:space:]')"
SUPABASE_ANON_KEY="$(printf '%s' "${SUPABASE_ANON_KEY:-}" | tr -d '[:space:]')"

curl_check() {
  local name="$1"
  shift
  local body_file http_code
  body_file="$(mktemp)"
  http_code="$(curl -sS -w "%{http_code}" -o "${body_file}" "$@")" || {
    echo "${name}: curl failed" >&2
    cat "${body_file}" >&2 || true
    rm -f "${body_file}"
    exit 1
  }

  if [ "${http_code}" != "200" ]; then
    echo "${name}: HTTP ${http_code}" >&2
    cat "${body_file}" >&2 || true
    if [ "${http_code}" = "401" ]; then
      echo "Hint: Supabase returned 401. Re-copy SUPABASE_URL and SUPABASE_ANON_KEY from Project Settings → API (anon public key, not service_role)." >&2
    fi
    rm -f "${body_file}"
    exit 1
  fi

  cat "${body_file}"
  rm -f "${body_file}"
  echo
}

step "Lint"
npm run lint

step "Build"
npm run build

step "Supabase credentials"
if [ -z "${SUPABASE_URL}" ] || [ -z "${SUPABASE_ANON_KEY}" ]; then
  echo "Missing SUPABASE_URL or SUPABASE_ANON_KEY repository secrets." >&2
  exit 1
fi

if [[ "${SUPABASE_URL}" == postgres://* ]] || [[ "${SUPABASE_URL}" == postgresql://* ]]; then
  echo "SUPABASE_URL must be the HTTPS Project URL (https://xxx.supabase.co), not the postgres connection string." >&2
  exit 1
fi

if [[ ! "${SUPABASE_URL}" =~ ^https:// ]]; then
  echo "SUPABASE_URL must start with https:// (got: ${SUPABASE_URL})" >&2
  exit 1
fi

base="${SUPABASE_URL%/}"
auth=(-H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

# Help catch mismatched GitHub secrets without printing the key.
url_ref="${base#https://}"
url_ref="${url_ref%%.supabase.co*}"
if [[ "${SUPABASE_ANON_KEY}" == eyJ* ]]; then
  key_ref="$(SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" python3 - <<'PY'
import base64, json, os, sys
token = os.environ["SUPABASE_ANON_KEY"].split(".")[1]
token += "=" * (-len(token) % 4)
try:
    payload = json.loads(base64.urlsafe_b64decode(token))
except Exception:
    sys.exit(0)
print(payload.get("ref", ""))
PY
)"
  if [ -n "${key_ref}" ] && [ "${key_ref}" != "${url_ref}" ]; then
    echo "SUPABASE_URL project (${url_ref}) does not match anon key project (${key_ref})." >&2
    echo "Re-copy both values from Supabase → Project Settings → API." >&2
    exit 1
  fi
fi

step "Supabase auth health"
curl_check "Supabase auth health" "${auth[@]}" "${base}/auth/v1/health"

step "Supabase PostgREST (ledger_entries, limit 1)"
curl_check "Supabase PostgREST" "${auth[@]}" -H "Accept: application/json" \
  "${base}/rest/v1/ledger_entries?select=id&limit=1"

if [ -n "${APP_URL:-}" ]; then
  step "Live app (${APP_URL})"
  live="${APP_URL%/}"
  live="${live%/party}"
  live="${live%/primary}"

  live_ok=""
  for path in "/" "/party"; do
    code="$(curl -sS -L -o /dev/null -w "%{http_code}" "${live}${path}" || echo "000")"
    echo "GET ${path} → ${code}"
    if [ "${code}" = "200" ]; then
      live_ok="1"
      break
    fi
  done

  if [ -z "${live_ok}" ]; then
    echo "Live app check failed for ${live}." >&2
    echo "Hint: set APP_URL to the deployed root only (e.g. https://your-app.vercel.app), or remove APP_URL if not deployed yet." >&2
    exit 1
  fi
fi

echo ""
echo "All checks passed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

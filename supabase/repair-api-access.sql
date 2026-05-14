-- =============================================================================
-- REPAIR: "Could not find the table 'public.vendors' in the schema cache"
-- =============================================================================
-- Run this in the SUPABASE DASHBOARD (browser) → SQL Editor.
-- "npm run dev" does NOT run this — it only starts Next.js on your laptop.
--
-- ALSO check the Data API exposes these tables (Supabase 2026+):
--   Dashboard → Project Settings → Data API (or Integrations → Data API)
--   Ensure schema "public" is exposed, and tables `vendors` and `ledger_entries`
--   are allowed for the REST API (per-table toggles if your project has them).
-- =============================================================================

-- 1) Confirm tables exist (should return two rows)
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('vendors', 'ledger_entries');

-- 2) Re-apply API grants (safe to run multiple times)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.vendors to anon, authenticated, service_role;
grant select, insert, update, delete on public.ledger_entries to anon, authenticated, service_role;

-- 3) Turn off RLS for this no-auth app (fixes "violates row-level security policy")
alter table public.vendors disable row level security;
alter table public.ledger_entries disable row level security;

-- 4) Force PostgREST to reload the schema cache
notify pgrst, 'reload schema';

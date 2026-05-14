-- Vendor Ledger App — Supabase Schema
-- Run the FULL script once in: Supabase Dashboard → SQL Editor → New query → Run
-- If you skip this, the app will error: "Could not find the table 'public.vendors'..."

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- Vendors Table
-- ============================================================
create table if not exists vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) >= 2),
  gstin       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enforce unique GSTIN (case-insensitive via stored uppercase)
create unique index if not exists vendors_gstin_unique
  on vendors (upper(gstin));

-- Index for fast name search
create index if not exists vendors_name_idx on vendors (lower(name));

-- ============================================================
-- Ledger Entries Table
-- ============================================================
create table if not exists ledger_entries (
  id                   uuid primary key default gen_random_uuid(),
  vendor_id            uuid not null references vendors(id) on delete cascade,
  type                 text not null check (type in ('invoice', 'payment')),
  date                 date not null,
  amount               numeric(15,2) not null check (amount > 0),
  doc_number           text not null,
  notes                text not null default '',
  is_system_generated  boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Indexes for ledger queries (vendor + date range)
create index if not exists entries_vendor_date_idx
  on ledger_entries (vendor_id, date);

create index if not exists entries_date_idx
  on ledger_entries (date);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists vendors_updated_at on vendors;
create trigger vendors_updated_at
  before update on vendors
  for each row execute function set_updated_at();

drop trigger if exists entries_updated_at on ledger_entries;
create trigger entries_updated_at
  before update on ledger_entries
  for each row execute function set_updated_at();

-- ============================================================
-- API access — Data API (PostgREST) must see these tables
-- Newer Supabase projects may require explicit grants (see Supabase changelog).
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.vendors to anon, authenticated, service_role;
grant select, insert, update, delete on public.ledger_entries to anon, authenticated, service_role;

-- ============================================================
-- Row-level security (anon key, no login)
-- Supabase often enables RLS on new tables; with no policies, INSERT fails with:
-- "new row violates row-level security policy". This app is single-user + no auth.
-- ============================================================
alter table public.vendors disable row level security;
alter table public.ledger_entries disable row level security;

-- Tell PostgREST to reload its schema cache (fixes stale "schema cache" errors)
notify pgrst, 'reload schema';

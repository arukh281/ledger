-- Secondary ledger book — run after primary schema.sql
-- Supabase Dashboard → SQL Editor → Run

-- ============================================================
-- Secondary Vendors (free-text ref, no uniqueness)
-- ============================================================
create table if not exists secondary_vendors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) >= 2),
  ref         text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists secondary_vendors_name_idx on secondary_vendors (lower(name));

-- ============================================================
-- Secondary Ledger Entries
-- ============================================================
create table if not exists secondary_ledger_entries (
  id                   uuid primary key default gen_random_uuid(),
  vendor_id            uuid not null references secondary_vendors(id) on delete cascade,
  type                 text not null check (type in ('invoice', 'payment')),
  date                 date not null,
  amount               numeric(15,2) not null check (amount > 0),
  doc_number           text not null,
  notes                text not null default '',
  is_system_generated  boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists secondary_entries_vendor_date_idx
  on secondary_ledger_entries (vendor_id, date);

create index if not exists secondary_entries_date_idx
  on secondary_ledger_entries (date);

drop trigger if exists secondary_vendors_updated_at on secondary_vendors;
create trigger secondary_vendors_updated_at
  before update on secondary_vendors
  for each row execute function set_updated_at();

drop trigger if exists secondary_entries_updated_at on secondary_ledger_entries;
create trigger secondary_entries_updated_at
  before update on secondary_ledger_entries
  for each row execute function set_updated_at();

grant select, insert, update, delete on public.secondary_vendors to anon, authenticated, service_role;
grant select, insert, update, delete on public.secondary_ledger_entries to anon, authenticated, service_role;

alter table public.secondary_vendors disable row level security;
alter table public.secondary_ledger_entries disable row level security;

notify pgrst, 'reload schema';

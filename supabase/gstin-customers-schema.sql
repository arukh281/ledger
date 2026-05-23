-- GSTIN directory — customer firms (primary/secondary come from ledger tables)
-- Supabase Dashboard → SQL Editor → Run

create table if not exists gstin_customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) >= 2),
  gstin       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists gstin_customers_gstin_unique
  on gstin_customers (upper(gstin));

create index if not exists gstin_customers_name_idx on gstin_customers (lower(name));

drop trigger if exists gstin_customers_updated_at on gstin_customers;
create trigger gstin_customers_updated_at
  before update on gstin_customers
  for each row execute function set_updated_at();

grant select, insert, update, delete on public.gstin_customers to anon, authenticated, service_role;

alter table public.gstin_customers disable row level security;

notify pgrst, 'reload schema';

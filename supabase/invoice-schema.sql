-- GST Tax Invoices — run after primary schema.sql
-- Supabase Dashboard → SQL Editor → Run

-- ============================================================
-- Invoices
-- ============================================================
create table if not exists invoices (
  id                   uuid primary key default gen_random_uuid(),
  invoice_no           text not null check (char_length(trim(invoice_no)) >= 1),
  invoice_date         date not null,
  bill_to_company      text not null default '',
  bill_to_address      text not null default '',
  bill_to_pin          text not null default '',
  bill_to_po           text not null default '',
  bill_to_gstin        text not null default '',
  ship_to_company      text not null default '',
  ship_to_address      text not null default '',
  transport_detail     text not null default '',
  tax_mode             text not null default 'igst' check (tax_mode in ('igst', 'cgst_sgst')),
  subtotal_5           numeric(15,2) not null default 0,
  subtotal_18          numeric(15,2) not null default 0,
  igst_5               numeric(15,2) not null default 0,
  igst_18              numeric(15,2) not null default 0,
  total_after_tax_5    numeric(15,2) not null default 0,
  total_after_tax_18   numeric(15,2) not null default 0,
  grand_total          numeric(15,2) not null default 0,
  amount_in_words      text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists invoices_invoice_no_unique
  on invoices (upper(trim(invoice_no)));

create index if not exists invoices_date_idx on invoices (invoice_date desc);

-- ============================================================
-- Invoice line items
-- ============================================================
create table if not exists invoice_line_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references invoices(id) on delete cascade,
  serial_no    text not null default '',
  description  text not null default '',
  hsn_code     text not null default '',
  quantity     numeric(15,3) not null check (quantity > 0),
  rate         numeric(15,2) not null check (rate >= 0),
  gst_rate     smallint not null check (gst_rate in (5, 18)),
  line_amount  numeric(15,2) not null default 0,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists invoice_line_items_invoice_idx
  on invoice_line_items (invoice_id, sort_order);

drop trigger if exists invoices_updated_at on invoices;
create trigger invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

grant select, insert, update, delete on public.invoices to anon, authenticated, service_role;
grant select, insert, update, delete on public.invoice_line_items to anon, authenticated, service_role;

alter table public.invoices disable row level security;
alter table public.invoice_line_items disable row level security;

notify pgrst, 'reload schema';

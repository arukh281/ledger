-- Add tax_mode to invoices (run if invoice-schema.sql was applied earlier)
alter table public.invoices
  add column if not exists tax_mode text not null default 'igst'
  check (tax_mode in ('igst', 'cgst_sgst'));

notify pgrst, 'reload schema';

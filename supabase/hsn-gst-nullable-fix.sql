-- Fix: allow empty GST (—) on hsn_catalog
-- Run once if you see: null value in column "gst_rate" violates not-null constraint

alter table public.hsn_catalog
  alter column gst_rate drop not null;

alter table public.hsn_catalog
  alter column gst_rate drop default;

alter table public.hsn_catalog
  drop constraint if exists hsn_catalog_gst_rate_check;

alter table public.hsn_catalog
  add constraint hsn_catalog_gst_rate_check
  check (gst_rate is null or gst_rate in (0, 5, 12, 18, 28));

notify pgrst, 'reload schema';

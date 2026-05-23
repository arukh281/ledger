-- HSN catalog GST rates — run in Supabase SQL Editor to add column and/or refresh rates
-- If inserts fail with gst_rate not-null: run hsn-gst-nullable-fix.sql first.

alter table public.hsn_catalog
  add column if not exists gst_rate smallint;

-- Required even if column was created earlier as NOT NULL DEFAULT 18
alter table public.hsn_catalog
  alter column gst_rate drop not null;

alter table public.hsn_catalog
  alter column gst_rate drop default;

alter table public.hsn_catalog
  drop constraint if exists hsn_catalog_gst_rate_check;

alter table public.hsn_catalog
  add constraint hsn_catalog_gst_rate_check
  check (gst_rate is null or gst_rate in (0, 5, 12, 18, 28));

-- 18%
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Pitambar powder');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Jar keeper container pet');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Balti mug tub casserole, Lab box Tiffin, melamin crockery');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('wheel bin 120 L 80');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('glassbottle');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Glassware');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Glass stove, all type steel glass');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('pressure cooker gasket');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('kohe gratter Apex press chopper');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('glass chimmey');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('peeler knife, Anjali, and others');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Spoon cutlery');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('link lock');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('kent water filter');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('electic chopper slow juicer');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('electric teapot 1.2, nutrition mixer, press, airfryer, induction, pop toster otg');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Teapot Milton 1.5');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('shoe rack/round stool');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Spin mob and spot zero and others');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Gas lighter, all type');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('Thermo steel bottles, vacuum bottles, and lids');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('stone chakla and kundi');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('non stick coating');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('filter candle');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('garlic press');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('napkin toilet roll');
update public.hsn_catalog set gst_rate = 18, updated_at = now() where lower(trim(item)) = lower('bag non wooven');

-- 12%
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('micro fiber cloth');
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('Brass and copper wear');
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('Wood Chakla and belan');
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('Aluminium utensils');
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('steel cooker, pressure cooker');
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('miniature cooker');
update public.hsn_catalog set gst_rate = 12, updated_at = now() where lower(trim(item)) = lower('feeding nipple');

-- 5% and 0%
update public.hsn_catalog set gst_rate = 5, updated_at = now() where lower(trim(item)) = lower('kharata broom 5%');
update public.hsn_catalog set gst_rate = 0, updated_at = now() where lower(trim(item)) = lower('grass broom non dust 0%');

notify pgrst, 'reload schema';

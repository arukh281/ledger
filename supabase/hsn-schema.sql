-- HSN catalog — item name → HSN code + GST %
-- Supabase Dashboard → SQL Editor → Run (after primary schema.sql)
-- If table exists without gst_rate, run hsn-gst-rate.sql instead.

create table if not exists hsn_catalog (
  id          uuid primary key default gen_random_uuid(),
  item        text not null check (char_length(trim(item)) >= 1),
  hsn         text not null check (char_length(trim(hsn)) >= 4),
  gst_rate    smallint check (gst_rate is null or gst_rate in (0, 5, 12, 18, 28)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists hsn_catalog_item_unique
  on hsn_catalog (lower(trim(item)));

create index if not exists hsn_catalog_hsn_idx on hsn_catalog (hsn);
create index if not exists hsn_catalog_item_search_idx on hsn_catalog (lower(item));

drop trigger if exists hsn_catalog_updated_at on hsn_catalog;
create trigger hsn_catalog_updated_at
  before update on hsn_catalog
  for each row execute function set_updated_at();

grant select, insert, update, delete on public.hsn_catalog to anon, authenticated, service_role;

alter table public.hsn_catalog disable row level security;

-- Seed default catalog (idempotent; refreshes HSN + GST on re-run)
insert into hsn_catalog (item, hsn, gst_rate) values
  ('Pitambar powder', '3405', 18),
  ('Jar keeper container pet', '3923', 18),
  ('Balti mug tub casserole, Lab box Tiffin, melamin crockery', '3924', 18),
  ('wheel bin 120 L 80', '3926', 18),
  ('glassbottle', '7010', 18),
  ('Glassware', '7013', 18),
  ('Glass stove, all type steel glass', '7321', 18),
  ('pressure cooker gasket', '7616', 18),
  ('kohe gratter Apex press chopper', '8210', 18),
  ('glass chimmey', '8211', 18),
  ('peeler knife, Anjali, and others', '8211', 18),
  ('Spoon cutlery', '8215', 18),
  ('link lock', '8301', 18),
  ('kent water filter', '8421', 18),
  ('electic chopper slow juicer', '8509', 18),
  ('electric teapot 1.2, nutrition mixer, press, airfryer, induction, pop toster otg', '8516', 18),
  ('Teapot Milton 1.5', '8521', 18),
  ('shoe rack/round stool', '9403', 18),
  ('Spin mob and spot zero and others', '9603', 18),
  ('Gas lighter, all type', '9613', 18),
  ('Thermo steel bottles, vacuum bottles, and lids', '9617', 18),
  ('stone chakla and kundi', '6802', 18),
  ('non stick coating', '9989', 18),
  ('filter candle', '6909', 18),
  ('garlic press', '8205', 18),
  ('napkin toilet roll', '4818', 18),
  ('bag non wooven', '6305', 18),
  ('micro fiber cloth', '6307', 12),
  ('Brass and copper wear', '7418', 12),
  ('Wood Chakla and belan', '4419', 12),
  ('Aluminium utensils', '7615', 12),
  ('steel cooker, pressure cooker', '7323', 12),
  ('miniature cooker', '9503', 12),
  ('feeding nipple', '4014', 12),
  ('kharata broom 5%', '9603', 5),
  ('grass broom non dust 0%', '9603', 0)
on conflict ((lower(trim(item)))) do update set
  hsn = excluded.hsn,
  gst_rate = excluded.gst_rate,
  updated_at = now();

notify pgrst, 'reload schema';

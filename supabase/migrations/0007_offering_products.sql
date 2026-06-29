-- 0007 供花・供物の商品マスタ（葬儀社ごと）＋ 画像用ストレージバケット
create table if not exists offering_products_master (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null references funeral_homes(id) on delete cascade,
  type text not null default '供花' check (type in ('供花','供物')),
  name text not null,
  price_jpy int not null default 0,
  description text,
  size text,
  image_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_fh on offering_products_master(funeral_home_id);
alter table offering_products_master enable row level security;
-- 公開（注文フォーム）で読めるよう anon に SELECT 付与（有効商品のみ別途ビュー/RPCで絞るのが理想だが暫定）
grant select on offering_products_master to anon, authenticated;
create policy products_public_read on offering_products_master for select using (is_active = true);

-- 葬儀社の支払い方法/注文設定（jsonb）
alter table funeral_homes add column if not exists order_settings jsonb;

-- 画像用ストレージバケット（公開読取）
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

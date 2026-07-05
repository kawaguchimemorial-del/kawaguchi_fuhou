-- 商品を実スマート葬儀のフィールド構成に拡張＋セット商品テーブル新設
alter table fk_products add column if not exists product_code text;
alter table fk_products add column if not exists model_code text;
alter table fk_products add column if not exists cost_tax numeric(4,2) default 0.1;
alter table fk_products add column if not exists deduction text;          -- 非適格事業者用控除
alter table fk_products add column if not exists refundable boolean not null default false; -- 立替金
alter table fk_products add column if not exists description text;       -- 商品説明
alter table fk_products add column if not exists remarks text;           -- 補足説明
alter table fk_products add column if not exists available_ec boolean not null default false;
alter table fk_products add column if not exists available_homepage boolean not null default false;
alter table fk_products add column if not exists available_attendant boolean not null default false;
alter table fk_products add column if not exists available_returned_item boolean not null default false;
alter table fk_products add column if not exists available_item boolean not null default false;
alter table fk_products add column if not exists grouped boolean not null default false;
alter table fk_products add column if not exists not_ordering boolean not null default false;
alter table fk_products add column if not exists order_only boolean not null default false;
alter table fk_products add column if not exists hidden_picking boolean not null default false;
alter table fk_products add column if not exists hidden boolean not null default false;
alter table fk_products add column if not exists source_id text;         -- スマート葬儀側ID（移植元）

-- セット商品
create table if not exists fk_product_sets (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  code text,
  name text not null,
  description text,
  price int not null default 0,               -- セット価格(税抜)
  tax_included_price int not null default 0,  -- セット価格(税込)
  tax numeric(4,2) not null default 0.1,      -- 消費税率
  self_planning boolean not null default false, -- セルフプランニングに表示する
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_product_sets_home on fk_product_sets(funeral_home_id) where deleted_at is null;

-- セット内訳
create table if not exists fk_product_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references fk_product_sets(id) on delete cascade,
  product_source_id text,   -- スマート葬儀側 商品ID
  product_id uuid references fk_products(id) on delete set null,
  quantity int not null default 1,
  hide_on_invoice boolean not null default false, -- 請求(見積)書に出力しない
  not_ordering boolean not null default false,    -- 発注しない
  sort_order int not null default 0
);
create index if not exists idx_fk_set_items_set on fk_product_set_items(set_id);

drop trigger if exists t_fk_product_sets on fk_product_sets;
create trigger t_fk_product_sets before update on fk_product_sets for each row execute function set_updated_at_fk();

alter table fk_product_sets enable row level security;
alter table fk_product_set_items enable row level security;

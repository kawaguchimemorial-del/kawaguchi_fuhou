-- 0011 葬儀管理(kanri) 中核: マスタ / 商品 / 見積 / 見積明細 / 請求
-- すべて fk_ プレフィックス・service_role運用(RLS有効・ポリシー無し)。

-- 汎用マスタ（会場/斎場火葬場/発行会社/顧客種別/流入経路/商品種別/発注先/売上区分 等）
create table if not exists fk_master_items (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  master_type text not null,          -- venue, crematorium, org_company, customer_kind, inflow, product_kind, supplier, ...
  name text not null,
  kana text,
  price int,
  tax_rate numeric(4,3),
  extra jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_master_type on fk_master_items(funeral_home_id, master_type) where deleted_at is null;

-- 商品
create table if not exists fk_products (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  product_kind text,                  -- 商品種別
  name text not null,
  kana text,
  unit_price int not null default 0,  -- 税抜単価
  cost_price int,                     -- 原価
  tax_rate numeric(4,3) not null default 0.10,
  unit text,                          -- 単位(式/個/名 等)
  supplier text,                      -- 発注先
  note text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_products_home on fk_products(funeral_home_id) where deleted_at is null;

-- 見積
create table if not exists fk_estimates (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  estimate_no text,
  customer_id uuid references fk_customers(id) on delete set null,
  title text,
  memo text,
  estimate_on date,
  estimate_limit_on date,
  kind text not null default 'funeral',   -- pre(事前) / funeral(葬儀)
  -- 故人
  deceased_last_name text, deceased_first_name text,
  deceased_last_name_kana text, deceased_first_name_kana text,
  deceased_gender text, deceased_birth_date date, deceased_death_date date, deceased_age int,
  -- 喪主
  mourner_last_name text, mourner_first_name text, mourner_kana text, mourner_relation text,
  mourner_phone text, mourner_postcode text, mourner_prefecture text,
  mourner_address_city text, mourner_address_street text, mourner_address_building text,
  -- 日程/会場
  religion text,
  wake_at timestamptz,        -- 通夜
  funeral_at timestamptz,     -- 葬儀・告別式
  venue_name text,            -- 式場
  venue_address text,
  crematorium_name text,      -- 火葬場
  -- 金額
  subtotal int not null default 0,
  discount_total int not null default 0,
  tax_total int not null default 0,
  total int not null default 0,
  advance_payment int not null default 0,
  status text not null default 'draft',   -- draft / confirmed
  memorial_id uuid references memorials(id) on delete set null,  -- 訃報案内連携
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_estimates_home on fk_estimates(funeral_home_id) where deleted_at is null;
create index if not exists idx_fk_estimates_customer on fk_estimates(customer_id);

-- 見積明細
create table if not exists fk_estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references fk_estimates(id) on delete cascade,
  product_id uuid references fk_products(id) on delete set null,
  line_kind text not null default 'item',  -- item / discount
  name text not null,
  unit_price int not null default 0,
  quantity int not null default 1,
  tax_rate numeric(4,3) not null default 0.10,
  amount int not null default 0,           -- unit_price*quantity (税抜, discountは負)
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_fk_estimate_items on fk_estimate_items(estimate_id);

-- 請求書（見積から生成）
create table if not exists fk_invoices (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  estimate_id uuid references fk_estimates(id) on delete set null,
  invoice_no text,
  billed_on date,
  due_on date,
  total int not null default 0,
  paid_total int not null default 0,
  status text not null default 'unpaid',   -- unpaid / partial / paid
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_invoices_home on fk_invoices(funeral_home_id) where deleted_at is null;

-- updated_at triggers
drop trigger if exists t_fk_master on fk_master_items;
create trigger t_fk_master before update on fk_master_items for each row execute function set_updated_at_fk();
drop trigger if exists t_fk_products on fk_products;
create trigger t_fk_products before update on fk_products for each row execute function set_updated_at_fk();
drop trigger if exists t_fk_estimates on fk_estimates;
create trigger t_fk_estimates before update on fk_estimates for each row execute function set_updated_at_fk();
drop trigger if exists t_fk_invoices on fk_invoices;
create trigger t_fk_invoices before update on fk_invoices for each row execute function set_updated_at_fk();

alter table fk_master_items enable row level security;
alter table fk_products enable row level security;
alter table fk_estimates enable row level security;
alter table fk_estimate_items enable row level security;
alter table fk_invoices enable row level security;

-- 0012 葬儀管理: 発注/納品/買掛(fk_purchase_orders,fk_purchase_order_items) と SMS(fk_sms_logs)
create table if not exists fk_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  estimate_id uuid references fk_estimates(id) on delete set null,
  supplier text,                        -- 発注先
  order_no text,
  ordered_on date,
  delivered_on date,
  status text not null default 'ordered',   -- ordered / delivered
  payment_status text not null default 'unpaid', -- 買掛: unpaid / paid
  total int not null default 0,             -- 税抜合計(原価ベース)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_po_home on fk_purchase_orders(funeral_home_id) where deleted_at is null;

create table if not exists fk_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references fk_purchase_orders(id) on delete cascade,
  name text not null,
  unit_price int not null default 0,
  quantity int not null default 1,
  amount int not null default 0,
  sort_order int not null default 0
);
create index if not exists idx_fk_po_items on fk_purchase_order_items(order_id);

create table if not exists fk_sms_logs (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  customer_id uuid references fk_customers(id) on delete set null,
  phone text,
  body text not null,
  status text not null default 'sent',      -- sent / failed
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_fk_sms_home on fk_sms_logs(funeral_home_id);

drop trigger if exists t_fk_po on fk_purchase_orders;
create trigger t_fk_po before update on fk_purchase_orders for each row execute function set_updated_at_fk();

alter table fk_purchase_orders enable row level security;
alter table fk_purchase_order_items enable row level security;
alter table fk_sms_logs enable row level security;

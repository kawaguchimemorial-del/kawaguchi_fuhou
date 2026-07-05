-- 関連顧客（顧客同士の紐付け）
create table if not exists fk_related_customers (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  customer_id uuid not null references fk_customers(id) on delete cascade,
  related_customer_id uuid not null references fk_customers(id) on delete cascade,
  relation text,
  created_at timestamptz not null default now()
);
create index if not exists idx_fk_related_customer on fk_related_customers(customer_id);
alter table fk_related_customers enable row level security;

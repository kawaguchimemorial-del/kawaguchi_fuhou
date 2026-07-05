-- 0013 葬儀管理: 顧客の対応履歴
create table if not exists fk_customer_notes (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  customer_id uuid not null references fk_customers(id) on delete cascade,
  kind text,
  body text not null,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_fk_notes_customer on fk_customer_notes(customer_id);
alter table fk_customer_notes enable row level security;

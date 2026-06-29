-- 0006 弔意・注文の保存テーブル（焼香/メッセージ/香典/供花注文/RSVP/閲覧）
-- 書き込みはサーバー(service_role)経由のみ。RLSはdeny-by-default（service_roleは迂回）。

create table if not exists virtual_worships (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  worship_type text not null,
  display_name text,
  is_anonymous boolean not null default true,
  message text,
  created_at timestamptz not null default now()
);

create table if not exists condolence_messages (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  sender_name text not null,
  body text not null,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending','approved','rejected','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists offering_orders (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  product_id text, product_name text, quantity int not null default 1,
  unit_price_jpy int not null default 0,
  orderer_name text, orderer_kana text, company text,
  postal_code text, address text, phone text, email text,
  name_plate_text text, old_char boolean default false,
  invoice_name text, memo text,
  status text not null default 'pending_confirm',
  created_at timestamptz not null default now()
);

create table if not exists koden_payments (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  donor_name text not null, donor_company text,
  amount_jpy int not null, hyogaki text,
  fee_payer text not null default 'recipient',
  message text, is_amount_public boolean not null default false,
  status text not null default 'requires_payment',
  created_at timestamptz not null default now()
);

create table if not exists rsvp (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  attendee_name text not null, kana text,
  mode text not null default 'real', event text, headcount int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists memorial_views (
  id uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  kind text not null default 'venue',  -- obituary | venue
  created_at timestamptz not null default now()
);

create index if not exists idx_worships_mem on virtual_worships(memorial_id);
create index if not exists idx_messages_mem on condolence_messages(memorial_id);
create index if not exists idx_orders_mem on offering_orders(memorial_id);
create index if not exists idx_koden_mem on koden_payments(memorial_id);
create index if not exists idx_rsvp_mem on rsvp(memorial_id);
create index if not exists idx_views_mem on memorial_views(memorial_id);

alter table virtual_worships enable row level security;
alter table condolence_messages enable row level security;
alter table offering_orders enable row level security;
alter table koden_payments enable row level security;
alter table rsvp enable row level security;
alter table memorial_views enable row level security;

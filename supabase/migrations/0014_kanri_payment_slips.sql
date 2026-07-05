-- 入金伝票（伝票発行）と入金明細
create table if not exists fk_payment_slips (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  invoice_id uuid references fk_invoices(id) on delete cascade,
  source text,             -- 入金先
  slip_kind text,          -- 伝票区分
  performance_no text,     -- 施行番号
  slip_no text,            -- 伝票番号（空なら自動採番）
  issued_on date,          -- 発行日
  addressee text,          -- 宛名
  honorific text default '様', -- 敬称
  note text,               -- 但し書き
  issuer_company text,     -- 発行会社
  transfer_name text,      -- 振込依頼名
  summary text,            -- 摘要
  remark text,             -- 備考
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_payment_slips_invoice on fk_payment_slips(invoice_id) where deleted_at is null;

create table if not exists fk_payments (
  id uuid primary key default gen_random_uuid(),
  slip_id uuid references fk_payment_slips(id) on delete cascade,
  invoice_id uuid references fk_invoices(id) on delete cascade,
  amount int not null default 0,     -- 入金額
  paid_on date,                      -- 入金日
  method text,                       -- 入金方法
  category text,                     -- 入金種別
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_fk_payments_slip on fk_payments(slip_id);
create index if not exists idx_fk_payments_invoice on fk_payments(invoice_id);

drop trigger if exists t_fk_payment_slips on fk_payment_slips;
create trigger t_fk_payment_slips before update on fk_payment_slips for each row execute function set_updated_at_fk();

alter table fk_payment_slips enable row level security;
alter table fk_payments enable row level security;

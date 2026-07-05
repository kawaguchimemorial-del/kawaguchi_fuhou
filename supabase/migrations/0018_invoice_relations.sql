-- 顧客⇔見積⇔請求の正しいリレーション構造（実スマート葬儀準拠）
-- 請求書は見積に依存しない独立エンティティ（供花のみの請求等）。顧客に直接紐付く。

alter table fk_customers add column if not exists source_id text;   -- スマート葬儀 顧客ID
create index if not exists idx_fk_customers_source on fk_customers(source_id) where deleted_at is null;

alter table fk_estimates add column if not exists source_id text;   -- スマート葬儀 見積ID

alter table fk_invoices add column if not exists customer_id uuid references fk_customers(id) on delete set null;
alter table fk_invoices add column if not exists source_id text;    -- スマート葬儀 請求書番号
alter table fk_invoices add column if not exists title text;        -- 件名
alter table fk_invoices add column if not exists sale_category text; -- 売上区分
alter table fk_invoices add column if not exists construction_no text; -- 施行番号
alter table fk_invoices add column if not exists deceased_name text;   -- 対象者
alter table fk_invoices add column if not exists mourner_name text;    -- 喪主名
-- 請求先（顧客と異なる宛先に請求できる: 供花注文者・支払者が別人の場合）
alter table fk_invoices add column if not exists invoice_target_kind text;
alter table fk_invoices add column if not exists invoice_target_name text;
alter table fk_invoices add column if not exists invoice_target_first_name text;
alter table fk_invoices add column if not exists invoice_target_name_kana text;
alter table fk_invoices add column if not exists invoice_target_postcode text;
alter table fk_invoices add column if not exists invoice_target_prefecture text;
alter table fk_invoices add column if not exists invoice_target_address_city text;
alter table fk_invoices add column if not exists invoice_target_address_street text;
alter table fk_invoices add column if not exists invoice_target_address_building text;
create index if not exists idx_fk_invoices_customer on fk_invoices(customer_id) where deleted_at is null;
create index if not exists idx_fk_invoices_source on fk_invoices(source_id) where deleted_at is null;

-- 請求書明細（実 invoice_details 準拠）
create table if not exists fk_invoice_details (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references fk_invoices(id) on delete cascade,
  divide_title text,            -- 区切りタイトル
  title text not null,          -- 項目名
  tag_name text,                -- 札名
  price int not null default 0, -- 単価(税抜)
  price_including_tax int,      -- 税込単価
  cost int default 0,           -- 下代
  tax numeric(4,2) not null default 0.1,
  discount int default 0,       -- 割引(税抜)
  quantity numeric(8,2) not null default 1,
  amount int not null default 0,        -- 税抜合計
  tax_amount int not null default 0,    -- 消費税
  amount_including_tax int not null default 0, -- 税込合計
  deposit boolean not null default false,      -- 預り金
  refundable boolean not null default false,   -- 立替金
  hidden_paper boolean not null default false, -- 請求書に非表示
  traded_on date,               -- 取引日
  returned_quantity numeric(8,2) default 0, -- 返品数
  remarks text,                 -- 補足説明
  product_source_id text,       -- スマート葬儀 商品ID
  sale_kind text,               -- 販売種別
  category_large text,          -- 大分類
  category_middle text,         -- 中分類
  supplier text,                -- 発注先
  sort_order int not null default 0
);
create index if not exists idx_fk_invoice_details_invoice on fk_invoice_details(invoice_id);
alter table fk_invoice_details enable row level security;

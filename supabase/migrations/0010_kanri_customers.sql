-- 0010 葬儀管理(kanri): 顧客テーブル。スマート葬儀の顧客フォームを踏襲。
-- fk_ プレフィックスで訃報案内(memorials等)と分離。service_role でのみアクセス。
create table if not exists fk_customers (
  id              uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  customer_no     text,                    -- 顧客番号(relation_id) 自動採番
  last_name       text not null,           -- 顧客氏
  first_name      text,                    -- 顧客名
  last_name_kana  text,                    -- 顧客セイ
  first_name_kana text,                    -- 顧客メイ
  status          text,                    -- ステータス
  inflow          text,                    -- 流入経路
  staff_name      text,                    -- 顧客担当
  registered_at   timestamptz default now(),
  gender          text,                    -- 男性/女性/未設定
  birth_date      date,
  telephone_number text,
  mobile_number    text,
  fax_number       text,
  email            text,
  available_sms_auto_sent boolean not null default true,
  available_dm_send       boolean not null default true,
  available_mail_magazine boolean not null default false,
  postcode        text,
  prefecture_code text,
  address_city    text,
  address_street  text,
  address_building text,
  note            text,                    -- その他備考
  rank            text,                    -- 顧客ランク
  reason          text,                    -- 問い合わせ理由
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_fk_customers_home on fk_customers(funeral_home_id) where deleted_at is null;
create index if not exists idx_fk_customers_created on fk_customers(created_at desc);

alter table fk_customers enable row level security;  -- service_role のみ(ポリシー無し=deny)

create or replace function set_updated_at_fk()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists t_fk_customers on fk_customers;
create trigger t_fk_customers before update on fk_customers for each row execute function set_updated_at_fk();

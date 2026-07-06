-- 見積明細に実フォーム準拠の列を追加（札名/下代/割引/預り金/立替金/取引日/返品数/補足/区切りタイトル）
alter table fk_estimate_items add column if not exists tag_name text;
alter table fk_estimate_items add column if not exists cost int default 0;
alter table fk_estimate_items add column if not exists discount int default 0;
alter table fk_estimate_items add column if not exists deposit boolean not null default false;
alter table fk_estimate_items add column if not exists refundable boolean not null default false;
alter table fk_estimate_items add column if not exists traded_on date;
alter table fk_estimate_items add column if not exists returned_quantity numeric(8,2) default 0;
alter table fk_estimate_items add column if not exists remarks text;
alter table fk_estimate_items add column if not exists divide_title text;
alter table fk_estimate_items add column if not exists price_including_tax int;
-- 請求明細の不足分
alter table fk_invoice_details add column if not exists returned_appropriated boolean not null default false;

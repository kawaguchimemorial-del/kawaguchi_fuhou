-- 見積: 宛名情報・セット商品・発行情報（実スマート葬儀の見積作成フォーム準拠）
alter table fk_estimates add column if not exists addressee_kind text default '喪主';
alter table fk_estimates add column if not exists addressee_last_name text;
alter table fk_estimates add column if not exists addressee_first_name text;
alter table fk_estimates add column if not exists addressee_honorific text default '様';
alter table fk_estimates add column if not exists addressee_last_name_kana text;
alter table fk_estimates add column if not exists addressee_first_name_kana text;
alter table fk_estimates add column if not exists addressee_postcode text;
alter table fk_estimates add column if not exists addressee_prefecture text;
alter table fk_estimates add column if not exists addressee_address_city text;
alter table fk_estimates add column if not exists addressee_address_street text;
alter table fk_estimates add column if not exists addressee_address_building text;
alter table fk_estimates add column if not exists product_set_id uuid references fk_product_sets(id) on delete set null;
alter table fk_estimates add column if not exists product_set_price int default 0;
alter table fk_estimates add column if not exists brand text;
alter table fk_estimates add column if not exists issuer_company text;
alter table fk_estimates add column if not exists charged_org text;
alter table fk_estimates add column if not exists charged_user text;

-- 請求書にも顧客同様の宛先kind以外の発行情報
alter table fk_invoices add column if not exists due_note text;
alter table fk_invoices add column if not exists issuer_company text;
alter table fk_invoices add column if not exists charged_org text;
alter table fk_invoices add column if not exists charged_user text;
alter table fk_invoices add column if not exists product_set_id uuid references fk_product_sets(id) on delete set null;
alter table fk_invoices add column if not exists advance_payment int default 0;

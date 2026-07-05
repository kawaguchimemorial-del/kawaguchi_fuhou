-- 顧客ダブりチェック: 除外フラグ
alter table fk_customers add column if not exists dedup_excluded boolean not null default false;

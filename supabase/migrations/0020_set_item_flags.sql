-- セット内訳行のフラグ（表示しない/セットに含まれる）
alter table fk_estimate_items add column if not exists is_set_item boolean not null default false;
alter table fk_estimate_items add column if not exists hidden_paper boolean not null default false;
alter table fk_invoice_details add column if not exists is_set_item boolean not null default false;

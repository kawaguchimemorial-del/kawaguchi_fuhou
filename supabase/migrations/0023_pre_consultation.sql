-- 事前相談フラグ（見積）: 事前相談時は喪主/故人が未確定のため必須にしない。
-- 依頼(本番)時の必須チェックは is_pre_consultation=false を条件に後日実装する。
alter table fk_estimates add column if not exists is_pre_consultation boolean not null default false;

-- 担当者（スマート葬儀の最終更新者=葬儀担当者）
alter table fk_estimates add column if not exists staff_name text;
alter table fk_invoices add column if not exists staff_name text;

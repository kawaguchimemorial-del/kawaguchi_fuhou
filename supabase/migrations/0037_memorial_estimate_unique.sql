-- 1見積(施行)につき生存する訃報は1件のみ、をDBレベルで保証。
-- 削除済み(deleted_at)は対象外(過去の終了案件と新規が同一見積を共有できるように部分ユニーク)。
create unique index if not exists uq_memorials_estimate_live
  on memorials (estimate_id)
  where estimate_id is not null and deleted_at is null;

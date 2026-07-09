-- AI遺影を「施行(見積)」で一意に紐付ける。fk_ai_portraits.estimate_id = fk_estimates.id = memorials.estimate_id。
-- 名前照合の同姓同名・父母別葬儀の誤マッチを解消する正準キー。列追加のみ・NULL許容(見積無し単発も許容)。
do $$ begin
  alter table fk_ai_portraits add column if not exists estimate_id uuid;
  begin
    alter table fk_ai_portraits add constraint fk_ai_portraits_estimate
      foreign key (estimate_id) references fk_estimates(id) on delete set null;
  exception when duplicate_object then null; end;
end $$;
create index if not exists idx_fk_ai_portraits_estimate on fk_ai_portraits(estimate_id) where deleted_at is null;

do $$ begin
  alter table memorials add column if not exists estimate_id uuid;
  begin
    alter table memorials add constraint memorials_estimate
      foreign key (estimate_id) references fk_estimates(id) on delete set null;
  exception when duplicate_object then null; end;
end $$;
create index if not exists idx_memorials_estimate on memorials(estimate_id);

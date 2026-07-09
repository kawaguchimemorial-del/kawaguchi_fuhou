-- 司会台本・会葬礼状の作成履歴。作成ツール(/funeral-script)がここへ結果を保存し、一覧表示する。
-- content には保存ファイル(FuneralScriptSavedFile: form/sections/originalLetter/savedAt)をそのまま格納。
create table if not exists fk_funeral_scripts (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  customer_id uuid,
  estimate_id uuid,
  deceased_name text not null,      -- 対象者(故人)名
  ceremony_type text,               -- 式種別(buddhist_wake_funeral 等)
  title text,                       -- 表示用タイトル(任意)
  content jsonb not null,           -- { form, sections, originalLetter, savedAt, ... }
  created_by text,                  -- 作成者
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create index if not exists idx_fk_funeral_scripts_home on fk_funeral_scripts(funeral_home_id, created_at desc) where deleted_at is null;
create index if not exists idx_fk_funeral_scripts_estimate on fk_funeral_scripts(estimate_id) where deleted_at is null;
alter table fk_funeral_scripts enable row level security;

-- PostgREST の顧客名/施行日エンベッドに必要な外部キー(AI遺影と同方針)。
do $$ begin
  alter table fk_funeral_scripts
    add constraint fk_funeral_scripts_customer
    foreign key (customer_id) references fk_customers(id) on delete set null;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table fk_funeral_scripts
    add constraint fk_funeral_scripts_estimate
    foreign key (estimate_id) references fk_estimates(id) on delete set null;
exception when duplicate_object then null;
end $$;

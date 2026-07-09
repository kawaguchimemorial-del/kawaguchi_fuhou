-- AI遺影写真の作成履歴。AI生成本体(別プロジェクト)がここへ結果を保存し、一覧表示する。
create table if not exists fk_ai_portraits (
  id uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null,
  customer_id uuid,
  deceased_name text,               -- 対象者(故人)名
  image_url text,                   -- 完成した遺影画像URL
  thumb_url text,                   -- サムネイルURL(任意)
  source_image_url text,            -- 元写真URL(任意)
  note text,
  created_by text,                  -- 作成者
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_fk_ai_portraits_home on fk_ai_portraits(funeral_home_id, created_at desc) where deleted_at is null;
alter table fk_ai_portraits enable row level security;

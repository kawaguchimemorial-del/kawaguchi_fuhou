-- =============================================================================
-- 0001 コアスキーマ: テナント / ユーザー / 訃報 / 故人 / 日程 / 訂正履歴 / 監査
-- 仕様: docs/01-unified-spec.md 第6章
-- 原則: PK=uuid / 公開URL=slug(推測不能) / 金額=integer円 / 全業務表に funeral_home_id
--       / created_at・updated_at・deleted_at(論理削除) / RLSはdeny-by-default+FORCE
-- =============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid, crypt
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- 共通: updated_at 自動更新トリガ
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- ENUM 群（text+CHECKでも可だが拡張を見据えenumで定義。追加はALTER TYPE）
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role        as enum ('home_admin','operator','mourner','family');
  create type memorial_status   as enum ('draft','published','closed','archived');
  create type access_level       as enum ('public','unlisted','passcode','invite_only');
  create type funeral_style       as enum ('family','general','direct');           -- 家族葬/一般葬/直葬
  create type religion_type        as enum ('仏式','浄土真宗','神式','キリスト教式','無宗教','中立');
  create type event_type            as enum ('通夜','葬儀','告別式','出棺','火葬','法要');
  create type member_role            as enum ('chief_mourner','family');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- テナント: 葬儀社
-- ---------------------------------------------------------------------------
create table funeral_homes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_path     text,
  contact_email text,
  phone         text,
  address       text,
  plan          text not null default 'standard',
  billing_type  text not null default 'revshare' check (billing_type in ('fixed','revshare')),
  fee_rate      numeric(5,4) not null default 0.0000,         -- 取引手数料率
  branding      jsonb not null default '{}'::jsonb,
  stripe_account_id text,
  kyc_status    text not null default 'none',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- プロフィール（auth.users 1:1）。RLSは本表を再帰参照しない（JWTクレーム駆動）
-- ---------------------------------------------------------------------------
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  funeral_home_id uuid references funeral_homes(id) on delete set null,
  role            user_role not null default 'mourner',
  display_name    text,
  phone           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 訃報（案件本体）
-- ---------------------------------------------------------------------------
create table memorials (
  id              uuid primary key default gen_random_uuid(),
  funeral_home_id uuid not null references funeral_homes(id) on delete restrict,
  slug            text not null unique,                       -- 推測不能(nanoid/ULID, 128bit+)
  status          memorial_status not null default 'draft',
  access_level    access_level not null default 'unlisted',   -- 既定は限定公開(privacy by default)
  passcode_hash   text,                                       -- access_level=passcode時のみ
  noindex_flag    boolean not null default true,              -- 既定 noindex
  funeral_style   funeral_style,
  religion_type   religion_type not null default '中立',
  koden_decline   boolean not null default false,             -- 香典辞退
  flower_decline  boolean not null default false,             -- 供花辞退
  attend_decline  boolean not null default false,             -- 参列辞退
  koden_accept_until    timestamptz,
  offering_accept_until timestamptz,
  published_at    timestamptz,
  archive_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on memorials (funeral_home_id);
create index on memorials (status) where deleted_at is null;

-- 家族（多対多: 1案件に複数編集者）
create table memorial_members (
  memorial_id uuid not null references memorials(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        member_role not null default 'family',
  relation    text,                                            -- 続柄
  is_primary  boolean not null default false,                  -- 喪主(主担当)
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  primary key (memorial_id, user_id)
);
create unique index one_primary_per_memorial
  on memorial_members (memorial_id) where is_primary;

-- 故人
create table deceased (
  id            uuid primary key default gen_random_uuid(),
  memorial_id   uuid not null references memorials(id) on delete cascade,
  name_kanji    text not null,
  name_kana     text,
  name_romaji   text,
  name_ruby_html text,                                         -- ruby組版済み(サニタイズ済)
  posthumous_name text,                                        -- 戒名/法名
  birth_date    date,
  death_date    date,
  age_kazoe     int,                                           -- 享年
  age_full      int,                                           -- 行年
  portrait_path text,
  portrait_alt  text,
  relation_to_mourner text,
  bio_text      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on deceased (memorial_id);

-- 葬儀日程・会場
create table funeral_events (
  id            uuid primary key default gen_random_uuid(),
  memorial_id   uuid not null references memorials(id) on delete cascade,
  event_type    event_type not null,
  start_at      timestamptz,
  end_at        timestamptz,
  datetime_label text,                                         -- 和暦/未確定表記等の表示用
  venue_name    text,
  venue_address text,
  venue_kana    text,
  lat           numeric(9,6),
  lng           numeric(9,6),
  map_url       text,
  parking_note  text,
  access_text   text,
  reception_time text,
  live_stream_url text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on funeral_events (memorial_id);

-- 訂正履歴（誰がいつ何を直したか）
create table memorial_revisions (
  id            uuid primary key default gen_random_uuid(),
  memorial_id   uuid not null references memorials(id) on delete cascade,
  snapshot      jsonb not null,
  edited_by     uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index on memorial_revisions (memorial_id);

-- 監査ログ（append-only, ハッシュチェーン）
create table audit_logs (
  id            uuid primary key default gen_random_uuid(),
  funeral_home_id uuid,
  actor_id      uuid,
  actor_ip_hash text,
  action        text not null,
  target_type   text,
  target_id     uuid,
  before        jsonb,
  after         jsonb,
  prev_hash     text,
  created_at    timestamptz not null default now()
);
create index on audit_logs (funeral_home_id, created_at);

-- updated_atトリガ付与
create trigger t_fh   before update on funeral_homes  for each row execute function set_updated_at();
create trigger t_pr   before update on profiles        for each row execute function set_updated_at();
create trigger t_mem  before update on memorials       for each row execute function set_updated_at();
create trigger t_dec  before update on deceased        for each row execute function set_updated_at();
create trigger t_evt  before update on funeral_events  for each row execute function set_updated_at();

-- =============================================================================
-- JWTクレーム取得ヘルパ（RLSで使用。profiles再帰参照を避ける）
--   auth.jwt() -> app_metadata.{funeral_home_id, user_role} を参照する想定。
--   Custom Access Token Hook で app_metadata に焼き込む（別マイグレーションで定義）。
-- =============================================================================
create or replace function auth_funeral_home_id()
returns uuid language sql stable as $$
  select nullif(
    coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'funeral_home_id'),
      (auth.jwt() ->> 'funeral_home_id')
    ), ''
  )::uuid
$$;

create or replace function auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'user_role'),
    (auth.jwt() ->> 'user_role'),
    'anon'
  )
$$;

-- 自分が編集権を持つ案件か
create or replace function is_memorial_member(p_memorial uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memorial_members
    where memorial_id = p_memorial and user_id = auth.uid()
  )
$$;

-- =============================================================================
-- RLS: deny-by-default + FORCE
-- =============================================================================
alter table funeral_homes      enable row level security;
alter table profiles            enable row level security;
alter table memorials           enable row level security;
alter table memorial_members    enable row level security;
alter table deceased            enable row level security;
alter table funeral_events      enable row level security;
alter table memorial_revisions  enable row level security;
alter table audit_logs          enable row level security;
alter table funeral_homes      force row level security;
alter table profiles            force row level security;
alter table memorials           force row level security;
alter table memorial_members    force row level security;
alter table deceased            force row level security;
alter table funeral_events      force row level security;
alter table memorial_revisions  force row level security;
alter table audit_logs          force row level security;

-- 葬儀社: 自社のみ
create policy fh_select on funeral_homes for select
  using (id = auth_funeral_home_id());

-- profiles: 本人 or 同テナントのadmin
create policy pr_self on profiles for select
  using (id = auth.uid() or (funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')));
create policy pr_self_upd on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- memorials: 同テナントのadmin/operator は自社案件、喪主/家族は自案件
create policy mem_select on memorials for select
  using (
    (funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator'))
    or is_memorial_member(id)
  );
create policy mem_write on memorials for all
  using (
    (funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator'))
    or is_memorial_member(id)
  )
  with check (
    (funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator'))
    or is_memorial_member(id)
  );

-- 子テーブル共通: 親memorialへのアクセス権に従う
create policy mm_access on memorial_members for all
  using (is_memorial_member(memorial_id) or
         exists(select 1 from memorials m where m.id = memorial_id
                and m.funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')))
  with check (true);

create policy dec_access on deceased for all
  using (is_memorial_member(memorial_id) or
         exists(select 1 from memorials m where m.id = memorial_id and m.funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')))
  with check (is_memorial_member(memorial_id) or
         exists(select 1 from memorials m where m.id = memorial_id and m.funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')));

create policy evt_access on funeral_events for all
  using (is_memorial_member(memorial_id) or
         exists(select 1 from memorials m where m.id = memorial_id and m.funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')))
  with check (is_memorial_member(memorial_id) or
         exists(select 1 from memorials m where m.id = memorial_id and m.funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')));

create policy rev_access on memorial_revisions for select
  using (is_memorial_member(memorial_id) or
         exists(select 1 from memorials m where m.id = memorial_id and m.funeral_home_id = auth_funeral_home_id() and auth_role() in ('home_admin','operator')));

-- audit_logs: 同テナントadminのみ閲覧、書込はservice_roleのみ(=ポリシー無し)
create policy audit_read on audit_logs for select
  using (funeral_home_id = auth_funeral_home_id() and auth_role() = 'home_admin');

-- =============================================================================
-- 公開ビュー: 匿名(anon)が閲覧できる「公開済み案件の限定カラム」(PII除外)
--   security_invoker=falseで定義し、RLSを迂回して安全な列のみ露出。
-- =============================================================================
create or replace view obituary_public_view
with (security_invoker = false) as
select
  m.id, m.slug, m.status, m.access_level, m.religion_type, m.funeral_style,
  m.koden_decline, m.flower_decline, m.attend_decline,
  m.koden_accept_until, m.offering_accept_until, m.published_at,
  d.name_kanji, d.name_kana, d.name_ruby_html, d.posthumous_name,
  d.age_kazoe, d.age_full, d.portrait_path, d.portrait_alt, d.bio_text,
  d.relation_to_mourner
from memorials m
join deceased d on d.memorial_id = m.id
where m.status = 'published'
  and m.deleted_at is null
  and m.access_level in ('public','unlisted');   -- passcode/invite はRPC経由で別途検証

comment on view obituary_public_view is
  '匿名閲覧用。公開済み(public/unlisted)案件のPII除外カラムのみ。passcode/invite_onlyは含めない。';

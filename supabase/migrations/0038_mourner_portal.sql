-- 0038 喪主マイページ（bereaved portal）
-- アット葬儀 bereaved.at-sougi.com 相当の喪主向け管理画面を自前実装するための土台。
-- 仕様: docs/bereaved-portal-spec.md

-- ── 1. 喪主アカウント（自前認証）──────────────────────────
-- 既存(0008)の mourner_login_id は「電話番号 or メール」を入れていたが、
-- 本番の＠葬儀に倣い 10桁ランダム英数字のログインIDへ移行する。
-- 既存レコードとの互換のため列は再利用し、値の形式だけ変える。
alter table memorials add column if not exists mourner_password_hash text;       -- scrypt: salt:hash(hex)
alter table memorials add column if not exists mourner_password_updated_at timestamptz;
alter table memorials add column if not exists mourner_last_login_at timestamptz;

-- 連絡先（電話/メール）はログインIDとは別に保持する。
-- 初期パスワード＝電話番号下6桁 の再発行時に必要なため。
alter table memorials add column if not exists mourner_phone text;

-- 旧方式（mourner_login_id に電話番号/メールを格納）のレコードを移行する。
-- 旧方式にはパスワードハッシュもログインUIも存在せず実際には稼働していないため、
-- 連絡先を mourner_phone へ退避したうえでIDを空にし、再発行を促す。
update memorials
   set mourner_phone = coalesce(mourner_phone, mourner_login_id),
       mourner_login_id = null,
       mourner_account_issued = false
 where mourner_login_id is not null
   and mourner_login_id !~ '^[a-z0-9]{10}$';

-- ログインIDは全案件で一意（ログイン時に案件を特定するため）
create unique index if not exists memorials_mourner_login_id_key
  on memorials (mourner_login_id) where mourner_login_id is not null;

-- ── 2. 喪主挨拶・公開期間 ───────────────────────────────
alter table memorials add column if not exists mourner_greeting text;
alter table memorials add column if not exists venue_public_from timestamptz;
alter table memorials add column if not exists venue_public_until timestamptz;

-- ── 3. メール通知設定 ──────────────────────────────────
alter table memorials add column if not exists mourner_notify_email text;
alter table memorials add column if not exists mourner_notify_receipt boolean not null default true;  -- ご記帳の通知
alter table memorials add column if not exists mourner_notify_koden   boolean not null default true;  -- 香典決済の通知

-- ── 4. 芳名録の項目拡張 ────────────────────────────────
-- ＠葬儀の芳名録は住所・電話まで保持し、香典帳/会葬礼状の宛名リストとして機能する。
-- 既存の condolence_messages は氏名+本文のみだったため不足分を追加する。
alter table condolence_messages add column if not exists sender_kana  text;
alter table condolence_messages add column if not exists company      text;
alter table condolence_messages add column if not exists relation     text;  -- 家族・親族 / 仕事の関係 / 友人 / その他
alter table condolence_messages add column if not exists postal_code  text;
alter table condolence_messages add column if not exists address      text;
alter table condolence_messages add column if not exists email        text;
alter table condolence_messages add column if not exists phone        text;
alter table condolence_messages add column if not exists image_paths  jsonb not null default '[]'::jsonb;

create index if not exists condolence_messages_memorial_created_idx
  on condolence_messages (memorial_id, created_at desc);

-- ── 5. 葬儀の写真 / アルバム ───────────────────────────
-- kind: funeral = 式当日の写真 / album = 故人の思い出写真。各30枚まで（上限はアプリ側で担保）。
create table if not exists memorial_photos (
  id          uuid primary key default gen_random_uuid(),
  memorial_id uuid not null references memorials(id) on delete cascade,
  kind        text not null check (kind in ('funeral', 'album')),
  path        text not null,                       -- Storage バケット内のパス
  caption     text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists memorial_photos_lookup_idx
  on memorial_photos (memorial_id, kind, sort_order);

-- 0006 系の表と同じ方針: RLS 有効・ポリシー無し（deny by default）。
-- 読み書きは service_role（createAdminClient）経由に限定する。
alter table memorial_photos enable row level security;

-- 管理画面の実ログイン（Supabase Auth）。
-- 経緯: /account/sign-in は入力を検証しないデモ実装で、middleware.ts の Basic 認証（全社員で
-- 同じID/パスワードを共有）が応急処置として置かれていた。誰が操作したか分からず、
-- 退職者の締め出しもできないため、アカウント別のログインへ移行する。
--
-- 認証そのものは Supabase Auth (auth.users) が持つ。このテーブルは
-- 「その auth ユーザーが管理画面に入ってよいか」という許可リスト。
-- auth.users に居るだけでは入れない（＝遺族・参列者側の仕組みと混ざらない）。
create table if not exists admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text not null default '',
  -- 役割。現時点では全員 admin で運用する。権限の出し分けは次段階で参照する。
  role        text not null default 'admin' check (role in ('admin', 'staff', 'viewer')),
  -- 退職・異動時は行を消さず false にする（誰が操作したかの記録を残すため）。
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  last_login_at timestamptz
);

comment on table admin_users is '管理画面(/kanri /fuhou 等)へのログインを許可されたユーザー。認証情報は auth.users 側。';

-- RLS: 本人が自分の行を読めるだけ。書き込みは service_role（scripts/manage-admin-user.mjs）に限る。
alter table admin_users enable row level security;

drop policy if exists admin_users_select_self on admin_users;
create policy admin_users_select_self on admin_users
  for select using (auth.uid() = user_id);

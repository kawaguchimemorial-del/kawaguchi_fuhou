-- 0008 喪主アカウント発行の状態保存
alter table memorials add column if not exists mourner_account_issued boolean not null default false;
alter table memorials add column if not exists mourner_login_id text;       -- 電話番号 or メール
alter table memorials add column if not exists mourner_contact_method text;  -- phone | email
alter table memorials add column if not exists mourner_issued_at timestamptz;

-- 見積書/請求書の手書きサイン(契約署名)。data URL(PNG)をtext列に保存。
alter table fk_estimates
  add column if not exists mourner_sign text,
  add column if not exists mourner_signed_at timestamptz,
  add column if not exists owner_sign text,
  add column if not exists owner_signed_at timestamptz;
alter table fk_invoices
  add column if not exists mourner_sign text,
  add column if not exists mourner_signed_at timestamptz,
  add column if not exists owner_sign text,
  add column if not exists owner_signed_at timestamptz;

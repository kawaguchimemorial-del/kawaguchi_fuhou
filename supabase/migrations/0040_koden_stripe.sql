-- 香典のクレジット決済(Stripe)用。PaymentIntent紐付け・冪等キー・更新時刻を追加。
alter table koden_payments add column if not exists provider_payment_intent_id text;
alter table koden_payments add column if not exists idempotency_key text;
alter table koden_payments add column if not exists charged_amount_jpy int;   -- 実際にカード請求した額(手数料上乗せ後)
alter table koden_payments add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_koden_pi on koden_payments(provider_payment_intent_id);

-- Webhookイベントの二重処理防止(冪等)。event.id を主キーに記録する。
create table if not exists processed_webhook_events (
  event_id text primary key,
  created_at timestamptz not null default now()
);

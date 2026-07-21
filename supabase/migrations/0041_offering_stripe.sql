-- 供花・供物のクレジット決済(Stripe)用。PaymentIntent紐付け・冪等キー・請求額・更新/入金時刻。
alter table offering_orders add column if not exists provider_payment_intent_id text;
alter table offering_orders add column if not exists idempotency_key text;
alter table offering_orders add column if not exists charged_amount_jpy int;
alter table offering_orders add column if not exists paid_at timestamptz;
alter table offering_orders add column if not exists updated_at timestamptz not null default now();
-- カード決済の確定(請求書作成・メール送信)は決済成功のWebhookで行うため、
-- 注文フォームの内容を一時保持しておく（成功時に読み出して確定処理に使う）。
alter table offering_orders add column if not exists pending_payload jsonb;
create index if not exists idx_offering_pi on offering_orders(provider_payment_intent_id);

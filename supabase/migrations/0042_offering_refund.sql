-- 供花・供物のカード決済の返金記録。管理画面から返金したときに実績を残す。
alter table offering_orders add column if not exists refunded_at timestamptz;
alter table offering_orders add column if not exists refund_id text;          -- Stripeのrefund id (re_xxx)
alter table offering_orders add column if not exists refunded_amount_jpy int;
alter table offering_orders add column if not exists refunded_by text;        -- 返金操作を行った管理者ID

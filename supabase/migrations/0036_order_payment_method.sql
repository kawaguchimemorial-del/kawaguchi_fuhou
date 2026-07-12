-- 供花・供物 注文の支払い方法を保存(一覧表示・請求書用)。
alter table offering_orders
  add column if not exists payment_method text;

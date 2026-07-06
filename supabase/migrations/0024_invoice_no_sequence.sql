-- 請求書番号の連番採番（スマート葬儀と同方式）
-- 移植済みの数値請求書番号の最大値の次から採番する。並行実行に安全なシーケンス方式。
do $$
declare mx bigint;
begin
  select coalesce(max(invoice_no::bigint), 2090000) into mx
  from fk_invoices
  where invoice_no ~ '^\d+$';

  if not exists (select 1 from pg_class where relname = 'fk_invoice_no_seq') then
    execute format('create sequence fk_invoice_no_seq start with %s', mx + 1);
  else
    -- 既存シーケンスは現在最大値に合わせ、次のnextvalが mx+1 になるようにする
    perform setval('fk_invoice_no_seq', mx);
  end if;
end $$;

-- service_role から採番するための関数（次の請求書番号を文字列で返す）
create or replace function next_invoice_no() returns text
language sql
as $$
  select nextval('fk_invoice_no_seq')::text;
$$;

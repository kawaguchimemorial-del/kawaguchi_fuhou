-- fk_ai_portraits.customer_id → fk_customers(id) の外部キー。
-- PostgREST の顧客名エンベッド(fk_customers(...))に必要。顧客削除時はnull化。
do $$ begin
  alter table fk_ai_portraits
    add constraint fk_ai_portraits_customer
    foreign key (customer_id) references fk_customers(id) on delete set null;
exception when duplicate_object then null;
end $$;

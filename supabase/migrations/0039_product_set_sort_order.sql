-- セット商品の並び順。設定画面のカードD&Dで決めた順を保持し、見積もりのセット選択に反映する。
alter table fk_product_sets add column if not exists sort_order int not null default 0;

-- 既存データは作成順で 1..N を採番。
with ordered as (
  select id, row_number() over (partition by funeral_home_id order by created_at asc) as rn
  from fk_product_sets
  where deleted_at is null
)
update fk_product_sets s set sort_order = o.rn
from ordered o where o.id = s.id;

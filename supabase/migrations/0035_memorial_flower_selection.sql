-- 訃報ごとに表示する供花・供物を選択(葬儀規模で使う花が異なるため)。
-- null または空 = 全商品を表示(既定・後方互換)。ids は offering_products_master.id の配列。
alter table memorials
  add column if not exists flower_product_ids jsonb;

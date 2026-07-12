-- 商品画像(将来: 見積作成時に画像を見ながら選ぶ)用の列。
-- image_url: 画像URL(Supabase Storage等の公開URL / data URLも可)。
alter table fk_products
  add column if not exists image_url text;

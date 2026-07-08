-- 商品種別の子カテゴリ（例: 料理（華鳳凰）配下の 懐石料理/鮨/盛込み料理 など）。
alter table fk_products add column if not exists product_sub_kind text;

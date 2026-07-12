-- 料理の配膳人・忌中払会場費の算出根拠(見積編集時の復元用)。
-- 配膳人=15人に1名(ceil)×15,000円(税抜)。忌中払会場費=告別式時の会場費(税抜/10%)。
alter table fk_estimates
  add column if not exists wake_meal_count int,
  add column if not exists funeral_meal_count int,
  add column if not exists imibarai_fee int;

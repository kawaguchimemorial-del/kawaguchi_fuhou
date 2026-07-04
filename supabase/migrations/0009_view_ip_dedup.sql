-- 入場（閲覧）カウントを訪問者単位にするため、ハッシュ化IPを記録して30分以内の重複を除外する。
-- 生IPは保存せず、ソルト付きSHA-256のハッシュのみを保持（プライバシー配慮）。
alter table memorial_views
  add column if not exists ip_hash text;

-- 30分以内の同一訪問者チェック（memorial_id, kind, ip_hash, created_at）を高速化。
create index if not exists idx_views_dedup
  on memorial_views(memorial_id, kind, ip_hash, created_at);

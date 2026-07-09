-- AI遺影: 手札サイズ画像URL(オンライン式場の祭壇遺影に使用)を保持。
alter table fk_ai_portraits add column if not exists tefuda_url text;

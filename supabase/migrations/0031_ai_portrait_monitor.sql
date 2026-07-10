-- AI遺影の「16:9モニター」画像URL。一覧からモニター用画像もダウンロードできるようにする。
alter table fk_ai_portraits add column if not exists monitor_url text;

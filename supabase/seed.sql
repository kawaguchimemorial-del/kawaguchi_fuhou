-- デモ用シード（個人情報を含まないダミー）。本番では使用しない。
-- 適用: Management API もしくは SQL Editor で実行。冪等(on conflict do nothing)。

insert into funeral_homes (id, name, phone, contact_email)
values ('11111111-1111-1111-1111-111111111111','株式会社川口典礼','0120-963-765','kawaguchi.memorial@gmail.com')
on conflict (id) do nothing;

insert into memorials (id, funeral_home_id, slug, status, access_level, noindex_flag, religion_type, funeral_style, published_at)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','sample-haruko','published','unlisted',true,'仏式','family',now())
on conflict (id) do nothing;

insert into deceased (id, memorial_id, name_kanji, name_kana, age_kazoe, death_date, relation_to_mourner)
values ('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222','山田 哲夫','やまだ てつお',43,'2026-06-28','父')
on conflict (id) do nothing;

insert into funeral_events (id, memorial_id, event_type, start_at, datetime_label, venue_name, venue_address)
values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','葬儀','2026-07-01T11:30:00+09','令和8年7月1日(水) 11:30 〜','川口メモリアルホール','埼玉県川口市西新井宿440-1')
on conflict (id) do nothing;

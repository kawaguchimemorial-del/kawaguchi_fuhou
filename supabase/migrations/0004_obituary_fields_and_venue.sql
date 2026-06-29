-- 0004 訃報本文・案内喪主名・オンライン式場(jsonb)の保存先を追加し、公開RPCを更新
-- ※ event_type enum への値追加(通夜式/一日葬 等)は Management API で別途実施済み。

alter table memorials add column if not exists obituary_title text not null default '訃報';
alter table memorials add column if not exists obituary_body text;
alter table memorials add column if not exists announce_mourner_name text;
alter table memorials add column if not exists venue jsonb;   -- オンライン式場(挨拶/公開期間/祭壇レイヤー等)

create or replace function get_public_obituary(p_slug text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(t) from (
    select
      m.slug, m.status, m.access_level, m.noindex_flag, m.religion_type, m.funeral_style,
      m.koden_decline, m.flower_decline, m.attend_decline,
      m.koden_accept_until, m.offering_accept_until, m.published_at,
      m.obituary_title, m.obituary_body, m.announce_mourner_name, m.venue,
      fh.name as funeral_home_name, fh.phone as fh_phone, fh.contact_email as fh_email,
      d.name_kanji, d.name_kana, d.age_kazoe, d.age_full, d.death_date,
      d.portrait_path, d.portrait_alt, d.relation_to_mourner, d.bio_text,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', e.id, 'eventType', e.event_type, 'startAt', e.start_at, 'endAt', e.end_at,
          'datetimeLabel', e.datetime_label, 'venueName', e.venue_name, 'venueAddress', e.venue_address,
          'mapUrl', e.map_url, 'receptionTime', e.reception_time,
          'accessText', e.access_text, 'parkingNote', e.parking_note
        ) order by e.sort_order)
        from funeral_events e where e.memorial_id = m.id
      ), '[]'::jsonb) as events
    from memorials m
    join deceased d on d.memorial_id = m.id
    left join funeral_homes fh on fh.id = m.funeral_home_id
    where m.slug = p_slug
      and m.status = 'published'
      and m.deleted_at is null
      and m.access_level in ('public','unlisted')
  ) t;
$$;
grant execute on function get_public_obituary(text) to anon, authenticated;

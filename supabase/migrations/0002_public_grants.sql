-- 0002 公開ビューへの匿名(anon)読取権限付与
-- obituary_public_view は security_invoker=false でRLSを迂回し安全な列のみ露出するが、
-- PostgREST(anon ロール)から読むには明示的な GRANT が必要。
grant usage on schema public to anon, authenticated;
grant select on public.obituary_public_view to anon, authenticated;

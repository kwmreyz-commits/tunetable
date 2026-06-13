-- 参加者ページでホスト名(店舗名)を表示するためのビュー。
-- stores テーブルは店舗オーナー専用のRLSしか持たないため、
-- アクティブなセッションに紐づく店舗名のみを限定的に公開する。
create view public.session_stores as
select s.id as session_id, st.name as store_name
from sessions s
join stores st on st.id = s.store_id
where s.status = 'active';

grant select on public.session_stores to anon, authenticated;

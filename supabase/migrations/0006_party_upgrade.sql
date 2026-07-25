-- ============================================================================
-- 0006: パーティー進行の堅牢化(未適用 / OPTIONAL)
-- ============================================================================
--
-- ⚠️ このマイグレーションはまだ Supabase に適用していない。
--    v3のアプリコードは「このマイグレーションが無くても正しく動く」ように
--    書いてあるので、適用は任意。適用すると以下が改善する。
--
-- なぜv3本体で使わなかったか:
--   v3の実装時点でDDLを流す手段(DBパスワード/アクセストークン)が手元に無く、
--   スキーマ変更なしで実現できる範囲に設計を寄せたため。
--
-- 適用方法:
--   Supabaseダッシュボード → SQL Editor にこのファイルの内容を貼って実行。
--   すべて `if not exists` / `create or replace` なので複数回流しても安全。
--
-- 適用後にコード側で有効化できること(別途改修が必要):
--   - votes の Realtime 購読を session_id で絞る
--     (いまは全セッションのvotes変更を受けて再取得している)
--   - 振り返りページを「実際に流れた順」で並べる
--   - 曲送りを advance_queue() の1呼び出しに置き換える
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. 再生された時刻を記録する
--    いまは再生順を保持する列が無いため、振り返りページは得票順で表示している。
--    この列があれば「実際に流れた順」のセットリストが作れる。
-- ----------------------------------------------------------------------------
alter table requests add column if not exists played_at timestamptz;

create or replace function public.requests_stamp_played_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'played' and old.status is distinct from 'played' then
    new.played_at := coalesce(new.played_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists requests_stamp_played_at on requests;
create trigger requests_stamp_played_at
  before update on requests
  for each row execute function public.requests_stamp_played_at();


-- ----------------------------------------------------------------------------
-- 2. votes に session_id を持たせる
--    Supabase Realtime の filter は単純な列の等値比較しか書けない。
--    votes には session_id が無いので、参加者・ホストの両画面は
--    「全セッションのvotes変更」を購読して毎回取り直している。
--    列を足せば filter: session_id=eq.<id> で自分の会だけに絞れる。
-- ----------------------------------------------------------------------------
alter table votes add column if not exists session_id uuid references sessions (id) on delete cascade;

update votes v
set session_id = r.session_id
from requests r
where r.id = v.request_id
  and v.session_id is null;

create or replace function public.votes_set_session_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.session_id is null then
    select session_id into new.session_id from requests where id = new.request_id;
  end if;
  return new;
end;
$$;

drop trigger if exists votes_set_session_id on votes;
create trigger votes_set_session_id
  before insert on votes
  for each row execute function public.votes_set_session_id();

create index if not exists votes_session_id_idx on votes (session_id);


-- ----------------------------------------------------------------------------
-- 3. レート制限をDB側でも担保する
--    v3では受付を /api/requests に集約してサーバー側で数えているが、
--    RLS上は anon が requests に直接insertできる状態のままなので、
--    APIを経由しなければ回避できる。最後の砦をDBに置く。
-- ----------------------------------------------------------------------------
create or replace function public.requests_enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from requests
  where session_id = new.session_id
    and requested_by = new.requested_by
    and created_at > now() - interval '5 minutes';

  if recent_count >= 3 then
    raise exception 'RATE_LIMIT: 5分間に3曲までです';
  end if;

  return new;
end;
$$;

drop trigger if exists requests_enforce_rate_limit on requests;
create trigger requests_enforce_rate_limit
  before insert on requests
  for each row execute function public.requests_enforce_rate_limit();


-- ----------------------------------------------------------------------------
-- 4. 曲送りを1トランザクションにまとめる
--    いまはクライアントが「前の曲をplayedに」「次をplayingに」「sessionsを更新」
--    を順に投げているため、ENDEDの二重発火やスキップ操作と重なると
--    2曲が同時にplayingになりうる(v3ではホスト画面側のロックで防いでいる)。
--    サーバー側で直列化できればホストが複数タブを開いても壊れない。
-- ----------------------------------------------------------------------------
create or replace function public.advance_queue(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next requests%rowtype;
begin
  -- security definer はRLSを迂回するので、呼び出し元の所有権をここで確認する
  if not exists (
    select 1
    from sessions s
    join stores st on st.id = s.store_id
    where s.id = p_session_id
      and st.owner_user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN: セッションの所有者ではありません';
  end if;

  -- 同時実行を直列化する
  perform 1 from sessions where id = p_session_id for update;

  select * into v_next
  from requests
  where session_id = p_session_id
    and status = 'queued'
  order by
    (select count(*) from votes where votes.request_id = requests.id) desc,
    created_at asc
  limit 1;

  update requests
  set status = 'played'
  where session_id = p_session_id
    and status = 'playing';

  if v_next.id is null then
    update sessions
    set now_playing_video_id = null,
        now_playing_started_at = null
    where id = p_session_id;
    return null;
  end if;

  update requests set status = 'playing' where id = v_next.id;

  update sessions
  set now_playing_video_id = v_next.video_id,
      now_playing_started_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'request_id', v_next.id,
    'video_id', v_next.video_id,
    'track_name', v_next.track_name,
    'artist_name', v_next.artist_name
  );
end;
$$;

revoke all on function public.advance_queue(uuid) from public;
grant execute on function public.advance_queue(uuid) to authenticated;

-- requestsテーブルに追加(YouTube動画情報)
alter table requests add column if not exists video_id text;
alter table requests add column if not exists thumbnail_url text;

-- sessionsテーブルに追加(現在再生中の動画を全参加者に同期表示するため)
alter table sessions add column if not exists now_playing_video_id text;
alter table sessions add column if not exists now_playing_started_at timestamptz;

-- 参加者ページでのキュー・現在再生中表示のRealtime同期に必要
alter publication supabase_realtime add table sessions, requests, votes;

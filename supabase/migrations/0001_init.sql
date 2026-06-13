-- TuneTable initial schema
-- Tables: stores, sessions, requests, votes

create extension if not exists "pgcrypto";

-- =========================================
-- stores
-- =========================================
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  spotify_user_id text,
  spotify_refresh_token text, -- encrypted at application layer before storage
  block_explicit boolean not null default false,
  ng_words text[] not null default '{}',
  created_at timestamptz not null default now()
);

create unique index stores_owner_user_id_idx on stores (owner_user_id);

alter table stores enable row level security;

create policy "store owners can manage own store"
  on stores
  for all
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- =========================================
-- sessions (one per business day / opening)
-- =========================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'ended')),
  join_code text not null unique,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index sessions_store_id_idx on sessions (store_id);
create index sessions_join_code_idx on sessions (join_code);

alter table sessions enable row level security;

-- guests resolve a session by its join_code to participate
create policy "anyone can read active sessions"
  on sessions
  for select
  to anon, authenticated
  using (status = 'active');

create policy "store owners can manage own sessions"
  on sessions
  for all
  to authenticated
  using (store_id in (select id from stores where owner_user_id = auth.uid()))
  with check (store_id in (select id from stores where owner_user_id = auth.uid()));

-- =========================================
-- requests (songs requested for a session's queue)
-- =========================================
create table requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  spotify_track_id text not null,
  track_name text not null,
  artist_name text not null,
  album_art_url text,
  duration_ms int not null,
  requested_by text not null, -- anonymous client id
  status text not null default 'queued' check (status in ('queued', 'playing', 'played', 'removed')),
  created_at timestamptz not null default now()
);

create index requests_session_id_idx on requests (session_id);
create index requests_session_status_idx on requests (session_id, status);

-- prevent the same track being queued twice at once (re-requests after
-- it has played, or been removed, are allowed)
create unique index requests_unique_queued_track
  on requests (session_id, spotify_track_id)
  where (status = 'queued');

alter table requests enable row level security;

create policy "anyone can read requests of active sessions"
  on requests
  for select
  to anon, authenticated
  using (session_id in (select id from sessions where status = 'active'));

create policy "guests can request songs in active sessions"
  on requests
  for insert
  to anon, authenticated
  with check (
    status = 'queued'
    and session_id in (select id from sessions where status = 'active')
  );

create policy "store owners can manage requests of own sessions"
  on requests
  for all
  to authenticated
  using (
    session_id in (
      select s.id from sessions s
      join stores st on st.id = s.store_id
      where st.owner_user_id = auth.uid()
    )
  )
  with check (
    session_id in (
      select s.id from sessions s
      join stores st on st.id = s.store_id
      where st.owner_user_id = auth.uid()
    )
  );

-- =========================================
-- votes (one per anonymous guest per request)
-- =========================================
create table votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  voter_anonymous_id text not null,
  created_at timestamptz not null default now(),
  unique (request_id, voter_anonymous_id)
);

create index votes_request_id_idx on votes (request_id);

alter table votes enable row level security;

create policy "anyone can read votes of active sessions"
  on votes
  for select
  to anon, authenticated
  using (
    request_id in (
      select r.id from requests r
      join sessions s on s.id = r.session_id
      where s.status = 'active'
    )
  );

create policy "guests can vote in active sessions"
  on votes
  for insert
  to anon, authenticated
  with check (
    request_id in (
      select r.id from requests r
      join sessions s on s.id = r.session_id
      where s.status = 'active'
    )
  );

-- allow guests to retract their own vote (good-faith basis, no auth)
create policy "guests can remove votes in active sessions"
  on votes
  for delete
  to anon, authenticated
  using (
    request_id in (
      select r.id from requests r
      join sessions s on s.id = r.session_id
      where s.status = 'active'
    )
  );

create policy "store owners can read votes of own sessions"
  on votes
  for select
  to authenticated
  using (
    request_id in (
      select r.id from requests r
      join sessions s on s.id = r.session_id
      join stores st on st.id = s.store_id
      where st.owner_user_id = auth.uid()
    )
  );

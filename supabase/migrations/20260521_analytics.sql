-- Live + historical site analytics (the /admin "Live View").
-- Writes happen ONLY from the server via the service-role key (app/api/track),
-- so RLS is enabled with no public policies: anon/auth clients can neither read
-- nor write; the service role bypasses RLS. Reads happen in admin-gated server
-- routes, also via the service role.

create table if not exists public.analytics_sessions (
  session_id     text primary key,
  first_seen     timestamptz not null default now(),
  last_seen      timestamptz not null default now(),
  country        text,
  country_code   text,
  region         text,
  city           text,
  lat            double precision,
  lng            double precision,
  referrer       text,
  user_agent     text,
  user_id        uuid references auth.users (id) on delete set null,
  pageviews      integer not null default 0
);

create table if not exists public.analytics_pageviews (
  id          bigint generated always as identity primary key,
  session_id  text not null references public.analytics_sessions (session_id) on delete cascade,
  path        text not null,
  ts          timestamptz not null default now()
);

create index if not exists analytics_sessions_last_seen_idx on public.analytics_sessions (last_seen desc);
create index if not exists analytics_sessions_first_seen_idx on public.analytics_sessions (first_seen desc);
create index if not exists analytics_pageviews_ts_idx on public.analytics_pageviews (ts desc);
create index if not exists analytics_pageviews_session_idx on public.analytics_pageviews (session_id);

alter table public.analytics_sessions enable row level security;
alter table public.analytics_pageviews enable row level security;
-- No policies: only the service role (server) may read/write.

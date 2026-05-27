-- Capture the visitor's declared browser language on the analytics
-- session row so we can decide which UI translations to prioritize.
--
-- The value is the Accept-Language header truncated to 64 chars (a
-- single primary tag is ~5 chars; the full negotiated list is rarely
-- longer than 64). We store only the parsed *primary* language tag,
-- not the full header, to avoid retaining anything that could narrow
-- down a fingerprint beyond the country we already keep.
--
-- This column is filled by app/api/track/route.ts on session insert.
-- Existing rows backfill to NULL; the admin dashboard treats NULL as
-- "language unknown" in the leaderboard.
--
-- RLS already enabled on analytics_sessions; service-role-only writes
-- per the existing policy in 20260521_analytics.sql.

alter table public.analytics_sessions
  add column if not exists accept_language text;

-- Helpful for the language leaderboard query.
create index if not exists analytics_sessions_accept_language_idx
  on public.analytics_sessions (accept_language)
  where accept_language is not null;

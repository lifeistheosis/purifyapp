-- v5.5 — server-side rate limiting
-- Single-table fixed-window counter keyed by an arbitrary string.
-- Callers go through public.rate_limit_hit(key, window_seconds, max)
-- which atomically increments and returns true once the budget is spent.
-- Service-role only; never exposed to anon/authenticated roles.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS)
-- ever touches this table.

create or replace function public.rate_limit_hit(
  p_key text,
  p_window_seconds int,
  p_max int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz;
  new_count int;
begin
  -- Floor the current time to a window bucket. Two callers in the same
  -- window land on the same row and increment together.
  bucket := to_timestamp(
    (extract(epoch from now())::bigint / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (key, window_start, count)
    values (p_key, bucket, 1)
    on conflict (key, window_start)
      do update set count = public.rate_limits.count + 1
    returning count into new_count;

  -- Opportunistic GC. Cheap, runs ~1% of calls. Keeps the table small
  -- without a scheduled job.
  if random() < 0.01 then
    delete from public.rate_limits
      where window_start < now() - interval '1 hour';
  end if;

  return new_count > p_max;
end
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
revoke all on function public.rate_limit_hit(text, int, int) from anon, authenticated;
-- service_role bypasses RLS but still needs execute on functions.
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

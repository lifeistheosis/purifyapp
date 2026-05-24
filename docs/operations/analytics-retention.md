# Analytics retention, 90-day rolling window

The `/privacy` page promises that anonymous session and pageview rows are pruned at 90 days. This doc is the implementation of that promise.

**Activated:** see [analytics-retention-activated-2026-05-23.md](./analytics-retention-activated-2026-05-23.md) for the activation log and the proof-of-schedule screenshot. Until that file shows an activation entry, the privacy promise is documented but not enforced, the operator who runs the schedule statement below is responsible for updating that file in the same commit.

## What gets pruned

Two Supabase tables, written by [`app/api/track/route.ts`](../../app/api/track/route.ts):

- `analytics_sessions`, one row per anonymous session. Pruning key: `first_seen` (or `last_seen`, whichever is older).
- `analytics_pageviews`, one row per page load. Pruning key: the row's `created_at` (or join through `session_id`).

User sync data (highlights, bookmarks, prayer-rule check-offs, account) is **not** pruned by this job, it lives as long as the account does, and is removed when the user deletes their account from `/account`.

## The prune statement

```sql
-- Delete pageviews older than 90 days.
delete from analytics_pageviews
where created_at < now() - interval '90 days';

-- Delete sessions whose last activity was over 90 days ago.
delete from analytics_sessions
where last_seen < now() - interval '90 days';
```

If `analytics_pageviews` has no `created_at`, add one in a migration before scheduling:

```sql
alter table analytics_pageviews
  add column if not exists created_at timestamptz not null default now();
create index if not exists analytics_pageviews_created_at_idx
  on analytics_pageviews (created_at);
```

Also recommended for the `last_seen` lookup:

```sql
create index if not exists analytics_sessions_last_seen_idx
  on analytics_sessions (last_seen);
```

## How to schedule it

Supabase supports cron via the `pg_cron` extension. Enable it once from the dashboard (Database → Extensions → `pg_cron`), then:

```sql
select cron.schedule(
  'prune-analytics-90d',
  '0 4 * * *',  -- daily at 04:00 UTC
  $$
    delete from analytics_pageviews where created_at < now() - interval '90 days';
    delete from analytics_sessions where last_seen < now() - interval '90 days';
  $$
);
```

To verify the schedule is registered:

```sql
select * from cron.job where jobname = 'prune-analytics-90d';
```

To unschedule:

```sql
select cron.unschedule('prune-analytics-90d');
```

## How to verify the job is working

Daily check (manual, until we wire monitoring):

```sql
-- Should return 0 if the job ran in the last 24h.
select count(*) from analytics_sessions where last_seen < now() - interval '90 days';
select count(*) from analytics_pageviews where created_at < now() - interval '90 days';
```

If either is non-zero for more than 24h, the job didn't run, inspect `cron.job_run_details` for the failure and re-schedule.

## If you ever change the window

Update three places, in this order:

1. The SQL job above.
2. The retention sentence on [`app/(app)/privacy/page.tsx`](../../app/(app)/privacy/page.tsx) (search for "90 days").
3. The next [`/whats-new`](../../app/(app)/whats-new/page.tsx) letter, noting the change.

We do not change the retention posture quietly.

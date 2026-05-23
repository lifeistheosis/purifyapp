# Analytics retention — activation log

This file records when the 90-day analytics-retention pg_cron job was first scheduled on the production Supabase project, and any subsequent re-schedules or pauses.

The privacy page at [`/privacy`](../../app/(app)/privacy/page.tsx) promises 90-day retention. The schedule below is what enforces that promise. If the schedule is not active, the promise is not being kept — escalate immediately.

---

## Activation checklist (operator)

1. Open the Supabase SQL Editor on the production project.
2. Confirm `pg_cron` is enabled (Database → Extensions → `pg_cron` → Enable). One-time step per project.
3. Run the schedule statement from [`analytics-retention.md`](./analytics-retention.md#how-to-schedule-it).
4. Run the verification query:
   ```sql
   select jobid, schedule, command, active, jobname
   from cron.job
   where jobname = 'prune-analytics-90d';
   ```
   Expect exactly one row, `active = true`, schedule = `0 4 * * *`.
5. Screenshot the verification query result (or paste it verbatim into the log below).
6. Wait 24 hours. Run the proof query:
   ```sql
   select count(*) from analytics_sessions where last_seen < now() - interval '90 days';
   select count(*) from analytics_pageviews where created_at < now() - interval '90 days';
   ```
   Expect both to be `0` (or, in the first 90 days of operation, simply not increasing past the natural growth of fresh data).
7. Append an entry to the log below.

---

## Activation log

<!--
  Append entries in reverse chronological order, newest first. Each entry:
  - Date (UTC).
  - Operator.
  - Action (initial activation, re-schedule after pause, etc.).
  - Verification query output (paste it raw, or link to a screenshot).
-->

### (pending)

The schedule has not yet been activated on production as of the commit that introduced this file. The next operator who runs the `cron.schedule()` statement in the production Supabase console should replace this `(pending)` block with a real entry following the format below.

Template for the first real entry:

> ### 2026-MM-DD — initial activation
>
> Operator: <name>
> Action: scheduled `prune-analytics-90d` for the first time on the production Supabase project.
>
> Verification query result:
>
> ```
> jobid | schedule  | command                          | active | jobname
> ------+-----------+----------------------------------+--------+---------------------
>     1 | 0 4 * * * | delete from analytics_pageviews… | t      | prune-analytics-90d
> ```
>
> 24h proof (date + 1):
>
> ```
> count
> -----
>     0
> ```

# Scheduled jobs

Everything Purify does on a clock, and what calls it. Since 2026-09-26 the
answer is Render's cron job for all of it; GitHub Actions calls nothing on a
schedule.

## Why not GitHub Actions

`.github/workflows/cron.yml` used to call two routes hourly and daily. Actions
are held on billing, so every run failed at once: 50 failure emails in the
week before 2026-09-26, and no reminder sent in that time. The owner asked for
scheduled jobs off CI. The workflow was disabled in the repository settings
that day (`gh workflow disable`), and its `schedule:` trigger is removed so
re-enabling it cannot restart an hourly bill. It keeps its manual button.

## What runs, and when

All routes need the `x-cron-secret` header matching `CRON_SECRET` on Render.

| Route | When | What |
|---|---|---|
| `/api/cron/hourly-goals` | every 10 minutes | the running job, unchanged |
| `/api/cron/lifecycle` | 11:00 to 11:19 UTC (twice, the second a no-op) | the email funnel's daily run |
| `/api/cron/push-deliver` | once an hour, the run in minutes 00 to 09 | prayer reminders; maps the UTC hour onto each subscriber's local morning and evening |
| `/api/cron/bmc-snapshot` | once a day, 03:10 to 03:19 UTC | the Buy Me a Coffee totals |

## The Render job

The existing cron job `purifyapp` (crn-dabehhad0e5s73e7ppog) runs every ten
minutes. Its command gains two time-gated lines, in the same shape as the
lifecycle line already there:

```sh
[ "$(date -u +%M)" -lt 10 ] && curl -fsS -m 120 -H "x-cron-secret: $CRON_SECRET" https://purifyapp.net/api/cron/push-deliver
```

```sh
[ "$(date -u +%H%M)" -ge 0310 ] && [ "$(date -u +%H%M)" -lt 0320 ] && curl -fsS -m 120 -H "x-cron-secret: $CRON_SECRET" https://purifyapp.net/api/cron/bmc-snapshot
```

`test` reads `0310` as decimal, so the leading zero is safe there; do not move
these comparisons into `$(( ))`, where it would be octal. Each line is its own
`&&` chain, so a skipped window never stops the lines after it (end each one
with `; true` if the command is joined with `&&`).

A job run on Render is billed by the second it runs; these are two curls.

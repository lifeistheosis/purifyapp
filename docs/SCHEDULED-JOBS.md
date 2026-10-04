# Scheduled jobs

Everything Purify does on a clock, and what calls it. Since 2026-09-26
GitHub Actions calls nothing on a schedule. Render's cron job calls
hourly-goals and lifecycle as before.

**Prayer reminders are on again since 2026-10-04**, when the owner asked for
every notification to work. They needed no new line on Render: the
ten-minute call to hourly-goals carries them (`lib/push/deliver.ts`), the way
it already carries housekeeping. From 2026-09-26 until then nothing ran them,
while onboarding went on asking readers to turn them on.

**The donations snapshot (bmc-snapshot) is still not scheduled anywhere**, by
the owner's call on 2026-09-26 ("leave them off"); its Render line below is
ready for the day it is wanted.

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
| `/api/cron/hourly-goals` | every 10 minutes | the hourly goals, housekeeping, and the hour's prayer reminders: the first call of each UTC hour takes that hour's claim and sends, the rest find it taken |
| `/api/cron/lifecycle` | 11:00 to 11:19 UTC (twice, the second a no-op) | the email funnel's daily run |
| `/api/cron/push-deliver` | not called; kept for a scheduler that wants to call it | the same reminder run as the heartbeat's, behind the same hourly claim, so calling it as well sends nothing twice |
| `/api/cron/bmc-snapshot` | OFF (would be: once a day, 03:10 to 03:19 UTC) | the Buy Me a Coffee totals |

## How the reminders run

`deliverRemindersOnce` (`lib/push/deliver.ts`) is called after every
hourly-goals response. It asks `rate_limit_hit` for the claim
`push-deliver:<UTC hour>`: the first caller in an hour gets it and sends to
every reader whose own morning or evening hour it is, by the time zone their
device registered; every later caller in that hour sends nothing. A
heartbeat that never arrives costs nothing: the next one, ten minutes later,
takes the claim instead, so that hour is late and not skipped. A run that is
cut off part way (the service restarting in the middle of sending) is not
taken up again, and the readers it had not reached miss that one reminder.

If the claim cannot be asked at all (the limiter is down), the clock decides:
a run in the first ten minutes of the hour sends, a later one does not. That
is one heartbeat in six, so still once an hour, and never six times.

The run's counts go to the service log as `[cron/hourly-goals] reminders`.
`/api/cron/push-deliver` answers with the same counts when it is the caller
that gets the claim, and with `skipped` when the hour is already taken, so it
is no longer a way to send an hour twice by hand.

## Turning the snapshot on, on Render

The existing cron job `purifyapp` (crn-dabehhad0e5s73e7ppog) runs every ten
minutes. When the owner wants the donations snapshot, its command gains one
time-gated line, in the same shape as the lifecycle line already there:

```sh
[ "$(date -u +%H%M)" -ge 0310 ] && [ "$(date -u +%H%M)" -lt 0320 ] && curl -fsS -m 120 -H "x-cron-secret: $CRON_SECRET" https://purifyapp.net/api/cron/bmc-snapshot
```

`test` reads `0310` as decimal, so the leading zero is safe there; do not move
this comparison into `$(( ))`, where it would be octal. The line is its own
`&&` chain, so a skipped window never stops the lines after it (end it with
`; true` if the command is joined with `&&`).

A job run on Render is billed by the second it runs; this is one curl.

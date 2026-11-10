# The test web

His word, 2026-11-10 about 15:25 UTC (`BRAINSTORM.md`): "Then yeah, let's make
a test website. So a test web, that's what we're gonna call it." And at about
15:35: "when I try the latest build, I want to try everything as if it was
public release." The rule is in CLAUDE.md; his steps are in `OWNER-STEPS.md`,
"The test web". This note is the Admin chat's record: what was decided, on
what evidence, and what the code does.

## What was decided (the arbiter's yes to plan v2, 15:44 UTC; his yes pending)

- **A second Render web service** running `ccr-07896cf2-bo0afd`, at the
  onrender.com address Render gives it. Starter size, $7 a month (pricing page
  read 2026-11-10; $25 if the main web needs the 2 GB size). Render's free size
  sleeps after 15 minutes and wakes in about a minute, so an app's first call
  would time out.
- **Deploys on his button** (Auto-Deploy off). The branch took 107 commits on
  9 Nov; a build per push would cost about $25 to $45 a month in build minutes,
  and when the workspace's minutes run out with a spending limit set, Render
  stops every build, the main web's included, for the rest of the month.
- **Its own Supabase project**, a free one ($0; it pauses after a week unused).
  Migrations reach it through that project's own GitHub link, its production
  branch set to ours. Supabase's docs do not say whether one repository may
  link to two projects; if it refuses, a manual workflow pushes them.
- **The address is not a purifyapp.net name**: onrender.com is a public
  suffix, so no cookie can be shared with purifyapp.net; no DNS change; no new
  name in the public certificate logs.
- **Hidden and private**: robots shut, no sitemap, `X-Robots-Tag: noindex` on
  every response, a password on its pages (the apps' calls skip it), a "Test
  web" mark.
- **Money, mail, push**: Stripe test keys only (a live key is refused there);
  no Resend key, and mail to anyone but an admin is refused there; push off at
  first. RevenueCat gets a second webhook, "Test web", for sandbox purchases
  only; the main web's webhook is untouched.
- **Test builds keep the real app id** (his release-like word): Google lets a
  license tester buy in a sideloaded build only when its app id matches the
  app on Play (Google's billing test page, read 2026-11-10). The test build is
  the shrunk release APK, never an AAB, under its own GitHub release. He
  uninstalls the store build first: the file is signed with his upload key,
  Play's copy with Google's.
- **Campaigns**: the branch at "testers"; the test web answers "open" to every
  account by a rule that applies only there (the campaigns chat's, in
  `lib/campaigns/opening.ts`, on this note's marker), held by a test that the
  main web can never answer "open" from it.
- **iPhone**: phase 3, his decision then.

## The database: what a new project lacks, and the baseline

A dry run on 2026-11-10, on a scratch PostgreSQL 16 with stand-ins for
Supabase's own schemas (the three API roles, `auth.users` with the columns the
files name, `auth.uid()`, storage's two tables): all 102 files in
`supabase/migrations` applied in order on an empty database. The six old files
that cannot run twice failed a second run, as AGENTS.md already says.

But eight tables the website reads are not made by any of them. Production has
them (probed with the site's public key, read only: each answers 200), made by
hand from `docs/1.7-build/sql` and `docs/1.8-build/sql`, or, for the
catechism's two, from no SQL at all. The same hand files added columns to
tables the folder makes; probed the same way, every one is on production
(`community_posts.path_day` answers 42501, there and withheld from the public
key; a column that is not there answers 42703). The seven hand files applied
cleanly on top of the folder, twice each.

`supabase/migrations/20261110155643_production_baseline.sql` makes all of it
on a database that has none of the eight, and nothing at all on one that has
all eight. Its dry runs:

| Database | What ran | Result |
|---|---|---|
| new | every file in order, the baseline last | 103 applied; all eight tables made |
| new | the baseline again | "all eight tables are here; nothing to do"; schema unchanged |
| production-shaped (every file but the baseline, then the hand files and the two catechism tables) | the baseline | "all eight tables are here; nothing to do"; schema unchanged, 4,375 lines of `pg_dump --schema-only` compared |
| new against production-shaped | | identical schemas |

Storage buckets are left out: the upload routes make each on first use, and
three of the five do not exist on production yet (the Updates chat's probe of
2026-11-10).

`lib/supabase/__tests__/tablesInFolder.test.ts` keeps the folder whole from
here: every table the code reads must be made by a migration, and the
baseline's guard list must equal the tables it makes. Without the baseline it
names exactly the eight.

Status: NOT SIGNED. Second reader: the Updates chat. Then his yes in plain
words, with the other migrations, before the merge.

## The code (built 2026-11-10, before his yes; nothing touches Render, Supabase or Play)

One file holds the rules, with no imports, so the website and the apps' build
script share it: `lib/testWeb/rules.ts`. A server or build is the test web when
`NEXT_PUBLIC_TEST_WEB` is `1`, and safely so only with its own database (by
address and by the project its public key names), an address that is not
purifyapp.net, and no live Stripe key. `isTestWeb()` (`lib/testWeb/index.ts`)
is false otherwise, so the main web can never act as the test web by a
setting; the campaigns chat's override in `lib/campaigns/opening.ts` asks it.

| Where | What it does on the test web | On the main web |
|---|---|---|
| `instrumentation.ts` `register()` | refuses to start with a broken rule, and says which | nothing |
| `proxy.ts` | pages ask for `TEST_WEB_PASSWORD` (HTTP Basic, any name; shut with 503 if none is set); `/api/`, `/_next/`, `/.well-known/` and `robots.txt` pass, for the apps; `X-Robots-Tag: noindex, nofollow` on every answer | nothing |
| `app/robots.ts`, `app/sitemap.ts` | every crawler shut out; an empty sitemap | as before |
| `app/layout.tsx` | `noindex`; titles end "Purify test web" | as before |
| `components/layout/Footer.tsx` | "1.9 · Test web" | as before |
| `lib/email/send.ts` | mail only to `ADMIN_EMAILS` and `OWNER_EMAILS` (and it holds no Resend key) | as before |
| `scripts/native-build.mjs` | `--test-web` builds only as the test web, with its own database and address | a store build refuses the flag, and any address but purifyapp.net (or this machine) |
| `.github/workflows/android-apk.yml` | the "website" choice: "test web" makes the release APK alone, no AAB, published as `purify-test-web.apk` under `android-test-web` | the store build, unchanged |

Tests: `lib/testWeb/__tests__/rules.test.ts` (the rules, the main web's own
settings among the cases) and `wiring.test.ts` (each place above obeys them).

Walked on a local server started as the test web, 2026-11-10: a page without
the password 401 with `WWW-Authenticate` and `noindex`; a wrong password 401;
the right one 200 with `noindex`, the title "Saints | Purify test web", the
robots meta and the footer mark; `robots.txt` "Disallow: /"; an empty
sitemap; an app's call to `/api/admin/whoami` 200 with no password. The build
script refused, before touching anything, a store build carrying the flag, a
store build naming another address, and a test web build missing its values
or naming the main web's database and address. The Android export (a store
build) built clean.

Two things to know:

- **The test database runs each migration file once, when it first reaches
  the branch,** signed or not; production runs it only at the merge, after his
  yes. So a file that has already run there is not edited afterwards: a
  change goes in a new file, as on main. An edit would leave the test
  database on the first version.
- **The test APK is public,** like the store's files: this repository's
  releases can be downloaded by anyone. It holds no secret (the test web's
  address and its database's public key), and whoever installed it could
  reach nothing of the main web's. Closing sign-ups on the test project
  between walks (his step T4) keeps strangers from making accounts there.

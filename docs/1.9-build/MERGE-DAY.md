# Merge day for 1.9: the order, step by step

Written 2026-11-13 by the Release prep chat, from `node scripts/release.mjs check`
and `node scripts/drop.mjs status` run on 4a31a53b at 04:38 UTC, and a read of
every migration new on the branch. It turns the owner's steps
(`docs/1.9-build/OWNER-STEPS.md`, "Release day", R0 to R9) and the arbiter's
merge notes (`docs/1.9-build/RETRO.md`, "Merging 1.9 on release day") into one
list with a command and an owner for each line. Where this file and
OWNER-STEPS disagree, say so to the arbiter before acting; do not pick one.

Who does what:

- **Owner**: Leona. Every send, every paste into Supabase, every store action, and every "go".
- **Arbiter**: session_01VuYTwdsjYL2mmq2C2JSt2A. Says when each step may start, and sends the owner his words.
- **Release chat**: the one chat the arbiter names to push `main` on the day. It runs the commands. It never pushes main without the owner's "go" in his own words, relayed by the arbiter.

Nothing here is run against production by a chat. Chats cannot run SQL there,
and the only SQL that runs on the day runs by the owner's hand (step 4) or by
the Supabase integration on the push (step 5).

## 0. Before the day (all must be true; the arbiter confirms each)

| # | What | Who | How it is known |
|---|---|---|---|
| 0.1 | The targeted re-check passed on one export from the release head, and the test build was cut from it | Admin 2, arbiter | `docs/1.9-build/notes/gate-run-*.md`, NOW.md |
| 0.2 | The owner walked the test build as a new reader | Owner | his word, recorded in BRAINSTORM.md |
| 0.3 | Every chat has said done; no app code lands after the check | Arbiter | NOW.md roster |
| 0.4 | The admin link in `lib/billing/applyLifecycle.ts` (`?tab=` where the panel reads `#tab=`) is fixed on the branch | Updates 3 | its commit, named in NOW.md |
| 0.5 | R0c: "roads on" or "roads off". On "roads on", the release commit resets the three tests' days in `lib/ab/tests.ts` to start on release day (a code change: it needs its own unit run) | Owner, then a fixer | OWNER-STEPS R0c |
| 0.6 | R0: the 1.9 note filed and accepted in Admin, Releases, Patch notes | Owner (his PC) | `node scripts/drop.mjs status 1.9` shows `note-1.9` no longer "Not filed yet" |
| 0.7 | A drop day is set | Owner, then `node scripts/drop.mjs day 1.9 <day>` | `drop.mjs status` no longer says "No drop day set" |
| 0.8 | R5a: Apple's review account exists, at least a day before R5d | Owner | OWNER-STEPS R5a |

## 1. The way back (release chat)

```
git fetch origin main ccr-07896cf2-bo0afd
git checkout ccr-07896cf2-bo0afd && git pull --ff-only
git fetch --unshallow origin 2>/dev/null || true   # check cannot count main's commits in a shallow clone
node scripts/release.mjs back
node scripts/release.mjs check
```

`back` writes `Way back: <sha> <subject>` into `docs/plans/v1.9/RELEASE.md`.
Today that line already reads `a63d37c7a` (origin/main as fetched at 04:38 UTC);
`back` refreshes it if main has moved. Commit and push the line to the branch
if it changed. `check` must end with **0 thing(s) not ready**. Today it ends
with 1, only because this clone was shallow; after `--unshallow` it read clean.
`git merge-base origin/main HEAD` must equal origin/main's head: the push is
then a fast-forward. If it is not, stop and tell the arbiter.

## 2. The gates on the release head (release chat)

AGENTS.md, release ritual 2. On the exact commit that will be pushed:

```
npm run typecheck
npm run test:unit
npm run lint
npm run build:android
npm run build:ios        # after the Android one, never beside it
npm run build
node scripts/release.mjs email    # write the release email's pages; open and read them
```

Each must be green. If step 0.5 or 0.4 landed code after the re-check, the
arbiter decides what of the walk is run again (OPERATIONS section 5: any code
change after the check means a new export and a new check of what changed).

## 3. The owner's one sign-off on the database (owner, through the arbiter)

**Done: his yes, 2026-11-13 about 04:49 UTC, "yes to the 19".** The headers of 12 (production_baseline) and 2 (the psalms move) now carry it.

**A twentieth, added after:** `20261113052927_retention_lists.sql` (three yes-or-no columns on email_preferences for the retention emails; safe to run twice: add column if not exists, comments). Signed 2026-11-13 about 06:23 UTC, "yes retention sql". It sorts last and runs after the nineteen.

**A twenty-first, added after, signed 2026-11-13 about 14:29 UTC ("all recs", to the recommendation to sign its statements, shown to him whole at about 09:26 UTC):** `20261113075725_community_own_words.sql` (build 95 note 10, a reader edits and deletes their own posts and replies: `edited_at` on `community_posts` and `community_post_replies`, the state 'withdrawn' added to both tables' status checks, and a withdrawn post excused from the two checks that ask a post for words; no policy change; safe to run twice: add column if not exists, each check dropped if it exists before it is added). Written by the Community: edit and remove chat, which says so here. It does not merge without his word, relayed by the arbiter; if he says no or later, the file comes off the branch and the website steps back on its own (an edit answers "Editing isn't available yet", a delete deletes outright).

Pushing main runs every file below against production, in this order. The
arbiter sends the owner this list in plain words and asks for one yes on the
whole list. Every file was read for this table on 2026-11-13; none was run
anywhere by this chat.

| # | Version and name | What it does | Header's sign line | Runs twice |
|---|---|---|---|---|
| 1 | 20261109180246 shared_pages | Makes `shared_pages` and `shared_page_reports` (a journal page shared one at a time), owner-read RLS | "Signed off by the owner on 2026-11-09 (... his answer to the sheet's 4: "Four is fine, but I didn't put the SQL yet")" | yes: if not exists, drop policy if exists |
| 2 | 20261110001550 psalms_113_115_move | Moves readers' notes, highlights, saved verses, gathered lines and journal and shared verse cards on Psalms 113 to 115 to the Septuagint numbering, once, and records it in a new `data_moves` table | no SIGNED line; "His yes, 2026-11-09: "And yes to all your 3 questions"" | yes: does nothing once its `data_moves` row exists. **Must run before any 1.9 app or website does** (step 4) |
| 3 | 20261110002920 plus_events | Makes `plus_events` (Plus over time for Admin), RLS on, no policies | "SIGNED OFF: his yes to items 57 and 65 of 2026-11-10 ("all recs": all of 1.9's database changes go live with the release, the arbiter's reading)" | yes |
| 4 | 20261110002921 chant_pulls | Makes `chant_pulls`, RLS on, service role only | same "all recs" line as 3 | yes |
| 5 | 20261110002922 app_errors | Makes `app_errors` (the apps' error reports), RLS on, service role only | same "all recs" line as 3 | yes |
| 6 | 20261110002923 search_misses | Makes `search_misses` (searches that found nothing, by day), RLS on, service role only | same "all recs" line as 3 | yes |
| 7 | 20261110012059 user_kept | Makes `user_kept` (a reader's kept things, synced), own-row RLS for signed-in readers, nothing for anon | "SIGNED OFF: his "all recs" yes of 2026-11-10 (all of 1.9's database ..." | yes: drop policy if exists before each policy |
| 8 | 20261110084116 campaigns_rework | Campaigns file one: new columns and checks on `prayer_campaigns`, `prayer_campaign_prayers`, `prayer_campaign_reports`; closes duplicate open reports; campaigns tables become service role only; the mod log may name a campaign or picture | "SIGNED, AND NOT APPLIED BY HAND. Signed off by the owner on 2026-11-10 ("R0b yes 1" ...)" | yes: checks found by what they say and replaced inside guards |
| 9 | 20261110090516 florilegium_kinds | A florilegium line may be a council's words or a prayer's line as well as a verse or a Father's | "SIGNED 2026-11-10, AND RUNS WITH THE MERGE. Signed off by the owner that day ("yes florilegium")" | yes: drops every kind check, then adds the wider one |
| 10 | 20261110135543 campaign_threads | Campaigns file two: a campaign's own thread in Community (`community_posts.campaign_id`, a status, a campaign-update flag on replies) | "SIGNED, AND NOT APPLIED BY HAND. Signed off by the owner on 2026-11-10 at about 13:50 UTC, his words: "All recommendations. Start."" | yes |
| 11 | 20261110135545 campaign_pictures | Campaigns file three: makes `prayer_campaign_pictures` only, service role only (pictures stay off; 1.9.1) | same "All recommendations. Start." line as 10 | yes |
| 12 | 20261110155643 production_baseline | On production: nothing (it counts ten hand-made tables, finds all ten, returns). On a new database: makes them | **"NOT SIGNED."** in the header; OWNER-STEPS R0b records it signed by "rec yes to all", put to him as "yes baseline" | yes: the second run finds the ten tables and returns |
| 13 | 20261110172648 campaign_terms | Campaigns file four: `prayer_campaigns.terms_accepted_at` | "SIGNED, AND NOT APPLIED BY HAND. Signed off by the owner on 2026-11-10 at about 16:45 UTC, his words: "rec yes to all"" | yes |
| 14 | 20261110204814 removal_notices | `community_notifications` gains a target kind and a reason, so a reader is told why their post was removed | "SIGNED 2026-11-10, AND RUNS WITH THE MERGE. ... Signed by his "Yes to all recommended suggestions"" | yes: drop constraint if exists before each add |
| 15 | 20261111023026 care_note | One more notification kind, "care" | "SIGNED 2026-11-11 about 02:21 UTC, his words "yes these are all fine"" | yes |
| 16 | 20261111024250 annotation_marks | `annotations.marks` (highlights on some words), a new kind `text-paragraph`, the unique place index widened by three keys | "SIGNED 2026-11-11, AND RUNS WITH THE MERGE. His words, about 02:21 UTC ...: "yes these are all fine"" | yes: drop if exists before each add; the index is dropped and made again |
| 17 | 20261111133008 profiles_keep_no_depth | A trigger empties `profiles.depth` on every write; the depth already kept is cleared | "SIGNED 2026-11-11 about 13:24 UTC, his words "yes privacy and phone voice in v1.9"" | yes: create or replace, drop trigger if exists, the update finds nothing |
| 18 | 20261111133009 prayer_requests_cleared | Clears the prayer requests written before 1.9: their words and times on profiles, the moderators' copies of the words, and who prayed | same "yes privacy and phone voice in v1.9" line as 17 | yes: a second run finds nothing (1.9 writes no prayer requests). Deletes readers' words by design: not undoable |
| 19 | 20261111172547 order_gifts | `gifts.order_id`, and two service-role-only functions to find an EIKON order by its number and claim its month of Plus in one transaction | "SIGNED: the owner's word to the arbiter, 2026-11-11 about 17:36 UTC, on this SQL as sent to him that day: "yes gift sql"" | yes: if not exists, create or replace, revokes and grants repeat |

All 19 are later than main's newest version (20261101043955), unique, and in
the folder's order; `lib/supabase/__tests__/migrationVersions.test.ts` is green.
None changes a file already on main.

**Flagged for his one yes, by name:**

- **12, production_baseline: the header says "NOT SIGNED".** OWNER-STEPS R0b
  records his "rec yes to all" as its sign-off. The file has not reached main,
  so its header may still be corrected to match the record; that is a change
  to a migration file, not docs, and goes through the arbiter. It does nothing
  on production either way.
- **2, psalms_113_115_move: no SIGNED line;** its sign-off is the quoted yes
  of 2026-11-09. Its order matters more than any other: step 4.
- **3 to 7: signed by "the arbiter's reading" of "all recs".** His yes on
  this list makes that reading his own word.
- **1, shared_pages:** the quoted words ("Four is fine, but I didn't put the
  SQL yet") were read as a yes. His yes on this list settles it.
- **18 and 17 delete readers' data on purpose.** Running twice is safe; going
  back is not possible. Say so in his words.

Not on this list and not run by the push: `docs/1.9-build/sql/faith-answers-off-accounts.sql`
(R2c, by his hand after the push) and `docs/1.9-build/sql/plus-source-relabel.sql`
(item 56, a separate one-time data fix on the arbiter's OK).

He sends back: "yes to the 19".

## 4. R1: two pastes by hand, just before the push (owner)

In Supabase, the live project (its address holds the project id named in
OWNER-STEPS R1), SQL Editor, one New query each, from the Raw file on GitHub
on the branch:

1. `supabase/migrations/20261109180246_shared_pages.sql`: Run, success.
2. `supabase/migrations/20261110001550_psalms_113_115_move.sql`: Run, success.

The second must run before any 1.9 app or the 1.9 website touches readers'
rows; the push's own run then finds its mark and does nothing. If either is
red: stop, change nothing, send the red message to the arbiter.

He sends back: "R1 both green".

## 5. The push (release chat, at the owner's "go" only)

The owner tells the arbiter **go**; the arbiter relays it word for word. Then,
from the release head, with a ten-minute timeout (the guard runs typecheck and
the related tests):

```
git fetch origin main
test "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" || { echo "main moved: stop"; exit 1; }
PURIFY_ALLOW_MAIN=1 git push origin HEAD:main
```

That one command carries `PURIFY_ALLOW_MAIN=1`. Never `--no-verify`, never the
GitHub API tools, never a force push. The push is the deploy and runs the 19
migrations.

## 6. After the push, in this order

| # | Step | Who | Command or place |
|---|---|---|---|
| 6.1 | Wait for the deploy, then ask the site what it serves | Release chat | `node scripts/release.mjs live` (waits up to 20 minutes for `/sw.js` to carry `purify-1.9.0`) |
| 6.2 | Render, purifyapp service, Events: "Deploy live"; purifyapp.net/whats-new shows 1.9 | Owner | Render dashboard |
| 6.3 | **Read the Supabase Preview check** on the pushed commit | Release chat (or the owner, R3) | `gh api repos/lifeistheosis/purifyapp/commits/<sha>/check-runs --jq '.check_runs[] \| select(.name == "Supabase Preview") \| .conclusion, .output.summary'` where gh is allowed; in a cloud chat, the GitHub MCP check-run tools on the same commit. **success**: all 19 ran. **failure**: the summary names the error; the owner pastes each file of step 3 by hand, in order, one at a time (each runs twice safely), and the arbiter records which ran |
| 6.4 | R2a: the notes in Admin agree with What's new | Owner | Admin, Releases, Patch notes |
| 6.5 | R2b: the terms change notice to every account; two test emails | Owner | Admin, Releases, Email |
| 6.6 | R2c: the faith answers off the accounts, and a Calendar task three weeks on | Owner | `docs/1.9-build/sql/faith-answers-off-accounts.sql`, by hand |
| 6.7 | R3b: change of email once, on his own account | Owner | Account, Security |
| 6.8 | **Campaigns for his account first.** The merge carries `CAMPAIGNS_OPENING = "testers"` (`lib/campaigns/flags.ts`): live on the website for the admin accounts only. He tries campaigns on purifyapp.net signed in as himself. No reader sees them yet | Owner | purifyapp.net |
| 6.9 | R4: Android build from main, local-first checked, one artifact per invocation; Play Console internal testing. If proguard rules or a native plugin changed since the last walked AAB, the release APK is walked on a phone first (RELEASE.md, "The Android app is shrunk") | Owner | GitHub Actions, "Android build" on `main` |
| 6.10 | R5: iOS signed build from main; TestFlight | Owner | GitHub Actions, "iOS build (signed)" |
| 6.11 | R5b: his walk of 1.9 on his phones, including campaigns and downloading a Bible version (both live on the main web only from the merge, build 95 note 21); `node scripts/drop.mjs phone` records each walk | Owner, then release chat | `docs/PHONE-WALK.md` |
| 6.12 | **R5c: campaigns open to every reader**, at his word "open campaigns" only (and the lawyer's and priest's words, items 113 and 129). One line on main: `CAMPAIGNS_OPENING` from `"testers"` to `"open"`, pushed with `PURIFY_ALLOW_MAIN=1`, then `release.mjs live` again. Must come before 6.13: a store build reviewed while the website says testers carries a feature asleep (Apple 2.5.19) | Owner's word, release chat pushes | `lib/campaigns/flags.ts` |
| 6.13 | R5d: both stores go public with the builds he walked | Owner | Play Console, App Store Connect |
| 6.14 | **R6: the update prompt, once each store serves 1.9, and not before.** `androidVersionCode` (and separately `iosBuildNumber`) in `lib/appUpdate/release.ts` set to the number that store actually serves; each moves on its own day. Both are 0 today, which is right | Release chat, on the owner's word that the store shows it | `lib/appUpdate/release.ts`, then a push to main at his word |
| 6.15 | R8: tell people in the drop's order | Owner sends; release chat records | `node scripts/drop.mjs status 1.9`, `kit`, `sent` |

## 7. If it goes wrong

`docs/plans/v1.9/RELEASE.md`, "If it goes wrong", holds the commands. In short:
the website goes back by a new commit on main that restores the Way back
commit's files (the owner's call, never a force push); a migration is not
undone by that, and going back from one is a new signed migration; the stores
halt their rollout; the update prompt returns to the last good build.

## 8. Readiness on 2026-11-13 at 04:38 UTC (4a31a53b)

Ready:

- The six version identifiers: `lib/whatsNew/version.ts` 1.9, `public/sw.js` `purify-1.9.0`, `android/app/build.gradle` versionName 1.9, `MARKETING_VERSION` 1.9 in four places, `entries.json` and `patches.json` open with 1.9.
- `data/changelog/checklists/1.9.json` (fixes, saints, library, shop and perks shipped; stats skipped with a reason) and the note (`docs/plans/v1.9/patch-note-1.9.json`, the same lines as entries.json, no em dash).
- The board message: 2026-W46, "1.9 is here", 0 days before the note.
- The release email: 7 points of its own in `lib/whatsNew/releaseEmail.ts`.
- `lib/drop/current.ts` names `docs/plans/v1.9/drop.json`; the drop has 23 pieces and its check passes.
- `release.test`, `updateHierarchy.test`, `notesAgree`, `highlights`, `board`, `releaseEmail`, `migrationVersions`, the drop's and the release tool's own tests: 15 files, 218 passed, 3 skipped.
- The Way back line: `a63d37c7a`; 0 commits on main the branch lacks.

Not ready yet (each is a step above, not a fault):

- The 1.9 note is not filed in the owner's queue (step 0.6, R0).
- No drop day set (0.7). Both phone walks not done (6.11).
- The release email has no picture, and its pages have not been written and read (`node scripts/release.mjs email`, step 2). `check` marks both as notes, not failures.
- The release cards wait on the Fable chat (the drop's `cards` piece).
- The campaigns line waits on his word (6.12).

Gaps that need more than docs, for the arbiter to route:

- `supabase/migrations/20261110155643_production_baseline.sql`: header says "NOT SIGNED" against the record of his sign-off (step 3, flag 12).
- `lib/billing/applyLifecycle.ts`: the admin link (0.4), already with Updates 3.
- `lib/ab/tests.ts`: the three tests' days, if "roads on" (0.5).

# Purify 1.9: release checklist

Copied from `docs/release/TEMPLATE.md` by `node scripts/release.mjs new 1.9`.
Tick each line as it is done. The order matters: nothing is pushed until
section 4 is green, and nothing is announced until section 6 is seen live.
How each step works is in `docs/RELEASE.md`.

## 1. Freeze the scope

- [ ] `since-1.8.md` lists every change readers can see since the last
      note, each with its commit and whether it is live, gated, or waits for
      the store builds.
- [ ] Everything gated off (a switch, an env value, a job that is not running)
      is marked. It does not go in the note.
- [ ] What is not ready is named, with the release it moves to.

## 2. The note

- [ ] `docs/release/OWED.md` read: every line under "Owed" is in the note, in
      Purify's voice, and is moved to "Said" with this version. Those are
      promises (the privacy page's, mostly) and the note is where they are kept.
- [ ] `patch-note-1.9.json`: plain lines first, then lines under the six
      categories. From Purify to readers, leading with what they get.
- [ ] `patch-long-1.9.json`: the intro and the sections.
- [ ] `node scripts/release.mjs note 1.9`
- [ ] A reason written in `data/changelog/checklists/1.9.json` for every
      skipped category.
- [ ] The highlights at the top of What's New: `lib/whatsNew/highlights.ts`,
      real screenshots in `public/whats-new/1.9/`, strings in all 21
      languages.
- [ ] The held lines below. Each goes into `patch-note-1.9.json` only once
      what it says is lit for release, and reaches the owner with the note,
      through the queue, never alone. One whose condition is not met at the
      push stays out of the note.

      Held lines (drafts; his voice settles the words):

      1. A plain line, from the prayer campaigns chat by way of the arbiter
         (2026-11-10): "Asking for prayers is now a prayer campaign. The
         prayer wall has closed: start a campaign for someone, for a day or
         up to forty, and others can add it to their own prayers." Lit
         when: the prayer wall is gone from the build (his word, 2026-11-10:
         "remove the prayer wall and just keep the prayer campaigns"), and
         campaigns are open for release (OWNER-STEPS R5c).
- [ ] Sent to the owner's queue:
      `node scripts/patch-notes.mjs propose --file docs/plans/v1.9/patch-note-1.9.json --apply`
- [ ] The owner accepted it in `/admin?tab=patch-notes`. Until then the
      website shows the last release's note under this release's highlights,
      and Admin, Email has no release email to send. Then
      `node scripts/patch-notes.mjs pull --apply`.

## 3. The versions

- [ ] `node scripts/release.mjs bump 1.9`
- [ ] `androidVersionCode` and `iosBuildNumber` in `lib/appUpdate/release.ts`
      left as they were.

## 4. The gates

All green on the commit that will be pushed.

- [ ] `node scripts/release.mjs back`: the commit on `origin/main` this push
      will replace, written under "If it goes wrong" at the end of this file.
- [ ] `node scripts/release.mjs check`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run lint`
- [ ] `npm run build:android`
- [ ] `node scripts/export-walk.mjs`, on that export before `out/` is removed:
      the app with no network, at a phone's size and a computer's. Every
      check passes. `node scripts/export-perf.mjs` beside it when a page's
      weight changed.
- [ ] `npm run build:ios` (after the Android one, never beside it)
- [ ] `npm run build`
- [ ] A browser walk of what changed, at a phone's width and a computer's.

## 5. The words that go out

Drafted now, sent later. The owner sends every one. How a drop works is in
`docs/DROP.md`.

- [x] The drop, `drop.json`: `node scripts/drop.mjs new 1.9`, the points
      written (ten at most, each naming the note line it comes from), what may
      not be said yet under `never`, then `node scripts/drop.mjs draft` and
      every piece read and tuned. A patch has none: it is added to its
      release's, or gets a line for the stores in `announcements.md`.
- [ ] `node scripts/drop.mjs kit`: the check passes with no piece left without
      words, `drop.md` is written, and the kit is published for the owner.
- [ ] `node scripts/release.mjs board`, before the store builds: the drop's
      board message becomes the newest entry of `data/changelog/board.json`,
      which the apps carry for as long as they are installed. The same message
      goes into the `board_messages` table at the announcement (section 8),
      and is then pulled, so the two agree.
- [ ] The release email, in `lib/whatsNew/releaseEmail.ts`: its picture (a
      JPEG in `public/whats-new/1.9/`), one line, at most ten points
      that go straight to what is new, each with an emoji, and one closing
      line. Every point is something the note already says.
- [ ] Screenshots under the points that need one, listed in `pictures.json`
      and taken by `node scripts/release-pictures.mjs 1.9`. Each one
      opened and looked at. A picture of Community shows Purify's own account
      or a reader who said yes, and nobody else.
- [ ] `node scripts/release.mjs email`, and `release-night.html` opened and
      read to the end.
- [ ] The cards, and a video if the release has one: made and tracked in the
      purify-ads repo (`ssm/`), and named by the drop's `cards` and `video`
      pieces.

## 6. The push

- [ ] The owner said go.
- [ ] The terms' new date (his item 96, 2026-11-10: "change it all when
      version 1.9 gets dropped"): one commit sets the terms' "Effective"
      date (`app/(app)/terms/page.tsx`) and `TERMS_VERSION`
      (`lib/legal/version.ts`) to the release day, together;
      `lib/legal/__tests__/termsDate.test.ts` refuses one without the other.
      The bump asks every reader to accept again at their next sign-in,
      checkout or EIKON claim, and arms Admin's terms notice.
- [ ] July's campaign rows (his word of 2026-11-10; OWNER-STEPS R9): the
      same commit writes `SHIPPED_ON` in `lib/campaigns/julyRows.ts` as the
      release day, in UTC, `"YYYY-MM-DD"`. While it is `null` the job reads
      and deletes nothing; thirty days after the day it names, the
      heartbeat deletes July's rows, and it leaves the public mark
      `campaigns-july-rows-deleted` in `data_moves` when none is left. The
      prayer wall's end counts its fourteen days from the same constant
      (`lib/community/prayerRequestsEnd.ts`, 88931feae): on that day the
      requests' words, their holds and who prayed are cleared, and the mark
      `prayer-requests-cleared` stands in `data_moves`.
- [ ] Campaign pictures in the store builds (OWNER-STEPS R5d; the review
      notes, part A, items 4 and 9): `PICTURES_IN_STORE_BUILDS` in
      `lib/campaigns/flags.ts` stays `false` unless pictures are on when the
      store builds are cut, and is set `true` only together with the
      server's own switch (`CAMPAIGN_PARTS.pictures` in
      `lib/campaigns/parts.ts`); `lib/campaigns/__tests__/storePictures.test.ts`
      refuses `true` while the server's switch is off. While it is `false`,
      the apps draw no picture and no picture control, whatever the server
      says, and the review notes' part B says so.
- [ ] The tests' days (OWNER-STEPS R0c, by his "roads on" or "roads off"):
      on "roads on", in `lib/ab/tests.ts`, `ACCOUNT_PLACE` and
      `PLUS_INTRODUCED` begin on the release day and end 84 days later, and
      `PLUS_SHEET_ORDER` begins the day after those end, for 84 days; on
      "roads off", `ROADS_LIVE` is `false` in `lib/onboarding/flags.ts`
      instead. The unit tests hold the spans and that the two Plus tests
      never share a day; only this step makes the first day the release
      day.
- [ ] `git fetch origin`, rebase on `origin/main`, `node scripts/release.mjs back`
      again, and section 4's check again.
- [ ] Push `main`. That is the deploy.
- [ ] `node scripts/release.mjs live`: it waits for the new deploy, then asks
      purifyapp.net for the note, every picture, the main pages, a page that
      does not exist and the redirects. Every line ok.
- [ ] The build id on purifyapp.net changed.
- [ ] `node scripts/chants/probe-live.mjs`: every build already in readers'
      hands can still read the chant list and reach each recording, asked as
      each app's origin. Every line ok. A fail here is a chant that stopped
      for readers who have not updated: put the website back
      (`scripts/chants/store-builds.json` says what each build asks for).
- [ ] `/whats-new` shows the note and the highlights; the footer shows
      1.9. The note shows only once the owner has accepted it.
- [ ] The owner sent the terms notice (Admin, Releases, Email; OWNER-STEPS
      R2b), and his test messages to legal@ and support@ are in Messages,
      the first marked Legal.
- [ ] The Supabase check on the commit is green, if the push carried a
      migration.
- [ ] The deletes the privacy page promises run (error reports after 14
      days, searches that found nothing after 90; `lib/ops/prune.ts`). They
      ride Render's cron call to `/api/cron/hourly-goals` with `CRON_SECRET`.
      Once the `app_errors` and `search_misses` tables exist, read one run's
      answer in Render (the cron job `purifyapp`, Logs). Its
      `maintenance.pruneReports`, or that entry's `last` on a run that
      skipped them, says `"ok":true` and a number for each table (rows
      deleted; 0 is fine). `"absent"`: that table's SQL has not run.
      `"last":null`: not run since the server started; read the next run.
      A 503 or a 403 (curl says error 22), or no run at all: the cron is not
      calling with the secret, so nothing is deleted and no prayer reminder
      is sent either.

## 7. The stores (the owner)

- [ ] If the note or the weekly board was edited in Admin after the push:
      `node scripts/patch-notes.mjs pull --apply`, commit, push. The apps
      carry the files, never the tables, so an edit that is only in Admin is
      not in the build.
- [ ] GitHub Actions, "Android build", on `main`, local-first checked.
- [ ] GitHub Actions, "iOS build (signed)".
- [ ] Submitted to Google Play and to the App Store.
- [ ] After a store is serving the build: its number raised in
      `lib/appUpdate/release.ts`, committed and pushed. Each store on its own
      day.

## 8. Afterwards

`node scripts/drop.mjs status` says where every piece of the drop stands.
Each line below is recorded there as it happens (`note`, `served`, `sent`),
in the owner's words.

- [ ] The Discord announcement posted.
- [ ] The board message posted in Admin, Patch notes, the board message: the
      drop's `board` piece, the words `data/changelog/board.json` already
      carries. Then `node scripts/patch-notes.mjs pull --apply` and a commit,
      so the file and the table agree.
- [ ] When a store approves: the "in the stores" post for that store.
- [ ] The release email sent from Admin, Email, in place of that week's
      Sunday email. Before a store has the build it describes things a reader
      in the app cannot open yet, so when to send is the owner's call.
- [ ] The release written into `docs/audit/continuation-ledger.md`.
- [ ] `node scripts/release.mjs new <next version>` for what comes next.

## If it goes wrong

Way back: a63d37c7a7cbd29cd368989d81b521fd55197319 Push: a test to the admin's own devices (Releases, Records, Notifications sent)

The line above is the commit on `origin/main` that this push replaces.
`node scripts/release.mjs back` writes it before the push and again after
every rebase, and `node scripts/release.mjs check` says NO while it is
missing or `origin/main` has moved past it.

- **The website goes back by a new commit.** One commit on `main` that puts
  back the files of the Way back commit, pushed like any other. That push is
  a deploy, so it is the owner's call. Never a force push: it rewrites `main`
  under everyone who has it, and the record of what was live goes with it.

      git fetch origin
      git switch -c way-back origin/main
      git restore --source=<sha> --staged --worktree -- .
      git commit -m "Back to <sha>, the website before 1.9"
      git push origin way-back:main

  `<sha>` is the one on the Way back line. Run it at the root of a checkout
  with nothing uncommitted. The fault is then fixed on a branch, and the
  release goes out again with a way back of its own.
- **The stores cannot go back.** A build a store has served stays on every
  phone that took it, and neither store will serve an older one again. Stop
  it reaching more phones: in Play Console, halt the staged rollout; in App
  Store Connect, pause the phased release. A fixed build then goes through
  review like any other.
- **The update prompt goes back.** `androidVersionCode` and `iosBuildNumber`
  in `lib/appUpdate/release.ts` go back to the last good build's numbers, or
  to 0, so no installed app is sent to fetch the bad build. If
  `ANDROID_VERSION_CODE` or `IOS_BUILD_NUMBER` is set on Render, it goes back
  too: it overrides the file.
- **A migration does not go back with the files.** One that reached
  production stays applied after a revert, and going back from it is a new
  migration, with the owner's sign-off on its SQL (AGENTS.md).
  `node scripts/release.mjs back` says whether this push carries one.

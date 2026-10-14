# Purify 1.6: release checklist

Copied from `docs/release/TEMPLATE.md` by `node scripts/release.mjs new 1.6`.
Tick each line as it is done. The order matters: nothing is pushed until
section 4 is green, and nothing is announced until section 6 is seen live.
How each step works is in `docs/RELEASE.md`.

## 1. Freeze the scope

- [ ] `since-1.5.2.md` lists every change readers can see since the last
      note, each with its commit and whether it is live, gated, or waits for
      the store builds.
- [ ] Everything gated off (a switch, an env value, a job that is not running)
      is marked. It does not go in the note.
- [ ] What is not ready is named, with the release it moves to.

## 2. The note

- [ ] `docs/release/OWED.md` read: every line under "Owed" is in the note, in
      Purify's voice, and is moved to "Said" with this version. Those are
      promises (the privacy page's, mostly) and the note is where they are kept.
- [ ] `patch-note-1.6.json`: plain lines first, then lines under the six
      categories. From Purify to readers, leading with what they get.
- [ ] `patch-long-1.6.json`: the intro and the sections.
- [ ] `node scripts/release.mjs note 1.6`
- [ ] A reason written in `data/changelog/checklists/1.6.json` for every
      skipped category.
- [ ] The highlights at the top of What's New: `lib/whatsNew/highlights.ts`,
      real screenshots in `public/whats-new/1.6/`, strings in all 21
      languages.
- [ ] Sent to the owner's queue:
      `node scripts/patch-notes.mjs propose --file docs/plans/v1.6/patch-note-1.6.json --apply`
- [ ] The owner accepted it in `/admin?tab=patch-notes`. Until then the
      website shows the last release's note under this release's highlights,
      and Admin, Email has no release email to send. Then
      `node scripts/patch-notes.mjs pull --apply`.

## 3. The versions

- [ ] `node scripts/release.mjs bump 1.6`
- [ ] `androidVersionCode` and `iosBuildNumber` in `lib/appUpdate/release.ts`
      left as they were.

## 4. The gates

All green on the commit that will be pushed.

- [x] `node scripts/release.mjs back`: the commit on `origin/main` this push
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

- [ ] The drop, `drop.json`: `node scripts/drop.mjs new 1.6`, the points
      written (ten at most, each naming the note line it comes from), what may
      not be said yet under `never`, then `node scripts/drop.mjs draft` and
      every piece read and tuned. A patch has none: it is added to its
      release's, or gets a line for the stores in `announcements.md`.
- [ ] `node scripts/drop.mjs kit`: the check passes with no piece left without
      words, `drop.md` is written, and the kit is published for the owner.
- [x] `node scripts/release.mjs board`, before the store builds: the drop's
      board message becomes the newest entry of `data/changelog/board.json`,
      which the apps carry for as long as they are installed. The same message
      goes into the `board_messages` table at the announcement (section 8),
      and is then pulled, so the two agree. Written 2026-10-14 as 2026-W42,
      "1.6 is here"; the newest message before it was from 2026-09-08.
- [ ] The release email, in `lib/whatsNew/releaseEmail.ts`: its picture (a
      JPEG in `public/whats-new/1.6/`), one line, at most ten points
      that go straight to what is new, each with an emoji, and one closing
      line. Every point is something the note already says.
- [ ] Screenshots under the points that need one, listed in `pictures.json`
      and taken by `node scripts/release-pictures.mjs 1.6`. Each one
      opened and looked at. A picture of Community shows Purify's own account
      or a reader who said yes, and nobody else.
- [ ] `node scripts/release.mjs email`, and `release-night.html` opened and
      read to the end.
- [ ] The cards, and a video if the release has one: made and tracked in the
      purify-ads repo (`ssm/`), and named by the drop's `cards` and `video`
      pieces.

## 6. The push

- [ ] The owner said go.
- [ ] `git fetch origin`, rebase on `origin/main`, `node scripts/release.mjs back`
      again, and section 4's check again.
- [ ] Push `main`. That is the deploy.
- [ ] `node scripts/release.mjs live`: it waits for the new deploy, then asks
      purifyapp.net for the note, every picture, the main pages, a page that
      does not exist and the redirects. Every line ok.
- [ ] The build id on purifyapp.net changed.
- [ ] `/whats-new` shows the note and the highlights; the footer shows
      1.6. The note shows only once the owner has accepted it.
- [ ] The Supabase check on the commit is green, if the push carried a
      migration.

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

Way back: ac35f621e3c3a98bc27c5838a50f092d93b0247b Admin panel: the SSM board's look, black and white

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
      git commit -m "Back to <sha>, the website before 1.6"
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
  `node scripts/release.mjs back` says whether this push carries one. 1.6
  carries none: nothing in `supabase/migrations/` changed since the Way back
  commit.

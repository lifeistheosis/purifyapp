# Purify 1.5.1: release checklist

Copied from `docs/release/TEMPLATE.md` by `node scripts/release.mjs new 1.5.1`.
Tick each line as it is done. The order matters: nothing is pushed until
section 4 is green, and nothing is announced until section 6 is seen live.
How each step works is in `docs/RELEASE.md`.

## 1. Freeze the scope

- [x] `since-1.5.md` lists every change readers can see since the last
      note, each with its commit and whether it is live, gated, or waits for
      the store builds.
      *With the measurements that found them.*
- [x] Everything gated off (a switch, an env value, a job that is not running)
      is marked. It does not go in the note.
      *Nothing is gated: there is no switch in this patch.*
- [x] What is not ready is named, with the release it moves to.
      *In since-1.5.md, under "Looked at and left alone".*

## 2. The note

- [x] `patch-note-1.5.1.json`: plain lines first, then lines under the six
      categories. From Purify to readers, leading with what they get.
      *5 lines, all under fixes.*
- [x] `patch-long-1.5.1.json`: the intro and the sections.
- [x] `node scripts/release.mjs note 1.5.1`
- [x] A reason written in `data/changelog/checklists/1.5.1.json` for every
      skipped category.
      *Five skipped, each with its reason: a refinement patch adds nothing.*
- [x] The highlights at the top of What's New: `lib/whatsNew/highlights.ts`,
      real screenshots in `public/whats-new/1.5.1/`, strings in all 21
      languages.
      *1.5's stand. A patch keeps its release's (docs/RELEASE.md, "A patch").*
- [x] Sent to the owner's queue:
      `node scripts/patch-notes.mjs propose --file docs/plans/v1.5.1/patch-note-1.5.1.json --apply`
      *Filed on 2026-10-04 as revision 9a33f814, beside 1.5's.*
- [ ] The owner accepted it in `/admin?tab=patch-notes`. Until then the
      website shows the last release's note under this release's highlights,
      and Admin, Email has no release email to send. Then
      `node scripts/patch-notes.mjs pull --apply`.

## 3. The versions

- [x] `node scripts/release.mjs bump 1.5.1`
- [x] `androidVersionCode` and `iosBuildNumber` in `lib/appUpdate/release.ts`
      left as they were.
      *Both 0.*

## 4. The gates

All green on the commit that will be pushed.

- [x] `node scripts/release.mjs check`
      *Everything it can see is ready.*
- [x] `npm run typecheck`
      *tsc 0.*
- [x] `npm run test:unit`
      *324 files passed and 1 skipped; 3,894 tests passed and 3 skipped.*
- [x] `npm run lint`
      *eslint 0 on the 26 changed files. The whole repo was not linted on this machine.*
- [x] `npm run build:android`
      *Exit 0. out/ without _next is 0.52 GB of the new 0.60 GB budget; 550.7 MB in all, where 1.5 was 720.3.*
- [x] `npm run build:ios` (after the Android one, never beside it)
      *Exit 0, the same 0.52 GB.*
- [x] `npm run build`
      *Exit 0, 3,865 pages: the 1,975 of before and 1,890 data files.*
- [x] A browser walk of what changed, at a phone's width and a computer's.
      *In the Android export with no network, the way the apps run it, at a phone's size and a computer's: the Bible reader, the Greek, a word's entry, the commentary sheet and rail, a long work and a short one, the Saints tab. Every check passed (the ledger lists them). The website's side is walked on the live site after the push.*

## 5. The words that go out

Drafted now, sent later. The owner sends every one.

- [x] `announcements.md`: the Discord posts and the weekly board.
      *One line to add under the 1.5 announcement, and a post if it goes out alone. No new board message.*
- [x] The release email, in `lib/whatsNew/releaseEmail.ts`: its picture (a
      JPEG in `public/whats-new/1.5.1/`), one line, at most ten points
      that go straight to what is new, each with an emoji, and one closing
      line. Every point is something the note already says.
      *None of its own. The release email is 1.5's.*
- [x] Screenshots under the points that need one, listed in `pictures.json`
      and taken by `node scripts/release-pictures.mjs 1.5.1`. Each one
      opened and looked at. A picture of Community shows Purify's own account
      or a reader who said yes, and nobody else.
      *None: a patch has no pictures.*
- [x] `node scripts/release.mjs email`, and `release-night.html` opened and
      read to the end.
      *Run with the version at 1.5.1: it writes 1.5's letter, unchanged.*
- [ ] Social slides or loops, if the release has them (the purify-ads repo).

## 6. The push

- [x] The owner said go.
      *Asked, the owner chose "Push now".*
- [x] `git fetch origin`, rebase on `origin/main`, run section 4's check again.
      *origin/main had not moved from 142247ea.*
- [x] Push `main`. That is the deploy.
      *d0a3954e at 22:13Z on 2026-10-04.*
- [x] The build id on purifyapp.net changed.
      *At 22:16Z, three and a half minutes after the push.*
- [ ] `/whats-new` shows the note and the highlights; the footer shows
      1.5.1. The note shows only once the owner has accepted it.
      *1.5's highlights and the footer, yes, at 22:17Z, and the website's
      Bible reader walked with them: every check passed (the ledger lists
      them). The 1.5.1 note waits in the owner's queue beside 1.5's. Tick
      this when both are accepted.*
- [x] The Supabase check on the commit is green, if the push carried a
      migration.
      *No migration in this push.*

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

- [ ] The Discord announcement posted.
- [ ] When a store approves: the "in the stores" post for that store.
- [ ] The release email sent from Admin, Email, in place of that week's
      Sunday email. Before a store has the build it describes things a reader
      in the app cannot open yet, so when to send is the owner's call.
- [x] The release written into `docs/audit/continuation-ledger.md`.
- [ ] `node scripts/release.mjs new <next version>` for what comes next.

## After the note was cut: notifications merged in

The owner asked whether 1.5.1 included the notification update. It did not.
On their word it was added before the store builds: `fix/notifications`
(F-40, F-41), applied on top with no conflict. Every gate in section 4 was
run again on the tree with it in:

- tsc 0. eslint 0 on the 17 files that differ from the pushed 1.5.1.
- vitest 326 files passed and 1 skipped; 3,922 tests passed and 3 skipped.
- `build:android` exit 0 and `build:ios` exit 0, 0.53 GB of the 0.60 GB
  budget; 553.3 MB in all.
- `next build` exit 0, 3,865 pages.
- `node scripts/export-walk.mjs`: the first run, on a loaded machine, looked for the first verse before the reader had drawn it and failed that one check; the walk now waits for the verse, and on a fresh export all 29 checks passed.
- Pushed as 6c404cb2 at 23:20Z on 2026-10-04 and seen live at 23:23Z; the
  live walk passed again. The store builds are made from this commit or later.

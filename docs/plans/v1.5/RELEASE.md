# Purify 1.5: release checklist

Copied from `docs/release/TEMPLATE.md` by `node scripts/release.mjs new 1.5`.
Tick each line as it is done. The order matters: nothing is pushed until
section 4 is green, and nothing is announced until section 6 is seen live.
How each step works is in `docs/RELEASE.md`.

## 1. Freeze the scope

- [x] `since-1.4.md` lists every change readers can see since the last
      note, each with its commit and whether it is live, gated, or waits for
      the store builds.
      *Brought to 734e02ca, 81 commits.*
- [x] Everything gated off (a switch, an env value, a job that is not running)
      is marked. It does not go in the note.
      *Gift Plus, push reminders, Community notifications, the weekly Community email, cart notes and ambassador payouts. The hidden streak saves are never named.*
- [x] What is not ready is named, with the release it moves to.
      *At the top of MASTER.md: it rides the next build, and the Nativity Fast companion's store date did not move.*

## 2. The note

- [x] `patch-note-1.5.json`: plain lines first, then lines under the six
      categories. From Purify to readers, leading with what they get.
      *43 lines: 12 plain, 12 fixes, 1 saint, 8 library, 5 shop, 4 perks, 1 stats.*
- [x] `patch-long-1.5.json`: the intro and the sections.
- [x] `node scripts/release.mjs note 1.5`
      *The note was written before the tool was. Run afterwards, the tool wrote the same three files, byte for byte.*
- [x] A reason written in `data/changelog/checklists/1.5.json` for every
      skipped category.
      *None skipped: all six shipped.*
- [x] The highlights at the top of What's New: `lib/whatsNew/highlights.ts`,
      real screenshots in `public/whats-new/1.5/`, strings in all 21
      languages.
      *Five: the Greek Old Testament, Job, the shop, the Kitchen, the saints. No Community screen (it shows other readers) and no streak (it needs an account to draw).*
- [x] Sent to the owner's queue:
      `node scripts/patch-notes.mjs propose --file docs/plans/v1.5/patch-note-1.5.json --apply`
      *Filed on 2026-10-04 as revision 9f0f8617. It waits in /admin?tab=patch-notes.*
- [ ] The owner accepted it in `/admin?tab=patch-notes`. Until then the
      website shows the last release's note under this release's highlights,
      and Admin, Email has no release email to send. Then
      `node scripts/patch-notes.mjs pull --apply`.

## 3. The versions

- [x] `node scripts/release.mjs bump 1.5`
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
      *321 files passed and 1 skipped; 3,875 tests passed and 3 skipped.*
- [x] `npm run lint`
      *eslint 0 on the 27 changed files. The whole repo was not linted on this machine.*
- [x] `npm run build:android`
      *Exit 0. out/ without _next is 0.69 GB of the 0.90 GB budget.*
- [x] `npm run build:ios` (after the Android one, never beside it)
      *Exit 0, the same 0.69 GB.*
- [x] `npm run build`
      *Exit 0, 1,975 pages.*
- [x] A browser walk of what changed, at a phone's width and a computer's.
      *After the push, on the live site, since the preview tool could not serve this branch (the ledger says why): /whats-new at 1280 and at 390 wide, a highlight opened, every picture drawn, no page errors, no sideways scroll.*

## 5. The words that go out

Drafted now, sent later. The owner sends every one.

- [x] `announcements.md`: the Discord posts and the weekly board.
- [x] The release email, in `lib/whatsNew/releaseEmail.ts`: its picture (a
      JPEG in `public/whats-new/1.5/`), one line, at most ten points
      that go straight to what is new, each with an emoji, and one closing
      line. Every point is something the note already says.
      *Nine points. The owner saw it three times on 2026-10-04 and steered it to this.*
- [x] Screenshots under the points that need one, listed in `pictures.json`
      and taken by `node scripts/release-pictures.mjs 1.5`. Each one
      opened and looked at. A picture of Community shows Purify's own account
      or a reader who said yes, and nobody else.
      *One: the Purify account's profile. The prayer wall held a reader's request and Ask a Priest was empty, so neither is pictured; the owner chose to skip both.*
- [x] `node scripts/release.mjs email`, and `release-night.html` opened and
      read to the end.
- [ ] Social slides or loops, if the release has them (the purify-ads repo).
      *Asked for on 2026-10-05, with the rest of the promo. The card set is
      the piece `release-1-5-cards` in purify-ads, named by the drop's
      `cards` piece.*
- [x] The drop (`drop.json`, added to this checklist on 2026-10-05, the day
      the drop system was built): 29 pieces in five moments, ten points, for
      1.5, 1.5.1 and 1.5.2 together. `node scripts/drop.mjs kit` passes, and
      the kit is published for the owner as a private artifact. Nothing in
      it has been sent.

## 6. The push

- [x] The owner said go.
      *"finalize so everything gets pushed", 2026-10-04.*
- [x] `git fetch origin`, rebase on `origin/main`, run section 4's check again.
      *origin/main had not moved from 734e02ca.*
- [x] Push `main`. That is the deploy.
      *b943dfb6 at 20:18Z on 2026-10-04.*
- [x] The build id on purifyapp.net changed.
      *At 20:21Z, three and a half minutes after the push.*
- [ ] `/whats-new` shows the note and the highlights; the footer shows 1.5.
      *The highlights and the footer, yes, at 20:22Z, on a computer and on a
      phone. The note, not yet: the site reads notes from the table, and
      1.5's waits in the owner's queue. Tick this when it is accepted.*
- [x] The Supabase check on the commit is green, if the push carried a
      migration.
      *No migration in this push. The check reported success.*

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

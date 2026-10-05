# Purify 1.5.2: release checklist

Copied from `docs/release/TEMPLATE.md` by `node scripts/release.mjs new 1.5.2`.
Tick each line as it is done. The order matters: nothing is pushed until
section 4 is green, and nothing is announced until section 6 is seen live.
How each step works is in `docs/RELEASE.md`.

## 1. Freeze the scope

- [x] `since-1.5.1.md` lists every change readers can see since the last
      note, each with its commit and whether it is live, gated, or waits for
      the store builds.
      *With what the owner said, what was measured, and what it turned out to
      be. One branch, so one commit; nothing is live until it is pushed.*
- [x] Everything gated off (a switch, an env value, a job that is not running)
      is marked. It does not go in the note.
      *Nothing is gated: there is no switch in this patch.*
- [x] What is not ready is named, with the release it moves to.
      *In since-1.5.1.md, under "Looked at and left alone".*

## 2. The note

- [x] `patch-note-1.5.2.json`: plain lines first, then lines under the six
      categories. From Purify to readers, leading with what they get.
      *15 lines: 3 plain, 8 under fixes, 2 under library, 2 under shop.
      Three of them, and a sixth section of the long note, came with the
      second half of the patch (the apps' weight, going back, the hold).*
- [x] `patch-long-1.5.2.json`: the intro and the sections.
- [x] `node scripts/release.mjs note 1.5.2`
- [x] A reason written in `data/changelog/checklists/1.5.2.json` for every
      skipped category.
      *Three skipped (saints, perks, stats), each with its reason.*
- [x] The highlights at the top of What's New: `lib/whatsNew/highlights.ts`,
      real screenshots in `public/whats-new/1.5.2/`, strings in all 21
      languages.
      *1.5's stand. A patch keeps its release's (docs/RELEASE.md, "A patch").*
- [ ] Sent to the owner's queue:
      `node scripts/patch-notes.mjs propose --file docs/plans/v1.5.2/patch-note-1.5.2.json --apply`
- [ ] The owner accepted it in `/admin?tab=patch-notes`. Until then the
      website shows the last release's note under this release's highlights,
      and Admin, Email has no release email to send. Then
      `node scripts/patch-notes.mjs pull --apply`.

## 3. The versions

- [x] `node scripts/release.mjs bump 1.5.2`
- [x] `androidVersionCode` and `iosBuildNumber` in `lib/appUpdate/release.ts`
      left as they were.
      *Both 0.*

## 4. The gates

All green on the commit that will be pushed.

- [x] `node scripts/release.mjs check`
      *Everything it can see is ready. `origin/main` was fetched first and
      had not moved from 0fd52b51, the commit this branch was cut from.*
- [x] `npm run typecheck`
      *tsc 0, after `next typegen`.*
- [x] `npm run test:unit`
      *336 files passed; 4,042 tests passed and 1 skipped.*
- [x] `npm run lint`
      *eslint 0 on the 83 source files the release changes. The whole repo
      was not linted on this machine.*
- [x] `npm run build:android`
      *Exit 0, with the shop on. out/ without _next is 0.32 GB of the
      0.60 GB budget; 347.0 MB in 10,096 files, and 100.4 MB packed. The
      first commit of this patch built 564.1 MB in 12,018 files and 133.3 MB
      packed: `prunePageDocuments` took 1,922 documents the shells never
      serve, 219.7 MB. The very first build of the day had no
      `.env.production.local` beside it and so no shop; it is not recorded.*
- [x] `node scripts/export-walk.mjs`, on that export before `out/` is removed:
      the app with no network, at a phone's size and a computer's. Every
      check passes. `node scripts/export-perf.mjs` beside it when a page's
      weight changed.
      *97 checks, all passing, 29 of them 1.5.1's and 68 new in sections 8
      to 12. The bundle is served the way the shells serve it now (the front
      door for every address without an extension), in the shell's own user
      agent, and every screen is reached by a cold start and then the
      router. Three sections were proved on a tree that had the fault before
      they were trusted: 10 on the export made before the shop bar's fix, 9
      on the export before going back was put right (the saint 3,022px from
      where it had been), 11 on the build where the entry recovery never
      ran, and 12's rows on the build where the verse pill broke three,
      three and one. `export-perf.mjs` beside it, the same way: a cold start in
      0.9 s with the processor slowed four times, John 1 open in 1.6 s, the
      saints list in 0.8 s, the shop in 0.4 s. Psalm 118 drops 5 frames of
      59; John 1 and the Job walkthrough one each; nothing else drops any.*
- [x] `npm run build:ios` (after the Android one, never beside it)
      *Exit 0, the same 0.32 GB.*
- [x] `npm run build`
      *Exit 0, 3,874 pages.*
- [x] A browser walk of what changed, at a phone's width and a computer's.
      *On the live site first, at a phone's size in the apps' own shell, to
      find each thing the owner named. Then in the Android export: search
      with a keyboard standing in, a kept streak's sheet, a tab switch
      filmed for its dimmest frame, and Prayers, Discover, Bible, a saint, a
      work, the shop, a category and Community opened and looked at. At
      1366 and 1920 wide: a saint's Request and Save on one line at one
      height, the explainer inside the window, a work, Community, Prayers,
      Discover, search still its card, and the shop and a category with the
      live catalogue. Notifications and the onboarding were walked on the
      development server with a signed-in reader stood in, since neither
      can be reached signed out. For the second half: a prayer and a verse
      held with real touch events and the clipboard read back, both pills'
      screenshots opened and looked at; going back judged by where the saint
      sits on the screen; a hard load of an inner address and of one with no
      screen. Not walked: anything on a real phone, and the website's own
      build in a browser, which is walked on the live site after the push.*

The three builds and the walk ran on the code of these commits. The note's
three added lines, the long note's sixth section and this file were written
after them: words only, held by the unit tests and by
`node scripts/release.mjs check`, which were run again on the finished
tree.

One commit came after all of that, for two things the last screenshots
showed: the verse pill's rows, and the ring round a held text. It is two
rules of CSS and one check in the walk. Android was built again for it and
walked (the 97 above); iOS and the website were not. Before the push,
section 6 runs all of this once more, on all three.

## 5. The words that go out

Drafted now, sent later. The owner sends every one.

- [x] `announcements.md`: the Discord posts and the weekly board.
      *A post for the day the web is live, a short one, and one for the
      stores. No new board message.*
- [x] The release email, in `lib/whatsNew/releaseEmail.ts`: its picture (a
      JPEG in `public/whats-new/1.5.2/`), one line, at most ten points
      that go straight to what is new, each with an emoji, and one closing
      line. Every point is something the note already says.
      *None of its own. The release email is 1.5's.*
- [x] Screenshots under the points that need one, listed in `pictures.json`
      and taken by `node scripts/release-pictures.mjs 1.5.2`. Each one
      opened and looked at. A picture of Community shows Purify's own account
      or a reader who said yes, and nobody else.
      *None: a patch has no pictures.*
- [ ] `node scripts/release.mjs email`, and `release-night.html` opened and
      read to the end.
      *Not run: there is no letter for a patch, and 1.5's was read with 1.5.*
- [ ] Social slides or loops, if the release has them (the purify-ads repo).

## 6. The push

- [x] The owner said go.
      *"push", on 2026-10-05, after being told that "push" was the website
      only and "hard push" the website, the note in his queue and both store
      builds.*
- [x] `git fetch origin`, rebase on `origin/main`, run section 4's check again.
      *`origin/main` had not moved from 0fd52b51, so there was nothing to
      rebase onto. iOS and the website were built on the last commit, which
      had been built for Android only: both exit 0, 0.32 GB and 3,874 pages.*
- [x] Push `main`. That is the deploy.
      *0fd52b51..0289cbf2 at 21:20:19Z.*
- [x] The build id on purifyapp.net changed.
      *At 21:23:59Z, three minutes and forty seconds later: qKTjDaLZhEJXXVN-R2FtO
      to p-s4UZvRYRivhP0gZbgNx, and `sw.js` names `purify-1.5.2`.*
- [x] `/whats-new` shows the note and the highlights; the footer shows
      1.5.2. The note shows only once the owner has accepted it.
      *The highlights are 1.5's, as a patch keeps them, and the page says
      1.5.2. The 1.5.2 note is not showing: it was not filed in his queue,
      because "push" did not ask for that.*
- [x] The Supabase check on the commit is green, if the push carried a
      migration.
      *It carried none.*

## 7. The stores (the owner)

- [ ] If the note or the weekly board was edited in Admin after the push:
      `node scripts/patch-notes.mjs pull --apply`, commit, push. The apps
      carry the files, never the tables, so an edit that is only in Admin is
      not in the build.
- [x] GitHub Actions, "Android build", on `main`, local-first checked.
      *Run 73, on 0289cbf2, at the owner's "send out cis". Succeeded at
      21:39:56Z. `app-release.aab` is 126.1 MB on the `android-release`
      release, where 1.5.1's was 161.1 MB.*
- [x] GitHub Actions, "iOS build (signed)".
      *Run 27, on 0289cbf2, with its upload. Succeeded at 21:46:20Z: the
      archive validated and uploaded to App Store Connect with no errors.
      Its bundle was 0.32 GB where run 26's was 0.53.*
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
      *Written with the commit: "1.5.2, a refinement for phones". The push
      gets an addendum of its own when it is seen live.*
- [ ] `node scripts/release.mjs new <next version>` for what comes next.

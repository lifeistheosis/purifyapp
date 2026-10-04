# Purify <version>: release checklist

Copied from `docs/release/TEMPLATE.md` by `node scripts/release.mjs new <version>`.
Tick each line as it is done. The order matters: nothing is pushed until
section 4 is green, and nothing is announced until section 6 is seen live.
How each step works is in `docs/RELEASE.md`.

## 1. Freeze the scope

- [ ] `since-<previous>.md` lists every change readers can see since the last
      note, each with its commit and whether it is live, gated, or waits for
      the store builds.
- [ ] Everything gated off (a switch, an env value, a job that is not running)
      is marked. It does not go in the note.
- [ ] What is not ready is named, with the release it moves to.

## 2. The note

- [ ] `patch-note-<version>.json`: plain lines first, then lines under the six
      categories. From Purify to readers, leading with what they get.
- [ ] `patch-long-<version>.json`: the intro and the sections.
- [ ] `node scripts/release.mjs note <version>`
- [ ] A reason written in `data/changelog/checklists/<version>.json` for every
      skipped category.
- [ ] The highlights at the top of What's New: `lib/whatsNew/highlights.ts`,
      real screenshots in `public/whats-new/<version>/`, strings in all 21
      languages.
- [ ] Sent to the owner's queue:
      `node scripts/patch-notes.mjs propose --file docs/plans/v<version>/patch-note-<version>.json --apply`
- [ ] The owner accepted it in `/admin?tab=patch-notes`. Until then the
      website shows the last release's note under this release's highlights,
      and Admin, Email has no release email to send. Then
      `node scripts/patch-notes.mjs pull --apply`.

## 3. The versions

- [ ] `node scripts/release.mjs bump <version>`
- [ ] `androidVersionCode` and `iosBuildNumber` in `lib/appUpdate/release.ts`
      left as they were.

## 4. The gates

All green on the commit that will be pushed.

- [ ] `node scripts/release.mjs check`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run lint`
- [ ] `npm run build:android`
- [ ] `npm run build:ios` (after the Android one, never beside it)
- [ ] `npm run build`
- [ ] A browser walk of what changed, at a phone's width and a computer's.

## 5. The words that go out

Drafted now, sent later. The owner sends every one.

- [ ] `announcements.md`: the Discord posts and the weekly board.
- [ ] The release email, in `lib/whatsNew/releaseEmail.ts`: its picture (a
      JPEG in `public/whats-new/<version>/`), one line, at most ten points
      that go straight to what is new, each with an emoji, and one closing
      line. Every point is something the note already says.
- [ ] Screenshots under the points that need one, listed in `pictures.json`
      and taken by `node scripts/release-pictures.mjs <version>`. Each one
      opened and looked at. A picture of Community shows Purify's own account
      or a reader who said yes, and nobody else.
- [ ] `node scripts/release.mjs email`, and `release-night.html` opened and
      read to the end.
- [ ] Social slides or loops, if the release has them (the purify-ads repo).

## 6. The push

- [ ] The owner said go.
- [ ] `git fetch origin`, rebase on `origin/main`, run section 4's check again.
- [ ] Push `main`. That is the deploy.
- [ ] The build id on purifyapp.net changed.
- [ ] `/whats-new` shows the note and the highlights; the footer shows
      <version>. The note shows only once the owner has accepted it.
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

- [ ] The Discord announcement posted.
- [ ] When a store approves: the "in the stores" post for that store.
- [ ] The release email sent from Admin, Email, in place of that week's
      Sunday email. Before a store has the build it describes things a reader
      in the app cannot open yet, so when to send is the owner's call.
- [ ] The release written into `docs/audit/continuation-ledger.md`.
- [ ] `node scripts/release.mjs new <next version>` for what comes next.

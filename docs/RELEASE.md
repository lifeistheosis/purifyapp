# How Purify ships a release

The same steps every time. One tool does the mechanical half, one checklist
holds the rest, and the unit tests refuse a release that skipped a step.
Written 2026-10-04, with 1.5.

## The short version

```
node scripts/release.mjs new 1.6      # start docs/plans/v1.6/ with the checklist and the blank note
# write the note in docs/plans/v1.6/
node scripts/release.mjs note 1.6     # the note goes into entries.json, patches.json and the checklist
node scripts/release.mjs bump 1.6     # the six version identifiers move together
node scripts/release-pictures.mjs 1.6 # the screenshots listed in docs/plans/v1.6/pictures.json
node scripts/release.mjs email        # the release email, written as pages to open and read
node scripts/release.mjs check        # says what is ready and what is not
```

Then the gates, the push, the stores and the announcements, in the order of
`docs/plans/v<version>/RELEASE.md`. Tick that file as you go; it is the record
of the release.

## What lives where

| Thing | Where |
|---|---|
| This release's checklist | `docs/plans/v<version>/RELEASE.md` |
| What changed since the last note | `docs/plans/v<version>/since-<previous>.md` |
| The note as the owner's queue takes it | `docs/plans/v<version>/patch-note-<version>.json` |
| The long form | `docs/plans/v<version>/patch-long-<version>.json` |
| What the app and the website read | `data/changelog/entries.json`, with the `patch_notes` table over it |
| The release record | `data/changelog/patches.json` |
| The six categories accounted for | `data/changelog/checklists/<version>.json` |
| The pictures at the top of What's New | `lib/whatsNew/highlights.ts`, `public/whats-new/<version>/` |
| The release email's pictures and points | `lib/whatsNew/releaseEmail.ts`; the pictures are JPEGs beside the highlights |
| The screenshots to take, and how | `docs/plans/v<version>/pictures.json` |
| The release email, to read before it is sent | `.release-logs/email/`, written by `email`, never committed |
| Announcements | `docs/plans/v<version>/announcements.md` |

## The rules the tool cannot hold

- **The note is true.** Every line names something a reader can use today.
  Anything gated on a switch, an env value, a job that is not running or a
  migration that has not run stays out (AGENTS.md, release ritual 4). Take
  each claim from the code, not from page copy: page copy goes stale first.
- **The website and the apps do not move together.** A push to `main` is the
  website. The iPhone, iPad and Android apps carry a release only once their
  store builds are approved. Say so in the announcement, and post the "in the
  stores" message only when a store shows the version.
- **The update prompt moves last.** `androidVersionCode` and `iosBuildNumber`
  rise only after that store serves the build. Early is the dangerous
  direction: it prompts every reader to fetch a build that does not exist.
- **Pictures are real.** The highlights and the email's screenshots are
  taken from the live site (`node scripts/release-pictures.mjs <version>`
  reads `pictures.json` and takes them again whenever they are needed), and
  each is opened and looked at before it ships. Nothing is drawn in.
- **A picture of Community shows people.** It may show Purify's own account,
  and a reader who said yes. Never anyone else's name, picture, prayer
  request or words. If the only thing to picture is a reader's, there is no
  picture.
- **Every string in 21 languages.** A new key goes into every catalog in the
  same commit.
- **The email is a letter, not the changelog.** The release's name, one
  picture, a handful of points with emojis that go straight to what is new,
  one button to /whats-new. The points are written with the release, in
  `lib/whatsNew/releaseEmail.ts`, and each says only what the note says.
  Name what Community gained and what Plus adds. A release that writes none
  sends the note's blurb in their place.
- **The owner sends.** Emails, Discord posts and store submissions are drafted
  here and sent by the owner.

## A patch (1.5.1)

A patch refines its release. It gets a note, a checklist and its six
categories accounted for, like any release, and the same gates. It does not
get pictures or an announcement of its own: the top of What's New keeps the
release's highlights and the release email stays the release's
(`featureRelease` in `lib/whatsNew/version.ts`). So for a patch, skip the
highlights line and the email lines of the checklist, and say so beside them.

## A page carries what it shows

Learned in 1.5.1, and worth a look before every release: a client
component's props are written into the page's HTML and again into the payload
the app reads between pages. Text handed over as a prop is in the app twice,
on every page that hands it over, whether a reader opens it or not. Bible
chapters were 462 MB of a 720 MB app that way. Text a reader has to ask for
(a commentary, the Greek, a long work) belongs in a static file the reader
fetches: `app/bible-data/`, `app/saints-data/`, `app/search-corpus.json`.
`scripts/native-build.mjs` prints the export's size at the end of every app
build and warns when it is over its budget. When the number jumps, look for
a new prop.

## Walking the app before it ships

The preview tool serves the main checkout, not a release branch, so a branch
cannot be walked that way. The apps can be: after `npm run build:android`,
`node scripts/export-walk.mjs` opens the export in a browser with every
request to `https://localhost` answered from `out/` and everything else
refused. That is how the apps run, and it is the app with no network. It
starts no server and exits 1 if a check fails. `node scripts/export-perf.mjs`
prints, for the main pages, how heavy each is to open and to scroll on a slow
phone. The website's side is walked on the live site right after the push,
since nothing gates a push anyway.

## What refuses a release

- `lib/appUpdate/__tests__/release.test.ts`: the six identifiers out of step.
- `lib/whatsNew/__tests__/updateHierarchy.test.ts`: a category neither shipped
  nor skipped with a reason.
- `lib/whatsNew/__tests__/notesAgree.test.ts`: the two note files naming
  different releases or days.
- `lib/whatsNew/__tests__/highlights.test.ts`: highlights still naming the
  last release, a missing string, a picture of the wrong size.
- `lib/email/__tests__/releaseEmail.test.ts`: a release email the send route
  would refuse, or whose picture is missing or is not a JPEG. 1.5's would
  have been refused for the word "streak", and nothing said so until then.
- `node scripts/release.mjs check`: the versions, the note, the checklist and
  the pictures in one read, plus the draft, the announcements, uncommitted
  files and commits on `origin/main` this branch does not have.

## When something is not ready

It waits for the next release. A release is cut on what is true today, and
the board (`docs/plans/v<version>/MASTER.md`) says what moved and where to.

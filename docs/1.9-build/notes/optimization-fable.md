# The optimization audit (Fable, 2026-11-10)

His word, 2026-11-10 about 04:52 UTC: "can fable run a full scale optimization
on Purify and it's contents and packages and routing system?"

This is phase 1: measured and reported, nothing changed. Branch head measured:
`287343b`. Phase 2 (the safe items) waits for his OK of this list.

## For Edgar, one screen

Purify is in good shape. Earlier passes already took the big cuts, the links
are clean, the builds fit, and seven of eight screens scroll at a full 60
frames. What is left:

**Three small things that are safe to do inside 1.9**

1. Drop three leftover router files from every page of the app. About 7 MB
   off the download (10%), and the app asks for far fewer files at start.
2. Stop loading the Greek study font at every start. It is only used in the
   interlinear. 108 KB and 9 files saved on every open.
3. Mend three dead links inside the apps (two to the support form, and the
   privacy page's robots and llms links).

**One thing that needs your word before the 1.9 store builds**

4. Security updates are due before the 1.9 store builds. Details are with
   the arbiter. It is a production change, so it is yours to say.

**The larger wins, for right after 1.9**

5. The Fathers' commentary sits in the app twice: once under the Bible, once
   in the Reading Room. About 6.8 MB of download.
6. A database engine still ships in the app for a feature that was switched
   off in October. About 2.2 MB of download, 5 MB on the phone.
7. The website builds every page fresh for every visitor and caches none of
   them. Making the reading pages cacheable is the biggest speed and cost win
   on the website.
8. The app loads about 2.4 MB of code at start, and close to a third of it is
   data it does not need yet (all the patch notes, the whole English text
   file, a year of calendar).
9. The Reading Room is the one screen that stutters when scrolled. To be
   confirmed on a real phone.

Nothing here is urgent for readers except item 4. All recs: do 1 to 3 now,
say yes to 4, and the rest lead 1.9.1.

## How it was measured

One of each, on a 4 core, 15 GB cloud machine, Node 22.23.4:

- `npm run build:android` once (the export is the same for iOS, so the iOS
  gate was not run again).
- `npm run build` once (the website).
- The AAB of test build 89 (run 42731576515, from `4ab8e9cc`), opened and
  weighed file by file.
- The export served the way the phones serve it (`scripts/lib/shell-server.mjs`),
  in headless Chromium at a phone's size with the processor slowed six times,
  one pass per screen. Headless Chromium draws without a GPU, so its timings
  rank the screens against each other; they are not a phone's numbers.
- purifyapp.net with `curl` (1.8 is live there).
- `npm audit`, `npm outdated`, and a count of every import.

Sizes follow the repo's own tool (`scripts/export-size.mjs`): 1 MB is
1,048,576 bytes, and "packed" is each file deflated on its own at level 6,
about what an Android phone downloads.

## What was measured

### The apps

| | Measured |
|---|---|
| The export | 225.2 MB on disk, 12,293 files, **70.9 MB packed** (ceiling 85) |
| Test build 89's AAB | 94.5 MB as a file; 92.1 MB of zip entries |
| of it, the export | about 71 MB |
| of it, the code (dex) | 5.5 MB |
| of it, SQLCipher for four processor types | 8.6 MB (2.2 MB for a phone's own type) |
| of it, the R8 map (not sent to phones) | 4.3 MB |
| Test build 89's APK (all processor types) | 99.9 MB |

Where the export's 70.9 MB packed sits:

| Folder | Packed | On disk | Files |
|---|---|---|---|
| `bible-data` (commentary 10.3, interlinear 6.9, cross-references 2.0, lexicon 0.2) | 19.3 MB | 65.6 MB | 2,757 |
| `bible` (the 1,364 chapter pages) | 12.4 MB | 54.7 MB | 5,456 |
| `saints-data` (the Fathers' works) | 10.1 MB | 29.6 MB | 163 |
| `saints` (417 pages 4.4, icons 4.9) | 9.3 MB | 26.8 MB | 1,827 |
| `_next` (code 5.2, fonts 2.1) | 7.4 MB | 20.5 MB | 340 |
| everything else | 12.4 MB | 28.0 MB | 1,750 |

By kind: JSON 29.8 MB packed, router payloads (`.txt`) 21.2, pictures 10.3,
code 5.2, sound 2.4, fonts 2.1.

The router payloads, which every page has four of:

| File | Packed | On disk | Files | Needed |
|---|---|---|---|---|
| `index.txt` | 14.2 MB | 71.7 MB | 2,176 | yes, it is the page |
| `__next._index.txt` | 4.3 MB | 15.5 MB | 2,176 | no (item 1). All 2,176 are byte for byte the same file |
| `__next._tree.txt` | 1.4 MB | 4.9 MB | 2,176 | no (item 1) |
| `__next._head.txt` | 1.4 MB | 3.1 MB | 2,176 | no (item 1) |

A Bible chapter's `index.txt` is 32 KB now (it was 76 KB at 1.5.2), and about
25 KB of that is the frame every page repeats.

### Speed in the apps (six times slowed, one pass)

Cold start at Today: 124 requests, 37 scripts of 2,446 KB (734 KB packed),
15 font files of 243 KB, 9 pictures of 1,550 KB, 1,880 ms of long work in
9 tasks, the longest 538 ms. Of the 49 router files asked for at start, 20
are not in the bundle (they were pruned in July) and answer 404.

| Screen | Open | Long work | Extra code read | Nodes | Scroll, median frame | Frames over 34 ms |
|---|---|---|---|---|---|---|
| Today (cold) | 1,219 ms | 1,880 ms | 2,446 KB | 429 | 17 ms | 0 |
| Bible index | 474 ms | 217 ms | 188 KB | 1,039 | | |
| John 1 | 1,458 ms | 729 ms | 498 KB | 4,298 | 17 ms | 0 |
| Saints index | 931 ms | 333 ms | 658 KB | 3,262 | 17 ms | 0 |
| St John Chrysostom | 591 ms | 134 ms | 218 KB | 956 | 17 ms | 0 |
| Prayers | 629 ms | 297 ms | 229 KB | 839 | 17 ms | 0 |
| **Reading Room** | **2,138 ms** | **1,286 ms**, one task of 998 ms | 232 KB | 2,236 | **50 ms** | **20 of 37** |
| Settings | 591 ms | 242 ms | 258 KB | 616 | 17 ms | 0 |
| Discover | 341 ms | 137 ms | 179 KB | 439 | 17 ms | 0 |

### The website (1.8, live)

| Page | HTML sent | HTML unpacked | Scripts | Cache |
|---|---|---|---|---|
| `/` | 20 KB | 178 KB | 27, 2,331 KB (692 KB gzip) | none |
| `/bible/john/1` | 331 KB | 1,553 KB | 29, 2,297 KB | none |
| `/saints/john-chrysostom/homilies-on-matthew` | 843 KB | 2,670 KB | 29, 2,233 KB | none |
| `/reading` | 41 KB | 474 KB | 27, 2,121 KB | none |
| `/settings` | 13 KB | 83 KB | 28, 2,133 KB | none |

Every page answers `cache-control: private, no-cache, no-store` and
Cloudflare marks it BYPASS. First byte arrives in 0.11 to 0.19 s and a whole
page in 0.3 to 1.7 s (five samples each). The build says the same: 369 routes
are rendered on demand, 14 are static, 8 are prebuilt.

Data files are cached well (`/bible-data/*` and `/search-corpus.json`: an hour
to a day, with stale-while-revalidate). Code is cached for a year. Pictures
under `public/` are not: Cloudflare goes back to Render on every request
(`cf-cache-status: REVALIDATED`, 0.23 s for a 40 KB icon) and a browser keeps
them four hours.

### The builds

| | Time | Peak memory (all Node processes) | Notes |
|---|---|---|---|
| `build:android` | 95 s | 3.7 GB | compile 23 s, 5,205 pages in 42 s, 3 workers |
| `build` (website) | 120 s | 4.9 GB | compile 31 s, TypeScript 57 s (the peak), 2 workers |
| Android CI job, build 89 | 10 min | not read | export 96 s, three gradle runs 6 min 29 s |

The website build peaks about 3 GB under Render's 8 GB here, with
`experimental.cpus: 2` and the 4 GB heap both doing their work. This machine
is not Render's, so the number is a guide, not a promise. Leave both settings
as they are.

Turbopack warns twice that a path built from variables
(`lib/bible/load.ts:40`, `lib/plans/minutes.ts:23`) matches 21,449 files under
`data/bible`. It costs build time, not correctness. `.next/server` is 338 MB.

### Packages

- `npm audit` was run; what it found is with the arbiter (item 4).
- Declared and imported nowhere: `@dnd-kit/core`, `react-simple-maps` (a test
  even asserts it is not used), and the four `d3-*` overrides that exist only
  for it. Neither is in any bundle; they cost install time.
- `@capacitor-community/sqlite`: imported once, by the on-device store that
  has been off since 2026-10-12 (`lib/content/enabled.ts`). Its native engine
  still ships (item 6).
- `@revenuecat/purchases-js` (web billing): a 718 KB script (186 KB packed)
  that rides in the apps, where billing goes through the native plugin.

### Routing

- 2,176 pages in the export. Every internal link in them was checked (14,039):
  three targets are dead in the apps (item 3). No other dead routes.
- Website redirects answer correctly (`/prayer` 308; `/kitchen` 404 as he
  chose).
- 561 `<Link>`s, 34 with `prefetch={false}`. In the apps the rest make the
  router ask for prefetch files that were pruned, which is the source of the
  404s above.
- Page switches: the View Transitions live in `app/globals.css`; nothing
  measured against them.
- The stash list in `scripts/native-build.mjs` is sound. Nothing stashed is
  linked from the apps except `/support/contact`.

## The ranked list

### Safe inside 1.9

**1. Prune `__next._index.txt`, `__next._tree.txt` and `__next._head.txt` from the export**

- Measured: 7.0 MB packed (9.9% of the export), 23.4 MB on disk, 6,528 files.
  `__next._index.txt` is the same file 2,176 times.
- Tested: the export served with all three refused. All 12 screens walked
  arrived, with no page errors. Cold start fell from 124 requests to 70, and
  the Bible index from 86 requests to 28, because a refused tree file stops
  the router asking for the segment files behind it (which are already gone).
- Why it is safe: it is the third cut of the same family as
  `pruneFullPayloadDuplicates` and `pruneSegmentCache`, tested the same way.
  The page itself (`index.txt`) is untouched.
- Gain: about 7 MB off every download, a quieter start.
- Risk: low to medium. It rests on how this Next's router falls back, so it
  needs `scripts/export-walk.mjs` green and the walk on a phone, both of which
  the next test build gets anyway.
- Work: about an hour (one function beside the other prunes, the size
  ceiling brought down, the record in `docs/build/app-size.md`).
- When: 1.9, riding the second test build. If the walk shows anything, it
  comes out and waits.

**2. Stop preloading Cardo**

- Measured: 9 Cardo files, 108 KB, are preloaded at every cold start in the
  apps and on every website page. `app/layout.tsx` says Cardo is "used only
  for the interlinear column". The other 6 preloaded files (DM Sans, DM Serif Display, Lora) are the
  house faces and stay.
- Gain: 108 KB and 9 requests off every start.
- Risk: low. The first time the interlinear opens, Greek shows in the
  fallback face for a moment before Cardo arrives (`display: swap`).
- Work: one option (`preload: false`), 15 minutes with the gates.
- When: 1.9.

**3. Three dead links in the apps**

- Measured: `/support/contact` is linked twice from `app/(app)/shop/policies/page.tsx`
  (lines 54 and 78) and is stashed out of the apps; `/robots.txt` and
  `/llms.txt` are linked from `app/(app)/privacy/page.tsx` (lines 275, 600,
  655) and are stashed too. `components/shop/StoreClient.tsx` already shows
  the right pattern for the first.
- Gain: three taps that go somewhere.
- Risk: low. Link targets only, no wording.
- Work: 30 minutes.
- When: 1.9.

### Needs his word before the 1.9 store builds

**4. Security updates**

Security updates are due before the 1.9 store builds; details are with the
arbiter. His call.

### Right after the release

**5. The commentary is in the app twice**

- Measured: 4,631 of the 11,994 commentary notes under `bible-data/commentary`
  are found word for word inside a work under `saints-data` that the app also
  carries (each already holds a pointer: work, section, paragraph). 19.8 MB on
  disk, about 6.8 MB packed.
- Gain: up to 6.8 MB off the download (about 10%).
- Risk: medium. A note would be read out of the work's file, and the largest
  works are single files of 1 to 4 MB, so the works need splitting by section
  first or a chapter's notes get slow. It touches the reader and the Reading
  Room, and the website keeps the commentary in the page on purpose.
- Work: two to three days.

**6. SQLCipher ships for a store that is switched off**

- Measured: `libsqlcipher.so` is 5.0 MB installed and 2.2 MB packed on an
  arm64 phone, 8.6 MB of the AAB across four processor types, plus its
  classes in the dex and a pod on iOS. The only caller is
  `lib/content/storage/capacitorStore.ts`, and the layer has been off since
  2026-10-12. A phone that installed 1.5 still holds the 32.7 MB store it
  filled then; nothing deletes it.
- Gain: about 2.2 MB of download and 5 MB installed on every phone, and
  32.7 MB handed back to every reader who installed 1.5.
- Risk: medium. A native dependency change (the R8 walk). His word of
  2026-10-12 was "keep what we built", so this is his to decide: the code can
  stay in the repo with the plugin out of the build.
- Work: two releases. First, one that deletes the old store through the
  plugin while it is still there. Then the one that takes the plugin out.
  About half a day each.

**7. The website renders every page on every request**

- Measured: 369 of 391 routes are dynamic; every HTML answer is `no-store`;
  the homilies on Matthew are 2.6 MB of HTML built again for each visitor and
  each crawler. The cause is in `app/layout.tsx`: it reads the request's
  headers for the CSP nonce (and the locale cookie), which makes the whole
  tree dynamic.
- Gain: reading pages served from Cloudflare's edge instead of Render: faster
  first paint everywhere, far less server work, and room on the Render plan.
- Risk: high. It changes the CSP design (hashes for the four small inline
  scripts in place of a nonce) and how the language is chosen for a static
  page. Security and 21 languages both sit on it.
- Work: about a week, with a Fable review. Worth a design note first.

**8. Start-up code carries data it does not need yet**

- Measured: 37 scripts, 2,446 KB (734 KB packed) at cold start; the website
  sends 2.1 to 2.3 MB on every page. Inside them: the English text file
  (`lib/i18n/messages/en.json`, 352 KB), the patch notes with their history
  (`data/changelog/entries.json` is 350 KB; a 218 KB start-up script holds
  notes), and a 200 KB script of calendar commemorations.
- Gain: an estimated 300 to 500 KB less code parsed at every start, which is
  most of what can be taken from the 1.3 to 1.9 s of long work measured.
- Risk: medium. The English file is the fallback for every language; the
  calendar is what Today shows first.
- Work: two to three days, one piece at a time, each measured.

**9. The Reading Room's scroll**

- Measured: 37 frames in two seconds, median 50 ms, 20 frames over 34 ms,
  where every other screen drew 119 or 120 frames at 17 ms. It also opens
  with one 998 ms task. The hero in `components/reading/FeaturedWork.tsx`
  moves and fades three layers on scroll.
- Caveat: headless Chromium has no GPU, and moving a large layer is exactly
  what a GPU makes cheap. Confirm on his phone before any work.
- Gain: the one stutter found.
- Risk: low. Work: half a day once confirmed.

**10. The router asks for files the apps do not have**

- Measured: 20 of the 49 router files asked for at cold start answer 404;
  a move to the Bible index asks for 59. Item 1 removes most of the asking.
  What is left goes when links stop prefetching inside the apps (527 of the
  561 `<Link>`s prefetch).
- Gain: fewer wasted reads at start and on every screen with many links.
- Risk: low. Work: half a day (one shared link, or the flag on the busiest
  lists).

**11. Long pages draw everything at once**

- Measured: John 1 has 4,298 nodes and 729 ms of long work to open; the
  Saints index 3,262 nodes and a 467 KB script that holds the whole registry.
- Gain: faster opens on the two most used lists. Scroll is already smooth.
- Risk: medium (the reader). Work: two days.

**12. Website pictures are not cached at the edge**

- Measured: `public/` pictures answer `max-age=14400` to browsers and
  `REVALIDATED` at Cloudflare, so each one costs a trip to Render.
- Gain: pictures from the edge; less work for Render.
- Risk: low for names that carry a version (`.v2.jpg`); a picture replaced
  under the same name would linger, so those keep a short life.
- Work: an hour in `next.config.ts`, beside the rules already there.

**13. Small ones**

- The web billing script in the apps: 186 KB packed, never run there. Billing
  code, so read `docs/audit/findings.yaml` first. Half a day.
- Unused packages: remove `@dnd-kit/core`, `react-simple-maps` and the four
  `d3-*` overrides. No bundle change. 15 minutes; after the release only
  because it rewrites the lockfile.
- Pictures: 208 files, 10.4 MB. Recompressing everything would save at most
  1.9 MB (18%) and risks the icons' quality. Not worth it. The Discover tiles
  are 1,352 px wide for a tile on a phone and are loaded on Today: resizing
  those twelve saves about 0.25 MB and some memory.
- The service worker (`public/sw.js`) caches every other same-origin GET with
  no limit and refetches each in the background, a downloaded Bible's book
  files among them. A size limit and cache-first for files whose names carry
  a hash. Half a day.
- Brotli on the website's code would save about 7% over the gzip it sends.
  A Cloudflare setting, not code.

## Bugs and lag (added the same day)

His word, a minute after the first: "(certain bugs, lag, etc also)". Measured
the same way, once each. **No bug was found that harms readers now, on the
live site or on the branch.**

### What was run

- The unit tests: 3,310 files, 10,087 tests, 10,079 passed, 0 failed,
  8 skipped (each needs a file that is not in the repository: the content
  package, the 1.9 email pictures, his export). The test known to fail on
  main, `lib/sync/__tests__/pull.test.ts` "a bookmark removed here does not
  come back on the pull", passes on this branch.
- The export, 59 screens in one app session with no network (every top-level
  screen and 21 deeper ones): no page error, no unhandled rejection, no
  missing file other than the router's prefetch files (item 1 and 10).
- purifyapp.net, 22 pages in a phone-sized browser: every page 200, no
  console error, no failed request, layout shift 0 on 21 pages (0.046 on
  Community), largest paint between 0.8 and 2.0 s.
- Memory, the same five screens ten times round (50 page switches): the heap
  went from 20.3 MB to 21.8 MB, and the page's nodes (737) and listeners
  (842) did not move at all. No leak worth chasing.
- Taps on the tab bar and on links, six times slowed: the app starts work
  8 to 61 ms after the finger, and a tap is answered in 48 to 152 ms. The
  address changes 180 to 480 ms after a tap.
- Frames during a page switch, six times slowed: 2 to 7 frames over 34 ms
  per switch. The worst single frame is 467 ms, on the Bible tab, while
  John 1's 4,298 nodes are drawn (item 11). Reduced motion was not walked.

### What it found, ranked

| | Finding | Measured | Harm now | When |
|---|---|---|---|---|
| B1 | Three dead links in the apps | item 3 | a tap that goes nowhere; the 1.8 apps have them too | 1.9 |
| B2 | The Bible tab's switch has one long frame | 467 ms at six times slowed, against 67 to 167 ms on the other tabs | a visible hitch on a slow phone | after (item 11) |
| B3 | The Reading Room stutters and opens slowly | item 9 | the one laggy screen | after, phone first |
| B4 | Signed-out readers ask for their notifications | `/api/community/notifications` asked on 8 of 59 screens with nobody signed in; the website answers 401 | none to the reader; wasted calls on every phone | after, 30 minutes (`lib/community/inbox.ts`: ask only with a session) |
| B5 | Two pages make third-party loads | details with the arbiter | none seen | his call |
| B6 | `/plan` and `/set-password` do not open when signed out | the router moved on from both in the walk | likely by design; not walked signed in | check on the phone walk |

Not covered: anything behind a sign-in (no test account here), Render's
server logs (no access from this chat), sheets and the players by hand, and
a slow connection as opposed to none.

## Phase 2, done (2026-11-10)

His word, about 08:25 UTC: "all recs". Items 1 to 3, each its own commit.
The before numbers here are from the same branch head, built without the
change, so they differ a little from the first measure above.

| Item | Commit | Before | After |
|---|---|---|---|
| 1. Three router files leave every page | `caf6a665` | 224.6 MB on disk, 12,363 files, 71.4 MB packed; a cold start asks for 124 files | 202.9 MB, 5,811 files, **64.6 MB packed**; 72 files |
| 2. Cardo is not preloaded | `8c6bb511` | 15 font files, 243 KB at every start | 6 files, 135 KB |
| 3. Dead links go to the website | `c9e0d1a3` | 8 bare paths to pages the apps do not hold (English and German privacy, the shop's policies) | 0, and a test holds `app/` to it |

The gates, on the three together: typecheck 0 errors; unit tests 10,537
passed, 8 skipped, 0 failed; lint 0 errors (8 warnings, none in these files);
`build:android` then `build:ios`, both green at 64.6 MB packed.

The export walk (`scripts/export-walk.mjs`, every section, 21 minutes): 1,514
checks passed and 12 did not, in sections 39, 40 and 41 (the Mark all button
under Prayers, the plans' tiles, the councils' covers in the Reading Room).
The same 12 fail on an export built without these changes, so they belong to
other work on the branch and are for the Updates chat. Section 21 has one new
check: no page carries the three files.

Left as it was: the two size ceilings (240 MB and 85 MB) are his numbers
(`lib/build/exportSize.ts`); with the export at 64.6 MB there is room to
bring the packed one down when he wishes. One more dead link of the same
kind is in `components/shop/StoreClient.tsx`, only for a store with no
support email; it is a client component and needs a different fix, after
the release.

For the phone walk: **open the app cold, then tap through Today, Bible, a
chapter, Discover, Prayers, You, a saint and a work in the Reading Room;
every screen should open as before, with no blank page and no jump back to
Today.**

## Left alone, on purpose

- The 21 language files (about 2.5 MB packed) and the script fonts
  (2.1 MB): the apps carry them to work offline.
- `experimental.cpus: 2`, the 4 GB heap, one gradle artifact per run: each
  is there for a failure that happened.
- The cookie-less catalog client, the stash list's order, the three prunes
  already in `scripts/native-build.mjs`.
- The interlinear and cross-reference files (8.9 MB packed): they are the
  content, already compact JSON, already fetched on demand.

## Not measured

- A real phone. Every timing here is headless Chromium.
- What the stores show as the download size.
- Render's own build memory and time.
- The iOS export and IPA (the export is identical; the IPA was not opened).

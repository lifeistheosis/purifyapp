# 1.9: the game plan

**Expand and refine.** Expand the content, Plus, the languages, the chants,
the history; refine the systems, Plus and the backend; the app itself last
(megabytes, animations). His words and every decision are in `BRAINSTORM.md`;
who asked for each item is in `ideas.json`. Rewritten 2026-11-06 at his "show
the full game plan ... everything else that is already implemented or needed
to do for version 1.9".

Status: **done** (built and checked), **now** (next up), **ready** (decided,
waiting its turn), **needs you** (a picture or an answer first),
**blocked**, **parked**. Work is on the branch `ccr-07896cf2-bo0afd`; nothing
in 1.9 is live until the release push.

## Done

Live on main since 1.8 (admin only):

- Traffic: visitors by day, 7 to 120 days, the median day, any single day picked (2026-11-02).
- Admin, 2026-11-04: no Home flash; a timeline that never resets and the bell on the same log; goals as pace bars; Home A or B; one chart with three lines; today beside last night; a zoomable map; Traffic > Live; a phone pass.

On the 1.9 branch:

| # | Item | Status |
|---|---|---|
| 1 | Readers never see a review mark; our words are "Summarized by the editorials" (21 languages; editorial standards 27) | done |
| 2 | Saved: "Bookmark a verse to keep it here" (bug 1) | done |
| 3 | "Remember the verse" named alike everywhere (bug 6) | done |
| 4 | Discord status listed only in the Windows app (Identity 3) | done |
| 5 | Try it's names on two lines, not cut (bug 3) | done |
| 6 | Cathedral bells with its own icon (bug 4) | done |
| 7 | A sync test that broke by itself on 4 November (a fixed date) | done |

## Phase 1: fixes and rules (no design needed)

| # | Item | Status |
|---|---|---|
| 7b | The history map: each event where its own account says, Alaska and America on the map (his report of 2026-11-06) | done |
| 8 | The Sync preview shows an example, not "0" (bug 2), and loses its drawn devices (flag 3) | done |
| 9 | The Supporter mark explains itself on a tap (Identity 2, 21 languages) | done |
| 10 | Admin: a Review list of the 66 texts marked for clergy review, ours only | done |
| 11 | F-37: the Stripe webhook never marks an unpaid checkout paid (money) | done (his OK of 2026-11-06); left to him: enable checkout.session.async_payment_succeeded in Stripe |
| 12 | Count which lock a reader taps and which leads to a purchase | ready |
| 13 | The red commentary dots in the reader (flag 5) | needs you: keep or quiet them |

## Phase 2: the designs he picked

| # | Item | Status |
|---|---|---|
| 14 | The verse system: tap a verse for one bar (colours, copy, share, image, note, Greek, compare, cross-references), tap a word for its Greek, double tap to highlight; the bookmark star goes (flag 4) | done: his pick B, the strip under the verse; Compare is its own item (21b) |
| 15 | Candlelight: the lines being read lit, a soft glow, dark edges; on at Vespers; palettes of the season; the earned palettes shown as goals (flag 1) | his A+B done (the lit line, the glow, the dark edges); next: on at Vespers, the season's palettes, the earned palettes as goals |
| 16 | Listening: the card at rest, the small pill while scrolling (bug 5) | done: the reader's dock, one card at rest, the pill and the chapter at the top while reading on |
| 17 | Plans page: Continue, the season's plan, picture tiles | done: Continue, the season's card (the Nativity Fast, from two weeks before it to the feast), the picture tiles |
| 18 | The Florilegium revamped: collections and sync on top, ready collections below (flag 2) | done: the sync line (only after a confirmed exchange, no device count), the gatherings as cards, four whole passages of Scripture to begin with |
| 19 | History: major events as large cards, the rest as rows with pictures, no switch, pictures free for everyone | done: the list (24 era-defining events large, 15 as rows with a picture), and on the event and council pages the moving picture and the more pictures for every reader; there never was a switch in the code |
| 20 | Plus history: each event as a Thread, year by year, as a saint's Timeline | built on the 17 events that have steps, with the map that follows (67 of 183 steps name their place); the Plus row and its Try it are the Thread; the pan and the more pictures are every reader's; next: the quotes' sources, and steps for the other 23 events |

## Phase 3: expand

| # | Item | Status |
|---|---|---|
| 21b | Compare, in the verse strip's Study: the verse in each Bible the app may show, and its Greek (Plus; licensed translations only where their terms allow) | ready |
| 21 | Public-domain Bibles: Romanian, Russian, Greek, Serbian, Arabic and Spanish first, then every app language; each licence proven; picking one offers the app in that language, with Never ask again | now: the translations and their licences |
| 22 | One verse-number map, for the new Bibles and the Old Testament cross-references | ready |
| 23 | Cross-references into the Old Testament, in the Septuagint (Genesis 1:1 back on John 1:1) | ready, after 22 |
| 24 | Tap an English word to study its Greek | done |
| 25 | Plans for the seasons (Nativity Fast, Great Lent, Holy Week, Dormition), more plans, a passage of the Fathers each day | the Nativity Fast's plan built (his pick: the Church's own Nativity readings, 25 days); it reaches readers only with 1.9, after 15 November; the other seasons and more plans ready |
| 26 | Remember the verse in three steps, spaced, and on the widget | ready |
| 27 | Journal: prompts from the feast (by the editorials), search, a PDF | ready |
| 28 | Florilegium: gather from everywhere, share as a page or booklet, a line on Today | ready |
| 29 | Sync shown working, and everything kept synced | ready |
| 30 | History: more events (40 today), the saints at each, a map, this day in Church history, listen to an era, the Creed by council | ready |
| 31 | Ambience: two sounds at once, Orthodox sounds (licences checked), the last sound remembered and faded | ready |
| 32 | Listening: the week's readings kept offline by themselves, a storage view, sizes before saving, the verse following the voice, resume per book, speed | ready |
| 33 | More languages for the app | needs you: which |
| 34 | Chants: more of them, and refined | needs you: the recordings, and what to refine |
| 35 | Read aloud: the Old Testament, and a choice of voices (carried from 1.8) | parked until its audio exists |

## Phase 4: refine the systems and the backend

| # | Item | Status |
|---|---|---|
| 36 | F-09: tests on the API routes and money paths | ready |
| 37 | F-21: native push | ready |
| 38 | F-49: the reading room's attributions | ready |
| 39 | F-22: sources for the 107 saint icons that have none | ready |
| 40 | Plus on iOS (the App Store products) | needs you |
| 41 | Who reviews the 66 marked texts | needs you |

## Phase 5: carried from 1.8

| # | Item | Status |
|---|---|---|
| 42 | Find a parish: live as links to the jurisdictions' own directories (`/parishes`); a directory inside Purify | blocked: no list we may reuse |
| 43 | Purify Parish, the parish plan | needs you: price and terms, after 42 |
| 44 | The screens locked on 2026-10-27 (Bible reader, praying, Premium pill, chant page, shop, theology, saint page, Discover, paywall, Prayers home, player) | needs you: which are still open (the list is in Homebase) |
| 45 | Today | needs you: your mockup |

## Phase 6: the app itself, last

| # | Item | Status |
|---|---|---|
| 46 | Megabytes: the app is 239.2 of its 240 MB ceiling (Bible pages 73, Bible data 79, saints 64); new Bibles must stream or the ceiling rise (his call). On the website alone: each history picture kept as AVIF and JPEG (20 MB, not in the apps), three unused files | ready; the ceiling is needed before item 21 |
| 47 | Animations | ready, last |

## Phase 7: ship 1.9 (`docs/RELEASE.md`)

| # | Item | Status |
|---|---|---|
| 48 | The note in 21 languages, the six version numbers, the update hierarchy, the drop | at the end |
| 49 | The gates: typecheck, unit, lint, the Android and iOS exports, the export walk, the web build, the release APK on a phone | at the end |
| 50 | The push, the store builds, the reviews, the update prompt | needs you |
| 51 | 1.8 is live in both stores (his word, 2026-11-06); set the build numbers in `lib/appUpdate/release.ts` so installed apps are told | needs you: the build numbers each store serves |

## Parked

- Identity beyond the fixes: earned and seasonal frames, a patron's icon as the picture (his call: keep Identity small).
- The Fathers' own cross-references (he was unsure).
- Word study's other ideas (Translated as, the open book first, the count before the lock, a fuller dictionary, the Fathers on the word).

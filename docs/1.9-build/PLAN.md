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

## Waiting on you (gathered 2026-11-07)

Every 1.9 answer that only he can give, in one place, each with Claude's
recommendation. The detail of each is in `ideas.json` under its id.

**Quick yes or no**

1. The privacy page's new paragraph for the lock counts (`c-lock-counts`, row 12). Drafted in `/privacy`; the 1.9 letter must list it. Recommend: yes as written.
2. **Drawn for him 2026-11-09 (the photo page, 9): Now beside Lifted.** Today's prayer list fails the contrast check: the hours not current are dimmed, their small captions at 3.6:1 against 4.5:1 (`c-smoke-suite`). Recommend: keep the dimming and lift those captions to paper/70, which passes.
3. Chants offline (`s3-02`). Recommend: kept only while the live list names them, the app taking a saved chant off the phone when the list drops it, so his right to take a recording down holds.
4. The Florilegium's gate for a reader whose Plus lapsed (`c-flor-gate-flash`, the other half): show their own gatherings behind the card, or not.
5. **Decided 2026-11-09 (BRAINSTORM.md): yes. Built the same day (84a7bb9, c-psalter-113).** Psalms 113 to 115 divided as the Hebrew divides them (`c-psalter-113`). Recommend: divide them as Brenton does, accepting that a few readers' notes on those three psalms move.

**A source or a licence**

6. **Decided 2026-11-09 (BRAINSTORM.md): yes, the Copenhagen maps, credited, the map file shared alike.** Compare (`e-compare`, row 21b): the verse-number maps for the downloaded Bibles. Recommend: the Copenhagen Alliance's mappings (CC BY-SA 4.0; credited, the map file shared alike, nothing else in the app affected). The legal call is his.
7. **Decided 2026-11-09 (BRAINSTORM.md): yes. Built the same day (7ba767e, c-ios-offline-backup).** iPhone offline listening is kept in the folder iCloud backs up (`c-ios-offline-backup`). Recommend: move it to the folder that is not backed up, as the Bibles are, moving what readers already saved.

**A pick, as he picked the Nativity's**

8. **Decided 2026-11-09 (BRAINSTORM.md): yes. Built the same day (645b0f6, s4-01).** The next season's plan (`s4-01`). Recommend: Holy Week, Lazarus Saturday to Pascha, each day's Gospel, from data already checked against the OCA's readings.
9. **Decided 2026-11-09 (BRAINSTORM.md): yes.** Earned palettes (`s2-04`): no collection exists to earn them. Recommend: earn Councils by reading every council's page and Cappadocian by the three Cappadocians' works.
10. **Decided 2026-11-09 (BRAINSTORM.md): size before saving yes; gather from everywhere yes, its SQL to him first (sent 2026-11-09: `docs/1.9-build/sql/florilegium-kinds.sql`, the kinds widened to council and prayer); the public page later; more plans yes, with no new framing; the red dots drawn for him (the photo page, 11).** Size before saving (`s3-04`), Gather from everywhere (`s5-04`, with a migration), a gathering as a public page (`s5-05`, a migration), more plans' framing (`s4-02`), the red commentary dots (row 13).

**The journal, as built from his word of 2026-11-08** (`docs/1.9-build/JOURNAL.md`)

11. **Decided 2026-11-09 (BRAINSTORM.md): yes.** The paywall's journal row, now that writing is free: "The full journal is part of Purify Plus. Covers from the icons, notebooks and tags, headings, checklists and callouts, a font of your own, search, and the pages from this day in past months brought back to you." What stays free: "Writing in your journal, and your notes on verses, stay free, whether or not you subscribe." In all 21 languages, drafted by Claude; the pricing pages say the same in English and German. Recommend: yes.
12. **Decided 2026-11-09 (BRAINSTORM.md): yes.** Step 2 is built (covers, Plus's blocks, notebooks, tags, styles), so the free journal and Plus's can ship together in 1.9 as planned. Covers use only the 14 icons whose rights are verified, credited "Public domain · Wikimedia Commons"; the 44 icons used with an iconographer's permission are not offered, since that permission was given for the app's own pages. Recommend: keep it so, and ask the iconographers before offering theirs.
13. **Decided 2026-11-09 (BRAINSTORM.md): yes.** Printing and the export stay free (a change from the finalized spec, Claude's call): a reader's own words are theirs to keep, and the right to take one's data (GDPR) points the same way. Recommend: keep it so. (No store text names the journal: checked the 1.8 drop, so nothing there changes.)

14. **Decided 2026-11-09 (BRAINSTORM.md): yes, into the migrations for the merge (he had not run it). Moved the same day: `supabase/migrations/20261109180246_shared_pages.sql` (318722e); the docs copy stays to paste.** Sharing a page needs one table: `docs/1.9-build/sql/shared-pages.sql` (shared_pages and their reports, RLS on, no write policy, written to run twice). It is in docs, not migrations, so no merge runs it. Recommend: read it, then run it by hand or let Claude move it into `supabase/migrations/` for the merge. Until then the Share button stays hidden.

15. Sync for what a reader keeps that no table holds yet (row 29): `docs/1.9-build/sql/user-kept.sql`, one table, `user_kept`, one row per reader per slice (plans, remember, places, reading), RLS so each reader reads and writes only their own, written to run twice. The code is built and waits for it. With it the privacy page's line "Prayer streaks, reader preferences, and calendar style stay on this device only" has to change, since plan progress, Remember the verse, the reading places, the palette and reader preferences will travel for Plus readers. Recommend: yes to the table, and Claude drafts the privacy lines for his word before the release.

**Already on the list below:** more languages (33), chants' recordings (34), Plus on iOS (40), who reviews the 66 texts (41), the parish plan (43), the locked screens (44), Today's mockup (45), the release itself (50, 51).

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
| 7b | No light rays anywhere (his word, 2026-11-08: "vibe coded ai slop"): the Dome light banner is a soft light from above that breathes, and the gift box opens in its flood of light and embers. Guarded by `lib/ui/__tests__/noRays.test.ts`, `checkMock` and the promo test. For the 1.9 note: both look softer | done |

## Phase 1: fixes and rules (no design needed)

| # | Item | Status |
|---|---|---|
| 7b | The history map: each event where its own account says, Alaska and America on the map (his report of 2026-11-06) | done |
| 8 | The Sync preview shows an example, not "0" (bug 2), and loses its drawn devices (flag 3) | done |
| 9 | The Supporter mark explains itself on a tap (Identity 2, 21 languages) | done |
| 10 | Admin: a Review list of the 66 texts marked for clergy review, ours only | done |
| 11 | F-37: the Stripe webhook never marks an unpaid checkout paid (money) | done (his OK of 2026-11-06); left to him: enable checkout.session.async_payment_succeeded in Stripe |
| 12 | Count which lock a reader taps and which leads to a purchase | built 2026-11-07: the upgrade sheet counts the feature it opens on and a purchase that goes through in it (the plan, a year or a month), with the kind of device and the day, no reader (lib/analytics/lockCounting.ts); no migration (analytics_events takes the names). Read in the admin at Subscriptions, Locks. Needs his word before the release: the privacy page's new paragraph (drafted), and the 1.9 letter must list it, as that page promises |
| 13 | The red commentary dots in the reader (flag 5) | needs you: keep or quiet them; drawn for him 2026-11-09 (the photo page, 11: Now beside Quiet; recommended: keep red) |
| 13b | Community's page for a new post: the first words fold its head again (found by the export walk, 2026-11-07: the smooth scroll that folds it was ended by the caret of the letter typed, in Chrome 153, the Android WebView's engine; it now goes a frame at a time, lib/ui/glideScroll.ts) | done |

## Phase 2: the designs he picked

| # | Item | Status |
|---|---|---|
| 14 | The verse system: tap a verse for one bar (colours, copy, share, image, note, Greek, compare, cross-references), tap a word for its Greek, double tap to highlight; the bookmark star goes (flag 4) | his pick B built (the strip under the verse); then, on build 88, his pick C (2026-11-08): the focus, with its motion, built 2026-11-08 (291de2aa) with Study as cards and the note mark; build 88's notes 1, 2, 4 and 5 fixed the same day (`notes/build-88.md`); Compare is its own item (21b) |
| 15 | Candlelight: the lines being read lit, a soft glow, dark edges; on at Vespers; palettes of the season; the earned palettes shown as goals (flag 1) | his A+B done (the lit line, the glow, the dark edges); Night reading in one tap built 2026-11-07 (Candlelight, Focus, a size larger and the reader's sound, all given back by the same row); the earned palettes as goals blocked: no study collection exists to earn them (ideas.json s2-04); Candlelight at Vespers built 2026-11-07 (sunset from the time zone's city, no location asked); next: the season's palettes |
| 16 | Listening: the card at rest, the small pill while scrolling (bug 5) | done: the reader's dock, one card at rest, the pill and the chapter at the top while reading on |
| 17 | Plans page: Continue, the season's plan, picture tiles | done: Continue, the season's card (the Nativity Fast, from two weeks before it to the feast), the picture tiles |
| 18 | The Florilegium revamped: collections and sync on top, ready collections below (flag 2) | done: the sync line (only after a confirmed exchange, no device count), the gatherings as cards, four whole passages of Scripture to begin with |
| 19 | History: major events as large cards, the rest as rows with pictures, no switch, pictures free for everyone | done: the list (24 era-defining events large, 15 as rows with a picture), and on the event and council pages the moving picture and the more pictures for every reader; there never was a switch in the code |
| 20b | The journal, finalized 2026-11-08: everyone's journal by the Church's day (sharing a page at a time, three a month), the full Notion-style journal for Plus, quoting anything from the app, sharing with a clean preview; the contributor system on hold | steps 1 and 2 built 2026-11-08 (`JOURNAL.md`, "Built"): today's page by the Church's day, writing free, the page (title, verse cards, quotes of one's own, highlights), Quote in journal; Plus's covers, blocks, notebooks and tags, styles, the computer's layout. Step 3, sharing, built and waiting on his SQL (`sql/shared-pages.sql`) |
| 20 | Plus history: each event as a Thread, year by year, as a saint's Timeline | built on the 17 events that have steps, with the map that follows (67 of 183 steps name their place); the Plus row and its Try it are the Thread; the pan and the more pictures are every reader's; 27 more quotes open their source (45 quote texts the app does not carry); steps for 18 more events built 2026-11-09 (131 steps, 67 of them naming their place on the map: 134 of the 314 steps now), each step held by a test to the words of its own account (`docs/1.9-build/thread-steps.json`) and waiting with it for a priest's review; left without steps: Pentecost and the Council of Jerusalem, single moments with no dates to lay out, and the 2018 break, the OCA's autocephaly and Ukraine's, the most disputed events, whose accounts are not written yet (his word) |

## Phase 3: expand

| # | Item | Status |
|---|---|---|
| 21b | Compare, in the verse strip's Study: the verse in each Bible the app may show, and its Greek (Plus; licensed translations only where their terms allow) | needs you: each downloaded Bible's verses must first be placed against the app's; the cleanest source for that is CC BY-SA 4.0 (credit, shared alike), or the maps are made from the texts as item 22's was (ideas.json e-compare) |
| 21 | Public-domain Bibles: Romanian, Russian, Greek, Serbian, Arabic and Spanish first, then every app language; each licence proven; picking one offers the app in that language, with Never ask again. His word of 2026-11-07: each Bible is downloaded when the reader picks it, as other Bible apps do; none is carried in the app | Russian and Greek built 2026-11-07 (docs/1.9-build/BIBLES.md, "What shipped"): downloaded from the translations list, read in their own numbering, the language offer a pop-up (his word). Next: Arabic, Serbian, Spanish and Romanian wait on his labels and proofing; the verse-number map (22) to carry notes and highlights across |
| 22 | One verse-number map, for the new Bibles and the Old Testament cross-references | done 2026-11-07 for the KJV to the app's Septuagint (data/bible/kjv-to-lxx.json, made from the two texts' words; 95.7% placed, the rest left out, never guessed). The downloaded Bibles' own numbering (to carry notes and highlights across) is the next use of it |
| 23 | Cross-references into the Old Testament, in the Septuagint (Genesis 1:1 back on John 1:1) | done 2026-11-07: both Testaments, the Psalms in, in the app's numbering; lighter in the app than the New Testament's were (6.5 MB against 7.2); the Android export with them, 2026-11-07: 217.5 MB on disk (from 217.8) and 69.7 MB packed (from 69.5). Found on the way: the app's Psalms 113 to 115 are divided the Hebrew way (ideas.json c-psalter-113), waiting for his word |
| 24 | Tap an English word to study its Greek | done |
| 25 | Plans for the seasons (Nativity Fast, Great Lent, Holy Week, Dormition), more plans, a passage of the Fathers each day | the Nativity Fast's plan built (his pick: the Church's own Nativity readings, 25 days); it reaches readers only with 1.9, after 15 November; John in 21 days built 2026-11-07 from the Gospels plan's own words; a passage of the Fathers on nearly every plan day, the Nativity's included (s4-03); Acts, the New Testament in a year and the Psalter in a week wait for new framing or a source (ideas.json s4-02); Holy Week's plan built 2026-11-09 on his yes (645b0f6: the Gospel of each day from Lazarus Saturday to Pascha, from the calendar's checked data, its card two weeks before, its questions in the review queue); Great Lent and the Dormition ready |
| 26 | Remember the verse in three steps, spaced, and on the widget | the three steps built 2026-11-07 (missing words, first letters, from memory, following the spaced boxes; ideas.json s4-06); on the widget: the data built 2026-11-09 (eb93a66: the app hands both phones' widgets the next seven days' verse at its step, lib/widget/remember.ts); the faces built 2026-11-09 (32caa19, his yes to 45 to 48): its own widget, Remember the verse, on Android (four cells with the verse, two with the reference) and the iPhone (small, medium, the lock screen), the same for every reader, "Save a verse to remember it here." when none is saved; the Android code compiles (gradle), the iPhone's needs the iOS build in CI |
| 27 | Journal: prompts from the feast (by the editorials), search, a PDF | search was there since 1.8; the journal now in Export your library (through the share sheet in the apps) and Print or save as PDF on the website, 2026-11-07 (s4-09); prompts from the feast ready (editorial queue) |
| 28 | Florilegium: gather from everywhere, share as a page or booklet, a line on Today | a line on Today built 2026-11-07 (s5-07); a gathering handed on as a booklet on the website (Print or save as PDF) and as words through the share sheet in the apps (s5-05); found and fixed on the way: in the apps a tapped gathering opened Today (c-flor-open-in-apps). Gather from everywhere waits on his word on where (s5-04); a gathering as a page of its own, a link anyone opens, needs a new table, so a migration, for his word (s5-05) |
| 29 | Sync shown working, and everything kept synced | built 2026-11-09 and dark until his SQL: plan progress, Remember the verse, the reading places (the Bible's and every long work's), the palette and the reader's settings travel between a Plus reader's devices, item by item, the newer of each winning (lib/sync/kept.ts, keptMerge.ts); it waits on one table (`sql/user-kept.sql`) and on the privacy page's line, which says today that reader preferences have no server table (Waiting on you, 15). Shown working: the account's sync line already says when it last synced, and Sync now carries these too; a device count is not kept anywhere (ideas.json s5-08) |
| 30 | History: more events (40 today), the saints at each, a map, this day in Church history, listen to an era, the Creed by council | the Creed by council: built 2026-11-09 on his yes (the data 99c97b6, lib/councils/creed.ts, held word for word to both Symbols; the page 7c789ae: /theology/creed, the twelve articles with the words Constantinople added lit, a row at the head of Theology and under the books of Nicaea and Constantinople). This day in Church history: built 2026-11-09 on his yes (43bb0c5): a band under the day's saint on Today, with the event's picture, on the days an event falls on exactly (five events today; the three most disputed held for his word), a day the Church keeps matched on the reader's own calendar; more dated events wait on the history pass. The rest ready |
| 31 | Ambience: two sounds at once, Orthodox sounds (licences checked), the last sound remembered and faded | the last sound remembered, 2026-11-07 (the sheet marks it Last played; the fade at the timer's end was there since 1.7); two sounds at once, each with its own volume, 2026-11-07 (s2-06); the Orthodox sounds ready (licences) |
| 32 | Listening: the week's readings kept offline by themselves, a storage view, sizes before saving, the verse following the voice, resume per book, speed | built 2026-11-07: the storage view (Settings, On this device), resume per book, saved books marked in the book list, and saving that waits for Wi-Fi and picks up after a lost signal (s3-09); speed was there since 1.8. Sizes before saving waits on a design call (ideas.json s3-04); the verse following the voice found built since 1.7 and walked (s3-06); the week's readings kept offline by themselves on Wi-Fi, on Android (s3-01; iPhone waits on c-ios-offline-backup) |
| 33 | More languages for the app | needs you: which |
| 34 | Chants: more of them, and refined | needs you: the recordings, and what to refine |
| 35 | Read aloud: the Old Testament, and a choice of voices (carried from 1.8) | parked until its audio exists |
| 35b | All of St. Basil's works, in English, public domain (his word, 2026-11-08) | to build, not started (his word: not yet). First step when he says start: list which of his works have a public-domain English translation, and from which edition |

## Phase 4: refine the systems and the backend

| # | Item | Status |
|---|---|---|
| 36 | F-09: tests on the API routes and money paths | done 2026-11-07 for the money routes: checkout, its cancel, the Stripe webhook and RevenueCat, each at the route, and createCheckout with an injected database and Stripe (findings.yaml F-09); still open there: live Stripe and RevenueCat delivery, and e2e |
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
| 46 | Megabytes | done (his "full optimize", 2026-11-07): 239.3 to 217.7 MB on disk, 75.1 to 69.5 MB packed (the loading placeholders short, the Greek packed, the shop's photos streamed); 22 MB of room. New Bibles still best streamed (each is several MB). On the website alone: each history picture kept as AVIF and JPEG |
| 47 | Animations | ready, last |

## Phase 7: ship 1.9 (`docs/RELEASE.md`)

| # | Item | Status |
|---|---|---|
| 48 | The note in 21 languages, the six version numbers, the update hierarchy, the drop | at the end |
| 49 | The gates: typecheck, unit, lint, the Android and iOS exports, the export walk, the web build, the release APK on a phone, the shop's photos among it (they stream from 1.9), and a Bible downloaded on the phone (after the website carries public/bibles: download the Russian, read with the phone offline, Remove) | at the end. A run on the way, 2026-11-07, all built as the releases build them (the shop and Community on): the export walk 1488 of 1488, and again on d77ce800 and on 05b9d978 after the evening's fixes and translations; the Android and iOS exports 220.5 MB on disk, 70.2 packed (220.6 with the translations); the website's build exit 0; unit 9,192; the website's smoke suite mended to all but two (ideas.json c-smoke-suite). Not yet: the release APK on a phone (Android build 88, from 503929f3, published to the android-release page for it on 2026-11-07; a test build, never for Play), a Bible downloaded on a phone (needs the 1.9 website live) |
| 50 | The push, the store builds, the reviews, the update prompt | needs you |
| 51 | 1.8 is live in both stores (his word, 2026-11-06); set the build numbers in `lib/appUpdate/release.ts` so installed apps are told | done for 1.8 through the host's environment: purifyapp.net/api/app/release served Android 78 and iOS 31 on 2026-11-09 (checked by the arbiter), so installed apps are told; the committed constant on main is still 0, which that override bypasses. For 1.9: set them again once each store serves the 1.9 build |

## Parked

- Identity beyond the fixes: earned and seasonal frames, a patron's icon as the picture (his call: keep Identity small).
- The Fathers' own cross-references (he was unsure).
- Word study's other ideas (Translated as, the open book first, the count before the lock, a fuller dictionary, the Fathers on the word).

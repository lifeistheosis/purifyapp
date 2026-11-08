# 1.9 brainstorm

Brainstorm mode is on since 2026-11-06: notes and plans only. Nothing here is
built until Edgar says to start. He said start on 2026-11-07 and the build day
followed (`PLAN.md`); on the evening of 2026-11-07, with test build 88 on his
phone, he turned brainstorm mode on again: notes and plans only once more.

The repository is public: no figures, no readers' names, no money in this file.

## The theme of 1.9: expand and refine (his words, 2026-11-06)

"the aim for version 9 is to expand, right, and refine. I think if there was
two words, it would be that, to expand and refine."

- **Expand:** the content, Plus, the languages, the chants, the history.
- **Refine:** the chants, the systems, Plus, the backend, the systems overall.
- **Last of all, the app itself:** the megabytes, the animations, all of it,
  once everything else is done.

The goal he set for the Plus review: retention and experience, so a
subscriber feels they get the most from Plus and Plus gives the most for the
money. Bugs and anything that breaks his flags go in too ("I want version 9
to be impeccable").

## Where the record lives

The first part of the 1.9 brainstorm ran on a second Claude account (this one
had hit its limit), on the PC, and its notes stayed in Homebase. A cloud
session cannot open Homebase (on 2026-11-06 the PC did not offer the folder to
cloud sessions), and one account cannot read the other's chats. So from here
this file is the record: any account on any machine can read it on GitHub.
Whatever is decided elsewhere is copied in here, and a new session reads this
file first.

**One branch (his word, 2026-11-07).** The work and this record are on the
branch `ccr-07896cf2-bo0afd` until 1.9 merges into main, and main has neither:
main is the website, and a push to it deploys. A new session, on any account
or machine, checks that branch out first and pushes nowhere else. On GitHub,
read this file on that branch.

Not here yet:

- The other account's 1.9 notes.
- The SSM board changes made there (the board lives with purify-ads, not in
  this repository).

## Built since 1.8 (admin only, live on main)

2026-11-02, this account (`00500450`, `be40c49b`, `390320ff`): Traffic shows
visitors by day for 7 to 120 days with a median line, and any single day can be
picked.

2026-11-04, the other account (`6445c854`, `aaa74a50`, `632aa536`, `27f1bcaf`):

- No Home flash on a saved link; the phantom Home visits left the usage log.
- A timeline that never resets, read a week at a time back to May 2026; the
  bell reads the same log.
- Goals as pace bars that keep themselves up to date.
- Home A (numbers first) or B (money leads), picked in Settings.
- One chart: Visitors, Page views and Signups as switches.
- Today beside last night, A or B, picked in Settings.
- A zoomable map with readers in green, and Traffic > Live: everyone on the
  site, and the pages each one opened.
- A phone pass: switches and links a thumb can hit, nothing wider than the
  screen.

## Carried into 1.9

From `docs/plans/v1.8/since-1.7.2.md` (Not in 1.8) and
`docs/plans/v1.8/drop.md` (What may not be said), checked against the code on
2026-11-06:

1. **Find a parish**: the parish directory. Not built.
2. **Purify Parish**: the parish plan. Not built.
3. **The screens locked on 2026-10-27**: Bible reader, praying, Premium pill,
   chant page, shop, theology, saint page, Discover, paywall, Prayers home,
   player (`Homebase/boards/purify-master/variants/INDEX.md`). Today waits on
   his mockup.
4. **Chants beyond the Anthem**: wait on his recordings.

Stale in the 1.8 file, so not carried: Onboarding version 4 and "Where are
you coming from?" went into 1.8 after that file was written (the question is
first in `components/onboarding/OnboardingFlow.tsx`, counted from version 4
in `lib/onboarding/counting.ts`, and the priest, deacon or layman screen
followed as version 5).

Not built, with no release named: the Old Testament read aloud (only the New
Testament is recorded) and a choice of voices.

Open audit items with a claim on a slot (`docs/audit/findings.yaml`):

- **F-37** (P2): the Stripe webhook can mark an order paid while Stripe says
  the checkout is unpaid, so goods can go out before the money is in.
- **F-09** (P2): no tests on the API routes and money paths.
- **F-21** (P2, partly corrected): native push.
- **F-49** (P2, partly corrected): reading-room sections shown as words their
  book does not hold.
- **F-22** (P2, mitigated): 107 of 110 saint icons with no source or licence
  on record.

## First read (Claude, 2026-11-06)

To be weighed against the other account's notes once they are here.

- **Parish is the biggest lever and the biggest risk.** A priest pointing his
  people to Purify reaches readers no ad reaches. But a directory is only as
  good as its accuracy: a wrong address, or a community listed that a reader's
  own bishop does not recognise, costs trust with the very clergy a parish plan
  is sold to. Which jurisdictions are listed is a church question, so it is a
  rule for Edgar and the clergy queue to set, never for Claude
  (`docs/editorial-standards.md`). Build it from a list Purify may use (a
  licence, or the parishes' own submissions), not scraped from a diocese's
  site. Read-only first, with a way to report a correction.
- **The parish plan comes after the directory.** A paid plan is pricing and
  terms: his decision, and new legal text. Let the directory show parishes
  come before anything is sold to them.
- **The eleven locked screens go in slices.** Eleven redesigns in one release
  is the riskiest shape a release can take; 1.8 was still merging fix branches
  into its last build (the `r5` and `r6` branches, build 87). Three or four a
  release, the ones that touch revenue first (paywall, Premium pill, shop).
- **Chants and the Old Testament are waiting on inputs, not code.** Each takes
  a slot when its recordings exist; neither should lead.
- **F-37 goes in whatever the theme.** Small fix, real money.
- **Let the counts choose the content.** Since 1.8 the admin counts where
  readers come from and what they look for. Read those before deciding what
  1.9 teaches.

## Questions for Edgar

1. The other account's 1.9 notes: paste them here, or name the file in
   Homebase.
2. The SSM board: what changed, and does any of it touch 1.9?
3. What leads 1.9?

## Plus, feature by feature (from 2026-11-06)

His words: "let's talk about the plus subscription. list ever single feature
of it and we will individually brainstorm each feature and how we can improve
it".

**The price** (`lib/premium/plans.ts`): $9.99 a month or $71.99 a year; the
year saves 40% and begins with 7 days free on a first subscription. Pro, at
$19.99 or $199, is everything in Plus with the EIKON Box, the members'
benefits, and Studio Audio (coming soon). Prices and terms are his decision.

**Where it is sold:** the website and Google Play lock Plus. iOS cannot sell
it yet (the App Store products were at MISSING_METADATA,
`docs/app-store-review-notes.md`), and the rule in
`lib/entitlements/entitlements.ts` never locks what cannot be bought, so an
iOS reader has all of Plus free.

**What nobody can see:** which lock a reader taps, and which lock leads to a
purchase. The server takes onboarding and screen events only
(`lib/security/schemas.ts`, `trackEventSchema`), so which feature sells Plus is
not known.

The fourteen, as the paywall lists them (`lib/premium/plusRows.ts`), each with
what stays free and where its lock is. All twelve locks checked in the code on
2026-11-06.

| # | Feature | What it does | Free beside it | Lock |
|---|---|---|---|---|
| 1 | Word study | Every place a Greek word stands, Septuagint and New Testament, the verse beside each | The Greek beside the text, every word's dictionary entry | `components/bible/ChapterReader.tsx` |
| 2 | Candlelight and Monastery | Two reading palettes for long hours | Dark, Light, True black | `components/reader/ReadingModeChips.tsx`, `components/settings/ReadingModePages.tsx` |
| 3 | Cross-references | The passages a verse echoes across the New Testament, one tap to open | Every verse, the Greek, the Fathers' commentary | `components/bible/ChapterReader.tsx` |
| 4 | Your journal | Every note, dated and gathered, with this day in past months brought back | The notes on the verses themselves | `components/journal/JournalClient.tsx`, `components/you/KeptShelf.tsx` |
| 5 | Listen offline | Save a book's readings on the phone (the apps) | Listening online to every chapter | `components/player/SaveOffline.tsx` |
| 6 | Ambience | Rain, birds, a bell, cathedral bells, the sea, wind, under the words | The chant under prayers | `components/player/AmbienceSheet.tsx`, `components/player/PrayWith.tsx` |
| 7 | Reading plans | The Psalter by kathisma, the Gospels a chapter a day, Proverbs in a month; place and streak kept | The whole Bible and the daily readings | `components/plans/PlanClient.tsx` (Begin, and marking a day) |
| 8 | Remember the verse | Saved verses come back, one card a day, until known by heart | Saving verses | `components/today/RememberCard.tsx`, `components/you/PractiseSheet.tsx` |
| 9 | Your Florilegium | Collections of verses and the Fathers, with notes | What is already gathered stays on the device | `components/bible/VerseRow.tsx`, `components/florilegium/AddToFlorilegium.tsx`, `components/saved/FlorilegiumRow.tsx` |
| 10 | Sync | Notes, highlights, bookmarks and collections on every device | Reading and saving on the device; pre-launch supporters keep sync for life | `components/profile/ProfileSyncStatus.tsx` |
| 11 | History in full dress | Period artwork behind every event, the motion through the timeline, a council's picture moving | Every event, source and citation | `components/history/EventPictures.tsx`, `components/councils/CouncilHero.tsx` |
| 12 | Profile extras | Avatar frame, profile effect, banner picture, two-color theme in Community | Profile, handle, badges, banner color | `components/community/profile/ProfileEditor.tsx`, `components/community/CommunitySide.tsx` |
| 13 | The Plus mark | A small cross beside the name in Community, which he can turn off | | Settings |
| 14 | Discord status | In the Windows app, the Discord portrait framed in the season's color | The other Discord modes | `components/desktop/DiscordModes.tsx` |

Each feature's ideas go under its number below as we reach it.

### How we go through it (his call, 2026-11-06)

Section by section, in chat, with real screenshots of each feature as it is
today: not designs, a picture of what it is. No showcase page (his words:
"more token usage"). The shots come from a local run of the app, where Plus is
open, because this cloud session cannot reach purifyapp.net. His picks are
recorded here under each feature.

The order:

1. Study: word study, cross-references
2. Reading: Candlelight and Monastery, ambience
3. Listening: listen offline
4. Practice: reading plans, remember the verse, journal
5. Keeping: Florilegium, sync
6. Beauty: history in full dress
7. Identity: profile extras, the Plus mark, Discord status
8. The bundle: the price, the trial, the paywall, iOS, and counting what sells

### Section 1: Study (2026-11-06)

**1. Word study.** With the Greek on, a tapped Greek word gives its meaning
free (Strong's, with its parsing); "Every place it appears" is Plus: every
verse holding the word, the New Testament (λόγος: 331) and the Septuagint
(1,101), the English (KJV, Brenton) above the Greek with the word lit.

What is weak:

- Hidden: it is reached only with the Greek turned on, which is off by
  default and, on a phone, sits in a menu. Most readers never meet it, so they
  never meet its lock either.
- The meaning is Strong's (1890): short, in the English of its day, with
  nothing of the Church in it.
- The list is a wall: 331 verses in Bible order, from Matthew, with no sense
  of how the word is translated.
- Only the Greek is lit in each verse, not the English word that renders it.
- The lock is in the app only: `/api/bible/word` answers anyone. Low risk
  for public-domain text, but it is not a server-side gate.

Ideas, best first:

- A. Tap any English word to study its Greek. The English is already tagged
  word by word with its Greek number (`data/bible/english-tagged`: 25 of the
  27 New Testament books, all but Philippians and Philemon, and 44 books of
  the Old Testament), so this needs little new data, and it puts the feature
  in front of every reader.
- B. "Translated as": how the KJV renders the word (word, saying, account),
  with counts, each a filter. From the same tags.
- C. Begin where the reader is: the verses of the open book first.
- D. Say the count before the lock: "Every place it appears, 331 and 1,101".
- E. Light the English word in each verse, beside the Greek.
- F. A fuller dictionary beside Strong's, public domain only (for example
  Abbott-Smith, 1922; the licence of the digital copy checked first).
- G. Later: the Fathers on the verses that hold the word, from the commentary
  the app already carries. Editorial care: exact passages only.

**2. Cross-references.** On a phone: hold a verse, then Cross-references,
seventeenth of eighteen rows in that menu (counting the seven colours). Plus: the verses it echoes, with their
words, one tap to open. Source: OpenBible.info (readers' votes, CC BY). New
Testament to New Testament only: the KJV and the Septuagint number verses
differently, and no map between them exists yet (`lib/bible/crossRefs.ts`).

What is weak:

- No Old Testament. For an Orthodox reader the Psalms and the prophets are
  where the links matter most (John 1:1 to Genesis 1:1 and Proverbs 8).
- Hidden on a phone: nothing on a verse says it has links.
- The links are readers' votes, not the Church's reading.

Ideas, best first:

- A. The Old Testament in the Septuagint: build the numbering map between the
  KJV and Brenton. The biggest gap.
- B. The Fathers' own links: the verses the Fathers cite when they comment on
  this verse, from the commentary the app already carries, each with its
  source line (`lib/citations`). No other app can have this. Exact citations
  only, never inferred.
- C. Show it: a small mark on verses that have links, and the count on the
  menu item.
- D. Read around a linked verse (the verse before and after) without leaving
  the sheet.

### His picks, section 1 (2026-11-06)

His words, from voice: "we kind of need like the UI system really clean so
someone can easily highlight, easily copy, easily share, easily make an image
... and easily look at the Greek and easily compare it ... with the premium",
and "just do your pick for now and really explain what your pick is ... show
photos". On the Fathers' links he is unsure: parked, not dropped.

- **Word study: A, tap the English word**, inside one clean verse system
  (below), because a tap or a hold on a word collides with what the reader
  already does with a verse.
- **Cross-references: A, the Old Testament in the Septuagint.**

**The verse system, one rule per gesture** (mockups made 2026-11-06 on the
local app, not built):

| Gesture | Today (`components/bible/VerseRow.tsx`) | Proposed |
|---|---|---|
| Tap a verse | Nothing | Selects it; one bar comes up: the seven colours, Copy, Share, Image, Note, Greek, Compare (Plus), Cross-refs (Plus), More. Tap more verses to add them; tap outside to close |
| Tap a word | Nothing (only Greek words, with the Greek on) | In a selected verse, its card: the Greek word, the meaning (free), every place it appears (Plus), with the count said before the lock |
| Double tap | Highlights the verse | The same; the first tap selects, so nothing waits |
| Hold | An eighteen-row menu | Hold and drag marks some words, as now; the menu's rows move into the bar and More |

Nothing appears while a reader only reads: no popups until a tap. Compare,
if Plus, needs one check first: licensed translations (NIV, NKJV, NLT) often
may not be sold behind a paywall under their publishers' terms.

**Cross-references, the numbers** (OpenBible.info's set,
`scripts/cr/cross_references.txt`, counted 2026-11-06):

- 344,799 links in the set; the app uses 84,369 of them (New Testament to New
  Testament, 24%). Dropped: 30,226 from the New Testament into the Old, and
  all 230,204 that start in the Old Testament.
- The most-voted link for John 1:1 is Genesis 1:1 (333 votes), and it is
  dropped today. So are Proverbs 8:22-31 (106) and Isaiah 9:6 (95).
- 21,556 Old Testament verses, the Psalms among them, would have
  cross-references for the first time.
- The map is the work: the link data is numbered as the KJV is, Purify's Old
  Testament as the Septuagint is. Psalm 33:9 in the data is Purify's 32:9;
  opened unmapped it lands on "Fear the Lord, all ye his saints". Jeremiah
  31:31 is 38:31. The Psalms are mapped by whole psalm already
  (`lib/bible/psalmNumbers.ts`); cross-references need it verse by verse.
  What cannot be placed exactly stays out, as now.
- Shown as two groups: the Old Testament first (up to three), then the New
  (up to six as now), because by votes alone the Old Testament links would
  mostly fall below the cap of six.

### Sections 2 to 7, ten each (2026-11-06)

His call: "just run it down", ten refinements per section, with photos, plus
bugs and anything vibe coded. Once he picks, three versions per section.
Photos: real screenshots of the local app at phone size (26 shots), the
Plus-locked features through the paywall's own Try it screens.

**Bugs found**

1. Saved says "Tap the star on a verse to keep it here" (`saved.emptyLine`).
   On a phone there is no star: the star is the desktop toolbar's
   (`components/bible/VerseRow.tsx`), and a phone keeps a verse through Bookmark
   verse in the hold menu.
2. The Sync preview (Try it) shows "Verses highlighted 0": a sales preview
   showing a zero.
3. The Try it header cuts a long name: "Candlelight and Monastery rea...".
4. Two sounds share one icon: Bell and stillness, Cathedral bells.
5. In the reader, while audio plays, two bars stack at the bottom: the chapter
   bar and the mini player.
6. Copy: "Remember a verse is part of Purify Plus" beside the name "Remember
   the verse".
7. Copy: the Plus mark is called "Supporter" (`community.supporterMark`,
   "Show my supporter mark"), while supporters are the pre-launch readers
   with lifetime sync, and Plus has one name.

**Against his flags**

1. Candlelight is almost the free palettes: ground `#0a0a0a`, text `#d4d4d8`
   (`app/globals.css`), beside True black `#000000` and Dark. Its amber went on
   2026-09-25, and nothing took its place.
2. The Florilegium's dashed "Begin a new gathering" card with a typed arrow.
3. Sync's custom drawing of devices (custom drawings were flagged in the 1.7
   walkthroughs, note 24).
4. The star for bookmarks (the Premium pill's star was flagged, 1.7 note 14).
5. To check with him: the red commentary dots in the reader (he called the
   timeline's red dot vibe coded, 1.7 note 20).

**2. Reading** (Candlelight and Monastery, ambience)

1. Give Candlelight its own look again without gold: a soft white glow at the
   centre of the page, dimmer edges, gentler contrast.
2. Candlelight at Vespers: on by itself at sunset, when the Church's day
   begins, and off in the morning. One switch.
3. Palettes that follow the Church year: Lent, Pascha, Pentecost, the
   Theotokos' feasts, each in its season.
4. Show the earned palettes: Councils and Cappadocian unlock by finishing a
   study collection but stay hidden until then. Show them as goals.
5. Night reading in one tap: Candlelight, Focus, larger text and a sound
   together (the code already calls Candlelight with Focus the best pair).
6. Layer two sounds (rain and a distant bell), each with its own volume.
   Today one plays at a time.
7. Orthodox sounds: the semantron at dawn, a monastery courtyard, the Paschal
   bells in their season. Rain is in every app; these are ours. Recorded or
   CC0, each licence checked.
8. One icon per sound (bug 4).
9. Ambience remembers the last sound and fades out at the end of the timer.
10. Decide the red commentary dots (flag 5).

**3. Listening** (listen offline)

1. Keep the coming week's daily readings on the phone by themselves, on Wi-Fi,
   for Plus: in church and on the road without thinking about it.
2. Expand what can be kept: the Psalms first when the Old Testament is
   recorded, then the saints' lives and the chants.
3. A storage view: what is saved, its size, remove a book.
4. Say the size and time before saving ("John: 21 chapters, about N MB").
5. One bar at the bottom while playing (bug 5).
6. The verse being read lights up and the page follows the voice, as the
   chants' words do since 1.8.
7. Saved books marked in the Bible's book list.
8. Resume where you stopped, per book, from the lock screen too.
9. Check: does saving pick up again after a lost signal, and can it wait for
   Wi-Fi?
10. Speed control for the voice, if missing.

**4. Practice** (reading plans, remember the verse, journal)

1. Seasonal plans that start with the season: the Nativity Fast (from 15 or 28
   November), Great Lent, Holy Week, the Dormition Fast, by the reader's
   calendar. The Nativity Fast is days away: 1.9 will likely miss this one.
2. More plans: the New Testament in a year, John in 21 days, Acts in 28, the
   Psalter in a week as monastics read it. Three plans today.
3. Plans with the Fathers: each day's reading with one passage of the
   commentary the app already carries, verbatim and cited.
4. The plans list shows your progress and a picture; today it is text rows.
5. A missed day offers catch up or shift the plan, never a broken streak.
6. Remember the verse in three steps (missing words, first letters, from
   memory), spaced over days.
7. Remember the verse on the widget and the lock screen.
8. Journal prompts from the day's feast or saint, through the editorial
   queue (doctrinal wording is never shipped straight).
9. Journal search and export to PDF: a reader's journal is theirs.
10. One copy fix: Remember a verse or Remember the verse (bug 6).

**5. Keeping** (Florilegium, sync)

1. Fix "Tap the star on a verse" (bug 1).
2. Fix the zero in the Sync preview (bug 2).
3. Replace the dashed card and the typed arrow (flag 2).
4. Gather from everywhere: prayers, councils, history, not only verses and
   the Fathers.
5. Share a florilegium as a page or a booklet, citations kept exact: readers
   bring readers.
6. Starter florilegia to begin from, verbatim and cited, for the empty first
   day.
7. A line from your own florilegium on Today.
8. Show sync working: "Synced 2 minutes ago, 3 devices".
9. Sync everything kept: plan progress, Remember progress, place, palette,
   settings (check what syncs today).
10. One word for keeping: Saved, Kept, Gather and Florilegium today.

**6. Beauty** (history in full dress)

1. Expand the history: 40 events across 11 eras today, for two thousand
   years.
2. Make full dress visible: a clear switch on the timeline, and a short
   preview for a free reader.
3. History on a map: `data/maps/church-history.json` is already in the repo.
4. The saints at each event, one tap to their card.
5. This day in Church history on Today, with its artwork.
6. Listen to an era with the reading voice.
7. The Creed line by line, showing which council gave which line.
8. Megabytes: the artwork's weight, formats and sizes, the next picture
   loaded ahead.
9. F-22: 107 of 110 saint icons have no source on record. Fix it in 1.9.
10. Check the timeline against his 1.7 notes (era colours, the dots).

**7. Identity** (profile extras, the Plus mark, Discord)

1. One name: the Plus mark, not "Supporter" (bug 7).
2. Frames earned by practice (the Psalter finished, Lent kept), quiet, with
   no confetti; Plus members earn more.
3. Frames and banners of the season, back each year (no countdowns: his
   paywall rule).
4. A patron saint's icon as the profile picture, only icons with a source on
   record (F-22).
5. The patron and their feast on the profile; Community greets a name day.
6. Preview extras where they appear: a post row and a reply, not only the
   large avatar.
7. Tap the mark on a name: "Purify Plus member", a quiet way in for free
   readers.
8. Show Discord status on the paywall only on Windows, where it works.
9. Banner pictures need moderation: check uploads can be reported and
   reviewed.
10. A favourite line from your florilegium on your profile.

### His decision on sections 2 to 7 (2026-11-06)

All of them: "So far, I like all of these. Let's do all of these". He named
the history ("expand history, make the artwork a little lighter") and every
part of keeping, practice and listening, and asked for refinement "as much
as we can" across the sections and identity.

### Who asked for what: `ideas.json`

His words: "there's updates that I request specifically ... these are
attributed to you ... so we can learn from what type of requests I give and
what types of requests you give ... history is so we can learn from our
mistakes and our actions."

`docs/1.9-build/ideas.json` holds every 1.9 item with `from` (edgar, claude
or both), its status and whether it needs a design. After the release each
gets its `outcome`: shipped or not, and what readers did with it. On
2026-11-06: 89 items, 6 from him, 83 from Claude.

### Three versions per section (2026-11-06)

One design question per section, three versions each, drawn on the local app
with its own fonts, icons and artwork (mockups, nothing built):

- 2 Reading, Candlelight's look: A Glow (a soft white glow, dark edges), B The
  lamp follows (the lines being read lit, the rest dimmed), C Vellum (a fine
  grain and a drop capital).
- 3 Listening, one bar while playing: A The bar is the player, B One card in
  two rows (player above, chapter, speed and timer below), C A small pill (the
  chapter moves to the top bar).
- 4 Practice, the plans page: A The season first (the Nativity Fast on top),
  B Continue first (today's reading, then picture tiles), C The week (seven
  days, progress bars, Catch up).
- 5 Keeping, the Florilegium's first page: A Begin with a collection
  (starter tiles), B One line (a single verse, two buttons), C The shelf
  (collections, sync status, starters below).
- 6 Beauty, full dress on the timeline: A A switch on top (Plain or Full
  dress), B Art in each row, C Era bands (full-width artwork per era).
- 7 Identity, the profile: A Patron as picture, B Patron banner (and the name
  day), C Mark and frames (the mark explained on a post, earned frames).

His picks (2026-11-06, from voice, numbered by the pictures he was sent):

- Reading: a mix of A and B. Drawn: the lines being read lit and the rest
  dimmed (B), with A's glow behind them and dark edges.
- Listening: B, and "when you scroll, it turns into C": the card at rest, the
  small pill while scrolling, the chapter moving to the top bar.
- Practice: a mix of A and B. Drawn: Continue first, the season's plan below
  it, then the other plans as picture tiles.
- Keeping: "honestly, a whole entire revamp", and for that a mix of A and C.
  Drawn: your collections and the sync line on top, the ready collections
  below as tiles.
- Beauty: a mix of A and B: "the prominent historical events, we're gonna make
  it big like A, but for smaller ones, do B". No switch between plain and full
  dress: "always full dress all the time". And the pictures are for everyone:
  "images should be for everyone ... When I meant like an immersive
  historical design timeline for premium users, I kind of meant it in another
  way, not just images ... we'll extrapolate more on that after."
- Identity: "unsure ... I don't like many of them." Checked after: the 1.8
  profile he picked (r3-28 A) already has the patron and their name day, a
  favourite verse, the badges and the Plus cosmetics, and the three versions
  ignored it. What is new for Identity is only: the Plus mark's name (bug 7),
  the mark explained on a tap, Discord shown only on Windows, frames earned
  from the badges, seasonal frames, the patron's icon as a picture. Claude's
  view: keep Identity to the small fixes in 1.9; the profile was redesigned
  in 1.8 and has not been measured yet.

**What "pictures for everyone" changes:** the history artwork leaves Plus. The
Plus row "See the timeline in full dress" (`lib/premium/plusRows.ts`,
`plus.history.*`) and the free/Plus split in `components/history/EventPictures.tsx`
and `components/councils/CouncilHero.tsx` change with it, and the paywall may
not promise artwork once it is free. Plus keeps a history row only when the
new immersive layer exists; what that is, he will say.

### The artwork's weight, found 2026-11-06

`public/history/media` is 21 MB: every picture twice, JPG (13.6 MB) and AVIF
(7.5 MB), and the apps carry the folder. Keeping one format per platform could
take about 13 MB off the apps, once the oldest Android WebView and iOS version
the apps support are checked for AVIF. Three files (0.7 MB) are named nowhere
in the history code or data: `council-of-jerusalem.v1.jpg`,
`mission-of-cyril-and-methodius.v1.jpg`, `philokalia-published.v1.jpg`; to
confirm before removing.

### The order of work, when he says start

1. The seven bugs and the copy (each line in all twenty-one languages).
2. The designs he picks, and the verse system of section 1.
3. Expanding: plans, history events, sounds, starter collections (verbatim and
   cited, through the editorial queue), the Old Testament cross-references,
   the English word tap.
4. Last: the megabytes and the animations.

### Immersive history for Plus: the Thread (2026-11-06)

His words: "Everyone else gets a standard read article, right? But for plus
users ... they get the timeline, right? The same timeline that we have on
like a saint's life, we want that for the history section ... not
necessarily more in depth, but just more immersive."

- **Everyone:** the article as it is, with its pictures.
- **Plus:** the event as a Thread, drawn as a saint's Timeline is (the Web
  door's second view, `components/saints/web/WebTimeline.tsx`, his 1.8 pick):
  year by year, each moment one of the event's own sentences that carries a
  year, the people in it as chips (a saint opens his page), the event itself
  lit with its picture, what followed it on a dashed line, and "Also in this
  council" at the foot.
- **The data is there:** each event in `data/history/*.json` has its context,
  narrative and consequences, its people with their saints' pages, and its
  sources (Nicaea: 17). The mockup of Nicaea uses its sentences word for word.
- **To weigh:** every history text is still marked `awaiting-clergy-review`.
  More events, and a Thread made from them, lengthen that queue.
- **More immersive, to brainstorm with him:** the map following the Thread,
  the Thread read aloud, a quotation opening its source in place, a person
  followed across events.

### The Supporter mark (2026-11-06)

Two things are called supporter today: the small cross beside a Plus or Pro
member's name in Community ("Supporter", `community.supporterMark`), and the
pre-launch supporters, who keep cross-device sync for life
(`plus.promise.supporters`). His answer: "plus users are supporters." So the
mark keeps its word, and bug 7 becomes: tapping the mark says what it means
("Supporter: Herman keeps Purify going with Purify Plus"). Mockups made for
his Identity 2 (the mark tapped) and 3 (no Discord row on a phone's paywall).

### Review stays on our side (2026-11-06, his rule)

Readers never see that a text awaits review; the team's own writing is
credited to the editorials (his word), never to Purify. Recorded as item 27 of
`docs/editorial-standards.md`. Six reader-facing lines break it today, each to
be rewritten in all twenty-one languages:

| Key | Today | 1.9 |
|---|---|---|
| `study.councils.framingAwaitingReview` | Our introduction. Awaiting review by a priest. | An introduction summarized by the editorials. |
| `study.heresies.oursAwaitingReview` | Our account, written from the councils and the Fathers. Awaiting review by a priest. | Summarized by the editorials from the councils and the Fathers. |
| `saints.voice.editorialLabel` | Summary by Purify | Editorial summary |
| `saints.voice.editorialBody` | Written by Purify, not {name}'s words. | Summarized by the editorials, not {name}'s words. |
| `reading.work.ours` | Written by Purify: our retelling, not the saint's own words. | Summarized by the editorials: not the saint's own words. |
| `translationDisclaimer.body` | ... still in English while editorial review for theological precision completes. | The body of this page is in English for now. |

Our side: a Review list in the admin panel gathering every file marked
`awaiting-clergy-review` (66 on 2026-11-06: history 36, councils 25, chants 4,
Today 1), so a reviewer's work is tracked there and nowhere else.

### The verse bar: his pick B (2026-11-06)

Three looks were drawn on the reader (A the tray from the bottom, B the strip
under the verse, C two tabs Keep and Study). His answer: "B". A tap on a verse
selects it and a slim strip opens just under it: Highlight, Copy, Share,
Image, Note, and Study (the Greek, Compare, Cross-references, the
commentary). A word tapped in the selected verse opens its Greek. Double tap
still highlights; hold and drag still marks some words.


**Then C (2026-11-08), in place of B.** On build 88 he found the strip
plain ("I don't like any of it": not premium, the wrong idea) and chose C of
three new versions: the focus, the page stepping back and the verse lifting
into a card, the colours above it and the tools below, "smooth with
animations". The versions, the pick and its motion are in
`docs/1.9-build/notes/build-88.md`, note 3.

### Editorials: readers' own pieces (his word, 2026-11-08)

His words, from voice, after the journal round: "I want people to be able to
make their own editorials ... super clean ... desktop adaptable ... super
similar to how Notion has their system, where you can add an image as the
banner, where you add a title, a cover text ... a highlighting system ... go
all in on that so people can make their own editorial forums, and also make
it so that they're able to share it in the community section, and if they
really want, they can also submit it to Purify so that we can review it, and
if we think it's good enough and it's clergy reviewed, then we can actually
implement it into Purify officially. And they're gonna be tagged as an
editorial with the editorial badge, or whatever badge that's closest ...
super optimized and super mobile friendly, and make it clean for the
shareables ... the embed photo is the photo they use, and like it's super
clean with the title." (The message ended at "Oh,".)

The system, as Claude reads it:

1. **A page in the journal, built like Notion's:** a cover image, a title, a
   cover text under it, then blocks: text, headings, a quote, a verse card
   from the app's own Bible, an image, and highlights in the seven colours.
   Private by default. The same page on a phone and a computer.
2. **Shared when the writer wants:** into Community as a post, or as a link
   whose preview (Discord, Instagram, messages) is the cover image and the
   title, the way a profile's link preview is drawn now
   (`app/(app)/u/[handle]/opengraph-image.tsx`).
3. **Submitted to Purify when the writer wants:** into the admin's review list
   (the one built for the 66 texts awaiting clergy review, PLAN row 10). If
   accepted and reviewed, it is published in Purify as an Editorial, with
   its writer's name, and the writer gets a badge: Contributor exists
   already and is the closest (`profile.badge.contributor`).

What it touches, before any design is final:

- **Editorial standards bind it** (`docs/editorial-standards.md`): a reader's
  piece is the reader's words, never shown as the Church's teaching. In
  Community it is marked as a reader's; only a reviewed piece is an
  Editorial. No priest reviews Purify yet (his standing note of 2026-10-16),
  so submissions can wait in the queue until one does.
- **Images from readers** bring copyright and unsuitable pictures. Claude's
  recommendation: covers from Purify's own artwork first (only pictures whose
  source `lib/saints/iconRights.ts` verifies), uploads later with review.
  Community already has Block and report, which the stores ask of anything
  readers publish.
- **Submitting needs a contributor clause in the Terms** (permission to
  publish and edit, credit kept): legal, his word or a lawyer's.
- **Free or Plus** is his call (the journal is Plus today).
- **Size:** an editor, pictures, public links, a review flow. Proposed in
  three steps: the page editor in the journal; sharing with the link preview;
  submitting, review and the badge.

Next: the screens drawn (the editor on a phone and on a computer, the link
preview, Community and Submit), and his answers to the questions above.

**His follow-up (2026-11-08):** readers should quote the Fathers and
Scripture in their pages; the journal is Purify's own system, "not
Orthodoxy's", so it is kept apart from what the Church teaches; Plus gets
"a way better journal system ... pretty much a one-to-one revamped Notion",
and everyone else a general, personal one. Then his question: "we want as
much exposure, so we want users to be able to share it with their friends,
but at the same time, how would we deal with plus users?"

**Claude's recommendation: write and share free, depth is Plus.** Every
shared page reaches someone without Purify, with the writer's cover and
title in the preview, so a paywall on sharing would cut the growth it is
for. What heavy writers need (and they are the readers most likely to pay)
is power and order, so that is what Plus holds:

- **Everyone:** journal pages with a title, text, Scripture as verse cards,
  the seven highlight colours and the Church's day on each page; covers
  from a small set of Purify's artwork; sharing as a link with the clean
  preview and into Community; notes on verses (free already); submitting
  to Purify (the review is the filter).
- **Plus:** the whole editor (headings, callouts, checklists for prayer
  lists, dividers, images, columns on a computer), the Fathers quoted from
  Purify's own library, saint, feast and reading cards, every cover,
  templates, notebooks and tags, search, From this day, sync on every
  device, export. Each shown in the editor's block menu with the Plus mark,
  never hidden, and counted by the lock counting of item 12, so what sells
  is measured, not guessed.

**The Fathers, quoted from the library only.** A Father's words go into a
page as a card taken from Purify's own sourced texts, verbatim, with the
citation filled in, and are not editable as the Father's; the writer's own
words go around them. Words typed by hand are never dressed as a Father's
quote. That keeps the editorial standards true in readers' pages too, and no
other app can do it.

**The journal is the reader's, never the Church's.** A shared page says it
is a reader's page, made with Purify. Only a reviewed piece is an
Editorial. Shared links are unlisted and kept out of search engines until a
piece is reviewed, so the website's name is never lent to an unreviewed
page; every shared page carries Report.

Still his: this split (a change to what the journal's Plus row holds), the
contributor clause in the Terms, and whether a clergy reviewer is sought.

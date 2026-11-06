# 1.9 brainstorm

Brainstorm mode is on since 2026-11-06: notes and plans only. Nothing here is
built until Edgar says to start.

The repository is public: no figures, no readers' names, no money in this file.

## Where the record lives

The first part of the 1.9 brainstorm ran on a second Claude account (this one
had hit its limit), on the PC, and its notes stayed in Homebase. A cloud
session cannot open Homebase (on 2026-11-06 the PC did not offer the folder to
cloud sessions), and one account cannot read the other's chats. So from here
this file is the record: any account on any machine can read it on GitHub.
Whatever is decided elsewhere is copied in here, and a new session reads this
file first.

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

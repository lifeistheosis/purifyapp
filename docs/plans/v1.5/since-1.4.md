# What we have done since 1.4

The running notes for 1.5. Everything on `main` after the 1.4 note was posted
(76c32e26, 2026-09-27), filed under the six categories of
`docs/UPDATE-HIERARCHY.md`, so the 1.5 note and its checklist can be written
from this file. Read from the commits themselves, not from memory.
Last brought up to date: 2026-10-04, at 734e02ca (81 commits). The 1.5 note
(`patch-note-1.5.json`) was written from this file on that day.

**Add to it as work lands.** One entry per change readers can see, under its
category, with the commit. Silent work goes in the last section.

## How to read an entry

- 📝 readers see it, so it can earn a line in the 1.5 note. 🤫 silent (admin,
  plumbing), never in the note.
- **Web** is purifyapp.net, which deploys from `main` on every push, so
  anything here is already live there unless the entry says otherwise.
- **Apps** are the iPhone, iPad and Android apps. They carry the static
  export they were built with, so a reader there sees these changes only
  with the 1.5 store builds. Server-side changes (prices, the feed, emails)
  reach installed apps at once, and the entry says so.
- **Gated** means a migration, a switch or a flag decides whether it is on.
  The note may not claim anything gated off (AGENTS.md, release ritual 4).

---

## 🐛 Bugs and Maintenance (fixes)

- 📝 **Reader settings on phones.** The Reader pill's popover started halfway
  across a phone and ran off the right edge (reported on Android, John 1).
  Phones now get one full-width sheet, and the gear in the top bar opens the
  same sheet: size, font, spacing, reading mode, Focus and Interlinear. Sizes
  show as the letter A at each size instead of S M L X. `c4577039`, 09-27.
- 📝 **Google profile pictures on Android.** Google answered 429 to pictures
  requested from the Android app, so most Google readers showed a broken
  picture there. They now go through our own domain, which fixed installed
  apps without an update. `deeaf7d9`, 09-27.
- 📝 **No red ring after a click.** The focus ring was the red accent and
  showed after ordinary clicks on desktop. It is now the page's own ink, for
  keyboard use only. `a5ebe400`, 09-28.
- 📝 **"Chat" on the phone tab bar.** "Community" was squeezed to an ellipsis
  at a phone's width; the phone tab says Chat, the desktop keeps Community.
  All 21 languages. `0dbf5ae5`, 09-28.
- 📝 **Windows app 1.4.1.** A 1.4.0 install would not open
  (WebView2Loader.dll missing). 1.4.1 ships the file, and Download for
  Windows points at it. Released as `desktop-v1.4.1`. `f7063b0d`, 09-28.
- 📝 **One top bar on a phone's browser.** On the web, the site header
  covered the reader's own bar once scrolled, taking search, the bookmark and
  the reader settings with it (the owner's screenshot, Luke 10). Below tablet
  width the page's bar is now the only bar, with the site menu inside it, and
  the verse counter sits under the chapter title. Web only; desktop
  unchanged. `975d91e6`, 10-01.
- 📝 **Strong's definitions restored.** 166 of the 5,523 Greek definitions
  were cut, misplaced or missing words, an upstream fault in the 1.3 import.
  Rebuilt from the Open Scriptures XML; 5,520 now read as a verbatim run of
  Strong's text. `1df3d073`, 09-30.
- 📝 **Strong's cross-references read as Greek.** "(with G3588 (ὁ))" now reads
  "(with ὁ G3588)", in the Greek face, and the definition has its own line.
  `f2e6efb4`, 10-01.
- 📝 **The front page's down arrow nudges again** when Purify's motion is on.
  `3bc7dc2d`, 10-01.
- 📝 **Community is quick.** A like answers at once and quick taps become one
  save; a profile opens in about 0.2 s with the name already drawn (was 1.1
  to 1.3 s); a feed poll that changes nothing costs no main thread; the blur
  behind a sheet covers only what shows, and emoji are drawn by the device's
  own fonts, which took an open profile from about 20 frames a second to 60
  on a slowed phone. The profile card no longer moves when its tabs switch.
  `fbfa004b`, `998118bd`, `c3723787`, 10-02.
- 📝 **Counts in every language.** The singular reply, unread and days-left
  lines in six languages now carry the number, so 21 replies no longer reads
  as 1 in Russian. `9f1ccdbb`, 10-02.
- 📝 **Sync brings everything to a new device.** The API answers at most
  1,000 rows a request and says nothing when it stops. A reader with more
  than a thousand notes, bookmarks, gathered passages or prayer marks got a
  thousand of them on a new phone; nothing was lost on the server, it never
  arrived. Every such read now goes in pages. `17e00a3a`, `5666247d`, 10-04.
- 📝 **Your files leave with your account, and their addresses do not name
  you.** Deleting an account now deletes the reader's pictures, banner and
  review photos. Profile pictures, Kitchen photos and campaign pictures are
  stored on random paths, so a public address no longer carries the reader's
  id. Their SQL was run by hand on 10-03. `854709c4`, `51e1042c`,
  `d32895d4`, `d9a2333d`, 10-03.
- 📝 **The Premium pill's star** drew nothing on phones; it is drawn in CSS
  now, and its glow no longer repaints every frame. `bc47d3e6`, 10-02.
- 🤫 **The share page for a profile** reads its dates in UTC, so it hydrates.
  `e0080e57`, 10-02.
- 📝/🤫 **Push notifications.** On 2026-09-27 production had 135 iPhones
  registered and none ever reached. Delivery now tries Apple's production
  service and then the sandbox before judging a phone, never deletes tokens
  until it has delivered one push, and names the reason for every failure in
  the admin. Android notifications go out at high priority to a "purify"
  channel, which the 1.5 Android build creates, with a cross in the status
  bar. **Gated:** whether iPhones now receive anything depends on the APNs
  key and `APNS_PRODUCTION` on Render; not verified. `39e46291`, 09-27.
- 🤫 **Reader focus** no longer starts a transition on every chapter load,
  which raised an uncaught error in development. `eb5391e4`, 09-29.

## ✨ New Saint Additions (saints)

- 📝 **St. Arsenius the Great has an icon:** the fourteenth-century mosaic in
  the Pammakaristos, Constantinople, CC0 from Wikimedia Commons, with its
  rights row recorded. His card had shown the placeholder. The picture sent
  in was St. Arsenius of Tver, a different saint, so it was not used.
  `8be2a3d3`, 09-28.

No new lives, saints or hymns since 1.4. One icon is enough to file the
category as shipped; that is the owner's call at release.

## 📖 Library Experience (library)

- 📝 **Walking with Job.** A guided walk through all 42 chapters: the Brenton
  Septuagint with context cards where a verse needs one (133 notes, 102 of
  them carrying a line from St. Gregory the Great's Morals, each checked word
  for word against the corpus), and a closing synthesis per chapter. The book
  page draws the walk as a road. Progress and the private ledger stay on the
  device. Live on the web since 09-29; apps with 1.5. The notes ship without
  per-note clergy review by the owner's exception, held by the verbatim
  tests (`docs/editorial-standards.md`). `ac3929fb`, `89848a90`, 09-29.
- 📝 **The Septuagint's Greek beside the Old Testament.** The interlinear now
  reaches the Old Testament: Swete's Greek beside Brenton's English, paired
  only where the verses truly match (805 of the 1,048 chapters with Greek; a
  reader is told why the rest have none). `63d711d9`, 09-30.
- 📝 **Old Testament words linked to their Greek.** Tap or hover a Greek word
  and its English lights, and the other way round, as in the New Testament,
  across those 805 chapters. Learned by a word-alignment model on our own
  texts, no paid service; a word it is unsure of stays plain. `7fb33572`,
  10-01.
- 📝 **The adaptive first run.** Sign in, then three questions (how familiar,
  the calendar and fast for the practicing, what to focus on), then a Day 1
  step chosen from the answers. Settings gains Your space to change them.
  21 languages. `c67d974d`, 09-29.
- 📝 **Motion, one rule per platform** (the owner's decision for 1.5): the
  phone apps always animate unless the device is too slow; the Windows app
  has an Animations switch; the web follows the browser and says so once,
  with Turn on or Keep off. `8b303399`, 09-29.
- 📝 **Every pop-up card follows the finger.** The Fathers' commentary sheet
  first (`2a1a80a8`, 09-29: movable, opens to 60% and pulls to full, the
  backdrop blurs in with it, each commentary opens as a readable preview),
  then every shared sheet: chapter picker, reader settings,
  cross-references, word study, Plus, filters, the confirm dialog and more.
  `ab31ad88`, 10-01.
- 📝 **Saved, Your reading and the Florilegium, redrawn** in the graphite
  look of the Prayer and Discover redesign, with one card per kind and dates
  in the reader's language. `a6fe48bc`, 09-28.
- 📝 **Saints: one line of filters.** The kinds scroll sideways in one row,
  and the centuries are a timeline whose bars show where the saints gather.
  `42777861`, 09-28.
- 📝 **The Kitchen.** The Trapeza is now a recipe catalogue: today's fast
  with dishes that suit it, a photo for every one of the 17 house recipes
  (credited, CC licences checked), reviews with stars and photos, and a
  Kitchen tile on Discover. Its migrations were run by hand on 09-28.
  `ecc4d025`, `d8fb594f`, 09-28.
- 📝 **Discord asks once.** The Windows app now asks on first open whether
  to show Discord status, instead of leaving it off until found.
  `deeaf7d9`, 09-27.
- 📝 **The mobile website sends phones to the app** (web only): store
  buttons with real ratings, the app rising out of the hero, a "Purify is
  better in the app" card on the first move to another page, onboarding at
  sign-up. The phone front page is now three screens and the footer, each
  fitting one screen. `83d1dd28` 09-29, `d58a351d` 09-30.

## 🛒 Shop Additions (shop)

All live on the web and, because checkout prices on the server, honored in
the apps too; the apps show the new pages and prices with 1.5.

- 📝 **The shop redrawn:** one collection with each piece once, pieces in lit
  vitrines, a product page with the title first and a buy bar half its old
  height on phones, the cart and summary side by side on a computer.
  `49b0ab1e`, 09-30.
- 📝 **EIKON as a boutique:** an obsidian ground, an editorial spread, and
  each EIKON piece opening on its story. `c1d73c86`, 09-30.
- 📝 **The prayer corner set, 15% off.** An icon, a prayer rope and a cross
  from EIKON in one order take 15% off the three (today's set: $74.93 to
  $63.69). Verified live 10-02. `05cb95ff` 09-30, `58439dcb` 10-01.
- 📝 **10% off from three pieces,** and a cart that says what is next: how
  far from free shipping, how many more pieces to the 10%, the pieces that
  would finish a set and what they save. Nothing stacks. Verified live
  10-02. `58439dcb`, 10-01.
- 📝 **Feast drops:** in the three weeks before a great feast the shop has a
  matching piece for, the shop home carries the feast. `05cb95ff`, 09-30.
- 📝 **Offers beside an order:** one piece in the cart sized to the order,
  and one more on the thank-you page. `c1d73c86`, 09-30.
- 📝 **"Secure checkout by Stripe"** under the buy and checkout buttons.
  `4ddef2ee`, 09-30.
- 📝 **Emails:** a review request 10 to 40 days after delivery, once, asking
  only about pieces not yet reviewed (`05cb95ff`); the feast shop email now
  covers those feasts, two weeks ahead. A computer visitor leaving the shop
  is offered the New in the shop email, at most once a month (`4ef58858`).
  **Gated:** the cart notes (a day after a cart is left; when a cart deal
  opens) are off until switched on in Admin, Revenue.
- 📝 **The ambassador program,** invite only: an invited reader's link earns
  10% of the EIKON items it brings in, paid by Stripe. A first-party cookie
  holds only the code; the privacy page says so. Migrations run by hand on
  09-30. **Gated:** monthly automatic payouts are off until switched on.
  `4a21783e`, 09-30.

## 💎 Subscription Perks (perks)

- 📝 **Three study tools in Plus:** cross-references on New Testament verses
  (OpenBible.info, credited), the journal of every note you have written
  (/journal), and reading plans: the Psalter by kathisma, the Gospels a
  chapter a day, Proverbs in a month (/plans). Notes are now dated, and
  every note shows how long ago it was written. `7d3323ae`, 09-30.
- 📝 **The Greek word study (Plus):** every place a Greek word appears, in the
  Septuagint and the New Testament, with its forms marked. `63d711d9`, 09-30.
- 📝 **Plus profile looks:** a banner picture, a two-color theme, six avatar
  frames (shown in the feed too) and four profile effects. A lapsed
  subscription hides them and deletes nothing. `3c181c80`, 10-01.
- 📝 **Premium redrawn:** antique gold instead of yellow on every paywall,
  the Premium pill, and Plus features shown to everyone, marked Plus where
  locked, as the 1.4 note promised. `cdc90f0d`, `a4f14857`, 09-28.

- 📝 **Seasonal frames and effects (Plus):** Pascha, Nativity, Theophany and
  Dormition, put on only in their season and kept after. `fbfa004b`, 10-02.
- 📝 **Name colors, animated banners and a choice of which badges show
  (Plus).** `9f1ccdbb`, 10-02.

## 📈 Stats Updates (stats)

Counted at release, 2026-10-04: the library holds what 1.4 counted (158
saints, 78 books, 1,362 chapters, 36,667 verses), since no saint or book was
added. New since: Greek for 805 Old Testament chapters and 133 Job
walkthrough notes. The 1.5 note carries those two and the two totals.

## Community (no category of its own; 1.4 filed these as plain lines)

- 📝 **Profiles, after Discord's.** Tap a name or picture to open that
  reader's profile: banner, picture, status, @handle, badges, about, patron
  saint, favorite verse. Every reader has an @handle. Badges: Plus, Pro,
  Verified, Early Reader (joined before 2026-11-01), Ambassador, and given
  ones (Purify Team, Moderator, Beta Tester, Bug Hunter, Translator,
  Contributor). The composer folds to one line, long posts fold, Report and
  Block are one menu, delete asks first, and profiles can be reported.
  Migration live: every post in the public feed carries a handle (probed
  10-02). `3c181c80`, 10-01.
- 📝 **Part two: following, mentions, name days, prayers.** @mentions with
  suggestions and a notification for the person named; follow readers, with
  a Following filter, "Follows you" and an In common tab; a hover card on
  names on a computer; name days from the patron saint on the reader's own
  calendar, with "Many years!" once a year; "Pray for me" on a profile for
  two weeks, with "I prayed"; a parish line; earned badges (Psalter, Four
  Gospels, forty days of Lent, first shared line); a shareable /u/handle
  page (website only); opt-in "Now reading", private profiles, hidden posts
  and join date. Migration `20261002_community_social.sql`, live.
  `fbfa004b`, 10-02.
  **Gated:** Gift Plus from a profile is hidden until Render has
  `STRIPE_GIFT_PLUS_PRICE_ID` and `GIFT_PLUS_DAYS`. Not in the note.
- 📝 **Your picture stays yours, and a cropper.** An upload lived only in
  auth metadata, which Google rewrote at every Google sign-in.
  `profiles.avatar_url` holds it now. Pick a photo or a banner, then drag,
  pinch, scroll or slide it into place before it is saved. The same commit
  closes F-27: a reader could write any column of their own profile row from
  the browser. Migration `20261003_profile_pictures.sql`, live.
  `bc47d3e6`, 10-02.
- 📝 **The word filter.** Slurs and the most explicit words are masked; the
  writer is asked "Is this appropriate?" first, and a post sent anyway waits
  for a moderator. Handles and profile text with a listed word are refused.
  Migration `20261004_community_filter.sql`, live. `bc638ee5`, 10-02.
- 📝 **Part three: a safer room, the prayer wall, clergy.** A spam filter by
  trust level, with held links and money spam; reports from different
  readers add up and hide a post until a moderator looks; mute; moderators
  working the queue from /community/moderate on any device, with a log. The
  prayer wall; Amen, Praying and Glory to God beside the like; Discussed in
  Community on every Bible chapter; the day's feast thread, opened by
  @purify and pinned; Ask a Priest, answered by verified clergy, whose seal
  the team grants from the Verification tab; social links on a profile.
  Migration `20261005_community_three.sql`, live. `9f1ccdbb`, 10-02.
  **Gated:** Community notifications on a reader's devices wait for the push
  job (MASTER, A1 and A2), and the weekly Community email is a list that is
  off until a reader turns it on and a job that has not been seen to run.
  Neither is in the note.

## Streaks (plain lines in the note)

- 📝 **One red streak for all of Purify.** A day is kept by anything on the
  rhythm ledger, and now also by twenty seconds of a Bible chapter, a
  saint's life, a work of the Fathers or a lesson, and by a finished
  walkthrough chapter. A red flame and the count on Today, a streak sheet
  with the week, the best and the next badge, the flame and "23-day streak"
  beside the @handle with a switch to hide it, and badges at 7, 40 and 100
  days. From 6 pm an unkept day pulses. `20261006_streaks.sql`, run by hand
  by the owner on 10-02 (`86c203d1`). `d54e29b6`, 10-02.
  **Never told:** the hidden saves. The note does not name them, by the
  owner's brief; the save sheet is the only place a reader meets one.

## 🤫 Silent: admin and plumbing

- Admin, Shop: a fulfillment board with four lanes and drag and drop; EIKON
  low-stock alerts by pace of sale; average order split by store; checkouts
  walked away from and won back. `4ddef2ee`
- Admin, Revenue: net revenue retention by first-purchase month, customer
  cost against lifetime value, the deals and cart-notes manager. `4ef58858`
- Admin, Shop, Deals: the set and multi-buy switches and the margin-floor
  check. Admin, Badges: give and take badges. `58439dcb`, `3c181c80`
- Analytics: bots kept out of visit counts (a scraper had doubled 09-29's
  visits). `fdd975be`
- Email: the day's budget is 1,600, Resend Pro's monthly allowance spread
  over 31 days. `39e46291`
- Checkout refuses to open Stripe for an order whose lines failed to save
  (an old, unchecked insert). `58439dcb`
- Migration records: `68996388` (ambassadors, cart notes), `b9dc3004` (shop
  offers).

- Migrations: every file has a version of its own, the merge to `main` is
  what applies them, and a test guards the versions. `8e1b9e0d`, `2b005a3f`,
  `37911f58`, `040681fa`, `2a9672ce`
- Reads past 1,000 rows (F-31, F-38): the admin tabs, every send, Revenue,
  the ambassador payout, which now sends what it marks paid, and a seller's
  earnings, which add up every order. `33799e8d`, `17e00a3a`, `5666247d`,
  `c46a0c32`
- Admin, Engagement and Content: rollups in the database, a sample when the
  database runs out of time, the same 30 days on both tabs, each finished day
  counted once; five functions closed to the public key (F-32), with a test
  that refuses the next one left open. `fdb76758`, `6fc2a211`, `43f1fc44`,
  `df792fa9`, `734e02ca`
- Orders record when the money landed (`paid_at`, F-33), and the revenue
  calendar counts an order on the day it was paid. `a1350a53`, `201b66a8`
- Profile column grants (F-27), the banner delete (F-34), the files an
  account leaves (F-35), the profile picture path (F-36): in
  `docs/audit/findings.yaml`.
- Records of SQL the owner ran by hand and of deploys seen live: `86c203d1`,
  `6027fa18`, `bdcf393b`, `011ee856`, `9375a6fe`, `d1e394d1`, `afb5f1e6`,
  and the ledger commits between them.

## Carried from 1.4: changed then, never told

- **The licensed Bible is off.** NIV, NKJV and NLT came through API.Bible
  under a non-commercial licence; they were switched off on 09-26
  (`d1666719`), two days before the 1.4 note, and the note does not say so.
  Readers who chose one now read a public-domain text. The owner's call
  whether 1.5 says it.

## Planned for 1.5 on 2026-10-02, not in this release

The programme (`MASTER.md`) put the 1.5 builds at Nov 3 to 5. The owner
called the release on 2026-10-04 with what is live, so these wait for the
next one: October and Nativity saints with the saint card, "Add a saint" on
posts, the Top sort, the translator, the Nativity Fast companion (hard date
Nov 15: its store builds must be approved before then), the year in review,
Plus reading mode, the missing prayers, and the three switches (the iPhone
push key, the reminder job, Gift Plus).

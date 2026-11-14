# Purify 1.9: the drop

Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this
file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.

Keep a journal by the Church's day, and go deeper into every verse. Covers 1.9, carried by the 1.9 builds (Android 0, iOS 0).

## The day

No drop day set yet. `node scripts/drop.mjs days` lists the next ones on the Church's calendar.

## What the release is

- 📓 **Your journal, by the Church's day.** Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.
- 📖 **Every verse, opened.** Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
- 🌍 **Seven more Bibles.** The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: Arabic, Spanish and Portuguese.
- 🔎 **Study a verse, in Purify Plus.** Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.
- 🗓️ **New reading plans, in Purify Plus.** John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.
- ☦️ **The Creed by council.** The Symbol of Faith article by article, with the words the Council of Constantinople added lit.
- 📜 **Church history on Today.** On the days an event of Orthodox History fell, it is on Today under the saint of the day.
- 🌿 **The Florilegium and the Thread.** In Purify Plus, your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps.
- 🕯️ **Candlelight and ambience.** In Purify Plus, Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once.
- 📱 **Remember the verse on your home screen.** A widget keeps your verse on your home screen, the same for every reader. *(in the apps only)*

Also:

- Share a journal page as a copy at a link of its own: three a month for everyone, without limit in Purify Plus, and Stop sharing takes the copy down at once.
- Listening offline, in Purify Plus: each book's size shown before you save it, and saving that waits for Wi-Fi and picks up after a lost signal.
- Psalms 113 to 115 are divided as the Septuagint divides them, and your notes, highlights and saved verses move with their verses.
- The plans page keeps your place and puts the season's plan at the top.
- Orthodox History shows its great events as large cards, and every picture for every reader.
- Listening: one card at rest and a small pill as you scroll, and your place kept in every book.
- The day's prayer hours no longer fade, and every field's hint is easier to read.
- Every EIKON order now comes with a month of Purify Plus: once it is delivered, claim it at purifyapp.net/gift with your order number and ZIP code. If you already have Plus, you can claim it once yours ends.
- Ambient sounds now play on iPhone, where they never played before, even with Purify Plus.

## What may not be said

- "every work has a cover": the covers pack for the reading room is not in yet
- "Find a parish": the parish directory is not built
- "phone voice": the choice of voices, Heart or the phone's own voices, is in 1.9 at his word (note 25, "Both", 2026-11-13) and his yes to its page ("all recs", about 18:53 UTC), pushed 8c1e2bb6, but the 1.9 note has no line for it yet: no piece names it until the note does (a line drafted for the arbiter, 2026-11-14). Kokoro, the voice to download, parked for 2.0 on 2026-11-11, is not in 1.9
- "phone's voice": the same: the 1.9 note has no line for the phone's own voices yet
- "campaign": prayer campaigns are at testers from the merge, his account alone (lib/campaigns/flags.ts), and open for every reader only at R5c (OWNER-STEPS); until the step below brings their line into the 1.9 note, no piece names them (the arbiter, 2026-11-11 and 2026-11-12)
- "Galilee": the sea look Galilee came out of the app at his word of 2026-11-13 ("remove the sea theme", then "Both"; 701ed3dc)
- "Patmos": the sea look Patmos came out with Galilee (701ed3dc)
- "nineteen reading modes": the first count, before Galilee, Patmos and Desert came out (701ed3dc, 62e5a337): there are sixteen reading modes, Candlelight, Monastery and fourteen looks (lib/reader/readingModes.ts, counted 2026-11-14), as the app's own Plus lines say, and a piece that counts says sixteen
- "19 reading modes": the same first count, in figures
- "seventeen reading modes": the count after Galilee and Patmos came out (701ed3dc) and before Desert did (62e5a337): there are sixteen reading modes, Candlelight, Monastery and fourteen looks (lib/reader/readingModes.ts, counted 2026-11-14), as the app's own Plus lines say, and a piece that counts says sixteen
- "17 reading modes": the same count, in figures
- "Desert look": Desert came out of the app at his word ("all recs", 2026-11-13 about 14:29 UTC), pushed with the land looks (62e5a337): a stored Desert wears Roses
- "seventeen looks": the first count of looks, before Galilee, Patmos and Desert came out: there are fourteen looks (62e5a337)
- "17 looks": the same first count of looks, in figures
- "fifteen looks": the count of looks after Galilee and Patmos came out and before Desert did: there are fourteen (62e5a337)
- "15 looks": the same count of looks, in figures

## The notes

- 1.9: written

## Before anything goes out

*First, so every link leads to the right note.*

### The 1.9 note

`note-1.9` · The note in the app · Admin, Patch notes · Yours · Not filed yet

~~~text
Accept it in Admin, Patch notes. Until the notes are accepted, What's New shows the release before this one, and there is no release email to send.
~~~

### Bring the accepted notes back into the app

`step-pull-notes` · A step · Ours, on your word · To do

~~~text
After the notes are accepted, or edited in Admin: node scripts/patch-notes.mjs pull --apply, then commit. The apps carry the files and never the tables, so an edit that is only in Admin is not in a build.
~~~

### Everything in 1.9, in one note

`notes-all` · Every line of the release, in one note · Wherever the whole list is wanted · Ready

> Written out from the notes themselves each time the kit is made.

## With the store submissions

*When the builds are handed to Apple and Google.*

Each build is walked on a real phone before it goes to its store, from [docs/PHONE-WALK.md](../../PHONE-WALK.md):

- Android not walked yet
- iPhone not walked yet

### What's new, for Google Play

`play-whats-new` · Google Play, What's new · Play Console, the release, Release notes · Ready · 465 of 500 characters

~~~text
Purify 1.9: Keep a journal by the Church's day, and go deeper into every verse.

• A journal by the Church's day
• Hold a verse to open it
• Seven more Bibles to download
• Plus: study, Compare and Remember the verse
• Plus: new reading plans
• The Creed by council
• This day in Church history
• Plus: the Florilegium and the Thread
• Plus: Candlelight and ambience
• A Remember the verse widget

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### What's New in This Version, for the App Store

`appstore-whats-new` · App Store, What's New in This Version · App Store Connect, the version, What's New in This Version · Ready · 2726 of 4000 characters

> Plus has been sold on iPhone since 1.8 (the App Store lists its four subscriptions; OWNER-STEPS 87, found 2026-11-10), so this text marks what is in Purify Plus, as the Play text does: the study, the plans, the Florilegium and the Thread, Candlelight and ambience, and listening offline.

~~~text
Purify 1.9: Keep a journal by the Church's day, and go deeper into every verse.

Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings seven more Bibles to download.

YOUR JOURNAL, BY THE CHURCH'S DAY
Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.

EVERY VERSE, OPENED
Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.

SEVEN MORE BIBLES
The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: the Arabic Van Dyck, Spanish Reina-Valera and Portuguese Almeida.

STUDY A VERSE
Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps. In Purify Plus.

NEW READING PLANS
John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day. In Purify Plus.

THE CREED BY COUNCIL
The Symbol of Faith article by article, with the words the Council of Constantinople added lit.

CHURCH HISTORY ON TODAY
On the days an event of Orthodox History fell, it is on Today under the saint of the day.

THE FLORILEGIUM AND THE THREAD
Your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps. In Purify Plus.

CANDLELIGHT AND AMBIENCE
Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once. In Purify Plus.

REMEMBER THE VERSE ON YOUR HOME SCREEN
A widget keeps your verse on your home screen, the same for every reader.

ALSO
• Share a journal page as a copy at a link of its own: three a month for everyone, without limit in Purify Plus, and Stop sharing takes the copy down at once.
• Listening offline, in Purify Plus: each book's size shown before you save it, and saving that waits for Wi-Fi and picks up after a lost signal.
• Psalms 113 to 115 are divided as the Septuagint divides them, and your notes, highlights and saved verses move with their verses.
• The plans page keeps your place and puts the season's plan at the top.
• Orthodox History shows its great events as large cards, and every picture for every reader.
• Listening: one card at rest and a small pill as you scroll, and your place kept in every book.
• Ambient sounds now play on iPhone, where they never played before, even with Purify Plus.
• The day's prayer hours no longer fade, and every field's hint is easier to read.

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### Promotional text, for the App Store

`appstore-promo` · App Store, promotional text · App Store Connect, the version, Promotional Text · Ready · 149 of 170 characters

> This one can be changed at any time without a new review.

~~~text
Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings seven more Bibles to download.
~~~

### Submit both builds for review

`step-submit` · A step · Yours · To do

~~~text
Android build 0 in Play Console, iOS build 0 in App Store Connect, each once it has been walked on a phone (docs/PHONE-WALK.md).
~~~

## The announcement

*The day you tell people, once the note is showing on the website.*

### The announcement

`discord-announcement` · Discord · Discord, #announcements · Ready · 1981 of 2000 characters

~~~text
Purify 1.9 is here 🕯️

Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings seven more Bibles to download.

📓 Your journal, by the Church's day. Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.
📖 Every verse, opened. Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
🌍 Seven more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: the Arabic Van Dyck, Spanish Reina-Valera and Portuguese Almeida.
🔎 Study a verse, in Purify Plus. Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.
🗓️ New reading plans, in Purify Plus. John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.
☦️ The Creed by council. The Symbol of Faith article by article, with the words the Council of Constantinople added lit.
📜 Church history on Today. On the days an event of Orthodox History fell, it is on Today under the saint of the day.
🌿 The Florilegium and the Thread. In Purify Plus, your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps.
🕯️ Candlelight and ambience. In Purify Plus, Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once.

The Scriptures, the saints, the prayers and the calendar stay free.

Read the whole note: https://purifyapp.net/whats-new

The iPhone, iPad and Android apps get 1.9 once the stores approve the new builds. We will say so here when they do.
📱 Remember the verse on your home screen. A widget keeps your verse on your home screen, the same for every reader.
~~~

### The short one

`discord-short` · Discord · Discord, #general or a ping · Ready · 202 of 2000 characters

~~~text
Purify 1.9 is live on the web: a journal by the Church's day, every verse opened to its Greek, and seven more Bibles to download. The apps follow once the stores approve. https://purifyapp.net/whats-new
~~~

### Purify's own post in Community

`community-post` · Purify's own post in Community · Community, signed in as Purify · Ready · 2299 of 4000 characters

~~~text
Purify 1.9 is here

Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings seven more Bibles to download.

📓 Your journal, by the Church's day. Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.
🔗 Share a journal page as a copy at a link of its own: three a month for everyone, without limit in Purify Plus, and Stop sharing takes the copy down at once.
📖 Every verse, opened. Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
🌍 Seven more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: the Arabic Van Dyck, Spanish Reina-Valera and Portuguese Almeida.
🔎 Study a verse, in Purify Plus. Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.
🗓️ New reading plans, in Purify Plus. John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.
☦️ The Creed by council. The Symbol of Faith article by article, with the words the Council of Constantinople added lit.
📜 Church history on Today. On the days an event of Orthodox History fell, it is on Today under the saint of the day.
🌿 The Florilegium and the Thread. In Purify Plus, your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps.
🕯️ Candlelight and ambience. In Purify Plus, Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once.
🎁 Every EIKON order now comes with a month of Purify Plus: once it is delivered, claim it at purifyapp.net/gift with your order number and ZIP code. If you already have Plus, you can claim it once yours ends.

The Scriptures, the saints, the prayers and the calendar stay free.

The iPhone, iPad and Android apps get 1.9 once the stores approve the new builds.
📱 Remember the verse on your home screen. A widget keeps your verse on your home screen, the same for every reader.

Tell us what you find, and what breaks. We read everything.
~~~

### Change the Purify account's own status

`step-profile-status` · A step · Yours · To do

~~~text
The Purify account's profile status still announces 1.8, and it is the first line a reader sees on that profile. It is live, in no file of the repository, so no build changes it. With the Community post, signed in as Purify: Edit profile, Status (60 characters at most), and put a 1.9 line in your own words, or clear it. If you want one ready, 41 of its 60: "Purify 1.9: a journal by the Church's day".
~~~

### Prayer campaigns join the note only when they open for every reader

`step-campaigns-line` · A step · Ours, on your word · Waits

Waits on: R5c: your word "open campaigns", after your walk (OWNER-STEPS)

~~~text
Campaigns are at testers from the merge, your account alone. Only at R5c, in the push that opens them for every reader, and not before: add this line to the 1.9 note, in data/changelog/entries.json and docs/plans/v1.9/patch-note-1.9.json, under the library: "Prayer campaigns: ask others to pray with you for someone, living or reposed, for the days you choose, up to forty. Those who join carry the name in their prayers, with a psalm if the campaign names one. Every campaign is read before it is public." It names no pictures while those are off in the store builds. Then Admin, Releases, Patch notes: Put them in the queue, and Accept. Then take "campaign" off this drop's never list; from then the board, the letter, the cards and the video's captions may name them, and the 1.9 video may go out.
~~~

## The day a store has it

*Each store on its own day, when it shows the version.*

### Tell installed apps there is a newer build

`step-update-prompt` · A step · Ours, on your word · To do

~~~text
When a store shows 1.9: its number goes into lib/appUpdate/release.ts (Android 0, iOS 0), committed and pushed on the owner's word. Each store on its own day, and never before the store is serving the build.
~~~

### The board message above the notes

`board` · The weekly board · Admin, Patch notes, the board message · Ready · 472 of 900 characters

> Eyebrow: This week at Purify. The first line is the headline, the rest is the body. It names only what is free, so it reads true on every device. Publish it in Admin the day a store first serves 1.9, and not before: the 1.8 apps show the newest board message, so a reader on 1.8 would otherwise read "1.9 is here" before they can have it (the arbiter, 2026-11-12).

~~~text
1.9 is here

Keep a journal by the Church's day: today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Free for everyone.
Hold any verse to see its Greek, and download seven more Bibles, in Russian, Greek, Serbian, English, Arabic, Spanish and Portuguese.
The Creed by council sets the Symbol of Faith out article by article, and on the days an event of Orthodox History fell, it is on Today under the saint of the day.
The full note is below.
~~~

### In the stores

`discord-stores` · Discord · Discord, #announcements · Ready · 687 of 2000 characters

> If one store approves first, post for that store alone and name it.

~~~text
Purify 1.9 is in the App Store and on Google Play 📱

Update Purify to get it inside the app:
• A journal by the Church's day
• Hold a verse to open it
• Seven more Bibles to download
• Plus: study, Compare and Remember the verse

📱 Remember the verse on your home screen. A widget keeps your verse on your home screen, the same for every reader.

🎁 Every EIKON order now comes with a month of Purify Plus: once it is delivered, claim it at purifyapp.net/gift with your order number and ZIP code. If you already have Plus, you can claim it once yours ends.

App Store: https://apps.apple.com/app/id6798897857
Google Play: https://play.google.com/store/apps/details?id=net.purifyapp.purify
~~~

### The release email

`email-release` · The release email · Admin, Email, the release email · To do

> It needs the release's note accepted. Before a store has the build it describes things a reader in the app cannot open yet.

~~~text
Its words are in lib/whatsNew/releaseEmail.ts, so the email that is read is the email that is sent. Read it first: node scripts/release.mjs email. Send it from Admin, Email, in place of that week's Sunday email.
~~~

### A letter to people who should hear it from you

`letter` · A letter from your own mail · Your own mail, one address at a time or in BCC · Ready

~~~text
Purify 1.9 is out

[Name],

Purify 1.9 is out, on purifyapp.net and in the stores. It keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings seven more Bibles to download.

What is new, briefly:
- Your journal, by the Church's day. Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.
- Every verse, opened. Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
- Seven more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: the Arabic Van Dyck, Spanish Reina-Valera and Portuguese Almeida.
- Study a verse, in Purify Plus. Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.
- Every EIKON order now comes with a month of Purify Plus: once it is delivered, claim it at purifyapp.net/gift with your order number and ZIP code. If you already have Plus, you can claim it once yours ends.

The Scriptures, the saints, the prayers and the calendar stay free.

If anything in Purify is wrong, or could serve you better, tell us. We read everything.

Edgar, the Purify Team
purifyapp.net
~~~

### The release cards

`cards` · The cards · Instagram and TikTok, from the files · Waits

Waits on: the set made again from this drop's words on the export the gate passes: cards 01 and 04 say six Bibles, where the drop now says seven, and every screen is from 6633b789, before any round of the fifteen screens was applied (node docs/plans/v1.9/store/cards/cards.mjs, no design work, then node scripts/drop.mjs cards docs/plans/v1.9/store/cards/stills)

> The set he said yes to ("yes to all", 2026-11-13 about 20:47 UTC): six stills, 1080 by 1920, in docs/plans/v1.9/store/cards/stills (01-cover, 02-journal, 03-verse, 04-bibles, 05-study, 06-close), every word read from this drop by cards.mjs, the small copies in docs/plans/v1.9/cards/. No card shows Galilee, Patmos or Desert, which came out (701ed3dc, 62e5a337); Holy Mountain, Forest and Jordan may be shown as reworked, at his yes (build 95, note 16).

### The 1.9 video: the app's own screens and taps, prayer campaigns among them

`video` · The video · TikTok, Reels or Shorts, from the file · Waits

Waits on: prayer campaigns open to every reader (release day's step 3, R5c, your word), and the video itself, which a Fable chat makes by his word of 2026-11-13

> It shows prayer campaigns (his word, 2026-11-13 about 07:21 UTC: "add the prayer campaigns to the video"), so it goes out only once they are open to every reader, never while they are at testers. No frame shows Galilee, Patmos or Desert, which came out (701ed3dc, 62e5a337); Holy Mountain, Forest and Jordan may be shown as reworked, at his yes (build 95, note 16). Its captions are written when campaigns may be named, with the step that takes "campaign" off the never list.

### The caption for the cards, on Instagram

`instagram-caption` · Instagram caption · Instagram, the caption · Ready · 308 of 2200 characters

~~~text
Purify 1.9 is here. Your journal, by the Church's day. Every verse, opened. Seven more Bibles. Study a verse, in Purify Plus. The Scriptures, the saints, the prayers and the calendar stay free. Find Purify: Orthodox Hub on the App Store and on Google Play. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

### The caption for the cards, on TikTok

`tiktok-caption` · TikTok caption · TikTok, the caption · Ready · 188 of 2200 characters

~~~text
Purify 1.9 is here: a journal by the Church's day, hold a verse to open it and seven more Bibles to download. Find Purify: Orthodox Hub. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

## A few days later

*Once most phones have updated.*

### A notification to every reader

`push` · A notification · Admin, Push · Ready · 96 of 300 characters

> Opens /whats-new. A notification may carry no digits, so it cannot name the version. Send yourself one first.

~~~text
A journal by the Church's day

Keep a journal by the Church's day, hold any verse to see its Greek, and read seven more Bibles.
~~~

### Try this first

`discord-try` · Discord · Discord, a thread under the announcement · Ready · 645 of 2000 characters

~~~text
Three things to try in 1.9:

1. Your journal, by the Church's day. Today's page shows the feast or saints and readings, each with a pen to begin a page. Add verse cards and highlights, export it, or print it on the website. Free for everyone.
2. Every verse, opened. Hold a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
3. Seven more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, the World English Bible, and three labelled Protestant: the Arabic Van Dyck, Spanish Reina-Valera and Portuguese Almeida.

Tell us what you find, and what breaks. We read everything.
~~~

## A week later: the numbers

*Once the release has had its first week.*

- Not read out yet.

### The first week's numbers

`numbers` · Read-only SQL · Supabase, the SQL editor · Yours · To do

> Run it in Supabase and read us the rows: we keep them in your words with node scripts/drop.mjs numbers 1.9 --words "...". It only reads. Written out from lib/drop/numbers.ts each time the kit is made, so it counts this drop's own week. Which version an app is on is not in the database: Play Console and App Store Connect show that.

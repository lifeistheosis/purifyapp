# Purify 1.9: the drop

Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this
file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.

Keep a journal by the Church's day, and go deeper into every verse. Covers 1.9, carried by the 1.9 builds (Android 0, iOS 0).

## The day

No drop day set yet. `node scripts/drop.mjs days` lists the next ones on the Church's calendar.

## What the release is

- 📓 **Your journal, by the Church's day.** Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.
- 📖 **Every verse, opened.** Tap a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
- 🌍 **Five more Bibles.** The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck and Spanish Reina-Valera, both Protestant and labelled so.
- 🔎 **Study a verse, in Purify Plus.** Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.
- 🗓️ **New reading plans, in Purify Plus.** John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.
- ☦️ **The Creed by council.** The Symbol of Faith article by article, with the words the Council of Constantinople added lit.
- 📜 **Church history on Today.** On the days an event of Orthodox History fell, it is on Today under the saint of the day.
- 🌿 **The Florilegium and the Thread.** In Purify Plus, your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps.
- 🕯️ **Candlelight and ambience.** In Purify Plus, Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once.
- 📱 **Remember the verse on your home screen.** A widget keeps your verse on your home screen, the same for every reader. *(in the apps only)*

Also:

- Listening offline, in Purify Plus: each book's size shown before you save it, and saving that waits for Wi-Fi and picks up after a lost signal.
- Psalms 113 to 115 are divided as the Septuagint divides them, and your notes, highlights and saved verses move with their verses.
- The plans page keeps your place and puts the season's plan at the top.
- Orthodox History shows its great events as large cards, and every picture for every reader.
- Listening: one card at rest and a small pill as you scroll, and your place kept in every book.
- The day's prayer hours no longer fade, and every field's hint is easier to read.

## What may not be said

- "a month": the sharing limit's wording (three shared pages a month for everyone, without limit in Purify Plus) waits on his item 93
- "chants offline": keeping chants offline (rec 8) is not built
- "tour": the 1.9 What's New tour is not built
- "earned theme": the earned themes (rec 79) are not built
- "earned palette": the earned palettes (rec 79) are not built
- "every work has a cover": the covers pack for the reading room is not in yet
- "Find a parish": the parish directory is not built

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

`play-whats-new` · Google Play, What's new · Play Console, the release, Release notes · Ready · 463 of 500 characters

~~~text
Purify 1.9: Keep a journal by the Church's day, and go deeper into every verse.

• A journal by the Church's day
• Tap a verse to open it
• Five more Bibles to download
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

`appstore-whats-new` · App Store, What's New in This Version · App Store Connect, the version, What's New in This Version · Ready · 2348 of 4000 characters

> On iPhone every feature is free, as App Review was told (docs/app-store-review-notes.md), so this text names no Purify Plus. If 87 is done and Plus sells on iPhone before R5, put "in Purify Plus" back on the study, plans, Florilegium, Candlelight and listening lines, as the Play text has them.

~~~text
Purify 1.9: Keep a journal by the Church's day, and go deeper into every verse.

Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings five more Bibles to download.

YOUR JOURNAL, BY THE CHURCH'S DAY
Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.

EVERY VERSE, OPENED
Tap a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.

FIVE MORE BIBLES
The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck and Spanish Reina-Valera, both Protestant and labelled so.

STUDY A VERSE
Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.

NEW READING PLANS
John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.

THE CREED BY COUNCIL
The Symbol of Faith article by article, with the words the Council of Constantinople added lit.

CHURCH HISTORY ON TODAY
On the days an event of Orthodox History fell, it is on Today under the saint of the day.

THE FLORILEGIUM AND THE THREAD
Your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps.

CANDLELIGHT AND AMBIENCE
Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once.

REMEMBER THE VERSE ON YOUR HOME SCREEN
A widget keeps your verse on your home screen, the same for every reader.

ALSO
• Listening offline: each book's size shown before you save it, and saving that waits for Wi-Fi and picks up after a lost signal.
• Psalms 113 to 115 are divided as the Septuagint divides them, and your notes, highlights and saved verses move with their verses.
• The plans page keeps your place and puts the season's plan at the top.
• Orthodox History shows its great events as large cards, and every picture for every reader.
• Listening: one card at rest and a small pill as you scroll, and your place kept in every book.
• The day's prayer hours no longer fade, and every field's hint is easier to read.

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### Promotional text, for the App Store

`appstore-promo` · App Store, promotional text · App Store Connect, the version, Promotional Text · Ready · 148 of 170 characters

> This one can be changed at any time without a new review.

~~~text
Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings five more Bibles to download.
~~~

### Submit both builds for review

`step-submit` · A step · Yours · To do

~~~text
Android build 0 in Play Console, iOS build 0 in App Store Connect, each once it has been walked on a phone (docs/PHONE-WALK.md).
~~~

## The announcement

*The day you tell people, once the note is showing on the website.*

### The board message above the notes

`board` · The weekly board · Admin, Patch notes, the board message · Ready · 449 of 900 characters

> Eyebrow: This week at Purify. The first line is the headline, the rest is the body. It names only what is free, so it reads true on every device.

~~~text
1.9 is here

Keep a journal by the Church's day: today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Free for everyone.
Tap any verse to see its Greek, and download five more Bibles, in Russian, Greek, Serbian, Arabic and Spanish.
The Creed by council sets the Symbol of Faith out article by article, and on the days an event of Orthodox History fell, it is on Today under the saint of the day.
The full note is below.
~~~

### The announcement

`discord-announcement` · Discord · Discord, #announcements · Ready · 1934 of 2000 characters

~~~text
Purify 1.9 is here 🕯️

Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings five more Bibles to download.

📓 Your journal, by the Church's day. Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.
📖 Every verse, opened. Tap a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
🌍 Five more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck and Spanish Reina-Valera, both Protestant and labelled so.
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

`discord-short` · Discord · Discord, #general or a ping · Ready · 201 of 2000 characters

~~~text
Purify 1.9 is live on the web: a journal by the Church's day, every verse opened to its Greek, and five more Bibles to download. The apps follow once the stores approve. https://purifyapp.net/whats-new
~~~

### Purify's own post in Community

`community-post` · Purify's own post in Community · Community, signed in as Purify · Ready · 1801 of 4000 characters

~~~text
Purify 1.9 is here

Purify 1.9 keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings five more Bibles to download.

📓 Your journal, by the Church's day. Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.
📖 Every verse, opened. Tap a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
🌍 Five more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck and Spanish Reina-Valera, both Protestant and labelled so.
🔎 Study a verse, in Purify Plus. Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.
🗓️ New reading plans, in Purify Plus. John in 21 days, Acts in 28 days, the New Testament in a year, the Nativity Fast and Holy Week, with the Fathers nearly every day.
☦️ The Creed by council. The Symbol of Faith article by article, with the words the Council of Constantinople added lit.
📜 Church history on Today. On the days an event of Orthodox History fell, it is on Today under the saint of the day.
🌿 The Florilegium and the Thread. In Purify Plus, your gatherings as cards and a line from them on Today, and the Thread walks 35 events of Orthodox History on their maps.
🕯️ Candlelight and ambience. In Purify Plus, Candlelight lights the lines you are reading and can come on at Vespers, and ambience plays two sounds at once.
📱 Remember the verse on your home screen. A widget keeps your verse on your home screen, the same for every reader.

The Scriptures, the saints, the prayers and the calendar stay free.

Tell us what you find, and what breaks. We read everything.
~~~

## The day a store has it

*Each store on its own day, when it shows the version.*

### Tell installed apps there is a newer build

`step-update-prompt` · A step · Ours, on your word · To do

~~~text
When a store shows 1.9: its number goes into lib/appUpdate/release.ts (Android 0, iOS 0), committed and pushed on the owner's word. Each store on its own day, and never before the store is serving the build.
~~~

### In the stores

`discord-stores` · Discord · Discord, #announcements · Ready · 475 of 2000 characters

> If one store approves first, post for that store alone and name it.

~~~text
Purify 1.9 is in the App Store and on Google Play 📱

Update Purify to get it inside the app:
• A journal by the Church's day
• Tap a verse to open it
• Five more Bibles to download
• Plus: study, Compare and Remember the verse

📱 Remember the verse on your home screen. A widget keeps your verse on your home screen, the same for every reader.

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

Purify 1.9 is out, on purifyapp.net and in the stores. It keeps a journal with you by the Church's day, free for everyone, opens every verse to its Greek, and brings five more Bibles to download.

What is new, briefly:
- Your journal, by the Church's day. Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.
- Every verse, opened. Tap a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
- Five more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck and Spanish Reina-Valera, both Protestant and labelled so.
- Study a verse, in Purify Plus. Cross-references into the Septuagint, the Greek of every word, Compare across your Bibles, and Remember the verse in three steps.

The Scriptures, the saints, the prayers and the calendar stay free.

If anything in Purify is wrong, or could serve you better, tell us. We read everything.

Edgar, the Purify Team
purifyapp.net
~~~

### The release cards

`cards` · The cards · Instagram and TikTok, from the files · Waits

Waits on: the card set has not been made yet (purify-ads, the social team)

### The caption for the cards, on Instagram

`instagram-caption` · Instagram caption · Instagram, the caption · Ready · 307 of 2200 characters

~~~text
Purify 1.9 is here. Your journal, by the Church's day. Every verse, opened. Five more Bibles. Study a verse, in Purify Plus. The Scriptures, the saints, the prayers and the calendar stay free. Find Purify: Orthodox Hub on the App Store and on Google Play. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

### The caption for the cards, on TikTok

`tiktok-caption` · TikTok caption · TikTok, the caption · Ready · 186 of 2200 characters

~~~text
Purify 1.9 is here: a journal by the Church's day, tap a verse to open it and five more Bibles to download. Find Purify: Orthodox Hub. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

## A few days later

*Once most phones have updated.*

### A notification to every reader

`push` · A notification · Admin, Push · Ready · 94 of 300 characters

> Opens /whats-new. A notification may carry no digits, so it cannot name the version. Send yourself one first.

~~~text
A journal by the Church's day

Keep a journal by the Church's day, tap any verse to see its Greek, and read five more Bibles.
~~~

### Try this first

`discord-try` · Discord · Discord, a thread under the announcement · Ready · 599 of 2000 characters

~~~text
Three things to try in 1.9:

1. Your journal, by the Church's day. Today's page shows the day's feast or saints and its readings, each with a pen to begin a page. Add verse cards and highlights, and export or print it. Free for everyone.
2. Every verse, opened. Tap a verse to highlight it, copy it, share it as a picture, write a note and see its Greek.
3. Five more Bibles. The Russian Synodal, the Greek Septuagint, the Serbian of Karadžić and Daničić, and the Arabic Van Dyck and Spanish Reina-Valera, both Protestant and labelled so.

Tell us what you find, and what breaks. We read everything.
~~~

## A week later: the numbers

*Once the release has had its first week.*

- Not read out yet.

### The first week's numbers

`numbers` · Read-only SQL · Supabase, the SQL editor · Yours · To do

> Run it in Supabase and read us the rows: we keep them in your words with node scripts/drop.mjs numbers 1.9 --words "...". It only reads. Written out from lib/drop/numbers.ts each time the kit is made, so it counts this drop's own week. Which version an app is on is not in the database: Play Console and App Store Connect show that.

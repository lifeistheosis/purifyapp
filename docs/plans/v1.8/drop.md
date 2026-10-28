# Purify 1.8: the drop

Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this
file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.

Hear the New Testament, and walk to the Nativity with the Church. Covers 1.8, carried by the 1.8 builds (Android 0, iOS 0).

## The day

No drop day set yet. `node scripts/drop.mjs days` lists the next ones on the Church's calendar.

## What the release is

- 🎧 **The New Testament, read aloud.** All 260 chapters, verse by verse, with the verse being read lit as you go, and the day's Epistle and Gospel in one tap on Today.
- 🕯️ **Toward the Nativity.** Forty days with the Fathers for the Nativity Fast, offered on Today from a week before it begins. Walk it alone, or with your parish, household or friends.
- 📜 **Where every word comes from.** Every book in the reading room says where its words come from, and Who said it? finds where a quote really stands.
- 📚 **More of the Fathers.** Twenty-three more orations of St Gregory the Theologian, St Cyril on Luke checked word for word, and new writings for the councils and the Nativity.
- 🗺️ **The councils and history on maps.** A slider through the years, from Lyons to Moscow, and sixteen more events in Orthodox History written in full.
- ☀️ **More on Today.** The saint of the day in their own words, your patron on your name day, and your departed remembered on their days.
- 🤍 **The Fathers on everyday struggles.** Anxiety, anger, grief, temptation, loneliness, despondency, pride and forgiving others, in the Fathers' own words.
- ➕ **Purify Plus adds.** Listening offline in the apps, and new ambience under your reading: cathedral bells, the sea and wind.
- 🛍️ **The shop, redone.** Black and white, easier to find things in, and the more you buy, the more you save.

Also:

- Listen with your phone locked, with play, pause and skip on the lock screen.
- The apps open on the horizon.
- Yellow is back for highlights, and a double tap highlights a verse.
- Tap a saint's name in a text to open their card.
- Back goes back the way you came.

## What may not be said

- "Old Testament": only the New Testament is read aloud; the Old Testament is not recorded yet
- "whole Bible": only the New Testament is read aloud
- "narrat": the reading is a synthetic voice, not a narrator
- "voices": one reading voice; a choice of voices is not built
- "new chants": no chant is new in 1.8; more chants wait on recordings, for 1.9
- "Find a parish": the parish directory is planned for 1.9, not built
- "Purify Parish": the parish plan is planned for 1.9, not built

## The notes

- 1.8: written

## Before anything goes out

*First, so every link leads to the right note.*

### The 1.8 note

`note-1.8` · The note in the app · Admin, Patch notes · Yours · Not filed yet

~~~text
Accept it in Admin, Patch notes. Until the notes are accepted, What's New shows the release before this one, and there is no release email to send.
~~~

### Bring the accepted notes back into the app

`step-pull-notes` · A step · Ours, on your word · To do

~~~text
After the notes are accepted, or edited in Admin: node scripts/patch-notes.mjs pull --apply, then commit. The apps carry the files and never the tables, so an edit that is only in Admin is not in a build.
~~~

### Everything in 1.8, in one note

`notes-all` · Every line of the release, in one note · Wherever the whole list is wanted · Ready

> Written out from the notes themselves each time the kit is made.

## With the store submissions

*When the builds are handed to Apple and Google.*

Each build is walked on a real phone before it goes to its store, from [docs/PHONE-WALK.md](../../PHONE-WALK.md):

- Android not walked yet
- iPhone not walked yet

### What's new, for Google Play

`play-whats-new` · Google Play, What's new · Play Console, the release, Release notes · Ready · 495 of 500 characters

~~~text
Purify 1.8: Hear the New Testament, and walk to the Nativity with the Church.

• The whole New Testament, read aloud
• Toward the Nativity, forty days with the Fathers
• Where every word comes from
• More of the Fathers, checked word for word
• The councils and history on maps
• The saint of the day, your name day, your departed
• The Fathers on everyday struggles
• Plus: listen offline, and new ambience
• The shop, redone

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### What's New in This Version, for the App Store

`appstore-whats-new` · App Store, What's New in This Version · App Store Connect, the version, What's New in This Version · Ready · 1815 of 4000 characters

~~~text
Purify 1.8: Hear the New Testament, and walk to the Nativity with the Church.

Purify 1.8 reads the whole New Testament aloud, verse by verse, and the day's readings with it.

THE NEW TESTAMENT, READ ALOUD
All 260 chapters, verse by verse, with the verse being read lit as you go, and the day's Epistle and Gospel in one tap on Today.

TOWARD THE NATIVITY
Forty days with the Fathers for the Nativity Fast, offered on Today from a week before it begins. Walk it alone, or with your parish, household or friends.

WHERE EVERY WORD COMES FROM
Every book in the reading room says where its words come from, and Who said it? finds where a quote really stands.

MORE OF THE FATHERS
Twenty-three more orations of St Gregory the Theologian, St Cyril on Luke checked word for word, and new writings for the councils and the Nativity.

THE COUNCILS AND HISTORY ON MAPS
A slider through the years, from Lyons to Moscow, and sixteen more events in Orthodox History written in full.

MORE ON TODAY
The saint of the day in their own words, your patron on your name day, and your departed remembered on their days.

THE FATHERS ON EVERYDAY STRUGGLES
Anxiety, anger, grief, temptation, loneliness, despondency, pride and forgiving others, in the Fathers' own words.

PURIFY PLUS ADDS
Listening offline in the apps, and new ambience under your reading: cathedral bells, the sea and wind.

THE SHOP, REDONE
Black and white, easier to find things in, and the more you buy, the more you save.

ALSO
• Listen with your phone locked, with play, pause and skip on the lock screen.
• The apps open on the horizon.
• Yellow is back for highlights, and a double tap highlights a verse.
• Tap a saint's name in a text to open their card.
• Back goes back the way you came.

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### Promotional text, for the App Store

`appstore-promo` · App Store, promotional text · App Store Connect, the version, Promotional Text · Ready · 95 of 170 characters

> This one can be changed at any time without a new review.

~~~text
Purify 1.8 reads the whole New Testament aloud, verse by verse, and the day's readings with it.
~~~

### Submit both builds for review

`step-submit` · A step · Yours · To do

~~~text
Android build 0 in Play Console, iOS build 0 in App Store Connect, each once it has been walked on a phone (docs/PHONE-WALK.md).
~~~

## The announcement

*The day you tell people, once the note is showing on the website.*

### The board message above the notes

`board` · The weekly board · Admin, Patch notes, the board message · Ready · 473 of 900 characters

> Eyebrow: This week at Purify. The first line is the headline, the rest is the body.

~~~text
1.8 is here

The whole New Testament can now be read to you, verse by verse, and the day's Epistle and Gospel are one tap away on Today.
Toward the Nativity walks you through the forty days of the fast with the Fathers. It is offered on Today from a week before the fast begins, and you can walk it with your parish, your household or friends.
Every book in the reading room now says where its words come from, and Who said it? shows where a quote really stands.
The full note is below.
~~~

### The announcement

`discord-announcement` · Discord · Discord, #announcements · Ready · 1680 of 2000 characters

~~~text
Purify 1.8 is here 🕯️

Purify 1.8 reads the whole New Testament aloud, verse by verse, and the day's readings with it.

🎧 The New Testament, read aloud. All 260 chapters, verse by verse, with the verse being read lit as you go, and the day's Epistle and Gospel in one tap on Today.
🕯️ Toward the Nativity. Forty days with the Fathers for the Nativity Fast, offered on Today from a week before it begins. Walk it alone, or with your parish, household or friends.
📜 Where every word comes from. Every book in the reading room says where its words come from, and Who said it? finds where a quote really stands.
📚 More of the Fathers. Twenty-three more orations of St Gregory the Theologian, St Cyril on Luke checked word for word, and new writings for the councils and the Nativity.
🗺️ The councils and history on maps. A slider through the years, from Lyons to Moscow, and sixteen more events in Orthodox History written in full.
☀️ More on Today. The saint of the day in their own words, your patron on your name day, and your departed remembered on their days.
🤍 The Fathers on everyday struggles. Anxiety, anger, grief, temptation, loneliness, despondency, pride and forgiving others, in the Fathers' own words.
➕ Purify Plus adds. Listening offline in the apps, and new ambience under your reading: cathedral bells, the sea and wind.
🛍️ The shop, redone. Black and white, easier to find things in, and the more you buy, the more you save.

The Scriptures, the saints, the prayers and the calendar stay free.

Read the whole note: https://purifyapp.net/whats-new

The iPhone, iPad and Android apps get 1.8 once the stores approve the new builds. We will say so here when they do.
~~~

### The short one

`discord-short` · Discord · Discord, #general or a ping · Ready · 266 of 2000 characters

~~~text
Purify 1.8 is live on the web: the whole New Testament, read aloud, toward the Nativity, forty days with the Fathers, where every word comes from and more of the Fathers, checked word for word. The apps follow once the stores approve. https://purifyapp.net/whats-new
~~~

### Purify's own post in Community

`community-post` · Purify's own post in Community · Community, signed in as Purify · Ready · 1547 of 4000 characters

~~~text
Purify 1.8 is here

Purify 1.8 reads the whole New Testament aloud, verse by verse, and the day's readings with it.

🎧 The New Testament, read aloud. All 260 chapters, verse by verse, with the verse being read lit as you go, and the day's Epistle and Gospel in one tap on Today.
🕯️ Toward the Nativity. Forty days with the Fathers for the Nativity Fast, offered on Today from a week before it begins. Walk it alone, or with your parish, household or friends.
📜 Where every word comes from. Every book in the reading room says where its words come from, and Who said it? finds where a quote really stands.
📚 More of the Fathers. Twenty-three more orations of St Gregory the Theologian, St Cyril on Luke checked word for word, and new writings for the councils and the Nativity.
🗺️ The councils and history on maps. A slider through the years, from Lyons to Moscow, and sixteen more events in Orthodox History written in full.
☀️ More on Today. The saint of the day in their own words, your patron on your name day, and your departed remembered on their days.
🤍 The Fathers on everyday struggles. Anxiety, anger, grief, temptation, loneliness, despondency, pride and forgiving others, in the Fathers' own words.
➕ Purify Plus adds. Listening offline in the apps, and new ambience under your reading: cathedral bells, the sea and wind.
🛍️ The shop, redone. Black and white, easier to find things in, and the more you buy, the more you save.

The Scriptures, the saints, the prayers and the calendar stay free.

Tell us what you find, and what breaks. We read everything.
~~~

## The day a store has it

*Each store on its own day, when it shows the version.*

### Tell installed apps there is a newer build

`step-update-prompt` · A step · Ours, on your word · To do

~~~text
When a store shows 1.8: its number goes into lib/appUpdate/release.ts (Android 0, iOS 0), committed and pushed on the owner's word. Each store on its own day, and never before the store is serving the build.
~~~

### In the stores

`discord-stores` · Discord · Discord, #announcements · Ready · 388 of 2000 characters

> If one store approves first, post for that store alone and name it.

~~~text
Purify 1.8 is in the App Store and on Google Play 📱

Update Purify to get it inside the app:
• The whole New Testament, read aloud
• Toward the Nativity, forty days with the Fathers
• Where every word comes from
• More of the Fathers, checked word for word

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
Purify 1.8 is out

[Name],

Purify 1.8 is out, on purifyapp.net and in the stores. Purify 1.8 reads the whole New Testament aloud, verse by verse, and the day's readings with it.

What is new, briefly:
- The New Testament, read aloud. All 260 chapters, verse by verse, with the verse being read lit as you go, and the day's Epistle and Gospel in one tap on Today.
- Toward the Nativity. Forty days with the Fathers for the Nativity Fast, offered on Today from a week before it begins. Walk it alone, or with your parish, household or friends.
- Where every word comes from. Every book in the reading room says where its words come from, and Who said it? finds where a quote really stands.
- More of the Fathers. Twenty-three more orations of St Gregory the Theologian, St Cyril on Luke checked word for word, and new writings for the councils and the Nativity.

The Scriptures, the saints, the prayers and the calendar stay free.

If anything in Purify is wrong, or could serve you better, tell us. We read everything.

Edgar, the Purify Team
purifyapp.net
~~~

### The release cards

`cards` · The cards · Instagram and TikTok, from the files · Waits

Waits on: the card set has not been made yet (purify-ads, the social team)

### The caption for the cards, on Instagram

`instagram-caption` · Instagram caption · Instagram, the caption · Ready · 304 of 2200 characters

~~~text
Purify 1.8 is here. The New Testament, read aloud. Toward the Nativity. Where every word comes from. More of the Fathers. The Scriptures, the saints, the prayers and the calendar stay free. Find Purify: Orthodox Hub on the App Store and on Google Play. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

### The caption for the cards, on TikTok

`tiktok-caption` · TikTok caption · TikTok, the caption · Ready · 217 of 2200 characters

~~~text
Purify 1.8 is here: the whole New Testament, read aloud, toward the Nativity, forty days with the Fathers and where every word comes from. Find Purify: Orthodox Hub. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

## A few days later

*Once most phones have updated.*

### A notification to every reader

`push` · A notification · Admin, Push · Ready · 31 of 300 characters

> Opens /whats-new. A notification may carry no digits, so it cannot name the version. Send yourself one first.

~~~text
A word from Purify

There is something new to read.
~~~

### Try this first

`discord-try` · Discord · Discord, a thread under the announcement · Ready · 579 of 2000 characters

~~~text
Three things to try in 1.8:

1. The New Testament, read aloud. All 260 chapters, verse by verse, with the verse being read lit as you go, and the day's Epistle and Gospel in one tap on Today.
2. Toward the Nativity. Forty days with the Fathers for the Nativity Fast, offered on Today from a week before it begins. Walk it alone, or with your parish, household or friends.
3. Where every word comes from. Every book in the reading room says where its words come from, and Who said it? finds where a quote really stands.

Tell us what you find, and what breaks. We read everything.
~~~

## A week later: the numbers

*Once the release has had its first week.*

- Not read out yet.

### The first week's numbers

`numbers` · Read-only SQL · Supabase, the SQL editor · Yours · To do

> Run it in Supabase and read us the rows: we keep them in your words with node scripts/drop.mjs numbers 1.8 --words "...". It only reads. Written out from lib/drop/numbers.ts each time the kit is made, so it counts this drop's own week. Which version an app is on is not in the database: Play Console and App Store Connect show that.

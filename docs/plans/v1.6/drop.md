# Purify 1.6: the drop

Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this
file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.

A simpler Purify, in your language. Covers 1.6, carried by the 1.6 builds (Android 0, iOS 0).

## The day

No drop day set yet. `node scripts/drop.mjs days` lists the next ones on the Church's calendar.

## What the release is

- 🧭 **Five tabs.** Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.
- ⚙️ **One Settings.** Profile, account and settings were three places with similar names. Now You has one door.
- 📖 **The Church's own readings.** The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.
- 🔎 **One search.** Type a verse, a saint, a work of the Fathers, a screen or a setting, all in one place, in your own language.
- 📲 **Widgets for your home screen.** Seven of them: the Verse of the Day, today's saint and fast, Pray now, your streak, the days to the next fast or feast, your own saint and a mosaic for the season.
- 🕊️ **New to the Church.** Start here walks someone new through seven steps, and Find a parish opens the jurisdictions' own parish directories.
- 🖼️ **Share a verse as a picture.** From the Verse of the Day card.
- 📱 **Faster, lighter, in your language.** The phone apps open faster, in your phone's language from the very first screen, and are about a fifth smaller to download.
- 🌑 **True black.** A free palette for phones with OLED screens.

Also:

- In the phone apps, hold the Purify icon for Morning prayers, Today's reading or Continue reading.
- A soft tick when you finish a rule, keep a day or save a verse.
- Evening prayers begin at five on every screen.

## What may not be said

- "music player": moved to 1.7, not built
- "immersive": immersive prayers moved to 1.7, not built
- "prayer on the lock screen": prayer on the iPhone lock screen moved to 1.7, not built; the lock screen widgets are in 1.6
- "Romanian": the three languages' Bibles moved to 1.7; the Romanian app text was already there before 1.6

## The notes

- 1.6: written

## Before anything goes out

*First, so every link leads to the right note.*

### The 1.6 note

`note-1.6` · The note in the app · Admin, Patch notes · Yours · Not filed yet

~~~text
Accept it in Admin, Patch notes. Until the notes are accepted, What's New shows the release before this one, and there is no release email to send.
~~~

### Bring the accepted notes back into the app

`step-pull-notes` · A step · Ours, on your word · To do

~~~text
After the notes are accepted, or edited in Admin: node scripts/patch-notes.mjs pull --apply, then commit. The apps carry the files and never the tables, so an edit that is only in Admin is not in a build.
~~~

### Everything in 1.6, in one note

`notes-all` · Every line of the release, in one note · Wherever the whole list is wanted · Ready

> Written out from the notes themselves each time the kit is made.

## With the store submissions

*When the builds are handed to Apple and Google.*

Each build is walked on a real phone before it goes to its store, from [docs/PHONE-WALK.md](../../PHONE-WALK.md):

- Android not walked yet
- iPhone not walked yet

### What's new, for Google Play

`play-whats-new` · Google Play, What's new · Play Console, the release, Release notes · Ready · 380 of 500 characters

~~~text
Purify 1.6: A simpler Purify, in your language.

• Five tabs on the bar
• One Settings, behind one door
• The Church's own daily readings
• One search for everything
• Seven widgets for your home screen
• Start here and Find a parish
• Share a verse as a picture
• Faster and in your language
• True black, free

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### What's New in This Version, for the App Store

`appstore-whats-new` · App Store, What's New in This Version · App Store Connect, the version, What's New in This Version · Ready · 1484 of 4000 characters

~~~text
Purify 1.6: A simpler Purify, in your language.

Purify 1.6 is the groundwork for everything after it.

FIVE TABS
Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.

ONE SETTINGS
Profile, account and settings were three places with similar names. Now You has one door.

THE CHURCH'S OWN READINGS
The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.

ONE SEARCH
Type a verse, a saint, a work of the Fathers, a screen or a setting, all in one place, in your own language.

WIDGETS FOR YOUR HOME SCREEN
Seven of them: the Verse of the Day, today's saint and fast, Pray now, your streak, the days to the next fast or feast, your own saint and a mosaic for the season.

NEW TO THE CHURCH
Start here walks someone new through seven steps, and Find a parish opens the jurisdictions' own parish directories.

SHARE A VERSE AS A PICTURE
From the Verse of the Day card.

FASTER, LIGHTER, IN YOUR LANGUAGE
The phone apps open faster, in your phone's language from the very first screen, and are about a fifth smaller to download.

TRUE BLACK
A free palette for phones with OLED screens.

ALSO
• In the phone apps, hold the Purify icon for Morning prayers, Today's reading or Continue reading.
• A soft tick when you finish a rule, keep a day or save a verse.
• Evening prayers begin at five on every screen.

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### Promotional text, for the App Store

`appstore-promo` · App Store, promotional text · App Store Connect, the version, Promotional Text · Ready · 53 of 170 characters

> This one can be changed at any time without a new review.

~~~text
Purify 1.6 is the groundwork for everything after it.
~~~

### Submit both builds for review

`step-submit` · A step · Yours · To do

~~~text
Android build 0 in Play Console, iOS build 0 in App Store Connect, each once it has been walked on a phone (docs/PHONE-WALK.md).
~~~

## The announcement

*The day you tell people, once the note is showing on the website.*

### The board message above the notes

`board` · The weekly board · Admin, Patch notes, the board message · Ready · 161 of 900 characters

> Eyebrow: This week at Purify. The first line is the headline, the rest is the body.

~~~text
1.6 is here

Five tabs, with the Shop and Chat on Discover.
One Settings, behind one door.
The Church's own daily readings.
One search for everything.
The full note is below.
~~~

### The announcement

`discord-announcement` · Discord · Discord, #announcements · Ready · 1470 of 2000 characters

~~~text
**Purify 1.6 is here** 🕯️

Purify 1.6 is the groundwork for everything after it.

🧭 **Five tabs.** Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.
⚙️ **One Settings.** Profile, account and settings were three places with similar names. Now You has one door.
📖 **The Church's own readings.** The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.
🔎 **One search.** Type a verse, a saint, a work of the Fathers, a screen or a setting, all in one place, in your own language.
📲 **Widgets for your home screen.** Seven of them: the Verse of the Day, today's saint and fast, Pray now, your streak, the days to the next fast or feast, your own saint and a mosaic for the season.
🕊️ **New to the Church.** Start here walks someone new through seven steps, and Find a parish opens the jurisdictions' own parish directories.
🖼️ **Share a verse as a picture.** From the Verse of the Day card.
📱 **Faster, lighter, in your language.** The phone apps open faster, in your phone's language from the very first screen, and are about a fifth smaller to download.
🌑 **True black.** A free palette for phones with OLED screens.

The Scriptures, the saints, the prayers and the calendar stay free.

Read the whole note: https://purifyapp.net/whats-new

The iPhone, iPad and Android apps get 1.6 once the stores approve the new builds. We will say so here when they do.
~~~

### The short one

`discord-short` · Discord · Discord, #general or a ping · Ready · 219 of 2000 characters

~~~text
Purify 1.6 is live on the web: five tabs on the bar, one Settings, behind one door, the Church's own daily readings and one search for everything. The apps follow once the stores approve. https://purifyapp.net/whats-new
~~~

### Purify's own post in Community

`community-post` · Purify's own post in Community · Community, signed in as Purify · Ready · 1297 of 4000 characters

~~~text
Purify 1.6 is here

Purify 1.6 is the groundwork for everything after it.

🧭 Five tabs. Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.
⚙️ One Settings. Profile, account and settings were three places with similar names. Now You has one door.
📖 The Church's own readings. The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.
🔎 One search. Type a verse, a saint, a work of the Fathers, a screen or a setting, all in one place, in your own language.
📲 Widgets for your home screen. Seven of them: the Verse of the Day, today's saint and fast, Pray now, your streak, the days to the next fast or feast, your own saint and a mosaic for the season.
🕊️ New to the Church. Start here walks someone new through seven steps, and Find a parish opens the jurisdictions' own parish directories.
🖼️ Share a verse as a picture. From the Verse of the Day card.
📱 Faster, lighter, in your language. The phone apps open faster, in your phone's language from the very first screen, and are about a fifth smaller to download.
🌑 True black. A free palette for phones with OLED screens.

The Scriptures, the saints, the prayers and the calendar stay free.

Tell us what you find, and what breaks. We read everything.
~~~

## The day a store has it

*Each store on its own day, when it shows the version.*

### Tell installed apps there is a newer build

`step-update-prompt` · A step · Ours, on your word · To do

~~~text
When a store shows 1.6: its number goes into lib/appUpdate/release.ts (Android 0, iOS 0), committed and pushed on the owner's word. Each store on its own day, and never before the store is serving the build.
~~~

### In the stores

`discord-stores` · Discord · Discord, #announcements · Ready · 345 of 2000 characters

> If one store approves first, post for that store alone and name it.

~~~text
**Purify 1.6 is in the App Store and on Google Play** 📱

Update Purify to get it inside the app:
• Five tabs on the bar
• One Settings, behind one door
• The Church's own daily readings
• One search for everything

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
Purify 1.6 is out

[Name],

Purify 1.6 is out, on purifyapp.net and in the stores. Purify 1.6 is the groundwork for everything after it.

What is new, briefly:
- Five tabs. Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.
- One Settings. Profile, account and settings were three places with similar names. Now You has one door.
- The Church's own readings. The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.
- One search. Type a verse, a saint, a work of the Fathers, a screen or a setting, all in one place, in your own language.

The Scriptures, the saints, the prayers and the calendar stay free.

If anything in Purify is wrong, or could serve you better, tell us. We read everything.

Edgar, the Purify Team
purifyapp.net
~~~

### The release cards

`cards` · The cards · Instagram and TikTok, from the files · Waits

Waits on: the card set has not been made yet (purify-ads, the social team)

### The caption for the cards, on Instagram

`instagram-caption` · Instagram caption · Instagram, the caption · Ready · 266 of 2200 characters

~~~text
Purify 1.6 is here. Five tabs. One Settings. The Church's own readings. One search. The Scriptures, the saints, the prayers and the calendar stay free. Find Purify: Orthodox Hub on the App Store and on Google Play. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

### The caption for the cards, on TikTok

`tiktok-caption` · TikTok caption · TikTok, the caption · Ready · 187 of 2200 characters

~~~text
Purify 1.6 is here: five tabs on the bar, one Settings, behind one door and the Church's own daily readings. Find Purify: Orthodox Hub. #orthodox #orthodoxchristian #bible #saints #prayer
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

`discord-try` · Discord · Discord, a thread under the announcement · Ready · 463 of 2000 characters

~~~text
Three things to try in 1.6:

1. Five tabs. Today, Bible, Discover, Prayers and You. The Shop and Chat are on Discover now.
2. One Settings. Profile, account and settings were three places with similar names. Now You has one door.
3. The Church's own readings. The day's readings follow the Church's official calendar, and the Verse of the Day is chosen by our team for every day to the end of the year.

Tell us what you find, and what breaks. We read everything.
~~~

## A week later: the numbers

*Once the release has had its first week.*

- Not read out yet.

### The first week's numbers

`numbers` · Read-only SQL · Supabase, the SQL editor · Yours · To do

> Run it in Supabase and read us the rows: we keep them in your words with node scripts/drop.mjs numbers 1.6 --words "...". It only reads. Written out from lib/drop/numbers.ts each time the kit is made, so it counts this drop's own week. Which version an app is on is not in the database: Play Console and App Store Connect show that.

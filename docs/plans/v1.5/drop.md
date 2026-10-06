# Purify 1.5: the drop

Written out by `node scripts/drop.mjs kit` from `drop.json`. Do not edit this
file: change `drop.json` and write it out again. The rules are in `docs/DROP.md`.

Streaks, the Greek Old Testament, and a Community of its own. Covers 1.5, 1.5.1 and 1.5.2, carried by the 1.5.2 builds (Android 73, iOS 27).

## What the release is

- 🔥 **Keep a streak.** Pray or read each day, and a red flame counts the days you have kept.
- 📖 **The Greek Old Testament.** The Septuagint's Greek beside the English in 805 chapters. Tap a word and its English lights up.
- 🚶 **Walking with Job.** A guided walk through all 42 chapters, with St. Gregory the Great beside you.
- 👥 **Community has profiles.** Every reader has a profile and an @handle. Follow readers, mention them, and wish them many years on their name day.
- 🙏 **The prayer wall and Ask a Priest.** Ask for prayers, pray for others, and put a question to verified clergy.
- 💬 **More ways to join in.** Amen, Praying and Glory to God beside the like, a thread for the feast of the day, and a conversation under every Bible chapter.
- 🛡️ **A safer room.** A word filter, a spam filter, mute, and moderators who can step in from their phones.
- ✨ **Better with Plus.** Profiles come alive: a banner that moves, a theme in two colors, frames for your picture, effects like incense and gold dust, and a color for your name. Plus also adds cross-references, a journal and reading plans.
- 🛒 **The shop, redrawn.** The prayer corner set takes 15% off, and three pieces or more take 10% off.
- 📱 **Lighter on your phone.** Lighter apps, and pages that open at the top. Hold a verse to copy it. *(in the apps only)*

Also:

- A few quick questions, asked of everyone once, so Purify fits how you pray and read.
- In Community, tapping a notification opens the post or the profile it is about.
- The Kitchen: fast-day cooking as a recipe catalogue, with today's fast and the dishes that suit it.
- Saints are easier to browse, with a timeline of the centuries.
- Search on a phone is a full screen, and the reader's settings open as one sheet.
- Prayers opens on the icon of Christ of Sinai.
- Bible chapters open lighter, and everything still opens with no network.
- Sync brings every note, bookmark and prayer mark to a new device.

## What may not be said

- "Gift Plus": it is switched off until two server settings are set
- "reminder": the job that sends prayer reminders is not running, and none has been seen arriving
- "translat": the translator for Community posts is not built
- "Top sort": it is not built
- "weekly Community email": it is switched off
- "cart note": it is switched off
- "payout": ambassador payouts are not open
- "lock screen": a notification tapped on the phone's own screen has not been seen working

## The notes

- 1.5: accepted (revision 9f0f8617), 2026-10-06
- 1.5.1: accepted (revision 9a33f814), 2026-10-06
- 1.5.2: accepted (revision 112e6b7d), 2026-10-06

## Before anything goes out

*First, so every link leads to the right note.*

### The 1.5 note

`note-1.5` · The note in the app · Admin, Patch notes · Yours · Accepted

~~~text
Accept it in Admin, Patch notes. It has waited in your queue since 4 October: 43 lines, the release itself. Until it is accepted, What's New shows the 1.4 note under 1.5's pictures, and there is no release email to send.
~~~

### The 1.5.1 note

`note-1.5.1` · The note in the app · Admin, Patch notes · Yours · Accepted

~~~text
Accept it beside 1.5's. Five lines: Bible chapters that open lighter, and lighter apps.
~~~

### The 1.5.2 note

`note-1.5.2` · The note in the app · Admin, Patch notes · Ours, on your word · Accepted

~~~text
Not in your queue yet. Say "send the note" and it is filed there, then accept it with the other two. Fifteen lines: the refinements for phones.
~~~

### Bring the accepted notes back into the app

`step-pull-notes` · A step · Ours, on your word · To do

~~~text
After the notes are accepted, or edited in Admin: node scripts/patch-notes.mjs pull --apply, then commit. The apps carry the files and never the tables, so an edit that is only in Admin is not in a build.
~~~

### Verify a priest for Ask a Priest

`step-priest` · A step · Yours · To do

~~~text
Every piece below says questions go to verified clergy. On 5 October the public feed held one question, and no post or answer from anyone marked as clergy. Verify a priest in Admin, Verification, before the announcement, or tell us one is verified and has not written yet. Or say so, and Ask a Priest comes out of the pieces.
~~~

### Change the Purify account's status

`step-status` · A step · Yours · To do

~~~text
On 5 October it still reads "v1.5 drops soon". It is on Purify's own profile, where the announcement sends people, and it is in the picture the release email shows. Change it and say so: the picture is taken again from the live site.
~~~

### Everything in 1.5, in one note

`notes-all` · Every line of the release, in one note · Wherever the whole list is wanted · Ready

> All 63 lines of the three notes, set out from the notes themselves each time the kit is made. For anywhere the whole list is wanted.

## With the store submissions

*When the builds are handed to Apple and Google.*

### Hold the build in your hand first

`step-walk-build` · A step · Yours · To do

~~~text
Nobody has used 1.5.2 on a real phone. On TestFlight (build 27) or Play's internal track (build 73): hold a verse and then a prayer for Copy, come back from far down the saints, and scroll the shop. The lighter app and the hold were checked in a browser only, and three pieces here promise them.
~~~

### What's new, for Google Play

`play-whats-new` · Google Play, What's new · Play Console, the release, Release notes · Ready · 405 of 500 characters

~~~text
Purify 1.5 is our largest release yet.

• Keep a streak: pray or read each day
• The Greek beside the Old Testament
• Walking with Job, all 42 chapters
• Community: profiles, following, a prayer wall and Ask a Priest
• Plus: cross-references, a journal and reading plans
• The shop, redrawn
• A much lighter app, and smoother on a phone

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### What's New in This Version, for the App Store

`appstore-whats-new` · App Store, What's New in This Version · App Store Connect, the version, What's New in This Version · Ready · 1558 of 4000 characters

~~~text
Purify 1.5 is the largest release since the app opened.

KEEP A STREAK
Pray, or read a chapter, a saint's life or a lesson, and the day is kept. A red flame on Today counts the days you have kept, with badges at 7, 40 and 100.

THE GREEK OLD TESTAMENT
The Septuagint's Greek now stands beside the English in 805 chapters. Tap a Greek word and its English lights up.

WALKING WITH JOB
A guided walk through all 42 chapters, with a short note where a verse needs one, many of them a line from St. Gregory the Great.

A COMMUNITY OF ITS OWN
• A profile and an @handle for every reader
• Follow readers and mention them
• The prayer wall, and Ask a Priest
• Amen, Praying and Glory to God beside the like
• Name days, a thread for the feast of the day, and a conversation under every Bible chapter
• A word filter, a spam filter and mute

PURIFY PLUS
Cross-references on New Testament verses, a journal of every note you have written, reading plans, and the Greek word study. Your profile can carry a banner, two colors of your own and frames for your picture.

THE SHOP, REDRAWN
Each piece in its own lit case, and a prayer corner set: an icon, a prayer rope and a cross together.

LIGHTER AND SMOOTHER
• A much lighter app
• Pages open at the top, and going back returns you to your place
• Hold a verse or a prayer and Purify's own Copy comes up
• Search is a full screen, and the reader's settings open as one sheet
• A few quick questions, asked once, so Purify fits how you pray and read

The Scriptures, the saints, the prayers and the calendar stay free.
~~~

### Promotional text, for the App Store

`appstore-promo` · App Store, promotional text · App Store Connect, the version, Promotional Text · Ready · 141 of 170 characters

> This one can be changed at any time without a new review.

~~~text
Keep a streak, read the Greek beside the Old Testament, walk through Job, and meet a Community with profiles, a prayer wall and Ask a Priest.
~~~

### Submit both builds for review

`step-submit` · A step · Yours · To do

~~~text
Android build 73 in Play Console, iOS build 27 in App Store Connect. Both were made from the same commit on 5 October.
~~~

## The announcement

*The day you tell people, once the note is showing on the website.*

### The board message above the notes

`board` · The weekly board · Admin, Patch notes, the board message · Ready · 337 of 900 characters

> Eyebrow: This week at Purify. The title is the headline, each line of the text a line of the body.

~~~text
1.5 is here

Keep a streak: pray or read each day, and a red flame counts the days.
The Septuagint's Greek now stands beside the Old Testament.
Walking with Job is open, all 42 chapters.
Community has profiles, following, a prayer wall and Ask a Priest.
The apps are much lighter, and a long list of faults on phones is fixed.
The full note is below.
~~~

### The announcement

`discord-announcement` · Discord · Discord, #announcements · Ready · 1546 of 2000 characters

> If you would rather make one day of it, hold this until a store has the build and post it with the store post under it.

~~~text
**Purify 1.5 is here** 🕯️

The largest release since Purify opened is live on purifyapp.net.

🔥 **Keep a streak.** Pray or read each day, and a red flame counts the days you have kept.
📖 **The Greek Old Testament.** The Septuagint's Greek beside the English in 805 chapters. Tap a word and its English lights up.
🚶 **Walking with Job.** A guided walk through all 42 chapters, with St. Gregory the Great beside you.
👥 **Community has profiles.** Every reader has a profile and an @handle. Follow readers, mention them, and wish them many years on their name day.
🙏 **The prayer wall and Ask a Priest.** Ask for prayers, pray for others, and put a question to verified clergy.
💬 **More ways to join in.** Amen, Praying and Glory to God beside the like, a thread for the feast of the day, and a conversation under every Bible chapter.
🛡️ **A safer room.** A word filter, a spam filter, mute, and moderators who can step in from their phones.
✨ **Better with Plus.** Profiles come alive: a banner that moves, a theme in two colors, frames for your picture, effects like incense and gold dust, and a color for your name. Plus also adds cross-references, a journal and reading plans.
🛒 **The shop, redrawn.** The prayer corner set takes 15% off, and three pieces or more take 10% off.

The Scriptures, the saints, the prayers and the calendar stay free.

Read the whole note: https://purifyapp.net/whats-new

The iPhone, iPad and Android apps get 1.5 once the stores approve the new builds, and they come much lighter. We will say so here when they do.
~~~

### The short one

`discord-short` · Discord · Discord, #general or a ping · Ready · 195 of 2000 characters

~~~text
Purify 1.5 is live on the web: streaks, the Greek beside the Old Testament, Walking with Job, and a much bigger Community. The apps follow once the stores approve. https://purifyapp.net/whats-new
~~~

### Purify's own post in Community

`community-post` · Purify's own post in Community · Community, signed in as Purify · Ready · 762 of 4000 characters

~~~text
Purify 1.5 is here

Purify 1.5 is the largest release since we opened, and most of it grew out of what you did in the app.

🔥 Keep a streak. Pray or read each day, and a red flame counts the days you have kept.
📖 The Greek Old Testament. The Septuagint's Greek beside the English in 805 chapters.
🚶 Walking with Job. A guided walk through all 42 chapters, with St. Gregory the Great beside you.
👥 Profiles. Every reader has a profile and an @handle. Tap your own name to fill yours in.
🙏 The prayer wall and Ask a Priest. Ask for prayers, pray for others, and put a question to verified clergy.
💬 Amen, Praying and Glory to God now sit beside the like.

The Scriptures, the saints, the prayers and the calendar stay free.

Tell us what you find, and what breaks. We read everything.
~~~

## The day a store has it

*Each store on its own day, when it shows the version.*

### Tell installed apps there is a newer build

`step-update-prompt` · A step · Ours, on your word · To do

~~~text
When a store shows 1.5.2, say which one. Its number goes into lib/appUpdate/release.ts (Android 73, iOS 27), committed and pushed on your word. Each store on its own day, and never before the store is serving the build: early, it sends every reader to fetch a build that is not there.
~~~

### In the stores, if both approve on one day

`discord-stores` · Discord · Discord, #announcements · Ready · 414 of 2000 characters

~~~text
**Purify 1.5 is in the App Store and on Google Play** 📱

Update Purify to get streaks, the Greek Old Testament, Walking with Job and the new Community inside the app.

The apps are much lighter too, pages open at the top, and holding a verse or a prayer brings up Purify's own Copy.

App Store: https://apps.apple.com/app/id6798897857
Google Play: https://play.google.com/store/apps/details?id=net.purifyapp.purify
~~~

### In the App Store, if Apple approves first

`discord-stores-ios` · Discord · Discord, #announcements · Ready · 373 of 2000 characters

~~~text
**Purify 1.5 is in the App Store** 📱

Update Purify on your iPhone or iPad to get streaks, the Greek Old Testament, Walking with Job and the new Community inside the app.

The app is much lighter too, pages open at the top, and holding a verse or a prayer brings up Purify's own Copy.

https://apps.apple.com/app/id6798897857

Android follows as soon as Google approves it.
~~~

### On Google Play, if Google approves first

`discord-stores-android` · Discord · Discord, #announcements · Ready · 392 of 2000 characters

~~~text
**Purify 1.5 is on Google Play** 📱

Update Purify on Android to get streaks, the Greek Old Testament, Walking with Job and the new Community inside the app.

The app is much lighter too, pages open at the top, and holding a verse or a prayer brings up Purify's own Copy.

https://play.google.com/store/apps/details?id=net.purifyapp.purify

iPhone and iPad follow as soon as Apple approves it.
~~~

### The release email

`email-release` · The release email · Admin, Email, the release email · Done 2026-10-06

> Subject: Purify 1.5: Streaks, the Greek Old Testament, and a Community of its own. It needs the 1.5 note accepted first, and it goes out over two days, inside the day's limit.

Sent 2026-10-06 by Claude: "just push out the image fix then, so we could send out these emails ASAP".

~~~text
Eight points and one button, to every account that has not unsubscribed, a few times a year. It is the news of the release: the two points that sell, Plus and the shop, stay out of it. Its words are in lib/whatsNew/releaseEmail.ts, so the email that is read is the email that is sent. Every copy ends on that reader's own Unsubscribe button.
~~~

### A letter to people who should hear it from you

`letter` · A letter from your own mail · Your own mail, one address at a time or in BCC · Ready

> For a priest, open and close it your own way. This is also the letter to ask a priest into Ask a Priest with.

~~~text
Purify 1.5 is out

[Name],

Purify 1.5 is out, on purifyapp.net and in the App Store and Google Play. It is the largest release since we opened, and we wanted you to hear it from us.

What is new, briefly:
- The Septuagint's Greek now stands beside the English of the Old Testament.
- Walking with Job: a guided walk through all 42 chapters, with St. Gregory the Great.
- Community has profiles, a prayer wall, and Ask a Priest, where questions go to verified clergy.
- A streak, for anyone who wants to pray or read each day.

The Scriptures, the saints, the prayers and the calendar stay free. Purify carries no advertisements.

If anything in Purify is wrong, or could serve you or your parish better, tell us. We read everything.

Edgar, the Purify Team
purifyapp.net
~~~

### The release cards

`cards` · The cards · Instagram, as Stories and a carousel, and TikTok Stories · Waits

Waits on: your yes to the set. Look at the sheet first: nothing is posted without it.

> Nine stills: a cover, what is new, the Greek, Job, Community, the shop, the phone, and a close for each store. Read through by someone who did not make them. Ask a Priest is on none of them.

The files are with the piece `release-1-5-cards` in purify-ads.

### The caption for the cards, on Instagram

`instagram-caption` · Instagram caption · Instagram, the caption · Ready · 430 of 2200 characters

~~~text
Purify 1.5 is here. Keep a streak by praying or reading each day. Read the Septuagint's Greek beside the Old Testament. Walk through all 42 chapters of Job with St. Gregory the Great. Meet a Community with profiles, a prayer wall and Ask a Priest. The Scriptures, the saints, the prayers and the calendar stay free. Find Purify: Orthodox Hub on the App Store and on Google Play. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

### The caption for the cards, on TikTok

`tiktok-caption` · TikTok caption · TikTok, the caption · Ready · 189 of 2200 characters

~~~text
Purify 1.5 is here. Streaks, the Greek beside the Old Testament, Walking with Job, and a Community of its own. Find Purify: Orthodox Hub. #orthodox #orthodoxchristian #bible #saints #prayer
~~~

## A few days later

*Once most phones have updated.*

### A notification to every reader

`push` · A notification · Admin, Push · Ready · 99 of 300 characters

> Opens /whats-new, to everyone. A notification may carry no digits, so it cannot name the version. No notification from Purify has been seen arriving on a phone yet: send yourself one first.

~~~text
A new release of Purify

The Greek Old Testament, Walking with Job and a larger Community. Open What's New to read about it.
~~~

### Try this first

`discord-try` · Discord · Discord, a thread under the announcement · Ready · 346 of 2000 characters

~~~text
Three things to try in 1.5:
1. Open Today and keep your first day. One prayer or one chapter is enough.
2. Open Genesis 1 and turn on the interlinear. The Greek is beside it now.
3. Tap your own name in Community and fill in your profile: a patron saint, a favorite verse, your parish.

Tell us what you find, and what breaks. We read everything.
~~~

### Decide whether Windows gets 1.5

`step-windows` · A step · Yours · To do

~~~text
The Windows download is still 1.4.1, and no piece here says Windows has 1.5. Say if you want a 1.5 build for Windows: it is made and walked on this PC, outside the stores.
~~~

### A release edit for TikTok

`video` · The video · TikTok, from the file · Waits

Waits on: a sound from you. None is chosen for 1.5. The 808s sound is mapped and has no subject yet: say "use the 808s for 1.5", or send another.

> An edit is cut on its sound, and nothing is cut until you say go.

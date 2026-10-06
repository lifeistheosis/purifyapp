# 1.5 announcements

**Superseded on 2026-10-05 by the drop. Do not send from this page.** The
words that go out for 1.5 are in `drop.json` beside this file, written out as
`drop.md`, where each is checked (`docs/DROP.md`). They speak for 1.5, 1.5.1
and 1.5.2 together, since the stores go straight to 1.5.2. This page is kept
as the first draft, and as the record of how the release email came to its
shape. Nothing below was ever posted or sent.

Drafts, 2026-10-04. The owner posts and sends everything here; nothing goes
out on its own. Every line was checked against the 1.5 note
(`patch-note-1.5.json`), so nothing dark is claimed: no Gift Plus, no push
reminders, no translator, no Top sort.

Two moments, because the website and the apps do not move together:

1. **Today, on the web.** 1.5 is live at purifyapp.net as soon as `main` is
   pushed.
2. **Later, in the stores.** The iPhone, iPad and Android apps carry 1.5 only
   once Apple and Google approve the 1.5 builds. Post the second message then,
   not before.

## Discord

### 1. The announcement (today, #announcements)

> **Purify 1.5 is here** 🕯️
>
> The largest release since Purify opened is live on purifyapp.net today.
>
> 🔥 **Keep a streak.** Pray or read each day and a red flame counts the days you have kept, with badges at 7, 40 and 100.
> 📖 **The Greek Old Testament.** The Septuagint's Greek now stands beside the English in 805 chapters. Tap a word and its English lights up.
> 🚶 **Walking with Job.** A guided walk through all 42 chapters, with St. Gregory the Great beside you.
> 👥 **Community has profiles.** Every reader has a profile and an @handle. Follow readers, mention them, and wish them many years on their name day.
> 🙏 **The prayer wall and Ask a Priest.** Ask for prayers, pray for others, and put a question to verified clergy.
> 💬 **More ways to join in.** Amen, Praying and Glory to God beside the like, a thread for the feast of the day, and a conversation under every Bible chapter.
> 🛡️ **A safer room.** A word filter, a spam filter, mute, and moderators who can step in from their phones.
> ✨ **Better with Plus.** Profiles come alive: a banner that moves, a theme in two colors, frames for your picture, effects like incense and gold dust, and a color for your name. Plus also adds cross-references, a journal and reading plans.
> 🛒 **The shop, redrawn.** The prayer corner set takes 15% off, and three pieces or more take 10% off.
>
> The Scriptures, the saints, the prayers and the calendar stay free.
>
> Read the whole note: https://purifyapp.net/whats-new
>
> The iPhone, iPad and Android apps get 1.5 once the stores approve the new builds. We will say so here when they do.

### 2. The short one (today, for #general or a ping)

> Purify 1.5 is live on the web: streaks, the Greek beside the Old Testament, Walking with Job, and a much bigger Community. The apps follow once the stores approve. https://purifyapp.net/whats-new

### 3. Try this first (today, a thread under the announcement)

> Three things to try in 1.5:
> 1. Open Today and keep your first day. One prayer or one chapter is enough.
> 2. Open Genesis 1 and turn on the interlinear. The Greek is beside it now.
> 3. Tap your own name in Community and fill in your profile: a patron saint, a favorite verse, your parish.
>
> Tell us what you find, and what breaks. We read everything.

### 4. In the stores (later, only when both stores show 1.5)

> **1.5 is in the App Store and on Google Play** 📱
>
> Update Purify to get streaks, the Greek Old Testament, Walking with Job and the new Community inside the app.
>
> App Store: https://apps.apple.com/app/id6798897857
> Google Play: https://play.google.com/store/apps/details?id=net.purifyapp.purify

If one store approves first, post for that store alone and name it.

## The weekly board in the app

For `/admin?tab=patch-notes`, the board message above the notes.

- **Eyebrow:** This week at Purify
- **Headline:** 1.5 is here
- **Body:**
  - Keep a streak: pray or read each day, and a red flame counts the days.
  - The Septuagint's Greek now stands beside the Old Testament.
  - Walking with Job is open, all 42 chapters.
  - Community has profiles, following, a prayer wall and Ask a Priest.
  - The full note is below.

## The release email

Its words are in `lib/whatsNew/releaseEmail.ts`, not here, so the email that
is previewed is the email that is sent. `releaseBody` in
`lib/email/templates/contentBodies.ts` builds it, and the owner sends it from
Admin, Email, to readers who turned on "What is new in the library".

From 1.5 it is a short letter and not the whole note. The owner, 2026-10-04,
on seeing all forty-three lines set out: "a little too much", then "multiple
bullet points that get straight to the point", with emojis, naming what
Community gained and what Plus adds to a profile.

- **Subject:** Purify 1.5: Streaks, the Greek Old Testament, and a Community of its own
- **Heading:** Purify 1.5, with the release's name under it in italics
- **Picture:** Genesis 1 with the Septuagint's Greek beside the English
  (`public/whats-new/1.5/email.jpg`)
- **One line, then nine points,** each a mark, a name and a line: the streak,
  the Greek Old Testament, Walking with Job, four for Community (profiles,
  the prayer wall and Ask a Priest, more ways to join in, a safer room), what
  Plus adds (a banner that moves, a theme in two colors, frames, effects, a
  name color, and the study tools), and the shop.
- **One closing line:** the library stays free.
- **One button:** See everything that is new, to /whats-new

- **One screenshot under the profiles point:** the Purify account's own
  profile as a phone shows it (`public/whats-new/1.5/email-profile.jpg`,
  taken from the live site by `node scripts/release-pictures.mjs 1.5`).

Every point is something the 1.5 note already says. `node scripts/release.mjs
email` writes the email to `.release-logs/email/` (not committed) in each of
the four reading modes; it goes out in Night.

The owner also asked for a picture of the prayer wall and of a priest's
profile. Looked at on the live site on 2026-10-04, as a signed-out visitor:

- The prayer wall had one request, a reader's. A reader's name does not go
  in an email to every subscriber, so there is no wall picture. The owner's
  call: skip it.
- Ask a Priest had no questions, and no author in the public feed was
  verified clergy, so there was no priest's profile to picture. The owner's
  call: the words stay, with no picture. **A question asked today has nobody
  to answer it until a priest is verified** (Admin, Verification). That is
  worth doing before the announcement goes out.
- The Purify profile's status read "v1.5 drops soon!" when the picture was
  taken. Change the status, then run the pictures command again and the
  email follows.

Two things to know before sending:

1. Send it after the note is published and the site is live, and instead of
   that week's Sunday calendar, not as well as it (`lib/email/campaigns.ts`).
2. The apps do not have 1.5 until the stores approve the builds. Sent on the
   day of the push, the email describes things a reader in the app cannot
   open yet; sent once a store has the build, it does not. The owner's call.

# Lines the next note owes readers

Some changes come with a promise to tell readers in the next What's New
letter. They are written here on the day they ship, so the promise does not
depend on anybody remembering it. The release checklist
(`docs/release/TEMPLATE.md`, section 2) reads this file. When a line has been
said in a published note, move it to "Said" with the version.

The privacy page is the usual source: "If we change what is recorded, or add a
third party that sees your traffic, this page is updated first and the change
is listed in the next /whats-new letter."

## Owed

### By the 1.9 note, which says them all

The owner's "all recs" (2026-11-10): the 1.9 letter names every privacy change
of 1.9. The draft (`docs/plans/v1.9/patch-note-1.9.json`) carries them in six
lines under Bugs and Maintenance, beginning "What we count", "New in 1.9",
"The privacy page now names eight more", "What we keep", "With Purify Plus"
and "A saint's books in print". Each is on
the privacy page on the branch, in English and German, and goes live with the
1.9 push. When the note is published, move these and the three below to
"Said" with its words.

- **Which Purify Plus feature a reader taps, and whether that leads to a
  purchase** (`6282fcc5`, `lib/analytics/lockCounting.ts`).
- **The 1.9 counts:** Bibles downloaded, plans begun and finished, journal
  pages written and shared, the app version in use (`5b0e5217`, admin A5).
- **Tests of two versions of a screen:** which version a count came from,
  decided on the device (`3d4be178`, `lib/ab/`).
- **Eight more counts, and the Terms on tests:** a first prayer or chapter,
  a first week's steps, where an account is made, reminders on or off, the
  Plus sheet's steps, a device's first day, the two cards on Today, the first
  step opened; and the Terms say two readers may be shown different versions
  of a screen (`88e8fc50`, item 140, the onboarding chat's line).
- **The membership record:** the store, the plan, a trial or not, the price,
  the dates and why it ended, unlinked when the account is deleted
  (`419d3482`, admin A2; the line as of his yes to 68).
- **Error reports:** what failed and the error, the page, the version and the
  kind of device, scrubbed, deleted after 14 days (admin A10; his yes to 82a).
- **Searches that found nothing:** the words, never the reader, for 90 days
  (admin A11).
- **Shared journal pages:** the copy at its link, and a report on it with the
  reporter's account, both gone with Stop sharing (`4f951531`).
- **How long it is all kept** (his yes to 82b): the visit data and every count
  with no schedule to delete them; error reports 14 days; searches 90.
- **What travels with Purify Plus:** plan progress, Remember the verse's
  schedule, places and reading settings (`4e482d6e`, his yes to 59).
- **Who runs Purify, and where to write:** Purify Orthodox LLC; support@ for
  help, legal@ for legal (`53426a98`, `a715c7fd`).
- **Two outside loads gone:** a saint's books in print no longer load covers
  from Amazon (`8e5b8b10`, item 143), and the emails no longer load fonts from
  Google (item 145).

### By the 1.8 note, which never said them

The 1.8 note was published without these three, so the 1.9 note's "What we
count" and "What we keep" lines say them. Written down on 2026-10-30, after the
fact: the note of 2026-10-27 came before the second and third, and none of the
three was entered here on its day.

- **2026-10-27, the welcome questions are counted.** On the privacy page since
  that day (`260f2f04`, live with `99edb873` and `74b91f9d`): each screen of
  the welcome questions reached, each answer, a skip, a finish, and a note from
  the reader's own device on the second, seventh and thirtieth day that they
  came back. Totals in `analytics_events`: no session id, no account, no
  device id, the day and not the time.
- **The screens are counted (live with the 1.8 push).** The paragraph is on
  `release/1.8` (privacy page, "The screens are counted in the same table"):
  when the app is put away or the page closed, one row says what kind of
  screen was showing and roughly how long, and a device says once that it
  first opened Purify and once each when it comes back a day, a week and a
  month later. The sender, `lib/analytics/screenCount.ts`, is not on `main`
  before that push, so the counting and the paragraph go live together.
- **The visit data is kept (live with the 1.8 push).** The page said a
  scheduled job deleted anonymous session and pageview rows after 90 days. No
  such job ever ran, and the owner chose the words over starting one
  (2026-10-29, `496e863f`): the rows are kept, with no scheduled deletion.

The draft of the 1.8 note that says all three is in
`Homebase/boards/purify-master/r18/release-1.8/PATCH-NOTE.md`, under Bugs and
Maintenance. When the note is published, move these to "Said" with its words.

## Said

- **1.7: 2026-10-06, what is recorded about a visit changed in two ways.**
  Both are on the privacy page since that day.
  1. Links in our own emails and posts can end in a short tag
     (`?via=email-release-1.5`). It names the email or the post, the same for
     every reader, and never the reader. It is kept in place of the referrer
     and taken off the address in the browser.
  2. The Windows app tells us it is the Windows app.

  Said in the 1.7 note, under Bugs and Maintenance, in these words: "We now
  note which of our own emails or posts a visit came from, by a short tag on
  the link that is the same for everyone, and whether a visit is in the
  Windows app. It never names you, and the privacy page says exactly what is
  kept."

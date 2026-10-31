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

All three are owed by the 1.8 note. Written down on 2026-10-30, after the
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

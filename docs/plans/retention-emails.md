# The three retention emails

His word, 2026-11-13 about 05:10 UTC, on the arbiter's three (`docs/1.9-build/BRAINSTORM.md`): "perfect let's build and I say yes or no to the design. you must justify your designs".

Built on the 1.9 branch by the Retention emails chat (session_01VuYTwcNqhaVtjecwr5fvPv): the sending, not the look. Every switch is off. Nothing reaches anyone until his yes to each design, and then it reaches him alone first.

## What each email does

| Email | When | What it says | Only if |
|---|---|---|---|
| The first-week guide (`first_week`) | Day 1, 3 and 7 after the account is made, each until the next begins (the last until day 10) | Day 1 the morning prayers, day 3 the calendar, day 7 bookmarking a verse | The account does not show that step done |
| Where you left off (`pick_up`) | After 14 days in which the account kept nothing, then after 30, each for a week; once each per quiet spell | One line of the reader's own: "You were reading Romans 8", a work of the Fathers and where they were in it, or their patron saint's feast in the coming week | The reader has such a line. No line, no email. Never "we miss you" |
| The fasting companion (`fasting_companion`) | An opening on the first run of the fast the reader is on the list (its first day, or the day they turned it on), then one each week from the fast's second | The fast's dates in the reader's own calendar, each day's fast for the week ahead as the calendar names it, the feasts, the fast's reading plan or prayer, and the calendar's own word on the fast | A fast the companion covers is under way. The Nativity Fast first; Great Lent, the Apostles' and the Dormition are ready in the code and are added one line each, at his word, once their season's look has his yes |

What "done" means for the first-week guide: the morning prayers, a check-off of the morning rule (`prayer_completions`, every signed-in reader); the calendar, the Old Calendar on the reader's profile (the New is the column's default, so it says nothing either way); a verse, a verse bookmarked or noted (Plus keeps those on the server). A step the account cannot show is sent, in words that never say it was not done: no letter claims anything about the reader.

What "kept nothing" means: no prayer checked off, no verse bookmarked or noted, no place, plan or Remember kept, and no chapter shown as being read. The reading settings are not counted.

## The rules, and the test that holds each

All in `lib/email/retention/__tests__/`.

| Rule (the arbiter's brief) | Held by |
|---|---|
| Privacy first: only what the account already keeps; never tracking; a step that cannot be known is sent without a claim | `run.test.ts` (only the kept tables are read, never the visit data; the owner position reads no reader); `letters.test.ts` (no claim in any letter); `signals.ts` lists the tables (`READS`) |
| Each type its own preference and unsubscribe | `unsubscribe.test.ts` (one list stopped alone; "every optional Purify email" stops all three; a reader is on a list only when its column says true); `run.test.ts` (each copy carries its own list's link and one-click header) |
| The send-once ledger and the budget | `run.test.ts` (every copy through the ledger's send; the budget's leftovers deferred to the next run) |
| At most 2 optional emails a week per reader, across every campaign | `cap.test.ts`, `run.test.ts` (every campaign's optional email counts; one retention email a reader a run; a count that cannot be read sends nobody anything) |
| Nothing honest to say means no send; no fake urgency | `plan.test.ts` (done steps, readers with no line, days outside a fast); `letters.test.ts` (the house's copy rules on every letter) |
| Patristic or liturgical text only verbatim and cited; a model's framing of the faith goes to the editorial queue | `letters.test.ts` (every sentence is the app's own catalog line, a prayer rule's own line, the calendar's, the reader's own data, or a plain sentence in `COPY` that names no teaching; nothing is quoted) |
| One switch per email, off until his yes to its design; the first send to him alone | `switches.test.ts` (all off as committed; never past a step his words have not reached; an approved look exactly where he said yes); `run.test.ts` (off reads nothing; no look, no send; at owner only he gets it) |
| Render so an approved design drops in; a plain stand-in that is never sent | `render.ts` (`LOOKS` is the only thing that sends, empty today); `run.test.ts` (nothing that sends imports the stand-in) |
| Each email's effect ready for the owner's brief | `effect.test.ts` |

## The switch, step by step

`lib/email/retention/switches.ts` holds one constant per email, in version control like the campaigns' switch: `off`, `owner` or `readers`.

1. **Fable designs each email on the kit** (`docs/brand/kit/email/`), with a reason for every choice, from the content below. He answers yes or no to each.
2. **On his yes to a design**, one commit: the approved look goes into `LOOKS` in `render.ts`, his words go into `DESIGN_YES` with the date, and that email's switch moves to `owner`. The next 11:00 UTC run sends it to the accounts behind `ADMIN_EMAILS` and to nobody else, through the real path (the ledger, the budget, his own unsubscribe link). Its foot says why it reached him. He gets the first-week guide's three steps one a day, "where you left off" once with a line from his own account, and the companion's notes as the fast runs.
3. **Readers, on his word after that first send**, and only after one change that lands after 1.9's store builds are cut, website first:
   - the three toggles on the Notifications screen (`components/profile/EmailPreferences.tsx`), with their catalog lines, and the three fields in `GET` and `PUT /api/email/preferences`;
   - the three lists named in `lib/email/lists.ts`, so the unsubscribe page names the list it stops (until then its button offers "every optional Purify email", and the mail client's own one-click button stops the one list);
   - the privacy line, in his words (a draft is below).

   Then his words go into `READERS_YES` and the switch moves to `readers`. The code holds a switch at `owner` until the page knows the list, and a test fails if a list can reach readers while the privacy page does not name it.

None of the three changes in step 3 could land now: the Notifications screen, the unsubscribe page and the privacy page are all in the apps, and 1.9's builds are being checked as they stand. So no reader can have these emails before the release after 1.9's store builds, whatever is designed sooner. For the Nativity Fast of 2026 that means the owner alone sees the companion; Great Lent 2027 (from 15 March) is the first season readers could have it, and its look would need his yes in time.

## The migration

`supabase/migrations/20261113052927_retention_lists.sql`. **Not signed off.** It adds three nullable columns to `email_preferences` and nothing else; safe to run twice. Merging it to `main` runs it on production, so it needs his yes before merge day, or it comes off the branch (nothing else changes: the code reads the lists as empty while the columns are absent).

```sql
alter table public.email_preferences
  add column if not exists first_week boolean,
  add column if not exists pick_up boolean,
  add column if not exists fasting_companion boolean;

comment on column public.email_preferences.first_week is
  'The first-week guide (days 1, 3 and 7). Null: not chosen, read as off.';
comment on column public.email_preferences.pick_up is
  'Where you left off (after 14, then 30, days with nothing kept). Null: not chosen, read as off.';
comment on column public.email_preferences.fasting_companion is
  'The fasting companion (as a fast begins, then weekly). Null: not chosen, read as off.';
```

Null means "not chosen" and reads as off, as the privacy page promises today. If he later wants one list to start on for readers who have not chosen (as release news does), that is a line of code and a line on the privacy page, with no second migration, and a reader who said stop stays stopped.

## A privacy line, for his words

The privacy page says today: "No marketing email unless you ask for it." These lists keep that promise (each is off until a reader turns it on), but what they read to write themselves should be said before any reader can have one. A draft, to go beside the lists the page already names:

> Three more, each off until you turn it on: a short guide for your first week (days 1, 3 and 7); a note when your account has kept nothing for two weeks, and again at a month, naming where you were reading or your patron saint's feast that week; and a companion for each fast, as it begins and then weekly. To write them we read only what your account already keeps: when it was made, the prayers you checked off, the verses you kept, your place in the Bible and in the Fathers, and the calendar and patron saint on your profile. Nothing new is collected, nothing is kept from it, and the visit data is never joined to it.

## For Fable: what each email holds

Each email is a letter (`lib/email/retention/letters.ts`, `RetentionLetter`): a subject; the line above the heading (the list's own name: "Your first week", "Where you left off", "The fasting companion"); a heading; one line under it; paragraphs; for the companion, a list of days; paragraphs after; and one button. The look is given the letter and a frame: the line above the heading, the foot (why it came, the company and its postal address), and this reader's unsubscribe link. It returns the email. That is the whole interface: an approved design is one function, `Look`, dropped into `LOOKS`.

Two things a letter carries for the look and not for the reader, so a design can draw the week and choose its picture without reading anything itself:

- `about`: the first week's step; for "where you left off", the book and chapter, the saint and work, or the patron saint (a saint's own icon, unless the heritage list holds it back); for the companion, the fast, its day and its length (`day: 18, of: 40`), which is what the Nativity card's star is set by.
- each day of a fast: its civil date, the calendar's register for its fast (`strict`, `fish`, `wine-oil`, `fast-free`, the kit's fasting colours), the calendar's label and rule for it (`fast.label`, `fastRule`), and the feasts by name; `weekday`, `date` and `fast` are the fields the kit's own margin already draws (`kitDay`). So the week need not be seven long rows: a look may group the days by register and say each rule once, as round 2 does, as long as each day's fast is said in the calendar's words somewhere a reader can read it.
- the reader's reckoning (`style`, in the companion's `about`): the dates and the fasts follow it, so a look that names the calendar names this one.

Every button's address, set here as Fable's baton asked: the morning prayers `/prayers/morning`; the calendar `/settings#calendar`; a verse `/bible`; a place in the Bible `/bible/<book>/<chapter>`, with `#v<verse>` past the first; a work `/saints/<saint>/<work>#p-<section>-<paragraph>`; a patron saint `/saints/<saint>`; the Nativity Fast `/plans/nativity`; Great Lent `/prayers/lent-ephrem`; the other fasts `/calendar`. Each is tagged with the email's name on the way out, never the reader's (`lib/email/linkTag.ts`). And confirmed, as the baton asked: bookmarking a verse is free for every reader (the verse menu's Bookmark row has no Plus lock, unlike Compare and Gather, and the plans page says "Notes, highlights, bookmarks and collections are free on the device you write them on"); only carrying bookmarks between devices is Plus, and no letter speaks of that.

**On the designs' words (rounds 1 and 2, `e80b0004`), before his yes.** Read against the sending as built:

- **The foot is the sender's, not the design's.** Round 2's first-week foot says "You are getting this because you opened a Purify account this week", and its "where you left off" foot says "because you have not opened Purify in two weeks". The first describes a list every new account is on, which these are not (each is off until the reader turns it on, as the privacy page promises). The second claims what Purify never knows: the server cannot see whether a reader opened the app, only that their account kept nothing, and the brief forbids the claim. A look should draw `frame.footer`, which says the list the reader turned on, the company and its address (`render.ts`, `retentionFooter`).
- **No claim the account cannot show.** "Pray your first morning prayers" and "Save your first verse" say the reader has done neither; a reader on the free plan keeps bookmarks on the device, so the account often cannot know. "The fast begins" (and "day 1 of 40" fixed) is false for a reader who turns the companion on in its third week, who gets the opening that day: `about.day` is the day it is sent.
- **The reader's own calendar.** "Dates and fasting follow the new calendar" is false for a reader on the Old Calendar, whose fast the companion dates 28 November to 6 January: `about.style` says which.
- **A verse of the day,** if day 7 keeps one, is the app's own verse for that date, word for word with its reference (`lib/today/verseOfDay.ts`); the letter will carry it in the commit that brings the approved look in.
- **The button.** The design's companion opens the calendar; the letters open the Nativity plan. Either is right; the approved design decides, in the same commit.

The letters say "Morning prayers", "Bookmark a verse" and "The Nativity Fast, November 15 to December 24", and `letters.test.ts` fails on "your first verse", "first morning prayers" and "the fast begins". When a design is approved with words of its own, they replace COPY's in the same commit and the same tests hold them.

The plain stand-in (`standInEmail`) draws a letter in the house's current shell. It is not a design and is never sent.

The words of each, as the code writes them (sample dates from the Nativity Fast of 2026):

**First week, day 1.** Subject "Your first week: the morning prayers". Heading "Morning prayers". "Begin the day with God, the Sign of the Cross through dismissal." "About 8 minutes. They are in Prayers." Button "Open the morning prayers".

**First week, day 3.** Subject "Your first week: the calendar". Heading "The calendar". "Which reckoning the saint of the day, the fast, and the readings follow." "New or Old: it is chosen in Settings, under The calendar." Button "Open Settings".

**First week, day 7.** Subject "Your first week: bookmark a verse". Heading "Bookmark a verse". "Tap a verse on any chapter, then Bookmark verse." "It is kept in Saved." Button "Open the Bible".

**Where you left off, a place.** Subject "Romans 8, where you were reading". Heading "Romans 8", under it "Where you were reading". "You were reading Romans 8." Button "Open Romans 8" (to the verse, past the first). A work: heading its title, under it its saint, "You were reading On the Priesthood, by St. John Chrysostom.", button "Open it where you were" (to the paragraph).

**Where you left off, a patron saint.** Subject "St. Nicholas the Wonderworker is remembered on Sunday". Heading the saint, under it "Your patron saint". "St. Nicholas the Wonderworker, whom you chose as your patron saint, is remembered on Sunday, December 6." Button "Read about St. Nicholas the Wonderworker".

**The companion, opening.** Subject "The Nativity Fast, November 15 to December 24". Heading "The Nativity Fast", under it the dates. "Each day's fast for the week ahead, as the calendar gives it." Then the days, each with the calendar's word for its fast, a feast set heavier by its name ("Saturday, November 21: Entrance of the Most Holy Theotokos into the Temple. Nativity Fast, fish allowed"). Then the plan's own line ("The prophecies and Gospels the Church reads at the Nativity, one a day, in the order of her services.") and the calendar's own word on the fast ("Fasting rules are a simplified reading of common Eastern Orthodox (Greek tradition) practice for daily orientation. Your priest's direction takes precedence for any individual question."). Button "Open the reading plan". On the Old Calendar the dates are the reader's own: "November 28 to January 6".

**The companion, each week.** Subject and heading "The Nativity Fast, week 2", under it "November 22 to 28". The same line, the week's days, the calendar's word on the fast, the same button.

What the design must keep: phone first, no parchment, contrast on every palette, every button 44px, one button to an email, no em dash, no sparkle, rays or side stripe, under 100KB. Each day's fast in the calendar's words and its colours is the kit's own piece already (`docs/brand/kit/email/README.md`, "Each day says its fast"). A line of Scripture or of a Father, if a design wants one, is copied from the app's own text with its source named, never typed; and any sentence that frames the faith goes to the editorial queue first.

## The effect, for the owner's brief

`readRetentionEffect(admin, now)` in `lib/email/retention/effect.ts`, for Admin panel 3's brief: for each email, the readers it reached in the four weeks before the last seven days, and how many of them kept something with their account within seven days of it. Counts only, never a name; the owner's own first sends left out; "not read" (null) where a figure could not be read, never 0. It is a floor: a reader who came back and kept nothing is not counted, because the visit data is never joined to an account.

## Questions for him

1. **The migration:** yes to the SQL above for 1.9's merge, or hold it for the release after? Recommended: yes; it is three empty columns and changes nothing until the switches move.
2. **The weekly cap and the other emails:** the cap holds every retention send to two optional emails a week, counting every campaign. The Sunday calendar, the monthly note, Community, name days and the rest keep their own pace and do not read it. So a reader on the Sunday calendar and Community already has two a week, and gets no retention email. Should every campaign obey the cap too? Recommended: yes, with a release taking a week's place, as the monthly note already does; that is Admin panel 3's files.
3. **How a new reader comes to have the first-week guide:** as built, it is off until turned on, and a reader in their first day will rarely find a toggle. Two honest ways to reach them: one line in the welcome email that asks ("A short guide for your first week, three emails. Send it to me."), which asks at the moment it matters and is consent in the reader's own tap; or the guide starting on for new accounts, with the privacy line saying so and one tap to stop. Recommended: the line in the welcome email. Both are his.

   **Decided and built.** His "all recs", 2026-11-13 about 14:29 UTC: the line in the welcome email. Built by Updates 23 (`docs/1.9-build/notes/build-95.md`, "The welcome email's line for the first-week guide"): the line after the welcome's button, only while `first_week` stands at `readers`; its link opens `/email/first-week`, whose one button turns the guide on by POST, signed to the account for that one use (`lib/email/retention/firstWeekAsk.ts`). Its look waits on his yes on the page with note 23.

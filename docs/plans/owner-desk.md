# The owner's desk and the Purify look

His word, 2026-11-12 about 21:51 UTC (`docs/1.9-build/BRAINSTORM.md`): stop the "late" emails about what he already knows, prepare the recurring pieces so he gives only directional answers, send him a brief made for the owner (daily and weekly, with charts and what readers did), set up departments, and give everything we make a Purify design, emails first.

None of this is a 1.9 fault and none of it touches the apps. It starts after 1.9's final check, in the order at the end. His answers to the questions at the end set the details.

## 1. A quiet board

**Today.** `lib/admin/plannerDigest.ts` (on the main web since 05cb95fff) sends one email each morning listing every planned task of the last 42 days with no sign of being done. The plan in `lib/admin/planner.ts` adds, every week, the board message, the patch note, "ship this week's update" and the Sunday email, and every month the monthly note and two EIKON Box tasks. During a long build they pile up: about 30 "late" lines a morning, most of them things he knows about or the team could do.

**Change.**

- The morning email holds only what needs his hand or his word. Its subject names that, never a count of what is late.
- A task he has given a day stays silent until that day: a "not before" day on each task, set in one tap in the Calendar. The EIKON Box waits for the next paycheck that way.
- What the team can prepare is never "late" to him: it reaches him ready, as in section 2.
- "Ship this week's update" and "Write this week's patch note" leave the weekly plan. They are steps of a release (`docs/RELEASE.md`).
- A missed run is one line ("the Sunday email: not sent for 3 weeks"), not one line per week.
- Each change has a test that fails on today's digest.

**Until 1.9 reaches the main web**, the old email keeps coming. To quiet it now: Admin, Calendar, open each old item, "Skip this one".

## 2. The recurring pieces, ready without him

The Sunday email, the monthly note and the feast shop email already build themselves from the app's own data (`lib/email/campaignDrafts.ts`): nobody writes their words. What is missing is the send.

- **Proposed:** each goes out by itself at its hour, after it appears in that morning's brief with a Hold button. A day with nothing honest to send sends nothing, as now. The send-once ledger and the email budget stay as they are.
- **The board message** is words in his voice, shown in the app, so it never posts itself. A draft built from the week (the feast, what is new) waits in the brief for his one tap. Nothing written by a model about the faith ships without a person (`docs/editorial-standards.md`).
- **Directional questions** come in the brief, one line each, only when a choice is his (for example, which of two pieces leads the monthly note).

**Built, 2026-11-13 (Admin panel 3), on his "yes auto" of that day. Live when 1.9 reaches the main web.**

- The switch is on by default, as he said, and lives in the admin: Calendar, The owner's desk ("Sending by itself", Turn off). The sends' hour is a setting too: 12 noon New York time unless he changes it, at least two hours after the brief.
- A piece goes out by itself only when that day's brief named it with its Hold, two hours or more before; he has not held it; the board still has it due today (Skip this one and Not before keep it back); and it is the sends' hour and before 6 PM. The send is the panel's own Send (`lib/email/campaignStart.ts`): the same draft, the email doctrine, the postal address, once per period, the month's budget and the cadence rule. Rules: `lib/admin/ownerDesk.ts`; the sending: `lib/admin/autoSends.ts`.
- The Hold link in the brief opens the desk in the Calendar, where Hold is one tap. No link in an email holds or sends on its own: a mail client's link checker would press it.
- The board message: on its day the brief saves a draft from the week (the week's feasts from the calendar, and the newest release note) as that week's draft row, only if the week has none (`lib/admin/boardDraft.ts`). It waits in Patch notes for his Publish. It never publishes.
- **The first-send guard** (the arbiter's ask, 2026-11-13): when the reader emails change look, the first email that would go out by itself goes to him alone, exactly as readers would get it, and nothing goes to readers by itself until he taps "I have seen it in my inbox" on the desk. The look is a version beside the reader emails (`lib/email/look.ts`, `READER_EMAIL_LOOK`): the change that puts the kit's look in bumps it, and the guard arms itself. The kit's look went in on his "yes look" (2026-11-13) with `READER_EMAIL_LOOK` at "2", so the guard is armed: the first email that goes out by itself after the merge comes to him alone. A Send he presses is his own and is not held; the brief always goes.
- Directional questions: none built. A task anyone adds to the Calendar reaches him under "Needs you", which carries them for now.
- Found on the way and fixed: the monthly note sent on the 1st carries the month it is about, so the board ticked the previous month's task and left the current one open (`lib/admin/plannerEvidence.ts`, `monthlyRuleOf`).

## 3. The owner's brief

One email a day at most, made for the owner. It replaces the morning board email and grows from the Monday letter (`lib/admin/weekly.ts`, which arrives with 1.9).

- **Daily, early morning his time:** yesterday on one screen. Visitors and new readers; Plus starts and cancellations; shop orders; money in by source, in the money chart's own colours; what readers opened most (saints, prayers, chapters); in the community, the threads most answered and the questions asked most; what readers searched for and did not find; errors, if any; what needs him (section 1); what goes out today (section 2). A quiet day says so in one line.
- **Weekly, on Monday:** the week against the one before, a chart for each area, what worked and what did not, and the three things worth his attention.
- **Context:** after an EIKON Box drop, a sale or a release, the next brief opens with how it went: orders, money, the new feature's use, what readers said.
- **Rules:** no reader's name or address, ever. A figure that could not be read says "not read", never 0, as everywhere in the admin. Figures are read when the email is made and are never written into the repository. Charts are drawn in the email itself (email clients run no scripts) and checked in Gmail, Apple Mail and Outlook, light and dark.

**Built, 2026-11-13 (Admin panel 3), on his "and yes ok for the owners brief". Live when 1.9 reaches the main web.**

- One email a day at 7:30 AM New York time; the weekly one on Monday. Both are settings in the admin (Calendar, The owner's desk). It replaces the morning board email and the Monday letter on the heartbeat (`lib/ops/maintenance.ts`); their senders stay in the code, off the clock.
- Today first, because the Hold has a clock: what needs him (the quiet board's lines, plus refunds to decide, open messages and orders to post) and what goes out today. Then yesterday, or on Monday the seven days against the seven before: readers, money in by source in the money chart's colours, Plus, what readers opened most, Community, searches that found nothing, errors; on Monday also what sold Plus, what worked and what did not, and three things worth his attention. After a release, an EIKON Box drop or a sale it opens with how it went.
- Days are UTC days, as in the admin. A table this database does not have yet reads "not kept yet"; a read that failed, "not read".
- Code: `lib/admin/ownerBrief.ts` (the words and the markup, pure), `lib/admin/briefFigures.ts` (the reads), `lib/admin/briefToday.ts` (today), `lib/email/kit.ts` (the kit's pieces, the charts among them, shared with the reader emails), `lib/admin/ownerBriefSend.ts` (the send). The desk: `components/admin/planner/OwnerDesk.tsx`, `app/api/admin/desk/route.ts`, settings in `site_settings` (no migration).
- **In the kit's look, on his yes** (2026-11-13 05:45 UTC, "yes look"): the kit's own brief (`docs/brand/kit/email/brief.html`, the Fable designer's), drawn with the kit's pieces (`lib/email/kit.ts`), which `lib/email/__tests__/kit.test.ts` holds to the kit's builder character for character. Dark, the kit's clean light when his phone is light, never parchment; the masthead's cross and the reader emails' pictures live on the main web (`public/email/`).
- **Why it looks as it does** (his rule, "you must justify your designs"):

  | The choice | Why | What it does for him |
  |---|---|---|
  | Today first: what needs you, then what goes out | The Hold is the one thing in it with a clock. | The first screen is everything he must act on. |
  | Each email due today with its time and a Hold button | A send he did not press must be one he saw first. | Nothing goes out that he was not told about, hours before. |
  | The day's three figures side by side, each against the same day last week | One day against the day before swings with the weekday. | A rise or fall he sees is a real one, at a glance. |
  | Money as one bar in the money chart's colours, each part named with its amount, always in cents | His word: "if you can make it a different color ... If there's no distinction, then it just shows up all white". | Where the money came from, at a glance, and in words. |
  | On Monday a column a day for visitors, new accounts and money | A week is a shape: which day rose, which fell. | He sees the week without opening the admin. |
  | One figure to a row in every list | Two figures in one value break the column. | He reads down one edge. |
  | What could not be read, gathered at the end as "not read" or "not kept yet", never 0 | A 0 that was never counted is a lie. | He can trust every number in it, and sees what is missing in one place. |
  | Tables and inline colour only | Mail clients run no script and Gmail shows no SVG. | It looks the same in every client. |
  | One column at phone width, checked at 390, dark and light | He reads it on his phone. | Nothing runs off the screen. |
- Not yet done: the check in Gmail, Apple Mail and Outlook, light and dark. The brief and the reader emails were drawn in Chromium at 390, dark and light, and held by tests (no script, no SVG, no flex or grid, no em dash, never parchment); the real clients need his inbox or a testing service, so the first real brief after the merge, and the first reader email in the new look that comes to him alone, are the first such check.

## 4. Departments

The operating system already gives each chat one job and a role card (`docs/roles/`). The departments are those cards. A new chat starts only on his word.

| Department | Chat | Holds |
|---|---|---|
| Direction | Arbiter | his words, routing, the record, the brief's questions |
| Engineering | Updates, Updates 2 | fixes and features |
| Operations | Admin | the admin panel, the brief, the gates |
| Marketing | SSM board | each release's drop, the posts, the Vault |
| Design | Fable designer | store pictures, adverts, the email and seasonal looks |
| Legal and company | Company guide | the LLC, tax, Florida (a guide, not a lawyer) |
| Shop and sourcing | new, on his word | the EIKON Box: what to source next, from what sold, what readers asked for and what ran out; suppliers and costs |

Models: Opus 5.5 does the work, Fable 5.2 designs, and Sonnet 5.5 takes light repeated jobs where it is enough (a weekly draft, a sourcing sweep).

## 5. The Purify design kit

**Today.** The app has a look of its own: the palettes and looks, the gold, the type, the house curve, and the guardrails checkMock holds. Artifacts, reports, drop kits and emails do not draw from it. Each was built on a generic template.

**Make one kit, used by everything:**

- Tokens taken from the app itself: the palettes' colours, type, spacing, the gold, the motion curve, light and dark.
- Pieces for documents: title, section, table, chart, figure, note, card, button, and the house's motifs where they belong.
- Two templates: an artifact page, and an email built for email clients.
- The guardrails hold here too: no rays, side stripes or sparkle, no pills as a list of places, no em dashes, contrast on every palette. checkMock passes before anything is sent.
- On claude.ai, the kit becomes a design system, so decks and designs start from Purify's look.
- Every role card says to use it.

**Who:** Opus builds the kit from the app, since it is the app's look and nothing new. Fable designs on top of it only where taste decides: the email layout and the seasonal looks.

## 6. Reader emails, second edition

- Rebuilt on the kit, in one layout.
- Seasonal looks through the Church year (the Nativity Fast, Theophany, Great Lent, Pascha, the Dormition), from the app's own looks.
- Moving pictures: a short loop of a new feature in a release email, made from the release's own screen recordings (no stock, no AI faces), small, with a first frame that works as a still, because some versions of Outlook show only that.
- Checked in Gmail, Apple Mail and Outlook, light and dark, before any send.

## Order

1. After the final check: the quiet board (Admin panel 2), alongside the money chart.
2. The design kit (Opus, from the app).
3. The owner's brief, on the kit (Admin panel 2).
4. The recurring pieces' sends (section 2), at his answer.
5. Reader emails, second edition (Fable's look, Admin's build).
6. The shop and sourcing chat, at his word, with the EIKON Box restart.

## Questions for him

1. The Sunday email, the monthly note and the feast shop email go out by themselves unless he taps Hold in that morning's brief; the board message waits for his tap. Recommended: yes. **His answer, 2026-11-13: "yes auto but also we need to work on designs". Built.**
2. The brief at 7:30 his time daily, with Monday's as the weekly. Recommended: yes. **His answer, 2026-11-13: "and yes ok for the owners brief". Built.**
3. Start the shop and sourcing chat after 1.9? Recommended: yes, with the EIKON Box restart.
4. The kit by Opus from the app, with Fable only for the email and seasonal looks. Recommended: yes.

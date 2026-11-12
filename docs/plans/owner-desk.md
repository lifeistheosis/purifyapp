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

## 3. The owner's brief

One email a day at most, made for the owner. It replaces the morning board email and grows from the Monday letter (`lib/admin/weekly.ts`, which arrives with 1.9).

- **Daily, early morning his time:** yesterday on one screen. Visitors and new readers; Plus starts and cancellations; shop orders; money in by source, in the money chart's own colours; what readers opened most (saints, prayers, chapters); in the community, the threads most answered and the questions asked most; what readers searched for and did not find; errors, if any; what needs him (section 1); what goes out today (section 2). A quiet day says so in one line.
- **Weekly, on Monday:** the week against the one before, a chart for each area, what worked and what did not, and the three things worth his attention.
- **Context:** after an EIKON Box drop, a sale or a release, the next brief opens with how it went: orders, money, the new feature's use, what readers said.
- **Rules:** no reader's name or address, ever. A figure that could not be read says "not read", never 0, as everywhere in the admin. Figures are read when the email is made and are never written into the repository. Charts are drawn in the email itself (email clients run no scripts) and checked in Gmail, Apple Mail and Outlook, light and dark.

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

1. The Sunday email, the monthly note and the feast shop email go out by themselves unless he taps Hold in that morning's brief; the board message waits for his tap. Recommended: yes.
2. The brief at 7:30 his time daily, with Monday's as the weekly. Recommended: yes.
3. Start the shop and sourcing chat after 1.9? Recommended: yes, with the EIKON Box restart.
4. The kit by Opus from the app, with Fable only for the email and seasonal looks. Recommended: yes.

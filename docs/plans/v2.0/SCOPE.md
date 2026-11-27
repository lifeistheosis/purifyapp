# Purify 2.0: what is in it, and the cut line

His words: "1.9 is live we are making v2.0" and "Full 2.0, wait" (2026-11-25, `docs/handoffs/store-build.md`); "organize everything and start working on v2 0" (2026-11-27).

One page: every piece of 2.0, where it stands, whose it is and what it costs. The steps that ship it are `RELEASE.md` beside this file. Costs are estimates from the rate in `docs/NOW.md` (Spend) until measured. Written 2026-11-27 from the branch `ccr-07896cf2-bo0afd` at `ab503faf`.

## Why the date matters

The account step after the welcome is on the main web since 2026-11-25 and reaches phones only with 2.0. Until then sign-ups in the apps stay near 2.7% of visitors, where they were about 5.5% with it (`docs/handoffs/store-build.md`). Level 1, Purify paying its own bills, needs about 36 paying members; there were 17 on 2026-11-24 (`docs/plans/levels.md`). So each open piece below is either needed for 2.0 or moves to 2.1.

## A. Built on the branch: ships with 2.0, needs only the gate

1. **Heart alone:** the phone's own voices gone, the Voice sheet gone, Listen only where Heart's recording is (Updates 98r and 98s).
2. **What's New's line** in 21 languages: seven more Bibles, Purify Plus named.
3. **Gate 6c's fix round:** 98t, 98u, 98v (`docs/handoffs/updates-98t.md` to `98v.md`).
4. **Onboarding rows 0 to 3** (`docs/plans/onboarding-2.0.md`): the week's card mended on Today; Find a parish with the guide's card and the reader's region first; "Done for today" on all 63 days of the weeks, dark until lit (`DAY_FRAME_LIVE`); Admin, Onboarding by road and first pick; the brief's line for each test.
5. **Keep Plus:** "Your Plus ends on <day>" and Keep Plus on the Plus page (`0517bbd7`). Owed: a still for his yes, and a look on a real phone with renewal off.
6. **From main, reaching phones only with 2.0:** the account step after the welcome (`aefe1114`), the first Liturgy guide's mend (`60c400d3`), fewer calls to the database, Buy Me a Coffee gone.

## B. Known faults: all in 2.0

His rule: a release ships finished, and a fault never waits for a point release. Each mend comes with a test that fails on the old code. About $20 to $40 together, with one export to check them.

1. **Mended 2026-11-27:** German and Urdu: "2 weitere" on Today under 4.5 to 1 (now the house's secondary strength, `text-paper/65`); in German the Creed's row, also on council pages, cut short (its title now wraps). Tests: `lib/today/__tests__/readingsMoreContrast.test.ts`, `lib/theology/__tests__/rowTitlesWhole.test.ts`.
2. **Mended 2026-11-27:** Pentecost's page showed "Paul's missions" twice: "Earlier" and "Later" now pass over what the chain of events already names (`lib/history/alongTheLine.ts`, its test over every published event).
3. **Mended 2026-11-27:** `/journal/` reached from You marked Bible: a page with two homes now lights the tab the reader came from (`lib/nav/tabLit.ts`; the journal named in `tabBar.test.ts`'s one exception).
4. **Mended 2026-11-27:** Arabic: PractiseSheet's Change button was 41.9 px wide; both its pills now hold 44 px (`lib/ui/__tests__/practiseTargets.test.ts`). Not walked: the sheet is behind a Plus feature.
5. John 1's Community link goes blank for 211 ms on the way.
6. Four page switches 98t could not reproduce: the Creed into a council document (blank), the Bible to 1 Samuel (cut), the doctrine shelves to vestments (flash), the work pill (26 px).
7. **Mended 2026-11-27:** ChooseSheet's hidden note kept its margin, 98v's Share fault's shape; the rule now holds every component (`lib/ui/__tests__/hiddenLinesNoRoom.test.ts`).
8. The week's card reads "Tomorrow: Pentecost: the Descent of the Holy Spirit", two colons. His word: proposed, the page's own bar name ("Tomorrow: Pentecost").
9. Testers mode only: the Testers mark over the Bible's chapter pill, and cut short for "Another Christian tradition".
10. **Mended 2026-11-27:** the website's hourly heartbeat was cut while it finished a long send, so Render called it failed: the email jobs' share now goes after the answer, as the reminders do (`lib/ops/__tests__/emailAfterAnswer.test.ts`). Reaches the main web with 2.0.

## C. To build for 2.0 (recommended in)

1. **Onboarding section 5, after day seven:** 5.1 the week's close and 5.2 its next step by road (being drawn now), then 5.3 "I went". About $28 to $47. In because 2.0 lights "Done for today": without a close, a kept week ends on a bare line. The plan: `docs/plans/onboarding-2.0.md`, "Section 5, after day seven: the plan".
2. **"Studio Audio" on Purify Pro** (`lib/premium/plans.ts:217`), a perk promised as coming while Heart is the only voice: keep or remove, his word. The gate fails a line that promises what is not true. Removing it: about $2.
3. **Lighting "Done for today":** the privacy page's sentence saying "kept" (his read, `docs/plans/reader-map.md`, section 12), and lit for every reader or as a tested fork (his word).
4. **New store pictures** from the 2.0 export: the 1.9 set shows old screens. The variants he kept for 2.0 (2026-11-12) only if he wants them. About $10 to $20.
5. **iOS:** Apple needs the iOS 27 SDK for uploads from April 2027, and iPhone Duo pictures for apps built on iOS 27.1 or later. Check the runner now so 2.0's iPhone build is not stopped by either. About $2 to $5.

## D. His call: 2.0 or 2.1 (where the date is decided)

1. **A reader's answers on their account, with new terms and the EU step** (his words, 2026-11-22: "no more local. it stays on their accounts.", "just add it in v2.0 with new terms"). Needs: the reader's yes in onboarding, the privacy page, the stores' data forms, a new table (a migration, his sign-off), and a lawyer's read. About $40 to $80 of work; the lawyer's time sets the date. **Recommended: 2.1.** Today's privacy page says the answers stay on the phone, and that stays true until then.
2. **The welcome on Today** (mock-up 13): on hold by his word. **Recommended: 2.1.**
3. **"What are you looking for?" reworked** (mock-ups 2 to 4): its test place frees on 2027-02-09. **Recommended: 2.1.**
4. **Section 5.4, the Church's own day after day 8:** about $10 to $20. **Recommended: 2.0** if 5.1 to 5.3 go smoothly, else 2.1.
5. **Noted, his to pick:** reminders that need no account, a week that waits, the first prayer in the first minute, a welcome email by first pick. **Recommended: reminders first, in 2.1.**
6. **Campaign pictures and their legal steps** (planned for 1.9.1, his word of 2026-11-11): 2.0 or after.

## E. The release itself

The checklist is `RELEASE.md` here: the list frozen (`since-1.9.md`), the note, the six version numbers, the gates (typecheck, unit tests, both exports, the web build), the pre-build gate on the export (hours of machine; he sets how far each time), his walk of the test build, the drop's words, main at his word, the store builds, then the numbers that tell installed apps. About $45 to $90, most of it the gate.

## The cut line, recommended

**In: A, B, C, and D4. Moved to 2.1: D1, D2, D3, D5. D6 his.** With that, about $110 to $200 of work stands between today and 2.0, one piece at a time, each at his yes.

## The order from here

1. Section 5's drawing (5.1 and 5.2): drawn 2026-11-27, waiting for his yes (https://claude.ai/artifact/JmWyuPSczpraKth8R6pZan).
2. The faults (B), one at a time.
3. Section 5 built (5.1 to 5.3), then 5.4.
4. C2 to C5.
5. The release (E).

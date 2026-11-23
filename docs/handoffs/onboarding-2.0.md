# Baton: the 2.0 onboarding work

Written 2026-11-22 by the chat that began as the email revamp, and written again on 2026-11-23 at about 20:45 UTC as that chat is archived at his word ("good let's archive this chat"). `docs/handoffs/email-revamp.md` holds every word of his to that chat, dated, and how each thing was made. The record of the work itself is `docs/plans/onboarding-2.0.md`: read its last four sections first.

## Role and scope

Build what he decided for 2.0's onboarding, one piece at a time, on `ccr-07896cf2-bo0afd`. Brainstorm mode is his standing word: talk, plan in the repo, name the cost, and each thing drawn or built still goes to him before it ships. No push to main, no migration, no price, no legal line and no line about the faith without his word (AGENTS.md, stop conditions).

**How he wants it done (2026-11-22, about 21:53 UTC): "well let's do that then. each section until it's almost 10/10 and move to the next section".** The sections, what a ten is for each, its number and the order are in `docs/plans/onboarding-2.0.md`, "What a ten is, section by section". One section at a time.

**Where it stands.** Rows 0 to 3 of the order are built on the branch, each with its tests and its checks, and all of it ships with 2.0 (his word, 2026-11-23: "this is all going into v2.0 so no not livr"). The one thing of it readers have today is the guide's mend, on the main web at his word. Section 4, the first week, reads 7 on the branch; onboarding as a whole about 7 on the branch and 5.5 as readers have it.

**A fresh chat for what comes next.** The chat that planned this built it past its size, at his word ("no. you already have the context you do it"), and it cost what a long chat costs: $284 at its last finished turn, at 556,000 tokens of context (`docs/NOW.md`, Spend). The next piece begins in a fresh chat from this page.

## Done since the last baton

- The 1.9 release email in look 3, its test send, three admin mends: on main, `b89b56b11..b88c88b4f`. He sent the release on 2026-11-22.
- The reader map, written from the rules and held by a test (`reader-map.txt`, `reader-map.json`): `lib/onboarding/__tests__/readerMap.test.ts`. The reader web, drawn from it: `d10dc1752`, `1e49e368f`.
- Mock-ups 1 to 13, each from the app's own screens and passed by checkMock: the EU step; the need, the picks, the week (`6f2d4b8ec`); one day (`286b6a4db`); the lead, five ways; the welcome with no box.
- **Row 0, the week's card on Today:** whole and clear of the tab bar, and its page opens smoothly (`6efad5dba`).
- **Rows 1 and 2, knowing what works:** Admin, Onboarding, by road and by first pick (`550833dfc`); the weekly brief says each test's answer (`27c07bc7c`); the unit suite's one failing test mended (`3e78a2622`).
- **Find a parish:** the guide's card and the reader's own region first (`afef8b4f0`, `b01fec009`).
- **Row 3, the day's frame, dark for readers** (`lib/onboarding/flags.ts`, `DAY_FRAME_LIVE`; Testers mode walks it). A day of a first week is kept by the reader's own act and never by opening it: "Done for today" at the end of a council's, a saint's, a moment's and a lesson's page and of the calendar (`4b8af404e` to `d45e89078`, `6329d5fdd`, `aa3e029fe`, `aa7ce8164`); by the page's own end for a prayer, a chapter and the guide (`e0c1fe85c`, `855bb915d`); by the list's own act for a path, Find a parish, Your rule and today's readings (`552789c07`, `7f4b6fd32`). All sixty-three days of the roads' weeks are served, a reader's own pick opens one thing on every road, and no week opens a section's front page or the study library. The day's three lines are in twenty languages. The gate's probe for all of it: `node scripts/gate/day-frame.mjs`, 137 of 137 on the last export.
- **A fault of 1.9, found by that probe and mended:** the guide's "After the Liturgy" became an error page (`676995c49` on the branch). On the main web at his word, 2026-11-23: `60c400d3f`, pushed 19:35 UTC, served by 19:41 UTC, asked of purifyapp.net before and after.

## Open, each with its owner and next step

- **Next by the order: section 5, after day seven.** Owner: the next chat, plan first, at his yes. The week ends on a bare line, "Day 7 of 7, kept" (`docs/plans/reader-map/img/day-week-last-kept.jpg`). What a ten is and its pieces are in the plan ("5. After day seven"): a closing moment for the week that names the next step, a second week by the reader's need, "I went" at the door. His rule goes with it: a finish is a moment of its own (CLAUDE.md), noted and not designed. Read what each end shows today before drawing one.
- **Lighting the frame for readers is his word,** and three things come before it: the privacy page's sentence about a week's step must say "kept" (his to read; `docs/plans/reader-map.md`, section 12); his walk of the frame on a test build, which passes the pre-build gate first; and whether it is lit for every reader or as the tested fork the plan names.
- **The welcome on Today (section 3):** mock-up 13, drawn three times and still "plain, not designed" in his words. On hold by his word. Owner: his word to take it up again.
- **Small things in the record that are his to say:** the three choices made inside "Fix all 3" (which saint a road with none is given, Pentecost for history on every road, the Creed at every level; he answered "good"); the week's card reads "Tomorrow: Pentecost: the Descent of the Holy Spirit", with two colons, where the page's own bar says "Pentecost"; the Testers mark stands on the left of the Bible's chapter pill; "Paul's missions" stands twice on Pentecost's page; three faults in German and Urdu (`docs/NOW.md`, "Found").
- **His to do:** read the privacy page's two drafted sentences (`reader-map.md`, section 12); name a price for a lifetime plan and make it in the stores; say whether the Plus card's test runs to 2027-02-09; clear or change the readers' email look on his desk (`lib/email/look.ts` stands at "3", so each automatic list email goes to him alone until he does); look at the "to" line of the three copies of the 1.9 email that reached him on 2026-11-22 (read as three accounts whose mail lands in one inbox, unproven); send a picture of Admin, Onboarding, so its baselines can be read into the plan; and cut the store builds that carry the guide's mend.
- **Main's head is not in this branch.** Main holds `60c400d3f` over `b88c88b4f`; the branch holds the same lines of the mend, so 2.0's merge meets no conflict there. A fresh clone is shallow: deepen it before reading history across the two.
- **The standard he asked for** (2026-11-22: "let's try to 10/10 each and every single section"): `onboarding-2.0.md`, "What a ten is, section by section", and its status table.
- **Six things missing from the plan,** noted and not decided (`onboarding-2.0.md`, "An honest rating"): after day seven, reminders that need no account, a first prayer in the first minute, the door walked (done since), a week that waits, a welcome by email. His to pick.
- **A priest's glance:** the five lines about a need (`docs/plans/reader-map/mock-looking-for.mjs`, NEED). And Pentecost's page awaits a priest's read, as thirty-six of the forty history pages do.
- **Mock-up 1, the EU step:** still his yes or no.

## Gotchas

- `next dev` fails on this branch while Tailwind reads `docs/handoffs/updates-98q.md` (a class written with an angle-bracket placeholder). Move that file aside for the run. Never write that class out in any file.
- The native export the mock-ups were drawn from stood in the old chat's scratchpad and is gone with its container. Cut one from main as the store build is (CLAUDE.md, "The public key for an export, always"), then `node docs/plans/reader-map/mock-day.mjs <export>`.
- `checkMock` waits on the page's own clock: on a clock held by `page.clock.pauseAt` it never returns. Call off the waiting timers and resume first (`mock-looking-for.mjs` shows how).
- Playwright's `scrollIntoViewIfNeeded` leaves the week card's Begin under the tab bar, and a tap there opens the Bible. Bring the card clear before tapping it.
- A mock-up of the app is drawn from the app's own screen on the export, never by hand, and passes `checkMock` before he sees it. A page for him is made from the design kit and passes `docs/brand/kit/check.mjs --page`.
- The reader map is never edited by hand: `READER_MAP_WRITE=1 npx vitest run lib/onboarding/__tests__/readerMap.test.ts`, then `node docs/plans/reader-map/web.mjs`.
- Two tests are counting, not three; the Plus sheet's begins 2027-02-10. Finishing the questions and coming back are already counted by answer; the week, the locks and Plus are not.
- A probe that judges frames (`scripts/gate/frames.mjs`) must not pin the page's clock: `page.clock.install` moves the page's own timeline away from the one the screen's frames are stamped on, and the check then calls a glide a flash about one run in five. It also leaves the device's motion verdict stale, so "reduce" is walked with motion on. `scripts/gate/day-frame.mjs` shows the way: today on the device's own clock, only the day after by a clock moved on, and `assertMotion` on the page.
- A frame added around a page in the app's shell stands above the page's own sticky bar and pushes it down. Put a page's end inside the page (`lib/onboarding/dayFrame.ts`, `PAGE_OF`).
- A part that glides in an in-page move is drawn over anything with no name, the page's own bar included. Name the bars for the move (`stuckOver`, `lib/ui/inPageMove.ts`).
- The frame is walked with Testers mode on (`purify:testers`), where the Testers mark floats over the lower corner of every page: leave room for it.
- An observer's margin is never built from a place on the screen (`getBoundingClientRect().top` or `.bottom`): a place can be above the screen, its minus doubles, and the browser throws. Build it from a height or from the element's own style (`lib/ui/__tests__/observerMargins.test.ts`).
- A page kept by its own end tells the week in one of two ways (`components/onboarding/DayFrame.tsx`): `DayKeptBy done={...}` where the page knows its end (a prayer, the guide), `DayKeptAt` where the end is a place (a chapter). Neither draws anything.
- A list's own act tells the week the same way, drawing nothing: `DayKeptBy done={...}` for a path's "Mark as read", `DayKeptOnTap on="..."` for a tap (a parish finder), `DayKeptBy step="yourRule"` where the act ends on another page than the one the day opens.
- Two steps name the Church's own day, and what each opens is decided on the device, on the day (`lib/onboarding/dayStep.ts`, read in `useWeekDay`): today's readings are a walk on no page of its own, kept by `keepDayOf("readings")` in the walk's Done, and found by no page; the Church's year is the page of who leads the day. A walk of either depends on the day it is run: the probe reads the calendar's own files for a day with a page and one without.
- A reader is a seeker only because their first pick was the Fathers, the councils or history (`lib/onboarding/road.ts`). To walk one, store that pick; with no pick the same answers make a newcomer.
- What a pick opens depends on the road as well as the level: `pickStep(intent, level, road, lean)` (`lib/onboarding/week.ts`). The reader map's generator walks every road for it.
- The calendar has two shapes in two files, a phone's (`PhoneCalendar.tsx`) and a computer's: the day's end is made once in `CalendarClient.tsx` and handed to each. A page with two shapes takes its end the same way.
- The two documents he sent for 2.0 are not in the repository and are not to be written into it: it is public.

## His words that still apply

- 2026-11-22: "no more local. it stays on their accounts." "just add it in v2.0 with new terms". "eu users get it in their specific onboarding".
- 2026-11-22: "that's fine no mainland china".
- 2026-11-22: "don't show the plus on the onboarding they must run into plus feature or click on the premium pill".
- 2026-11-22: "everything recommended let's do it. and yes we can update the privacy policy."
- 2026-11-22: "I feel like the what are you looking for section is very very important", then "all recommended and let's continue".
- 2026-11-22: "I want each day of the path actually worked on. right now it's just acts as a hyperlink to a page." A day is kept by "tapping done".
- 2026-10-16, and it binds the week: no retention loops inside prayers. Nothing of the first week is drawn on a prayer's page (`components/prayers/PrayerRuleReader.tsx`, its head).
- 2026-11-23: "rec yes to all" ("Done for today" at the end of the day's page, never floating over it), and "sure finalize yes and rate our changes" (yes to its stills; a prayer's own finish keeps a prayer's day).
- 2026-11-23: "keep going" (the lesson days: the lesson's own "Next lesson" gives way to "Done for today").
- 2026-11-23: "yes" (a chapter's end and the guide's own finish keep their day, with nothing extra drawn).
- 2026-11-23: "do all" (yes to one pick for each of the eighteen list days; and the guide's mend made ready for the main web, its push asked again, alone).
- 2026-11-23: "ok to all and fix" (yes, push the guide's mend to the main web; yes to the two wordings of the week's card), and then "Fix all 3 (Recommended)" as worded on his screen: the calendar with Done at its end; a first pick opens one thing (saints = a saint, councils = Nicaea, history = Pentecost, beliefs = the Creed, feasts = the calendar with Done); the Testers pill over the readings bar.
- 2026-11-23: "good let's archive this chat".
- 2026-11-22: "unsure just recommended based off our principles and goals": the choices made on that word are in `onboarding-2.0.md`, "Decided by recommendation", and are his to overturn.

## Where things are

- Plans: `docs/plans/onboarding-2.0.md`, `docs/plans/reader-map.md`, `docs/plans/china-availability.md`.
- The map and its drawings: `docs/plans/reader-map.txt`, `.json`, and `docs/plans/reader-map/` (`web.mjs`, `mock-eu-step.mjs`, `mock-looking-for.mjs`, `mock-day.mjs`, `shots.mjs`, `img/`).
- Artifacts, his and private: the reader web https://claude.ai/artifact/53Drdsrfn8Nmo6gFnaW5z6; with example numbers https://claude.ai/artifact/8fm48CBrL6usMQkJftyzzy; the question https://claude.ai/artifact/K7VL7cv8dDx7s88rcgp3r4; one day https://claude.ai/artifact/RJrVoeYwVW3WNzQXpR2mW1; the EU step https://claude.ai/artifact/WSJAh3ZLSaFJWmPGkP4gxp; the reader map in photos https://claude.ai/artifact/Tah94bmVtwZMogfBTuVVAz.
- The kit's two new pieces, Web and Choice: `docs/brand/kit/pieces.css`, `docs/brand/design-kit.md`.

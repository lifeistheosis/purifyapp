# Baton: the 2.0 onboarding work

Written 2026-11-22 by the chat that began as the email revamp (`docs/handoffs/email-revamp.md` holds every word of his to that chat, dated, and how each thing was made). That chat is far past its size and hands over here.

## Role and scope

Build what he decided for 2.0's onboarding on 2026-11-22, one piece at a time, on `ccr-07896cf2-bo0afd`. Brainstorm mode is his standing word: talk, plan in the repo, name the cost, and each thing drawn or built still goes to him before it ships. No push to main, no migration, no price, no legal line and no line about the faith without his word (AGENTS.md, stop conditions).

**How he wants it done (2026-11-22, about 21:53 UTC): "well let's do that then. each section until it's almost 10/10 and move to the next section".** The sections, what a ten is for each, its number and the order are in `docs/plans/onboarding-2.0.md`, "What a ten is, section by section". One section at a time. A section is left when its pieces are built and walked by him and its number is being counted, and the next is begun only then.

**The first job is row 0,** a fixer's: the two faults of the week's card on Today, by the fix checklist (`docs/OPERATIONS.md`, section 5), each with a test that fails on today's code. Then sections 4 and 3 together, with section 6 beside them. How a mend reaches readers (a build, a push to main) is his word each time.

**Who builds (2026-11-22, about 21:57 UTC): "no. you already have the context you do it".** The chat that planned it builds it, at his word, past its size.

## Done since the last baton

- The 1.9 release email in look 3, its test send, three admin mends: on main, `b89b56b11..b88c88b4f`.
- The reader map, written from the rules and held by a test (`reader-map.txt`, `reader-map.json`): `lib/onboarding/__tests__/readerMap.test.ts`.
- The reader web, drawn from that map: `d10dc1752`. With example numbers: `1e49e368f`.
- Mock-ups 1 to 7, each from the app's own screens and passed by checkMock: the EU step; the need, the picks, the week (`6f2d4b8ec`); one day (`286b6a4db`).
- The plans: `docs/plans/onboarding-2.0.md` (read its last section first: what is decided and the order of work) and `docs/plans/reader-map.md` (sections 9, 11, 12).

## Open, each with its owner and next step

- **Row 0, the two faults of the week's card: done on the branch** (`6efad5dba`; the record is `onboarding-2.0.md`, "Row 0, done on the branch"). His answer to the two stills (2026-11-22): "it looks a little stacked and 2 click here is kinda immersion ruining". Mock-up 8 answers it, one lead with one Begin (`docs/plans/reader-map/mock-today-lead.mjs`), and awaits his yes or no; a yes replaces the card's place on Today. Then, the same evening: "can we actually revamped that design? try out different things" (mock-ups 9 to 12, four takes, all still a box) and "I want a better welcome back screen honestly ... I don't like the black box square design and remember multiplicity optimization" (mock-up 13: the lead with no box, the sky across the screen, the saint and the fast each said once; `docs/plans/reader-map/mock-welcome.mjs`). **Mock-up 13 is the one awaiting his yes or no now**, and it overtakes 8 to 12. His two words are rules in `CLAUDE.md`: each thing once on a screen, and a finish is a moment of its own (noted, not designed). When any of it goes to main and into builds is his word.
- **Rows 1 to 3 of the order** (the next chat, one at a time): numbers by road and by first pick in Admin from counts that exist; a line in his brief for each test; the new first week as one fork.
- **His to do:** read the privacy page's two drafted sentences (`reader-map.md`, section 12); name a price for a lifetime plan and make it in the stores; say whether the Plus card's test runs to 2027-02-09; clear or change the readers' email look on his desk (`lib/email/look.ts` stands at "3", so each automatic list email goes to him alone until he does); press the test send and the real send of the 1.9 email.
- **The standard he asked for** (2026-11-22: "let's try to 10/10 each and every single section"): `onboarding-2.0.md`, "What a ten is, section by section". Each section has what a ten is, its method, its pieces and its number, and the order to take them in.
- **Six things missing from the plan,** noted and not decided (`onboarding-2.0.md`, "An honest rating"): after day seven, reminders that need no account, a first prayer in the first minute, the door walked, a week that waits, a welcome by email. His to pick.
- **A priest's glance:** the five lines about a need (`docs/plans/reader-map/mock-looking-for.mjs`, NEED).
- **Mock-up 1, the EU step:** still his yes or no; it was not among the seven he left to recommendation.

## Gotchas

- `next dev` fails on this branch while Tailwind reads `docs/handoffs/updates-98q.md` (a class written with an angle-bracket placeholder). Move that file aside for the run. Never write that class out in any file.
- The native export the mock-ups were drawn from stood in the old chat's scratchpad and is gone with its container. Cut one from main as the store build is (CLAUDE.md, "The public key for an export, always"), then `node docs/plans/reader-map/mock-day.mjs <export>`.
- `checkMock` waits on the page's own clock: on a clock held by `page.clock.pauseAt` it never returns. Call off the waiting timers and resume first (`mock-looking-for.mjs` shows how).
- Playwright's `scrollIntoViewIfNeeded` leaves the week card's Begin under the tab bar, and a tap there opens the Bible. Bring the card clear before tapping it.
- A mock-up of the app is drawn from the app's own screen on the export, never by hand, and passes `checkMock` before he sees it. A page for him is made from the design kit and passes `docs/brand/kit/check.mjs --page`.
- The reader map is never edited by hand: `READER_MAP_WRITE=1 npx vitest run lib/onboarding/__tests__/readerMap.test.ts`, then `node docs/plans/reader-map/web.mjs`.
- Two tests are counting, not three; the Plus sheet's begins 2027-02-10. Finishing the questions and coming back are already counted by answer; the week, the locks and Plus are not.
- The two documents he sent for 2.0 are not in the repository and are not to be written into it: it is public.

## His words that still apply

- 2026-11-22: "no more local. it stays on their accounts." "just add it in v2.0 with new terms". "eu users get it in their specific onboarding".
- 2026-11-22: "that's fine no mainland china".
- 2026-11-22: "don't show the plus on the onboarding they must run into plus feature or click on the premium pill".
- 2026-11-22: "everything recommended let's do it. and yes we can update the privacy policy."
- 2026-11-22: "I feel like the what are you looking for section is very very important", then "all recommended and let's continue".
- 2026-11-22: "I want each day of the path actually worked on. right now it's just acts as a hyperlink to a page." A day is kept by "tapping done".
- 2026-11-22: "unsure just recommended based off our principles and goals": the choices made on that word are in `onboarding-2.0.md`, "Decided by recommendation", and are his to overturn.

## Where things are

- Plans: `docs/plans/onboarding-2.0.md`, `docs/plans/reader-map.md`, `docs/plans/china-availability.md`.
- The map and its drawings: `docs/plans/reader-map.txt`, `.json`, and `docs/plans/reader-map/` (`web.mjs`, `mock-eu-step.mjs`, `mock-looking-for.mjs`, `mock-day.mjs`, `shots.mjs`, `img/`).
- Artifacts, his and private: the reader web https://claude.ai/artifact/53Drdsrfn8Nmo6gFnaW5z6; with example numbers https://claude.ai/artifact/8fm48CBrL6usMQkJftyzzy; the question https://claude.ai/artifact/K7VL7cv8dDx7s88rcgp3r4; one day https://claude.ai/artifact/RJrVoeYwVW3WNzQXpR2mW1; the EU step https://claude.ai/artifact/WSJAh3ZLSaFJWmPGkP4gxp; the reader map in photos https://claude.ai/artifact/Tah94bmVtwZMogfBTuVVAz.
- The kit's two new pieces, Web and Choice: `docs/brand/kit/pieces.css`, `docs/brand/design-kit.md`.

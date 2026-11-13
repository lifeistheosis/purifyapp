# Baton: the arbiter

Written 2026-11-13 about 18:25 UTC by Arbiter 2 (session_01VuYTwbacb8geNS4VjyJwQh, arbiter from 15:39 UTC), at about 375,000 tokens, past the 200,000 line (OPERATIONS section 2). The arbiter before it was session_01VuYTwdsjYL2mmq2C2JSt2A (archived 15:41 UTC).

Read first: `docs/roles/arbiter.md`, `docs/NOW.md` (the roster, "Waiting on him", "Parked for his yes"), `docs/OPERATIONS.md` sections 2, 5 and 6, CLAUDE.md and AGENTS.md, then the last entries of `docs/1.9-build/BRAINSTORM.md` (from "Overdrive off") and, for a fault's history, `docs/1.9-build/notes/build-95.md`.

## Where 1.9 stands

- **Faults first, and they are moving.** Pushed this shift: Gate 2.0's cause 3 in part (cb1f2333; 80de39ef: the gift, the shop, a category's chips, the pill's fade); checkMock wears the two earned palettes and the walks draw the chapter's discussions (5964bbc1); the journal's Share on a computer (bc5af451); one way for a change inside a page to move, `lib/ui/inPageMove.ts`, with the FAQ, the calendar and Alaska mended (b80a8f7d); the World English Bible (0cac133df); the voices' first patch (03e4aa8a..91d8fcd6). Updates 22 has the rest.
- **Designs wait on his yes.** Every design page is in NOW's "Parked for his yes" table with its patch. He was asked (15:43, again with each new page) to answer "designs yes" or name the noes; the arbiter gives no recommendation on taste. On his yeses: ONE fresh Opus chat applies the approved patches together, rebased on the head (the land looks without Desert's part, as Updates 9's baton says; the emails' round 3 with the account and order emails' shell if he says yes to that), one export, one round of checkMock and walks, a push each. Then round 2 of the fifteen screens in a fresh Fable chat from `docs/handoffs/fable-fifteen-screens.md`.
- **The main web** has only the canonical fix of 1.9 (c7cdc638c). Nothing else of 1.9 is on main, the emails included.

## Asked of him, answers not yet in

1. The design pages: "designs yes", or the noes by name (NOW lists them; twelve pages, among them the Fast and the Journal with three answers and the emails' round 3 with two).
2. Note 23: recommended, the app asks in its own words before the phone's permission prompt; downloads pause when Purify is left (no Play declaration).
3. Note 28, the desktop revamp: recommended, in 1.9, folded into the fifteen screens with the computer's frame first, Fable designing, started once the fifteen screens' designs land.
4. The 1.9 promo film, "more animated" (his word 16:40): recommended, a five second sample now of the app's own cards and buttons moving into place and a transition; the whole film once the 1.9 screens are final. Not started: it waits on his "all recs".
5. The emails' round 3, two calls: recommended, Dark for everyone (the light scheme out of all nine); and the account and order emails' shell brought to Dark too, with before and after stills in the apply round.
6. The documentary insert (not 1.9): the 3D sample (https://claude.ai/artifact/5Z5B2zW1vopmX1e2WiiwNt), "yes film" or changes; and Pew's "50 to 65" band (recommended, keep Pew's words). On his yes a fresh Fable chat makes the full film from `docs/handoffs/fable-film.md` (about 2 hours of machine time, no money).
7. Decided, still to build: readers join the retention emails by one asking line in the welcome email (opt-in), before those emails are switched on. Give it to the apply chat or the next free fixer.

## The chats

- **Updates 19** (session_01VuYTwaQ5oxRr2ERLvFyCnt), from 15:36: the voices. First patch pushed; now the second patch, its export, stills with a stand-in voice list, and one page for his yes with three points (prompts on Android, licensed translations, Heart's name). Ask its token count before giving it more.
- **Updates 22** (session_01VuYTwcwrZdGSAQKSDTMEwD), from 18:21: Updates 21's baton. The calendar's wide grid on Cappadocian (4.40 and 3.78:1); the rest of the in-page faults (Community 9, plans/acts 5, Today 3, prayers 4, pagers and tabs, the aria-expanded disclosures, /premium/ anchors, the two Terms lines, the council's Next); the profile card's 240px; causes 7, 8 and 9. Told: the walk's "misplaced" check subtracts the page's own scroll, proved both ways.
- **Company guide** (session_01VuYTwcFgb1g1Py4mRbRNrD): LLCs, tax, Florida; no repository.
- **No SSM chat.** A fresh one takes `docs/handoffs/ssm-board.md` once his design answers are in: "Seven more Bibles" in the drop's line, the store texts, Discord and board.json; the Holy Mountain's line; the count of looks after Desert; the voices' line; and the Vault: the 1.8 kit page, the 1.9 film's first cut, the documentary's first film (an explainer).

## Gotchas

- `date -u` before writing a time, every time (one of his times was written as 16:22 for 16:40 and mended).
- get_session's token count reads 0 for a fresh chat and lags for others; ask the chat. A message sent with priority "later" waits for its turn to end, and a chat at its line puts the item in its baton.
- A Fable chat in a long turn may not see a message for hours (the looks chat read messages of 08:46 at 16:06). Interrupt, then archive, when a parked chat keeps working.
- At a hand-over both arbiters may edit NOW at once: `git pull --rebase` and merge by hand.
- The clone is shallow: `git log -- <file>` stops at a boundary commit that seems to add everything (dc29e9cab). Read the file, not the log.
- gh is for search only here, and the cloud chats' GitHub tools cannot list a commit's checks: MERGE-DAY 6.3 now says he reads the Supabase check's mark, or gives the check's id.
- The emails' pictures answer 404 on the main web until the merge, so a page for his yes carries its own pictures.

## His words that still apply (2026-11-13)

- "I want everything fixed in v1.9 no pushing out to 2" (about 08:13 UTC)
- "well we are fine but yes optimize of course" (about 15:38)
- "keep all the emails default Purify colors. and also revamp the calendar design one" (about 16:44)
- On the 1.9 film: "I wanted it to be more animated (I.e button move onto the screen and the actual cards move on the app and fit into place and it transitions to each screen etc)" (about 16:40)
- On the documentary: "I'm referring to high quality animated visuals (I.e a globe that spins with edit style animations) 3d visuals etc)" and "and do 1:1 ratio" (about 16:49 and 16:50)

## Where things are

- His calls page: https://claude.ai/artifact/HtMHvpk9SsKLwXG7AgJutq (not updated this shift; read it with the Artifact tool before publishing to it).
- The documentary: `docs/promo/orthodox-america/` (BRIEF.md with round 2, SOURCE.md, the first film's code, `3d/` for the sample).
- Held for his yes: NOW's Parked table (patches under `docs/1.9-build/drafts/`, `docs/1.9-build/held/fast-journal/`, `docs/1.9-build/notes/build-95/`).

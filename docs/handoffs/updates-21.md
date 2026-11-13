# Baton: Updates 21 (a fixer: Updates 20's owed checks, faults A and B, the in-page faults, 1.9)

Written 2026-11-13 by session_01VuYTwb19TRWGtD8gWeGF7n (Updates 21), reporting to Arbiter 2 (session_01VuYTwbacb8geNS4VjyJwQh), rotated at its context budget (200,000 tokens). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton, then `docs/handoffs/updates-20-inpage-sorted.md` (the list of in-page faults, by screen). `docs/handoffs/updates-20.md` holds the older open items (the profile card, causes 7, 8 and 9) with what was known.

## Role and scope

Mend what the arbiter routes, each fault with a test that fails on the old code, proved by the gate's walks on an export cut by `scripts/gate/export.mjs`. Nothing changes how a screen looks at rest without his yes.

His ruling (2026-11-13, relayed): in-page changes that move content (a tab, a pager's Next, a question opening, a card dismissed) move as page switches do; a filter or a count may change at once. The arbiter's calls (2026-11-13): Community's cold-start rise is the main web's pre-merge no, not a fault (recorded in `docs/1.9-build/notes/gate-2.md`); a line a tap shows that moves what is below it is moving content, so the shop item's and /signup/'s "Please agree..." lines are faults.

## Done (hashes)

- `bc5af451` **Fault A, the journal's Share on a computer.** `components/journal/SharePageButton.tsx` now goes by `lib/share/shareOut.ts`; a copy turns the mark to a check with "Link copied" for a screen reader, as `ShareButton` does. Proved by tap at 1032 on the exports: old (`5dac737f`) made the link, counted a share, copied nothing, said nothing; new (`c31641c9`) copies the link and says so, then returns to its label (2 left). Walk: the scratchpad's `share-walk.mjs` (copy below).
- **Fault B, the tab bar over a field with the keyboard up: not a fault on the head.** Updates 7's `b7a460d7` (10:06 UTC) came after the Fable chat's journal walks (its round 1 routed it to Updates 7 at 08:04; its walks were before 09:16). On the export of `5dac737f`, a 320px stand-in keyboard (the screen made shorter, Android's model) over the journal's search, Discover's, the saints', the dictionary's and the sign-in fields: `data-keyboard="up"` set, the tab bar hidden (visibility hidden, opacity 0), no bar at the foot over the field. A real keyboard stays on his phone walk (note 14's lines in NOW).
- `b80a8f7d` **The one way for in-page changes: `lib/ui/inPageMove.ts`.** `movePage(update, { grows, glides })` pictures the screen (a View Transition), makes the change under the picture with flushSync, and the two move on the house curve in `--duration-base`: the part that opens or closes wears `in-page-grows-1` (clipped to its box, `app/globals.css` "A change inside a page moves"), what follows it glides by name (`partsAfter`), the rest cross-fades. `movePageUntil(step, ready)` holds the picture for a change that comes later (an address, a fetch), `HOLD_MS` 320 at most; `awaitArrival(key)` and `arrive(key)` (from a layout effect) give it its `ready`. Still under reduced motion; at once while a page switch settles or another move runs. `moveQuestions()` (mounted once in `MotionRoot`) does every `<details>` in the app. `showOpened` waits while a move runs (scrolled under the picture, its two ends stood at two places: found in stills of the FAQ, missed by the frames check).
  - Mended with it: **the FAQ's 9 cuts**; **the calendar's 11 jumps** (a day or a month changes the address inside `movePageUntil`, held until the panel's layout effect says `arrive`; the panel's own fade is skipped when pictured); **Alaska's 4 cuts** (the parts row's `scrollTo` takes `behavior: scrollBehavior()`). By the same listener, not yet walked: **a chapter's "Before you read" (2) and What's new's months (2)**.
  - **Proved on the export of `c31641c9` (cut before the rebase; the same code as `b80a8f7d`)** (the gate's export), the motion walk (`scripts/motion-walk.mjs --only /faq/,/calendar/,/history/alaska-mission/ --online --workers 1`): new reader 75 recorded changes, 0 fails, 0 unsure (Gate 2.0's run had 24 faults there); open reader 74 changes, 2 "misplaced" on Alaska's People and Sources: the open reader's map place label `p[data-thread-map-place]` "Kodiak" drawn at y 125 then 54 (and -4), x unchanged: it moves with the page during the new glide, which the gate's misplaced check (written when such scrolls were instant) reads as a box with nothing moving it. A reading of the gate, not a fault on the screen; the arbiter's call whether the check subtracts the page's own scroll.
  - Proved before the code: the gate's frames check (`recordFrames`/`judgeFrames`) on FAQ taps of the export of `5dac737f` with the way put into the page: as cut 3 of 3 failed, with it 0 of 3, and 0 closing and with the CPU slowed four times. Test: `lib/ui/__tests__/inPageMove.test.ts` (10, all fail on the old code).
- `daf22b5b` Gate 2.0's record carries the arbiter's two calls.
- **Item 1, the owed checks (on the export of `5dac737f`, new reader):** Community by colour on all 22 palettes passes at 800, 1032 and 390 in Arabic (`--limit 900`). The pixels pass at 390 on all 22 palettes: Settings passes with every word on a picture measured; Community passes, the only words left being avatar initials wholly under their photos ("no pixels to read under it": not seen); Nicaea's Symbol of the Faith passes. The legal sheet: see the report.

**checkMock on the touched screens** (export of `c31641c9`, new reader, 22 palettes, pixels where words on a picture were left): /faq/, /calendar/, Alaska and /journal/ pass at 390 in English and Arabic, and at 800 and 1032 except one fault this change did not make (nothing at rest moved):

## Open, in the arbiter's order

0. **New: the calendar's wide grid fails contrast on the Cappadocian palette** at 800 and 1032 (English): the feast days' numbers 4.40:1 and the feasts' names 3.78:1 (need 4.5:1), the festal colour on that earned palette's ground (`components/calendar/CalendarGrid.tsx` / `CalendarCell.tsx`, the rubric). Found because checkMock now wears the earned palettes (`5964bbc1`); the phone's calendar at 390 passes. Mend with the least visible change that passes every palette (as Updates 20 did for the discussions card), then checkMock at 800 and 1032. Log: the runner's output on `/calendar/` (800, en).
1. **The rest of the in-page faults** (`updates-20-inpage-sorted.md`), each now a few lines with `movePage`:
   - **/community/ 9:** the replies open in place (`aria-expanded`, a region named by `aria-controls`): `movePage(() => open, { grows: [region] })`; the replies arriving from the website (127px at 1024ms) need a second move when they land (`movePage` around the state set from the fetch, `grows` the same region). "Read more": `grows` the post's body.
   - **/plans/acts/ 5:** "Mark day N as read" (`components/plans/PlanPath.tsx` onToggle, `PlanClient.tsx` toggle): the streak line appears and the days move 41px. Wrap the toggle's state change, `grows` the streak line's box.
   - **Today 3:** Dismiss on a road card (`components/onboarding/RoadCards.tsx`): the card is gone in the new state, so name its parent as `grows` (it shrinks), not the card; "For today's saints, 2 more" (`components/today/ChurchTodayRail.tsx`): `grows` the list.
   - **/prayers/ 4:** a chapter opens as the one above shuts (by design, `PrayerBookContents.tsx`): two `grows`, both chapters.
   - **The pagers and tabs** (Comma Johanneum's reader 4, /start/first-liturgy/ 4, the saints' web Timeline 1, Job's order 1, /pricing/ Try it 2, /florilegium/ Begin 2): `movePage` around the state change; a pager's whole page cross-fades.
   - **Disclosures by `aria-expanded`:** the legal texts' Contents 3, /shop/request/ More details 1, Settings' Councils goal tile (c28) 1, /prayers/personal/ Start from 1.
   - **Anchors:** /plan/ and /premium/'s "See Purify Plus/Pro" (2): `<a href="#plus">` in a server page; a small client link that scrolls with `scrollBehavior()`.
   - **The two lines a tap shows** (shop item's Buy now, /signup/): `movePage` around the state that shows or hides the line.
   - **The council's "Next: Canon I"** (1): re-walk first; it may be `ab4adfd3`'s jump by another way in.
   - Prove each with `scripts/motion-walk.mjs <export> --only <screens> --online --workers 1`, both readers, and a still mid-move (the frames check passes a scroll under the picture; the eye does not).
2. **Item 4, the profile card's 240px** (`ProfileViewer.tsx`, `useDraggableSheet`): not started; Updates 20's notes stand (keep the panel's top in layout; the feed's posts carry no `status`, a server change to `/api/community/posts` that reaches the apps only from the merge).
3. **Item 5, causes 7, 8 and 9 and the shop item's zero-length transform; the council's plate as stills for his yes, no build:** not started; Updates 18's notes stand.

## Gotchas

- **A View Transition's new picture is live:** anything that scrolls the page or animates on its own during a move shows inside it. `showOpened` now waits; a screen with its own entrance (the calendar's day fade) skips it when `isMovingInPage()`.
- **The frames check passes what the eye fails:** a move with a scroll under it passed `judgeFrames` and showed doubled words. Take a still at 50ms and 110ms after the tap.
- **`<details>` needs nothing of its own:** `moveQuestions` takes every summary click; mark a part `data-in-page-still` to keep its own way.
- From Updates 20: a runner in the scratchpad imports playwright by its path; measure by colour first, pixels only where words on a picture are left; copy an export (`cp -a out <dir>`) to walk it while working.

## His words that still apply

- 2026-11-10: "Every page switch is a transition" (CLAUDE.md).
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## Where things are

- The helper: `lib/ui/inPageMove.ts`; its rules: `lib/ui/__tests__/inPageMove.test.ts`; its CSS: `app/globals.css`, "A change inside a page moves".
- Walk scripts of this round (copied from the scratchpad): `docs/handoffs/updates-21-walks/` (`kb-walk.mjs` the stand-in keyboard, `share-walk.mjs` fault A's tap, `inpage-trial.mjs` the frames check with a way put into the page, `touched-check.mjs` checkMock on a chosen export).

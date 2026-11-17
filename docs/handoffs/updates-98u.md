# Hand-over: Updates 98u (2026-11-17)

Started 06:46 UTC by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) on Gate 6c's motion faults in its files (`docs/handoffs/gate-6-walks/motion-6c.tsv`, 58 rows; 45 are in this chat's files or screens, 13 are Updates 98t's) and the Nicaea tap left open by Updates 98s.

## Commits

After `git pull --rebase` onto `d66d08f1` (upstream's four commits were docs only):

- `152b76ae` Settings' space choices grow their rows as a change inside the page; the dictionary's words wait for their definitions.
- `9a37bb25` The reader's controls take no touch while they step away (the Nicaea document's "The council's page").
- `e74945ed` litPanels test: the focus card's writes, in the same order, inside the move (the old pattern pinned the handler's shape).
- `767d7aae` and this file: the hand-over.

App code is committed and **not pushed** (the arbiter's word: no app code until it says); the docs wait with it, since they sit on top.

## Mended

| Rows | Screen, lane | Still's numbers (Gate 6c) | Cause | Mend |
|---|---|---|---|---|
| 22 | /settings/, on: the 11 focus cards | cut 86 to 89% of the change in one frame at 102 to 121ms; "Reading mode Dark John Chapter 1" jumped 48px (0,584 to 0,632) at 80 to 94ms | A new reader has no focus yet; the first card brings the Day 1 under the cards (48px), drawn at once, everything below dropping | `movePage(..., { grows: [focusRow] })` (`lib/ui/inPageMove.ts`): the row grows, what follows glides. The account save moved inside the update, after the writes (the update runs inside the transition) |
| 6 | /settings/, on: "Completely new", "Learning", "Practicing" | cut 77 to 80% at 114 to 120ms; the Fasting row jumped 26, 26 and 45px (17,494 to 17,520 or 17,539) at 86 to 88ms | The line under Familiarity comes with a first answer (one line; two for Practicing) | `movePage(..., { grows: [levelRow] })`. `Row` (`components/settings/LitPanel.tsx`) lends its box by an optional `rowRef` |
| 1 | /dictionary/, reduced: "Find a word" | "Archimandrite" jumped 84px (12,598 to 12,682) at **295ms** | The list was drawn as soon as the library's lists had come; each word's definition (`loadDefinitions`, its own fetch) came after and grew the rows over it by a line: a part that lands late and shoves what is on screen | The dictionary's list waits for its definitions and comes once, whole, as the strip waits for its kinds; if they cannot be read the words are listed without them (`components/search/CommandPalette.tsx`) |
| item 8 | /councils/first-nicaea/the-synodal-letter/, the tap walk: "The council's page" | "nothing: the tap changed nothing", 2 of 2 on that screen; reproduced here on this export (`1 screens, 13 controls tapped, 1 failed`) | See below | `app/globals.css`: the controls stepping away take no touch |

### The Nicaea tap: the cause

98s's lead (state left by the earlier taps) did not hold: a probe that replays the walk's own steps (`fresh`, `firstTouch`, `reach`, `aimOf`, `tapAt` from `scripts/lib/tap.mjs`), tapping the six controls before it and taking the walk's Back after "Next: Salutation", landed the link every time. So the touch's events were logged inside a scratch copy of the walk itself (never committed): `pointerdown`, `touchstart`, `pointerup` and `touchend` all met the link, and the **click met a `div`**, the reader's pill (`div.reader-pill-in` in `[data-reader-chrome][data-reader-pill]`, in `article[data-council-reader]`). At the touch `body[data-reader-away]` was set, and the pill was fading down over the link: box 680 to 752 (the link 736 to 757, the finger at 92,747), opacity 0.68 at the touch and 0.49 at the lift, 3.9 then 6.1px of its 12px down, `visibility: visible`, since visibility goes only at the end of the 560ms leave. The walk's scroll to the page's foot, inside 1.2s of its first touch, reads as the reader's hand (`lib/ui/scrollAway.ts`, HAND_MS) and sends the controls away; the walk then taps inside the 560ms leave, and the pill, at rest exactly where the page's last line stands, takes the click on its body. A reader who flings to the end and taps the last link at once meets the same.

The mend is one rule: while they step away, the top bar's plates, the pill and the tab bar, and every control in them (each sets its own `pointer-events: auto`), take no touch. Unlayered, so it holds over the utilities. How anything looks is unchanged; a keyboard still reaches a control (focus is not a pointer). With the rule added to the built stylesheet of the same export, the walk copy logged `cap click a[href=/councils/first-nicaea/]` and `pushState /councils/first-nicaea/`: `1 screens, 13 controls tapped, 0 failed`.

## Ruled not a fault

The arbiter's ruling for this round: a move the reader asked for (a contents link, a pager's Next, a filter that changes the list) is not a fault in itself, and with motion reduced it may be instant. Each row below is the reader's own change, made at once on the reduced path (`movePage` and `movePageUntil` make the change at once there, which the owner's ruling of 2026-11-13 allows), or a filter; each of the reduced ones passed with motion on in Gate 6c's own walk (0 fails, 0 unsure).

| Screen, lane | Control | Still's numbers | Why |
|---|---|---|---|
| /settings/, reduced | "Completely new" | the Fasting row jumped 26px (17,494 to 17,520) at 82ms | The same line under Familiarity, at once with motion reduced; with motion on it is now moved (above) |
| /chants/, on | "Greek", "Serbian", "Contemporary" | "The Paschal Canon" 617 to 553 (64px) at 80ms; "Psalm 135" 553 to 490 (63px) at 92ms; "The Prayer Rope Anthem" 681 to 490 (191px) at 86ms | A filter that changes the list: the rows left close up the room of the rows filtered out above them. The chips under the finger do not move. (`inPageMove.ts`'s header: "a filter or a count may change at once") |
| /, /signout/, reduced | "Dismiss" | `span.verse-light` 480 to 302 (178px) at 95 and 92ms | The banner the reader dismissed leaves at once |
| /privacy/, reduced | "Contents 12" | h2 "On this device vs signed in" 238 to 799 (561px) at 86ms | The contents the reader opened, let down at once (`LegalContents.tsx`, `movePage` grows) |
| /councils/ancyra-314/the-twenty-five-canons/, reduced | "Next: Canon I" | the reader's article 356 to 86 (270px) at 113ms | A pager's Next: the canon turned at once (`useWorkPlace.ts`) |
| /calendar/, reduced | "October 2026" | the day's line 77,654 to 21,654 (56px sideways) at 122ms | The month the reader chose, its day drawn at once (`PhoneCalendar.tsx`, `movePageUntil`) |
| /calendar/, reduced | "Old" | the day's fast line 654 to 681 (27px) at 84ms | The calendar the reader chose, its day drawn at once |
| /fasting/, reduced | "Today Nativity Fast, fish allowed", "Mon, Nov 16 ..." | "Sun, Nov 15" 553 to 620 and 490 to 557 (67px) at 91 and 82ms | The day the reader opened, at once |
| /start/first-liturgy/, reduced | "Yes, I am going", "Not yet, just reading" | "Which kind of church is it?" 51 to 128 (77px) at 82 and 81ms | A step of the guide turned as a pager, at once (`FirstLiturgyGuide.tsx`, `movePage`) |
| /signup/, reduced | input (the agreement box) | "By creating an account you agree to the" 745 to 718 (27px) at 100ms | Ticked, it lets go of the hint under Google, "agree first" (`OAuthButtons.tsx`, mt-2 and one caption line: 27px), at once (`SignUpForm.tsx`, `movePage` grows the box) |

## Updates 98t's

- /chants/, reduced, "Play": "Cover Words Psalm 135 ..." drawn first at 0,844 then at 0,0, 134ms after the tap. That is the chants' Now playing, which the brief gives to Updates 98t. Not touched here.
- The other 12 of the 58 rows (Discover and the front door into /reading/, the Creed into a council document, StudyShelves, BibleBooks, the Prayers readers' Chant, MobileWorkPill on /fathers-on/anger/, What's New and its tour) are 98t's.
- Shared file: `app/globals.css` (one new rule after the reader's away rules, near line 963). `MobileWorkPill.tsx` is not touched.

## Checks

Two exports, both by `node scripts/gate/export.mjs` (exit 0, `export size: 207.5 MB on disk in 7,367 files, 75.8 MB packed`, the key the main web's anon role, printed and written nowhere): the first with the Settings and dictionary mends, on which the Nicaea cause was found; the second with the stylesheet rule too, on which everything below ran (the rule checked in its built CSS). Head walked: `1e9c3db9` (now `9a37bb25`).

- Tests that fail on the old code: `lib/settings/__tests__/spaceChoicesMove.test.ts` 3 of 3 fail on the old Settings, `lib/search/__tests__/dictionaryWords.test.ts` 2 of 2 on the old search, `lib/ui/__tests__/awayTakesNoTouch.test.ts` 2 of 3 on the old stylesheet (its third holds the leave as it was); all pass on the new.
- `npm run typecheck`: exit 0.
- `npm run test:unit` on the rebased head: `Test Files 1260 passed | 1 skipped (1261)`, `Tests 15511 passed | 9 skipped (15520)`. (The first run, before `e74945ed`: 1 failed, `litPanels.test.ts` "writes the one answer as the intent", whose pattern pinned the handler's old shape.)
- `npx eslint` on the changed code files: exit 0.
- `npm run build`: exit 0, `✓ Compiled successfully in 48s`, `✓ Generating static pages using 2 workers (6527/6527)`.
- The motion walk as `walks6.sh` runs it (`SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --workers 2 --online --cpu 4 [--reduced]`) on the three touched screens, two more readers the stylesheet rule reaches (`/bible/john/1/`, `/saints/athanasius-the-great/against-the-heathen/`) and the nine screens of the ruled rows:
  - Motion on: `14 of 14 screens walked, 251 controls tapped`. `/settings/: 30 tapped, 0 failed, 0 unsure` (28 rows before), `/dictionary/` 30 and 0, the Nicaea document 13 and 0; every ruled screen 0, but the three Chants filters (64, 63 and 191px, as ruled). One more: `/bible/john/1/` a community post on the chapter (`a "B bogomilrusanov42 · 1mo John chapter 1"`, went to /community/), `blank: 7 frames ... for 211ms, from 1628ms after the tap`: the Community page arriving from the main web; Gate 6c walked another chapter of that route, so it is in no row; outside these files and not touched by these mends.
  - Reduced: `14 of 14 screens walked, 72 controls tapped`. `/dictionary/: 6 tapped, 0 failed` (the 84px late shove gone). The ruled rows fail as ruled, each with Gate 6c's numbers to within a few ms (Settings 26px, Dismiss 178px twice, Privacy 561px, Ancyra 270px, Calendar 27 and 56px, Fasting 67px twice, First Liturgy 77px twice, Sign up 27px), and 98t's Chants "Play" (misplaced, 0,844 then 0,0, 151ms). Two more of the Ancyra kind on the readers walked for the rule, a pager's Next turned at once: the Nicaea document's "Next: Salutation" and Athanasius's "Next: Part II", 270px each (356 to 86) at 112 and 117ms (Gate 6c walked one document of each route).
- checkMock with pixels, all 21 palettes and looks (`SELLS_PLUS=1 node scripts/guardrail-walk.mjs out --online --every --size <W>x<H> [--lang ar] --only <the five>`): `5 screens measured, 5 with nothing failed` at 390x844, 800x1280 and 1032x1376, in English and in Arabic (six runs).
- The tap walk as a new reader (`SELLS_PLUS=1 node scripts/tap-walk.mjs out --max 80 [--lang ar] --only <the five>`): English `5 screens, 176 controls tapped, 0 failed`, Arabic `5 screens, 176 controls tapped, 0 failed`; both `sheets, menus and dialogs the taps opened: 17 distinct ... 0 failed`. "The council's page" passes in both.

## Not proved

- On a phone: nothing here reaches one until a build is cut with these commits. The Nicaea finding wants the release APK: fling to a council document's end and tap "The council's page" at once.
- The reduced rows ruled above still fail the motion walk by its rule (a shift with no name on it); none is named, by the arbiter's ruling for this round.

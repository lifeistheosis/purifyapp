# Hand-over: Updates 98u (2026-11-17)

Started 06:46 UTC by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) on Gate 6c's motion faults in its files (`docs/handoffs/gate-6-walks/motion-6c.tsv`, 58 rows; 45 are in this chat's files or screens, 13 are Updates 98t's) and the Nicaea tap left open by Updates 98s.

## Commits

- `1021c827` Settings' space choices grow their rows as a change inside the page; the dictionary's words wait for their definitions.
- `1e9c3db9` The reader's controls take no touch while they step away (the Nicaea document's "The council's page").
- This hand-over.

App code is committed and **not pushed** (the arbiter's word: no app code until it says).

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

RESULTS_PENDING

## Not proved

- On a phone: nothing here reaches one until a build is cut with these commits. The Nicaea finding wants the release APK: fling to a council document's end and tap "The council's page" at once.
- The reduced rows ruled above still fail the motion walk by its rule (a shift with no name on it); none is named, by the arbiter's ruling for this round.

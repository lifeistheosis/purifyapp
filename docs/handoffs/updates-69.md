# Baton: Updates 69 (blank frames in the five tabs' page switches)

Written 2026-11-14 about 23:15 UTC by Updates 69 (session_01VuYTwds5reaRYvVTAen8AK), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Past the brief's 150,000 line once the mend was proved, so item 4 (fonts) was not started.

## What the frames are

**Round 4's "42 blank-frame findings" were dips, not failures.** The walk lists a stretch of under a fifth of a second with nothing drawn as a dip (for the eye, not failed); only one over 200ms fails. Round 4's exit 1 came from other kinds (a carried picture, the shop's offline jump).

| Export | Walk, motion on | Walk, reduced |
|---|---|---|
| Head `cdb67306d` (ready-ahead in) | 1 blank FAIL: John 1 to John 2 from the pill ("Next: John 2"), 14 frames, 232ms from 347ms. Dips 67: 48 at 50ms or less, 14 at 51 to 100, 3 at 101 to 150, 2 at 151 to 200 | 0 blank, 2 dips (18, 34ms) |
| `27e539c63` (just before 2a58d08e; 59d1fd98 is not in the repo) | The same FAIL: 14 frames, 249ms from 350ms. Dips 68: 55, 9, 3, 1 | 0 blank, 2 dips (18, 34ms) |

**Real, and older than the ready-ahead.** The other long dips are Bible chapter switches too (Previous: Luke 24 135ms, Acts 110, Luke 107, Continue reading John 2 90 to 198). Still: the head's `bible_john_1-c4-blank-0.png` (frames at 338, 363, 579, 1161ms): John 1 almost gone at 363ms, the pill already on John 2, nothing in the reading area until John 2's name and first line at 579ms.

**Why** (`switch69.mjs` on the head's export, 3 runs, the same each time): React's commit runs about 105ms inside the transition's update (the old page frozen on screen, not blank); the transition is ready about 244ms after the tap, class `nav-swap`; the wrapper is marked carried (`swap`, its own fade off) and the chapter's entrance starts at 0. But the entrance keeps the note 220ms and the first line 240ms behind the head, while the old page is gone within the transition's first 50ms. The reading area held about 2% ink from 310 to 520ms (7.9% before, 8.9% after). CSS timing, not the container's drawing: a phone runs the same timeline. The same fault was mended for the rows' cascade on 2026-11-13 (Gate 2.0) and behind an outline on 2026-11-14 (cause 7, `.route-fade[data-after-outline]`); a carried page never got the second half.

## The mend

`23f2534a` `app/globals.css` (the View Transitions' rules, where the cause is): `.route-fade[data-carried] .page-open-after { animation-delay: 0ms }` and `.route-fade[data-carried] .page-open-words > :nth-child(-n + 8) { animation-delay: calc(var(--line, 0) * var(--stagger-step-tight)) }`, the pair the after-outline case already has. The head still rises in its own time; reduced motion and a phone with no View Transitions are untouched. It reaches the chapter, a Father's work and a council's words when they arrive in a transition.

- Measured before committing, the rules injected on the head's export and judged by the walk's own judge (`judge69.mjs`): Next: John 2 FAIL 229, 229, 232ms becomes dips of 52, 50, 50ms; Previous: Luke 24 dips of 130, 129ms become 55, 55ms.
- Test, `lib/ui/__tests__/routeMotion.test.ts` "nor do a book's words keep their place behind its head there": on the old stylesheet `expected 220 to be +0`; passes on the new.
- Checks: typecheck exit 0; `npm run test:unit` exit 0 (1197 files passed, 1 skipped; 15167 tests passed, 9 skipped); eslint clean on the changed files; `npm run build` exit 0 (6526 pages). Run before the rebase onto c474ace2; the push guard ran its checks after it.

## Open

| What | Owner | Next step |
|---|---|---|
| The walk on the head after `23f2534a` | the next checks chat | The five tabs both ways; expect no blank FAIL, and the chapter dips near 50ms. |
| Item 4: does a font swap move the heading on Saints' and Settings' first openings? | a fixer | Not started (the line). Both read woff2 after the tap (Updates 59). |
| `/discover/` Shop: "We couldn't reach the shop" jumps 208px (both exports, offline) | Updates 68's area | Read first: may be the offline walk only. |
| `/` Today's Saint: the picture not carried into `/saints/apostle-philip/` (both exports) | a fixer | Seen in round 4 too. |
| `/` reduced, a road card's Dismiss: the row below jumps 179px (both exports) | a fixer | components/onboarding/RoadCards.tsx. |

## Gotchas

- The walk's dips are not findings: count `findings` with kind `blank` in the JSON, not the dips list.
- The walk's arrival is a `router.push` with no touch, so it never stops the ready-ahead; a tap does.
- The export stashes web-only routes out of `app/` while it builds; a stop hook mid-export sees them as deleted. Never commit then.
- A link at a chapter's end is off screen: `judge69.mjs` taps without scrolling, so use the pill's links.

## Where things are

`docs/handoffs/updates-69-runners/switch69.mjs` (one switch frame by frame: transitions, page state, long frames, ink), `judge69.mjs` (one tap judged by the walk's judge, `--css` for a variant). The runs' JSON and stills were in this session's scratchpad; the numbers above are the record.

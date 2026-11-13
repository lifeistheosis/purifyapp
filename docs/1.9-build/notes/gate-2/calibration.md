# Gate 2.0: the transitions check, calibrated on real frames

2026-11-13, 10:30 to 10:50 UTC, on build 95's export (`6193982d5`, cut with the store's switches), one phone at 390 by 844, the app's motion on. Each switch recorded with the walk's own recorder (`scripts/gate/frames.mjs`), every frame from the tap until the screen stood still; per frame, the share of the screen before and of the screen after it shows (the fit) and the share of the changing region it inks. The contact sheets here run from the tap, eight frames a row, each labelled with its time after the tap and the fit's total.

Why: the first full run (09:11 to 10:24 UTC) reported 666 groups for the new reader, 335 of them "blank" and 101 "cut". A check that fails the house's own design on every page is a check nobody can route from.

## The house's own switch

`app/globals.css`, "Every page switch moves": the page being left goes in 140ms on the house curve (`cubic-bezier(0.22, 1, 0.36, 1)`), so it is a fifth of itself or less in its first frame, on purpose ("The page being left is all but gone before the next one shows"); the next arrives from 40ms on, in 260ms (300ms forward).

| Switch | Empty where it changes (nothing inked) | What the old rules said |
|---|---|---|
| A page (Today to Prayers, from the address) | 203 to 252ms, about 50ms; then the hero, then the words | blank (222ms under a third by the fit alone) |
| A page (Today to You) | 222 to 268ms, about 45ms | a dip |
| A tab (About to Today) | 219ms, one frame | a dip |
| Back (Catechism to Today) | 198 to 237ms, about 40ms; whole to a fifth in its first frame | blank: "the screen emptied at once" |
| A card with its picture carried (Prayers to Morning prayers) | 249ms, one frame | a dip |
| The Terms sheet rising over Sign in | never (the sheet's words move through the frames) | blank: the fit cannot explain a moving sheet |

Sheet: `calibration-back-catechism.jpg` (the designed exit the old rule failed), `calibration-arrive-prayers.jpg` (the picture before the words, not empty).

So the house's own switch is empty for 50ms at the most, and three of the old rules failed it: "emptied at once" (its first frame), the fit alone (a sheet in motion, a picture before its words), and the cut's distance measure (below).

## What is really empty

| Switch | Empty where it changes | |
|---|---|---|
| Discover to Saints (the arbiter's positive) | 384 to 663ms: 220ms with nothing at all on the screen but its bars, then Saints at 3 to 11% until 741ms | fails, as it should |
| John 3 to John 2 ("Previous: John 2") | 311 to 839ms: the page area empty to 513ms, then the heading alone; the verses from 823ms | fails |
| A shop item from the shop | 226 to 1,403ms empty, then the whole page in one frame | fails (blank, and a cut) |
| Today's search (note 5) | the screen before gone whole in one frame (100% to 0%), the search in from the next | a cut, as it should |

Sheets: `calibration-discover-saints.jpg`, `calibration-john-prev.jpg`.

## The rules now

- **Blank**: under a third of the screens either side by the fit, and almost nothing inked where the screen changes (under a seventh of what the lighter screen inks there, or under 3% when a seventh is less), for more than a fifth of a second. Shorter runs are dips, listed for the eye.
- **Cut**: half the change in one frame by distance and, where the fit can be made, 45% or more of the way along a fade through the ground (the screen before at whole, the ground, the screen after at whole). Note 5's frame is half the way along that fade (the screen before gone whole) and 68% by distance; the house's first frame, a fifth of the old page still showing, is two fifths along it.
- **Carried**: only a card whose picture the page it opens shows (in its first screen and a half) and no View Transition carried. The house's rule, above `::view-transition-group(carried)`: "A picture with nowhere to go on the new page leaves with its page".
- **Misplaced**: only a box a reader could see (on the screen where it was first drawn or where it stands), and only the outermost of what moved together.

The self-test (`node scripts/gate/frames.mjs --self-test`) has two new cases that the old rules would have failed and the new ones pass: the house's page switch from a page heavy with words to a light one, and a page whose picture comes with it while its words follow half a second later. The planted "blank" holds its empty screen for fifteen frames (a quarter of a second, Discover's Saints door). All 14 cases pass.

The proof on build 95, re-walked with the calibrated checks (four screens, 10:36 to 10:41 UTC): note 5 fails (Discover's search, a cut of 71%; Today's, 68%), note 7 fails (the toast over the reader's pill, 364 by 59px at 13,699).

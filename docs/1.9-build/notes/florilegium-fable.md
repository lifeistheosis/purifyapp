# The Florilegium, redesigned as one piece (build 89, notes 6 and 12)

His words, 2026-11-10. Of the starters on the Florilegium's first page: "The
UX experience on these need to get fixed also, like these, this section and
like where it leads to." Of the whole, in note 12: "And I also want the
Florilegium, like entire like design revamped. I just don't like that."

The arbiter's brief: the hub, a gathering, the "Begin with a gathering"
starters and what they open (a page or full sheet that carries the tile's
icon in, the passage set to read, one clear Keep, then "In your gatherings"
with a way to open it), and the lapsed reader's view. Pushed when the gates
pass, on his word of about 04:48 UTC the same day ("finalize all of this and
let's get going"); he can change anything after.

## What was wrong

- **The first page** opened on a small label ("The Florilegium") over a giant
  sentence ("The lines you keep") over a long paragraph, the form the four
  Theology pages had and lost. The reader's gatherings were grey boxes two
  across, the first of them dashed. The starters stood under a small label in
  capitals, in a row that ran off the screen's edge.
- **A starter** opened a bare sheet: a reference in grey, Keep, and the
  passage in small type. A kept tile wore a tick with no word for what the
  tick meant.
- **A gathering** had a second way back in a pill under the bar's own, a
  small label, a giant title, an outlined count that looked like a button and
  was not, and every line in a box of its own with an icon tile, in italics.
- **In the apps a gathering was not a page.** It opened on the Florilegium's
  own address with the gathering in the query, which the app reads as a
  filter: so it arrived with a cut after build 89 note 4 made every other
  page move, and the way back had no page to return to.

## What each screen is now

Drawn from forms he has passed (`theology-fable.md`, "What the house style
is"): the bar and a name in Lora with one small line; raised trays of rows
for places to go; pictures that lead; a real title on every part; Lora for
names and DM Sans for facts; the catalogs' own words first.

- **The first page** (`/florilegium`). The flower, lit, beside the page's
  name with "The lines you keep" under it, then what a florilegium is in one
  line. *Your gatherings*: rows in one raised tray, each the mark of where
  its newest line is from (the Scriptures or a Father), its name, that line,
  and how many it keeps; the tray's last row begins a new one and opens into
  the naming field in place. *Begin with a gathering*: the four starters as
  the plans' picture tiles, two across, all four in sight. The long
  paragraph, the same words, closes the page in small type.
- **A starter's page** (`/florilegium/begin/<starter>`, in the apps and on
  the website). The tile's picture on a plate, carried in from the tile
  (note 4), the passage's name, where it is from and how many lines it
  keeps. One action, Keep this gathering. Once kept, the button gives way to
  a row that says "In your gatherings" with Open, which opens the reader's
  own copy; the page stays where it is. Then the passage set to read, a verse
  a line as it will be kept, at the size the app reads Scripture at. On the
  first page a kept starter's tile says "In your gatherings" in words.
- **A gathering** (`/florilegium/<id>` on the website,
  `/florilegium/gathering?g=<id>` in the apps). Its name in Lora with how
  many lines it keeps; each line on its own type, upright, with where it is
  from under it (the mark of the Scriptures or of a Father, which opens the
  place), the reader's note beneath, and Add note and Remove beside the
  source; a hairline between two lines. At the foot, Share (the apps) or
  Print or save as PDF (the website) as one row, and Delete.
- **A reader whose Plus has lapsed** (PLAN.md item 4, built 2026-11-10 as
  8c51921, unchanged in what it allows). The Plus card on the house's tray
  (the flower, what Plus adds here, See Purify Plus, and the line that what
  they gathered stays theirs, free), then their gatherings as the same rows,
  to open and read. A gathering shows its lines and notes and nothing to do,
  with the card under them. A starter's Keep wears the Plus mark and opens
  the upgrade sheet named for the Florilegium.
- **The Plus page's preview** (`TryFlorilegium`, on the Plus sheet and on
  Your plan) draws the gathering's new page, since it draws the real line.

## What changed for a reader, beyond the look

1. Keep no longer leaves the passage. It stays on the starter's page and
   says, in words, that the gathering is theirs, with the way to open it.
2. A starter is a page, not a sheet: it has the bar, the way back, and note
   4's transition, with the tile's picture travelling to its head.
3. In the apps, opening a gathering and coming back from one are page
   switches and move as every page does. This closes the one cut note 4 left
   (`transitions-fable.md`, "What is not in this note").
4. The gathering's lines are upright, not italic: a page of them in italics
   tires the eye. A Father's line in the middle of a list reads the same.
5. Words gathered in another language read their own way (`dir="auto"`), and
   the starters' English is set from the left in a page that reads from the
   right, where a line of English otherwise ended with its full stop at the
   wrong end.
6. The two fields (a gathering's name, a note) light their own fill when
   reached, with nothing round them (CLAUDE.md, "No box around a tapped
   field"), and keep the keyboard's ring, which they had switched off.
7. On the website a gathering's own address answered 404 when it was loaded
   directly (a refresh, a bookmark): the page asked the server for a list
   only the device keeps, and the server said not found. Asked of the live
   site on 2026-11-10, `curl https://purifyapp.net/florilegium/<any id>`
   answers 404 while `/florilegium` answers 200. Now nothing is said until
   the device's list has been read, and the page then shows the gathering,
   or says gently that it is not here.

## What was built

- `components/florilegium/florStyle.ts`: the few names the screens share.
  The tray, its rows and their plates are the house's, first drawn for
  Theology (`app/globals.css`, `.theology-tray` and its neighbours); no new
  rule was written in the stylesheet.
- `components/florilegium/FlorilegiaHub.tsx` (the first page's parts),
  `StarterPage.tsx` (new), `FlorilegiumDetail.tsx` (a gathering, and
  `ItemCard`, the line), `PlusGate.tsx` (the card), `FlorilegiumByQuery.tsx`
  (the gathering the apps' address names), `useBookName.ts`.
- Pages: `app/(app)/florilegium/page.tsx`, `begin/[starter]/page.tsx` (new,
  the four known to every build), `gathering/page.tsx` (new, the apps'),
  `[id]/page.tsx` (the website's, which the apps' build still leaves out).
  Each mounts its own bar; `lib/nav/backBar.ts` lists them.
- `lib/florilegium/href.ts`: a gathering's address in the apps, and a
  starter's. `lib/florilegium/starters.ts`: a starter by its id, and the
  reader's own copy of one.
- `components/billing/plusTry/TryFlorilegium.tsx`: the preview's head.
- Words: two new lines in all 21 languages, `study.florilegium.yours` ("Your
  gatherings", each catalog's own line of 1.8 without its typed arrow) and
  `study.florilegium.inYours` ("In your gatherings", written for each, and
  waiting for a native reader like the rest). Every other line on these
  screens was the catalogs' already.
- Tests: `lib/florilegium/__tests__/redesign.test.ts` (new) holds the piece;
  `href.test.ts`, `starters.test.ts` and `lapsedReadOnly.test.ts` were kept
  true to the new addresses and structure, holding what they held;
  `lib/ui/__tests__/routeMotion.test.ts` holds the tile's and the head's
  carry.
- `scripts/mock-florilegium.mjs`: every screen on the export, held to
  `checkMock`, with a still of each. `scripts/route-motion.mjs` walks four
  more: into a starter with its picture carried, back into its tile, into a
  gathering in the apps, and back.

## Checked (commands, on the tree that was pushed)

- `npm run typecheck`: 0 errors. `npm run lint`: 0 errors.
- `npm run test:unit`: 849 files passed, 1 skipped; 10,257 tests passed, 8
  skipped.
- `npm run build:android` and `npm run build:ios`, one after the other: both
  green, 70.8 MB packed of the 85 MB ceiling. `npm run build` (the website):
  green.
- `node scripts/mock-florilegium.mjs` on the Android export: `checkMock`
  passes on all seven screens, on all five palettes (contrast, placeholder,
  44px targets, glyphs, palette, gold, stripes, mirroring, em dashes, rays).
  The lapsed reader's three screens pass it too, on the website's build with
  Plus enforced, at a phone's size.
- The words `checkMock` leaves to the eye, those on a raised tray, were
  measured against every stop of the tray's ground on all five palettes: the
  lowest is 4.99:1 (Light), over the 4.5:1 floor.
- `node scripts/route-motion.mjs` on the Android export: all twelve walks
  move as they should, the four new ones among them.
- Asked of a running server: a gathering's address loaded directly answers
  200, a starter's page 200, an address no starter has 404, the apps'
  gathering page 200.

## What a phone still has to say

- The starters' pictures are the saints' covers the apps ask the website for
  (`lib/readAloud/covers.ts`); with no signal a tile and its page wear the
  manuscript plate. The stills were drawn with those addresses answered from
  the same files in the checkout, as a phone with signal gets them; a walk
  with no signal is the phone's to show.
- Whether a kept starter should leave the starters' row. It stays, saying it
  is kept, so a reader who deletes their copy can keep it again.
- The lapsed reader's view could not be drawn on a build made here: with no
  purchase key a build enforces Plus nowhere. It was drawn and checked on the
  website's build with Plus enforced, at a phone's size.

## What is not in this piece

- The Gather button and the sheet that picks a gathering as a line is
  gathered (`AddToFlorilegium`, `FlorilegiumPickerSheet`) are as they were.
- A gathering has no picture of its own, so nothing travels from a row into
  its page. One kept from a starter could wear the starter's picture; it
  does not yet.
- The bar over a gathering names the Florilegium, not the gathering: the
  gathering's name is known only on the device, and a page's bar is mounted
  by the page.
- The starters are in English in every language, as before
  (`data/florilegium/starters.json`).

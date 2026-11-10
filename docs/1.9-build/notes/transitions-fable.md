# Every page switch moves (build 89 note 4, Fable 5.2, 2026-11-10)

His words: "Can you improve the UX experience when clicking these buttons?
Because it just instantly pulls up the page. Like, there's no clean UX
experience, transitioning from page to page. Also, I want that to be the
standard too with every single page switch." The standard is in CLAUDE.md.

## The plan

### What was wrong

The app has had a fade between pages since 1.5 (`app/(app)/template.tsx`,
`.route-fade`). Next 16 keeps that wrapper from one page of a section to the
next, so the fade plays when a reader changes section and at no other time.
Measured in the browser on 2026-11-10: a tap from Prayers into The Hours, or
from the saints into a saint, changed the page at once with nothing between.
That is what he saw.

### What a reader sees now

- **Forward**, into a page: the page they were on fades away and the new one
  settles in, rising its last few pixels as it clears.
- **Back**: the reverse. The page being left sinks away and the one behind it
  is there again, whole, at the place it was left. It is not assembled again
  row by row.
- **Across**: a tab for a tab, a chapter for the next chapter, one of
  Theology's four ways for another. The two cross-fade and nothing travels,
  because nothing went deeper.
- **A picture that leads to its own page** travels into that page's head
  (Prayers' Practices, the reading room's covers, the saints, Theology's four
  buttons).
- The tab bar stands still through all of it, and its lit tab changes in
  place.

On the house curve, 340ms at the longest, up and down and never sideways (a
page that slid in from the right would have to slide from the left in
Arabic). Still when motion is reduced. A phone with no View Transitions (an
iPhone before iOS 18) changes pages as it did before.

### How it is made

Next 16's own guide was read first
(`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`), and the
React it ships was read to see what the guide does not say. Three things
decided the shape:

1. **One place, not one per link.** The guide marks each link forward or
   back by hand. The app has hundreds of links. Instead one small bridge at
   the root (`components/nav/RouteTransition.tsx`) asks React to picture
   every change of address, and works out which way it goes: a tab tap says
   so itself, a step back says so itself, two pages under the same page at
   the same depth stand side by side, and everything else is forward
   (`lib/ui/routeMotion.ts`).
2. **The picture is of the whole screen, not of the page's box.** A page can
   be 50,000 pixels tall and scrolled anywhere. Picturing the screen costs the
   same every time, moves nothing that is fixed, and needs no arithmetic
   about where the page was scrolled to.
3. **Back is started by the app, not by React.** React renders a step through
   history at once, so the browser can put the scroll back, and a change made
   at once is never pictured: measured, a tap forward started a transition
   and `history.back()` started none. So the app's own ways back (a top bar's
   chevron, and the phone's Back button on Android) start the transition
   themselves before they step back. How the step is made, and how the scroll
   is put back, do not change at all. The browser's own Back button on the
   website is left alone, as the platform asks: Safari draws its own slide
   under the finger.

How a change moves is told to the browser as a class on the page
(`view-transition-class`), which the browser keeps with the picture. The
first try used an attribute the stylesheet matched and took it off "after the
transition"; React runs that cleanup early whenever anything else on the page
updates, and the stills showed the animation starting over in mid-flight.

## What was built (2026-11-10)

His word of about 04:48 UTC ("finalize all of this and let's get going")
came while this was being built: finished work is pushed when its gates
pass, with stills to the arbiter at the push.

### The page switch

- `lib/ui/routeMotion.ts`: the rules. Which way a change goes
  (`takeNav`, `standBeside`), whether this screen can picture it
  (`canMove`), a step back taken inside a transition (`returnBy`,
  `arrived`), and what the page is told while it changes (`beginNav`,
  `endNav`).
- `components/nav/RouteTransition.tsx`: the one bridge, mounted in
  `RootFrame` after the two it depends on. It holds the mark React pictures,
  the listener for the browser's own Back, the phone's Back button on
  Android, and the tap that lifts a picture.
- `app/globals.css`, "Every page switch moves": the motion itself, the tab
  bar and the website's header named so they stand still, and the route's
  own fade told when its page was carried in.
- `lib/nav/goBack.ts` and `components/nav/AppNav.tsx`: the app's ways back go
  through `returnBy`. `lib/ui/routeTransition.ts`: a tab tap says the tabs
  stand side by side. `lib/platform/useAndroidBack.ts`: a count of open
  sheets, so the phone's Back closes a sheet and does not also leave the
  page.
- `next.config.ts`: Next's `viewTransition` flag, in the website's build and
  in the apps'.

### A page's outline waits a moment

Found by measuring, not asked for, and needed: once page switches were
pictured, a route's loading outline (`loading.tsx`) was pictured as the page
arriving, and React holds the next change until a picture has finished. On
the export, a tab tap drew the outline at 57ms and the real page at 371ms.
The apps read a page from the phone in a few hundredths of a second, so the
outline was only ever a flash there.

Now an outline holds off for 200ms while a reader is on their way to a page
(`lib/ui/loadingGrace.ts`, `components/ui/AfterAMoment.tsx`, around each of
the twelve `loading.tsx`). Measured again: the page arrives as itself at
62ms and the outline is never drawn. A page that takes longer gets its
outline as before, and that change is not pictured, so the page behind it is
not held back.

### A picture that leads to its own page

Two attributes say which pictures, and no component knows more than that:
`data-carry` on the picture inside a link, `data-carry-into` on the picture
it becomes on the page it opens. They are on the shared pieces, so every
place that uses one has it:

| The card | goes into | by |
| --- | --- | --- |
| A Practices tile on Prayers (`PictureTile`) | the same icon on the page it opens: Learn to pray's plate, the row of the Hour it is, the akathist's row | the icon's address |
| An All prayers piece on Prayers (`PrayerPieces`, build 89 note 10, which made them pictures the same night) | the same icon on the page it opens: Morning's and Evening's plate, and where a Practices tile goes for the rest | the icon's address |
| A prayer's plate in a row (`ArtPlate`) | the same plate on the page it opens | the icon's address |
| A saint's icon in any card (`SaintIcon`) | the icon at the head of the saint's page | the icon's address |
| A starter's tile on the Florilegium (`FlorilegiaHub`, notes 6 and 12) | the same picture at the head of the starter's own page (`StarterPage`) | the picture's address |
| A cover (`WorkCover`) | the same cover at the head of the page it opens: a walkthrough, and since his yes of the same day a book of the reading room (`OpeningCover`, below) | the title |
| One of Theology's four buttons, tiles and rows (`TheologyLibrary`) | the glyph at the head of the way's page (`WayPage`) | the way |

Going back, the picture returns into the card it came out of, found again as
the same link. The check caught one thing here: a long list draws a card only
once it is near the screen, the browser decides that a frame late, and a
list just put back was pictured with the card still undrawn, so the saint's
icon left his page and did not arrive in his card. The card that takes the
picture back is now drawn for the length of the change.

**The rule kept: a picture travels only where the page shows the same
picture.** Three places from the plan did not, and nothing travelled there
(the picture leaves with its page, in the page's own motion). The first is
closed; the other two stand:

- **The reading room's covers.** A cover opened straight into the text
  ("Book I", then the words), with no cover at the head of that page to
  travel into. That was his to decide, and he said yes the same morning: a
  book now opens on its cover ("A book opens on its cover", below).
- **Your rule.** Its head is another picture, with the title over it. Tried:
  the tile's Christ changed into the head's fresco on the way and covered the
  title until the change was over.
- **A saint with a wide picture at the head.** The same: another picture,
  with the name over its foot. A saint whose page opens on his icon (most of
  them) does carry.

### The check

`node scripts/route-motion.mjs` opens the export in Chromium, the Android
WebView's engine, served as the shells serve it, walks the app and reads from
the browser what it pictured. Eighteen walks (eight, four on the Florilegium since its
redesign, and six on a book since it opens on its cover). `--film <folder>` writes stills of
the middle of each transition, which a screenshot of a running app cannot
take: the transition is stopped as it becomes ready and stepped to each time.

## A book opens on its cover (2026-11-10, on his "all recs")

The question above was his, and he answered it about 08:25 UTC: "all recs",
which said yes to a cover at the head of a reading room book
(`BRAINSTORM.md`, the same hour).

### What a reader sees

- **The cover they tap travels into the book.** From a row of the reading
  room, the day's book, the room's search, a saint's Writings, More like this
  or a council's shelf: the cover lifts, grows and settles at the head of the
  page it opens, and the page forms round it. Going back, it returns into
  the tile it came out of.
- **The page is otherwise as it was.** Under the cover the chapter's head
  stands as the Bible's does, then the words. Nothing was taken out, and
  there are no new words.
- **A tap on the cover opens About this book** (added the same day, on his
  word; below).
- **Only the chapter the book opened on wears it.** Turn to the next chapter
  and the page is the chapter's own, as before. Come back to that first
  chapter, by the way back or by the pill, and the page is as it was left.
- **A book left in the middle opens on its cover too**, and then goes down to
  the paragraph the reader stopped at.
- **Held smaller on a short phone**, so the first line or two of the book are
  still on the first screen.

### The choices, and why

1. **Over the chapter the book opens on, not only over its first chapter.**
   Most of the room does not open a book at its beginning: the passions, the
   virtues, daily life and the season's row each open one part of a book
   ("Homily 12"), Continue reading opens the chapter a reader left, and a
   plain cover opens the place they kept. A cover only over chapter one would
   have received the travelling picture from the least-used doors. So the
   cover belongs to the opening of the book, wherever that is.
2. **Not over every chapter.** He picked "As the Bible reads" (r3-29 A): a
   chapter opens on its own head. A cover over each would push the words down
   a third of a screen at every turn of the page.
3. **By the chapter, not by the visit.** The cover is there whenever the
   chapter the book opened on is the one on the page. So a step back through
   the chapters finds the page as it was left (its scroll was measured with
   the cover in it), and the last step back, out of the book, finds a cover
   to carry back into its tile.
4. **Written with the page, outside the reader, first on the page.** On the
   website a reader in another language sees a line saying the work is not
   yet in their language; the cover stands over it, so it is in the same
   place in every language. In the apps a work's text
   is a file read after the page opens. A cover drawn with the text would not
   be standing when the page changes, and a cover that changed hands when
   the text landed would end the travel half way. It is one element from the
   first frame to the last (`components/reading/OpeningCover.tsx`, placed by
   the two pages). What it knows of the chapter it reads from the address and
   the kept place, never from the text (`useOnOpening`).
5. **The room's own poster, in the row's own design.** `WorkCover` at the
   scale the rows use, larger: the same picture, the covers pack laid over
   it in the apps as the room lays it, a council's document through its
   window onto the council's icon, and the same title, which is how the
   travelling picture finds it. All 38 council documents carry one title on
   the shelf and on their own page; a test holds that.
6. **Sized by the screen's height: 112 to 160px wide.** Measured in the
   apps, where the chapter pill stands over the tab bar. At a fixed 160px
   the first words of a book stood under the pill on a phone 688px tall or
   shorter: the first screen was all front and no text. So it is 160px on a
   phone 844px tall and up, narrower by a third of every pixel the screen is
   shorter, and the row's own 112px from 694px down. An iPhone SE (667px)
   keeps nearly two of its first lines in sight (1.9, measured), a phone
   640px tall nearly one (0.9). Nothing smaller than the row's own tile would
   still be a cover, so on the shortest phones the first screen is mostly the
   book's front, and the pill and the tab bar step away at the first scroll.
7. **A return waits for the page to arrive.** A book left in the middle goes
   down to the reader's paragraph as it opens. It used to start at once,
   while the page was still settling in. With a cover travelling to the head
   of that page, the page scrolled away under it. Measured on the export:
   with the wait switched off the page was 1,245px down before the change was
   over; with it, 0. The glide now starts when the page has arrived, 360ms at
   the most, and only where a page switch was pictured
   (`routeMotion.untilSettled`, `useLanding`). A chapter's top never waits.
8. **A cover travels as the one it is becoming.** The first film showed the
   title twice for a few frames: the tile's words and the page's words, one
   over the other at two sizes, as two pictures passing into each other. A
   cover is one poster at both ends, so only the arriving cover is drawn
   while it travels, from the first frame, and it is exact where it lands.
   A picture says what kind it is in its key ("cover:..."), wears that as a
   class for the change, and the stylesheet moves covers their own way
   (`routeMotion.kindOf`, `app/globals.css`, "A cover is one poster"). For
   the same reason the cover at the head is the row's own design, its words
   broken and fitted as the row's tile breaks them, so the one that lifts
   off and the one that lands read the same.
9. **A picture the reader has scrolled away from is not flown back.** Found
   by the film of a book read on and then left: the browser pictures a named
   picture wherever it stands, and the cover, by then 1,100px above the
   screen, came down into its tile from beyond the top edge. A head that is
   not in sight is no longer lifted for the way back; the tile arrives with
   its page (`routeMotion`, `inSight`). This holds for every carried
   picture, a saint's icon and a starter's plate as much as a cover.

### What was built

- `components/reading/OpeningCover.tsx` (new): the cover, and the button it
  is.
- `components/saints/useWorkPlace.ts`: `chapterNamed`, `useOnOpening`, and
  the landing's wait.
- `app/(app)/saints/[slug]/[work]/page.tsx` and
  `app/(app)/councils/[slug]/[document]/page.tsx`: the cover placed above the
  reader. The readers themselves are unchanged.
- `lib/ui/routeMotion.ts`: `untilSettled`, a travelling picture's kind, and
  `inSight`.
- `app/globals.css`: how a cover travels.
- No new words, so nothing for the twenty-one languages.

### The check

- `lib/reading/__tests__/openingCover.test.ts` (new) and
  `lib/ui/__tests__/routeMotion.test.ts`: where the cover stands, that it is
  written with the page, what it draws, its size, the wait, the cover's own
  way of travelling.
- `node scripts/route-motion.mjs`, six more walks on the export: a cover
  from Short reads into the head of its book, drawn once and never twice;
  back into its tile, the tile where it was; the same book left in the
  middle (the page at 0px as it arrived, then at the reader's paragraph);
  back from there, the cover far up the page, with nothing flown in; a
  council's document from its shelf, and back. The check now reads whether
  a picture travelled from the move itself, since a cover no longer fades on
  both sides.
- `node scripts/mock-opening-cover.mjs`: the head opened as a reader opens
  it, held to `checkMock` on all five palettes, on a tall phone, a short one
  and on Parchment, with a still of each, and the lines of the book left in
  sight on phones 667px and 640px tall.

### What a phone still has to say

- An iPhone on iOS 18.2 or later: a cover from the room into its book and
  back. On iOS 18.0 and 18.1 the two covers pass into each other, and the
  title can be read twice for a few frames.
- Whether the moment before a return goes down to its paragraph feels right
  in the hand. One number: `SETTLE_MS` in `lib/ui/routeMotion.ts`.

### A tap on the cover opens About this book (the same day, on his word)

Left for his word in the first build ("A tap on the cover does nothing. It
could open About this book."), and answered about 13:50 UTC: "All
recommendations. Start." (`BRAINSTORM.md`).

- The cover is the button, all of it: 112 by 168px at its smallest, far over
  the 44px a finger needs. It dips as a pressed cover does anywhere in the
  app (`.press-card`), and the sheet rises in the sheet's own motion.
- It opens the reader's own sheet, the one the three dots and the contents
  open (`openWorkAbout`, lib/saints/workNow.ts), so there is one About this
  book and three doors to it. The other two stay where they were.
- A screen reader hears "About this book", in the reader's language, the
  words the other two doors use (`bible.aboutThisBook`, in all twenty-one
  catalogs). The cover's own words stay hidden from it, as every cover's
  are. No new words.
- A keyboard gets the house's ring round the cover; a finger leaves none
  (app/globals.css, `html[data-input]`).
- Nothing about the travel changes: the cover inside the button is still
  what the tile's picture travels to, and all eighteen walks pass as before.

Held by `lib/reading/__tests__/openingCover.test.ts` ("a tap on the cover"),
and opened on the export by `scripts/mock-opening-cover.mjs`, which taps the
cover, checks the sheet came and went, and pictures it.

One thing known and left: in the apps a work's text is read a moment after
the page opens, and the sheet belongs to the reader, so a tap in that first
moment (about a tenth of a second, while the page is still arriving) opens
nothing. A second tap does.

### What it is not

- A book opened by a link to one paragraph (a citation, a search result)
  opens on its cover as well, and goes down to the paragraph.
- The Bible's chapters are not books of the reading room and are unchanged.
- One rare case, known and left: the room's covers wait unseen for their
  pictures (`hold`), and a tile is shown at once for as long as a cover is
  travelling back into it. If a phone has dropped that picture from its
  memory in the meantime, the tile can go unseen again for a moment after
  the cover has landed, until its picture is back. It did not happen in any
  walk here; the pictures were on the screen a moment before.

## What a phone still has to say

Nothing here can run iOS's WebKit, and a film is not a hand. For the phone
walk (`docs/PHONE-WALK.md`):

- An iPhone on iOS 18.2 or later: forward, back by the chevron, a tab, a
  saint's icon into his page. On iOS 18.0 and 18.1 the pages cross-fade
  plainly; before iOS 18 they change as they did.
- An Android phone: the phone's own Back button and the back gesture, on a
  page (it should return as the chevron does), with a sheet open (the sheet
  closes and the page stays), and on Today (nothing happens, as before).
- Whether 340ms feels right in the hand. One number changes it:
  `--duration-route-enter`, and the 300ms of `route-settle`.

## What is not in this note

- The browser's own Back and Forward buttons on the website are not pictured
  (the plan, above).
- A page that takes more than a moment shows its outline, and the page then
  replaces the outline at once, as it always did.
- A top bar a page draws for itself travels with its page. The tab bar and
  the website's header stand still.
- Coming back to a tile, its name is under the arriving picture until the
  change is over, and then stands on it again.
- (Closed with the Florilegium's redesign, notes 6 and 12, the same day.) In
  the apps a gathering opened on the Florilegium's own address, named in its
  query (`/florilegium?g=<id>`), and the bridge counts a change of query as a
  filter, not a page, so that one page switch cut. A gathering now has a page
  of its own there, `/florilegium/gathering?g=<id>` (`lib/florilegium/
  href.ts`), as the shop's orders and icons have their `detail` pages, and
  moves like any page. The check walks it.
- What takes the phone's Back for itself is counted in the hook every taker
  uses (`lib/platform/useAndroidBack.ts`), not read from the sheets' own
  record (`body[data-sheet-up]`, `lib/ui/overlay.ts`): eight of the nineteen
  that take Back are not sheets (the paywall, search, the tour, the verse in
  focus, the map, the player, the Bible's language offer, Compose), and a
  page stepping back under one of those would be the bug.

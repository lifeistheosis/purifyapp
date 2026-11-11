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
62ms and the outline is never drawn.

(What this said next was wrong, and stood until 2026-11-11: "A page that
takes longer gets its outline as before, and that change is not pictured, so
the page behind it is not held back." The outline was cut in, the page
behind it was held back, and by more than the outline. "A page that is slow
to come, and the pictures of nothing", below, is the measurement and the
mend.)

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

One thing was known and left that day, and is mended (P9, the same evening,
on his "finalize all the builds"): in the apps a work's text is read a moment
after the page opens, and the sheet belongs to the reader, so a tap in that
first moment (about a tenth of a second, while the page is still arriving)
opened nothing, and a second tap did. A tap is kept now until a reader
answers it: the one that is there hears it at once, and the one that arrives
next hears it as it begins to listen (`lib/saints/workNow.ts`, `openWorkAbout`,
`hearWaitingWorkAbout`). The cover forgets an unanswered tap as its page
goes, so it never opens over another book. Held by "keeps a tap no reader was
there to answer" in `lib/reading/__tests__/openingCover.test.ts`.

### What it is not

- A book opened by a link to one paragraph (a citation, a search result)
  opens on its cover as well, and goes down to the paragraph.
- The Bible's chapters are not books of the reading room and are unchanged.
- One rare case was known and left, and is mended (P10, the same evening):
  the room's covers wait unseen for their pictures (`hold`), and a tile is
  shown at once for as long as a cover is travelling back into it. If a phone
  had dropped that picture from its memory in the meantime, the tile could go
  unseen again for a moment after the cover had landed, until its picture was
  back. What a picture has landed on keeps a mark of it now (`data-landed`,
  `setDown` in `lib/ui/routeMotion.ts`) and stays seen, its plate and words
  holding the place (app/globals.css, beside `[data-carried-in]`). It did not
  happen in any walk here, so it is held by a test of the mark and of the
  stylesheet's rule (`lib/ui/__tests__/routeMotion.test.ts`), not by a film.
- A rule the walk taught (the evening of 2026-11-10, from the bar over a
  gathering): **the first part of a page that comes from the page's own
  script must not stand in a Suspense boundary of its own.** A page's script
  is fetched at the tap. If React reaches a boundary before the script is
  in, it draws the boundary's stand-in and moves on; a part outside any
  boundary makes it wait instead, and by then everything after it is ready.
  So a page whose first such part is in a boundary arrives in two commits on
  a slow start, the second about a transition's length after the first, and
  React pictures the second as a page switch of its own: for that length of
  time the screen takes no touch. A page's bar is that first part on almost
  every page, drawn by the page outside any boundary, which is why no other
  walk has shown it. The walk now takes one page switch with every script
  held back 300ms (`withScriptsHeld`), and a page that needs a boundary
  early (it reads the query) can be walked the same way.

## Back puts a page where it was left (2026-11-11, build 93 note 1)

His words, on build 93 on his phone: "when I click back to go back to the
first council of Nicaea, it scrolls all the way down. Well, it actually
doesn't scroll, it just randomly places you at the bottom of the first
council of Nicaea, which is an issue because it should be placing you at
the top of the page of first council of Nicaea."

### What was wrong

The page switch was not at fault, and neither was the step back. The fault
was in the part that puts a reader back where their thumb was
(`lib/ui/returnPlace.ts`, mounted by `components/nav/ScrollResetBridge.tsx`).
It remembers the link that was tapped and how far from the top of the
screen it sat, and coming back it moves the page until that link sits there
again, because a long list is not the height it was when the reader left.
It found the link by its address alone. Two things followed.

1. **Another link was taken for the one he tapped.** A council's page shows
   one of its Fathers on a card that opens his page, and the row above the
   card chooses which Father. The same Father is named again, as a link,
   deep in the council's account. He chose St Alexander in the row and
   opened him by the card. When he came back the row had begun again at St
   Athanasius, so the card he had tapped now led to St Athanasius, and the
   only link left to St Alexander was the one in the account. It was taken
   for the card, and the page was moved until it sat where the card had
   been. Measured on the export at a phone's size, by the bar's arrow and by
   the phone's Back alike, four times of four: the page left at the top came
   back 3,424px down, and left 260px down it came back 3,684px down. At the
   tap the page had two links to St Alexander; on the way back, one.
2. **A link was measured before it had arrived.** Found by the sweep after
   the first mend, 8px: Prayers brings its rule in as the page opens (it
   rises 8px into place, after waiting about half a second), and brings it
   in again when the page comes back. The page was moved 8px to meet the
   rule's link while it was still held low, the watch let go, and the rule
   then rose 8px past the reader's thumb.

### What a reader sees now

Back, by the arrow or by the phone's button, leaves First Nicaea where he
left it: at the top if he left from the top. Prayers comes back to the
pixel. A long list still comes back to the card that was tapped, as before.

### The rule

- The link has to be **the one that was tapped**. A place remembers how
  many links on the page led where the tapped one did, and which of them it
  was. Coming back, the link is found only while the page has that many
  again and that same one is drawn. Never another link to the same place in
  its stead: a page that has lost one, or gained one, cannot say which is
  which, and it is left where the browser put it, at the reader's own
  number. On a page like the council's that number is right, because
  nothing above the reader has changed height.
- The link has to **have arrived**. Nothing is measured while the link, or
  anything that holds it, has an entrance under way that will end. When it
  has landed the page is put right if it needs to be. A motion that never
  ends (a light that breathes) is not an entrance and is not waited for.

### The check

- `lib/ui/__tests__/returnPlace.test.ts`: seven new cases. Five fail on the
  code as it was, the first with his own 3,424px.
- `scripts/route-motion.mjs`, on the export: a council left by a card that
  is gone when the reader comes back, by the page's own arrow and by the
  phone's Back, and Prayers left by its rule's link. Each was seen to fail
  before its mend. The walk is 31 of 31.
- A sweep kept out of the repo (it is slow, and the walks above hold the
  two faults): 65 returns over 26 pages, every council's Fathers among
  them, each left by a link of its own and come back to. 65 came back to
  the pixel they were left at. Another 14 could not be tried, because the
  link the sweep picked could not be tapped from where the page stood.

### What was left, and is mended too (the same day, on the arbiter's word)

Both were named here as left, and the arbiter's answer was that nothing found
is deferred.

- **The council's row is on the Father he opened when he comes back.** The
  row had begun again at St Athanasius, so the card no longer showed the
  Father whose page he had just left. The choice is kept by the page's
  address for the visit (`lib/councils/fatherShown.ts`) and given back only
  to a reader who has come back by a step through history
  (`lib/ui/scrollReset.ts`, `cameBack`); a visit that goes forward to the
  page begins at its first Father, as it begins at its top, and lets go of
  what an earlier visit chose. Kept by the Father's name, not his number, in
  memory, not on the device: it is a place on a page, not a setting. Seven
  unit tests (`lib/councils/__tests__/fatherShown.test.ts`), and the two
  council walks now hold the card as well as the place: "the row still on
  the Father he opened and the page where it was left".
- **A page that returns is not brought in again, whatever its entrance.**
  The stylesheet said so for the rows' cascade alone. Prayers' picture, verse
  and rule each have an entrance of their own and played it on every return;
  so did You's, a saint's icon and a reading page's title. Now a page that
  has returned has every entrance it has begun taken to its end before it is
  pictured (`lib/ui/routeMotion.ts`, `quietEntrance`): each animation in it
  that runs once and is over within 2.5 seconds. One that never ends, or runs
  longer (a ring that fills as a book is saved), is not an entrance and is
  left. No line of `app/globals.css` changed. Three unit tests, and the
  Prayers walk now fails if any of its three parts is still being brought in
  as the page comes back.

### A page that has changed while the reader was away (the same day, the pre-build gate)

The gate's tap walk (`gate-run-1.md`, Part 1) found two places where Back
did not return the reader to where they were: the reading room, 553px off
after a work, and the Bible's list, 67px off after a book, on 33 of its 40
rows. I measured both by the link under the thumb before changing anything,
since two other reports of the same walk had turned out to be its measure
(above). These were real.

| Place, on the export at 390 by 844 | Tapped at | Came back at | What the page had drawn while the reader was away |
| --- | --- | --- | --- |
| The Bible's list, 1 Kings | 436px | 504px, 68 below the thumb | A "Continue reading" row above the books, 67px, and with it three more links to 1 Kings 1: that row, its copy for a wide screen, and the Bible tab |
| The reading room, a book under "Short reads" | 422px | 974px, 552 below | "Continue reading" and "Because you read", 552px of new shelves above it, the first beginning with the book just opened |

**Why.** The rule made for his note 1 (a link is never taken for another to
the same place) refused to choose whenever the page had another number of
links to the place than when it was left. That was right for the council's
page. But each of these pages draws something new *because* the reader
opened something, and what it draws is a link to the very place they have
just been. So the page that came back always had one more, the tapped link
was never looked for, and the page stayed at the browser's number with the
new rows standing above it. The unit test even said so in its own words
("which was tapped cannot be said"). It can be said.

**The rule now**, in `lib/ui/returnPlace.ts`:

- A place also remembers **the two links the tapped one stood between**.
  When the page has another number of links to the place, the tapped one is
  the link to it that still stands between those two, is drawn, and is not
  in a bar. One such link is it. None, or two, and the page is left where
  the browser put it, as before. The council's page is still safe: the line
  in its account stands between other links than the card did.
- Only a link a reader could see beside it is a neighbour: not one in a bar
  (the Bible tab leads to the chapter last read, so it changes), and not one
  that is not drawn. The first run of the new walk found that one: the
  Bible's list is in the page twice, for a phone and for a wide screen, the
  wide copy begins right after the phone's last book, and when it gained its
  own "Continue reading" row, Revelation's row had a new neighbour no reader
  could see and came back 67px off.
- **The link is measured where it will stand**, not where it is while it is
  still being brought in. Until now nothing was measured while an entrance
  ran, and the page was put right when it ended. That was right for
  Prayers, where the page did not need to move, and late wherever it did:
  on the browser's own Back the Bible's list brings its rows in again (held
  8px low for a third of a second, then rising), so its row would have
  stood 68px off for three quarters of a second and then jumped. What the
  entrance still holds the link by is taken off the measure, the page is
  put right at once, before it is painted, and the watch stays until the
  entrance is over and looks again.

**The check.**

- `lib/ui/__tests__/returnPlace.test.ts`, 34 cases (35 with the Plus
  page's, below), 10 of them new. Nine fail on the helper as it was: a shelf drawn above, a link dropped, the
  new row never taken for the tapped one, a bar's link and a link that is
  not drawn not counted as neighbours, the list kept for a wide screen, a
  row met where it will land while it is still coming in (67px at once, not
  75px and not later), a shift read from a transform or a translate and
  added up, and a part that comes in without one followed and let go only
  when it has landed. The tenth holds what must stay: two links between the
  same two, and the page is left alone. The test that held the old answer ("left
  alone") now holds the case that still cannot be told: the tapped card
  gone, and two new links to the same place.
- `scripts/back-walk.mjs`, new, on the export: a new reader, each link
  tapped with a real touch, and the tapped link measured after every frame
  is painted for three seconds after Back. It finds the link again by where
  it stands (its shelf, its list), never by counting links, which is the
  helper's own way and so no check of it. Ten walks: a book under the two
  new shelves of the reading room by the browser's own Back at three sizes
  (552, 576 and 685px drawn above it while away) and by the page's own
  Back button, the Bible's first, middle and last rows, the middle one at
  three sizes, and the book above the new shelves. 10 of 10, three times
  over, and in those 30 walks no frame was painted more than a row's own
  8px rise from the thumb.
- How a frame is measured matters, and the walk's first way was wrong. It
  read the link in a task posted from each frame, "after the paint", and
  twice in some fifty walks called a frame painted 75px off. I had written
  that down as the browser's doing before I traced it. Traced, it was the
  walk: the task of the frame before the step back ran late, after the page
  had come back and the browser had set its own number, and before the next
  frame, in which the helper put the page right before anything was
  painted. The walk now reads the link after each frame's layout (a
  ResizeObserver on a thing of its own that changes size every frame), when
  every script of the frame has run and before the frame is painted. The
  trace also shows the order of a return: the step is heard, the page is
  committed and put right by the helper, the browser then sets its own
  number, and the helper's next look puts the page right again before that
  frame is painted. Taking the restoring over at the step back does not
  stop the browser (`history.scrollRestoration` set to "manual" as the step
  is heard: it put its number back all the same).
- The walk holds itself to having proved something: the page did grow above
  the link, and does have another number of links to it. A book in "Short
  reads", above the new shelves, is walked too and has to stay where it was.

**The Plus page, the same day (the gate's full walk).** Admin's walk then
found `/pricing/` coming back from its top: "Sign in to continue" tapped at
the page's foot with the page 2503px down, Back, and the page stood at 0 for
about 2.5s before it was at 2503 again. Nothing is drawn above that link.
Two things met there. The browser does not put its own number back on that
page (it comes in two steps, a screen's height first), so the page that
returns is at its top. And the page brings itself in over a second, 18px
low and then rising (`paywall-in`), and the helper measured nothing until
an entrance had finished. Measured on the export with the mend above, which
was built for the Bible's rows and is the same rule: the page is at 2503 in
the first frame, 42ms after the step, with the link 18px low on its way in,
and the link lands where it stood. No change of code was needed for it; it
is held by a unit case with the page's own numbers (2503 at once, not 2521
and not later; it fails on the helper as it was) and by a place in
`scripts/back-walk.mjs`, walked as the Android shell on an export that
sells Plus, which is where that link is drawn. The walk is 11 of 11, and
Admin's own tap walk passes the page: 21 controls, none failed.

**Named, not mended.**

- **Sign in has no way back of its own in the apps.** The page that link
  opens is drawn by the sign-in pages' own frame, which has the Purify mark
  and a link to Privacy at its top and no Back button, and it is outside
  the frame that gives every other page of the apps its back bar. The
  phone's Back leaves it on Android. An iPhone has none. Put to the
  arbiter; it is not a page switch, and the frame is not mine.
- **A tapped link right beside what was added** no longer stands between
  the same two links, and is left at the browser's number. No shelf here
  has one today: the two new shelves stand after "Short reads", whose books
  are above them and do not move.
- **A chapter's round button is a door, not a step back.** It leads to the
  whole list (`back="/bible"`, held by two tests), so the list opens at its
  top even for a reader who came from one of its rows. The phone's Back
  returns them to the row. Put to the arbiter.
- **The browser's own Back brings a page's rows in again.** In the apps a
  step back is the phone's Back or the page's own button; both are
  pictured, and the page comes back whole. A browser's own button on the
  website is not pictured, and the page that returns plays its rows'
  entrance again, as it does when opened. Put to the arbiter.

## What opens shows itself: the page moves with it (2026-11-11, build 93 note 15)

His words, on the prayer book with every chapter shut and "Before & after
daily life" opened: "Again, I want the screen to move with the bottom if it's
too big." It was the third time: build 89 note 8 on the same book ("I don't
like how it doesn't move the screen also down in a smooth way"), and the
language list in build 90.

### What was wrong

The mend of build 89 followed the opened chapter's own page, and only in the
prayer book. On his screen that page ended 24px over the tab bar, so by that
rule the screen rightly stayed, and the two chapters after it went under the
bar. And every other part of the app that opens had no such care at all. The
fresh-eyes walk of the release build found the same on the FAQ's answers
(ending 70 to 200px under the bar), the Terms' and the Privacy Policy's
Contents (280 to 530px under), and What's new's months and its 1.9 note.

### The rule

Anything that opens (a section of a list, a card, a menu, words that go on)
and ends below what the screen shows moves the page with it, so its end
stands clear of the tab bar. It never takes the top of what was opened off
the screen. With Purify's motion off the page moves at once, with no glide.
Only an opening the reader has just asked for is followed: nothing a page
opens on its own moves it under their finger.

### How it is made

- **One helper** (`lib/ui/showOpened.ts`), for the whole app. What has to be
  in sight is what opened, the control that opened it, and the thing it is
  part of when that thing says so (`data-shown-whole`: the prayer book's
  chapters are one book). The page goes as far as the lowest of those needs
  and no further than the control's top may go, 12px under the bar at the
  top. It follows, it does not jump ahead: each frame it closes a share of
  the distance, so behind a fold it runs with the fold and settles as the
  fold does, and behind something drawn at once it is a short glide that
  eases out. A part inside a sheet moves the sheet's own scroll. A part in
  something fixed to the screen is left alone. The reader's hand ends it at
  once.
- **One mount** (`components/nav/OpenedBridge.tsx`, at the root beside the
  scroll bridge). It hears a tap on anything that says it opens something
  (`aria-expanded`, a `<summary>`), and when that control turns to open it
  follows what the control names (`aria-controls`, or the `<details>`
  itself). So no part has to remember the helper; it has only to say what
  it opens, which a screen reader needs of it anyway.
- **A test that holds every control to that**
  (`lib/ui/__tests__/openedParts.test.ts`): each `aria-expanded` in `app/`
  and `components/` names its part, opens a sheet (`aria-haspopup="dialog"`),
  or is listed there by file with the reason. 17 controls in 14 files named
  nothing and now do (the Bible's rows, glossed words, the commentary sheet,
  the study rail, the colours' pickers on a verse and a paragraph, a post's
  "Read more" and its replies, the inbox's "See all", a rule's row in the
  library sheet, the nameday's choice, an order's two tiles, the shop's
  filters). Six are kept in place by name: the website's two menus and its
  Discover menu (in its header, fixed to the screen), the two language lists
  (`components/i18n/LocaleMenu.tsx` already keeps itself whole on the
  screen), and the player's saved line (inside the player).
- **The prayer book** has no code of its own for this any more
  (`components/prayers/PrayerBookContents.tsx`, with Updates' yes): its
  put-back under the finger and its held length are as they were, its
  chapters say they are one whole, and the helper does the rest. The page
  glide that only it used is gone from `lib/ui/glideScroll.ts`.

### The check

- `lib/ui/__tests__/showOpened.test.ts`, 31 cases: his screen as numbers
  (followed alone, the chapter's page moves the screen 6px and leaves the
  book under the bar; followed as one book, 206px and its end is clear), a
  fold followed and never run ahead of, the glide's shape, motion off, the
  top that may not leave, words that carry their own control down the page,
  a sheet's own scroll, a fixed part left alone, the reader's hand, and that
  only a tap the reader has just made is answered.
- `scripts/opened-walk.mjs`, on the export, each control tapped with a real
  touch. Before the mend 9 of its 11 named walks failed. After it:
  - His screen: the page moves 188px and the book ends 749px down, the tab
    bar at 761. It had stayed, the book's end under the bar.
  - The prayer book's last chapter opened at the foot of the screen, a
    chapter open above the one tapped (its title stays under the finger
    while the one above shuts, then the page goes with it), and with
    Purify's motion off (there a tenth of a second after the finger).
  - An answer that opens in sight leaves the page where it was.
  - The FAQ's first and last answers, the Terms' and the Privacy Policy's
    Contents, What's new's first and last parts. The Terms' Contents and
    What's new's 1.9 note are taller than the screen: their control rises to
    the bar and stops there, as the rule says.
  - A sweep: 28 controls over 8 pages, every one that opens in the page set
    low on the screen, tapped and judged.
  42 of 42.
- The big export walk's section 48 (the prayer book, Updates' checks of
  build 87 and 89) passes unchanged: "the tapped chapter never jumps", its
  largest move in a frame now 31px where the fold's own first frame is 77.

### A part that is still filling (2026-11-11, the pre-build gate; Fable Themes' finding)

Community's "3 replies" opens on two grey rows while its replies come from
the website, and says it is busy (`aria-busy`). The grey rows ended in
sight, the page was still, the watch let go after its 0.4s, and the replies
then landed with nothing watching: their end 939px down a screen whose tab
bar stood at 761px. The tap walk failed it as "under" although the control
names its part.

**The rule**: while what opened says it is busy, itself or anything in it,
the watch does not end on "still"; its moment (the 1.4s at most, the 0.36s
at least) begins when it stops saying so, so what has arrived is followed
as anything that opens is. It is not waited for for ever (12s), and the
reader's hand ends it as before: a reader who has moved on is not pulled
back to replies that come late.

**The check.**

- `lib/ui/__tests__/showOpened.test.ts`, 36 cases, 5 of them new, and each
  of the 5 fails on the helper as it was (it let go at frame 23, 0.37s in).
- `scripts/opened-walk.mjs`, four new walks. No walk here has a network, so
  the part is made for the walk on a real page of the export: a control
  that says what it opens, a part that opens on grey rows that say they are
  busy, and its words a moment later, taller than the screen has room for.
  The helper is the export's own, hearing a real touch. Its words 0.9s
  after the tap, and 2.4s after (later than any opening is watched): the
  page stays while the part waits, in sight, then moves 181px, and the
  words end 749px down a screen that shows to 761. With Purify's motion off
  the page is with them a tenth of a second after they come. And with the
  reader's finger drawn up the page while it waits (63px), the page stays
  where they left it when the words come. 46 of 46 with the walks that
  were there.
- Community's own replies, on the export reading the website (GET only,
  nothing sent, and no picture taken of readers' posts): four posts that
  say they have two or three replies, each opened on its grey rows; the
  replies came 211, 213, 369 and 515ms after the tap; the page moved 135 to
  334px with them, and all four end 748 or 749px down a screen that shows
  to 761. Fable Themes, who found it, had measured a thread's end at 852px
  with the bar at 697 where the replies came late.
- The gate's own walk on Community, the Bible's list and the reading room,
  reading the website, as a new reader with no Plus: 166 controls tapped,
  none failed.

### What it is not

- A part taller than the screen can show ends under the tab bar, with its
  control at the top. That is the rule's second half, not a miss.
- Nothing is followed that opens later than two seconds after the tap, or
  after the reader has moved the page themselves. (A part that has opened
  and is still filling is another matter: above.)
- A field the reader types in is not followed (the browser minds the
  caret), and neither is anything marked `data-opens-in-place`.

## A work's pill keeps one width as its parts turn (2026-11-11)

The fresh-eyes walk: "a council document's Next bar shifts 47px when
tapped". The pill at the foot of a work hugs its name in the middle of the
screen, so a name longer or shorter than the last moved both arrows sideways
as the part turned, out from under the finger turning the parts. Measured on
the export: 27 of the 38 council documents moved their arrows 15 to 55px
("On the Eight Canons" to "Canon I" is the walk's 47px; Nicaea's canons 55).
A second tap in the same place missed the arrow. The Fathers' works, whose
parts are numbered, moved 2px.

The pill now takes every part of the work and lays the work's widest names,
unseen, under the one shown (`components/saints/MobileWorkPill.tsx`,
`widestNames`), so it is one width for the whole work and the arrows stand
where they stood. Three unit tests, and three walks in
`scripts/opened-walk.mjs` (Ephesus' canons, Nicaea's canons, a Father's
work): four parts turned under a finger held in one place, the arrows within
0px.

## A page that is slow to come, and the pictures of nothing (2026-11-11)

P4 of the list sent to the arbiter on 2026-11-10: "a page slow enough to
show its outline is then put in place at once, with no motion." The owner's
word of 2026-11-11 brought it into 1.9 (nothing found is deferred to a point
release), and the arbiter's with it: measure, so the real page is not held
back. It was written down as a missing fade. Measuring it found a fault
under it that reached every page, and that one is mended first.

### What was wrong

**The bridge asked React for a picture on every change, not only on a change
of page.** The mark React is asked to picture (one transparent pixel that
carries the address, `components/nav/RouteTransition.tsx`) stood alone in
its `<ViewTransition>`, on the reasoning that only the address is inside it,
so only the address can set it off. That is not how React decides. On every
change it may picture (a part of a page arriving a beat late, a filter that
rewrites the address, a page taking its outline's place) React names every
`<ViewTransition>` standing anywhere beside what changed, in case it moved,
and starts a transition to find out (react-dom,
`commitNestedViewTransitions`). Nothing was seen to move. But the transition
was real: it ran its 420ms unseen, and React holds its next change until a
picture is over.

So every part of a page that came a beat after its page waited out a picture
of nothing, and started another. This is the root of two things met earlier
and worked around where they were found: the Florilegium's "nothing of a
page's first draw may wait in a boundary of its own" (F2), and the double
page switch Fable voices met on a saint's page.

**And the outline was cut in, and the page cut in over it.** An outline was
left out of the page switch's picture on purpose ("A page's outline waits a
moment", above), on the fear that picturing it would hold the page back. So
the page being left vanished, the outline stood, and then the page stood,
with no motion between any of them, on exactly the pages a reader waits
longest for.

Measured on the export built before the mend, with the two new walks of the
check run against it. Prayers, the Discover tab tapped, and every script the
page asks for kept back for a time, which is what a slow page is in the apps
(its words are on the phone; its script is what a slow phone is still
reading):

| The page's script there | Its outline shown | The page on screen | Transitions for the one tap |
| --- | --- | --- | --- |
| 450ms after the tap | 315ms | 1246ms | 3 |
| 1100ms after the tap | 301ms | 1231ms | 3 |

The first page could have been on screen at 615ms (React keeps an outline it
has shown for 300ms, whatever else is ready). It was kept back 631ms more,
by pictures of nothing.

### What a reader sees now

- **A page ready within a fifth of a second:** as before. It arrives as
  itself and no outline is drawn.
- **A page that is not:** at the end of that moment its outline arrives the
  way its page would have, in the same motion (going forward it settles in
  over the page being left; a tab for a tab, the two cross-fade). It arrives
  whole: its rows are not held back and brought in one by one, which had
  left an empty page settling in for the first quarter of a second.
- **When the page is ready** it takes its outline's place, and the outline
  dissolves over it in 180ms. The page's own rows come in as the outline
  goes. Nothing is cut.
- **With motion reduced** the outline and then the page are simply there.

The same tap on the export with the mend:

| The page's script there | Its outline shown | The page on screen | Transitions for the one tap |
| --- | --- | --- | --- |
| 450ms after the tap | 308ms | 645ms | 1 |
| 1100ms after the tap | 321ms | 1135ms | 1 |

### How

- **The mark asks only while the address is changing.** `RouteTransition`
  keeps the last address it has dealt with (`settled`), and the mark says
  `route-mark` only while the address being drawn is another one; between
  changes of address it says `none`, which React takes at its word and
  passes over. The layout effect says a change is dealt with the moment it
  has been pictured. It has to be the layout effect: React draws again at
  once for it, before any other change can commit, and leaves a plain effect
  until the picture is over, by which time the next change has already
  started a picture of nothing.
- **An outline is pictured as its page arriving.** The line that left it out
  is gone; whatever arrives is named and dressed (`beginNav`).
- **It arrives whole.** One rule in `app/globals.css`, beside the one for a
  page that has returned: an outline that came in a picture is not assembled
  row by row.
- **It dissolves over its page.** `lib/ui/outlineLeave.ts`. An outline says
  when React is taking it out, from its own cleanup, while it still stands
  (`components/ui/AfterAMoment.tsx`). It is copied as it stands: where it is
  on the screen, each row as far in as it had come, no brighter than it
  showed through the wrappers around it. Once React has finished, the copy
  is left over the page and fades. It is held to the screen and not to the
  page, because a page may go to the reader's own place as it arrives (a
  book left in the middle, a page come back to), and a copy that went with
  the page would be off the screen in that same frame.
- **Why a copy and not a second picture.** A picture has a price each time:
  React holds its next change until one is over, and the browser keeps one
  at a time, so a second picture started in the middle of a step back would
  end the first and snap the page into place. A copy is an element with a
  fade on it. It runs under any picture and holds nothing up.
- **A change of page takes every copy with it** (`outlinesForgotten`, from
  the bridge's layout effect): an outline that leaves with its page is in
  the page switch's own picture.
- **The page's rows do not wait.** A page's rows wait for the wrapper's own
  fade as a rule. Behind an outline that is going there is no fade to wait
  for, so the wrapper is told (`data-after-outline`) for as long as the rows
  take, and then untold.

### What it costs, measured

React holds its next change until a picture it started is over, so the page
does wait for its outline's picture when it is ready that soon. But React
keeps an outline it has shown for 300ms in any case (an outline that flashed
would be worse than none: react-dom, `FALLBACK_THROTTLE_MS`), and the
picture is over in 340. In the table above the page came 337ms after its
outline: 37ms more than React's own rule, and 601ms sooner than before the
mend. A page that is ready later than that waits for nothing (1135ms, with
its script there at 1100).

The website's own build says the same (`npm run build`, served on this
machine, at a computer's width; there it is the page's own request to the
server that is kept back, as on a slow connection): its answer 450ms after
the tap, the outline at 331ms, the page at 726ms; its answer at 1100ms, the
page at 1153ms. One transition each.

### What was tried and put back

The outline's arrival was first pictured from `lib/ui/routeMotion.ts`, the
way a step back is, so that React started nothing and waited for nothing. It
worked, and on the dev server it put the page on screen about a tenth of a
second sooner, for a page ready in that narrow window and no other. It was
put back for the plain way: a second hand-started picture with a hold, a
timeout and three races in it, on a path iOS's WebKit cannot be watched
taking from here, to save a tenth of a second on a page that is slow
already. The plain way is the path every page takes.

### The check

- `lib/ui/__tests__/outlineLeave.test.ts` (24 cases): the copy is made where
  the outline stood on the screen, fades for 180ms on the house curve and is
  gone; a row half in is copied half in; it begins no brighter than the
  outline showed; an outline out of sight leaves none; React's own take-down
  and put-back in development leaves none; a change of page takes it; with
  motion reduced there is none; the route's wrapper is told and untold.
- `lib/ui/__tests__/routeMotion.test.ts` and `loadingGrace.test.ts`: the
  mark asks only while the address is changing, said in the layout effect
  and nowhere else; an outline is pictured; a change of page forgets every
  copy first. Two lines read the React that Next ships
  (`commitNestedViewTransitions` passes over a mark that says `none`; an
  outline shown is kept 300ms), so an upgrade that changes either is caught.
- `node scripts/route-motion.mjs`, three new walks, each on a phone newly
  started (on one that has walked the app the service worker holds every
  script, and no page is slow): a page ready while its outline is still
  arriving; a page ready well after; and the same with motion reduced. Each
  must be one transition and no more, the outline pictured as the page
  arriving, something of the outline left over the page as it takes its
  place and gone again inside the fade, and the page in place within a
  quarter of a second of when it first could be. Run against the export
  built before the mend, the first two fail (three transitions, the outline
  cut away, the page 631ms late). On the export with it: 34 of 34.
- `node scripts/opened-walk.mjs`: 42 of 42, as before.

## What closes does not pull the page from under the finger (2026-11-11, the gate's first rule)

The arbiter's word of 04:21 UTC, on Admin's finding and Admin's proposal:
"When a reader closes a part near the foot of a page, the page shortens
under them, and the browser pulls the row under the finger ... one mend
beside lib/ui/showOpened.ts. While a part closes, the page keeps at least
the height the reader is looking at, and gives it back as they scroll up.
Reduced motion the same, at once."

### What was wrong

One fault, found three times. A browser does not let a page stand scrolled
past its own end. When a page grows shorter than where the reader is
looking, the browser takes the page back up to its new end, and everything
on the screen goes down by that much, the thing under the finger included.

- The owner's note 16 on build 93: Your rule, Evening tapped with the page
  scrolled down, and the switch 133px away. Updates mended that page by
  itself (`c1d1165c`).
- The gate's tap walk (Admin, 2026-11-11): an old year's box on What's new
  shut again, its own title pulled 204px.
- A fresh reader's walk, M4: Chants, a tradition chosen under "All chants",
  the row of filters 137px lower.

It is wherever a page ends in something that can grow shorter. Measured on
the export built without the mend, by `scripts/closing-walk.mjs`: each
thing set down the screen, tapped with a real touch, and watched on every
frame for 1.6 seconds. How far the thing under the finger moved:

| The place | A small phone (360) | A phone (390) | A tablet (820) |
| --- | --- | --- | --- |
| What's new: the year's box shut at its own title | 233px | 296px | 464px |
| What's new: the last month opened and shut again | 224px | 287px | 455px |
| The FAQ: its last question opened and shut again | 192px | 207px | 121px |
| Prayers: the prayer book's open chapter shut | 96px | 196px | 296px |
| Chants: a tradition chosen under All chants | 112px | 129px | 129px |

On the export with the mend every one of the fifteen is 0px (Chants reads
0.6px, which is a half pixel of rounding), and so is What's new with
Purify's motion off.

### The rule

After a reader's tap, the page keeps at least the length they are looking
at. Whatever grew shorter below their finger has still grown shorter; what
is left where it was is plain ground at the foot of the page, and the thing
they touched has not moved. The ground is given back as they scroll up, a
piece at a time and only the piece already below the screen, so giving it
back is never seen either. It is let go at once when the page is long
enough of itself again, and when the page changes. Nothing here moves in
time, so it is the same with motion off.

### How, and the two ways it was made first

`lib/ui/keepLength.ts`, mounted with the opening helper
(`components/nav/OpenedBridge.tsx`). It was made three times, and the first
two are worth keeping the reasons for.

1. **Watch the page, and put it back.** A ResizeObserver on the page's
   holder; when the browser has pulled the page, lengthen the holder and
   scroll back, inside one frame and before it is painted. No reader would
   have seen the pull. But anything that read the page's layout in that
   frame did, the walk above among them: it measured the title 233px down
   for an instant on the build that had this. A fault nobody can see and
   everything can measure is not a mend.
2. **Keep the length before anything changes.** As a tap lands (a capturing
   click, which runs before anything the tap does), the holder is told to
   stay at least as long as reaches the foot of the screen. It is that long
   already, so telling it changes nothing; but whatever the tap then does,
   the page cannot end above the foot of the screen, and the browser has
   nothing to pull. A moment later (1.4s) the tap is over, and a telling
   that did nothing is taken away. This is the rule as it stands. It was
   first written as a style on the holder, and that would have done harm of
   another kind: it runs at every tap, and the gate's tap walk tells a
   control that does nothing by the page not having changed after it (it
   counts every change to the page's elements). A style written at every tap
   would have made every dead control in the app look alive to the gate.
3. **So the length is said in a rule of its own**, in a stylesheet made
   once as the app starts, and a tap only changes what that rule says. A
   rule's words are not part of the page's elements: they are seen by the
   layout and by nothing else. Checked on the export: a tap on plain words
   at the foot of a page leaves the holder with no style of its own, and
   the page keeps its length all the same.

What it leaves alone, each on purpose:

- **A thing that rides the screen** (a bar of filters stuck under the top
  bar, anything in a sheet). It will not move, and the list under it may end
  sooner; kept long, the reader would be left looking at bare ground.
- **A page that changed above the finger.** The thing tapped has moved in
  the page, so keeping the page's length keeps nothing under the finger. It
  is let go the moment that is seen (a ResizeObserver on the holder and on
  what stands in it, for the moment after a tap), in the same frame, and
  the page does what it would have. That is another fault with another
  mend, and the prayer book makes its own.
- The reader's own scroll, and a change of page.

### The check

- `lib/ui/__tests__/keepLength.test.ts` (40 cases): his kind of screen as
  arithmetic, before and now; only as much as reaches the foot of the
  screen; a fold over many frames; nothing written on the page at a tap, and
  the walk's own counting read from the walk; what is left alone; the
  giving back; the watching; the wiring.
- `node scripts/closing-walk.mjs` (new): the five places above at three
  sizes with a real touch, then the giving back, then motion off. 19 of 19
  on the export with the mend; 18 of the same 19 fail on the export without
  it. (What's new was rebuilt the same morning as months and their updates,
  with no year's box. The walk follows it: the oldest month's box is shut
  at its own title at three sizes, and the open month's last update is
  opened and shut on a wide screen only, since on a phone the months after
  it fill the screen and the page stays long enough of itself, with 182px
  to spare at 360 by 740 and 120px at 390 by 844. 17 of 17 since.)
- The gate's own walk on the same screens (`node scripts/tap-walk.mjs out
  --only /whats-new/,/faq/,/chants/,/prayers/`): What's new, the FAQ and
  Chants with nothing failed, 98 controls tapped.
- `node scripts/opened-walk.mjs`, `node scripts/route-motion.mjs` and the
  export walk's sections 48 (the prayer book) and 68 (Your rule's switch,
  which keeps its own page long enough, so this never acts there): as
  before.

### Two things the gate's walk says of Prayers that are not faults of the page

Both seen while checking this, on the same export, and both measured:

- **"I The daily rule: it moved 21px under the finger."** The title's top
  does not move: 434.5px down the screen on every frame for 1.5s after the
  tap. What changes is the title itself, which is 48px tall while its
  chapter is open and 90px when it is shut, because a shut chapter shows a
  line of what is in it. The walk measures a control's middle, and half of
  42 is 21.
- **"Back returned to 296px, the reader was at 437px"** (The Prayer of St.
  Ephrem, and Morning prayers the same way). The link is back under the
  thumb: 424px down the screen when it was tapped, 423px after Back. The
  scroll number differs because the page does: "Pray now" puts the prayer
  just opened first, so what stands above the link is 141px shorter than
  when the reader left, and `lib/ui/returnPlace.ts` moved the page by
  exactly that to put the link where it was. The walk compares the scroll
  number, which is the measure `returnPlace` was written to replace.

Both are told to Admin, whose walk it is, with the numbers.

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
- Build 93 note 1, on the build after 93: First Nicaea, St Alexander chosen
  in the Holy Fathers row and opened by the card, then Back by the arrow
  and again by the phone's own button. The council's page is where it was
  left both times, and the row is still on St Alexander.
- Build 93 note 15, the same build: Prayers, every chapter of the prayer
  book shut, "Before & after daily life" opened. The page moves with it and
  the book's last chapter is still in sight over the tab bar. Then an answer
  near the foot of the FAQ, and the Contents on the Terms.
- A council's canons (Ephesus, Nicaea): the arrow at the foot of the page
  tapped several times without moving the finger. It turns a canon each
  time.
- What closes (2026-11-11): What's new, scrolled to the foot, the year's
  box shut by its own title; and Chants, a tradition chosen under "All
  chants" with the list's foot in sight. The thing under the finger stays
  under it, and scrolling back up shows no gap opening or closing.
- A page that is slow to come (2026-11-11). A phone reads its pages from
  itself, so one is hard to make by hand there; the place to see it is the
  website on a slow connection, or the first tap into a section after the
  app is first opened on an old phone. The outline should arrive as a page
  does, and the page come through it, with no cut at either. And on any
  phone: the app should feel no slower than build 93 anywhere, and quicker
  wherever part of a page used to arrive a beat late.

## What is not in this note

- The browser's own Back and Forward buttons on the website are not pictured
  (the plan, above).
- (Closed 2026-11-11: "A page that is slow to come, and the pictures of
  nothing", above.) A page that took more than a moment showed its outline,
  and the page then replaced the outline at once.
- A page of the website opened from outside (a typed address, a link from a
  search engine) is not a page switch, and is as it was. The server sends
  such a page's outline first and its words after it, and the words take the
  outline's place the moment they arrive, before React has woken on the page,
  so nothing of this note is there to dissolve it. Seen on the website's
  build on 2026-11-11: Discover, a council, the Calendar, a chapter of the
  Bible and a saint's page each carry their outline in the first page sent.
  On a quick connection the two arrive together and the outline is never
  painted. Giving that moment a dissolve means a <ViewTransition> standing
  in every page, which is the very thing "the pictures of nothing" took the
  cost of; it is put to the arbiter as a thing found, not built here.
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

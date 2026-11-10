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
| A cover (`WorkCover`) | the same cover at the head of the page it opens (a walkthrough) | the title |
| One of Theology's four buttons, tiles and rows (`TheologyLibrary`) | the glyph at the head of the way's page (`WayPage`) | the way |

Going back, the picture returns into the card it came out of, found again as
the same link. The check caught one thing here: a long list draws a card only
once it is near the screen, the browser decides that a frame late, and a
list just put back was pictured with the card still undrawn, so the saint's
icon left his page and did not arrive in his card. The card that takes the
picture back is now drawn for the length of the change.

**The rule kept: a picture travels only where the page shows the same
picture.** Three places from the plan do not, and nothing travels there (the
picture leaves with its page, in the page's own motion):

- **The reading room's covers.** A cover opens straight into the text
  ("Book I", then the words). There is no cover at the head of that page to
  travel into. If he wants one there, that is a change to the reader's head,
  which note 15 has just set.
- **Your rule.** Its head is another picture, with the title over it. Tried:
  the tile's Christ changed into the head's fresco on the way and covered the
  title until the change was over.
- **A saint with a wide picture at the head.** The same: another picture,
  with the name over its foot. A saint whose page opens on his icon (most of
  them) does carry.

### The check

`node scripts/route-motion.mjs` opens the export in Chromium, the Android
WebView's engine, served as the shells serve it, walks the app and reads from
the browser what it pictured. Twelve walks (eight, and four on the
Florilegium since its redesign). `--film <folder>` writes stills of
the middle of each transition, which a screenshot of a running app cannot
take: the transition is stopped as it becomes ready and stepped to each time.

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

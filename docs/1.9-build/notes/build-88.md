# Build 88 on his phone (notes, all five fixed)

Android build 88, from `503929f3` on `ccr-07896cf2-bo0afd`, installed from the
`android-release` page on 2026-11-07. Brainstorm mode was on when these were
written: each note says what he saw, the cause found in the code, and the fix
planned.

**Where each note stands (recorded 2026-11-09).** All five were built on
2026-11-08, after his word that day ("just do all of it"), on this branch.
None is walked on a phone yet: build 88 predates them all.

- Note 1, the hold's menu: `9ae0442`. Copy reference in Study was set aside
  with the strip; it stays on the computer's menu.
- Note 2, a scroll's end selecting a verse: `9ae0442`, by the plan's second
  way (a touch that begins within 100ms of the page's last scroll, or during
  which the page moved, is the scroll's), not by the phone's own click.
- Note 3, the note: `291de2a`, with his pick C. Note opens the journal's own
  sheet, and a saved note is a small pen at the verse's end that opens it.
  The drawing's card for a saved note (Edit note, Delete) was not built: the
  pen opens the sheet. The question of the strip over the next verse went
  with the strip.
- Note 4, faint text: `77e61af`, with the shares as measured, not as
  planned: Light 70%, Candlelight 60, Monastery, Councils and Cappadocian 55,
  Dark 50 for its 45.
- Note 5, the 44px buttons: `985c020`.

## 1. Holding a verse opens the computer's long menu as well as the strip (fixed, `9ae0442`)

**What he saw.** Holding John 1:15 opened the verse strip under the verse
(Highlight, Copy, Share, Image, Note, Study) and, over it, a long list down the
right of the screen: Copy verse, Copy as quote, Copy reference, Copy link,
Highlight verse, Add note, the seven colours, Name colors, Bookmark verse,
Gather to florilegium, Cross-references, Open commentary.

**Cause.** That list is the computer's right-click menu
(`components/bible/VerseContextMenu.tsx`), opened by `onContextMenu` on the
verse's words (`components/bible/VerseRow.tsx`, `openContextMenu`). Android's
WebView, like Chrome on a phone, sends a `contextmenu` event on a long press,
so the hold that opens the strip (`onWordsTouchStart`, its `LONG_PRESS_MS`
timer) also opens the right-click menu. Nothing tells the two apart. It goes
back before 1.9; in 1.8 the hold's sheet covered the whole screen and may have
hidden it, and the strip has no backdrop, so now it shows. The export walk
could not catch it: it holds a verse with the browser's touch events, which
never make the phone's long-press gesture or its `contextmenu`.

**Fix planned.**
1. The right-click menu answers a mouse only: in `openContextMenu`, a
   `contextmenu` that follows a touch on the verse (the touch time is already
   kept, `touchAtRef`) is a long press, which is the strip's; it is stopped
   (`preventDefault`, so no menu of the system's either) and opens nothing. The
   computer keeps its right-click as it is, and so does a website reader with
   a mouse.
2. The walk's section 12 sends a `contextmenu` after its hold, as a phone does,
   and requires the strip and nothing else.
3. One gap to decide: the long menu had **Copy reference**; the strip's Study
   has the quote and the link but not the reference alone. Add it to Study, or
   leave it to the computer's menu.

## 2. The end of a scroll selects a verse; selecting and highlighting collide (fixed, `9ae0442`)

**What he saw.** "The select verse/highlight verse system is colliding and not
smooth. When scrolling to another verse and letting go my finger on the next
verse, my finger lands on it, clicks it."

**Cause.** A verse decides for itself what a tap is, on the finger's lift
(`onWordsTouchEnd` in `components/bible/VerseRow.tsx`): up within 400 ms of
going down (`LONG_PRESS_MS`) and moved less than 8 px (`SCROLL_SLOP_PX`) is a
tap, and a tap selects the verse and opens its strip at once (his pick B). Two
things a phone never calls a tap pass that rule:

- **The touch that stops a glide.** After a swipe the page glides on; a finger
  put down to stop it and lifted again has not moved, so it is a "tap" on the
  verse under it. The phone itself knows that touch stopped a scroll and sends
  no click; the verse does not ask.
- **A finger held still while the page moves under it.** The rule measures the
  finger on the screen, not the page, so a page that slid under a resting
  finger still reads as a tap.

And they collide: such a false tap is remembered as the first of a double tap,
so a real tap on a verse within 320 ms and 28 px of it is read as the second,
and the verse is **highlighted** instead of selected.

**Fix planned.** Let the phone say what a tap is, as every native app does:
the strip opens on the verse's `click`, which the phone does not send after a
scroll, a glide or a glide's stop, with its own thresholds for the screen.
Touch keeps only what is the verse's own: the hold, the drag across words, and
the double tap, which becomes two clicks in time. Failing that, two guards on
the present rule: a touch that begins while the page is still moving (a scroll
in the last 100 ms) is the scroll's, and a touch during which the page itself
moved is too; neither counts towards a double tap. Held by a test of the
gestures (a glide stopped, a still finger over a moving page, a slow drag, a
tap, a double tap after a glide's stop) and by the walk, which glides the page
and lifts a finger on it.

## 3. The note: refine its design and the way it works (built with his pick C, `291de2a`)

**What he saw.** Note, from the verse strip on John 1:47, opens a box under
the verse: a field with a light square frame inside a rounded box, a resize
grip in its corner, "Esc to close" under it, then Cancel and Save, with the
keyboard over the lower half of the screen. He asked for the note's design
and experience to be refined.

**What is wrong with it** (`components/bible/VerseRow.tsx`, the note editor
and the saved note):
- The computer's keyboard hints on a phone: "Esc to close", and once there are
  words "⌘+Enter to save · Esc to cancel" (`bible.escToClose`,
  `bible.noteSaveHint`). A phone has neither key.
- Two frames: the field's focus ring is drawn square inside the box's round
  corners, and the field keeps a desktop resize grip.
- It does not say which verse it is for, and the verse loses its selection as
  the box opens, so the box floats under a verse with no mark.
- The words are in the interface's sans, where the app's own sheet for
  writing (the journal's) writes a reader's words in Lora, as large as the
  reader's text.
- Closing it drops what was typed; a Delete hides among Cancel and Save.
- The saved note's two grey lines, "Your note" and "You wrote this today",
  measure 4.49:1 on Dark inside its box, just under the 4.5:1 floor, and
  less on Light (note 4).
- Seen in the same pictures: the strip itself lies over the first lines of the
  next verse (verse 48's opening is under it), so a reader cannot see what it
  covers while it is up.

**The first drawings are withdrawn (2026-11-07).** His word on them: "I'm
disappointed you forgot our guardrails and our design style. I'm seeing
designs that contradict our guardrails." He was right. They broke, each one
a rule written down in this repository:
- A "×" typed as the close button; the icon system has the `Close` icon, and
  the writing sheet a Close word (`docs/design/icon-system.md`).
- That close button about 34px across, under the 44px floor
  (`lib/ui/__tests__/touchTargets.test.ts`).
- Grey lines at 42% white, 4.1:1 on Dark, under 4.5:1.
- Colours typed in as fixed values, not the palette's tokens, so nothing in
  them would follow Light (`lib/ui/__tests__/lightSurfaces.test.ts`).
- A rule down the note's left edge: a side stripe, which Saved gave up in 1.7
  (note 21, "no side stripe, no box", held by the walk), and the kind of line
  he called vibe coded in 1.7 note 24 ("the custom drawings, the line"); and
  set on the left, not the start side, so wrong in Arabic.
- A reading of the verse as the sample note: AI-drafted words about Scripture
  in a picture of the app (`docs/brand/voice.md`, non-negotiable 3).
- "Kept with the verse, and in your journal", said to every reader, though
  the journal is Plus (non-negotiable 4: never claim what a reader does not
  have).
- A sheet, a card and a page drawn by hand, where the app already has the
  sheet for writing about a verse, the journal's, which he chose in 1.7
  (note 23: "writing full screen with the verse or reading it came from
  attached on top"). And the first note here called the saved note's grey box
  "unlike anything else on the page": wrong, it is the reader's own aside box
  (below).

So that it does not happen again (his word: "incorporate this fix into your
memory"): `CLAUDE.md` now holds the rule, mockups are drawn from the app's
own components and checked before they are sent, and `scripts/mock-check.mjs`
is the check. It measures five of the eight (the glyph, the target, the grey,
the fixed colours, the stripe) and gold, em dashes and Arabic mirroring as
well; its `--self-test` draws the first drawings' mistakes and fails each
one, and passes the same parts made from the house's classes. The other three
(the sample words, the Plus promise, a sheet made by hand) are its by-eye
list, printed with every report.

**The design now: the app's own writing sheet.** Drawn from the app itself:
the real journal sheet (`components/journal/JournalComposer.tsx`), opened on
the native export's `/journal` for a note on John 1:47 and set over John 1.
Nothing in the pictures is drawn by hand but the phone's keyboard.
1. **Note, in the strip, opens the journal's writing sheet in its note form.**
   As tall as the keyboard leaves (`Sheet` `fill`); Close at the start, which
   keeps what was typed for that verse; Done at the end, which keeps the note,
   or takes it off if the words were cleared; the date between them. Under
   them the verse in its words with its reference, then the note in Lora with
   no frame. It is the sheet the journal already uses to edit a verse's note
   ("A note written on a verse is edited here too, and stays the verse's
   note"), so a note is written one way everywhere. The note stays free and
   the verse's (`lib/bible/annotations.ts`); nothing on the sheet speaks of
   the journal. On a tablet and a computer it is the journal's centred panel.
2. **Two changes to its note form:** the verse's own placeholder, "Add a note
   for this verse…" (`bible.notePlaceholder`, in all 21 languages already), in
   place of the journal's "Write what is on your heart…"; and no Open link
   when it is opened from the verse itself, where it would open the page
   already open.
3. **Its placeholder at the house's caption share, 55%:** 6.2:1 on Dark, where
   its 35% is 3.2:1. The journal's Write gains it too.
4. **The saved note keeps the reader's aside box**, the box of the Greek
   numbering note and the glosses (`GreekNumberingNote`, `GlossedText`), with
   one grey line under it, not two: "You wrote this today"
   (`bible.noteWrittenWhen`; "Your note" only where the time is not known), at
   55%, 6.0:1 on Dark. A tap on it opens the sheet.
5. **The inline editor goes**, and its computer hints with it (Escape still
   closes the sheet on a computer, as it closes every sheet).

**Measured on what was drawn**, on all five palettes with note 4's rule in:
every word 4.5:1 or more against its ground (the lowest, John 1:47 on
Candlelight at 55%, 4.51:1); Close 62 by 47px and Done 78 by 47px; no
character used as an icon; no em dash; no new words, every line an existing
key. Pictures, sent in chat 2026-11-07: 1 the sheet on Dark, empty; 2 on
Light, a note written; 3 the saved note under its verse on Dark. The sample
note is a plain reminder, "Read this again on Sunday.", so that no reading
of Scripture is put in a reader's mouth.

**Fix planned** (when he says start, and his word on the design first):
- `VerseRow.tsx`: Note opens the composer in its note form, with the verse's
  words from the page; the inline editor and its two hints go; the saved note
  keeps its box, one line at 55%, and opens the sheet on a tap.
- `JournalComposer.tsx`: the note form's placeholder, no Open from the verse,
  the placeholder at 55%, and the journal's Open link 44px wide, not 40 (found
  by `scripts/mock-check.mjs` on the sheet as it is).
- What was typed and closed is kept for that verse, not in the journal's one
  draft, which the next Write would replace.
- Held by a test of the source (the strip's Note opens the composer; no Esc
  or ⌘ hint on the page) and by the walk: Note opens the sheet with the
  verse's words, Close keeps them, Done puts the note under its verse, each
  word measured against the floor.

**One question left with it, his word:** the strip over the next verse. Open
it in the page's flow, the verses below sliding down as it opens and back as
it closes, so it covers nothing; or keep it over the page and let a scroll
put it away, as now.

**His answer to the photos (2026-11-08): "I don't like any of it."** Asked
why, he chose two: plain, not premium; and the wrong idea, so start fresh.
The feel to aim for: a mix of YouVersion, Apple Books and Hallow. So the
small proposals above (Copy reference in Study, the strip in the page's
flow, the journal's writing sheet) are set aside, and the verse system is
drawn again, premium, in three versions of what a tap on a verse does:

- **A. A pop-up (Apple Books):** a glass pop-up just above the verse, the
  seven colours on top and Note, Copy, Share, Image, Study under them.
- **B. A tray (YouVersion):** a glass tray from the foot of the screen, the
  reference in Lora, the colours, then eight tools as tiles (Copy, Share,
  Image, Note, the Greek, Cross-references with the Plus lock, Bookmark,
  Study).
- **C. A focus (Hallow):** the page steps back, the verse lifts into a card
  in Lora, the colours above it and the tools in a list below it.

And three screens any of them would share: Study as cards (each Plus card
with the Plus mark), writing a note (the verse as a card above the words),
and a saved note as a small pen mark at the verse's end, which opens the
note as a card with Edit note and Delete. Compare is left out: it is not
built. Every screen was drawn from the house's parts over the native export
(icons from `components/ui/icons`, the swatches from the real
`HighlightPicker`, colours only as tokens, Lora and DM Sans) and passed
`scripts/mock-check.mjs` on all five palettes, the yellow highlighter
marked allowed as his own exception. Notes 1 and 2's fixes (the computer's
menu on a hold, a scroll's end selecting a verse) stand whichever he picks.

**His pick (2026-11-08): C, the focus, "and ensure it's smooth with
animations".** Drawn again for the pick, with one correction: the first C
blurred the page behind it, and the house does not blur (the Android
WebView bleeds a picture through backdrop-filter and drops frames,
`app/globals.css` and `docs/design/athon-motion-teardown.md`); the page now
steps back under a plain dark layer. Its motion, in the house's tokens
(`--ease-house`, the duration ladder, `--stagger-step-tight`):

- **Opening, about 0.8s.** A soft tick on the tap. The page steps back (the
  layer fades in, 320ms). The verse lifts: the card starts where the verse
  is and rises to its place (480ms, its opacity in over the first half),
  while the verse in the page fades out under it (240ms). Then the colours
  and the tools arrive in reading order, opacity only, 320ms each, 38ms
  apart, from 300ms: the motion follows the reading, never everything at
  once.
- **A colour.** The check draws into its swatch and the wash comes up
  behind the card's words (200ms); the verse in the page wears it.
- **Closing, about 0.3s, in two steps, never at once.** The tools (120ms)
  and the card (140ms, a breath smaller) go over the page still stepped
  back; then the page comes forward with the verse wearing its colour, and
  the dock and the tab bar come back (180ms, from 120ms). An exit about a
  third of the entrance: what leaves stops competing quickly.
- **Reduced motion** (`data-motion="reduce"` on `<html>`, `lib/ui/motion.ts`):
  no lift and no cascade, the whole layer fades in and out (200ms).
- **The motion doctrine held** (`lib/ui/__tests__/motionDoctrine.test.ts`):
  every transform ends at none, nothing on a route root, the layer portaled
  to `<body>` as the house's sheets are.

Shown to him as a film (2026-11-08): the real export, the focus at rest
passing `scripts/mock-check.mjs`, each frame stepped at 60fps so the film is
the motion as designed, not the headless browser's speed. Its smoothness on
a phone is for the device walk once it is built. Study as cards, writing a
note and the saved note's mark and card (the three shared screens) go with
C unless he says otherwise. Notes 1 and 2's fixes stand.

**The journal, his word (2026-11-08):** of picture 2, "it could be better
honestly. The whole journaling system should feel like a journaling system,
not just a notepad system (like Notion)." The difference taken from that: a
notepad is text; a journal is a dated page of a life, here a life with the
Church's year. Drawn from the house's parts over the real `/journal`, and
passing `scripts/mock-check.mjs` (which caught a left and right padding on the
Gospel card, made start and end before anything was sent):

- **Your journal, by the Church's day.** At the top, today's page: the
  weekday large in Lora, the date and the day's feast or saints under it
  (from `lib/calendar/orthodox.ts`, `commemorationsOn`), Write, and the day
  itself to write from: today's readings (`dayReadings`: the Gospel and the
  Epistle) and the verse highlighted today, each with a pen. Then From this
  day (a year ago today), then the past days as pages, each headed by its
  weekday and its Church's day (the 33 Martyrs of Melitene; St. Paul the
  Confessor and the Friday fast).
- **Writing today's page.** The page is headed by the day, not by a title
  field: the weekday, the date, the feast; what it is about as a card (the
  Gospel, with Open); Reflection, Prayer or Question; then the words.
- **A page you wrote.** The same heading, the kind and the time, the verse it
  was written on as a card, the words at reading size, and Edit.

Every word is an existing key (`journal.*`, `calendar.todaysReadings`,
`bible.kindGospelLong`, `saved.kind.highlight`), every date the app's own
format, every name of a day the app's own calendar. The feast's icon was
left out on purpose: the Archangel's icon is in the app, but
`lib/saints/iconRights.ts` records no source or licence for it yet, so a
picture of the day joins the page only where its source is verified. The
journal stays Plus, as now.

## 4. Light's grey lines are under the contrast floor, all over the app (fixed, `77e61af`)

**Found by Claude, 2026-11-07,** measuring note 3's sheet on every palette.

**What was found.** The app's grey lines (captions, dates, counts, fine print)
are the palette's ink at 40 to 60%. On Light, the free palette for readers
who get dizzy on dark ones, every one of them is under WCAG AA's 4.5:1:

| Ink share, on the page | Dark | Light | Black | Candlelight | Monastery | Uses |
|---|---|---|---|---|---|---|
| 45% | 4.56 | 2.62 | 4.43 (4.75 by its rule) | 3.35 | 3.98 | 264 |
| 50% | 5.36 | 2.96 | 5.32 | 3.95 | 4.64 | 245 |
| 55% | 6.19 | 3.39 | 6.25 | 4.56 | 5.37 | 645 |
| 60% | 7.19 | 3.90 | 7.37 | 5.25 | 6.19 | 401 |

Light needs 66% to reach 4.5:1. The 40% share (135 uses) is under the floor
on every palette, which the Black rule's own comment already says. Black has
a rule for its 45% (`app/globals.css`, "text-paper/45 is on about 300
eyebrows"); Light, Candlelight and Monastery have none. Placeholders at 35 to
40% (46 fields) are 2.0 to 3.8:1. Nothing caught it: the axe suite runs on
Dark only, and `litPalette.test.ts` holds the liturgical surfaces, not these.

**Fix planned.** The Black rule's way, in `app/globals.css` (in the
utilities layer, under `:where()`, so a hover still wins): on Light the 45 to
60% shares drawn at 70% (5.0 to 5.2:1); on Candlelight the 45 and 50% at 60%
(5.25:1); on Monastery the 45% at 50% (4.64:1). Decorative and disabled text
excepted, as WCAG excepts it. Held by a test that does the arithmetic on
every palette, as `litPalette.test.ts` does for its surfaces, and by the walk
measuring a caption on each palette. Note 3's pictures were drawn with its
Light and Candlelight parts in.

## 5. The top bar's buttons and every sheet's close are under 44px (fixed, `985c020`)

**Found by Claude, 2026-11-07,** by `scripts/mock-check.mjs`, on the Study
sheet and on Saved, while taking the photos for notes 1 to 4.

**What was found.** The phone's top bar (`components/nav/MobileTopBar.tsx`:
back, search, the round buttons) and the shared sheet's close
(`components/ui/Sheet.tsx`, whose own comment promises 44) are `h-10 w-10`:
2.5rem, which is 42.5px on the app's 17px root, under the 44px floor. On
every page with the top bar, and in every sheet that keeps its own title
row.

**Fix planned.** `h-11 w-11` (46.75px), or `hit-44` where the room is tight,
as `components/nav/NativeBackBar.tsx` already does.

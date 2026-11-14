# Build 97: his notes

Build 97 (run 43608911353, from 231e1ce0, code 59d1fd98), cut ungated at his word (2026-11-14 about 15:11 UTC: "make the android build and send it to me (without chants)"), on the android-release page from 15:20 UTC. Named to him as not passing the gate: faults 6, 7 and 8 and the buy bar's room open, the privacy line not in, the re-check not run. Each note keeps his words, what was found, the plan and its owner; every note gets a test that fails on the old code (the pre-build gate, rule 5). His notes go to one fixer together, before the re-check.

## Note 1: the lit line in the middle of the screen, and the click with the glow

**His words** (about 15:56 UTC), with a screenshot of Morning prayers at the Trisagion, the lit line ("Holy God, Holy Mighty, Holy Immortal, have mercy on us. (3x)") standing about two fifths down the screen: "it should glow the quite in the middle of the users screen. and also the haptic feedback should move you and glow to the next section (rather than haptic feedback on a arbitrary feeling line with no visual hook)".

**Found.** The prayer pages light the line at the reading place, two fifths down the band (`lib/ui/readingPlace.ts`, `components/prayers/service/useLitLine.ts`), and the click comes when a new prayer arrives at that place (`components/prayers/service/useEasyScroll.ts`, `clicksFor` in `lib/prayers/easyScroll.ts`). His standard from build 81 asked for "the middle of the user's screen"; the band's middle is already where a page reads back the block the reader is at (`KEPT_AT`). Easy Scroll's snap to each prayer was taken out on build 93 note 2, because it fought the finger.

**The plan.** (a) The line lit is the one over the band's middle, on every prayer page. (b) The click comes in the same frame as the glow lands on a new prayer's first line at that middle, so every click has its visual hook, and never at a place the reader cannot see. (c) No move by itself, unless he asks for it back (asked at 15:58; recommended: no, as build 93 note 2 found). A test that fails on the old code for (a) and for (b); the prayer pages walked with the clicks on. **Owner:** the next fixer, with the rest of his build 97 notes.

## Note 2: the journal as its own page, and a bug when typing starts

**His words** (about 15:58 UTC), with three screenshots of a journal entry's sheet (Saturday, November 14; Epistle, 2 Corinthians 11:1-6): "journal is still messy in terms of UI. and when you open up the type UI theres a spiratic UI bug. rather than a pop up window for the journal game you give it its own simplified optimized UI?"

**What the screenshots show** (the arbiter's reading, for the designer): two layers at the foot at once (the cover tray, "Cover / No cover / Done" and its row of icons, standing on the toolbar "Verse / Quote / Highlight / More"); two Done buttons on screen (the head's grey pill and the tray's); an empty quote block ("The words you are quoting", "Who said it") under the title; the cover's credit line in full under the picture; three segmented choices (Reflection, Prayer, Question; Serif, Sans; Start, Centre); More as a long settings panel (Notebook with its chips, Tags, Font, Alignment). With the keyboard up the cover is gone and the page has moved (the second screenshot), which may be the bug he means.

**The plan, for his yes.** The writing becomes its own page, not a sheet: one calm surface (the day and its reading, the kind, the title, the words), one Done, and everything else (cover, verse, quote, highlight, notebook, tags, font) behind one quiet control rather than stacked trays. One Fable round of stills at phone width first, drawn from the app's own components, checkMock passing, each choice justified; recommended together with round 3 of the fifteen screens (the Bible's opening, You, Plus), in round 1's way, so one Fable chat draws four screens. The bug in the sheet is not mended on its own if the page replaces the sheet; the new page passes the keyboard walk instead. Asked of him at 15:59: his yes to the round, and what the bug does (a jump, a flash, something covered), a screen recording best. **The bug, in his words** (about 16:01): "and it's a jump and a flash for the typing bug". It goes to a fixer to reproduce first: if every sheet with a field jumps and flashes as the keyboard comes, a new journal page alone would not cure it. **Owner:** a Fable designer chat on his yes, then a fixer to apply it.

## Note 3: the first opening of each page, made ready ahead

**His words** (about 16:00 UTC): "when you first open the pages on the app they all load in clunky and slow (can you load in the screens when they are at the end of onboarding and the animation is happening so it's not clunky or slow?)"

**Found, and a trap.** Next's own prefetch is kept out of the apps on purpose: their export leaves out the per-part files a prefetch asks for (`scripts/native-build.mjs`), and a prefetch that found none held the next page back by about 30 s on the export (`components/whats-new/tour/TourLayer.tsx`, lines 35 to 39). So "load the screens ahead" cannot be `router.prefetch` in the apps; it has to be built for the export (each tab's code and its pictures readied ahead), or it makes the first opening slower, not faster. Also to measure: `components/bible/KeepScrolling.tsx:71` calls `router.prefetch(href)` with no such guard, so the next chapter may be held back in the apps the same way.

**The plan.** First measure, on the export with a cold start, where each first opening's time goes (code, the page's data, pictures, the page switch), for the five tabs and the pages they open most. Then ready them ahead in small idle steps: at the end of onboarding, as he asked, and once the first screen of every cold start has settled (the arbiter's addition, so readers who update or reopen get it too), one page at a time, never at the cost of the animation's frames (the motion walk proves it). A test that fails on the old code; the first-opening times before and after, in the report. **Owner:** a fixer, measuring first.

## Note 4: every picture in the councils, the local synods and the book covers too

**His words** (about 16:02 UTC), with six screenshots: "please ensure every photo is accounted for and not missed in the councils section (even the local synods and book covers)". On the plate's cross in them: St Irene the Empress (Second Nicaea), St Eutychius of Constantinople (Second Constantinople), St Anatolius of Constantinople and St Juvenal of Jerusalem (Chalcedon), St Juvenal and St Celestine of Rome (Ephesus), St Nectarius of Constantinople (First Constantinople, and Constantinople 394), and no picture at all at the head of the Council of Constantinople (394).

**Found.** A Father with no cleared picture stands on the plate by design, so a missing face never reads as a failed load (build 93 note 1, `lib/councils/__tests__/fatherPlate.test.ts`). But the gate's part 3 is held by `lib/saints/__tests__/everySaintAPicture.test.ts` and `lib/reading/__tests__/coverArt.test.ts`, which hold the saints' library and the reading room's covers, not the councils' Fathers or the local councils' heads; so the gate never counted these. Nineteen councils are in `data/councils/`. Wikimedia Commons answers from the containers.

**The plan.** An audit of every picture in the councils section: each council's head (the seven and every local synod), every Father's face on each page, and every book cover under "Read the Council's documents". Each missing one is found as a public-domain icon of that saint (never another saint's face, never a picture made by AI), credited, its edges checked; or, where none can be had, named on the list of permissions awaited with its reason. A test that fails on the old code holds every council's head and every Father to a picture or the named list, so the gate counts them from now on. **Owner:** a fixer.

## Note 5: the Voice sheet, what plays and what is downloaded

**His words** (about 16:03 UTC), with a screenshot of the sheet (Heart, then the phone's Voice 1 to 6 in American and Australian English, each with "Hear it"): "clicking hear shows no animation and there is no download button (if it's already downloaded it should be a distinct design so signify a voice that is downloaded and isn't downloaded and a distinct play to listen for both)".

**Found.** The list below Heart is the phone's own voices, which his answer on "Heart only" (NOW, Waiting on him) would take away. The sheet shows no state while a sample plays, and nothing says whether a voice is on the phone.

**The plan.** The sheet follows that answer: every voice that stays (Heart, and any Plus voice made ahead) shows by its design whether it is downloaded, not downloaded or downloading, with a download control where it is not, and a sample whose control shows it is playing, distinct in both states. Drawn in the Fable round with the journal page, for his yes; applied by a fixer.

## Note 6: a reader's profile, opened the first time

**His words** (about 16:06 UTC), with two screenshots of readers' profiles in Community (their names are not written here: they are other people's): "opening a users profile for the first time is laggy and buggy ensure its smooth and if a loading process needs to happen ensure that's smooth too".

**The plan.** Measure the first opening on the export against the main web: what waits (the sheet's motion, the network, the picture, each tab's content arriving) and what moves. The sheet opens at once and stands in its final size; a quiet loading state in the house's way holds each part's place; what arrives fades in without moving anything; Back, Follow and the menu answer while it loads. A test that fails on the old code; the times before and after in the report. **Owner:** a fixer, with note 3 (first openings), measuring first.

## Note 7: the plans, a better design

**His words** (about 16:14 UTC), with a screenshot of The four Gospels' own page: "we need a better plans design".

**Found** (his screenshot and `components/plans/`):
- "0 of 89 days read" over an empty bar is a zero as a first sight, which round 1's rule forbids: a count shows from one; until then an invitation in words, or nothing (`docs/1.9-build/redesign/README.md`, his yes of 2026-11-13).
- The plan's own page has no picture, though its tile on the plans list wears one (the saint its books are attributed to, or the season's picture; `components/plans/PlansClient.tsx`). So the tap from tile to page cannot carry the picture in, as his page-switch rule asks (CLAUDE.md, 2026-11-10).
- The day's card is a block of words with its sources inside it, and the days below are plain numbered circles (`components/plans/PlanPath.tsx`: two days behind, today, four ahead, the rest folded by book). The sources stay in some form: the editorial standards cite every quote.

**The plan.** A design, so it goes to the Fable round for his yes (CLAUDE.md: every design is justified), with the journal page and the Voice sheet, as part of round 3 (the Bible's opening; the plans sit under the Bible tab). One version, stills from the export, `checkMock` with pixels, a reason for each choice. The plan's own page first, which is what he showed, and the plans list only where the two must meet (the picture carried in). What the page does stays: Begin and the plan's bar, Plus shown and never hidden, progress kept on the device, the citations. On his yes a fixer applies it, with a test that fails on the zero. If the round waits, the zero alone goes to a fixer, since it breaks a rule he has already approved.

**Owner:** the Fable round (NOW, Waiting on him 1), then a fixer.

## Note 8: a scroll in a sheet's window, taken by the sheet

**His words** (about 16:16 UTC), with a screenshot of the Plus preview's Ambience page (6 of 14): "when you hold down to scroll on the Bible in this context and your thumb reaches outside the Bible (because you are scrolling down to read it starts closing the whole entire window)".

**Found** (read in the code, not yet reproduced): the sheet follows the finger through `lib/ui/useDraggableSheet.ts`. Its body takes a gesture once the finger has moved past the slop, and asks only about the sheet's own body: a pull down is taken when that body is scrolled to its top (line 537, `dy > 0 && body.scrollTop <= 0`), and any pull up while the sheet rests at half. It never asks whether the finger began in a window that scrolls inside the sheet, as the preview's Bible does (`TryWindow`, `components/billing/plusTry/TryKit.tsx`), so a scroll that belongs to the verses can be taken by the sheet, which then closes under the reader's thumb. Why he sees it start as his thumb leaves the window is for the fixer to reproduce with real touch at phone size.

**The plan.** A gesture that begins in a window that scrolls inside a sheet belongs to that window while the window has room to scroll that way; the choice is made once, when the gesture starts, and never handed to the sheet halfway through. The handle and the header drag the sheet as before. Every sheet with such a window is walked, not only this one (the Plus preview's pages, Compare, Word study, the journal). A test that fails on the old code: a touch walk that scrolls the window and crosses its edge, and the sheet stays open.

**Owner:** a fixer, with note 2 (the jump and flash when typing starts in a sheet): both are the sheet's own behaviour and likely meet in `lib/ui/useDraggableSheet.ts`, so one chat holds both.

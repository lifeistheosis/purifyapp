# 1.9: note lines drafted for what shipped without one

Drafted by the SSM board on 2026-11-14, from the record of each note (`docs/1.9-build/notes/build-95.md`) and the code as it stands on `3d840869`. None of these is in the note. Each waits on the arbiter, and the note's wording on his yes in Admin, Patch notes, as every 1.9 line does. They go into `patch-note-1.9.json` as text, one item to a line, then `node scripts/release.mjs note 1.9`; never into the `patch_notes` table by hand.

The drop names only what the note says (D1.1), so nothing below reaches a store text, a post or the board until its line is in the note.

## Lines for what is new to a reader

| # | Category | The line | From |
|---|---|---|---|
| 1 | library | Choose who reads to you: Heart, Purify's reading voice, or one of your phone's own voices, which read without a connection, free for every reader. Where Heart has no recording, your phone's own voice reads: every chapter of the Bible in its public-domain translations, the Old Testament too, the saints' lives, the Fathers' works, the councils, theology and history, with what is being read lit. Hear it plays a line before you choose. | Note 25, his "Both" and "all recs" (14:29, 18:53); pushed `8c1e2bb6`. The code: `components/reading/ListenHere.tsx` (lives, works, councils, theology, history), `components/player/VoiceSheet.tsx`, `player.voice.*` in `en.json`. Never on the prayers, never over a licensed translation. |
| 2 | perks | Sixteen reading modes, in Purify Plus: Candlelight, Monastery and fourteen looks in four families, Night, Land and sea, Garden and Sanctuary, each one calm page with a sign of its own. On the Holy Mountain, a monastery under the mountain, from an engraving of 1887. | Note 16, his yes to all (20:47); pushed `62e5a337`. Counted in `lib/reader/readingModes.ts`: 14 looks, 16 Plus modes; the families are `THEME_FAMILIES`; the last sentence is the look's own line, `settings.paletteHolyMountainHint`. |
| 3 | library | Discover: hold a section to move it, and set its sections in the order you want, with a light tap you feel at each step. | Note 9, his yes to all; pushed `3c8cb3f1`, `9d129428`, `85548e7a`. |
| 4 | library | Share every work of the Fathers, from its cover or from where you are reading, by a link that opens that place. Every Share in the app now opens your phone's own share sheet. | Notes 15 and 24; pushed `a9188f11`, `621ec42e`, `47cdd2d0`. |
| 5 | library | While a Bible or a book downloads, your phone's notifications show it and say when it is done (on iPhone, when it is done), and so do the bell's Downloads. Purify asks first, in its own words, before your phone asks. A download pauses while you are out of Purify. | Note 23, his "all recs" (18:53); pushed `a49e1924` to `fc87b87b`. No foreground service, so a download pauses when Purify is left. |
| 6 | perks | Ambience: each sound now has its own photograph, the sea's taken at Simonopetra on Mount Athos. | Note 22, his calls (14:29) and yes to all; pushed `b5d9edb3`. |
| 7 | saints | Choosing a patron saint: one chooser wherever you choose one, the saints with their pictures, found and sorted by each saint's own name. | Note 17, his yes to all; pushed `5283a61d`. Until the merge it offers 162 saints, 270 after (NOW), so the line names no number. |
| 8 | fixes | Settings shows the reading modes in one row you scroll, and says what each setting does in clearer words. | Notes 18 and 19, his yes to all; pushed `2ff41d77`, `c77723ea`. |
| 9 | fixes | The Fast has a new look, and marking your first day no longer moves the page. | Notes 3, 4 and 6, his yes to all; pushed `9f3a8ded`, `37ca3d75`. The journal's own refinements need no line: the journal is new in 1.9. |

## A line to change

| Category | Now | Proposed |
|---|---|---|
| perks | Earn two palettes by reading: Councils, for every council's page read to the end, and Cappadocian, for a work by each of the three Cappadocian Fathers. Both are Purify Plus palettes. | Earn two palettes by reading: Councils, for every council's page read to the end, and Cappadocian, for a work by each of the three Cappadocian Fathers. Their cards show how far you have come, a tap opens what is left to read, and each is revealed at the foot of the last page. Both are Purify Plus palettes. |

From note 27, his yes to all; pushed `7b3e631c`.

## No line, and why

- **Note 29, St John Chrysostom's sermons among his print books.** A listing with its line of context, as he said yes to it. A note line would put a harsh text in front of every reader; recommended: none.
- **The fifteen screens.** Round 1 (Today, and the four house rules) is pushed; rounds 3 to 5 wait. One line for the whole redesign once its last round lands, so the note does not describe a screen that is about to change.
- **The welcome email's line for the first-week guide.** Shown only once the guide is switched on, which it is not: dark, so no line (AGENTS.md, release ritual 4).
- **The emails on Dark.** The account and order emails wait on his look (NOW, waiting on him 3). A line, if any, after it.

## What follows in the drop once a line is in

- Line 1: take "phone voice" and "phone's voice" off the drop's never list; a point or an "also" may then name the voices.
- Line 2: a piece may count, and must say sixteen; the never list already refuses nineteen, seventeen, fifteen looks and seventeen looks.
- Room as the drop counts it (2026-11-14): the App Store text 2,726 of 4,000, Community 2,299 of 4,000, the App Store promo 149 of 170, the Discord announcement 1,981 of 2,000. The announcement has no room for another point without giving words back.

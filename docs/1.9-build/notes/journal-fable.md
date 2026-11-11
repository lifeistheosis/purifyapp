# The journal, its way in, and the Florilegium (build 93 notes 8, 9 and 19)

His words, 2026-11-11, walking build 93.

Note 8, of the journal's writing sheet: "Refine the journal section because
when I click title or anything, so just a quick explanation of how it works.
Honestly, just buggy." And a minute later, of Verse, Quote, Highlight and
More: "Honestly, that same bug happens in each of these sections. I want all
of it refined, and I want all of them to actually be unique in their context
and their use."

Note 9: "Ensure the journal and anything related to that specific journal UI,
like the florigelium, ensure it's all available to be chosen on the settings
page."

Note 19: "And also, I want the Florigelium and the notebook system like
intertwined."

All three are in 1.9 (CLAUDE.md, "A release ships finished").

## The arbiter's go (03:56 UTC, 2026-11-11)

"The journal plan: go, in your order." With six points:

1. Note 9: two rows on You, always there, and the same two rows in Settings
   itself, since he named the settings page. A setting that chooses what You
   shows is not what he asked.
2. The verse finder's field: the quiet field, yes, but through the global
   `.search-field` (app/globals.css), which Fable Themes owns. Not touched
   here.
3. Push 3's still goes to the arbiter, who decides it unless it changes
   something he chose.
4. New lines go to the arbiter in English first.
5. Tell Fable onboarding before touching You (push 2), and Fable Theology
   before the Florilegium's two files (push 3).
6. Writing in the journal is free (`plus.journal.keep`), so its door opens
   the journal, and the Plus parts keep their own locks inside it.

## How note 8 is read

"When I click title or anything, so just a quick explanation of how it works"
can be three things, and the mends cover all three:

- **The tour taking the tap.** Updates 2's `cabb98e72` ("a tap meant for the
  page is the page's, under the tour") was already on the branch.
- **The Plus sheet.** He walked build 93 without Plus. For that reader the
  row right under Title ("Add to a notebook") and every choice under More
  open the Plus sheet named for the journal, which is an explanation of how
  Plus's journal works. Title and that row touched.
- **The page moving under the finger**, below.

## What a finger found

The journal had source-reading tests and no walk. What he met cannot be read
from source, and a walk with a mouse does not meet it either. Each line below
was measured on the native export with a finger's taps
(`page.touchscreen.tap`, and pulls made of real touch events), or read from
the code where it says so.

1. For the first 0.4 seconds after Write, a tap on Title did not reach Title.
   At 60ms the sheet was still 233px from its rest and the tap met the row
   under Title: the notebook panel opened (the Plus sheet, without Plus) and
   the page moved 161px. At 140ms and 240ms Title took the cursor and the
   sheet's own 320ms timer gave it to the words.
2. Quote laid a new empty card at every tap. His second screenshot shows two.
3. Once any card was on the page, the place to write said nothing: an empty
   field 253px tall with no word in it.
4. The same verse could be laid twice.
5. A pull down that began on a field dragged the whole sheet: 42px on a 60px
   pull.
6. A tap on a kind (Reflection, Prayer, Question) took the cursor from the
   field. And the kinds were three outlined pills.
7. Highlight went dim with no word of why.
8. The verse finder's field lit with the search field's white edge and glow
   (a 58% white edge, a 3px ring, a 24px glow). Fable Themes' to change, and
   mended by them the same day (`f7afab6f8`, "A tapped search field is
   quiet"): the after picture below shows it.
9. A verse card shows "Open to read" and no words when the phone has no
   signal and never kept that verse. Push 2.
10. Quote in journal, from the library, wrote the page back as a title and
    blocks alone: its notebook, tags, style and cover were lost (code).
11. On You the journal's cover still wore the Plus lock and opened the Plus
    sheet, though writing in the journal is free from 1.9 (code). The
    Florilegium has no way in from You at all. The second half is push 2.
12. The journal and the Florilegium touch nowhere in code. Push 3.
13. With the cursor on an empty line, Highlight took a colour no one could
    see: a tap that showed nothing.
14. A colour chosen left the cursor nowhere. What was typed next went
    nowhere, and on a phone the keyboard fell.
15. Without Plus, the four choices under More read "H...", "C...", "D..."
    and "C...": the Plus mark took the room in tiles two across, so Checklist
    and Callout could not be told apart. Found only on an export that sells
    Plus, walked as a new reader, which is how he walked build 93.
16. With the Plus sheet over the writing sheet, one press of Escape closed
    both. (The phone's Back has closed one thing since build 90 note 1; this
    is the key, on a computer or a tablet with keys.)

Today's journal page and the writing sheet passed every `checkMock` rule on
the five palettes as they were. The faults were in behaviour and in form,
which the measured rules do not see.

## The plan: three pushes

**Push 1. The writing sheet does what a finger means.** Facts 1 to 7, 10, the
lock of 11, and 13 to 16. This file's next section.

**Push 2. Each block its own, and the ways in** (notes 8 and 9; facts 8, 9,
11). A verse reads as Scripture: its place as its heading, its words in the
reading serif, a tap opens the passage. A Father's words from the library
read as a quotation with its source and the way back. A quote of one's own
reads as the writer's. More's four each look like what they are. On You, two
rows always there, written in or not: Your journal and Florilegium; the same
two in Settings; the shelf's journal cover goes, so there is one door and not
two; both are found from search under Settings.

**Push 3. The Florilegium and the notebooks as one** (note 19; fact 12). A
page can be put in a gathering: the notebook choice offers his gatherings by
name first. A gathering's page shows its pages under its lines, and "Write in
this gathering" starts one there. A gathered line gains "Write a page". A
notebook that is a gathering says how many lines it holds, and opens it.
Renaming a gathering renames it on its pages; deleting one leaves the pages
as they are. No SQL. After Fable Theology's own note 19 work.

## Push 1: what was built

- **A finger comes first** (`components/journal/JournalComposer.tsx`). The
  sheet's timer, which puts the cursor in the words 320ms after it opens,
  does nothing once a finger has been put down. Whatever the reader tapped
  keeps the cursor.
- **No door to Plus under Title** (`components/journal/PageBlocks.tsx`). The
  line under the title stands only once the page has a notebook or tags, and
  names them. With none, nothing stands between Title and the words. The door
  to the page's notebook, tags and look is under More, with Plus's other
  choices.
- **The page is not a handle** (`JournalComposer.tsx`, `data-sheet-nodrag`).
  A finger put down on a field, a card or the room to write never drags the
  sheet. Its head still does.
- **One empty quote at a time** (`lib/journal/page.ts`, `emptyQuoteAt`).
  Quote goes to the empty card that is waiting, and lays a new one only when
  none waits.
- **A verse is laid once** (`verseAt`; `usePage.ts`, `show`). Asked for
  again, its card is brought into view and lit for a moment.
- **The place to write always says so.** The last words carry the
  placeholder whenever they are empty, whatever else is on the page.
- **The kinds are the house's switch** (`components/ui/SegmentedSwitch.tsx`'s
  own classes): one rounded row, the chosen part filled. A tap on one holds
  the cursor where it is, as a tool does.
- **Highlight says why** (`lib/journal/page.ts`, `highlightTarget`). It is
  never dim. With nothing written it says "Highlight marks your own words.
  Write a few first." where its colours would open (the arbiter's yes, 03:58
  UTC; English and the twenty languages, key `journal.page.highlightNone`).
  Once there are words the colours take the line's place. It marks the
  paragraph the cursor is in when that has words, else the last one written.
  A colour chosen, the cursor stays in the words.
- **More's choices can be read.** Rows the width of the sheet, in the faint
  tray the rows on You lie in (`components/you/YouRows.tsx`): each with its
  glyph, its whole name on as many lines as it needs, and without Plus the
  mark at its end. Plus's four blocks in one tray, the page's own notebook in
  a tray of its own under them. Measured with the export's fonts in the 21
  languages: tiles two across with the padlock alone still cut a word in five
  languages on a 360px phone and in sixteen on 320px, so rows it is.
- **A quote laid from the library keeps the page's own**
  (`lib/journal/quoteInJournal.ts`): notebook, tags, style and cover.
- **The journal's door on You is open** (`components/you/KeptShelf.tsx`): no
  lock on its cover and no Plus sheet in its way, for every reader.
- **One press of Escape closes one sheet** (`lib/ui/escape.ts`; the house's
  `Sheet` and `ConfirmDialog` answer through it). The same rule the phone's
  Back has had since build 90 note 1, for the key. This one is the house's
  shared sheet, not the journal's alone: every sheet over a sheet gains it.

Each has a test that fails on the old code:
`lib/journal/__tests__/writingSheet.test.ts` and
`lib/ui/__tests__/escapeOnce.test.ts`.

## The walk: `scripts/mock-journal.mjs`

The journal's own walk of the export, with a finger: stills held to
`checkMock`, and flows that fail on a tap that changes nothing, a page that
moves under the finger, anything that opens off the screen, or a cursor taken
from where the reader put it.

**Two readers, two exports.** Plus is asked for only where the build can sell
it (`lib/entitlements/entitlements.ts`). The export every other harness uses
is cut with no store key, so it locks nothing: on it a reader has Plus's
parts. A new reader, as he walks a test build, has no Plus and meets its
locks. That needs an export cut with stand-in keys (words, not keys; nothing
is bought and no store is reached), and the script's head says how. Facts 15
and 16 were found only there. Most flows are walked as both readers; the few
that need one are named and left on the other.

## Checked (commands, 2026-11-11 UTC)

On `6a96a000a`, this push's code rebased onto the branch as it stood at 04:56
(`339b91317`):

- `npm run build:android` 0 (05:04), `npm run build:ios` 0 (05:14),
  `npm run build` 0 (05:17), in a second checkout.
- The walk, on the Android export: **22 of 22 as a reader with Plus's parts**
  (the export with no store key), and **22 of 22 as a new reader with no
  Plus** (a scratch export of the same commit that sells Plus). 25 flows in
  all; 19 are walked as both readers, 3 need Plus's parts and 3 need a reader
  without Plus.
- 11 stills, each passing every `checkMock` rule on the five palettes (the
  branch's checker as of `204126c7e`), and each looked at by eye. Two of them
  (More, and a page with a notebook) are drawn as a new reader with no Plus.

On `4c2e12253`, the same code with one older test brought up to the
composer's new root tag:

- `npm run typecheck` 0. `npm run lint` 0 errors.
- `npm run test:unit` 12,896 of 12,896 (9 skipped).

The whole suite found what the journal's own folder had not: an older test
in `lib/bible/__tests__/verseFocus.test.ts` pinned the writing sheet's root
tag. Mended in the push.

Each mend has a case that fails on the code before it. Measured for the first
sixteen cases of `writingSheet.test.ts`: fourteen fail on the old source and
two are guards, true on both. The later cases read functions and a file that
did not exist before (`highlightTarget`, `lib/ui/escape.ts`).

One thing `checkMock` does not see: a name cut short. The four tiles that
read "H...", "C...", "D..." and "C..." passed every measured rule. The walk
holds it for More; a rule for it in the checker is the arbiter's to weigh,
since a reader's own long words are rightly cut in a list.

## Pictures (`docs/1.9-build/notes/build-93/`, 780 by 1688)

Before, from the export of `3c5e8809a`; after, from the export of
`6a96a000a`.

| Before | After | What it shows |
| --- | --- | --- |
| `08d-before-early-tap.png` | `08d-after-early-tap.png` | Title tapped 60ms after Write. Before: the notebook panel open and Title gone off the screen. After: the sheet as it rests, to the byte. |
| `08e-before-two-quotes.png` | `08e-after-one-quote.png` | Quote tapped twice. |
| `08f-before-verse-finder.png` | `08f-after-verse-finder.png` | Quote twice, then Verse: one card, the kinds as the switch, nothing under Title, Highlight lit, and the finder's field quiet (Fable Themes' mend). |
| `08g-before-same-verse-twice.png` | `08g-after-verse-once.png` | The same verse asked for twice: one card, lit for a moment. |
| `08h-before-more-without-plus.png` | `08h-after-more-without-plus.png` | More as a new reader with no Plus. The before is from this push's first commit on an export that sells Plus: the tiles are build 93's, and the notebook's row had already moved in under them. |
| | `08i-after-place-to-write.png` | A verse, a quote, and the place to write still saying so. |
| | `08j-after-highlight-none.png` | Highlight with nothing written. |
| | `08k-after-highlight.png` | Highlight with words written, and its colours. |

`08c-before-today.png` is today's page, which push 1 does not change; its
pair comes with push 2.

## What a phone still has to say

The harness has no keyboard on the screen. On his phone:

- The tools' row, More's rows and the colours stand above the keyboard, and
  the keyboard stays up through a tap on a tool, a kind or a colour. (The
  walk holds that the cursor stays in the field, which is what keeps a
  keyboard up.)
- With the keyboard up on a small phone, More's rows scroll inside
  themselves and the tools stay on the screen.
- Title tapped by a real finger while the sheet is still rising.

## What is not in push 1, and where it goes

- The verse finder's field (fact 8): Fable Themes', through the global
  `.search-field`, and done (`f7afab6f8`).
- "Open to read" on a verse card with no signal (fact 9): push 2.
- Each block a form of its own: push 2.
- The two rows on You and in Settings (note 9): push 2.
- The Florilegium and the notebooks as one (note 19): push 3.

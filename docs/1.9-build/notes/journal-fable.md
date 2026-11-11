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
rows always there, written in or not: Your journal and Your Florilegium; the
same two in Settings; both are found from search under Settings. (The plan
first took the shelf's journal cover off for one door. The arbiter's word,
06:11 UTC: "Leave the shelf as he picked it, and add the two rows. He asked
for the journal and the Florilegium to be there to choose, not for anything he
chose to go.")

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

**Two readers, one export.** Plus is asked for only where the build can sell
it (`lib/entitlements/entitlements.ts`). The export every other harness uses
is cut with no store key, so it locks nothing: on it a reader has Plus's
parts. A new reader, as he walks a test build, has no Plus and meets its
locks. That needs the export `scripts/plus-order-walk.mjs` and
`scripts/learn-walk.mjs` already ask for, built as the store's is
(`NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1` and a stand-in key, a word and not a
key; nothing is bought and no store is reached). With `SELLS_PLUS=1` the walk
says it is the Android shell, as those two do, and the reader has no Plus;
without it the same export locks nothing. So one export serves both readers
and all three walks. Facts 15 and 16 were found only as a new reader. Most
flows are walked as both; the few that need one are named and left on the
other.

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

As pushed, 05:30 UTC: `358dd91ad..24beb99dc`, the same code rebased over
commits that touched none of its files. On that tip: `npm run typecheck` 0 and
`npm run test:unit` 12,930 of 12,930 (05:29). And on one export of `24beb99dc`
cut the house's way for Plus's locks (05:41):

- the journal's walk, 22 of 22 as a reader for whom nothing is locked and 22
  of 22 as a new reader with no Plus;
- `scripts/learn-walk.mjs`, which presses Escape four times over its sheets,
  all 55.

On the export of `6a96a000a`: the release's own walk of the journal
(`scripts/export-walk.mjs --sections 40`) 127 of 127, and
`scripts/legal-sheet-walk.mjs` clean, 38 checks. Both use what this push
changed: the writing sheet, More, and Escape over a sheet.

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

Push 2's, the before from the export of `24beb99dc` and the after from the
export of `def6a1b53`:

| Before | After | What it shows |
| --- | --- | --- |
| `08m-before-blocks.png` | `08m-after-blocks.png` | A page with a verse, a quote of one's own and a Father's words from the library (the paragraph and its name read off the work's own page in the app). Before: three boxes alike. After: each with its mark, set in from the writer's own words. |
| | `08n-after-blocks-more.png` | The same page further down: marked words and Plus's four, as they were. |
| `09c-before-you-rows.png` | `09c-after-you-rows.png` | You as it opens for a new reader with no Plus. After: Your journal and Your Florilegium lead the rows, the Florilegium's with the padlock. |
| | `09d-after-settings.png` | Settings for the same reader: the two rows under the account, the Florilegium's with the mark. |

`08c-before-today.png` is today's page, which neither push changes.

Push 3's, the before from the export of `def6a1b53` and the after from the
export of `417e38e74`. The reader is the same in each: the app's own starter
kept through the app, and two plain pages written in a notebook of its name.

| Before | After | What it shows |
| --- | --- | --- |
| `19d-before-gathering.png` | `19d-after-gathering-pages.png` | A gathering's page at the foot of its lines. After: each line can begin a page, and under the lines the journal's pages written in the gathering, with the way to write one. |
| `19e-before-journal-notebook.png` | `19e-after-journal-gathering.png` | The journal with that notebook chosen. Before: its name on three lines in its chip, and nothing to say it is a gathering's. After: one line, the flower, and the line that leads to the gathering's 18 lines. |
| | `19f-after-notebook-choice.png` | A page's notebook choice: the gathering first, with the flower, then the other notebook. |
| | `19g-after-gathering-320.png` | A gathering on a 320px phone (640 by 1400): a line's three things to do under its source, every name whole. |
| | `19h-after-gathering-lapsed.png` | The same gathering for a reader whose Plus has lapsed: the pages they wrote, to open, and no way to write; the Plus card under them. |

`19c-plan-gathering-with-pages.png` is the plan's still the arbiter passed
before the rest was built.

## Push 2: what was built

The arbiter's yes, 06:09 UTC, to the one new line, the two rows, the mark on
the Florilegium's row without Plus, and the blocks each with its own mark and
no box.

**Each block a form of its own** (`components/journal/PageBlocks.tsx`). A
verse, a quote of one's own and a quote from the library were three boxes
alike. Now none is in a box and none stands beside a rule. Each wears the
mark of what it is, the glyph of the tool that lays it, and has its own
shape:

- **Scripture**: the Book and its place as a heading that opens the passage
  at the verse, then the words in the size the app reads at. With no signal
  and nothing kept, "Open to read" under the heading (fact 9: the heading is
  always there, and the words come once the phone has had them). Asked for a
  second time it is lit for a moment, with no edge to light.
- **A Father's words from the library**: the words, then the Quill and the
  source as the one way back, and under it that it is quoted from the
  library. The form a gathered line has in the Florilegium, so the two are
  one family before push 3 makes them one.
- **A quote of one's own**: the words in italic, then the speech mark and who
  said it, typed by the writer. No link, and never the Quill.
- **The marks hang.** Everything brought onto the page begins under its name,
  past its mark, so the writer's own words alone stand at the margin: what is
  set in is not mine. An indent, never a rule. (Looked at on the export
  first: a Father's words in upright serif read as the writer's own until the
  source under them.)
- A block's remove sits level with the block's first line.
- Highlight and Plus's four keep the forms they have.

**The ways in** (note 9).

- **On You** (`components/mobile/YouMobile.tsx`, `components/you/YouRows.tsx`):
  Your journal and Your Florilegium lead the reader's own rows, above Your
  rule, written in or not. The shelf stays as he picked it.
- **In Settings** (`components/settings/SettingsClient.tsx`, `JournalSection`):
  the same two rows under the account, with no heading over them.
- **In the app-wide search** (`lib/search/buildCorpus.ts`): both are found
  under Settings, as well as by their own names.
- **Without Plus the Florilegium's row is marked**, since gathering is
  Plus's: on You the padlock alone, as the verse card there wears it, because
  the subscription is named once on that screen (his refinement 3 of r3-25);
  in Settings the mark beside the name, as Candlelight at Vespers wears it.
  The page it opens already shows that reader what is theirs.
- One new line, `you.journalHint`: "What you write, and your notes on
  verses", in English and the twenty languages. The Florilegium's row uses
  words the catalog had: "Your Florilegium", "The lines you keep".

**The tools' names are read whole.** `checkMock` gained a rule for a name cut
short after push 1's finding (Admin, `93a87a885`), and its first catch was
this sheet's own toolbar: at the tile's leading of 1 a tool's name stood in a
box a pixel shorter than its letters. Each name has a line of its own height
now.

Tests, each failing on the code before it:
`lib/journal/__tests__/blockForms.test.ts`,
`lib/journal/__tests__/waysIn.test.ts`, and the changed cases of
`lib/nav/__tests__/oneSettings.test.ts`. The release's export walk holds the
rows in a built app (sections 28 and 46).

### Checked, push 2 (2026-11-11 UTC)

On `def6a1b53`, push 2's code rebased onto the branch as it stood at 06:36:

- `npm run typecheck` 0. `npm run lint` 0 errors. `npm run test:unit` 13,066
  of 13,066 (9 skipped).
- `npm run build:android` 0 twice (the house's export for Plus's locks 06:42,
  the plain one 06:48), `npm run build:ios` 0 (06:54), `npm run build` 0
  (06:57).
- The journal's walk on the one export, in one pass: **26 of 26 as a reader
  for whom nothing is locked, 26 of 26 as a new reader with no Plus.** 29
  flows in all; 23 are walked as both readers.
- The release's own walk on the plain export,
  `scripts/export-walk.mjs --sections 14,28,40,46` (search, Settings, the
  journal, You): 202 checks, every one passed.
- 15 stills as a reader for whom nothing is locked and 4 as a new reader, each
  passing every `checkMock` rule on the five palettes, the cut rule among
  them, and each looked at by eye.

Two of the walk's own checks were wrong on its first run and were mended
before the pass above: one read a clear colour only in one of the two ways a
browser writes it, the other read a name and the mark beside it as one word.

## Push 3: the Florilegium and the notebooks as one (note 19)

His words: "And also, I want the Florigelium and the notebook system like
intertwined." Before this push they met nowhere: a notebook was only a name
written on pages, a gathering was its own list of lines.

They are joined by that name. **A gathering's notebook is the journal's
notebook that bears its name.** Nothing new is kept anywhere for it: no
column, no table, no SQL, nothing new on the server. A page still keeps its
notebook's name in its own text, a gathering is still its list, and both
travel as they did. The rules are `lib/journal/gatherings.ts` (pure) and
`lib/journal/gatheringActions.ts` (the device's side).

The arbiter passed the shape (07:25), then the still
(`build-93/19c-plan-gathering-with-pages.png`, 12:09: "approved as drawn"),
then the three new lines, which are in every language the app has:
`study.florilegium.pages` "Your pages", `study.florilegium.writeHere` "Write
in this gathering", `study.florilegium.writePage` "Write a page".

What a reader meets:

- **A gathering's page shows the journal's pages written in it**, under its
  lines and over Share and Delete (`components/florilegium/GatheringPages.tsx`):
  a part named "Your pages", drawn as the Florilegium's first page draws the
  reader's gatherings (the part's name in Lora, one raised tray, a row for
  each). A row is the page's title, or its first words, a line of its words
  and its day, newest first, and opens that page in the journal. The tray's
  last row is "Write in this gathering". The pages are not in the booklet or
  the shared words: those stay the gathering's lines.
- **A gathered line begins a page**: "Write a page", between Add note and
  Remove, begins a journal page in this gathering with that line as its
  card. A verse is a verse card (where it is, its words from the app's own
  Bible); a Father's line gathered from a place in the app is a quote from
  the library with that place as its way back; one with no place to return
  to is a quote with its source named, and never wears the library's mark.
  A line is laid once: asked for again, the page being written there goes on
  as it was, and a second line joins it.
- **A page's notebook choice offers the reader's gatherings first**, by name,
  each with the Florilegium's flower, then the other notebooks
  (`PageBlocks.tsx`, `PropsPanel`). A notebook that bears a gathering's name
  is offered once, as the gathering.
- **The journal knows a gathering's notebook**: its chip wears the flower
  (and on a computer its row at the side), and while its pages are shown one
  quiet line over them says how many lines the gathering keeps and opens it.
  Existing words only (`study.florilegium.lineCount`).
- **A gathering renamed takes its pages with it**
  (`lib/florilegium/florilegium.ts`, `renameFlorilegium`). No screen renames
  a gathering today; the rule is written and tested for the day one does,
  and the store's own `rename` is that rule. The pages stay where they are
  only while another gathering still bears the old name.
- **A gathering taken away leaves its pages**: they stay in the journal, in a
  notebook of that name, which wears the plain notebook's mark again.

Both sides stay Plus's, as they were. What each reader sees:

- With Plus: all of the above.
- Plus lapsed (the gathering is read-only, with the Plus card under it): the
  pages they wrote are listed to open, and nothing new is begun here: no
  "Write in this gathering", no "Write a page". With nothing written, no
  part stands there at all.
- Never had Plus: the Florilegium is the Plus card, as before. No "Your
  pages", no way to write, no new words. The journal's own door to notebooks
  is the one it had (More's row with the Plus mark).

The line's row had two things to do and has three. On a narrow phone or in a
long language there is no room for the source and the three on one line, so
they go under the source and wrap among themselves before any name is cut
(`data-gathered-tools`). Measured on the export in all 21 languages at 390,
360 and 320px: every name whole, 44px, on the screen (0 failures of 63; the
three wrap among themselves in 3 languages at 390, 10 at 360 and 15 at 320).

Found drawing the gathering's chip, and mended: in the journal's list, with
enough chips for the row to scroll, a notebook's name stood on as many lines
as it had words ("The / Prologue / of John" in one pill). The notebooks'
chips are not the row's own children, so the row's rule that no chip is
squeezed never reached them. Each keeps its name on one line now, and a name
longer than a chip should be is cut, by name.

Fable Theology's files (the Florilegium's pages) were changed only as they
agreed: the verse's own link, the page's marks and the order of a line's
buttons are as they were ("Write a page" stands after the note's button,
which their own drawing finds as the line's first), and nothing stands above
the lines.

### What waits is never lost (facts 17, 18 and 19)

Found while the journal was open on the bench, and mended in this push by the
arbiter's word (11:58: "fact 17 is a real loss, well caught").

**Fact 17.** The journal keeps one page being written. Closed, it waits, and
Write says "Continue writing". Whatever the journal opened next took its
place: a reader who wrote half a thought, closed the sheet and tapped an
older entry lost the half thought without a word. Proven on the export
before a line was changed (the draft read `Half a thought I mean to finish.`,
then the older entry's body, then nothing). The same from a reading's pen, a
plan's question, a quote laid while a verse's note waited, and a page begun
from a gathering.

The rule, as approved: **before the journal opens anything else, what waits
is kept exactly as Done keeps it, and opening the same page goes on with
it.** Two edges: an empty page makes nothing (and never takes an entry away;
only Done on an emptied page does that), and a kept page opened and left
unchanged makes no second copy and takes no new date. What is kept this way
is kept by the same functions Done uses, so it syncs as Done's would, and
nothing more.

Done's own rules moved into one place so that "as Done keeps it" is one
function and not two that drift: `lib/journal/waiting.ts` (pure: `keeping`,
`openOver`, `samePage`, `waits`) and `lib/journal/keepDraft.ts` (the
device's side). Every way the journal opens a page goes through it
(`JournalClient`'s `begin`), and so do Quote in journal and a gathering's
two ways to write.

**Fact 18.** An older entry opened only to be read, then closed, waited too:
Write said "Continue writing" and opened that entry again, and a new page
could not be begun until Done was pressed on the old one. Now what waits is
what is not kept yet: a new page with something on it, or a kept one with
changes. An entry read and left as it was does not wait, and neither does a
page with nothing on it (one that only names its notebook, begun from a
gathering and closed).

**Fact 19.** An entry with changes waiting, then swiped away: Continue
writing opened the removed entry, and Done put the words on it, where no one
saw them again. Now the changes are kept on the entry before it goes, the
draft is let go, Write is Write, and Undo brings back the entry with what
was written. The same loss from another side, read in the code and not met
on a walk (it takes two devices): an entry taken away on one device while
changes to it wait on another. There the words are now kept as a page of
their own; an entry that was only opened is not brought back.

One more thing follows from Done's rules being one function: Done no longer
stamps a new date on an entry it did not change.

Tests, each failing on the code before it:
`lib/journal/__tests__/waiting.test.ts` (the rules, the device with a
stand-in store, and the journal's own screen held to them),
`lib/journal/__tests__/gatherings.test.ts`,
`lib/florilegium/__tests__/gatheringPages.test.ts`.

### Checked, push 3 (2026-11-11 UTC)

On `417e38e74`: push 3's code on the branch as it stood at 13:27
(`5d52919b5`).

- `npm run typecheck` 0. `npm run lint` 0 errors. `npm run test:unit` 13,479
  of 13,479 (9 skipped).
- `npm run build:android` 0 (13:34, the house's export for Plus's locks).
  The other three were built on `749970bd5`, which is the same work before
  its last two small changes (a notebook chip's one line, and the words of
  an entry removed on another device) and before 32 commits from other
  chats: `npm run build:android` 0 (13:08, the plain export),
  `npm run build:ios` 0 (13:14), `npm run build` 0 (13:18).
- The journal's walk on the one export, in one pass: **37 of 37 as a reader
  for whom nothing is locked, 33 of 33 as a new reader with no Plus.** 43
  flows in all; 27 are walked as both readers.
- The arbiter's three checks, each in the walk: at 320px a line's row keeps
  every name whole and 44px and passes every `checkMock` rule; a reader who
  never had Plus sees the Florilegium as before, with no pages part, no way
  to write and no new words; and the three new lines are in all 21
  languages (read from the 21 files: each holds the three, and none is left
  in English).
- The line's row and the pages' part, with each language's own words put in
  on the export, at 390, 360 and 320px: 0 failures in 63 (every name whole,
  44px, on the screen).
- 5 stills, each passing every `checkMock` rule on the five palettes, the cut
  rule among them, and each looked at by eye.
- The Florilegium's own checks, on the same export, as Fable Theology asked:
  `scripts/florilegium-walk.mjs` 3 of 3; `scripts/mock-florilegium.mjs` 11
  screens, each passing every `checkMock` rule; `scripts/route-motion.mjs`
  46 of 46 ("Every walk moved as it should"), a gathering's five page
  switches among them.
- The release's own walk, `scripts/export-walk.mjs --sections 14,28,40,46`
  (search, Settings, the journal, You): 202 checks, every one passed.

One of the walk's own checks was wrong on its first run and was mended
before the pass above: it waited for a Write button that a phone never
shows (the copy a computer draws in the title's row).

Pushed as `035ea71bb..62df344ae` (14:14). On the pushed tip: typecheck 0,
`npm run test:unit` 13,587 of 13,587 (9 skipped). The 21 commits of other
chats that came in after the final export touch none of the journal's or the
Florilegium's code, and the committed code is byte for byte what that export
was cut from.

## What a phone still has to say

The harness has no keyboard on the screen. On his phone:

- The tools' row, More's rows and the colours stand above the keyboard, and
  the keyboard stays up through a tap on a tool, a kind or a colour. (The
  walk holds that the cursor stays in the field, which is what keeps a
  keyboard up.)
- With the keyboard up on a small phone, More's rows scroll inside
  themselves and the tools stay on the screen.
- Title tapped by a real finger while the sheet is still rising.

## What is left, and where it goes

- The verse finder's field (fact 8): Fable Themes', through the global
  `.search-field`, and done (`f7afab6f8`).
- A verse card's words with no signal (fact 9): the card has its heading and
  the way to read. Its words still come from the website the first time and
  are kept from then on; reading them out of the Bible the apps carry would
  put a Bible's text in the app a second time (AGENTS.md, "A page carries
  what it shows"), so it is not done here.
- The Florilegium and the notebooks as one (note 19): done in push 3, above.
- Renaming a gathering: no screen does it yet. When one does, its pages go
  with it by the rule already in the store.
- Seen while drawing You, not this chat's: scrolled a little, the tab's own
  name in the bar and the reader's name on the picture pass over each other.
  Named to the arbiter.

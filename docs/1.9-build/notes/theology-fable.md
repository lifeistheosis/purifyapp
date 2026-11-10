# Theology's four pages, revamped (build 89, note 2)

The pages behind Theology's four buttons: Doctrine, Topics, Heresies and
Apologetics. His words, 2026-11-10: "it still looks like the old version, and
it still looks AI like vibe coded slop ... revamp it using our style, what
style we've been using ... the buttons look nice. I'm talking about the pages
within those buttons." The four buttons (`components/theology/
TheologyLibrary.tsx`) are not touched.

## The design plan

### What the house style is

Read off the screens he has approved: the four buttons and Theology's hub, a
step of the path, a doctrine's own page, Prayers' Practices, the reading
room's rows, the plans, the councils, and the Bible's page.

1. **One quiet bar, and the page names itself.** Back with a floor, the
   page's name arriving in the bar once its own heading has gone up under it,
   and the app's one search in the bar, turned to Theology. The heading is a
   name in Lora at title size with one small line under it, never a small
   label over a giant sentence over a long paragraph.
2. **Ground, ink and light.** The ground, the ink at measured shares, and
   raised surfaces mixed from the two: trays, tiles, small plates for glyphs.
   What is in hand is lit white, softly. No gold, no rays, no side stripes,
   no blur over moving words, every colour a token.
3. **Pictures lead.** The Church's icons whole in their own light, never
   cropped on Theology; a Father's face in a round frame beside what quotes
   him; a glyph from the icon set on a plate where there is no picture.
4. **A list has a form.** Places to go are rows in one raised tray or cards
   with their picture, never lines of text under hairlines and never a row
   of floating pills.
5. **Type.** Lora for names, DM Sans for the one quiet line and the facts
   (a length, a count, a century), numbers in tabular figures.
6. **Motion.** A press dips, a screen arrives in reading order on the house
   curve, and all of it stops with Purify's motion off.
7. **Words.** The catalog's own keys first, each registry's own words as
   they are, and nothing said that is not true of every reader.

### What each page becomes

All four share one frame (`components/theology/WayPage.tsx`):

- **The bar**: the way's name, back to Theology, the search turned to
  Theology. The nameless back bar, the "Theology" label, the row of four
  pills and the floating search pill go.
- **The head is the button, grown**: the same lit glyph, the same name in
  Lora, the same kind and count ("Treatise · 14"), then the page's one line,
  set small (today's giant sentence, the same words). A tap on a button
  lands on what was tapped, which is what note 4's transition will carry.
- **The foot**: the other three ways as the hub's own rows in one tray, and
  the page's long paragraph (today's lede, the same words, with "Every
  citation is verbatim, public-domain, and sourced") as its closing note in
  small type, as the councils page closes.

Then each page's own form:

- **Doctrine, the treatises**: shelves by subject in the order of the Creed,
  as the hub's path has them. Each shelf is headed by its subject's icon
  whole on a small plate, with the subject's name and line, and opens that
  step of the path; under it one tray of its studies, each wearing the face
  of the Father it quotes most, with its length, or the part the reader is
  in ("Part 2 of 4"), or a check once it is read.
- **Topics, the questions**: five cards in the order of the Creed. Each is
  its subject's icon whole on a plate, the question's name, its short answer
  (the first sentence of its definition, as the path gives it) and how many
  of the Fathers it cites.
- **Heresies, the record**: the centuries in order, each a tray of its
  errors: the scroll on its plate, the error's name and the one line that
  says what it claimed and which council named it.
- **Apologetics, the answers**: the objections by kind, each answer a card
  with the shield on its plate, its name, its line, its summary whole and
  its length.

## What was built (2026-11-10, pushed on his OK the same day)

On `ccr-07896cf2-bo0afd`, one version. From 2026-11-10 until his OK the
commit waited on the branch as a patch
(`docs/1.9-build/notes/build-89/02-theology-pages.patch`, as note 11's
redesign did), so that the work was safe and nothing of it was in the app
before he had seen the stills.

- `components/theology/WayPage.tsx`: the frame the four share (the head, the
  note, the other three ways). `components/theology/wayStyle.ts`: its few
  shared names. `components/theology/StudyShelves.tsx`: Doctrine's shelves,
  drawn on the device because they show the reader's place in each study.
- The four pages, each mounting its own bar: `app/(app)/theology/doctrine/
  page.tsx`, `app/(app)/topics/page.tsx`, `app/(app)/heresies/page.tsx`,
  `app/(app)/apologetics/page.tsx`.
- `lib/theology/wayCounts.ts`: the four counts, counted as the hub counts
  them for its buttons, so a head's number is its button's number.
- `lib/nav/backBar.ts`: the four addresses wear their own bar, so the apps
  show one bar and not two.
- Tests: `lib/theology/__tests__/ways.test.ts` (new, 20 tests), and three
  kept true: `revamp.test.ts` (the doctrine index has its own bar now),
  `round3.test.ts` (the floating search pill is held on the pages the four
  list, no longer on the four), `lib/i18n/__tests__/serverWords.test.ts`
  (a key drawn with a count is the base of its plural forms).
- A Father's face in its round frame (`components/theology/FatherFace.tsx`,
  which Doctrine's rows wear): with the website's portraits, St Basil's face
  stood half out of the frame, and St John of Damascus's and St John
  Chrysostom's at its edge, because the frame was cut about the portrait's
  middle and each stands to one side. The frame is now cut about the face,
  from the place the app already records for each portrait
  (`lib/today/saintFaces.ts`, COVER_FACES and the new `faceShift`;
  `components/today/SaintFace.tsx` takes it as `across`, and without it
  draws as before). This also mends the same faces on the hub (Recently
  added, Fathers in these studies), on a step and on a doctrine's page.
  Today's saint is not changed. Held by `lib/today/__tests__/
  saintFaces.test.ts` for every recorded portrait.
- No new words: every line is a key the catalogs already hold in all 21
  languages, or a registry's own words. `TheologyLibrary.tsx` (the four
  buttons) and the hub's page are not touched.

## His answer (2026-11-10, about 04:13 UTC)

"ok to all", to his questions page, where the four pages were 102: yes to
the pages as the stills showed them
(https://claude.ai/artifact/JPQACKKbuGQuLNrYjhcCRb), and yes to each of the
four things put to him by name: the floating search pill gone from these four
pages; Doctrine shelved by the hub's nine subjects, The Essence and the
Energies moving with it; Topics in the order of the Creed with each
question's short answer; and a Father's face cut about the face, on the hub
as well as here. The arbiter relayed it and recorded it
(`docs/1.9-build/BRAINSTORM.md`). The work was put on the branch from its
patch, with the gates and the checker run again on the branch as it stood
("Checked", below), and the patch removed in the same push.

## What changed for a reader, beyond the look (his yes, above)

1. **The floating "Search the library" pill is gone from these four pages.**
   He chose it for every Theology screen in r3-04 (build 80 note 24: the
   search was "literally all the way at the bottom"), and r3-13 took it off
   the hub, a step, a doctrine and its reading for the bar's magnifier. These
   four now follow the hub: the magnifier in the bar opens the same search,
   turned to Theology, and nothing floats over the list. One line brings it
   back (`<TheologySearch />`).
2. **Doctrine is shelved by the hub's nine subjects**, not by the seven
   categories this page had of its own (`THEOLOGY_GROUP_LABEL`, still in
   `lib/theology/topics.ts`, now drawn nowhere). One study moves: The Essence
   and the Energies stood under The Holy Trinity and stands under Salvation
   and theosis, where the path has it. A study's subtitle and summary are on
   its own page, not in the list.
3. **Topics is in the order of the Creed**, not of the alphabet, and shows
   each question's short answer (the first sentence of its definition) in
   place of the definition whole.
4. **A heresy's row is its name and its one line.** Who taught it, its other
   names and "Condemned at" are on its own page, as they were.
5. **An answer in Apologetics shows its summary whole**, not cut at three
   lines.
6. What is planned and not yet written is not listed (none is today); the
   old pages had a "Planned" mark for it.

## Ready for note 4 (every page switch a transition)

- A page's head is its button, grown, in the same order: the glyph
  (`data-way-glyph`), the name (`data-way-name`, the page's h1) and the kind
  and count (`data-way-kind`), each one element, so each can be named to
  carry over from the button (`<ViewTransition name>`, Next 16's guide,
  `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`).
- A row's or a card's picture is one element (`data-row-picture`): a study's
  Father, a subject's icon on its plate. A doctrine's page already opens on
  that Father's portrait and that subject's icon.
- The page arrives by the house's own cascade (opacity only, after the
  route's fade, still with motion off), so nothing of its own fights a
  route transition; note 4 can replace both in one place.

## Checked (commands, on the export of this tree)

The figures are the last run, on his OK, with the branch as it then stood
(`0d9aa264`) under the work: the four gates, the checker, the trays and axe
again, on a fresh export.

- `npm run typecheck`: 0 errors. `npm run test:unit`: 833 files and 10,023
  tests passing, none failing. `npm run lint`: 0 errors (8 warnings, none in
  these files). `npm run build:android`: green, 70.8 MB packed of an 85 MB
  ceiling.
- `node scripts/mock-check.mjs <page> "[data-way-page]"` on each of the
  four: all ten checks pass on all five palettes and in Arabic's direction
  (contrast, placeholder, target, glyph, palette, gold, stripe, mirror,
  emdash, rays).
- The checker cannot measure a word on a raised tray (the tray's ground is a
  gradient, which it reports as "not measured, look"). Measured apart,
  against every stop of the gradient over the page's ground: the lowest word
  on any tray of the four pages is 4.99:1 (Light), 5.16:1 (Monastery),
  5.22:1 (Candlelight), 5.95:1 (Dark), 6.23:1 (Black).
- axe (WCAG 2 A and AA, and best practice) on the four, Dark and Light: no
  violations.
- By eye: 390 and 360 wide (no sideways scroll), Arabic's direction, Light,
  a computer's width, and a reader's place seeded (a begun study reads
  "Part 2 of 4", a finished one is dimmed with a check).
- The checker's by-eye list: built from the app's own parts (the hub's tray,
  rows, plates and glyphs, the path's plates and its study rows, a step's
  question card); icons from `components/ui/icons`; nothing of Plus on these
  pages; no sample words (every word is the app's own data); existing keys
  only.
- `npm run i18n:check` reports six hardcoded-string hits, none in these
  files (PrayNowCard, SaintWindow, MobileWorkPill, a council's page,
  ClergySteps, FeaturedWork): they were there before.
- Between the stills and his OK the branch moved 54 commits under the
  work, none in these files. The day's new guardrail tests came with them
  (faint text, touch targets, Today in Arabic, no side stripes) and pass
  with it. The by-eye items above are from the first run; the pages
  themselves did not change after it.

## Left for a later pass (not built, as the brief says)

The pages these four list still wore the old shell, the same slop he named:
the nameless back bar, the "Theology" label, the row of four pills, a small
label over a giant headline, and the search pill floating over the words: a
topic, a heresy, an answer, and the Creed line by line. **They were done the
same day**, on his "everything in 1.9": see "The pages the four lists open",
below. A doctrine's own page was already the revamped one (r3-13).

Two things found on the hub while measuring, in the file this round does not
touch (`TheologyLibrary.tsx`). Both were fixed on the branch the same day by
the Updates chat (`f6987145`), with nothing drawn moved:

- The four ways as rows (Go deeper) set their kind and count at 52 percent
  of the ink, a share no palette rule lifts: 3.07:1 on Light and 4.24:1 on
  Candlelight, under 4.5:1. The checker cannot see it, for the reason above.
  At 55 percent it reads the same on Dark and passes everywhere, which is
  what these pages' rows use. Fixed: the rows and the Creed's row wear 55
  percent, held by `lib/ui/__tests__/faintText.test.ts`.
- "The Ecumenical Councils 7", the heading that opens the councils, is 22px
  tall: under the 44px floor (`mock-check` says so on
  `[data-theology-councils]`). Fixed: it is 44 to the touch (`.hit-44`),
  held by `lib/ui/__tests__/touchTargets.test.ts`.

And one for the checker: `scripts/mock-check.mjs` could measure a word on a
gradient against each of the gradient's stops, as was done by hand here, so
a tray's words are held like any others.

And one for Today: the saint's round face in his window
(`components/today/SaintWindow.tsx`) is cut about the portrait's middle
still. One word (`across`) cuts it about his face, as Theology's now are.

## How the stills were made

`npm run build:android`, then the export served as the shells serve it
(`scripts/lib/shell-server.mjs`), at 390 wide, with the screen made as tall
as the page so one still is the whole page. The Fathers' portraits are asked
of the website, as on a phone with signal; nothing else leaves the bundle.
The build needs the website's public Supabase address and key to list the
shop's stores (CI has them as secrets; this session read them from the live
site's own script and kept them in an ignored `.env.local`).

## The pages the four lists open (2026-11-10, on his "everything in 1.9")

His word, about 15:50 UTC (`BRAINSTORM.md`, `1c69d137`): "Again, not off at
release. I want everything in version 1.9." The arbiter's start, 15:51 UTC:
this first, with the old shell deleted, then the smaller items. Thirty pages:
5 topics, 21 heresies, 3 answers and the Creed line by line.

### The plan

The four kinds share one frame, `components/theology/LeafPage.tsx`, as the
four lists share `WayPage.tsx`, drawn from the same parts.

- **The bar**: the page's own name once its heading has gone up under it,
  back to its list (the Creed's to Theology), the search turned to Theology.
- **The head is the row that was tapped, grown**: the same mark, the name in
  Lora at title size, and the one small line the row or the path gives it.
  A topic wears its subject's icon whole on its plate and says how many of
  the Fathers it cites; a heresy the scroll, lit, and its century; an answer
  the shield and its length; the Creed the book. The row's mark travels into
  the head as the page opens and back as it closes (note 4's standard).
- **Words at reading size**: the page's own words set as a study is read
  (`StudyPartText`), each part named in Lora with how many it holds.
- **A quotation is words on their own type** on a raised surface, as a study
  sets what the councils said: the Father's face in its round frame beside
  our line on the passage, his words in italic, and the line that opens them
  where they stand. No outline, no gold, no rule beside it. His face stands
  only beside a work that is his own: a retelling in our voice, or a
  gathering of several Fathers' words kept on one Father's page (the one on
  St Gregory Palamas's), wears a book on a plate. My first draft put the
  face on every passage, which on Theosis set St Gregory's beside a line
  about St Cyril; it was caught on the first stills and never shipped.
- **Places to go are rows in one tray**: the councils that condemned an
  error, each with its picture; the Scriptures an answer cites; and what a
  page leads to, each row with its mark (a way's glyph on its plate, a
  council's picture, a Father's face) and its kind under its name.
- **The foot**: who curated it, small, under a hairline, as the lists close.

### What was built

| File | What it is |
|---|---|
| `components/theology/LeafPage.tsx` | The frame, with its marks (`LeafPicture`, `LeafGlyph`), a part (`LeafPart`) and the closing note (`LeafNote`) |
| `components/theology/wayStyle.ts` | The names the leaf pages share (`LEAF_TITLE`, `LEAF_TEXT`, `LEAF_LEAD`, `LEAF_WORDS`, `LEAF_CARD`) |
| `components/citations/CitationCard.tsx` | A Father's words on a topic and a heresy, redrawn; `lib/citations/resolve.ts` carries his slug for his face, and whether the work is his own |
| `components/citations/verbatim.ts`, `scripts/mock-check.mjs` | Words quoted as their edition prints them keep its dashes, by name: the checker lists them, with the reason, where it failed the screen. Its self-test proves both ways |
| `components/theology/CouncilMark.tsx` | A council's picture at the start of a row, as the path draws it; the church on a plate where it has none |
| `components/theology/RelatedRail.tsx` | What a page leads to: one tray of marked rows. A doctrine's own rows (`bare`) are as r3-13 approved them, not touched |
| `app/(app)/topics/[slug]/page.tsx` | A topic |
| `app/(app)/heresies/[slug]/page.tsx` | A heresy |
| `components/apologetics/ApologeticsReader.tsx`, `app/(app)/apologetics/[slug]/page.tsx` | An answer |
| `app/(app)/theology/creed/page.tsx` | The Creed line by line: its shell only. The Creed, its marks and their key are as they were approved |
| `lib/nav/backBar.ts` | The four kinds wear their own bar, so the apps show one |
| The three lists and `TheologyLibrary.tsx` | One attribute each (`data-carry`), so a row's mark travels |
| Deleted | `TheologyShell.tsx`, `TheologyNav.tsx`, `TheologyArticleNav.tsx`: the old shell, which no page wears |
| `lib/theology/__tests__/leaf.test.ts` | Holds all of it |
| `scripts/mock-leaf-pages.mjs` | Opens the four kinds on the export, measures them, runs `checkMock` on five palettes, and takes the stills |
| `scripts/route-motion.mjs` | Five walks more: a topic and back, a heresy and back, the Creed |

### What changed for a reader, beyond the look

No word of any page's own was written or changed: every line is the
registry's or the catalog's, as it stood. These are the choices in it, each
of which he can reverse:

1. **The floating "Search the library" pill is gone from these pages too**,
   as it went from the hub, a doctrine and the four lists: the bar's
   magnifier opens the same search, turned to Theology. The pill itself is
   kept (`components/theology/TheologySearch.tsx`), so one line still brings
   it back on any page.
2. **Labels that only decorated are gone**: "Topical index" over a topic's
   name, the "Theology" label over the pill row, and "Apologetics" over an
   answer's name. On a computer the list's own name stands there as the way
   back up; on a phone the bar's chevron leads there.
3. **A heresy's century is said once**, as the line under its name. The old
   page said it over the name and again as "Period" in the list beneath.
4. **"Refuted by the Fathers" and "Orthodox response" are in the ink.** They
   were in a red typed into the file (`#c1272d`), the only red in Theology.
5. **A quotation has no marks typed round it.** The card typed curly quotes
   round the Father's words; no other quotation in Theology has them.
6. **An answer lists what it leads to once.** The saints it quotes were a row
   of pills ("Saints cited") and then rows again under "Go deeper"; the
   answers beside it were pills that printed their addresses ("sola
   scriptura"). Both are rows under "Go deeper" now, by their names. A
   Father's name over his passage no longer opens his page from there: his
   row under "Go deeper" does, and the line under his words opens the words.
7. **An answer's headings are in the reader's language.** "From the
   Fathers", "Scripture cross-references", "Curated by" and "Source" were
   written in English in the file; they are the catalog's own lines now, in
   all 21 languages. No line was added to a catalog.
8. **What a page leads to is one list**, each row with its kind under its
   name, where it was a tray for each kind under a small label in capitals.
9. **A topic's and a heresy's page, and the Creed's, are 640px wide on a
   computer**, the lists' own measure. They were 760 to 820.

### Found, and left for his word or the editors'

- **Two answers promise what is not there.** On deism and On sola scriptura
  have no passages from the Fathers yet, and each says so in English, in
  every language: "The verbatim patristic florilegium for this entry is
  being assembled and will be added here." The sentence is typed in the
  file, as it was; it is the study's own note, so it was kept word for word.
  To translate it, reword it or drop it is the editors' word.
- **An answer's foot shows a note written for editors**: "Opened in v9.9 as a
  foundation entry. Florilegium assembled and verified 2026-07-27 (NPNF and
  ANF, checked against source). Enriched with the transcendental and
  intentionality arguments from the dogma-exegesis thread, permission on
  record." It is in each answer's file (`origin`) and was shown before; a
  doctrine's reading shows its own the same way (`StudyCurated`). Kept as it
  stood.
- **On Arianism, three of the four passages under "Refuted by the Fathers"
  are the edition's chapter summaries, not St Athanasius's words** (Four
  Discourses I, the heading of Chapter I: "Introduction. Reason for writing
  ..."; On the Nicene Definition, the heading of Chapter I: "Introduction.
  The complaint of the Arians ..."; On the Councils II: "Arius's own
  sentiments; his Thalia ..."). Older
  than this work, and not changed by it. A citation that names no paragraph
  quotes the section's first paragraph of the author's own text, skipping a
  heading the library knows; the rule for the first two works looks for
  "Chapter I.--" with two hyphens and the files print a dash (27 of 30
  headings in the Four Discourses and all 7 in On the Nicene Definition are
  missed, in the reading room too), and the third work has no rule for its
  part summaries. The rule is the reading room's (`lib/saints/divisions.ts`);
  which paragraph of his to quote is the editors'. Sent to the arbiter,
  2026-11-10.
- **A topic's first quotation can be a whole long paragraph** (on Theosis,
  some 400 words of St Athanasius): the page quotes the paragraph the
  citation points at, whole, as it did. A shorter passage is a choice of
  words, which is the editors'.
- **Three catalog lines are read by nothing now**: `topics.eyebrow`
  ("Topical index"), `study.period` ("Period") and, from before this,
  `topics.curatedBy`. They go with the Florilegium's unused line (F7).
- **`next dev` edits `AGENTS.md`.** With `agentRules: false`
  (`next.config.ts`) it takes out the managed block the file still opens
  with, so every chat that runs the dev server is left with an edit nobody
  asked for (restored here, not committed). Taking the two marker comments
  out of the file, and keeping its words, would end it.

### Checked (commands, on this tree, after the last pull)

The branch moved over a hundred commits under the work, and it was rebased
three times. What touched it was taken in each time: the Creed's notice that its words are English is the new one
said on the device (`StillInEnglish`), and its long-word fix for German went
to the frame's heading, for every leaf page; and build 90 note 4's new rule,
that English says its direction with its language, is kept by every element
these pages draw (`lang="en" dir="ltr"`; a registry's name on the heading
itself, `nameLang`), with the Creed's articles marked as the chat that holds
that rule marked them. Everything below was run on a merged tree with the
dependencies reinstalled (`npm ci`); the typecheck and the unit tests were
run once more after the last rebase, which brought nothing into these files.

- `npm run typecheck`: 0 errors.
- `npm run test:unit`: 911 files, 11,281 tests, all passing (24 of them
  new, `lib/theology/__tests__/leaf.test.ts`; one walks every citation on
  every topic and heresy to hold a face to a Father's own work).
- `npm run lint`: 0 errors.
- `npm run build:android`: green, 63.0 MB packed of the 85 allowed (178.4 MB
  on disk of 240), on the tree one rebase before the last. `npm run
  build:ios` and `npm run build` (the website): green on the merged tree
  before that (62.8 MB packed).
- `node scripts/mock-leaf-pages.mjs`, on the Android export: the four kinds,
  an error whose council is outside the seven and an answer with no Fathers
  yet, each measured (one bar and one way back, the bar's name once
  scrolled, the head's mark on the first screen, nothing wider than the
  screen, the page's end over the tab bar) and held to `checkMock` on all
  five palettes: contrast, placeholder, target, glyph, palette, gold,
  stripe, mirror, em dash and rays all pass. Two allowances listed, both a
  Father's page quoting its edition.
- `node scripts/mock-check.mjs --self-test`: every mistake still caught, the
  house's own parts pass, and the named em dash is listed.
- `node scripts/route-motion.mjs`: 23 walks, the five new ones among them (a
  topic and back, a heresy and back, the Creed); filmed, and the icon and the
  scroll travel as one mark.
- `node scripts/stripe-walk.mjs`: no side stripe on any screen.
- `node scripts/rtl-walk.mjs --only` the six pages, in Arabic and Urdu:
  every block of English reads left to right, and says it is English. (On
  the tree before the last rebases it still named three shared parts, the
  line under a quotation, a quoted source's words and the bar's copy of a
  page's English name; the chat that holds the rule marked them the same
  hour.)
- By eye, on the stills: a topic, a heresy, two answers and the Creed at 390
  wide, a heresy at 360, a topic and a heresy at a computer's width, and a
  topic, a heresy and the Creed in Arabic.

Not checked here: iOS's WebKit and a hand on a phone (`docs/PHONE-WALK.md`),
and the looks beyond the five palettes (`checkMock --looks`); the rows and
cards are the lists' own, which the looks already wear.

One thing seen in Arabic and left for the chat that holds the direction
work, since it is every row's in the app and not these pages' alone: a row's
English name now stands at the far side of the row from its mark (it reads
left to right, so it starts at the left). `rtl:text-right` on a row's name
would hold it by its mark.

## The Arianism find, and the sweep after it (2026-11-10)

Found while checking the new heresy page by eye: under "Refuted by the
Fathers", beside St Athanasius's face, the Arianism page quoted three
chapter summaries written by the edition's editor as if they were his words.
The arbiter's word (16:41 UTC): take it whole, (a) the rule for the two
works with the before and after of every place, (b) a sweep of every
citation the app shows as a Father's words, with a test, (c) the paragraphs
of his own words the three cards should quote, proposed for the owner. At
18:19 UTC it added the editors' lines a reader could see on two answers of
Apologetics.

### What was wrong

The library knows an edition's chapter heading by a rule per work
(`lib/saints/divisions.ts`), and a card never quotes a paragraph the rule
knows as a heading (`lib/citations/resolve.ts`). The rule for St
Athanasius's works was written on 2026-10-23 at 14:49 (`8e65a64e`) and looked
for a chapter's number followed by two hyphens. The same day at 18:17
(`ed7f910c`) the works were read again from the edition, which prints a long
dash there. From then on the rule knew none of the 30 chapter headings of
the Four Discourses and none of the 7 of On the Nicene Definition. Three
things shared the two-hyphen assumption and so failed together: the rule,
the reader's own line that prints a heading's words, and the one test that
guarded a card against quoting a heading.

Two neighbours had the same fault in other clothes. On the Councils opens
its parts with summaries that carry no chapter number at all. Discourse IV
is headed by nine summaries of the form "§§1-5." and not by chapters. And in
St John of Damascus's Exact Exposition, Book III chapter 2's heading stands
inside chapter 1's section, run on.

### What changed

| File | Change |
| --- | --- |
| `lib/saints/divisions.ts` | A chapter heading is known with either mark after its number. A work can name its summaries (`summary`: by a pattern, or by their opening words), and a title rule can name a heading that runs on inside a section (`heading`). A heading stands where the text directly under it stands (`markUnder`), so no paragraph of the author's moves. |
| `components/saints/WritingReader.tsx` | A summary is shown whole as the edition's own line; a chapter heading keeps its words without the number, as before. |
| `lib/citations/__tests__/quotes.test.ts` | Every quotation cited to a place in a work, wherever the app shows it, is refused if that place is a heading or a summary. A card of a topic or a heresy is checked twice: by how the paragraph reads and by what the library knows. A card that quotes a paragraph which is another's words whole (a homily's opening verse) is held by name. |
| `lib/saints/__tests__/editionHeadings.test.ts` (new) | Across the whole library: every paragraph that reads as an edition's heading is known as one, summaries open the sections they belong to, and no work without a rule has any. |
| `lib/saints/__tests__/divisions.test.ts` | The four works' counts and places, and "22 (continued)" carrying on where it stood. |
| `components/apologetics/ApologeticsReader.tsx` | The line "being assembled and will be added here" and the editors' note at the foot are out. An answer with no Fathers yet says nothing in their place. |
| `lib/prayers/__tests__/noStandIns.test.ts` | Extended, with the chat that wrote it told: no answer of Apologetics shows a reader words written for editors, in the page or in what the page is given. |
| `components/theology/RelatedRail.tsx` | The count beside a group's name passes contrast on all five palettes (measured by the chat that holds build 90 note 4). |
| `docs/1.9-build/notes/fathers-passages-proposed.md` (new) | The passages proposed for the owner's OK. |

### Before and after, every place in the works

Taken by listing every paragraph's place before the change and after it,
and comparing the two lists.

- **Four Discourses Against the Arians**: 39 headings known where none was
  (30 chapter headings, 9 summaries in Discourse IV). The 26 paragraphs that
  follow a heading keep their place, and the heading now begins it. No other
  paragraph moved. Every section's name is as it was.
- **On the Nicene Definition**: 7 headings known where none was. 6
  paragraphs after a heading keep their place. Nothing else moved.
- **On the Councils**: 4 summaries known where none was. 1 paragraph after
  a heading keeps its place. Nothing else moved.
- **An Exact Exposition of the Orthodox Faith**: one section. The paragraphs
  under Book III chapter 2's run-on heading are cited as chapter 2, where
  they were cited as chapter 1.
- **The other 58 works that have a rule**: nothing changed, paragraph for
  paragraph.
- **The library**: 151 paragraphs read as an edition's heading, and all 151
  are known as one.

The first try was simply to accept the long dash. The comparison caught what
that would have done: an old look-ahead that had never run would have moved
the paragraphs marked "22 (continued)" into the next section, ten citation
lines wrong in two works. Hence `markUnder`.

### The sweep

Counted by script, then read by eye where a script cannot judge.

- **Cards of a topic or a heresy** (the app chooses the paragraph): 47
  citations, 29 on topics and 18 on heresies, at 34 places. 33 are quoted in
  the Father's words and 14 show the line only (retellings and gatherings,
  as before). Before the fix 7 of them, at 3 places, quoted the edition's
  summary as St Athanasius's words: Arianism's three, the same three on The
  Holy Trinity, and the first again on The Incarnation. After it, none.
- **Quotations with their own place written down**: 167 across the app (32
  on saints' pages, 1 in a life, 3 in councils' accounts, 1 in a heresy's
  text, 12 for Today, 63 in the studies of Theology, 9 in Apologetics, 12 in
  History, 34 in the reading room's collections). None stands on a heading
  or a summary, and none is another writer's words given to a Father. The
  two that stand in a paragraph wholly inside quotation marks are St Justin
  speaking for himself in the Dialogue; St Polycarp's are his own words in
  the account of his martyrdom.
- **Found beside it**: 4 cards of the heresies (Sabellianism, Marcellianism,
  Photinianism, Paulianism) quote the verse St John Chrysostom's homily
  opens on, under his face, where our line above each describes a paragraph
  of his own further down. Which words a Father is quoted as saying is the
  owner's choice, so those paragraphs are proposed with the rest and the
  four wait by name in the test; no fifth can join them.
- The Florilegium's starters are Scripture only, held to the app's Bible by
  their own test.

### Found, and left

- The file of On the Councils repeats the edition's caption "Blasphemies of
  Arius." at the end of §15's paragraph and again as the next paragraph. A
  blemish in the text as held; it belongs to the chat that has the Fathers'
  works.
- A quoted paragraph keeps the edition's number at its front ("11. At his
  suggestion"), and the line under it says §11 as well. 10 of the 33 quoted
  cards show it. The card could leave the number to the line. Asked, not
  done.
- The Incarnation's card for St Cyril's Commentary on John shows nine words
  that start mid-sentence under a label for a later chapter. The labels and
  the dropped lines of that work are already in another chat's hands.
- The file of the Homilies on John opens Homily 2 and Homily 3 on the same
  fragment. Told to the same chat.
- A study of Theology still shows its `origin` line at its foot
  (`StudyCurated`, `components/theology/StudyPartText.tsx`). It names where
  the study began, which is closer to a credit than to an editor's note, so
  it was asked about and not removed.

### Checked (commands, on the merged tree)

- `npm run typecheck`: 0 errors.
- `npm run test:unit`: 913 files and 11,363 tests passing (one file is
  skipped by its own condition, the content package, as on every machine
  without it).
- `npm run lint`: 0 errors.
- `npm run build:android`: green, 62.8 MB packed of the 85 allowed (178.3 MB
  on disk of 240).
- `npm run build` (the website, where a work's text stays in the page):
  green.
- `node scripts/mock-leaf-pages.mjs`, on the Android export: the six pages
  pass `checkMock` on all five palettes, all ten checks. The Arianism page's
  two listed allowances are St Athanasius's own paragraphs now.
- The reader, opened on the export at seven headings in the four works (a
  chapter of Discourse I and its opening, a summary of Discourse IV, both
  kinds in On the Councils, a chapter of On the Nicene Definition, and the
  Damascene's run-on heading): each is drawn as the edition's own line, with
  the author's text under it.
- The quotation test was run against the old rule first, and failed on the
  three cards, before it was run against the new one.
- By eye, on stills: the Arianism page's first and third cards, the reader
  at Discourse I chapter 4, and the end of On deism.

Not run on this tree: `npm run build:ios` (no platform code changed; green
on the tree before), and a hand on a phone.

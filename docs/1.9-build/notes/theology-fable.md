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
   categories this page had of its own (their names, `THEOLOGY_GROUP_LABEL`,
   were drawn nowhere after this and were taken out the same day with their
   order and their one helper, T3). One study moves: The Essence
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
- A quoted paragraph kept the edition's number at its front ("11. At his
  suggestion"), and the line under it says §11 as well. 10 of the 33 quoted
  cards showed it. Asked, and done on his yes: the card leaves the number to
  the line ("His yes to call 19", below).
- The Incarnation's card for St Cyril's Commentary on John shows nine words
  that start mid-sentence under a label for a later chapter. The labels and
  the dropped lines of that work are already in another chat's hands.
- The file of the Homilies on John opens Homily 2 and Homily 3 on the same
  fragment. Told to the same chat.
- A study of Theology still shows its `origin` line at its foot
  (`StudyCurated`, `components/theology/StudyPartText.tsx`). It names where
  the study began, which is closer to a credit than to an editor's note, so
  it was asked about and not removed. On his yes it is a credit in plain
  words ("His yes to call 19", below).

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

## His yes to call 19: the passages go in (2026-11-10)

His word, about 20:07 UTC, to his decisions page: "Yes to all recommended
suggestions. Do them all." Call 19 there was "yes Fathers", as recorded in
`docs/1.9-build/BRAINSTORM.md`: the Arianism passages (also on The Holy
Trinity and The Incarnation), St John Chrysostom's own words on four cards,
three Fathers each on deism and on sola scriptura, St Irenaeus and St Vincent
read from their editions and shown to him first, the paragraph number left to
the line, and the studies' credit in the words "Began as a thread on Purify's
Discord server, in dogma-exegesis: ...".

### What went in

- **Arianism's three cards** quote the paragraphs proposed as A1, A2 and A3:
  Discourse I §11, On the Nicene Definition §23, On the Councils §20. Each is
  one number added to its citation (`paragraphIndex`, `lib/heresies/
  heresies.ts`). The same three places on The Holy Trinity, and the first on
  The Incarnation, quote the same paragraphs (`data/topics/`).
- **Four cards of St John Chrysostom** quote his own words, not the verse
  the homily opens on: Sabellianism (B1), Marcellianism and Photinianism
  (B2), Paulianism (B3), in `lib/heresies/conciliar.ts`. The list of verse
  cards that waited by name in the quotation test is empty, and stays empty:
  no card may quote a paragraph that is another's words whole.
- **On deism** has three passages (C1, C2, C3: St Athanasius, Against the
  Heathen 41; St John of Damascus, Exact Exposition II.29; St Athanasius, On
  the Incarnation 8), and **On sola scriptura** three (D1, D2, D3: St Basil,
  On the Holy Spirit 27; St John Chrysostom on 2 Thessalonians, Homily 4; St
  John of Damascus, Exact Exposition IV.16). Each is the Father, his words
  and the line, with no line of ours: a line above a Father's words is
  doctrinal framing and goes to the editorial queue first. D4, the
  alternate, is not in.
- **The edition's paragraph number is left to the line.** A card whose
  paragraph begins "11. " under a line that says §11 shows the words from
  "At his suggestion". Only a number the line itself says is left to it, so
  none is lost (`wordsUnderLine`, `lib/citations/cite.ts`, used by the
  resolver). 10 of the 33 cards that quote a Father.
- **The fourteen studies' credit** reads "Began as a thread on Purify's
  Discord server, in dogma-exegesis: The Annihilation of the Filioque." (two
  say "in liturgics-forum"). The thread's name is as it was; one stray
  period after a question mark went. The foot draws it on its own line, as
  the English it is, at the quiet ink every palette can read: it was at 35
  percent, under the 45 to 60 the palettes lift to 4.5:1
  (`StudyCurated`, `components/theology/StudyPartText.tsx`). The script that
  lands a study writes the same words. The permission for the threads stays
  where it is recorded (`docs/editorial/dogma-queue/`); nothing of that
  record changed.

### What waits

- **St Irenaeus and St Vincent of Lerins**, for On sola scriptura. The
  library does not carry Against Heresies III or the Commonitory, so one
  passage of each was read from the public-domain edition's own page
  (ccel.org, ANF 1 and NPNF II 11), the page saved and the words lifted from
  it by a script, never typed. They were call 25 on his page, and went in
  on his word the next day ("His word to call 25", below).
- **Three slips in the text as the library holds it** stand inside the
  passages (a missing space in A1, "unchangableness" in A2, "un originated"
  in B1). They are shown as held; the chat that has the Fathers' works knows
  of them.

### What holds it

- `lib/citations/__tests__/quotes.test.ts`: every card of a topic or a
  heresy quotes a Father's own paragraph, never a heading, never another's
  words whole (the waiting list is empty); the number at a paragraph's head
  is the line's wherever the line says it, and is kept wherever it does not;
  the answers' six passages are the ones approved, each word for word inside
  the paragraph named, with no line of ours.
- `lib/theology/__tests__/studyCredit.test.ts` (new): the fourteen credits
  say the owner's words, none keeps the shorthand, the landing script
  writes the same, and the foot is legible.

### Found on the way

The mock check was run on a study's last part for the credit's ink, which it
passes on all five palettes. It also read two things on that page that are
not from this work:

- **The Next pill was 42px tall**, two under the floor of 44 for anything
  pressed: in the study's reader (the next part, and what comes after the
  last) and at the end of a step of the path. The count of small targets
  cannot see a height written out in pixels. Mended, the three of them
  (`h-11`; `lib/theology/__tests__/nextPill.test.ts` holds it).
- **The passages' cards in the study's reader** read under 4.5:1 in their
  small print on every palette (measured on the export: the Father's name
  3.65:1 on Dark, the work and its place 2.16:1; on Light the passage's own
  words 2.88:1 on some cards). Some of that may be the cards waiting at the
  side of the row, which the deck draws fainter on purpose; it has not been
  looked into. The deck is another chat's and changed today, so it is told
  to the arbiter and not touched here.

### Checked (commands, on the tree as committed)

- `npm run typecheck`: 0 errors.
- `npm run test:unit`: 929 files and 11,528 tests passing (one file skipped
  by its own condition).
- `npm run lint`: 0 errors.
- `npm run build:android`: green, 66.5 MB packed of the 85 allowed.
- `npm run build` (the website): green.
- On the Android export, each changed card read from the page itself and
  held to what it must say (22 checks): Arianism's three with their lines
  (§11, §23, §20), no card beginning with the edition's number, the same
  paragraphs on The Holy Trinity and The Incarnation, St John Chrysostom's
  own words on the four cards and no card that is only the verse, the three
  passages on each answer in its own order with their lines and nothing of
  ours, and the study's credit on its own line.
- The mock check, five palettes, all ten checks: Sabellianism, On deism, On
  sola scriptura, and the six pages of `node scripts/mock-leaf-pages.mjs`
  (On deism there now as an answer whose Fathers stand with no line of
  ours). On a study's last part the credit's ink and the Next pill pass;
  what remains there is the passage deck's, told above.
- `node scripts/route-motion.mjs`: 26 of 26.
- By eye, on stills: Arianism's first and third cards, Sabellianism's, the
  Fathers on both answers, and a study's end.

Not run on this tree: `npm run build:ios` (no platform code changed), and a
hand on a phone.

## His word to call 25: St Irenaeus and St Vincent (2026-11-11)

His word, about 00:56 UTC, to his decisions page: "rec for all and finalize
this build" (`docs/1.9-build/BRAINSTORM.md`). Call 25 there was the two
passages as the card showed them, to stand on On sola scriptura after St
Basil, St John Chrysostom and St John of Damascus.

- **St Irenaeus of Lyons, Against Heresies, Book III, chapter 4, 1** (ANF
  1): "For how should it be if the apostles themselves had not left us
  writings? ..." to "... commit the Churches?", 42 words. The words in
  square brackets are the edition's own.
- **St Vincent of Lerins, The Commonitory, chapter 2, 5 to 6** (NPNF II
  11): "Therefore, it is very necessary ..." to "... believed everywhere,
  always, by all.", 65 words: two sentences that stand one after the other
  on the edition's page with only its section number between them, which is
  left to the caption, as a card's number is left to its line.

Neither work is in the library, so no paragraph of ours can hold the words.
They are in `data/apologetics/sola-scriptura.json` as the other answers'
passages from outside the library are: the Father, the work and its place,
his words, and a Source link to the edition's own page. The address is in
the house's form (`ccel.org/ccel/schaff/anf01/anf01.ix.iv.v.html`,
`.../npnf211/npnf211.iii.iii.html`); the pages were first read at the short
form of the same address, and the long form was fetched and compared before
it was written down: the same words, with V1 and V2 together and only "[6.]"
between. No line of ours stands with either. St Irenaeus has a page in the
app, so his face stands by his words; St Vincent has none yet.

What holds them: `lib/citations/__tests__/quotes.test.ts` holds each to the
exact words by their hash, with the author, the work, the place and the
page's address, so a changed letter fails. It also holds that the three from
the library still come first.

Checked, on the tree as committed: `npm run typecheck` 0 errors;
`npm run test:unit` 946 files and 11,942 tests passing; `npm run lint` 0
errors; `npm run build:android` green (67.2 MB packed of the 85 allowed);
`npm run build` green. On the Android export the answer was read from the
page card by card (five passages in order, the three from the library with
their lines, St Irenaeus's and St Vincent's with the work, its place and the
edition's page, each ending where the passage he was shown ends, the
edition's brackets kept and its section number left to the caption, no line
of ours), and the mock check passes on it on all five palettes, all ten
checks. `node scripts/mock-leaf-pages.mjs` passes. By eye, on a still: the
two cards.


## The gate's first run on a study's page (2026-11-11)

The pre-build gate's first run (`docs/1.9-build/notes/gate-run-1.md`) named
three things on `/theology/comma-johanneum/`. All three are in the
components every study shares, so they are mended there.

- **The step's link at the head of a study was 26px tall**
  ("VIII · Scripture and the Fathers · 8 of 9"). It had a larger place to
  tap laid over it (`.hit-44`), which the gate does not count: it measures
  the box. The link is 44 tall in its own box now
  (`components/theology/TopicReader.tsx`), and the room it gained is taken
  from the space over it and under it, so the head stands where it stood.
  47px on the export at the reader's text size.
- **"Doctrine", the quiet label over the related studies, read 2.31:1 on
  every palette.** It was ink at 40, below what the house lifts to 4.5:1
  (45 to 60, `lib/ui/__tests__/faintText.test.ts`). It is smaller than the
  label over a part, not fainter, now.
- **"Part 1 of 4", inside the Begin button, read 3.97:1 on Dark, Candlelight
  and Monastery.** It was the button's own ink at 55%
  (`components/theology/StudyContents.tsx`); at 70% it is past 6:1.

Held by `lib/theology/__tests__/studyGate.test.ts` (four cases) and by the
touch test's own line for the link. On the export the mock check passes on
the study's page on all five palettes: contrast, target and the rest. What
it still could not measure there was words on a tray's gradient, which was
the checker's own item (T4). It measures them now: the next section.


## Words on a gradient are measured (2026-11-11, T4)

The mock checker (`scripts/mock-check.mjs`) measures a word against the
colours of the boxes it sits in. Where one of those boxes had a gradient it
said "not measured, look", as it does for a picture. A raised tray is a
gradient, so every word on every tray in Theology was on that list, and
with them the cards of Prayers and Plans, the atlas's doors, Settings'
plates: on the gate's own walk of the export, 1,119 lines on 44 of 127
screens. Nobody looks at 1,119 lines. I had measured Theology's trays by
hand when I built them (above, "against every stop of the gradient"). This
is the checker doing it, for every screen.

### The first way, and why it is not what was built

The item as I wrote it down was "against each of the gradient's stops". I
surveyed the whole export before building it, and for anything but a
near-flat tray that way is wrong in both directions.

- A fade from clear to dark would hold words at its dark foot to its clear
  head, and fail words that read well.
- Grey words on a fade from black to white pass at both stops and cannot be
  read in the middle.
- 239 of the words stand on two or three gradients at once, each with a
  size and a place of its own (a card's sheen is a pool 115% by 90% at 88%
  8% over a slanted fall of three colours), and some on a hairline 1px
  tall. Stops do not say where on a card a word is.

### What it does

The ground is **painted as the browser paints it, and read where the words
are**. The words' parents, from the first opaque one up, are laid one over
another as boxes with their own backgrounds, corners and shadows, each
where it stands about the words, in an SVG that the browser itself paints
into a canvas. So the gradient is the browser's own: its lines, its stops,
its colour space. Of the pixels under the words the one least kind to them
is what they are measured on, with the same sum as every other word, and a
failure says so: `4.42:1 at its least on the gradient under it, needs
4.5:1`.

A word with no gradient among its parents is measured exactly as before,
by the same lines of code: the gate's 14 findings before this are the same
14 after it.

### What it will not vouch for

A painting of the words' parents is only the ground if nothing else is
drawn there. So the checker says "not measured, look", with the reason,
when:

- a parent has a picture (`div has a picture`), as before;
- **a picture or another piece is drawn across the words by something that
  is not their parent** (`a picture is drawn across it (img)`). The reading
  room's covers are the case: the title stands on a dark fade, and the
  picture under the fade is the fade's neighbour, not its parent. Painted
  from the parents alone those 384 words would have been measured on a
  plate that is not there. A picture that has not arrived yet counts: it is
  the ground once it comes. A blurred piece is taken as wide as its blur;
- a parent draws a `::before` or `::after` of its own across the words;
- the gradient is fixed to the screen, or fills the letters themselves.

A piece outside the words' own ground (the first opaque parent they stand
on) is hidden by that ground when it is painted before it, and may lie
over the words when it is painted after. The checker works out which by
the order CSS paints in (in the flow, or placed, and at which z), takes as
"underneath" only what is surely underneath, and treats every doubt as
"across". A row's fade at the edge of a rail of covers is the case that
taught it: it lies over the last cover and its words.

What it does not see, as the sum of plain colours never did: a parent
faded as a whole (its opacity), and a filter or a blend laid on a parent.

### Held to the screen

A painting is a claim about the screen, so there is a proof that holds it
to the screen: `scripts/painted-ground-check.mjs`. It photographs each
page whole with its letters cleared, and sets every ground the checker
painted beside the photograph's own pixels in the same box, its lightest
and its darkest. More than two levels of 255 apart in any channel fails.

On the export, every one of its 127 screens on all five palettes: **3,568
painted grounds set beside the screen, none more than two levels apart.**
305 more were painted and not photographed: words pinned to the screen (a
photograph of a whole page shows a pinned bar once, where the first screen
ended, so pinned pieces are taken out of it) and words scrolled out of
their row (measured where they stand in the row; the photograph does not
show them). Those rest on the same painting, unproven by a photograph.

The proof is why the painting is what it is. Each of these was a
difference it found, and each is in the painting now:

| What the screen showed | What it was | In the painting |
| --- | --- | --- |
| A grey edge, up to 136 where the tray is 28 | A box that ends part way through a pixel is painted there half clear | The box that is read is whole pixels, inward |
| Covers 21 levels lighter at the top of a title | A letter's box stands a pixel past its tight line, over the fade's neighbour | Where it overhangs the piece the words stand on by less than two pixels, it is cut to it |
| On Light, a row 14 to 16 levels darker than painted | A picture plate throws its shadow across the words beside it | The shadows of pieces beside the words are painted over the ground, each cut to the boxes that hide it |
| The same, from the card above | A card that is placed (`relative`) is painted after the tray below it, so its shadow lies on that tray | The order CSS paints in, as above |
| The last cover of a rail, lit at one side | The rail's own fade at its edge lies over the cover | Said, not measured |
| A field's placeholder, white at four corners | The field's rounded corners, read as its ground | A placeholder is read inside the field's edge and padding |

### The checker's own proof

`node scripts/mock-check.mjs --self-test` holds it both ways:

- caught: faint words on a tray (2.73:1), and ink at the ink end of a fade
  from the page's ground to its ink (1.06:1), each "on the gradient under
  it";
- passed, and measured rather than skipped: two lines on a house tray, and
  the same ink at the ground end of the same fade, which no measure by the
  gradient's stops could pass;
- still said: words on a picture, and words on a fade with a picture laid
  under it. Nothing else in the house's fixture is said.

### What the gate says now

The gate's walk of every screen, old checker and new on the same export
(built from the branch at `037903bf` with the Back mend in it, selling
Plus, walked as the no-Plus reader; the new checker gives the same 23
where nothing is locked):

| | Before | Now |
| --- | --- | --- |
| "Not measured, look" | 1,119 lines on 44 screens | 334 lines on 11 screens |
| Findings | 14 | 23: the same 14, and 9 new, all contrast |
| The walk | 1 min 44 s | 1 min 50 s |

What is still said: 223 words on a picture, 82 with a picture drawn
across them, 29 with another piece across them (a rail's edge fade, a
tile's sheen).

The nine, none of them on a Theology screen, sent to the arbiter for
their owners (and given back to this chat: "The nine, mended", below):

| Screen | Words | At its least | Palettes |
| --- | --- | --- | --- |
| Prayers, a row of a card's list | the time, "~5 min" | 4.42:1 | Candlelight |
| | its arrow | 4.46:1 | Candlelight |
| A saint's web, the key at its head | the counts beside the key's words, "4" and "1" | 2.34:1 | Dark, True black, Candlelight, Monastery |
| | "In the Lives" | 4.22:1 | Candlelight |
| A saint's web, the sheet at its foot | the dot between "787" and "Councils" | 1.76:1 | all five |
| | "Councils" | 4.22:1 | Light, Candlelight |
| A saint's web, a council's year under its mark | "787" | 4.41:1 | Light |
| Settings, the text size slider | the small "A" at its start | 3.39:1 | Light |

Theology's own trays, the reason for the item: on its twelve screens in
the walk no word fails, and four are still said, all on the hub's first
card ("1 of 9", "The Holy Trinity" twice, "7 citations from the Fathers"):
the step's picture is laid behind that card as a blurred light, which is a
picture drawn across them. The Themes chat measured that card by its
pixels and mended its two faint lines (`3702200b`: "1 of 9" on Light from
4.26:1 to 4.83, "7 citations from the Fathers" on Monastery from 4.49 to
4.79).

### The nine, mended (the same day, on the arbiter's word)

The arbiter gave all nine to this chat: each to 4.5:1 on all five palettes
with the least change to the look, the house's own inks, each file's last
owner told before it was touched (Updates for the saint's web and Prayers,
Themes for Settings and the faint text rules; both said yes). Each number
below is the mock checker's on a new export, after the change. One
correction to the table above: the "787" that failed on Light is the one
in the sheet's line, with "Councils"; the year under a council's mark on
the web itself passes (5.23).

| What | It was | It is | Where |
| --- | --- | --- | --- |
| The key's counts ("4", "1") | The ink at 34: 3.06 on Dark, 2.90 on True black, 2.74 on Monastery, 2.34 on Candlelight | At 50: 5.37 on Dark, 5.32 on True black. At 52 on Monastery, Councils and Cappadocian: 4.98 on Monastery. At 56 on Candlelight: 4.70. Light's own 70 stood at 4.89 and stays | `.saint-web-key-count`, `app/globals.css` |
| The key's words on Candlelight ("In the Lives", "Councils") | At 52: 4.22 | At Candlelight's own faint share, 60: 5.26. Monastery, Councils and Cappadocian take theirs, 55 (5.37 on Monastery), so a count stays a step under its word | `.saint-web-key-part` |
| The sheet's line on Light ("787", "Councils") | At Light's 70: 4.41 and 4.47, the sheet being a step darker than a card | At 75, as faint words on a tray: 5.02 and 5.08 | A rule beside the faint text rules, Light alone |
| The dot in that line | The ink at 30: 1.76 on Light, no more than 2.2 anywhere | The line's own ink: 5.08 on Light, 5.05 on Candlelight. Still `aria-hidden` | `components/saints/web/WebCard.tsx` |
| Prayers, a row's time and arrow on Candlelight | At Candlelight's 60: 4.42 and 4.46 | At 66 on a graphite card: 5.01 and 5.06, and 4.67 at the card's lightest point | A rule beside the faint text rules, Candlelight alone |
| Settings, the two letters of the size slider | The ink at 55: 3.39 and 3.41 on Light | The ink of the names under the slider (62; Light 72, Candlelight 64, a dark look its own): 5.65 and 5.60 on Light | `.set-slider-a1`, `.set-slider-a2` |

Three things the measuring changed from what was first planned:

- **The graphite card at 66, not 64.** The card (`components/ui/Graphite.tsx`)
  is typed in, the same on every dark palette, and lit at one corner: 51 51
  56 at its lightest. At 64 the row that was found passes (4.82) and a word
  at the corner itself would not (4.49). At 66 the whole card holds (4.67).
- **The counts at 50, not 48.** At 48 they passed on the five palettes and
  read 4.42 to 4.48 on six of the dark looks (`mock-check.mjs --looks`).
- **The slider's letters in all three of Settings' quiet lists, and 62
  under them**, not only in Light's. By the arithmetic of
  `faintText.test.ts` the letters at 55 were 4.29 to 4.34 on Monastery,
  Councils and Cappadocian where the panel is lightest. On the dark
  palettes the panel has a picture, so the checker says "look" there; by
  their pixels (`wordsOnPicture`) the two letters now read 7.02 and 7.07 on
  Dark, 7.27 on True black, 5.56 on Candlelight, 6.06 and 6.08 on
  Monastery.

Held by tests that fail on the stylesheet as it was:

- `lib/saints/__tests__/webKeyInk.test.ts`, new, 16 cases: on each of the
  seven palettes the key's words and counts are 4.5:1 or more where the key
  is hardest to read on, a count is under its word, and the dot wears no
  faint share. Seven fail on the old stylesheet, with its numbers (the
  counts at 34 percent, 2.74 to 3.12; Candlelight's words, 4.19).
- `lib/ui/__tests__/faintText.test.ts`: the graphite card's lightest point
  on Candlelight, read from the component that draws the card; the saint
  web's sheet at its darkest on Light; both rules in the faint text layer
  under a second `:where()`, so a hover still wins and the reader of the
  page's own shares is not misled; and the slider's two letters on the
  panel with its names, on all seven.

Checked on the export: the gate's walk of the six screens these rules can
reach (Prayers, the saint's web, Settings, Today, Plans, What's new),
nothing failed; the saint's web, Prayers and Settings on the five palettes
and the seventeen looks, every rule ok.

Named, not done: the same lit corner is 4.42:1 for Dark's faint share and
4.36 for Monastery's, by the same arithmetic, at the corner's very middle.
No word stands there today (the row that was found reads 4.68 on Dark),
and the gate passes. One line each would hold them, as Candlelight's does.

### Words on plain colours with a picture across them are said (the same day)

The sum of plain colours had the blind spot the painting was built not to
have: a word whose parents are all plain colours, with a picture laid
behind it by something that is not its parent (a tile's words over its
picture, the numerals under a picture plate), was passed or failed on its
parents' colours. The arbiter's word: measure them by their pixels if that
is about ninety minutes' work, otherwise say them "look" and the Themes
chat measures them once by pixels. It was two to three hours to do well, so
they are said. Admin, whose gate it is, asked for the same.

- Such a word is on the by-eye list, with the picture's name:
  `a picture is drawn across it (img, bible.jpg)`. Only a picture (an
  image, a drawing, a background picture): a plain piece across such words
  is left to the sum, as it was.
- A part of the page the browser has not drawn yet (a card off the screen
  under `content-visibility`) is kept at a stand-in size, so by its numbers
  what is in it lies across the parts after it. The walk of the history
  page showed it: every event's words "over" the next event's picture. So
  a thing in such a part is only held against the rest of the same part,
  for the painting too.
- The gate's walk prints the list by screen, each reason once with how
  many words carry it and the first three (Admin's ask): it reads as one
  line a picture, not one a word.

The count I gave the arbiter first was 116 words on 11 screens. It was
short: my tally stopped at the first piece found across a word, and where
that was a plain piece the picture behind it was not counted. On the same
export, old checker and new: **183 words on 16 screens** move from
"measured" to "look" (Today, You, the Bible's head, a chant, the councils'
bands, Discover's cards, Plans' tiles, Prayers, the Plus page, a saint's
web, Settings' focus cards, Theology's plates and a study's head). The
by-eye list is 517 lines on 22 screens; the findings are the same six,
none of them contrast. The checker's self-test holds it both ways: words
over a picture on plain colours are said, and words beside a picture are
measured as ever.

### Words scrolled out of their row are read at its middle (the same day, Admin's find)

The gate's third run opened the Search sheet from About and the checker
said that "Theology", "Councils" and "History", three doors of its "Look
in" row, read **1.00:1** on Dark and True black, 1.27 on Candlelight and
1.11 on Monastery. They do not. They are the later doors of a row that
scrolls sideways, and they were past the screen's right edge.

The fault was mine, and it was in the part of T4 that no photograph had
held. Words scrolled out of their row were read where their numbers put
them, past the row's edge. That is right when their ground scrolls with
them (a title on its cover in a rail), and wrong when their ground is
behind the row. The Search sheet's doors stand on the sheet. Past the
sheet's edge nothing was painted, the painting's paper was white, and the
lightest ink on white is 1.00:1.

What it does now, in `scripts/mock-check.mjs`:

- **Words hidden whole by a box that scrolls are read at the middle of
  that box**, where a reader brings them to read them, and whatever the
  box carries as it scrolls is taken there with them (`seenOf`, `rectFor`).
  What is behind the row stays where it is. Nothing on the page is moved.
- **Which things a row carries** follows CSS's own rule (`holds`,
  `carriedBy`): a thing placed out of the flow (a pinned sheet, a badge set
  on a corner) is held only by the box it is placed by, and the parents
  between neither cut it nor carry it. The same rule now decides which
  boxes cut a line of words, which until today was every parent that hides
  its overflow.
- **The painting's paper is clear** wherever the words have an opaque
  ground of their own, so a place that ground does not reach is never read
  as white. If none of the ground is under the words they are said, with
  the ground's name: "it stands past the ground it would be measured on".
- Left where their numbers put them, as before: words out of a box with no
  room at all (a part that is closed opens where it is), out of a box that
  cannot scroll to them, and out of the page itself.

Two ways not taken, both tried on the whole export:

- **The row's near edge** (where the row would first show them). A rail
  fades at its edges, and 51 titles of the reading room's and the councils'
  rails were then said to have the fade across them. What stands under
  that fade is on its way in, not yet being read.
- **Really scrolling the row**, measuring, and putting it back. It is the
  truest reading and it is not a gate's: a row that is scrolled wakes the
  pictures it brings into sight, a cover is drawn anew when its picture
  arrives, and two walks of the reading room gave 73 lines and then 71. A
  gate has to say the same thing twice.

What it does not see, named: the first and the last of a row are read at
the row's middle although the row cannot bring them there, so a piece of
the row's own frame that stays at its end is not held against them; and a
piece the row does not carry that lies across its middle is held against
every word read there.

Held to itself and to the screen:

- **The checker's self-test** has three new cases: a door past the edge of
  a row that scrolls sideways and a line under the fold of a list that
  scrolls in its own box, both on a house tray that scrolls with neither,
  and a faint word past the edge of a row on a typed-in tray. On the
  checker as it was pushed, the door read 1.00:1 on Dark and True black
  (1.48 Candlelight, 1.20 Monastery), the line 1.43 (2.50 Light, 1.00
  Candlelight, 1.19 Monastery), and the faint word was "caught" at 1.00:1,
  which is no measure of it. Now the house's two pass, measured, and the
  faint word is caught at 2.73:1.
- **The Search sheet itself**, opened from About: the nine doors of the
  row on five palettes, each painted ground beside a photograph of the
  sheet with its letters cleared. 35 compared, none a single level apart;
  "Theology" and "Councils" were photographed with the row scrolled to
  bring them to its middle. "History" and "Shop" are read at the middle
  too, and not photographed there: the row ends before it can bring them
  that far. No door reads 1.00:1. On Light, eight of the nine read 4.21 to
  4.42 (`text-paper/62` on the sheet's gradient). That is real, and it is
  with the arbiter for an owner.
- **The proof over the whole export** (`node
  scripts/painted-ground-check.mjs --all`): 3,758 painted grounds beside
  the screen on 127 screens and five palettes, none more than two levels
  apart. 190 of them are words scrolled out of their row, photographed
  with the row scrolled to bring them to its middle; the proof learned to
  do that today, and until it did none of them was photographed. 60 more
  are the first or the last of a row, which it cannot bring to its middle,
  and 55 are pinned to the screen: counted, not photographed.
- **The gate's walk** says what it said before the mend: 123 of 127
  screens with nothing found, the same six findings (pictures), 517 lines
  to be looked at on 22 screens, in 111 seconds.

## The gate's third run: three of mine, and the corner (2026-11-11)

His word at 17:00 UTC: "we kinda need this build finalized since we are on
our last weekly limit until the next one". From then this chat did only its
three gate fails. Each was proved on the selling export, the first with no
signal and the other two on the real feed (read only, numbers only, no
reader's words or name kept).

### Six council pictures that did not come with no signal

All six were History's pictures of the seven Ecumenical Councils on
Theology's own screens: the hub, the Creed, the path on Christ and a
heresy's page. The apps carry those as the AVIF alone and keep the website's
JPEG behind them (`lib/media/carried.ts`). The councils' own pages offer the
AVIF first. Three places in Theology asked for the JPEG alone, so with no
signal a reader saw only the blurred preview: the hub's film of the seven
(`TheologyLibrary.tsx`), a step's read on a path (`StepView.tsx`) and a
council's mark beside its name (`CouncilMark.tsx`).

`components/theology/CouncilPicture.tsx` is one small picture for the three:
the AVIF first, the JPEG behind it for a phone that cannot draw an AVIF,
arriving whole as every plain picture does. The hub's page and the path's
steps hand it the AVIF.

**What the pictures uncovered.** With them there, the film's words were
measured on a picture for the first time, and 87 lines fell short on the
five palettes: a numeral 2.07:1 on Candlelight, a name 3.30 on Light. A
reader with a signal has been reading them that way all along; the gate,
which walks with none, never saw the pictures. The film's fade was one even
slope, 40 percent strong where the words begin. Its foot is now the
palette's ground, nearly whole from where the words begin and whole at the
end, the picture clear above it (`.council-film::after`).

On the export with no signal: 17 council pictures on the four screens, every
one drawn from the app's own file; the gate's walk of the four screens finds
nothing; the film's words on their pixels, none under 4.5:1 on the five
palettes and the seventeen looks. `lib/theology/__tests__/councilPictures.test.ts`
holds the premise, the order, the fallback, the three places and the foot's
strength where the words begin (0.40 before, 0.9 asked).

### Community's "Read more": the place the thumb was comes to rest where it is sent

The walk failed it by a pixel: the place came to rest 66px down, where the
walk allows 65 and the helper sends it to 63. The helper did follow. It
counted its own steps as it asked for them, and a screen sets a page on
whole pixels, so each step of a glide lands a part of a pixel from where it
was sent. Twenty steps on, the place stood a few pixels from where the
helper believed it was, and the page stopped that far short: 62 to 64px on a
quiet machine, 66 on the gate's.

`lib/ui/showOpened.ts` now reads how far the page really went after each
step and counts that. On the real feed, tapped as the gate taps (a finger
down 60ms), the place comes to rest at 63px on every post with a fold, with
the phone slowed six and twelve times as well. The test's screen drops the
part of a pixel, the worst a screen does: the old code came to rest at 72.

### A reader's own long dash on their profile

The em dash was in a reader's own "About me". The feed has marked readers'
words since the first run (`READERS_WORDS`), so the checker lists a long dash
a reader typed and does not fail the screen; the profile sheet did not. The
same mark, word for word (`components/community/readersWords.ts`, a test
holds it equal to the feed's), is now on the paragraph that holds "About
me", on the name a reader chose, on their parish and on where a cleric
serves. Of the thirty profiles the feed's first screens lead to, two have a
long dash, both in "About me": the checker lists each as a reader's own
words and fails neither sheet.

### The graphite card's lit corner on four more palettes

The arbiter's yes of 15:36, written and tested before the word of 17:00 and
sent as it stood. Candlelight was given a rule for the corner when the
checker found "~5 min" there (above, "The nine, mended"). By the same
arithmetic Dark's faint ink read 4.42:1 at the corner and Monastery's,
Councils' and Cappadocian's 4.36, 4.27 and 4.26. On a graphite card Dark
draws its faint shares at 52 percent (4.65) and the three at 60 (4.88, 4.77,
4.76). True black draws the card flat. `faintText.test.ts` holds all five at
the corner.

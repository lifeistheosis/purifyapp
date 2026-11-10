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

The pages these four list still wear the old shell, the same slop he named:
the nameless back bar, the "Theology" label, the row of four pills, a small
label over a giant headline, and the search pill floating over the words.

- A topic (`app/(app)/topics/[slug]/page.tsx`).
- A heresy (`app/(app)/heresies/[slug]/page.tsx`). Its side stripe, on the
  council's own words, went the same day with note 1 (Updates 2, `2a14e57c`).
- An answer (`app/(app)/apologetics/[slug]/page.tsx`,
  `components/apologetics/ApologeticsReader.tsx`), whose headings are
  written in English in the file.
- The Creed, line by line (`app/(app)/theology/creed/page.tsx`), the one
  page still inside `TheologyShell`. Once these four are done,
  `TheologyShell.tsx`, `TheologyNav.tsx` and `TheologyArticleNav.tsx` (the
  pill row) can go.
- A doctrine's own page is already the revamped one (r3-13).

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

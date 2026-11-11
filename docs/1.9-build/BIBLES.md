# 1.9: public-domain Bibles, the first six languages

Item 21 of `PLAN.md`. His words (2026-11-06): "version 1.9 is going to include
a bunch of different Bible public domain translations ... in other languages
too ... if they pick a Romanian Bible ... a pop-up ... do you want to change
the translation of the app to Romanian also? And also add a button to click
never show again." His order for the first six: Romanian, Russian, Greek,
Serbian, Arabic, Spanish (Claude's pick, his "let's do that").

Researched 2026-11-06 by a research agent, from catalogue and licence pages
read through web search (this environment refused ebible.org and Wikipedia
directly, so each line is re-checked against the file itself before import).
Nothing downloaded yet. "US PD" means published before 1931.

## What to ship first

| Language | Text | Tradition | Old Testament | Source | Status |
|---|---|---|---|---|---|
| Russian | Synodal 1876 (Holy Synod; the Russian Church's standard) | Orthodox | Masoretic with bracketed Septuagint words; Psalms numbered as the Septuagint; full editions carry the deuterocanon | CrossWire `RusSynodal` 1.9.1 (Public Domain; 78 books with the deuterocanon; text from the Russian Bible Society or patriarchia.ru) | chosen 2026-11-07, the owner's pick "find the full edition": eBible's `russyn` has the 66 books only |
| Greek | Patriarchal New Testament 1904 (Antoniades; the Patriarchate's text) and the Septuagint as Brenton printed it (1851) | Orthodox | Septuagint, with the deuterocanon | eBible `grcbyz` (1904, 20 corrections from later editions) and `grcbrent` (52 books), both Public Domain | checked 2026-11-07 against the files: complete |
| Arabic | Smith and Van Dyck 1865 | Protestant mission; used and sold by the Antiochian Orthodox | Masoretic, no deuterocanon | eBible `arb-vd` (PD) | ready, once its label is decided |
| Serbian | Karadžić New Testament 1847, Daničić Old Testament 1867 (the 1868 Bible) | Bible Society | Masoretic, no deuterocanon | eBible `srp1868` (PD) | check: that file was modernized by an unnamed editor; the Church's own 1984 New Testament is under copyright |
| Spanish | Reina-Valera 1909 | Protestant | Masoretic, no deuterocanon | eBible `spaRV1909` (PD) | ready, once its label is decided; no Orthodox Spanish text is public domain. Torres Amat (1825, Catholic, with the deuterocanon) needs digitizing first |
| Romanian | Synodal Bible 1914 (Holy Synod) | Orthodox | Septuagint, the deuterocanon expected | archive.org `biblia-1914-v123` (uploader's public-domain mark), OCR | needs his word and proofing: the only shippable Romanian text. Cornilescu (1924) is under copyright in Romania until 2045 |

## What needs him (or a lawyer)

1. **Protestant texts in an Orthodox app.** Arabic, Serbian and Spanish have no
   public-domain Orthodox text ready. Ship them labelled for what they are
   (their tradition, a Hebrew Old Testament, no deuterocanon), or wait.
   The label's wording is an editorial and clergy call.
2. **Romanian 1914:** relies on reading the Synod's Bible as a collective work
   (70 years from 1914, lapsed in 1984) and on an uploader's public-domain
   mark; the OCR must be proofed against the scan before import.
3. **Cornilescu:** public domain in the USA only. Recommendation: no.
4. **Serbian 1868:** whether the modernized file adds protectable work; the
   older Latin file (`srp1865`) may be the safer base.
5. Smaller: the Reina-Valera 1909 revisers' dates (low risk); Antoniades' dates
   rest on one catalogue record.

## How readers get them

The owner, 2026-11-07: "make it so that the user picks to download the selected Bible
... instead of the app including all of them downloaded already". Each Bible is a
file on the website, downloaded to the phone when a reader picks it, read in its
own numbering (Psalm 50:3 in the Synodal is "Have mercy upon me", verse 1 in the
app's English), and removable to free the space.

## What shipped (2026-11-07)

Two Bibles, each a file a book on the website (`public/bibles/<bible>/`, made by
`scripts/bibles/build.mjs`, the Russian read from CrossWire's module by
`scripts/bibles/sword-extract.py`), listed in the translations under their
languages, downloaded to the phone from there, and read straight from the
website on the website. The apps carry only the list (`data/bibles/catalog.json`).

| Bible | Books | On the phone | To download |
|---|---|---|---|
| Синодальный перевод (1876) | 78, with the deuterocanon | 7.5 MB | 1.8 MB |
| Οι Εβδομήκοντα και το Πατριαρχικό κείμενο (1904) | 77 (no 2 Esdras, which survives in Latin) | 8.8 MB | 2.0 MB |

**Each keeps its own numbering, chapters and verses.** The app's page for a
chapter shows the Bible's chapter of that number. Where an edition divides a
book otherwise than the app's English, nothing is renumbered: the Greek's
Joel is in four chapters, as Greek Bibles print it, and its fourth follows its
third on the app's last page of Joel; its Malachi is in three, so the page for
Malachi 4 says the verses are in chapter 3 (3:19-24) and leads there; its
Proverbs 30 stands in its chapter 24, as the Septuagint orders it, and that
page says so. The Synodal's Jeremiah is in the Hebrew order. A chapter that
begins past verse 1 in the Greek (1 Samuel 13, Jeremiah 2) is the Septuagint
lacking those verses, not a fault.

**Mended, and named in the build script and its tests:** in the Synodal
module, a translator's note held as text in Job 2:9 and 9:9 (left out, as
every footnote is) and Psalm 144's title stranded at the end of 143:15 (set
back at the head of 144:1, where the Synodal prints it); in the Greek, the
Septuagint's Esdras B set as Ezra and Nehemiah, Susanna and Bel as Daniel 13
and 14, and Sirach's prologue, which the file numbers 1 and 1a to 1g with the
book's first verse as 1h, set before verse 1 unnumbered. The Greek New
Testament's footnotes (the 1904 printing's readings where later editions
corrected it) are left out. 4 Maccabees is in the Greek file and not among the
app's books. One verse of the module is empty: Psalm 114:9, whose words the
module holds at the end of 114:8; left as the module has it.

**What the downloaded text does not have yet:** the Fathers, highlights,
notes, cross-references and the Greek beside the verse are keyed to the
English verses, and these are numbered apart; they wait on the verse-number
map (item 22). Listen reads the English, so a chapter in a downloaded Bible
has no Listen. On the website a hard load of a chapter shows the English for
a moment before the chosen Bible (the choice is on the device, which the
server cannot see); a move between chapters does not.

**For the owner and the clergy to read:** the one line under each Bible's
name in 21 languages calls the deuterocanon "deuterocanonical" in English and,
as each Church says it, "неканонические" in Russian and "αναγινωσκόμενα" in
Greek. Those lines are the only words about the Bibles that are ours.

## What shipped (2026-11-09): the Serbian, Arabic and Spanish

His answer on the sheet's 15, the labels and the clergy: "we can't really get
it checked by priests right now, so just, I guess, do your best". So the
three Bibles of the Hebrew canon are built, each labelled for what it is, and
the label lines wait for the clergy whenever they can read them. His word on
their release, late 2026-11-09: "Yes, the three new Bibles should go in
version 1.9."

| Bible | Books | On the phone | To download (gzip) |
|---|---|---|---|
| Превод Вука Караџића и Ђуре Даничића (1868) | 66 | 5.8 MB | about 1.4 MB |
| ترجمة فاندايك (1865) | 66 | 7.7 MB | about 1.6 MB |
| Reina-Valera (1909) | 66 | 4.2 MB | about 1.4 MB |

Sources, checked against the files on 2026-11-09 (sha256 in
`scripts/bibles/build.mjs`): eBible `srp1868` (Cyrillic), `arb-vd` and
`spaRV1909`, all Public Domain. Each is numbered as the English Bibles are
(Joel in three chapters, Malachi in four, the Psalms as the Hebrew numbers
them), with its own turns where its edition has them.

**The lines under each name (ours, for the clergy to read):** in English,
"A Protestant translation. Its Old Testament is from the Hebrew, without the
deuterocanonical books. Public domain." for the Arabic and the Spanish, and
"Its Old Testament is from the Hebrew, without the deuterocanonical books.
Public domain." for the Serbian, whose translators were Orthodox. Each of the
21 languages says the deuterocanon as it already does for the Synodal. The
source line under a chapter names the translators and the year, and for the
Serbian, "in the Ekavian form of later editions".

**Mended, and named in the build script and its tests:**

- A psalm's title is the opening line of its psalm, unnumbered, as the
  editions print it (the Arabic and Serbian files mark it; the Spanish file
  runs it into verse 1, and it is set apart again at the psalm's first word
  in capitals, the edition's own mark: 124 psalms). The app's English has no
  titles, so verse 1 is verse 1 in Compare too.
- The Spanish file keeps 18 verse numbers with no words, where the edition
  sets the words in the verse before or after (its Numbers 13:1 is the
  English's 12:16, its Acts 19:40 ends with 19:41): left out, so the page
  numbers as the edition does. The notes after Paul's fourteen letters
  ("Fué escrita de Corinto á los Romanos..."), which the file runs on after
  the last "Amén.", are the edition's apparatus and are left out, as the
  app's English leaves the King James Bible's out. Psalm 119's Hebrew
  letters over its stanzas are headings, left out as the Arabic's are.
- The Arabic begins Nehemiah 8 and Jeremiah 39 with words printed before
  verse 1 (the end of a sentence that runs on into it): kept there, as the
  opening line. "(to verse 73)" over Nehemiah 7 is a reader's pointer, not
  words of the book: left out. Its vowel marks are stored in Unicode's
  composed order (NFC), as every other Bible's already were; the text is the
  same mark for mark.
- Psalm 151 and Daniel 13 and 14 (Susanna, Bel) are not in these Bibles:
  their pages show the English and say "This chapter is not in this Bible,
  so it is shown in English."
- The Arabic reads right to left whatever the app's language.

**Compare** places 95.0% of the app's verses in the Serbian, 96.2% in the
Arabic and 95.0% in the Spanish (the Synodal 91.3%, the Greek 94.9%). Not
placed: Esther (the app's is the Septuagint's, with its additions), Daniel 13
and 14, Psalm 151, and the chapters where an edition turns otherwise than the
English standard says and the texts cannot settle where (the Spanish's
Numbers 13 and Jonah 2): left out rather than shown wrong.

**Still open:**

- **Romanian 1914:** not built. It needs his word on the legal footing above
  (item 2) and proofing of the OCR against the scan before import.
- **Serbian:** the file is the Ekavian form of later editions, and eBible's
  Latin `srp1865` is the same text letter for letter once transliterated
  (checked 2026-11-09), so it is no safer base. It ships in 1.9 on its
  source's public-domain mark (eBible marks the file Public Domain); whether
  the change from the 1868 Ijekavian adds protectable work (item 4 above) is
  still a question for him.

## What shipped (2026-11-11): the Portuguese

His yes to call 23 under his "rec for all and finalize this build": "Almeida
1911, as the card said: verbatim in its 1911 spelling, labelled like the
Spanish ("A Protestant translation. Its Old Testament is from the Hebrew,
without the deuterocanonical books. Public domain."), the transcription's
makers and licence named in the credits."

| Bible | Books | On the phone | To download (gzip) |
|---|---|---|---|
| Almeida (1911) | 66 | 4.2 MB | about 1.4 MB |

**Source:** CrossWire's module `PorAlmeida1911`, version 0.2.1 (2022; first
released 2017-08-17 as "OCRd and proofread text"): in its own words, the 1911
reprint of an edition of 1900 of João Ferreira de Almeida's translation, made
in the 17th century. Its text source is the transcribers' site,
manuscript4u (sites.google.com/site/manuscript4u). The translation is public
domain by its age; the module is distributed under the GNU GPL ("for
distribution for any purpose"), so the source line under each chapter names
the transcribers and the licence: "Almeida's translation (1911). Public
domain. Transcribed by manuscript4u (2017); text from the CrossWire Bible
Society, under the GNU GPL." in each of the 21 languages. Read through
`scripts/bibles/sword-extract.py` (pysword 0.2.8), as the Synodal is, and
built by `scripts/bibles/build.mjs --pt`.

**As printed, and what the transcription has:**

- Every verse is the module's, in the 1911 spelling ("No principio creou Deus
  os céus e a terra."); markup is taken out and spaces evened, and nothing
  else. The module holds no escaped markup, so nothing was mended.
- It numbers as the King James Bible does: Joel in three chapters, Malachi in
  four, the Psalms as the Hebrew numbers them (Psalm 51 is "Tem misericordia
  de mim, ó Deus"). The blessing at the end of 2 Corinthians is its 13:13, as
  Portuguese Bibles number it; the English count's 13:14, empty in the
  module, is left out (the build counts it, 1, and fails on any other count).
- The transcription has no psalm titles, though the printed edition has them,
  so its psalms begin at verse 1.
- Psalm 151 and Daniel 13 and 14 are not in it: their pages show the English
  and say so, as for the other Bibles of the Hebrew canon.

**Compare** places 95.6% of the app's verses in it (the Serbian 95.0%, the
Arabic 96.2%, the Spanish 95.0%). Not placed: Esther (the app's is the
Septuagint's, with its additions), Daniel 13 and 14, Psalm 151, and the
chapters where the numbering turns otherwise than the English standard and
the texts cannot settle where (Exodus 36 to 38, Job 16 and 35, Jeremiah 25
and 34, Ezekiel 7): left out rather than shown wrong. The Plus screen's
Compare preview shows it beside the others at its Psalm 51:1.

**Still open:** the GPL asks that its terms travel with the text. The source
line names the licence; a link to its text (gnu.org/licenses/gpl) from the
credits is not there yet, and is for him to decide with the credits page.

## What shipped (2026-11-11): the Hebrew beside the Old Testament

The Discord's "Add Hebrew" (2026-11-10): "The Hebrew beside the Old
Testament books, as the Greek is beside the New." For 1.9 on the owner's word
of 2026-11-11 ("No, not 1.9.1") and the arbiter's: the Westminster Leningrad
Codex, pointed, without cantillation, as a study aid. The Church's Old
Testament is the Septuagint, and the app's English Old Testament is Brenton's
translation of it; the Hebrew is never offered as the app's Old Testament, only
set beside it in the interlinear.

- **The text.** CrossWire's `WLC` 2.0 (its conf: `DistributionLicense=Public
  Domain`; from the Westminster Hebrew Institute and tanach.us), read with
  pysword by `scripts/bibles/hebrew-extract.py` into `data/bible/hebrew/`
  (4.9 MB, one file per book in the downloaded Bibles' shape). The codex's 39
  books and 23,213 verses, in its own numbering (Leningrad, which the
  Copenhagen maps call "org"). Only marks are taken away, never a letter: the
  accents (U+0591 to U+05AF), the meteg, the paseq and the joiner. The points,
  the dagesh, the shin and sin dots, the maqaf and the sof pasuq stay.
- **Written and read (ketiv and qere).** The module gives both, the written
  word unpointed and then the word read, pointed. The written one is set in
  round brackets before it, so the line reads as it is read and says what is
  written: Genesis 8:17, "(הוצא) הַיְצֵא". 1,032 such words; nine of them are
  written and not read, or written as two words and read as one, and stand in
  brackets the same way.
- **Its places.** `scripts/bibles/compare-map.mjs`, as for Compare, with the
  original-language numbering as its own standard (its verse counts are the
  codex's): app, KJV, the English standard, the original, then the verses'
  lengths. `data/bibles/maps/he-wlc.json` (CC BY-SA 4.0, from the Copenhagen
  Alliance's mappings, credited under the Hebrew's note in Compare's words).
  Most books are placed whole or nearly (Genesis 1,503 of 1,529 verses, the
  Psalms 2,427 of 2,467). Left out: Psalm 151 and Susanna and Bel (Daniel 13
  and 14), which the Hebrew lacks; nine chapters the Septuagint orders or
  divides otherwise (Exodus 37 and 38, Numbers 29, Joshua 20, 1 Samuel 5, Job
  35, Jeremiah 25 and 34, Ezekiel 7); about 500 single verses whose lengths
  do not answer (Daniel 3:9 and 3:10 among them); and Esther whole, whose
  Greek runs too far from the Hebrew to pair, where the reader offers no
  interlinear anyway.
- **What is said where none stands.** Only what is sure is said to be missing
  from the Hebrew: a whole book ("This book is not in the Hebrew Bible."),
  and Psalm 151, Susanna and Bel ("This chapter is not in the Hebrew
  Bible."). Everywhere else the map cannot tell a verse the Hebrew lacks from
  one it could not place surely (it leaves Genesis 8:4 and 8:5 unplaced, which
  the Hebrew plainly has), so a chapter says "Here the Hebrew and the
  Septuagint do not answer verse for verse, so the Hebrew is not set beside
  this chapter." and a run of verses, once at its first verse, "No verse of
  the Hebrew is set beside verses 22 to 90." The note over a chapter: "The
  Hebrew text (the Westminster Leningrad Codex), as a study aid. The Church's
  Old Testament is the Septuagint.", and where brackets occur, "A word in
  brackets is written in the Hebrew, and the word after it is read." All in
  the 21 languages.
- **On the page.** With the interlinear on, under each verse, under the Greek
  across both columns, or under the English where the chapter has no Greek:
  right to left (`lang="hbo"`, which `lib/i18n/textDir.ts` now knows), in
  Cardo, the interlinear's own face, now with its Hebrew subset (fetched only
  when Hebrew is drawn), with its own place in the Hebrew before it (the
  Septuagint's Psalm 22 has the Hebrew's 23:1). It travels in the chapter's
  interlinear file (`app/bible-data/interlinear/`), so the apps carry it and
  it reads with no signal. A chapter whose Greek is numbered apart keeps its
  Hebrew, and Ezra, where Swete's Greek does not reach here, has the Hebrew
  alone. `lib/bible/__tests__/hebrew.test.ts` holds the text,
  the map and the page.
- **Its Aramaic.** The codex's Aramaic (Daniel 2:4 to 7:28, Ezra 4:8 to 6:18
  and 7:12 to 26, Jeremiah 10:11) stands as the codex has it: "the Hebrew
  text" is the Hebrew Bible's text, its Aramaic with it, as the note says of
  the whole.
- **Walked** on the export as the app with no signal and the interlinear on,
  in English and in Arabic: Genesis 1 has the Hebrew under each of its 31
  verses, right to left, in Cardo, with the Greek; the Septuagint's Psalm 22
  has the Hebrew's 23:1; Daniel 3 says its runs once each (verses 9 to 10, 22
  to 90, and 97); Tobit, Psalm 151 and Exodus 38 each say why none stands;
  Ezra has its Hebrew alone. `checkMock` on the note and on Genesis 1:1, and
  on the note in Arabic: every check passes. The Hebrew adds 4.9 MB to the
  interlinear's files (34.4 MB, 1,263 files, 195 of them the Hebrew alone).
  Still: `notes/build-93/hebrew-beside-ot-390.png`.

## How it fits the app

- Every Bible needs the verse-number map (item 22): texts numbered as the
  Hebrew number the Psalms one ahead of the Septuagint; the app already
  carries both numberings by whole psalm (`lib/bible/psalmNumbers.ts`).
- `lib/bible/translations.ts` already groups translations by language
  (`byLanguage`); each new Bible is a row with its language, its tradition and
  its source line.
- The language prompt: picking a Bible in another language than the app's
  offers the app in that language, with Switch, Not now and Never ask again.

Sources the research relied on: https://ebible.org/Scriptures/copyright.php,
https://ebible.org/details.php?id=russyn,
https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=RusSynodal,
https://ebible.org/bible/details.php?id=grcbyz,
https://github.com/byztxt/greektext-antoniades,
https://ebible.org/find/details.php?id=grcbrent,
https://ebible.org/find/details.php?id=arb-vd,
https://ebible.org/bible/details.php?id=srp1868,
https://ebible.org/spaRV1909/copyright.htm,
https://archive.org/details/biblia-1914-v123,
https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/Romania,
https://crosswire.org/sword/modules/ModInfo.jsp?modName=RomCor,
https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=WLC (its conf, read from the module itself).

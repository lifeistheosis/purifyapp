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
https://crosswire.org/sword/modules/ModInfo.jsp?modName=RomCor.

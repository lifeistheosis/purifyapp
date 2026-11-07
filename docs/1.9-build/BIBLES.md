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

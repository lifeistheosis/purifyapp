# Read-aloud cover provenance

The covers on the read-aloud player (1.7): an icon of each book's saint or
prophet on Now Playing, the mini player and the lock screen, for all 78
books of the Bible. The owner's note 9 of 2026-10-16 (an icon of the book's
saint, "John shows the Apostle John", clear and tied to the book) and his
answer the same day: the Old Testament too, Moses, David and the prophets.
Policy, matching `SECTION_MEDIA.md`, `audio-provenance.md` and
`icon-provenance.md`: **a cover ships only if its source and licence are
documented here.** The same records are the `FIGURES` registry in
`lib/readAloud/covers.ts`, which `lib/readAloud/__tests__/covers.test.ts`
holds.

**Public domain only.** A cover carries no credit line, so it must need none.
Every file below is public domain or CC0 as its own Commons page states it,
read on 2026-10-16 (the file's `LicenseShortName`, and the licence template on
the page). `scripts/fetch-read-covers.mjs` reads it again on every run and
writes nothing that fails. CC BY and CC BY-SA are rejected, including a
photographer's CC BY-SA photograph of an old icon: most of the "Kremlin
exhibition" photographs of the Kirillo iconostasis are of that kind. No
licence here is inferred.

**Every picture was opened and looked at** before it was cut, and every cut
was opened again at full size: the figure is the one the book is about, read
from the icon's inscription, or its scroll where the name has worn away; the
whole head is in, crown and cap too; nothing outside the figure's own painted
panel shows (no frame, no white photo background, no clamp, no part of a
neighbour); and it is sharp at the size it is shown. A valid licence has
produced the wrong picture before (`SECTION_MEDIA.md`, "Rejected"), and it
nearly did here: see Zechariah below.

**Who is shown** is the Church's tradition as Before you read gives it
(`data/bible/intros/facts.json`), by the rules in `lib/readAloud/covers.ts`:
a book named for a holy person shows that person; otherwise the person its
"by" line names; otherwise the manuscript plate. Every mapping is marked for
the future clergy review. No priest reviews Purify yet (the owner,
2026-10-16), so nothing waits on one.

**Where they live.** `public/covers/` on the website, served to the apps from
purifyapp.net (`lib/media/streamed.ts`, the way chant recordings are), and
never inside the apps: the native build sets the folder aside
(`scripts/native-build.mjs`). An app with no signal shows the plate the apps
carry, `/sections/bible.jpg` (`SECTION_MEDIA.md`), in the cover's place. Each
file is 1024 by 1024, a square cut from the source and saved with mozjpeg,
under 200 KB; the 28 are 4.3 MB together. A replacement gets a new version
in its name (`moses.v2.jpg`), and taking a file off the website takes it out
of every app within a day.

**Also shown (1.8).** Job's cover is the icon beside the walk's note "Who Job
is", cut to his crowned head in the page (`lib/walkthroughs/people.ts`). A new
version of the file is named there too; `lib/walkthroughs/__tests__/people.test.ts`
fails until it is.

## Shipped

Downloaded originals were kept outside the repository
(`Homebase/tools/covers/originals/<id>/`, one per folder) and are not needed
to build anything. Squares are in `scripts/fetch-read-covers.mjs`.

| File | Figure | Books | Work | Artist | Date | Licence | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `moses.v1.jpg` | The Prophet Moses | Genesis to Deuteronomy | Moses, detail of an icon at St Catherine's Monastery, Sinai | Unknown | Third quarter of the 13th century | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Moses_Icon_Sinai_13th_century_detail.jpg) |
| `joshua.v1.jpg` | The Righteous Joshua | Joshua | Joshua, fresco, Hosios Loukas Monastery | Unknown | 10th century, as the page gives it | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Byzantine_fresca_from_St-Lucas.jpg) |
| `samuel.v1.jpg` | The Prophet Samuel | Judges, Ruth, 1 and 2 Samuel | Kirillo-Belozersky iconostasis, prophets row, board 02 (right) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_02._Nathan,_Haggai,_Samuel.jpg) |
| `jeremiah.v1.jpg` | The Prophet Jeremiah | 1 and 2 Kings, Jeremiah, Lamentations, Epistle of Jeremiah | the same, board 01 (middle) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_01._Habakkuk,_Jeremiah,_Jonah.jpg) |
| `job.v1.jpg` | The Righteous Job | Job | The Righteous Job, icon, northern Russia | Russian (Mstera), as the page names it | Late 17th century by its description, circa 1800 by its date field | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Icon_of_Job_(North_Russia,_17_c.).jpg) |
| `david.v1.jpg` | The Prophet and King David | Psalms | Kirillo-Belozersky iconostasis, prophets row, board 04 (middle) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_04._Daniel,_David,_Solomon.jpg) |
| `solomon.v1.jpg` | King Solomon | Proverbs, Ecclesiastes, Song of Solomon, Wisdom | the same, board 04 (right) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_04._Daniel,_David,_Solomon.jpg) |
| `hosea.v1.jpg` | The Prophet Hosea | Hosea | the same, board 06 (left) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_06._Hosea,_Amos,_Zephaniah.jpg) |
| `amos.v1.jpg` | The Prophet Amos | Amos | the same, board 06 (middle) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_06._Hosea,_Amos,_Zephaniah.jpg) |
| `micah.v1.jpg` | The Prophet Micah | Micah | the same, board 03 (left) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_03._Micah,_Elijah,_Gideon.jpg) |
| `joel.v1.jpg` | The Prophet Joel | Joel | the same, board 07 (right) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_07._Elisha,_Zechariah,_Joel.jpg) |
| `jonah.v1.jpg` | The Prophet Jonah | Jonah | the same, board 01 (right) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_01._Habakkuk,_Jeremiah,_Jonah.jpg) |
| `nahum.v1.jpg` | The Prophet Nahum | Nahum | the same, board 08 (right) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_08._Malachi,_Naum.jpg) |
| `habakkuk.v1.jpg` | The Prophet Habakkuk | Habakkuk | the same, board 01 (left) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_01._Habakkuk,_Jeremiah,_Jonah.jpg) |
| `zephaniah.v1.jpg` | The Prophet Zephaniah | Zephaniah | the same, board 06 (right) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_06._Hosea,_Amos,_Zephaniah.jpg) |
| `haggai.v1.jpg` | The Prophet Haggai | Haggai | the same, board 02 (middle) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_02._Nathan,_Haggai,_Samuel.jpg) |
| `malachi.v1.jpg` | The Prophet Malachi | Malachi | the same, board 08 (left) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_08._Malachi,_Naum.jpg) |
| `isaiah.v1.jpg` | The Prophet Isaiah | Isaiah | the same, board 05 (middle) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_05._Ezekiel,_Isaiah,_Jacob.jpg) |
| `ezekiel.v1.jpg` | The Prophet Ezekiel | Ezekiel | the same, board 05 (left) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_05._Ezekiel,_Isaiah,_Jacob.jpg) |
| `daniel.v1.jpg` | The Prophet Daniel | Daniel | the same, board 04 (left) | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_04._Daniel,_David,_Solomon.jpg) |
| `matthew.v1.jpg` | St Matthew the Evangelist | Matthew | The Apostle Matthew, icon | Unknown | Not given on the page | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:The_Apostle_Matthew.jpg) |
| `mark.v1.jpg` | St Mark the Evangelist | Mark | St Mark the Evangelist | Emmanuel Tzanes | 1657 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Tzanes_Emmanuel_-_St_Mark_the_Evangelist_-_Google_Art_Project.jpg) |
| `luke.v1.jpg` | St Luke the Evangelist | Luke, Acts | St Luke, miniature in the Ostromir Gospels | Unknown | 1050s | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Ostromir_luke.jpg) |
| `john.v1.jpg` | St John the Theologian | John, 1 to 3 John | Kirillo-Belozersky iconostasis, deesis row, no. 07 | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_07_-_John_Evangelist.jpg) |
| `johnPatmos.v1.jpg` | St John the Theologian, on Patmos | Revelation | St John the Evangelist and Prochorus on Patmos | Emmanuel Lambardos | 1602 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:John_the_Evangelist_and_Prochorus_by_E.Lambardos_(1602).jpg) |
| `paul.v1.jpg` | St Paul the Apostle | Romans to Philemon, Hebrews | Kirillo-Belozersky iconostasis, deesis row, no. 14 | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_14_-_Paul.jpg) |
| `james.v1.jpg` | St James, brother of the Lord | James | St James the Brother of the Lord | Stephanos Tzangarolas | 1688 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Tzangarolas_Stephanos_-_St_James_the_Brother_of_the_Lord_-_Google_Art_Project.jpg) |
| `peter.v1.jpg` | St Peter the Apostle | 1 and 2 Peter | Kirillo-Belozersky iconostasis, deesis row, no. 08 | Anonymous Russian icon painters | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_08_-_Peter.jpg) |

Notes, by file:

- **The Kirillo boards** (prophets row, 01 to 08, and the deesis row) are the
  iconostasis of the Dormition Cathedral of the Kirillo-Belozersky
  Monastery, about 1497. The pages state PD-Art (PD-old-70) and
  PD-Russia-expired. Each board holds three half-length prophets (08 holds
  two). Every figure was named from its inscription where one survives, and
  from its scroll where it has worn away (Habakkuk 3:3, Jonah 2:3, Micah 5:2,
  Joel 2:28 and so on), checked against the monastery museum's list of the
  boards; the Commons titles run left to right. Paul alone has neither
  inscription nor scroll: he is named by his type, his place in the deesis
  row opposite Peter, and the title. Board 04 ends just above David's and
  Solomon's crowns and Daniel's cap, with the board's hanging clamps above,
  so those crowns sit near the top of their squares. Haggai's ground is worn
  to its white gesso; that is the icon's own surface.
- **Moses**: the thin red ring of his halo runs off the left of this detail
  scan, so the square holds the whole head and not the whole ring. The red
  letters at its right edge are cut off and unreadable; he is named by the
  page's description (Weitzmann, "Die Ikone"). The page's date field is the
  upload date; the description gives the third quarter of the 13th century.
- **Joshua**: inscribed "ΙΣ Ο ΤΟΥ ΝΑΥΗ". A scan from a printed book
  (Chatzidakis, Byzantine Art in Greece, 1997, as the page cites it), so a
  3px median took out the printer's screen.
- **Job**: inscribed "ІОВ ПРАВЕДНЫЙ". The page contradicts itself on the date
  (late 17th century in the description, circa 1800 in the date field); both
  are given above. Its square is 654px, as small as the Kirillo prophets'.
- **Matthew**: the page states CC0 and names no painter and no date; its
  source is the PSTGU icon archive (icons.pstgu.ru, item 1429). The pale board
  joint down the left of the panel is left out of the square.
- **Mark**: chosen over a 14th-century Hilandar Mark (CC0 on its page) whose
  face has a crack down it. The square leaves out the hand of God at the top
  right and his name beside him.
- **Luke**: the same Commons file as the Reading section's plate
  (`SECTION_MEDIA.md`), cut from a 3840px copy of the 4565px original. The
  white flecks on his robe are paint losses on the page.
- **John on Patmos**: the scroll beside him opens the Revelation
  ("ΑΠΟΚΑΛΥΨΙΣ ΙΥ ΧΥ"). The file is small (0.6 MB) for its size; the square
  is near its native size.
- **James**: inscribed "Ὁ ΑΓΙΟΣ ΙΑΚΩΒΟΣ Ὁ ΑΔΕΛΦΟΘΕΟΣ" (not James of Alphaeus or
  of Zebedee). The square leaves out the red of the panel's corner and his
  name to the left.

## The plate

These books show the manuscript plate, `/sections/bible.jpg` (the Codex
Sinaiticus, `SECTION_MEDIA.md`), and the line under the title says "Read
aloud" rather than a name: 1 and 2 Chronicles, 1 Esdras, Ezra, Nehemiah,
Tobit, Judith, Esther, 1 to 3 Maccabees, Sirach, Obadiah, Zechariah, Baruch,
the Prayer of Manasseh, 2 Esdras and Jude. Either no holy person is named for
them, or no public-domain icon of the one named passed. Ruth shows Samuel, whom
her "by" line names, because no icon of Ruth passed.

## Rejected, and why

Kept so the same candidates are not picked again. **The licence field will
not tell you any of this. Open the image and look at it.**

| Candidate | Why rejected |
| --- | --- |
| `File:Kirillo-Belozersky iconostasis 07. Elisha, Zechariah, Joel.jpg`, middle figure | Titled Zechariah and inscribed "ЗАХАРИА", but he wears a priest's hat and his scroll is the Benedictus (Luke 1:68): Zechariah the priest, father of the Forerunner, not the prophet of the book. The book of Zechariah has the plate. |
| `File:Пророк Захария Prophet Zachariah.jpg` | CC0, but the same wrong Zechariah (the Luke 1:68 scroll). |
| `File:Prophets from Ferapontov05 (Kirillo-Belozersk).jpg` (Zechariah the Sickle-seer) | The right prophet, but his face is blackened, cracked and under glare. |
| `File:Saints Maccabees.jpg` | The right subject (embroidered names), but 700x590: each head about 45px, and the nine halos wider than any square. No other public-domain Orthodox Maccabees passed. |
| `File:Icon of Moses (17th c., North Russia, priv. coll.).jpg` | Inscribed, but any square that holds his whole halo shows white photo background where the arched top meets it. |
| `File:Apokalipsis XVI.jpg` | Shows St John on Patmos with Prochorus, but as one small scene: his head is about 40px. |
| `File:Icon of Apostle Jude Thaddeus, Saint Catherine's, Sinai.jpg` | Filed on Commons as Thaddeus of Edessa, one of the Seventy, not Jude the brother of the Lord; also 681x1200. |
| `File:Baruch (Kirillo-Belozersk).jpg` | 17th century, Kirillo-Belozersky, but a soft museum photograph with glare and a face in shadow, about 640px. |
| `File:Obadiah (Овдий).jpg` and the Kizhi prophets row | Public domain, but about 430x500. |
| `File:Fethiye Camii, parekklesion, dome, mosaics ... - Zechariah and Obadiah - ...` (Dumbarton Oaks) | Mislabelled: the mosaic's own inscriptions read Isaiah and Moses, and Jeremiah and Zephaniah. |
| `File:Pammakaristos Church Main dome mosaic Obadiah in 2016 07 1086.jpg` | CC BY-SA 4.0. |
| `File:Righteous Ruth.jpg`, `File:Righteous Esther.jpg` | 175x175 details of an icon whose large photographs are all CC BY-SA. |
| `File:Prophet Esdra und Erzengel Uriel.jpg` | Two figures on a late 18th-century Moldavian panel; Ezra's square would be well under the prophets'. |
| `File:Икона евангелиста Марка Icon of Mark the Evangelist.jpg` | A crack runs down his face; the Tzanes Mark was chosen. Its page claims the 2005 scan as the uploader's own work. |
| "Kremlin exhibition" photographs of the Kirillo iconostasis, `File:Prophets01 (Kirillo-Belozersk).jpg`, `File:Prophets02 (Kirillo-Belozersk) 1.jpg` to `4.jpg` | Larger, but CC BY-SA. |
| `File:Prophets from Ferapontov01.jpg` to `05` and the Sergiev Posad prophets of the 1420s | Public domain, but museum photographs with glare and faces darkened to silhouettes. |

## Adding or replacing a cover

1. Find a public-domain file on Commons, ideally from the same Kirillo boards
   or another Russian or Byzantine icon of the 15th to 17th century, so the
   set reads as one. Open it.
2. Add the figure to `COVERS` in `scripts/fetch-read-covers.mjs` with its
   square, and run `node scripts/fetch-read-covers.mjs --cache <a folder
   outside the repository> --only <id> --sheet <png>`. The script refuses a
   file whose page does not state public domain or CC0.
3. **Open the cover and look at it**, at full size: the right figure, the
   whole head, nothing outside its panel, sharp.
4. Add or change its entry in `FIGURES` and `BOOK_COVERS`
   (`lib/readAloud/covers.ts`), its name in all 21 catalogs, and its row
   above. A replaced picture gets the next version in its name. The covers
   test fails on a missing field, a missing name, a file that is not a 1024px
   square JPEG under 200 KB, or a book that shows someone neither its name nor
   its "by" line names.

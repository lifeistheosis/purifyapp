# Saint hero picture provenance

The pictures at the top of a saint's page on a phone (1.7): the saint's icon
across the screen's full width, under the clear top bar, melting into the
page below his name. The owner's note 19 of 2026-10-16 ("the icon full width
at the top") and his yes the same day to downloading public-domain icons
from Wikimedia Commons for the covers and the saints. Policy, matching
`READ_COVERS.md`, `SECTION_MEDIA.md` and `icon-provenance.md`: **a picture
ships only if its source and licence are documented here.** The same records
are the `SAINT_HEROES` registry in `lib/saints/heroes.ts`, which
`lib/saints/__tests__/heroes.test.ts` holds.

**Why only some saints have one.** A phone's full width wants a picture
about a thousand pixels across. The icons the app carries
(`public/saints/icons/`) are 420 pixels tall at most, and one of them
stretched across a phone is the blurry photo the owner already sent back
once. So a saint has a hero only where a public-domain icon of him was found
at that size; every other saint keeps his own icon at its own size on the
dark plate, never enlarged. A new hero is one row in `lib/saints/heroes.ts`,
one cut in `scripts/fetch-saint-heroes.mjs` and one row here.

**Public domain only.** A hero carries no credit line, so it must need none.
Every file below is public domain as its own Commons page states it, read on
2026-10-16 (the file's `LicenseShortName` and the licence template on the
page). `scripts/fetch-saint-heroes.mjs` reads it again on every run and
writes nothing that fails. No licence here is inferred.

**Every picture was opened and looked at** before it was cut, and every cut
was opened again at full size: the saint is the one the page is about, read
from the icon's inscription, or from the source's list where the inscription
is a metal plate that cannot be read (Gregory, below); the whole head and
halo are in; nothing outside the painted field shows (no raised border of the
board, no white photo background, no hinge, no red board edge, checked for
near-white pixels along every edge); and nothing is enlarged: each file is
cut at the scan's own pixels, 936 to 1,088 wide, four wide by five tall.

**Where they live.** `public/covers/saints/` on the website, served to the
apps from the website the way the read-aloud covers are
(`lib/media/streamed.ts`), and never inside the apps: the native build sets
`public/covers/` aside (`scripts/native-build.mjs`). An app with no signal
shows the saint's own icon on the plate instead. The twelve are 2.5 MB
together, 166 to 310 KB each. A replacement gets a new version in its name
(`basil-the-great.v2.jpg`), and taking a file off the website takes it out
of every app within a day.

**Who is shown** is the saint whose page it is; no picture stands for anyone
else. The attributions are the icons' own and their museums', as the Commons
pages give them.

## Shipped

Downloaded originals were kept outside the repository
(`Homebase/tools/covers/download/saints/<slug>/`, one per folder) and are not
needed to build anything. The cuts are in `scripts/fetch-saint-heroes.mjs`.

Eleven are boards of one set: the deesis row of the iconostasis of the
Dormition cathedral of the Kirillo-Belozersky monastery, 1497, each a
standing figure about 1,200 by 3,000 pixels, the set the read-aloud covers'
prophets and apostles come from, so a saint's page and the player read as
one family. Their Commons pages give the artist as "Anonymous Russian icon
painter (before 1917)", the date 1497 and the licence "Public domain"
(PD-Russia-expired), crediting icon-art.info's page of the row (group 84).

| File | Saint | Work | Date | Licence | Source |
| --- | --- | --- | --- | --- | --- |
| `theotokos.v1.jpg` | The Mother of God | The Theotokos of Vladimir, the Tretyakov Gallery | 12th century | Public domain (PD-Art, PD-old-100) | [Commons](https://commons.wikimedia.org/wiki/File:Vladimirskaja_ikona_Bo%C5%BEiej_Materi.jpg) |
| `john-chrysostom.v1.jpg` | St John Chrysostom | Kirillo-Belozersky deesis, board 16 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_16_-_John_Chrysostom.jpg) |
| `basil-the-great.v1.jpg` | St Basil the Great | the same, board 06 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_06_-_Basil.jpg) |
| `gregory-theologian.v1.jpg` | St Gregory the Theologian | the same, board 05 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_05_-_Gregorius.jpg) |
| `nicholas-the-wonderworker.v1.jpg` | St Nicholas | the same, board 17 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_17_-_Nicholas.jpg) |
| `apostle-peter.v1.jpg` | St Peter | the same, board 08 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_08_-_Peter.jpg) |
| `apostle-paul.v1.jpg` | St Paul | the same, board 14 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_14_-_Paul.jpg) |
| `apostle-john.v1.jpg` | St John the Theologian | the same, board 07 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_07_-_John_Evangelist.jpg) |
| `apostle-andrew.v1.jpg` | St Andrew | the same, board 15 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_15_-_Andrew.jpg) |
| `archangel-michael.v1.jpg` | The Archangel Michael | the same, board 09 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_09_-_Michael.jpg) |
| `saint-george.v1.jpg` | St George | the same, board 19 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_19_-_George.jpg) |
| `peter-of-moscow.v1.jpg` | St Peter, Metropolitan of Moscow | the same, board 18 | 1497 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_18_-_Peter_of_Moscow.jpg) |

How each was named:

- Chrysostom, Basil, John, Andrew, Michael, George and Peter of Moscow: by
  the red inscription on each board naming him, and for Peter of Moscow the
  white cowl of a metropolitan of Moscow as well.
- Peter: the inscription has worn away; the scroll he holds, his curled grey
  hair and beard, and the Commons title. The read-aloud cover of 1 Peter is
  cut from the same board.
- Nicholas: the inscription is on a later metal plate that cannot be read;
  his features are the type no other saint has (the high bald brow, the short
  rounded white beard), and the Commons title names him.
- Gregory: the inscription is on a metal plate that cannot be read. The
  Commons title gives "Gregorius", and the source the file credits
  (icon-art.info, group 84, the row's list) names this row's one Gregory as
  Gregory the Theologian (Григорий Богослов), with Basil the Great and John
  Chrysostom beside him. Marked here so a later look can confirm it.
- The Mother of God: the Vladimir icon, named by its museum and its Commons
  page.

Gregory's and Nicholas's boards carry a later silver cover (basma) over the
ground; their cuts are inside its border band at the sides and keep the top
of it, where their halos reach into it.

## Rejected

- **The Vladimir icon, a scan of a print** (`File:Virgin of Vladimir.jpg`,
  4,384 by 6,384, public domain): the colours are a printed page's, brown and
  flat, with the paper's orange along one side.
- **The Vladimir icon, the familiar saturated photograph**
  (`File:Vladimirskaya ikona.jpg`, 1,500 by 2,232, public domain): its painted
  field is about 920 pixels wide, under the floor. The museum photograph
  above was used.
- **The Vladimir icon in a Batumi church** (`File:Theotokos of
  Vladimir.jpg`, CC0): a modern copy, whose painter's rights a photographer's
  CC0 does not clear.
- **The Kirillo deesis's own Mother of God** (`File:Deisis (Virgin Mary) of
  Kirillo-Belozersky iconostasis (15th century, Russia).jpg`): 400 pixels
  wide.
- **The Kirillo deesis's two Simeons** (boards 01 and 21, the stylites): 580
  and 598 pixels wide, half boards.

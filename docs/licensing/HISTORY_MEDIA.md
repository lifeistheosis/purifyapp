# Orthodox History picture provenance

One picture at the top of each event of Orthodox History (1.7): the owner's
note 20 of 2026-10-16 (History "needs better structure and photos") and his
word the same day that the photos are wanted, one per event and free for
every reader. Policy, matching `SAINT_HEROES.md`, `COVER_ICONS.md` and
`SECTION_MEDIA.md`: **a picture ships only if its source and licence are
documented here.** The same records are the `media` of each event in
`lib/history/events.ts`, which `lib/history/__tests__/events.integrity.test.ts`
holds (every field present, the file on disk and a real picture, the licence
in the allowed set).

**Public domain only, for the twenty of 1.7.** Every file below is public
domain or CC0 as its own Commons page states it, read on 2026-10-16 (the
file's `LicenseShortName` and the licence section of the page).
`scripts/fetch-history-media.mjs` reads both again on every run and writes
nothing that fails, nor anything whose licence section also names a CC BY,
BY-SA or GFDL licence. No licence here is inferred. (The eleven older
pictures, St John Chrysostom's one and the three events with more pictures,
Florence, Ukraine and 2018, are kept as they were; they include CC BY and
BY-SA photographs, credited on their plates.)

**Every picture was opened and looked at** before it was cut, and every cut
was opened again: the right subject, read from its inscription or its
catalogue entry; sharp; whole heads and haloes; nothing outside the painted
field (no museum clamp, no board edge, no film border, no watermarked margin);
and nothing enlarged. A wide picture is a 16:9 cut written 1,200 wide; every
other is shown whole, written to fit 1,200 by 1,200 (the cap
`scripts/optimize-images.mjs` holds this folder to). The contact sheet of the
twenty is `Homebase/boards/purify-master/r17/shots/history-contact.png`.

**Where they live.** `public/history/media/` on the website, served to the
apps from the website (`lib/history/media.ts`, `lib/media/streamed.ts`) and
never inside the apps: the native build sets the folder aside
(`scripts/native-build.mjs`). With no signal an event page has no picture,
and the account stands alone. The sixteen pictures of 1.6, about 4.3 MB, left
the bundle with it. A replaced picture gets a new name (`pentecost.v2.jpg`).

The originals are kept outside the repository, one folder each, in
`Homebase/tools/history/download/<event>/`, the rejected ones in
`Homebase/tools/history/rejected/`.

## The twenty (2026-10-16)

| File | Event | The work | Artist, as the page gives it | Date of the work | Licence (Commons) | Source |
|---|---|---|---|---|---|---|
| `pentecost.v1.jpg` | Pentecost | Pentecost, icon from the Dormition cathedral of the Kirillo-Belozersky monastery | Anonymous | circa 1497 | Public domain (PD-Art, PD-old-100-expired) | [Pentecost (Kirillo-Belozersk).jpg](https://commons.wikimedia.org/wiki/File:Pentecost_(Kirillo-Belozersk).jpg) |
| `council-of-jerusalem.v1.jpg` | The Council of Jerusalem | The Synaxis of the Twelve Apostles, the Pushkin Museum | Anonymous master of Constantinople | early 14th century | Public domain (PD-Art, PD-old-100-expired) | [Synaxis of the Twelve Apostles by Constantinople master (early 14th c., Pushkin museum).jpg](https://commons.wikimedia.org/wiki/File:Synaxis_of_the_Twelve_Apostles_by_Constantinople_master_(early_14th_c.,_Pushkin_museum).jpg) |
| `great-persecution.v1.jpg` | The Great Persecution | The twenty thousand martyrs of Nicomedia, Menologion of Basil II (Vat. gr. 1613) | The Menologion's illuminators | circa 985 | Public domain (PD-Art, PD-old-100-expired) | [20,000 martyrs of Nicomedia (Menologion of Basil II).jpg](https://commons.wikimedia.org/wiki/File:20,000_martyrs_of_Nicomedia_(Menologion_of_Basil_II).jpg) |
| `anthony-and-the-desert.v1.jpg` | St Anthony and the desert | St Anthony the Great, an icon of the Arabic tradition (Lebanon) | Unknown | 18th century | Public domain (PD-Lebanon) | [Anthony the Great icon (lebanon).jpg](https://commons.wikimedia.org/wiki/File:Anthony_the_Great_icon_(lebanon).jpg) |
| `edict-of-milan.v1.jpg` | The Edict of Milan | Sts Constantine and Helena with the Cross, an icon of the Arabic tradition | Saliba Bin Yuhanna | 14th century | Public domain (PD-art-old-100) | [Saint Constantin and Helena, mother of Constantine I icon, Syria (14th Century).jpg](https://commons.wikimedia.org/wiki/File:Saint_Constantin_and_Helena,_mother_of_Constantine_I_icon,_Syria_(14th_Century).jpg) |
| `first-council-of-nicaea.v1.jpg` | The First Council of Nicaea | The First Ecumenical Council | Michael Damaskinos | 1591 | Public domain (PD-old-70, PD-US-expired) | [First Council of Nicaea Michael Damaskinos.png](https://commons.wikimedia.org/wiki/File:First_Council_of_Nicaea_Michael_Damaskinos.png) |
| `first-council-of-constantinople.v1.jpg` | The First Council of Constantinople | The Second Council, Homilies of St Gregory the Theologian (Paris gr. 510), folio 355 | Unknown | circa 880 | Public domain (PD-Art, PD-old-100-expired) | [CouncilOfConstantinople381BnFMSGr510.jpg](https://commons.wikimedia.org/wiki/File:CouncilOfConstantinople381BnFMSGr510.jpg) |
| `council-of-ephesus.v1.jpg` | The Council of Ephesus | Sketch for the mural of the Third Council, Cathedral of Christ the Saviour | Vasily Surikov | 1876 | Public domain (PD-old) | [Third Ecumenical council by V.Surikov (1876).jpg](https://commons.wikimedia.org/wiki/File:Third_Ecumenical_council_by_V.Surikov_(1876).jpg) |
| `council-of-chalcedon.v1.jpg` | The Council of Chalcedon | The Fourth Council, fresco, Ferapontov monastery | Dionisius | 1502 | Public domain (PD-Art, PD-old-auto-expired) | [EcumenicalCouncil 4th 11-18.jpg](https://commons.wikimedia.org/wiki/File:EcumenicalCouncil_4th_11-18.jpg) |
| `second-council-of-constantinople.v1.jpg` | The Fifth Ecumenical Council (1.8) | The Fifth Ecumenical Council, fresco, Cathedral of the Nativity of the Theotokos, Ferapontov Monastery | Dionisius | about 1502 | Public domain (PD-Art, PD-old-100-expired), read 2026-10-21 | [Пятый Вселенский Собор.jpg](https://commons.wikimedia.org/wiki/File:%D0%9F%D1%8F%D1%82%D1%8B%D0%B9_%D0%92%D1%81%D0%B5%D0%BB%D0%B5%D0%BD%D1%81%D0%BA%D0%B8%D0%B9_%D0%A1%D0%BE%D0%B1%D0%BE%D1%80.jpg) |
| `third-council-of-constantinople.v1.jpg` | The Sixth Ecumenical Council (1.8) | The Sixth Ecumenical Council (Third of Constantinople), fresco, Ferapontov Monastery; cut to the scene, leaving out the strip of the fresco above and the wall ledge below | Dionisius | 1502 | Public domain (PD-Art, PD-old-auto-expired), read 2026-10-21 | [EcumenicalCouncil 6th 07-07.jpg](https://commons.wikimedia.org/wiki/File:EcumenicalCouncil_6th_07-07.jpg) |
| `martyrdom-of-ignatius.v1.jpg` | martyrdom-of-ignatius (1.8) | The translation of the relics of St Ignatius, Menologion of Basil II (Vat. gr. 1613) | The Menologion's illuminators | about 985 | Public domain, read 2026-10-22 | [Ignatius of Antioch (Menologion of Basil II).jpg](https://commons.wikimedia.org/wiki/File:Ignatius_of_Antioch_(Menologion_of_Basil_II).jpg) |
| `martyrdom-of-polycarp.v1.jpg` | martyrdom-of-polycarp (1.8) | St Polycarp in the procession of martyrs, Sant'Apollinare Nuovo, Ravenna | The Master of Sant'Apollinare | about 526 | Public domain, read 2026-10-22 | [St Polycarp-ApollinareNuovoRavenna.JPG](https://commons.wikimedia.org/wiki/File:St_Polycarp-ApollinareNuovoRavenna.JPG) |
| `apologies-of-justin-martyr.v1.jpg` | apologies-of-justin-martyr (1.8) | St Justin the Philosopher, Stavronikita Monastery, Mount Athos | Theophanes the Cretan | 1545 to 1546 | Public domain, read 2026-10-22 | [Saint Justin Martyr by Theophanes the Cretan.jpg](https://commons.wikimedia.org/wiki/File:Saint_Justin_Martyr_by_Theophanes_the_Cretan.jpg) |
| `missions-of-apostle-paul.v1.jpg` | missions-of-apostle-paul (1.8) | The Holy Apostles Peter and Paul, Novgorod school, from Belozersk | unknown | 12th to 13th century | Public domain, read 2026-10-22 | [The Holy Apostles Peter and Paul. Novgorod School of Icon Painting, 12th-13th centuries. Belozersk.jpg](https://commons.wikimedia.org/wiki/File:The_Holy_Apostles_Peter_and_Paul._Novgorod_School_of_Icon_Painting,_12th-13th_centuries._Belozersk.jpg) |
| `neronian-persecution.v1.jpg` | neronian-persecution (1.8) | The Apostle Peter with scenes of the lives of Peter and Paul (the top row), Pskov | unknown | late 17th century | Public domain, read 2026-10-22 | [Икона Апостол Пётр XVII Псков.jpg](https://commons.wikimedia.org/wiki/File:%D0%98%D0%BA%D0%BE%D0%BD%D0%B0_%D0%90%D0%BF%D0%BE%D1%81%D1%82%D0%BE%D0%BB_%D0%9F%D1%91%D1%82%D1%80_XVII_%D0%9F%D1%81%D0%BA%D0%BE%D0%B2.jpg) |
| `foundation-of-constantinople.v1.jpg` | foundation-of-constantinople (1.8) | The southwestern entrance mosaic, Hagia Sophia, Constantinople | Byzantine mosaicists; photograph by Myrabella | about 1000 (photographed 2013) | Public domain, read 2026-10-22 | [Hagia Sophia Southwestern entrance mosaics 2.jpg](https://commons.wikimedia.org/wiki/File:Hagia_Sophia_Southwestern_entrance_mosaics_2.jpg) |
| `first-iconoclasm.v1.jpg` | first-iconoclasm (1.8) | The Chludov Psalter, folio 67r, State Historical Museum, Moscow | unknown Byzantine illuminator | mid-9th century | Public domain, read 2026-10-22 | [Clasm Chludov.jpg](https://commons.wikimedia.org/wiki/File:Clasm_Chludov.jpg) |
| `second-iconoclasm.v1.jpg` | second-iconoclasm (1.8) | St Theodore the Studite, Menologion of Basil II (Vat. gr. 1613) | The Menologion's illuminators | about 985 | Public domain, read 2026-10-22 | [Theodore Studite (Menologion of Basil II) page.jpg](https://commons.wikimedia.org/wiki/File:Theodore_Studite_(Menologion_of_Basil_II)_page.jpg) |
| `second-council-of-nicaea.v1.jpg` | The Second Council of Nicaea | The Seventh Council, Menologion of Basil II (Vat. gr. 1613), folio 108 | The Menologion's illuminators | 11th century as the page gives it (the Menologion is dated about 985) | Public domain (PD-old) | [Menologion of Basil 024.jpg](https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_024.jpg) |
| `triumph-of-orthodoxy.v1.jpg` | The Triumph of Orthodoxy | The Triumph of Orthodoxy, the British Museum | anonymous | between 1375 and 1425 | Public domain (PD-Art, PD-old-100-expired) | [Triumph orthodoxy.jpg](https://commons.wikimedia.org/wiki/File:Triumph_orthodoxy.jpg) |
| `mission-of-cyril-and-methodius.v1.jpg` | The mission of Cyril and Methodius | Sts Cyril and Methodius, the Enlighteners | Avram Dichov | 1892 | Public domain (PD-old) | [Sts. Cyril and Methodius Bulgarian Enlighteners Icon by Avram Dichov, 1892.jpg](https://commons.wikimedia.org/wiki/File:Sts._Cyril_and_Methodius_Bulgarian_Enlighteners_Icon_by_Avram_Dichov,_1892.jpg) |
| `conversion-of-kievan-rus.v1.jpg` | The baptism of Rus | The Baptism of Prince Vladimir, sketch for the fresco in St Volodymyr's Cathedral, Kyiv | Viktor Vasnetsov | 1890 | Public domain (PD-Art, PD-old-auto-expired) | [Vasnetsov Bapt Vladimir.jpg](https://commons.wikimedia.org/wiki/File:Vasnetsov_Bapt_Vladimir.jpg) |
| `great-schism-1054.v1.jpg` | 1054 | Christ between Constantine IX Monomachos and the Empress Zoe, Hagia Sophia | Byzantine mosaicists; photograph by Myrabella | 11th century (photographed 2012) | Public domain and CC0 (Licensed-PD-Art: PD-old-100-expired, CC-zero) | [Empress Zoe mosaic Hagia Sophia.jpg](https://commons.wikimedia.org/wiki/File:Empress_Zoe_mosaic_Hagia_Sophia.jpg) |
| `sack-of-constantinople-1204.v1.jpg` | The sack of Constantinople | The crusaders' assault on Constantinople, David Aubert's Croniques abregies, vol. 2, folio 205r | Loyset Liédet | 15th century | Public domain (PD-Art, PD-old-auto-expired) | [ConquestOfConstantinopleByTheCrusadersIn1204.jpg](https://commons.wikimedia.org/wiki/File:ConquestOfConstantinopleByTheCrusadersIn1204.jpg) |
| `hesychast-councils.v1.jpg` | The hesychast councils | St Gregory Palamas, the Pushkin Museum | A master of northern Greece (Thessalonica?) | early 15th century | Public domain (PD-Art) | [Gregor Palamas by North Greece anonym (15th c., Pushkin museum).jpg](https://commons.wikimedia.org/wiki/File:Gregor_Palamas_by_North_Greece_anonym_(15th_c.,_Pushkin_museum).jpg) |
| `fall-of-constantinople.v1.jpg` | The fall of Constantinople | The siege of Constantinople, Bertrandon de la Broquière's Voyage d'Outremer (BnF fr. 9087), folio 207v | Jean Le Tavernier (named in the page's description) | after 1455 | Public domain (PD-Art, PD-old-100-1923) | [Le siège de Constantinople (1453) by Jean Le Tavernier after 1455.jpg](https://commons.wikimedia.org/wiki/File:Le_si%C3%A8ge_de_Constantinople_(1453)_by_Jean_Le_Tavernier_after_1455.jpg) |
| `philokalia-published.v1.jpg` | The Philokalia | St Nikodemos the Hagiorite, engraved portrait | Antonios Zoulianis (engraved, Venice) | 1818 (the page dates the file 1819) | Public domain (PD-old-100) | [Άγιος Νικόδημος ο Αγιορείτης.jpg](https://commons.wikimedia.org/wiki/File:%CE%86%CE%B3%CE%B9%CE%BF%CF%82_%CE%9D%CE%B9%CE%BA%CF%8C%CE%B4%CE%B7%CE%BC%CE%BF%CF%82_%CE%BF_%CE%91%CE%B3%CE%B9%CE%BF%CF%81%CE%B5%CE%AF%CF%84%CE%B7%CF%82.jpg) |
| `alaska-mission.v1.jpg` | The Alaska mission | The chapel of Sts Sergius and Herman of Valaam, Spruce Island (HABS AK-52-2) | Historic American Buildings Survey, National Park Service | undated on its page | Public domain (PD-USGov-NPS) | [WEST FRONT - Saints Sergius and Herman of Valaam Russian Orthodox Chapel, Spruce Island ... HABS AK,12-MOLA,1-2.tif](https://commons.wikimedia.org/wiki/File:WEST_FRONT_-_Saints_Sergius_and_Herman_of_Valaam_Russian_Orthodox_Chapel,_Spruce_Island,_Ouzinkie,_Kodiak_Island_Borough,_AK_HABS_AK,12-MOLA,1-2.tif) |
| `bolshevik-persecution.v1.jpg` | The Bolshevik persecution | The Local Council of the Russian Church, Moscow, after Patriarch Tikhon's election | anonymous | 1917 | Public domain (PD-old-100-expired) | [Highest authority of Russian Orthodox Church in 1917.jpg](https://commons.wikimedia.org/wiki/File:Highest_authority_of_Russian_Orthodox_Church_in_1917.jpg) |

### Notes on the twenty

- **Pentecost** replaces the Novgorod icon of 1.6 (545 by 727, too small for
  a plate on a phone without enlarging it).
- **The Edict of Milan.** The page dates the icon to the 14th century and
  names Saliba Bin Yuhanna, after the 2003 catalogue Icônes arabes (Institut
  du monde arabe). Its style (the ermine and the patterned robes) reads later,
  of the Aleppo school; the date and the name are kept as the page gives them
  and marked so in the registry, not corrected by guesswork. The subject is
  certain: the two are named in Arabic on the gold.
- **The First Council of Nicaea** replaces the photograph of a fresco used in
  1.6 (CC BY-SA 3.0, its fresco's date uncertain, the photograph skewed with
  the ceiling beams in it).
- **The First Council of Constantinople.** The manuscript's paint is flaked
  across the page; that is the page as it is, not a fault of the scan.
- **The Council of Ephesus** is Surikov's sketch, with its painted arch: no
  icon of the council was found at a size that would not be enlarged (below).
- **The Second Council of Nicaea.** The scan's parchment margin carries the
  library's printed mark; the cut is inside the miniature's red frame line,
  and no mark is inside it (checked at full size).
- **1054** shows the emperor of that summer, Constantine IX, beside Christ in
  Hagia Sophia, where the bull was laid; no picture of the event itself exists
  at a usable size.
- **The sack of 1204** replaces Delacroix's painting of 1840 (bodies and bare
  figures across its foreground) with a 15th-century miniature of the
  assault.
- **The fall of Constantinople** replaces Benjamin-Constant's painting of 1876
  (the conqueror riding over the dead) with a miniature made within a few
  years of the siege.
- **The Philokalia.** No picture of the 1782 Venice edition is on Commons. The
  engraving of St Nikodemos, its editor, was made nine years after his repose.
- **The Alaska mission.** Icons of St Herman are modern and in copyright, and
  the photographs of Kodiak before 1900 on Commons are under 800 pixels. The
  chapel on Spruce Island stands over the place of St Herman's first grave;
  the photograph is a work of the US government.
- **The Bolshevik persecution** is a 16:9 cut on the hierarchs of the Local
  Council of 1917; many of the men at that table became the new martyrs.

### Cut again for 1.7.1 (2026-10-17)

The owner: no picture shows white in its corners or edges. Four were cut
again inside the white of the scan, from the files above, nothing fetched,
under new names; the website keeps the old ones for the 1.7 apps, which ask
for them by name. `node scripts/check-picture-edges.mjs history/media` reads
the folder.

- `council-of-jerusalem.v2.jpg` (900 by 1076): 22px off the right and the
  foot, where the panel is worn to the white ground.
- `mission-of-cyril-and-methodius.v2.jpg` (876 by 1190): the thin white line
  of the scan off three sides.
- `philokalia-published.v2.jpg` (850 by 1167): cut to the plate's own border,
  so the paper of the page and the engraver's line under it are gone.
- `council-of-florence-woodcut.v2.jpg` (987 by 1035), the Plus gallery's
  woodcut: cut to its printed frame, the heading whole. The frame is not quite
  square, so its top right corner is the print's own paper.

## Rejected

- **Nicaea, `File:Nicaea icon.jpg`** (1,024 by 1,388, PD-Art-100-1923): no
  artist and no date, copied from a website; the Damaskinos icon above is
  dated and signed.
- **Ephesus, Dionisius's fresco at Ferapontov** (`File:EcumenicalCouncil 3rd
  09-07.jpg`, 800 by 1,076, PD-Art): the church's doorway cuts into the panel,
  and the panel alone is about 600 pixels wide, under the floor.
- **The Seventh Council, Dionisius's fresco** (`File:EcumenicalCouncil 7th
  07-08.jpg`, 800 by 818): the same doorway, the same width.
- **The Seventh Council, the Novodevichy icon** (`File:Seventh ecumenical
  council (Icon) big.JPG`, 2,144 by 2,819): the page gives the photograph
  under CC BY-SA 3.0 beside PD-Art; two licences that disagree.
- **Chalcedon, Surikov's sketch** (`File:Fourth ecumenical council of
  chalcedon - 1876.jpg`, 1,464 by 1,300, PD-Art): a good picture, set aside
  for Dionisius's fresco, an icon of the council with St Euphemia's relics.
- **St Anthony, `File:St Anthony the Great.jpg`** (3,300 by 4,488, PD-Art):
  dated 2020-01-01 on its page and copied from a blog; the icon may be modern.
- **Cyril and Methodius, the icons at Galatin (1888) and Popitsa** (PD-old):
  the first darkened and dirty, the second photographed at an angle with the
  wall behind it. The Dichov icon has a sheen of worn varnish across St
  Cyril's head and was still the clearest.
- **1054, `File:Michael Keroularios.jpg` and `File:Humbert-Kerularij.jpg`**
  (the Madrid Skylitzes and a drawing, 456 and 600 pixels wide): too small.
- **Alaska, the Kodiak views of the 1880s** (`File:Panorama of Kodiak, 1880
  (AL+CA 7630).jpg` and others, PD): 750 to 768 pixels wide; and the HABS
  photographs of Kodiak's present church (built 1945), not the mission's.
- **The modern photographs of the Zoe mosaic** (CC BY-SA 4.0): the CC0 one
  above was used.

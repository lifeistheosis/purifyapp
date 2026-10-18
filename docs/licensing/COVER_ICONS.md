# Cover icon provenance

The pictures on the books' covers in the reading room (1.7): the icon of the
saint a work is by, or about, in a window at the top of a dark plate, the
title in Lora under it. The owner's note 18 of 2026-10-16 ("a Netflix for
books", "a cover for every work") and his yes the same day to downloading
public-domain icons from Wikimedia Commons for the covers. Policy, matching
`READ_COVERS.md`, `SAINT_HEROES.md` and `icon-provenance.md`: **a picture
ships only if its source and licence are documented here.** The same records
are `COVER_ART` in `lib/reading/coverArt.ts` and `AUTHOR_COVERS` in
`lib/reading/authorCovers.ts`, which `lib/reading/__tests__/coverArt.test.ts`
holds to the files.

**Only a settled picture reaches a cover.** Covers multiply the reach of
every icon. Sixty-one of the icons the app carries have never been opened or
sourced (`lib/saints/iconRights.ts`, `UNVERIFIED_ICONS`), so none of them is
used: a saint with no settled picture has the plate with the title alone.

**Public domain only.** A cover carries no credit line, so it must need none.
Every Commons file below is public domain or CC0 as its own page states it,
read on 2026-10-16, and its page names no CC BY, CC BY-SA or GFDL licence in
its categories (a photographer's licence over an old icon shows only there).
`scripts/fetch-author-covers.mjs` reads both again on every run and writes
nothing that fails. Where the CC0 is a photographer's, the work itself is
centuries old. No licence here is inferred.

**Every picture was opened and looked at** before it was cut, and every cut
was opened again: the saint is named by the inscription painted on the
picture wherever it has one (read in a zoom), else by the museum's or the
page's record, as listed below; the whole head and halo are in; nothing
outside the painted field shows; nothing is enlarged. Each is four wide by
five tall, 600 by 750 where the scan allows, never under 480 wide, cut at
the scan's own pixels or fewer. Where two saints share a panel, only the
named one is cut.

**Where they live.** `public/covers/authors/` on the website, served to the
apps from the website (`lib/media/streamed.ts`), never inside the apps: the
native build sets `public/covers/` aside. In the apps with no signal a cover
falls back to its plate and title. The forty-one files are 3.6 MB together.
A replacement gets a new version in its name (`.v2.jpg`). Downloaded
originals are kept outside the repository, one to a folder
(`Homebase/tools/covers/download/authors/<slug>/`), and are not needed to
build anything.

**Also shown (1.8).** Six of these covers are the icons beside the walk notes
that introduce their saints, cut to the face in the page
(`lib/walkthroughs/people.ts`): St Gregory the Dialogist, St Paul, St Ephraim,
the Theotokos, St Basil and St John Chrysostom. A new version of a file is
named there too; `lib/walkthroughs/__tests__/people.test.ts` fails until it is.

## Shipped: from Commons for the covers

Old Orthodox icons, frescoes and mosaics first. For four Fathers of the Latin
West no such icon passed, and an old Western painting of the saint stands in
its place (St Jerome, St Leo, Hosius, St Florian), as the owner's own picture
of St Sixtus does. Each waits for his look on the Design Board.

| File | Work | Artist | Date | Licence | Source |
|---|---|---|---|---|---|
| `athanasius-the-great.v1.jpg` | Icon of St Athanasius from Sozopol, Bulgaria, tempera on wood, the National Art Gallery, Sofia | Unknown | End of the 17th century | Public domain | [Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg](https://commons.wikimedia.org/wiki/File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg) |
| `anthony-the-great.v1.jpg` | Icon of St Antony the Great, from the Levant (Icônes arabes, Institut du monde arabe, 2003) | Unknown | 18th century | Public domain | [Anthony the Great icon (lebanon).jpg](https://commons.wikimedia.org/wiki/File:Anthony_the_Great_icon_(lebanon).jpg) |
| `cyril-of-alexandria.v1.jpg` | Cretan icon of St Cyril and St Athanasius of Alexandria: St Cyril alone, under his name | Unknown Cretan painter | 16th to 17th century | Public domain | [Cretan Icon of Saint Kyrillos and Saint Athanasios of Alexandria.jpg](https://commons.wikimedia.org/wiki/File:Cretan_Icon_of_Saint_Kyrillos_and_Saint_Athanasios_of_Alexandria.jpg) |
| `john-of-damascus.v1.jpg` | Fresco of St John of Damascus, the Protaton church, Mount Athos | Unknown | 14th to 15th century | Public domain | [Athonite Fresco Icon of Saint John of Damascus 2.jpg](https://commons.wikimedia.org/wiki/File:Athonite_Fresco_Icon_of_Saint_John_of_Damascus_2.jpg) |
| `maximus-the-confessor.v1.jpg` | Mosaic medallion of St Maximus the Confessor, Nea Moni, Chios | Unknown | 11th century | Public domain | [Maximus the Confessor (mosaic).jpg](https://commons.wikimedia.org/wiki/File:Maximus_the_Confessor_(mosaic).jpg) |
| `gregory-palamas.v1.jpg` | Icon of St Gregory Palamas, Archbishop of Thessalonica, the Pushkin Museum, Moscow | Unknown | 15th century | Public domain | [Григорий Палама 14в.jpg](https://commons.wikimedia.org/wiki/File:%D0%93%D1%80%D0%B8%D0%B3%D0%BE%D1%80%D0%B8%D0%B9_%D0%9F%D0%B0%D0%BB%D0%B0%D0%BC%D0%B0_14%D0%B2.jpg) |
| `gregory-of-nyssa.v1.jpg` | St Gregory of Nyssa, a miniature of the Menologion of Basil II, the Vatican Library | The painters of the Menologion of Basil II, Constantinople | c. 985 | Public domain | [Gregory of Nyssa (Menologion of Basil II).jpg](https://commons.wikimedia.org/wiki/File:Gregory_of_Nyssa_(Menologion_of_Basil_II).jpg) |
| `spyridon-of-trimythous.v1.jpg` | Icon of St Spyridon enthroned, from the Levant (Icônes arabes, Institut du monde arabe, 2003) | Unknown | 17th century | Public domain | [Saint Spyridon icon.jpg](https://commons.wikimedia.org/wiki/File:Saint_Spyridon_icon.jpg) |
| `epiphanius-of-salamis.v1.jpg` | Fresco of St Epiphanius of Cyprus, Gračanica monastery | Unknown | Not given on its page (the page names the fresco at Gračanica) | Public domain | [Epiphanius-Kosovo.jpg](https://commons.wikimedia.org/wiki/File:Epiphanius-Kosovo.jpg) |
| `constantine-the-great.v1.jpg` | Icon of St Constantine and St Helen by Emmanuel Tzanes, the Loverdos collection, Athens: St Constantine alone, under his name | Emmanuel Tzanes | 1669 | Public domain | [Constantine and Helen.png](https://commons.wikimedia.org/wiki/File:Constantine_and_Helen.png) |
| `ignatius-of-antioch.v1.jpg` | Fresco of St Ignatius the God-bearer, Stavronikita monastery, Mount Athos | Theophanes the Cretan | 1545 | Public domain | [Agios Ignatios Theophoros Stavronikita.webp](https://commons.wikimedia.org/wiki/File:Agios_Ignatios_Theophoros_Stavronikita.webp) |
| `polycarp-of-smyrna.v1.jpg` | Fresco of St Polycarp of Smyrna, the church of St George, Staro Nagoričane | Unknown (the photograph is the uploader's, CC0) | 14th century, as its page's categories give it | CC0 | [Polycarp of Smyrna2.jpg](https://commons.wikimedia.org/wiki/File:Polycarp_of_Smyrna2.jpg) |
| `justin-martyr.v1.jpg` | Fresco of St Justin the Philosopher, Stavronikita monastery, Mount Athos | Theophanes the Cretan | c. 1546 | Public domain | [Иустин Философ, Афон.jpg](https://commons.wikimedia.org/wiki/File:%D0%98%D1%83%D1%81%D1%82%D0%B8%D0%BD_%D0%A4%D0%B8%D0%BB%D0%BE%D1%81%D0%BE%D1%84,_%D0%90%D1%84%D0%BE%D0%BD.jpg) |
| `meletius-of-antioch.v1.jpg` | Fresco of St Meletius of Antioch, the church of St George, Staro Nagoričane | Unknown | 1317 | Public domain | [Saint Meletios of Antioch Staro Nagoričane.jpg](https://commons.wikimedia.org/wiki/File:Saint_Meletios_of_Antioch_Staro_Nagori%C4%8Dane.jpg) |
| `eustathius-of-antioch.v1.jpg` | Fresco of St Eustathius of Antioch, named on its page as from the church of the Theotokos Peribleptos, Ohrid | Unknown | 14th century | Public domain | [Saint Eustathios of Antioch Fresco Peribleptos.jpg](https://commons.wikimedia.org/wiki/File:Saint_Eustathios_of_Antioch_Fresco_Peribleptos.jpg) |
| `ephraim-the-syrian.v1.jpg` | Mosaic of St Ephraim the Syrian, Nea Moni, Chios | Unknown | 11th century | Public domain | [Ephrem the Syrian (mosaic in Nea Moni).jpg](https://commons.wikimedia.org/wiki/File:Ephrem_the_Syrian_(mosaic_in_Nea_Moni).jpg) |
| `apostle-matthew.v1.jpg` | The Apostle Matthew, icon | Unknown | Not given on its page | CC0 | [The Apostle Matthew.jpg](https://commons.wikimedia.org/wiki/File:The_Apostle_Matthew.jpg) |
| `apostle-thomas.v1.jpg` | Icon of St Thomas the Apostle, signed by Konstantinos Tzanes | Konstantinos Tzanes | 1670 | Public domain | [Saint Thomas K. Tzanes.png](https://commons.wikimedia.org/wiki/File:Saint_Thomas_K._Tzanes.png) |
| `apostle-philip.v1.jpg` | Fresco of the Apostle Philip, the church of the Theotokos Peribleptos, Ohrid | Michael and Eutychios | 14th century | Public domain | [Paintings in the Church of the Theotokos Peribleptos of Ohrid 037.jpg](https://commons.wikimedia.org/wiki/File:Paintings_in_the_Church_of_the_Theotokos_Peribleptos_of_Ohrid_037.jpg) |
| `apostle-bartholomew.v1.jpg` | Fresco of the Apostle Bartholomew, the church of St Nicholas, Stavronikita monastery, Mount Athos | Theophanes the Cretan and Symeon | 1546 | Public domain | [Apostle Bartholomew. Fresco of the Church of Agios Nikolaos. Stavronikita Monastery. Athos.jpg](https://commons.wikimedia.org/wiki/File:Apostle_Bartholomew._Fresco_of_the_Church_of_Agios_Nikolaos._Stavronikita_Monastery._Athos.jpg) |
| `prochorus-the-deacon.v1.jpg` | Icon of St John the Theologian and St Prochorus by Emmanuel Lambardos: St Prochorus alone, under his name | Emmanuel Lambardos | 1602 | Public domain | [John the Evangelist and Prochorus by E.Lambardos (1602).jpg](https://commons.wikimedia.org/wiki/File:John_the_Evangelist_and_Prochorus_by_E.Lambardos_(1602).jpg) |
| `jerome-of-stridon.v1.jpg` | Saint Jerome as Scholar by El Greco, the Metropolitan Museum of Art | El Greco | c. 1610 | Public domain | [Saint Jerome as Scholar MET DT3103.jpg](https://commons.wikimedia.org/wiki/File:Saint_Jerome_as_Scholar_MET_DT3103.jpg) |
| `gregory-the-dialogist.v1.jpg` | Icon of St Gregory the Dialogist, from the Savvathiana monastery, the collection of St Catherine, Heraklion | Unknown Cretan painter (the photograph is C. Messier's, CC0) | Second half of the 17th century | CC0 | [Άγιος Γρηγόριος ο Διάλογος 0633.jpg](https://commons.wikimedia.org/wiki/File:%CE%86%CE%B3%CE%B9%CE%BF%CF%82_%CE%93%CF%81%CE%B7%CE%B3%CF%8C%CF%81%CE%B9%CE%BF%CF%82_%CE%BF_%CE%94%CE%B9%CE%AC%CE%BB%CE%BF%CE%B3%CE%BF%CF%82_0633.jpg) |
| `leo-the-great.v1.jpg` | Saint Leo the Great by Francisco de Herrera the Younger, the Prado, Madrid | Francisco de Herrera the Younger | 17th century | Public domain | [Herrera mozo San León magno Lienzo. Óvalo. 164 x 105 cm. Museo del Prado.jpg](https://commons.wikimedia.org/wiki/File:Herrera_mozo_San_Le%C3%B3n_magno_Lienzo._%C3%93valo._164_x_105_cm._Museo_del_Prado.jpg) |
| `agatho-of-rome.v1.jpg` | St Agatho, Pope of Rome, a miniature of the Menologion of Basil II, the Vatican Library | The painters of the Menologion of Basil II, Constantinople | c. 985 | Public domain | [Pope Agatho (Menologion of Basil II).jpg](https://commons.wikimedia.org/wiki/File:Pope_Agatho_(Menologion_of_Basil_II).jpg) |
| `hosius-of-cordova.v1.jpg` | El obispo Osio by Ángel María de Barcia, the Museo de Bellas Artes, Córdoba | Ángel María de Barcia Pavón | c. 1879 | Public domain | [El obispo Osio - Ángel María de Barcia Pavón.jpg](https://commons.wikimedia.org/wiki/File:El_obispo_Osio_-_%C3%81ngel_Mar%C3%ADa_de_Barcia_Pav%C3%B3n.jpg) |
| `florian-of-lorch.v1.jpg` | Saint Florian by Francesco del Cossa, the National Gallery of Art, Washington | Francesco del Cossa | c. 1473 to 1474 | CC0 | [Francesco del Cossa, Saint Florian, c. 1473-1474, NGA 368.jpg](https://commons.wikimedia.org/wiki/File:Francesco_del_Cossa,_Saint_Florian,_c._1473-1474,_NGA_368.jpg) |
| `mary-magdalene.v1.jpg` | Icon of St Mary Magdalene, the Museum of Russian Icons, Clinton | Unknown Russian icon painter | c. 1890 | Public domain | [Mary Magdalene (Russia, c. 1890, Clinton).jpg](https://commons.wikimedia.org/wiki/File:Mary_Magdalene_(Russia,_c._1890,_Clinton).jpg) |
| `seraphim-of-sarov.v1.jpg` | Icon of St Seraphim of Sarov, perhaps from the workshop of the Diveyevo monastery, oil on panel | Unknown Russian icon painter | After 1903 | Public domain | [Seraphim of Sarov (after 1903, priv.coll).jpg](https://commons.wikimedia.org/wiki/File:Seraphim_of_Sarov_(after_1903,_priv.coll).jpg) |
| `paul-of-thebes.v1.jpg` | Athonite fresco of St Paul of Thebes and St John the Hut-Dweller: St Paul alone, under his name | Unknown | 14th to 15th century | Public domain | [Saint-Paul-of-Thebes-and-Saint-John-the-Hut-Dweller-Athonite.jpg](https://commons.wikimedia.org/wiki/File:Saint-Paul-of-Thebes-and-Saint-John-the-Hut-Dweller-Athonite.jpg) |
| `hilarion.v1.jpg` | Wall painting of St Hilarion, the church of the Panagia tou Arakos, Lagoudera, Cyprus, before its cleaning | Unknown (the photograph is David Winfield's for Dumbarton Oaks, CC0) | Not given on its page (the church's paintings are generally dated 1192) | CC0 | [Church of Panagia tou Arakos, nave, southwest bay, wall paintings, Lagoudera, Cyprus, St. Hilarion, before cleaning (Dumbarton Oaks)](https://commons.wikimedia.org/wiki/File:Church_of_Panagia_tou_Arakos,_nave,_southwest_bay,_wall_paintings,_Lagoudera,_Cyprus_-_West_soffit,_St._Hilarion,_detail_of_upper_half,_before_cleaning_-_MSBZ004_BF_S_1979_2198D_-_Dumbarton_Oaks.jpg) |

How each saint was named:

- By the inscription on the picture, read in a zoom: St Athanasius, St
  Antony, St Cyril (ΚΥΡΙΛΛΟΣ, the right-hand bishop of two), St John of
  Damascus, St Maximus, St Gregory Palamas, St Spyridon, St Epiphanius (СТИ
  ЕПИФАНИЕ), St Constantine (the left of two, St Helen outside the cut), St
  Ignatius (Ο ΘΕΟΦΟΡΟΣ), St Polycarp, St Justin (Ο ΦΙΛΟΣΟΦΟΣ), St Meletius,
  St Eustathius, St Ephraim, St Matthew (his open book reads the first verse
  of his Gospel), St Thomas (his scroll reads "My Lord and my God"), St
  Philip, St Bartholomew, St Prochorus (the young scribe under his own name,
  St John outside the cut), St Gregory the Dialogist, St Mary Magdalene, St
  Paul of Thebes (the left of two), St Hilarion.
- By the museum's record or the page: St Gregory of Nyssa and St Agatho
  (Menologion of Basil II miniatures that carry no name), St Seraphim (an
  auction record), and the four Western paintings.

Known blemishes, kept because the face is clear: St Matthew's icon has a
pale stripe of paint loss down its left side (not across the face); St
Polycarp's fresco shows the red edge of the next medallion in its lower
corner; St Gregory the Dialogist's panel shows the seams of its boards; St
Hilarion's photograph was taken before the wall was cleaned.

## Shipped: the saints' page pictures, made covers

The ten saints whose page already has a picture from Commons
(`SAINT_HEROES.md`): their covers are that picture made smaller, 600 by
750, so a saint's page and his books show the same icon. Their sources and
licences are recorded there: the Theotokos, St John Chrysostom, St Basil, St
Gregory the Theologian, St Nicholas, St Peter, St Paul, St John the
Theologian, St Andrew, the Archangel Michael.

## Shipped: icons the app already carries

Twelve icons whose rights are settled in `lib/saints/iconRights.ts` (a
verified or a permission row, opened when the row was written): St John the
Forerunner, St Cyprian, St Lawrence, St Sixtus, St Pimen, St Herman of
Alaska, St Tikhon of Zadonsk, St Thaddeus of Edessa, St Titus, St Euplus,
the Maccabean Martyrs, the Seven Sleepers. They work with no signal.

## Turned down

Picked by the search and then not used:

- **St Augustine** (`File:Saint Augustine by Philippe de Champaigne.jpg`,
  c. 1645 to 1650, the Los Angeles County Museum of Art, public domain):
  named by the museum and sharp, but the picture's centre is a burning heart
  held up in flames, a Western devotional sign that would stand on the
  cover of every book of his in an Orthodox library. His books keep the
  plate until an icon of him is found.
- **St Mary of Egypt** (a Serbian icon of 1723, The Communion of St Mary of
  Egypt, Paris Musées, public domain): the right saint and a true icon, but
  cut to a cover it is an emaciated bare figure with an open mouth (she is
  receiving Communion, the spoon outside any cut), which reads wrong at a
  cover's size.
- **St James son of Zebedee** (`File:Icon of saint Jacob.JPG`, Patmos, 13th
  century): no inscription, and the sources disagree (Commons and the
  Orthodox Encyclopedia say Zebedee; Google Arts and Culture says the
  Brother of the Lord; another copy says Alphaeus).
- **St Irenaeus** (`File:Saint irenee saint irenee.jpg`, Lucien Bégule's
  stained glass, Lyon, 1901): public domain and named, but a window in
  profile among icons; his one work here is our summary.
- **Malchus** (`File:Malchus van Chalcis als kluizenaar, RP-P-OB-60.247.jpg`,
  Sadeler after de Vos, 1583 to 1588, CC0): a busy black-and-white
  engraving; the Life of Malchus shows its author, St Jerome, instead.
- **St Theophan the Recluse** (`File:Theophan the Recluse.jpg`, Borel's
  lithograph, 1860): no cover needs him (the Way of a Pilgrim on his page
  is anonymous and keeps its plate).

No public-domain picture passed, so these keep the plate with the title:

- **St Alexander of Alexandria**: only an 1899 engraving in an oval on bare
  paper (any cut shows the paper or cuts the halo); the rest CC BY-SA or a
  Free Art License.
- **St Anianus**: only Venetian reliefs and paintings, mostly CC BY or BY-SA.
- **St Symeon the New Theologian**: every public-domain copy is 365 pixels
  wide or less; the large "Symeon" icon on Commons shows St Simeon the
  Myrrh-streaming (Stefan Nemanja).
- **St Photius**: only chronicle miniatures with small figures, and small
  prints.
- **St Cyril of Jerusalem**: the "14th-century" medallion is a recoloured
  blog copy whose age cannot be established; the rest too small or
  full-length.
- **St Nectarius of Constantinople**: one small figure in a council
  miniature.
- **St Theodosius the Great**: the Greek icons are 20th-century by unknown
  painters; the Missorium is a photograph of a silver relief; one "icon" is
  of St Theodosius of the Kyiv Caves.
- **St Olympias**: the one icon has no established date and a small face;
  the rest are Western prints and a statue.
- **St Nektarios of Aegina**: the one public-domain photograph is 376
  pixels wide.
- **St Papias**: a 1493 Nuremberg Chronicle stock woodcut, 244 pixels wide.
- **St Isaac the Syrian**: a full-length 1518 miniature with a worn head
  about 100 pixels wide (its page also carries a CC BY 4.0 category); the
  rest under 400 pixels.
- **St James son of Alphaeus, St Jude, St Simon the Zealot, St Matthias**:
  no clearly named old image large enough; Simone Martini's St Matthias
  (the Met, CC0) has its halo pressed into an arched frame.
- **St John Cassian**: the only sharp image is a contemporary icon with an
  unsupported public-domain claim; the old ones are about 230 pixels wide.
- **St Hermione**: only the Menologion's scene of her beheading, a tiny and
  violent figure.
- **St Isidora of Tabenna**: the Commons icons are modern (English
  lettering, invented dates) or tiny.
- **St Paisios**: he reposed in 1994; every file of him is CC BY or BY-SA.
- **The Way of a Pilgrim**: anonymous, so no saint's icon belongs on it.

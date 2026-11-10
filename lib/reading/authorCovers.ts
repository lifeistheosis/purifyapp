import type { StreamedArt } from "./coverArt";

/**
 * The covers' icons from Wikimedia Commons (1.7, the owner's yes of
 * 2026-10-16 to downloading public-domain icons for the covers). Each was
 * read on its own Commons page (public domain or CC0 as the page states it,
 * with no CC BY, CC BY-SA or GFDL category over it, of a work old enough
 * that its painter's rights are long gone), opened, cut four wide by five
 * tall at the scan's own pixels and opened again: the right saint, named by
 * the inscription on the picture wherever it has one, sharp, the whole head
 * and halo, nothing outside the painted field.
 * scripts/fetch-author-covers.mjs holds each cut and docs/licensing/
 * COVER_ICONS.md each source, licence and rejection.
 *
 * Old Orthodox icons, frescoes and mosaics first. For four Fathers of the
 * Latin West no such icon passed, and an old Western painting of the saint
 * stands in its place (St Jerome, St Leo, Hosius, St Florian), as the
 * owner's own picture of St Sixtus does (lib/saints/iconRights.ts).
 *
 * 1.7.2 (the owner's "ok just optimize them", 2026-10-19): nine more from the
 * search for the books still showing the plain plate. An icon for St Mary of
 * Egypt; old Western paintings for St Augustine, four apostles and St
 * Theodosius, for whom no icon passed; and the Way of a Pilgrim, which has no
 * author to show, its own picture (WORK_COVERS). Fifteen subjects found
 * nothing that passed and keep the plate.
 *
 * 1.9, build 89 note 3 (the owner's "ok to all", 2026-11-10, to Updates'
 * research in docs/1.9-build/notes/build-89/03-covers-research.md): three
 * more saints of their own (St Arsenius, St Tarasius, and St Anianus in a
 * Venetian painting of his healing, since no icon of him passed); the icon of
 * the council a book belongs to, for a book whose author has none
 * (COUNCIL_COVERS, under /covers/councils/, given to its books in
 * lib/reading/coverArt.ts, WORK_ART); and an icon for each How you feel door
 * (FEELING_COVERS, under /covers/feelings/), each a canonical Orthodox saint
 * known for that struggle, with its reason in COVER_ICONS.md. Same rules,
 * same checks, read on the pages by the research and cut here.
 */

const commons = (title: string) => `https://commons.wikimedia.org/wiki/${encodeURI(title.replace(/ /g, "_"))}`;

function art(
  slug: string,
  size: [number, number],
  focusY: number,
  source: string,
  license: "Public domain" | "CC0",
  rights: { work: string; artist: string; workDate: string; alt: string },
  inspectedOn = "2026-10-16",
  folder: "authors" | "councils" | "feelings" = "authors",
): StreamedArt {
  return {
    kind: "streamed",
    file: `/covers/${folder}/${slug}.v1.jpg`,
    width: size[0],
    height: size[1],
    focusY,
    source,
    license,
    evidenceUrl: commons(source),
    inspectedOn,
    ...rights,
  };
}

const FULL: [number, number] = [600, 750];

export const AUTHOR_COVERS: Readonly<Record<string, StreamedArt>> = {
  "athanasius-the-great": art("athanasius-the-great", FULL, 33, "File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg", "Public domain", {
    work: "Icon of St Athanasius from Sozopol, Bulgaria, tempera on wood, the National Art Gallery, Sofia",
    artist: "Unknown",
    workDate: "End of the 17th century",
    alt: "A bishop with a high balding forehead and a long grey forked beard, in a white omophorion with black crosses, blessing and holding a red Gospel, on a worn gold and red ground with his name in red.",
  }),
  "anthony-the-great": art("anthony-the-great", FULL, 32, "File:Anthony the Great icon (lebanon).jpg", "Public domain", {
    work: "Icon of St Antony the Great, from the Levant (Icônes arabes, Institut du monde arabe, 2003)",
    artist: "Unknown",
    workDate: "18th century",
    alt: "An old monk with a white beard in a blue cowl marked with a cross over a dark mantle, a thin cross in one hand and an unrolled scroll in the other, on a yellow ground with his name in red.",
  }),
  "cyril-of-alexandria": art("cyril-of-alexandria", [480, 600], 29, "File:Cretan Icon of Saint Kyrillos and Saint Athanasios of Alexandria.jpg", "Public domain", {
    work: "Cretan icon of St Cyril and St Athanasius of Alexandria: St Cyril alone, under his name",
    artist: "Unknown Cretan painter",
    workDate: "16th to 17th century",
    alt: "A bishop with a long dark beard in a white cowl with a black cross and an omophorion with large black crosses, blessing and holding a red jewelled Gospel, on a gold ground with his name in red.",
  }),
  "john-of-damascus": art("john-of-damascus", FULL, 25, "File:Athonite Fresco Icon of Saint John of Damascus 2.jpg", "Public domain", {
    work: "Fresco of St John of Damascus, the Protaton church, Mount Athos",
    artist: "Unknown",
    workDate: "14th to 15th century",
    alt: "An old man with a long white beard and a grey-violet turban wrapped over his head and shoulders, in an olive mantle, raising his right hand, under a gold halo on a dark ground with white letters.",
  }),
  "maximus-the-confessor": art("maximus-the-confessor", [516, 645], 31, "File:Maximus the Confessor (mosaic).jpg", "Public domain", {
    work: "Mosaic medallion of St Maximus the Confessor, Nea Moni, Chios",
    artist: "Unknown",
    workDate: "11th century",
    alt: "A monk with short brown hair and a full beard in a blue-grey mantle, holding a small cross and raising his open palm, in a gold mosaic medallion edged with a beaded border.",
  }),
  "gregory-palamas": art("gregory-palamas", FULL, 35, "File:Григорий Палама 14в.jpg", "Public domain", {
    work: "Icon of St Gregory Palamas, Archbishop of Thessalonica, the Pushkin Museum, Moscow",
    artist: "Unknown",
    workDate: "15th century",
    alt: "A bishop with dark hair and a long dark beard in a white omophorion with black crosses over a vestment of gold-ringed crosses, blessing and holding a red and gold Gospel, on a cracked ochre ground with red Greek letters.",
  }),
  "gregory-of-nyssa": art("gregory-of-nyssa", FULL, 24, "File:Gregory of Nyssa (Menologion of Basil II).jpg", "Public domain", {
    work: "St Gregory of Nyssa, a miniature of the Menologion of Basil II, the Vatican Library",
    artist: "The painters of the Menologion of Basil II, Constantinople",
    workDate: "c. 985",
    alt: "A grey-bearded bishop in an olive phelonion and a white omophorion with black crosses, raising his right hand and holding a gold Gospel, before a gabled building with a blue frieze and arched windows.",
  }),
  "spyridon-of-trimythous": art("spyridon-of-trimythous", FULL, 32, "File:Saint Spyridon icon.jpg", "Public domain", {
    work: "Icon of St Spyridon enthroned, from the Levant (Icônes arabes, Institut du monde arabe, 2003)",
    artist: "Unknown",
    workDate: "17th century",
    alt: "An old bishop with a long grey beard in his woven shepherd's hat, red phelonion and white omophorion, blessing and holding a jewelled Gospel, seated on a gold throne with his name in red across the top.",
  }),
  "epiphanius-of-salamis": art("epiphanius-of-salamis", [480, 600], 30, "File:Epiphanius-Kosovo.jpg", "Public domain", {
    work: "Fresco of St Epiphanius of Cyprus, Gračanica monastery",
    artist: "Unknown",
    workDate: "Not given on its page (the page names the fresco at Gračanica)",
    alt: "An old bishop with a long white beard and a balding head, in a white omophorion with large black and red crosses, holding an open scroll of Slavonic writing, under a gold halo on a blue ground.",
  }),
  "constantine-the-great": art("constantine-the-great", [480, 600], 29, "File:Constantine and Helen.png", "Public domain", {
    work: "Icon of St Constantine and St Helen by Emmanuel Tzanes, the Loverdos collection, Athens: St Constantine alone, under his name",
    artist: "Emmanuel Tzanes",
    workDate: "1669",
    alt: "A crowned emperor with dark curly hair and a short beard, in a jewelled gold collar over a red robe, holding a sceptre, with an ornamented halo on a gold ground and his name in red.",
  }),
  "ignatius-of-antioch": art("ignatius-of-antioch", FULL, 29, "File:Agios Ignatios Theophoros Stavronikita.webp", "Public domain", {
    work: "Fresco of St Ignatius the God-bearer, Stavronikita monastery, Mount Athos",
    artist: "Theophanes the Cretan",
    workDate: "1545",
    alt: "A bishop with brown hair and a long brown beard in a gold halo, in white vestments patterned with dark red crosses, his right hand raised and a red Gospel under his arm, on a dark ground with his name in white.",
  }),
  "polycarp-of-smyrna": art("polycarp-of-smyrna", FULL, 34, "File:Polycarp of Smyrna2.jpg", "CC0", {
    work: "Fresco of St Polycarp of Smyrna, the church of St George, Staro Nagoričane",
    artist: "Unknown (the photograph is the uploader's, CC0)",
    workDate: "14th century, as its page's categories give it",
    alt: "An old bishop with a high bald forehead and a long white beard in a large orange halo, in a white omophorion with dark red crosses, holding a jewelled Gospel, on a deep blue ground with his name in white.",
  }),
  "justin-martyr": art("justin-martyr", FULL, 27, "File:Иустин Философ, Афон.jpg", "Public domain", {
    work: "Fresco of St Justin the Philosopher, Stavronikita monastery, Mount Athos",
    artist: "Theophanes the Cretan",
    workDate: "c. 1546",
    alt: "A man with short dark curly hair and a dark beard in a gold halo, in an orange-red tunic with gold-embroidered shoulders under a pale mauve cloak, holding a small cross and a closed book, on a dark ground.",
  }),
  "meletius-of-antioch": art("meletius-of-antioch", FULL, 32, "File:Saint Meletios of Antioch Staro Nagoričane.jpg", "Public domain", {
    work: "Fresco of St Meletius of Antioch, the church of St George, Staro Nagoričane",
    artist: "Unknown",
    workDate: "1317",
    alt: "A balding bishop with a long dark forked beard in a large ochre halo, in a white omophorion with large dark crosses, holding a jewelled Gospel, on a deep blue ground with white Greek letters.",
  }),
  "eustathius-of-antioch": art("eustathius-of-antioch", FULL, 33, "File:Saint Eustathios of Antioch Fresco Peribleptos.jpg", "Public domain", {
    work: "Fresco of St Eustathius of Antioch, named on its page as from the church of the Theotokos Peribleptos, Ohrid",
    artist: "Unknown",
    workDate: "14th century",
    alt: "An old bishop with thick white hair and a long white beard in a large ochre halo, in a white omophorion with dark crosses, holding a jewelled book, on a deep blue ground with white Greek letters.",
  }),
  "ephraim-the-syrian": art("ephraim-the-syrian", [480, 600], 33, "File:Ephrem the Syrian (mosaic in Nea Moni).jpg", "Public domain", {
    work: "Mosaic of St Ephraim the Syrian, Nea Moni, Chios",
    artist: "Unknown",
    workDate: "11th century",
    alt: "A mosaic of a monk with short grey hair and a short grey beard in a dark olive cloak, on a field of gold tesserae with parts of dark Greek letters at both edges.",
  }),
  "apostle-matthew": art("apostle-matthew", FULL, 35, "File:The Apostle Matthew.jpg", "CC0", {
    work: "The Apostle Matthew, icon",
    artist: "Unknown",
    workDate: "Not given on its page",
    alt: "The Apostle Matthew with dark hair and a long grey-brown beard, his head bowed, turning the pages of a jewelled Gospel, on a worn gold ground with his name in red and a pale stripe of paint loss at the left.",
  }),
  "apostle-thomas": art("apostle-thomas", FULL, 29, "File:Saint Thomas K. Tzanes.png", "Public domain", {
    work: "Icon of St Thomas the Apostle, signed by Konstantinos Tzanes",
    artist: "Konstantinos Tzanes",
    workDate: "1670",
    alt: "A beardless young apostle with short dark hair in an ornate gold halo, in a black tunic under a red cloak, holding an unrolled scroll, seated on a carved gold throne on a bright gold ground.",
  }),
  "apostle-philip": art("apostle-philip", FULL, 32, "File:Paintings in the Church of the Theotokos Peribleptos of Ohrid 037.jpg", "Public domain", {
    work: "Fresco of the Apostle Philip, the church of the Theotokos Peribleptos, Ohrid",
    artist: "Michael and Eutychios",
    workDate: "14th century",
    alt: "A young, beardless apostle with short brown hair in a gold halo, in a white tunic under a plum-purple cloak, holding a rolled white scroll, on a deep blue ground with his name in white.",
  }),
  "apostle-bartholomew": art(
    "apostle-bartholomew",
    FULL,
    25,
    "File:Apostle Bartholomew. Fresco of the Church of Agios Nikolaos. Stavronikita Monastery. Athos.jpg",
    "Public domain",
    {
      work: "Fresco of the Apostle Bartholomew, the church of St Nicholas, Stavronikita monastery, Mount Athos",
      artist: "Theophanes the Cretan and Symeon",
      workDate: "1546",
      alt: "An apostle with short wavy brown hair and a short brown beard in a gold halo, in a pale blue tunic under a deep red cloak, holding a small white scroll, on a dark ground with his name in white.",
    },
  ),
  "prochorus-the-deacon": art("prochorus-the-deacon", FULL, 34, "File:John the Evangelist and Prochorus by E.Lambardos (1602).jpg", "Public domain", {
    work: "Icon of St John the Theologian and St Prochorus by Emmanuel Lambardos: St Prochorus alone, under his name",
    artist: "Emmanuel Lambardos",
    workDate: "1602",
    alt: "A young, beardless scribe with short brown curly hair in a gold halo, his head bowed as he writes with a reed pen, in a blue tunic under an olive cloak, before the dark cave of Patmos.",
  }),
  "jerome-of-stridon": art("jerome-of-stridon", FULL, 30, "File:Saint Jerome as Scholar MET DT3103.jpg", "Public domain", {
    work: "Saint Jerome as Scholar by El Greco, the Metropolitan Museum of Art",
    artist: "El Greco",
    workDate: "c. 1610",
    alt: "An old man with short white hair and a long white beard falling to his chest, in a crimson cape over a red cassock, against a plain black ground.",
  }),
  "gregory-the-dialogist": art("gregory-the-dialogist", FULL, 30, "File:Άγιος Γρηγόριος ο Διάλογος 0633.jpg", "CC0", {
    work: "Icon of St Gregory the Dialogist, from the Savvathiana monastery, the collection of St Catherine, Heraklion",
    artist: "Unknown Cretan painter (the photograph is C. Messier's, CC0)",
    workDate: "Second half of the 17th century",
    alt: "A bishop with a grey forked beard in a tall gold headdress and a white omophorion with black crosses, holding a long unrolled scroll of Greek text, on a gold ground with seams in its boards.",
  }),
  "leo-the-great": art("leo-the-great", FULL, 45, "File:Herrera mozo San León magno Lienzo. Óvalo. 164 x 105 cm. Museo del Prado.jpg", "Public domain", {
    work: "Saint Leo the Great by Francisco de Herrera the Younger, the Prado, Madrid",
    artist: "Francisco de Herrera the Younger",
    workDate: "17th century",
    alt: "An old man with a bushy white beard in a tall dark tiara banded in gold, in a brown and red cope with a jewelled clasp, a gilded cross at his side, on a cloudy olive ground.",
  }),
  "agatho-of-rome": art("agatho-of-rome", [540, 675], 26, "File:Pope Agatho (Menologion of Basil II).jpg", "Public domain", {
    work: "St Agatho, Pope of Rome, a miniature of the Menologion of Basil II, the Vatican Library",
    artist: "The painters of the Menologion of Basil II, Constantinople",
    workDate: "c. 985",
    alt: "A grey-haired, bearded bishop in a gold halo holding a jewelled book to his chest, in a brown cloak over a blue tunic and a white omophorion, on a gold ground under a red gable.",
  }),
  "hosius-of-cordova": art("hosius-of-cordova", [540, 675], 28, "File:El obispo Osio - Ángel María de Barcia Pavón.jpg", "Public domain", {
    work: "El obispo Osio by Ángel María de Barcia, the Museo de Bellas Artes, Córdoba",
    artist: "Ángel María de Barcia Pavón",
    workDate: "c. 1879",
    alt: "A seated bishop with a long white beard in a white mitre and a red chasuble, holding a crozier and an open book lettered in Latin with words of the Creed, before a dark niche.",
  }),
  "florian-of-lorch": art("florian-of-lorch", FULL, 33, "File:Francesco del Cossa, Saint Florian, c. 1473-1474, NGA 368.jpg", "CC0", {
    work: "Saint Florian by Francesco del Cossa, the National Gallery of Art, Washington",
    artist: "Francesco del Cossa",
    workDate: "c. 1473 to 1474",
    alt: "A young man with shoulder-length curly brown hair under a tooled gold halo, in a red cloak over a dark blue tunic, holding a red rose, on a gold ground.",
  }),
  "mary-magdalene": art("mary-magdalene", FULL, 36, "File:Mary Magdalene (Russia, c. 1890, Clinton).jpg", "Public domain", {
    work: "Icon of St Mary Magdalene, the Museum of Russian Icons, Clinton",
    artist: "Unknown Russian icon painter",
    workDate: "c. 1890",
    alt: "A woman in an orange veil and a blue-green cloak holding a small silver myrrh vessel, with a radiant gold halo and Slavonic name plates on a chased gold ground.",
  }),
  "seraphim-of-sarov": art("seraphim-of-sarov", FULL, 40, "File:Seraphim of Sarov (after 1903, priv.coll).jpg", "Public domain", {
    work: "Icon of St Seraphim of Sarov, perhaps from the workshop of the Diveyevo monastery, oil on panel",
    artist: "Unknown Russian icon painter",
    workDate: "After 1903",
    alt: "An old monk with long white hair and a full white beard, in a dark mantle and a pale stole with gold crosses, his right hand on his chest, within a halo of painted flowers on chased gold.",
  }),
  "paul-of-thebes": art("paul-of-thebes", [540, 675], 30, "File:Saint-Paul-of-Thebes-and-Saint-John-the-Hut-Dweller-Athonite.jpg", "Public domain", {
    work: "Athonite fresco of St Paul of Thebes and St John the Hut-Dweller: St Paul alone, under his name",
    artist: "Unknown",
    workDate: "14th to 15th century",
    alt: "An aged hermit with long grey hair and a beard below his waist, in a garment of woven palm leaves, his hand on his chest, in a gold halo on a dark blue ground with his name in white.",
  }),
  hilarion: art(
    "hilarion",
    FULL,
    35,
    "File:Church of Panagia tou Arakos, nave, southwest bay, wall paintings, Lagoudera, Cyprus - West soffit, St. Hilarion, detail of upper half, before cleaning - MSBZ004 BF S 1979 2198D - Dumbarton Oaks.jpg",
    "CC0",
    {
      work: "Wall painting of St Hilarion, the church of the Panagia tou Arakos, Lagoudera, Cyprus, before its cleaning",
      artist: "Unknown (the photograph is David Winfield's for Dumbarton Oaks, CC0)",
      workDate: "Not given on its page (the church's paintings are generally dated 1192)",
      alt: "An old monk with a bald crown and a long white beard in a brown mantle, holding a slender cross, within a large ochre halo on a mottled blue-green ground with his name in white.",
    },
  ),
  "mary-of-egypt": art(
    "mary-of-egypt",
    FULL,
    27,
    "File:Ecole de (Ecole serbe) Serbie - La Communion de sainte Marie l'Egyptienne - PPP4884 - Musée des Beaux-Arts de la ville de Paris.jpg",
    "Public domain",
    {
      work: "The Communion of St Mary of Egypt, a Serbian icon, the Musée des Beaux-Arts de la Ville de Paris: St Mary alone",
      artist: "Unknown Serbian icon painter",
      workDate: "1723",
      alt: "A thin, sun-darkened woman with long grey hair, kneeling in profile with her hands raised and her mouth open to receive Communion, a brown mantle about her, under a faint halo on a cracked gold ground.",
    },
    "2026-10-19",
  ),
  "augustine-of-hippo": art("augustine-of-hippo", FULL, 26, "File:Saint Augustine by Philippe de Champaigne.jpg", "Public domain", {
    work: "Saint Augustine by Philippe de Champaigne, the Los Angeles County Museum of Art",
    artist: "Philippe de Champaigne",
    workDate: "c. 1645 to 1650",
    alt: "A grey-bearded bishop in a gold embroidered cope over a white alb, a quill in one hand and a flaming heart held up in the other, looking up into a ray of light beside an open book and a carpeted table.",
  }, "2026-10-19"),
  "apostle-james-zebedee": art("apostle-james-zebedee", FULL, 28, "File:Saint James Major A17835.jpg", "Public domain", {
    work: "Saint James Major by Simone Martini, the National Gallery of Art, Washington",
    artist: "Simone Martini",
    workDate: "c. 1315 to 1320",
    alt: "A man with brown hair and a full beard in an orange mantle over a dark tunic with an embroidered collar, looking aside, under a tooled gold halo on a gold ground with parts of his Latin name.",
  }, "2026-10-19"),
  "apostle-james-alphaeus": art("apostle-james-alphaeus", FULL, 31, "File:El Greco - Saint James the Younger - Google Art Project.jpg", "Public domain", {
    work: "Saint James the Younger by El Greco, the Museum of Fine Arts, Budapest",
    artist: "El Greco",
    workDate: "c. 1600",
    alt: "A man with short dark hair and a dark beard turning his head to one side, in a green tunic and a rose mantle, against a pale blue sky.",
  }, "2026-10-19"),
  "apostle-jude": art("apostle-jude", FULL, 33, "File:Saint Judas Thaddeus A17829.jpg", "Public domain", {
    work: "Saint Judas Thaddeus by Simone Martini, the National Gallery of Art, Washington",
    artist: "Simone Martini",
    workDate: "c. 1315 to 1320",
    alt: "A young beardless man with short auburn hair in an orange mantle over a dark embroidered tunic, looking aside, under a tooled gold halo on a gold ground with parts of his Latin name.",
  }, "2026-10-19"),
  "apostle-simon-zealot": art("apostle-simon-zealot", FULL, 33, "File:Saint Simon A17838.jpg", "Public domain", {
    work: "Saint Simon by Simone Martini, the National Gallery of Art, Washington",
    artist: "Simone Martini",
    workDate: "c. 1315 to 1320",
    alt: "A bearded man with brown hair in a green mantle over a dark embroidered tunic, looking aside, under a tooled gold halo on a gold ground with parts of his Latin name.",
  }, "2026-10-19"),
  "apostle-matthias": art("apostle-matthias", FULL, 30, "File:Saint Matthias MET DP168805.jpg", "CC0", {
    work: "Saint Matthias by Simone Martini and his workshop, the Metropolitan Museum of Art, New York",
    artist: "Simone Martini and workshop",
    workDate: "c. 1317 to 1319",
    alt: "A bearded man with short brown hair in a rose mantle over a gold tunic, looking down to one side, under a tooled gold halo on a gold ground with part of his Latin name.",
  }, "2026-10-19"),
  "theodosius-the-great": art("theodosius-the-great", FULL, 36, "File:Anthonis van Dyck 005.jpg", "Public domain", {
    work: "St Ambrose barring Theodosius from Milan Cathedral by Anthony van Dyck, the National Gallery, London: the emperor before the bishop",
    artist: "Anthony van Dyck",
    workDate: "1619 to 1620",
    alt: "An emperor crowned with laurel, in a red cloak over armour, held back at the church door by the outstretched hands of a white-bearded bishop in a gold mitre and gold vestments, with a crozier and onlookers behind.",
  }, "2026-10-19"),
  // 1.9, build 89 note 3. His saint's page carries a small cut of the same
  // photograph (lib/saints/iconRights.ts); this one is the sharper cover.
  "arsenius-the-great": art(
    "arsenius-the-great",
    FULL,
    30,
    "File:Fethiye Camii, parekklesion, southwest bay, mosaics, Istanbul, Turkey - North arch, east soffit, St. Arsenius, detail of bust - MSBZ004 BF T F 040 A - Dumbarton Oaks.jpg",
    "CC0",
    {
      work: "Mosaic of St Arsenius the Great, the parekklesion of the Pammakaristos church (Fethiye Camii), Constantinople",
      artist: "Unknown Byzantine mosaicists (the photograph is the Byzantine Institute's for Dumbarton Oaks, CC0)",
      workDate: "c. 1310",
      alt: "A gold mosaic bust of an old monk with close grey curls and a long white beard falling in waves to his chest, in a brown mantle, within a gold halo, the last letters of his Greek name set in the gold at the right.",
    },
    "2026-11-10",
  ),
  "tarasius-of-constantinople": art("tarasius-of-constantinople", FULL, 28, "File:Agios Tarasios Peribleptos.jpg", "Public domain", {
    work: "Fresco of St Tarasius of Constantinople, the church of the Theotokos Peribleptos, Ohrid",
    artist: "Unknown",
    workDate: "14th century",
    alt: "A grey-haired bishop with a long grey-brown beard in a gold halo, in a white omophorion with large black crosses, blessing and holding a jewelled Gospel, on a deep blue ground with his name in white.",
  }, "2026-11-10"),
};

/**
 * The icon of a council, for its books whose author has no picture (1.9,
 * build 89 note 3: "there's some books in there that are attributed to
 * councils ... you can easily do the icon of the council"), given to each
 * book in lib/reading/coverArt.ts (WORK_ART). Ephesus has two: the
 * Stavropoleos painting, whose own words name St Celestine at the council,
 * for his letter; Dionisius's Ferapontov fresco for St John Cassian's On the
 * Incarnation, written against Nestorius on the eve of the council. The
 * councils whose picture no book on the plate needs keep the one the app
 * already shows them (lib/councils/page.ts, councilPicture).
 */
export const COUNCIL_COVERS: Readonly<Record<string, StreamedArt>> = {
  "first-nicaea": art(
    "first-nicaea",
    FULL,
    30,
    "File:Μιχαήλ Δαμασκηνός - Α΄ Οικουμενική Σύνοδος 7741.jpg",
    "Public domain",
    {
      work: "Icon of the First Ecumenical Council by Michael Damaskinos, from the Vrontisi monastery, the collection of St Catherine, Heraklion",
      artist: "Michael Damaskinos (the photograph is C. Messier's)",
      workDate: "1591",
      alt: "An emperor enthroned among tiers of haloed bishops in white vestments with black crosses, an open Gospel on a throne at the centre, and Arius bowed under an arch at the foot, all on gold.",
    },
    "2026-11-10",
    "councils",
  ),
  "first-constantinople": art(
    "first-constantinople",
    FULL,
    30,
    "File:Homilies of Gregory the Theologian gr. 510, f 723.jpg",
    "Public domain",
    {
      work: "The Second Ecumenical Council, a miniature of the Homilies of St Gregory the Theologian, Paris, Bibliothèque nationale de France, gr. 510, fol. 355",
      artist: "Unknown Byzantine illuminators",
      workDate: "c. 880",
      alt: "An open Gospel on a jewelled throne under an arch, bishops on a curved bench at the left and a haloed emperor among bishops at the right, before pink and blue buildings, the paint flaked in many places.",
    },
    "2026-11-10",
    "councils",
  ),
  ephesus: art(
    "ephesus",
    FULL,
    40,
    "File:Council of Constantinople 381-stavropoleos church.jpg",
    "Public domain",
    {
      work: "Wall painting of the Third Ecumenical Council, Ephesus 431, the Stavropoleos church, Bucharest; its own inscriptions name Theodosius the Younger, Pope Celestine and St Cyril at Ephesus, though Commons files it as the council of 381",
      artist: "Unknown (the photograph is Kostisl's, released by him into the public domain)",
      workDate: "Not given on its page (the church was built in 1724)",
      alt: "An emperor enthroned at the centre holding a cross, bishops with gold haloes seated close on both sides, and a forest of spears with pennants rising above them against a grey-blue sky.",
    },
    "2026-11-10",
    "councils",
  ),
  "ephesus-ferapontov": art(
    "ephesus-ferapontov",
    [480, 600],
    30,
    "File:EcumenicalCouncil 3rd 09-07.jpg",
    "Public domain",
    {
      work: "Fresco of the Third Ecumenical Council, the cathedral of the Nativity of the Theotokos, Ferapontov monastery",
      artist: "Dionisius",
      workDate: "1502",
      alt: "A young emperor enthroned under a domed canopy between seated bishops in white, and below them a row of standing bishops with gold haloes holding a long patterned cloth, in pale ochre, red and white on blue.",
    },
    "2026-11-10",
    "councils",
  ),
};

/**
 * An icon for each How you feel door (lib/reading/feelings.ts; 1.9, build
 * 89 note 3: "an icon attributed to a saint that is also attributed to that
 * specific emotion ... ensure it's an Eastern Orthodox canonical saint").
 * Why each saint answers his feeling is in docs/licensing/COVER_ICONS.md,
 * ours, marked for the clergy review with the collections themselves
 * (COLLECTIONS_REVIEW). Four wide by five tall, the face high enough to
 * clear the name at the door's foot.
 */
export const FEELING_COVERS: Readonly<Record<string, StreamedArt>> = {
  love: art(
    "love",
    FULL,
    33,
    "File:Ritzos Andreas - St John the Theologian writing his Revelations on an open scroll - Google Art Project.jpg",
    "Public domain",
    {
      work: "Icon of St John the Theologian writing, by Andreas Ritzos, the Benaki Museum, Athens",
      artist: "Andreas Ritzos",
      workDate: "1449 to 1450",
      alt: "St John, balding and grey-bearded, in a dark green tunic and a rose mantle, bends over an unrolled scroll that opens his Gospel in Greek, a reed pen in his hand, on a worn gold ground.",
    },
    "2026-11-10",
    "feelings",
  ),
  anger: art(
    "anger",
    FULL,
    37,
    "File:Преподобный Моисей Мурин. Фрагмент новгородской иконы конца XV века.jpg",
    "Public domain",
    {
      work: "St Moses the Ethiopian, a detail of a Novgorod icon of St Pimen, the Prophet Elijah and St Moses, the Novgorod Museum",
      artist: "Unknown Novgorod icon painter",
      workDate: "End of the 15th century",
      alt: "The dark face of a monk with white curling hair and a white curling beard, in a dark collar and a red-brown mantle, before a worn gold halo.",
    },
    "2026-11-10",
    "feelings",
  ),
  hatred: art(
    "hatred",
    [487, 609],
    30,
    "File:Church of Panagia tou Arakos, bema, sanctuary, walls, wall paintings, Lagoudera, Cyprus - North recess, east side, St. Stephen, the Protomartyr - MSBZ004 BF T Lag D 1 3 - Dumbarton Oaks.jpg",
    "CC0",
    {
      work: "Wall painting of St Stephen the Protomartyr, the sanctuary of the Panagia tou Arakos, Lagoudera, Cyprus",
      artist: "Unknown (the photograph is Dumbarton Oaks', CC0)",
      workDate: "Not given on its page (the church's paintings are generally dated 1192)",
      alt: "A young deacon with short brown hair in a white sticharion, his head tilted inside a large ochre halo, holding a small jewelled casket, on a deep blue-green ground with his name and title in white Greek letters.",
    },
    "2026-11-10",
    "feelings",
  ),
  fear: art(
    "fear",
    FULL,
    30,
    "File:Shadrach, Meshach, and Abednego icon.jpg",
    "Public domain",
    {
      work: "Icon of the Three Holy Youths in the furnace, from the Levant (Icônes arabes, Institut du monde arabe, 2003): the angel and the youth beneath him, his companions at the edges",
      artist: "Unknown",
      workDate: "16th century",
      alt: "An angel with a gold halo and orange wings leans over a young man in a jewelled robe who stands with his hands raised in a gold halo, red flames rising around them, two more haloed youths at the edges of the white-framed furnace.",
    },
    "2026-11-10",
    "feelings",
  ),
  grief: art(
    "grief",
    FULL,
    40,
    "File:Meister von Nerezi 001.jpg",
    "Public domain",
    {
      work: "The Lamentation, wall painting in the church of St Panteleimon, Nerezi",
      artist: "Unknown painters of Nerezi",
      workDate: "1164",
      alt: "The Theotokos, in a dark mantle within a gold halo, holds her dead Son's face to her own, His body bare to the waist on a white shroud, Greek letters naming them above, on a grey-blue and ochre ground.",
    },
    "2026-11-10",
    "feelings",
  ),
  despondency: art(
    "despondency",
    FULL,
    27,
    "File:Saint Anthony from the Dionysiou Monastery on Mount Athos.jpg",
    "Public domain",
    {
      work: "Cretan icon of St Antony the Great, the Dionysiou monastery, Mount Athos",
      artist: "Unknown Cretan painter",
      workDate: "16th century",
      alt: "An old monk with a white beard in a blue-grey cowl marked with a cross and a brown mantle, holding a staff with a carved head, within an ornamented gold halo on a gold ground with his name in red.",
    },
    "2026-11-10",
    "feelings",
  ),
  envy: art(
    "envy",
    FULL,
    30,
    "File:École de (École bulgare) Bulgarie - Saint Jean-Baptiste - PPP4890 - Musée des Beaux-Arts de la ville de Paris.jpg",
    "Public domain",
    {
      work: "Icon of St John the Forerunner as the Angel of the Desert, a Bulgarian icon, the Musée des Beaux-Arts de la Ville de Paris (Petit Palais)",
      artist: "Unknown Bulgarian icon painter",
      workDate: "1702",
      alt: "A gaunt man with long dark hair and a dark beard within a worn ornamented halo, in a red tunic under a dark mantle, pale wings rising behind his shoulders and a thin cross at his side.",
    },
    "2026-11-10",
    "feelings",
  ),
  loneliness: art(
    "loneliness",
    FULL,
    38,
    "File:Elijah (Lebanon) 18th Century.jpg",
    "Public domain",
    {
      work: "Icon of the Prophet Elijah in the wilderness, from the Levant (Icônes arabes, Institut du monde arabe, 2003)",
      artist: "Unknown",
      workDate: "18th century",
      alt: "An old prophet with long grey hair and a grey beard sits alone in a dark cave, his head resting on his hand, in an orange tunic, a red mantle and a blue-green fur cloak, a black raven with bread on the rock above.",
    },
    "2026-11-10",
    "feelings",
  ),
};

/**
 * A book with no saint to show carries its own picture, keyed by the work
 * (lib/reading/cards.ts): the Way of a Pilgrim, which is anonymous; and from
 * 1.9 St Anianus's Life, whose picture is the scene it tells.
 */
export const WORK_COVERS: Readonly<Record<string, StreamedArt>> = {
  "theophan-the-recluse/way-of-a-pilgrim": art("way-of-a-pilgrim", FULL, 21, "File:Перов Странник(ГТГ).jpg", "Public domain", {
    work: "The Wanderer (Strannik) by Vasily Perov, the Tretyakov Gallery, Moscow",
    artist: "Vasily Perov",
    workDate: "1870",
    alt: "An old wanderer with grey hair and a white beard, a sack and a rolled umbrella on his back and a tin mug at his belt, leaning on his staff against a dark ground.",
  }, "2026-10-19"),  // 1.9, build 89 note 3. No icon of St Anianus passed: the painting of the
  // story his book tells, as the rule above allows, his own book's picture
  // and not his face (he wears a turban and no halo, not yet baptized).
  "anianus-of-alexandria/the-second-bishop": art(
    "anianus-of-alexandria",
    FULL,
    40,
    "File:1498 da Conegliano Die Heilung des Anianus durch den heiligen Markus Gemäldegalerie Berlin anagoria.jpg",
    "Public domain",
    {
      work: "The Healing of Anianus by St Mark, by Cima da Conegliano, the Gemäldegalerie, Berlin: the cobbler and the evangelist",
      artist: "Cima da Conegliano",
      workDate: "1497 to 1499",
      alt: "A cobbler in a white turban and a green jerkin, seated at his bench, holds out his wounded hand to a dark-bearded man in a blue mantle who reaches to heal it, among turbaned men in rich robes in a city square.",
    },
    "2026-11-10",
  ),
};

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
 */

const commons = (title: string) => `https://commons.wikimedia.org/wiki/${encodeURI(title.replace(/ /g, "_"))}`;

function art(
  slug: string,
  size: [number, number],
  focusY: number,
  source: string,
  license: "Public domain" | "CC0",
  rights: { work: string; artist: string; workDate: string; alt: string },
): StreamedArt {
  return {
    kind: "streamed",
    file: `/covers/authors/${slug}.v1.jpg`,
    width: size[0],
    height: size[1],
    focusY,
    source,
    license,
    evidenceUrl: commons(source),
    inspectedOn: "2026-10-16",
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
};

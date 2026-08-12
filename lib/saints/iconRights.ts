// Rights for every file in public/saints/icons/.
//
// WHY THIS EXISTS
//
// 110 icons ship in the app. On 2026-08-10, 107 of them had no source, no
// licence and no attribution anywhere in the repo. Two of the four files that
// had ever been inspected turned out to be watermarked works by living
// iconographers, found rendering in production. History media, section media
// and shop media each carry a required rights record enforced by a test.
// This directory carried nothing, and lib/media/__tests__/sections.test.ts
// names it as the reason that suite was written: "A registry without a test
// is a registry that rots."
//
// WHY IT IS NOT ON THE SAINT TYPE
//
// lib/saints/saints.ts must stay free of imports and enums, because
// scripts/emit-registries.mjs loads it under Node type-stripping to build the
// native content package. A sibling registry is also the right shape anyway:
// rights attach to a file, not to a person, and three separate registries
// point into this directory. AUTHOR_ICONS maps roughly a hundred author-name
// aliases onto 37 paths, and the prayer slideshow frames belong to no saint
// at all. lib/saints/authority.ts is the same pattern.
//
// WHY IT IS KEYED ON THE BARE FILENAME
//
// Because the completeness check is a set difference against readdirSync, and
// because a filename is not derivable from a slug. Before this landed the
// directory held cyril-&-methodius.jpg, photius the great.jpg and
// LRPSaintIakovosTsalikisofEvialevel.jpg.
//
// THE RULE THIS FILE SERVES
//
// Recorded in three places in this repo and worth restating once more here:
// the licence field will not tell you whether the picture is what you meant.
// A Commons search for an orthodox oil lamp returned an electrical wiring
// diagram. A Hagia Sophia interior read as a mosque. A Vatican scan carried a
// diagonal RESERVED watermark across the plate. Open the file and look at it.
// `inspectedOn` is written only by the promote step of
// scripts/fetch-saint-icons.mjs, which is what makes the field mean anything.

export const ICONS_DIR = "public/saints/icons";
export const ICONS_URL_PREFIX = "/saints/icons/";

/** The seven fields lib/media/sections.ts and lib/history/events.ts require. */
type RightsFields = {
  /** Describes the picture, not the saint. Checked against the image. */
  alt: string;
  /** The work depicted. */
  work: string;
  artist: string;
  /** When the work was made, e.g. "c. 985" or "Contemporary". */
  workDate: string;
  source: string;
  license: string;
  evidenceUrl: string;
};

/**
 * A settled row. Two postures, because public-domain and used-with-permission
 * are genuinely different and the test applies different rules to each. A
 * third "unverified" variant is deliberately NOT part of this union: it would
 * force every rights field optional and the type would stop protecting
 * anything. The debt lives in its own map below.
 */
export type IconRights =
  | ({
      status: "verified";
      /** ISO date a human opened the file and looked at it. */
      inspectedOn: string;
    } & RightsFields)
  | ({
      status: "permission";
      inspectedOn: string;
      /** The iconographer or rights holder who granted use. */
      grantedBy: string;
      /** ISO date the owner confirmed the grant. */
      confirmedOn: string;
      /** Where the written permission is filed. Absent means not yet filed. */
      filedAt?: string;
      license: "Used with permission";
      evidenceUrl?: string;
    } & Omit<RightsFields, "license" | "evidenceUrl">);

/** Files whose rights are settled. Every row here was opened and looked at. */
export const ICON_RIGHTS: Record<string, IconRights> = {
  "sixtus-of-rome.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A Renaissance fresco of an elderly pope in profile wearing a jewelled triple tiara and a gold cope over white, a faint halo behind him, set in an architectural niche with a fluted shell.",
    work: "Renaissance fresco of St Sixtus II, from the series of early sainted popes. Western work in Latin regalia, not Byzantine iconography.",
    artist: "Unrecorded",
    workDate: "15th century",
    source: "Supplied by the owner",
  },
  "abraham-of-smolensk.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bust of a dark-bearded monastic in a hooded schema over a green mantle, a gold halo behind him. Small in the original, so it renders softer than the rest of the set.",
    work: "Icon of St Abraham of Smolensk",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "saint-george.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A young beardless soldier-martyr with dark curly hair in scale armour under a red cloak, holding an upright spear with a sword and shield at his side, on a gold ground with a Greek inscription naming him George.",
    work: "Icon of St George the Trophy-bearer",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "alexander-of-svir.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bearded monastic in a blue-grey mantle over an ochre habit, holding a furled scroll, on a pale ground with a Slavonic inscription naming him Alexander of the Svir.",
    work: "Icon of St Alexander of Svir",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "pimen-the-great.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "An elderly monastic with a long white beard in a russet mantle, holding an open scroll bearing a Greek sentence about the Lord resting in a meek heart, on a gold ground.",
    work: "Icon of St Poimen the Great",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "prophet-micah.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A roundel on a gold ground showing a grey-bearded prophet in a salmon mantle over teal, one hand raised in speech and a furled scroll in the other, inscribed Holy Prophet Micah.",
    work: "Icon of the Prophet Micah",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "anthony-the-roman.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bearded monastic in a hooded schema marked with small crosses, blessing with one hand and holding a furled scroll, on a gold ground with a Slavonic inscription naming him Anthony the Roman.",
    work: "Icon of St Anthony the Roman",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "titus-of-crete.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A white-bearded bishop blessing, in a violet phelonion under a white omophorion marked with black crosses, holding a red jewelled Gospel, inscribed in Greek as Titus, first bishop of Crete.",
    work: "Icon of St Titus of Crete",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "floros-and-lauros.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "Two young beardless martyrs standing side by side, one in a green cloak over red and the other in red over blue, holding a slender cross between them, on a gold ground.",
    work: "Icon of Sts Floros and Lauros",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "adrian-and-natalia.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A martyr couple standing together beneath Christ blessing from above, the man in a dark patterned tunic and the woman in a red mantle over blue with a headscarf, on a gold ground.",
    work: "Icon of Sts Adrian and Natalia",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "lawrence-the-archdeacon.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bearded deacon in a white sticharion with a gold orarion, holding a censer in one hand and a domed reliquary in the other, on a gold ground.",
    work: "Icon of St Laurence the Archdeacon",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "cyprian-of-carthage.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A roundel showing a grey-bearded bishop in a white omophorion marked with red crosses, holding a red jewelled Gospel, against a blue ground with a scrolled border.",
    work: "Icon of St Cyprian of Carthage",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "nikolaj-velimirovic.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bishop in a jewelled mitre and a white omophorion marked with black crosses, holding a hand cross and a jewelled Gospel, on a gold ground inscribed St Nikolai of Zhicha.",
    work: "Icon of St Nikolaj Velimirovic",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "euplus-of-catania.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A grey-bearded clergyman in white vestments covered with large black crosses, holding a red jewelled Gospel, on a pale gold ground inscribed Saint Euplus of Catania.",
    work: "Icon of St Euplus of Catania",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "thaddeus-of-edessa.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A white-haired apostle in a red tunic under a blue-grey himation, one hand raised in blessing and a furled scroll in the other, on a gold ground beneath an arch.",
    work: "Icon of St Thaddaeus of Edessa",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "diomedes-the-physician.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A young dark-bearded saint in a blue chiton under a red mantle, holding a physician's medicine box, on a gold ground with a Greek inscription naming him Diomedes.",
    work: "Icon of St Diomedes the Physician",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "lupus-of-thessaloniki.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A fresco of a young soldier-saint holding a spear, a red cloak over scale armour and a gold halo behind him, with a Greek inscription beginning Lup.",
    work: "Fresco of St Lupus of Thessaloniki",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "dometius-the-persian.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bearded monastic in a dark hood and green mantle standing before rocky cliffs, an open scroll at his feet, inscribed Saint Dometius of Persia.",
    work: "Icon of St Dometius the Persian",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "photius-and-anicetus.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "Two standing martyrs each holding a slender cross, one in a pale blue tunic under a mauve cloak and the other in orange under a green cloak, on a gold ground.",
    work: "Icon of Sts Photius and Anicetus",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "theodore-and-vasily-of-the-caves.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "Two bearded monastics standing side by side above a cave mouth, each holding an open scroll of Slavonic text, with inscriptions naming them of the Kiev Caves.",
    work: "Icon of Sts Theodore and Vasily of the Kiev Caves",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "patriarchs-alexander-john-paul.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bishop with a forked grey beard in a white omophorion marked with black crosses, holding a jewelled Gospel, on a gold ground. Shows Alexander of Constantinople alone, not all three patriarchs the day commemorates.",
    work: "Icon of St Alexander of Constantinople",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "eusignius-of-antioch.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "An elderly white-haired martyr in a pale blue tunic under a dark mantle, holding a slender martyr's cross, on a gold ground with a Greek inscription naming him Eusignius.",
    work: "Icon of St Eusignius of Antioch",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "or-of-the-thebaid.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A monochrome engraving of a bearded ascetic in a coarse sheepskin garment with a halo behind him, captioned in Greek as the Venerable Or. An engraving, not a painted icon.",
    work: "Engraving of St Or of the Thebaid",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "agathonicus-of-nicomedia.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A young dark-bearded martyr holding a slender cross, in a mauve cloak with embroidered bands over a blue tunic, on a gold ground.",
    work: "Icon of St Agathonicus of Nicomedia",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "aemilian-of-cyzicus.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "An elderly bishop with a long white beard in vestments patterned with dark crosses, holding an open scroll of Greek text, inscribed Aemilian of Cyzicus.",
    work: "Icon of St Aemilian of Cyzicus",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "dalmatus-of-constantinople.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A bearded monastic in a dark hooded schema holding an open scroll of Slavonic text, on a pale ground. Shows Isaac of Dalmatia alone, not all three the day commemorates.",
    work: "Icon of St Isaac of Dalmatia",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "myron-of-crete.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A white-bearded bishop on a gold ground, blessing with one hand and holding a jewelled Gospel, wearing a white omophorion marked with dark crosses, with a Greek inscription reading Myron, Bishop of Crete.",
    work: "Icon of St Myron of Crete",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "myron-of-cyzicus.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A dark-bearded priest in deep blue vestments holding a red and gold Gospel book, medallions of Christ and the Theotokos at his collar, with a Greek inscription reading Myron the Hieromartyr.",
    work: "Icon of St Myron the Hieromartyr",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "phanourios-the-newly-revealed.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A young beardless soldier in armour under a red cloak, holding a slender cross in one hand and a lit candle in the other, on a gold ground inscribed with his name in Greek.",
    work: "Icon of St Phanourios",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "peter-of-moscow.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A Russian hierarch in a white monastic klobuk and a sakkos patterned with crosses, raising his hand in blessing and holding a red Gospel book, with a Slavonic inscription naming him Metropolitan of Moscow.",
    work: "Icon of St Peter, Metropolitan of Moscow",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "basil-the-blessed.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "An emaciated ascetic stands bare with his hands raised in prayer before the coloured domes of Saint Basil's Cathedral, the Theotokos appearing in a cloud above, with a Slavonic inscription naming him the Blessed.",
    work: "Icon of St Basil the Blessed of Moscow",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "prophet-samuel.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A roundel on a gold ground showing an elderly prophet with a long white beard in a pale headdress and red mantle, holding the horn of anointing, inscribed Holy Prophet Samuel.",
    work: "Icon of the Prophet Samuel",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "andrew-stratelates.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A young soldier-saint in scale armour with a red cloak, holding an upright spear and a round shield, a gold halo behind him. No inscription is visible in the frame.",
    work: "Icon of a soldier-saint, filed as St Andrew Stratelates",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "herman-of-alaska.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A monastic elder in dark schema holding a hand cross and an open scroll bearing his words about loving God from this day forth, inscribed Saint Herman of Alaska.",
    work: "Icon of St Herman of Alaska",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "tikhon-of-zadonsk.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A painted portrait of a Russian bishop in a black klobuk with a jewelled panagia and a green mantle, holding a crozier, with Slavonic text panels in the upper corners. A portrait rather than an icon: there is no halo.",
    work: "Portrait of St Tikhon of Zadonsk",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "stephen-the-protomartyr.jpg": {
    status: "permission",
    inspectedOn: "2026-08-12",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-12",
    license: "Used with permission",
    alt: "A young beardless deacon in a white sticharion swinging a golden censer, a red cloak over one shoulder and a small church beside him, on a gold ground inscribed Saint Stephen the Protomartyr.",
    work: "Icon of St Stephen the Protomartyr",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "job-of-pochaev.jpg": {
    status: "verified",
    inspectedOn: "2026-08-12",
    alt: "A monastic saint in dark schema stands holding an open scroll, a gold halo behind him, with a Slavonic inscription panel below naming him Job and his birth surname Zhelezo.",
    work: "Icon of St Job of Pochaev",
    artist: "Unknown",
    workDate: "19th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Hegumen_Job_(in_the_world_Ivan_Ivanovich_Zhelezo).jpg",
  },
  "seven-sleepers-of-ephesus.jpg": {
    status: "verified",
    inspectedOn: "2026-08-12",
    alt: "Oval icon of seven haloed youths asleep together in a cave, with a Greek inscription across the gold ground.",
    work: "Icon of the Seven Sleepers of Ephesus",
    artist: "Anonymous",
    workDate: "c. 1800",
    source: "Wikimedia Commons, Yale University Art Gallery 1942.326",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Unknown_-_Seven_Sleepers_of_Ephesus_-_1942.326_-_Yale_University_Art_Gallery.jpg",
  },
  "maccabean-martyrs.jpg": {
    status: "verified",
    inspectedOn: "2026-08-12",
    alt: "Embroidered icon in gold thread and pearls showing the seven Maccabee youths between their mother Solomonia and the elder Eleazar, with Christ above.",
    work: "Embroidered icon of the Holy Maccabean Martyrs",
    artist: "Anonymous",
    workDate: "1525",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saints_Maccabees.jpg",
  },
  "praying3.jpg": {
    status: "permission",
    inspectedOn: "2026-07-25",
    alt: "The father running to receive the Prodigal Son, with the fatted calf and the music of the feast.",
    work: "The Return of the Prodigal Son",
    artist: "Tom Clark",
    workDate: "Contemporary",
    source: "TomClarkIcons.com, watermarked in the lower right of the file",
    grantedBy: "Tom Clark",
    confirmedOn: "2026-07-25",
    license: "Used with permission",
  },
  "icon4.jpg": {
    status: "permission",
    inspectedOn: "2026-07-25",
    alt: "The father embracing the Prodigal Son, the swine and the far country behind him.",
    work: "The Return of the Prodigal Son",
    artist: "Alevizakis",
    workDate: "Contemporary",
    source: "IconsAlevizakis.com, watermarked in the lower right of the file",
    grantedBy: "Alevizakis",
    confirmedOn: "2026-07-25",
    license: "Used with permission",
  },
  "john-the-baptist.jpg": {
    status: "permission",
    inspectedOn: "2026-08-01",
    alt: "St John the Forerunner as the Angel of the Desert: winged, in the camel-hair garment, holding the cross-staff, his own head on the platter at his feet and Christ blessing from the cloud.",
    work: "St John the Forerunner, Angel of the Desert",
    // Blocked on the owner. Listed in MISSING_ATTRIBUTION below, and the test
    // holds that list to files that really are permission rows, so this cannot
    // be quietly forgotten. It arrived in the repo as jjj.jpg.
    artist: "Not yet recorded",
    workDate: "Contemporary",
    source: "Supplied by the owner. Carries no watermark or embedded credit.",
    grantedBy: "The owner, on the iconographer's behalf",
    confirmedOn: "2026-08-01",
    license: "Used with permission",
  },
};

/**
 * Permission rows with no named iconographer. Attribution to nobody is weaker
 * than the rows around it. Blocked on the owner. MAY ONLY SHRINK.
 */
export const MISSING_ATTRIBUTION: readonly string[] = ["john-the-baptist.jpg"];

/**
 * The debt.
 *
 * Each value states only what the bytes and the registries prove: which
 * registry points at the file, its true container, its dimensions and its
 * size. No licence, no artist, no "probably PD-Art". An inferred licence
 * recorded in a rights file is worse than an admitted gap, because the next
 * reader believes it.
 *
 * The absence of `inspectedOn` on these rows is the machine-readable form of
 * "nobody has looked at this yet".
 *
 * THIS LIST MAY ONLY SHRINK. A new file may not be added to it; see
 * MAX_UNVERIFIED in lib/saints/__tests__/iconRights.test.ts. Together with the
 * completeness assertion that is the whole mechanism: a new icon must appear
 * in one of these two maps, and putting it here breaches the ceiling, so the
 * only way to add one is to add a rights-complete row.
 */
export const UNVERIFIED_ICONS: Record<string, string> = {
  "adrian-of-rome.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for adrian-of-rome. 321x420 JPG, 22 KB. Not yet opened and inspected.",
  "agatho-of-rome.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for agatho-of-rome. 250x410 JPG, 37 KB. Not yet opened and inspected.",
  "alexander-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for alexander-of-alexandria. 336x420 JPG, 32 KB. Not yet opened and inspected.",
  "anatolius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anatolius-of-constantinople. 382x420 JPG, 42 KB. Not yet opened and inspected.",
  "anianus-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anianus-of-alexandria and AUTHOR_ICONS. 400x400 JPG, 32 KB. Not yet opened and inspected.",
  "anthony-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anthony-the-great. 152x420 JPG, 20 KB. Not yet opened and inspected.",
  "apostle-andrew.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-andrew and AUTHOR_ICONS. 316x420 JPG, 33 KB. Not yet opened and inspected.",
  "apostle-bartholomew.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-bartholomew and AUTHOR_ICONS. 290x420 JPG, 25 KB. Not yet opened and inspected.",
  "apostle-james-alphaeus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-james-alphaeus and AUTHOR_ICONS. 281x420 JPG, 24 KB. Not yet opened and inspected.",
  "apostle-james-zebedee.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-james-zebedee and AUTHOR_ICONS. 281x420 JPG, 26 KB. Not yet opened and inspected.",
  "apostle-john.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-john and AUTHOR_ICONS. 309x420 JPG, 25 KB. Not yet opened and inspected.",
  "apostle-jude.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-jude and AUTHOR_ICONS. 281x420 JPG, 27 KB. Not yet opened and inspected.",
  "apostle-matthew.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-matthew and AUTHOR_ICONS. 311x400 JPG, 29 KB. Not yet opened and inspected.",
  "apostle-matthias.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-matthias and AUTHOR_ICONS. 304x420 JPG, 33 KB. Not yet opened and inspected.",
  "apostle-paul.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-paul and AUTHOR_ICONS. 268x420 JPG, 28 KB. Not yet opened and inspected.",
  "apostle-peter.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-peter and AUTHOR_ICONS. 281x420 JPG, 25 KB. Not yet opened and inspected.",
  "apostle-philip.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-philip and AUTHOR_ICONS. 320x400 JPG, 40 KB. Not yet opened and inspected.",
  "apostle-simon-zealot.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-simon-zealot and AUTHOR_ICONS. 281x420 JPG, 24 KB. Not yet opened and inspected.",
  "apostle-thomas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-thomas and AUTHOR_ICONS. 300x420 JPG, 33 KB. Not yet opened and inspected.",
  "archangel-michael.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for archangel-michael. 301x420 JPG, 29 KB. Not yet opened and inspected.",
  "arsenios-prislop.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for arsenius-of-prislop. 280x420 JPG, 27 KB. Not yet opened and inspected.",
  "athanasius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for athanasius-the-great and AUTHOR_ICONS. 302x420 JPG, 39 KB. Not yet opened and inspected.",
  "augustine-of-hippo.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for augustine-of-hippo and AUTHOR_ICONS. 292x420 JPG, 34 KB. Not yet opened and inspected.",
  "basil-of-ostrog.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for basil-of-ostrog. 322x420 JPG, 36 KB. Not yet opened and inspected.",
  "basil-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for basil-the-great and AUTHOR_ICONS. 308x420 JPG, 55 KB. Not yet opened and inspected.",
  "celestine-of-rome.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for celestine-of-rome. 118x420 JPG, 15 KB. Not yet opened and inspected.",
  "cleopa-ilie.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cleopas-of-sihastria. 340x420 JPG, 22 KB. Not yet opened and inspected.",
  "constantine-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for constantine-the-great. 322x420 JPG, 30 KB. Not yet opened and inspected.",
  "cyril-and-methodius.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-and-methodius. 336x420 JPG, 33 KB. Not yet opened and inspected.",
  "cyril-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-of-alexandria and AUTHOR_ICONS. 316x420 JPG, 21 KB. Not yet opened and inspected.",
  "cyril-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-of-jerusalem. 339x420 JPG, 33 KB. Not yet opened and inspected.",
  "dumitru-staniloae.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for dumitru-staniloae. 336x420 JPG, 38 KB. Not yet opened and inspected.",
  "ephraim-the-syrian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for ephraim-the-syrian. 305x420 JPG, 26 KB. Not yet opened and inspected.",
  "epiphanius-of-salamis.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for epiphanius-of-salamis. 312x420 JPG, 27 KB. Not yet opened and inspected.",
  "eustathius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for eustathius-of-antioch. 353x420 JPG, 34 KB. Not yet opened and inspected.",
  "eutychius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for eutychius-of-constantinople. 314x420 JPG, 33 KB. Not yet opened and inspected.",
  "florian-of-lorch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for florian-of-lorch. 332x420 JPG, 32 KB. Not yet opened and inspected.",
  "gabriel-of-georgia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gabriel-of-georgia. 322x420 JPG, 22 KB. Not yet opened and inspected.",
  "gregory-of-nyssa.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-of-nyssa and AUTHOR_ICONS. 266x420 JPG, 27 KB. Not yet opened and inspected.",
  "gregory-palamas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-palamas. 311x420 JPG, 37 KB. Not yet opened and inspected.",
  "gregory-theologian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-theologian and AUTHOR_ICONS. 300x420 JPG, 30 KB. Not yet opened and inspected.",
  "hermione-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for hermione-of-ephesus. 322x420 JPG, 22 KB. Not yet opened and inspected.",
  "hosius-of-cordova.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for hosius-of-cordova. 275x420 JPG, 21 KB. Not yet opened and inspected.",
  "iakovos-of-evia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for iakovos-of-evia. 299x420 JPG, 22 KB. Not yet opened and inspected.",
  "ignatius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for ignatius-of-antioch and AUTHOR_ICONS. 299x420 JPG, 31 KB. Not yet opened and inspected.",
  "irenaeus-of-lyons.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for irenaeus-of-lyons and AUTHOR_ICONS. 212x420 JPG, 23 KB. Not yet opened and inspected.",
  "irene-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for irene-the-empress. 300x420 JPG, 32 KB. Not yet opened and inspected.",
  "isaac-the-syrian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for isaac-the-syrian. 293x420 JPG, 24 KB. Not yet opened and inspected.",
  "isidora-of-tabenna.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for isidora-of-tabenna. 274x420 JPG, 23 KB. Not yet opened and inspected.",
  "john-cassian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-cassian. 313x420 JPG, 28 KB. Not yet opened and inspected.",
  "john-chrysostom.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-chrysostom and AUTHOR_ICONS. 140x420 JPG, 15 KB. Not yet opened and inspected.",
  "john-of-damascus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-of-damascus and AUTHOR_ICONS. 364x420 JPG, 47 KB. Not yet opened and inspected.",
  "john-the-wonderworker.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-of-shanghai. 268x420 JPG, 23 KB. Not yet opened and inspected.",
  "justin-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justin-martyr. 275x420 JPG, 28 KB. Not yet opened and inspected.",
  "justin-popovic.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justin-popovic. 316x420 JPG, 14 KB. Not yet opened and inspected.",
  "justinian-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justinian-the-great. 195x259 JPG, 24 KB. Not yet opened and inspected.",
  "juvenal-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for juvenal-of-jerusalem. 281x400 JPG, 27 KB. Not yet opened and inspected.",
  "kosmos-aitolia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cosmas-of-aetolia. 297x420 JPG, 24 KB. Not yet opened and inspected.",
  "lazar-of-serbia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for lazar-of-serbia. 292x420 JPG, 32 KB. Not yet opened and inspected.",
  "leo-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for leo-the-great. 328x420 JPG, 34 KB. Not yet opened and inspected.",
  "marcian-the-emperor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marcian-the-emperor. 235x420 JPG, 21 KB. Not yet opened and inspected.",
  "marina-the-great-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marina-the-great-martyr. 305x420 JPG, 31 KB. Not yet opened and inspected.",
  "mark-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mark-of-ephesus. 337x420 JPG, 30 KB. Not yet opened and inspected.",
  "martin-the-confessor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for martin-the-confessor. 329x400 JPG, 29 KB. Not yet opened and inspected.",
  "mary-magdalene.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mary-magdalene and AUTHOR_ICONS. 310x420 JPG, 34 KB. Not yet opened and inspected.",
  "mary-of-egypt.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mary-of-egypt and AUTHOR_ICONS. 350x410 JPG, 27 KB. Not yet opened and inspected.",
  "maximus-the-confessor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for maximus-the-confessor and AUTHOR_ICONS. 286x420 JPG, 23 KB. Not yet opened and inspected.",
  "meletius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for meletius-of-antioch. 297x420 JPG, 30 KB. Not yet opened and inspected.",
  "memnon-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for memnon-of-ephesus. 420x286 JPG, 25 KB. Not yet opened and inspected.",
  "moses-the-black.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for moses-the-ethiopian. 306x420 JPG, 31 KB. Not yet opened and inspected.",
  "nectarius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nectarius-of-constantinople. 250x364 JPG, 33 KB. Not yet opened and inspected.",
  "nektarios-of-aegina.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nektarios-of-aegina. 336x420 JPG, 30 KB. Not yet opened and inspected.",
  "nicholas-of-cabasilas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nicholas-cabasilas. 315x420 JPG, 36 KB. Not yet opened and inspected.",
  "nicholas-the-wonderworker.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nicholas-the-wonderworker and AUTHOR_ICONS. 302x420 JPG, 29 KB. Not yet opened and inspected.",
  "niketas-the-goth.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for niketas-the-goth. 315x420 JPG, 36 KB. Not yet opened and inspected.",
  "nikodemos-the-hagiorite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nikodemos-the-hagiorite. 336x420 JPG, 33 KB. Not yet opened and inspected.",
  "nikon-metanoeite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nikon-metanoeite. 315x420 JPG, 27 KB. Not yet opened and inspected.",
  "nino-nina-of-georiga.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nino-of-georgia. 322x420 JPG, 24 KB. Not yet opened and inspected.",
  "olympias-the-deaconess.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for olympias-the-deaconess. 315x420 JPG, 17 KB. Not yet opened and inspected.",
  "paisios-the-athonite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for paisios-the-athonite and AUTHOR_ICONS. 301x420 JPG, 23 KB. Not yet opened and inspected.",
  "paisius-velichkovsky.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for paisius-velichkovsky. 295x420 JPG, 21 KB. Not yet opened and inspected.",
  "papias-of-hierapolis.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for papias-of-hierapolis and AUTHOR_ICONS. 279x420 JPG, 22 KB. Not yet opened and inspected.",
  "philoumenos-of-jacobs-well.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for philoumenos-of-jacobs-well. 420x360 JPG, 31 KB. Not yet opened and inspected.",
  "photius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for photius-the-great. 311x420 JPG, 32 KB. Not yet opened and inspected.",
  "polycarp-of-smyrna.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for polycarp-of-smyrna and AUTHOR_ICONS. 276x420 JPG, 20 KB. Not yet opened and inspected.",
  "praying.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by the prayer slideshow. 420x230 JPG, 27 KB. Not yet opened and inspected.",
  "praying2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by the prayer slideshow. 420x335 JPG, 26 KB. Not yet opened and inspected.",
  "prochorus-the-deacon.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for prochorus-the-deacon and AUTHOR_ICONS. 280x420 JPG, 27 KB. Not yet opened and inspected.",
  "pulcheria-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for pulcheria-the-empress. 336x420 JPG, 28 KB. Not yet opened and inspected.",
  "quadratus-the-apologist.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for quadratus-the-apologist. 351x420 JPG, 24 KB. Not yet opened and inspected.",
  "sava-of-serbia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sava-of-serbia. 322x420 JPG, 31 KB. Not yet opened and inspected.",
  "seraphim-of-sarov.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for seraphim-of-sarov and AUTHOR_ICONS. 356x420 JPG, 16 KB. Not yet opened and inspected.",
  "sergius-of-radonezh.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sergius-of-radonezh. 345x420 JPG, 24 KB. Not yet opened and inspected.",
  "silouan-the-athonite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for silouan-the-athonite. 336x420 JPG, 25 KB. Not yet opened and inspected.",
  "simeon-streaming-myrrh.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for simeon-the-myrrh-streaming. 315x420 JPG, 26 KB. Not yet opened and inspected.",
  "sofian-antim.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sofian-of-antim. 336x420 JPG, 39 KB. Not yet opened and inspected.",
  "sophronius-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sophronius-of-jerusalem. 288x420 JPG, 33 KB. Not yet opened and inspected.",
  "sophrony-of-essex.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sophrony-of-essex. 300x420 JPG, 24 KB. Not yet opened and inspected.",
  "spyridon-of-trimythous.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for spyridon-of-trimythous. 288x420 JPG, 24 KB. Not yet opened and inspected.",
  "st-porphyrios-of-kavsokalyvia-324.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for porphyrios-of-kavsokalyvia. 291x420 JPG, 24 KB. Not yet opened and inspected.",
  "symeon-the-new-theologian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for symeon-the-new-theologian and AUTHOR_ICONS. 256x420 JPG, 28 KB. Not yet opened and inspected.",
  "tarasius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for tarasius-of-constantinople. 315x420 JPG, 38 KB. Not yet opened and inspected.",
  "theodosius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theodosius-the-great. 336x420 JPG, 25 KB. Not yet opened and inspected.",
  "theophan-the-recluse.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theophan-the-recluse. 301x420 JPG, 24 KB. Not yet opened and inspected.",
  "theophylact-of-ohrid.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theophylact-of-ohrid and AUTHOR_ICONS. 336x420 JPG, 26 KB. Not yet opened and inspected.",
  "theotokos.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theotokos. 281x420 JPG, 39 KB. Not yet opened and inspected.",
  "xenia-of-petersburg.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for xenia-of-petersburg. 303x420 JPG, 20 KB. Not yet opened and inspected.",};

/** Strip the URL prefix so callers can pass either form. */
function toKey(src: string): string {
  return src.startsWith(ICONS_URL_PREFIX)
    ? src.slice(ICONS_URL_PREFIX.length)
    : src;
}

/** Settled rights for an icon, or null when it is still in the debt. */
export function iconRightsFor(src: string): IconRights | null {
  return ICON_RIGHTS[toKey(src)] ?? null;
}

/** True when the file ships with no recorded rights. */
export function isUnverified(src: string): boolean {
  return toKey(src) in UNVERIFIED_ICONS;
}

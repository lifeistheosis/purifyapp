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
  // The stylites, supplied by the owner on 2026-08-15 and each one opened and
  // looked at before its row was written. See docs/editorial/stylites.md.
  "symeon-the-stylite.jpg": {
    status: "permission",
    inspectedOn: "2026-08-15",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-15",
    license: "Used with permission",
    alt: "An elderly monk with a white beard in a black hood, hands raised palm outward in prayer, standing inside a red pillar enclosure with arched panels, on a plain gold ground.",
    work: "Icon of St Symeon the Stylite",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "symeon-of-the-wonderful-mountain.v2.jpg": {
    status: "permission",
    inspectedOn: "2026-08-15",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-15",
    license: "Used with permission",
    alt: "A grey-bearded monk in an ochre robe with a dark mantle, right hand raised in blessing, standing in a grey octagonal pillar enclosure on a gold ground, with red lettering naming him Saint Symeon of the Wondrous Mountain.",
    work: "Icon of St Symeon Stylites the Younger, of the Wonderful Mountain",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "daniel-the-stylite.jpg": {
    status: "permission",
    inspectedOn: "2026-08-15",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-15",
    license: "Used with permission",
    alt: "A monk with a long white beard in a dark hood marked with red crosses and a deep red mantle, holding a gold blessing cross and raising his left hand, standing in a pale octagonal pillar enclosure on a gold ground, with a Church Slavonic inscription naming him Daniel the Stylite.",
    work: "Icon of St Daniel the Stylite",
    artist: "Unrecorded",
    workDate: "Unrecorded",
    source: "Supplied by the owner",
  },
  "alypius-the-stylite.jpg": {
    status: "permission",
    inspectedOn: "2026-08-15",
    grantedBy: "Supplied by the owner, who confirmed full permission to use",
    confirmedOn: "2026-08-15",
    license: "Used with permission",
    alt: "A long-haired, white-bearded ascetic in a brown robe with both hands raised in prayer, standing behind a railing on top of a carved stone capital, with fir trees at its foot and the blessing hand of Christ reaching from a blue arc of heaven above.",
    work: "Icon of St Alypius the Stylite",
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
  // Added 2026-09-28. The owner sent a picture for this saint that is in fact
  // St Arsenius of Tver: a bishop in an omophorion, inscribed "Arsenii,
  // bishop of Tver". This is the desert father himself, from a mosaic that
  // names him, found on Commons under an explicit CC0 licence and opened
  // before it went in.
  "arsenius-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-09-28",
    alt: "A gold-ground mosaic bust of an old monk with close grey curls and a long white beard falling in waves to his chest, a gold halo behind him, a small scroll held at his breast in a brown mantle, the last letters of his Greek name set in the gold beside the halo.",
    work: "Mosaic of St Arsenius the Great, parekklesion of the Pammakaristos church (Fethiye Camii), Constantinople",
    artist: "Unknown Byzantine mosaicists; photograph by the Byzantine Institute",
    workDate: "c. 1310",
    source: "Wikimedia Commons, Dumbarton Oaks (Byzantine Institute and Dumbarton Oaks Fieldwork Records)",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Fethiye_Camii,_parekklesion,_southwest_bay,_mosaics,_Istanbul,_Turkey_-_North_arch,_east_soffit,_St._Arsenius,_detail_of_bust_-_MSBZ004_BF_T_F_040_A_-_Dumbarton_Oaks.jpg",
  },
  // Added 2026-10-30 for the desert fathers of the History event "The Desert".
  // Each was read on its Commons page, opened and looked at before it was
  // cut, and again after: the right saint, the whole head and halo.
  "pachomius-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-10-30",
    alt: "A dark-bearded monk turned to the right with his face lifted and one hand raised, in a brown mantle and a dark green schema marked with a gold cross, within a red-ringed halo on a worn gold ground.",
    work: "Russian icon of St Pachomius the Great, St Alexander Nevsky, St Dmitry the Tsarevich and St Mary Magdalene, in a metal basma oklad, Moscow: St Pachomius alone, his head and shoulders (recut 2026-10-30 so the face, not the inscription above it, heads a square crop)",
    artist: "Anonymous Russian icon painter",
    workDate: "18th century",
    source: "Wikimedia Commons (a private collection)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Pakhomy,_Alexander_Nevsky,_Dmitry_and_Mary_Magdalene_(18th_c,_priv.coll).jpg",
  },
  // No old Orthodox icon of him passed: the Menologion of Basil II miniature
  // on Commons (his repose, Antony looking on) carries the Vatican Library's
  // watermark, and the icon in the Russian Lives of the Saints (1903 to 1911)
  // is a coarse black-and-white print. So an old Western engraving stands in
  // its place, as old Western paintings do for the Fathers of the Latin West
  // (docs/licensing/COVER_ICONS.md). Named on the plate: S. Ammon Nitriota.
  "ammon-of-nitria.jpg": {
    status: "verified",
    inspectedOn: "2026-10-30",
    alt: "A black-and-white engraving of an old hermit with long unkempt hair and a flowing beard, his head ringed with rays of light, his hands clasped in prayer before him and a heavy mantle drawn over his shoulders.",
    work: "S. Ammon Nitriota, plate 21 of Sylva anachoretica Aegypti et Palaestinae: his head and clasped hands",
    artist: "Boetius à Bolswert, after Abraham Bloemaert",
    workDate: "1619",
    source: "Wikimedia Commons, from the copy in the Radboud University Library, Nijmegen",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Bloemaert_-_1619_-_Sylva_anachoretica_Aegypti_et_Palaestinae_-_UB_Radboud_Uni_Nijmegen_-_512890366_21_S_Ammon_Nitriota.jpeg",
  },
  // The wall painting his books already wear in the reading room
  // (lib/reading/authorCovers.ts, hilarion.v1.jpg), cut to the icons' size.
  "hilarion-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-10-30",
    alt: "A wall painting of an old monk with a bald crown, deep-set eyes and a long white beard, in a brown mantle, holding a slender cross, within a large ochre halo on a mottled blue-green ground, his Greek name in white letters on either side.",
    work: "Wall painting of St Hilarion, the church of the Panagia tou Arakos, Lagoudera, Cyprus, before its cleaning: the upper half",
    artist: "Unknown (the photograph is David Winfield's for Dumbarton Oaks)",
    workDate: "Not given on its page (the church's paintings are generally dated 1192)",
    source: "Wikimedia Commons, Dumbarton Oaks (Byzantine Institute and Dumbarton Oaks Fieldwork Records)",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_Panagia_tou_Arakos,_nave,_southwest_bay,_wall_paintings,_Lagoudera,_Cyprus_-_West_soffit,_St._Hilarion,_detail_of_upper_half,_before_cleaning_-_MSBZ004_BF_S_1979_2198D_-_Dumbarton_Oaks.jpg",
  },
  "macarius-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-10-30",
    alt: "A wall painting in pale ochre and white of a figure dissolved in white light under a great ochre halo, only the small dark face and the two dark open hands, raised in prayer, drawn clearly.",
    work: "Fresco of St Macarius the Great, the Church of the Transfiguration on Ilyina Street, Veliky Novgorod, the whole image",
    artist: "Theophanes the Greek",
    workDate: "1378",
    source: "Wikimedia Commons, scanned from V. N. Alexandrov, History of Russian Art (2004)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Spas_na_Ilyine_-_Saint_Macarius_the_Great.jpg",
  },
  // Added 2026-10-31 for the Desert Fathers' sayings on Today: the owner's
  // picks of round 3 sheet r3-22 (Homebase/boards/purify-master/variants/
  // r3-22-desert-icons.png, card 2 for Abba Moses, card 6 for Abba Isaac and
  // every saying with no named Father). Each was read on its Commons page,
  // opened and looked at before it was cut, and again after. The fresco also
  // takes the place of moses-the-black.jpg on St Moses's own page: a modern
  // icon whose painter and source were never found, cleared from the debt
  // below in the same commit.
  "moses-the-black.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-10-31",
    alt: "A wall painting of a monk with grey hair and a full grey beard facing us inside a gold halo, his right hand raised palm outward and a furled scroll in his left, a green mantle over a rose-pink robe, on a deep blue ground with his Greek name in white letters on either side of the halo.",
    work: "Fresco of St Moses the Ethiopian, Dionysiou Monastery, Mount Athos, inscribed with his name, Moses the Ethiopian: the upper part, from the halo to the scroll in his hand (cut 2026-10-31, above a white loss on his robe)",
    artist: "Tzortzis (Zorzis Foukas), as the Commons page names the painter",
    workDate: "1547",
    source: "Wikimedia Commons (from pravicon.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Venerable_Moses._Tzortzi_(Zorzis)_Foukas._Fresco._Athos_(Dionysiou).jpg",
  },
  "fathers-of-sinai.jpg": {
    status: "verified",
    inspectedOn: "2026-10-31",
    alt: "An icon with a worn red border of forty monks in dark and russet habits standing in four rows on an ochre ground, above a green strip, under Christ enthroned in a circle at the top between six standing saints, the paint lost in places along the edges.",
    work: "Icon of the Holy Fathers of Sinai, St Catherine's Monastery, Sinai: the panel, cut inside the white of the scan round its worn edges",
    artist: "Anonymous icon painter",
    workDate: "Early 13th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saints_of_Sinai.jpg",
  },
  // Added 2026-10-31 for the words of the day's saint on Today: the owner's
  // picks of round 3 sheet r3-23 (Homebase/boards/purify-master/variants/
  // r3-23-saint-faces.png; card 1 for St John Chrysostom, 6 for St Cyril of
  // Jerusalem, 7 for St Photius, 10 for St Justinian). Each was read on its
  // Commons page, opened and looked at before it was cut and again after. Each
  // takes the place of a file that was in the debt below, on the saint's own
  // page too; St John's streamed cover is unchanged, and this is the picture
  // the app carries for when it cannot be had.
  "john-chrysostom.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-10-31",
    alt: "A gold mosaic of a bishop facing us inside a large halo, his hair receding to a curl at the crown and short dark curls at the sides, wide eyes under arched brows, a short brown beard, a white omophorion with large black crosses over a dark robe, the letters of his name in the gold on either side.",
    work: "Mosaic of St John Chrysostom, the south-east conch of the nave, katholikon of Hosios Loukas, Boeotia, inscribed with his name: his head and shoulders, cut inside the white page of the book it was scanned from (cut 2026-10-31)",
    artist: "Unknown Byzantine mosaicists; scanned from M. Chatzidakis, Byzantine Art in Greece",
    workDate: "Early 11th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Hosios_Loukas_(nave,_south_east_conch)_-_John_Chrysostom_-_detail.jpg",
  },
  "cyril-of-jerusalem.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-10-31",
    alt: "A wall painting of a grey-haired bishop with a long grey beard, his head bowed a little inside a gold halo, a white omophorion with dark red crosses over a white and dark checkered vestment, an open scroll in his hands, on a dark ground with his Slavonic name in white letters beside the halo.",
    work: "Fresco of St Cyril of Jerusalem, Gracanica monastery, Kosovo, inscribed St Cyril of Jerusalem in Slavonic: the upper part, four wide by five tall as sheet r3-23 cut it",
    artist: "Unknown painters of the Gracanica frescoes",
    workDate: "c. 1321 (Commons: 14th to 16th century)",
    source: "Wikimedia Commons (from johnsanidopoulos.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Serbian_Fresco_Icon_of_Saint_Cyril_of_Jerusalem.jpg",
  },
  "photius-the-great.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-10-31",
    alt: "A manuscript miniature of a white-bearded old man with a pale halo, turned to the right with both hands raised in prayer, in a dark green mantle over a white robe, beside a red and gold column, part of a youth in pale blue at the left edge, on the bare parchment of the page, a red Greek label above him.",
    work: "Patriarch Photius at prayer, a miniature of the Madrid Skylitzes (Synopsis of Histories), fol. 107, Biblioteca Nacional de Espana, labelled the Patriarch Photius: the upper part, four wide by five tall as sheet r3-23 cut it",
    artist: "Illuminators of the Madrid Skylitzes",
    workDate: "12th century (Commons: 11th century)",
    source: "Wikimedia Commons (from the Biblioteca Digital Hispanica)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Patriarch_Photius,_Madrid_Skylitzes.jpg",
  },
  "justinian-the-great.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-10-31",
    alt: "A mosaic of a young emperor facing us inside a gold halo, wearing a jewelled crown with hanging pearls and a purple cloak fastened by a great jewelled brooch, a golden bowl in his hands, a courtier in white on either side of him, on a gold ground.",
    work: "Mosaic of the Emperor Justinian I and his court, apse of San Vitale, Ravenna: his head and shoulders with the courtiers beside him, four wide by five tall as sheet r3-23 cut it; scanned from E. Ferte, L'art de Byzance (Mazenod, 1981)",
    artist: "Unknown mosaicists of San Vitale",
    workDate: "Before 547",
    source: "Wikimedia Commons (scan uploaded by Michel Bakni)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Mosaic_of_Justinian_I_-_Basilica_San_Vitale(6th_Century).jpg",
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
  // Given back their sources (1.9, U12): icons that shipped with none
  // recorded, each found on Commons as the same picture by
  // scripts/fetch-saint-icons.mjs --source (difference hash, same shape),
  // its licence read there, and our file opened and looked at before the row
  // was written by the promote step. The files are kept as they were.
  "agatho-of-rome.jpg": {
    status: "verified",
    inspectedOn: "2026-11-09",
    alt: "A gold-ground manuscript miniature of a grey-haired, grey-bearded bishop within a red-ringed halo, a white omophorion marked with black crosses over his brown phelonion, holding a gold Gospel book set with coloured stones against his chest.",
    work: "Miniature of St Agatho, Pope of Rome, in the Menologion of Basil II (Vatican Library): the saint alone, as cut on Commons",
    artist: "The illuminators of the Menologion of Basil II, Constantinople (its page names Pantoleon, Georgios, Michael the Younger, Michael of Blachernae, Symeon, Symeon of Blachernae, Menas and Nestor)",
    workDate: "c. 985",
    source: "Wikimedia Commons (from pravoslavie.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Pope_Agatho_(Menologion_of_Basil_II)_-_cropped.jpg",
  },
  "anthony-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-11-09",
    alt: "A full-length wall painting of an old monk with a long grey beard under a dark hood, in a dark red mantle over an olive tunic, his right hand raised and his left holding an unrolled scroll of Greek writing, his name in Greek beside a gold halo on a dark ground.",
    work: "Athonite icon of St Anthony the Great, the whole figure with his scroll",
    artist: "Unknown Athonite painter",
    workDate: "14th to 15th century",
    source: "Wikimedia Commons (from johnsanidopoulos.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Anthony_the_Great_Athonite_Icon_2.jpg",
  },
  // November's saints (1.9, docs/1.9-build/notes/november-saints.md): staged
  // with scripts/fetch-saint-icons.mjs, each opened and looked at, the saint
  // named on the picture or by its Commons page, and cut to 315 by 420.
  "cosmas-and-damian-of-asia.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A gold-ground manuscript miniature of two young haloed men with short brown hair and short beards facing each other, their faces lifted, each in a dark olive mantle drawn over both hands; between them a hand reaches down from a blue arc of heaven holding a small red bag, above grey arches.",
    work: "Sts Cosmas and Damian, the miniature for November 1 in the Menologion of Basil II (Vat. gr. 1613, p. 152), whose heading names them the sons of St Theodota: the two brothers and the hand from heaven",
    artist: "The illuminators of the Menologion of Basil II, Constantinople",
    workDate: "c. 985",
    source: "Wikimedia Commons (the photograph from days.pravoslavie.ru, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_001_big.jpg",
  },
  "joannicius-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A worn wall painting of an old monk with long grey hair and a long pointed grey beard, his brow lined, in a brown mantle, within a large ochre halo on a dark blue ground, his right hand raised beside the end of a white scroll; white letters of his name run down both sides.",
    work: "Wall painting of St Joannicius the Great in the narthex of Mileševa Monastery, Serbia, named on the wall: his head and shoulders",
    artist: "Unknown Serbian painter",
    workDate: "13th century",
    source: "Wikimedia Commons (from the BLAGO Fund archive)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Ioannikios_the_Great_Serbian.jpg",
  },
  "paul-the-confessor.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A wall painting of a bishop with a bald crown and a long dark brown beard, his face deeply lined, within an ochre halo on a blue-grey ground, in a white omophorion with large dark red crosses over a chequered vestment, holding a gold Gospel book set with pearls; Greek letters at either side give his name.",
    work: "Wall painting of St Paul the Confessor in the Church of the Theotokos Peribleptos, Ohrid, inscribed with his name and 'the Confessor'",
    artist: "Michael and Eutychios",
    workDate: "1294 to 1295",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Pavlos_Omologetes_Peribleptos.jpg",
  },
  "varlaam-of-khutyn.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a monk with close-cut dark brown hair and a long dark beard, bending forward with his eyes turned to the left, in a dark purple-brown mantle with a blue-grey cowl at his neck, a faint halo behind his head on a cracked ochre ground; a hand in a yellow sleeve reaches in from the left edge.",
    work: "Russian icon of Blessed Procopius of Ustyug and St Varlaam of Khutyn, Arkhangelsk Regional Museum of Fine Arts: St Varlaam, named on the icon",
    artist: "Unknown Russian icon painter",
    workDate: "Mid 16th century",
    source: "Wikimedia Commons (a photograph by Wmpearl, 2015, given into the public domain)",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Blessed_Prokopi_of_Ustiug_and_Holy_Monk_Varlaam_of_Khutyn,_Arkhangelsk.JPG",
  },
  "menas-of-egypt.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a soldier with dark curly hair and a short dark beard, a small dark mark on his brow, within a thin gold halo ring on a gold ground, in a red cloak over a gilded cuirass worked with a lion's head and a bearded face; his Greek name in red letters at either side.",
    work: "Icon of St Menas with scenes of his miracles and martyrdom, signed by Emmanuel Lambardos: the saint's head and shoulders",
    artist: "Emmanuel Lambardos",
    workDate: "First decades of the 17th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:S.Menas_by_E.Lambardos_(17th_c.).jpg",
  },
  "theodore-the-studite.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic roundel of an old monk with a bald crown, a fringe of white hair and a long white beard, in a dark blue habit under a brown mantle, one hand raised at his chest, on a gold ground with his Greek name in black letters at either side; at the lower right the mosaic is lost to bare plaster.",
    work: "Mosaic of St Theodore the Studite, Nea Moni, Chios, inscribed with his name",
    artist: "Unknown mosaicist",
    workDate: "11th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Studite.jpg",
  },
  "maximus-of-moscow.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of an old man with curly grey hair and a grey beard, bare to the waist, his hands crossed on his chest and his eyes lifted, within a plain gold halo against a dark blue-green sky.",
    work: "Icon of Blessed Maximus of Moscow, State Tretyakov Gallery: the saint alone, without the Kremlin and the procession below him",
    artist: "Unknown Moscow painter",
    workDate: "18th century",
    source: "Wikimedia Commons (a photograph by Shakko, 2010)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Maxim_(18_c.,_GTG).jpg",
  },
  "john-the-merciful.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A wall painting of a bishop with grey hair and a long grey beard, his head inclined, within an ochre halo on a deep blue ground, in a dark purple phelonion and a white omophorion with black crosses, holding an unrolled scroll of Greek writing; white Greek letters at either side give his name and the Merciful.",
    work: "Wall painting of St John the Merciful in the apse of the Panagia tou Arakos, Lagoudera, Cyprus, inscribed with his name: the saint alone, without St Athanasius beside him",
    artist: "Unknown painter",
    workDate: "1192",
    source: "Wikimedia Commons (the Dumbarton Oaks photographs of the church, 1968 to 1973)",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_Panagia_tou_Arakos,_sanctuary,_apse,_wall_paintings,_Lagoudera,_Cyprus_-_Apse_wall,_south_side,_lower_zone,_Sts._Athanasius_and_John_of_Almoner_-_MSBZ004_BF_T_Lag_B_3_4_-_Dumbarton_Oaks.jpg",
  },
  "nilus-of-sinai.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A wall painting of an old monk with long grey hair and a very long grey beard falling below his chest, within an ochre halo on a dark blue-grey ground, in an olive green mantle, holding open a long white scroll written in black Greek capitals; his name in white letters at either side of the halo.",
    work: "Wall painting of St Nilus, Dionysiou Monastery, Mount Athos, inscribed with his name",
    artist: "Tzortzis Phouka",
    workDate: "1547",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Neilos_Dionysiou.jpg",
  },
  // Build 90 note 3 (2026-11-10): the councils' Fathers, by the same tool.
  // A source found and settled is not by that his face: St Nectarius's is a
  // scene of his council, so the council shows him on the plate.
  "nectarius-of-constantinople.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A ninth-century manuscript miniature of the Council of Constantinople of 381: the Gospel book open on an empty golden throne at the centre, bishops seated in rows on either side, a haloed emperor among them on the right, under a blue and pink architectural frame, the paint flaked away along the foot. A scene of the council, not a portrait of St Nectarius.",
    work: "Miniature of the Council of Constantinople of 381 in the Homilies of St Gregory of Nazianzus (BnF MS grec 510), folio 355",
    artist: "Unknown illuminator of the Paris Gregory, Constantinople",
    workDate: "between 879 and 882",
    source: "Wikimedia Commons (from the Bibliothèque nationale de France)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Council_of_Constantinople_381_BnF_MS_Gr510_fol355.jpg",
  },
  // November's saints, push 2 (1.9): the second half of the month, each
  // staged, opened and looked at; fifteen passed. Sts Gurias, Samonas and
  // Habib and Sts Plato and Romanus keep the plate: three standing figures
  // cannot be cut to a portrait without losing one, and the one picture of
  // Romanus is a Western painting of him alone.
  "gregory-the-wonderworker.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic of a bishop seen to the waist on a gold ground, with short grey hair, a high forehead and a short rounded grey beard under a dark-ringed halo, in a white phelonion covered with large black crosses, holding a jewelled Gospel book; dark Greek letters either side of his head name him Gregory the Wonderworker.",
    work: "Mosaic of St Gregory the Wonderworker in the parekklesion of the Pammakaristos (Fethiye Camii), Istanbul, named in the mosaic",
    artist: "Unknown mosaicist",
    workDate: "c. 1310",
    source: "Wikimedia Commons (the Byzantine Institute's photograph, 1949 to 1963, given by Dumbarton Oaks)",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Fethiye_Camii,_parekklesion,_southeast_bay,_mosaics,_Istanbul,_Turkey_-_North_arch,_east_soffit,_St._Gregory_Thaumaturgus,_detail_of_upper_half_-_MSBZ004_BF_T_F_031_B_-_Dumbarton_Oaks.jpg",
  },
  "nikon-of-radonezh.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a monk seen to the waist on a pale green ground, with dark grey hair and a full grey beard under a gold halo, in a black mantle over an orange tunic and a dark analavos, his right hand raised and his left holding an open scroll of Slavonic writing; red letters either side of his head name him the Venerable Nikon.",
    work: "Icon of St Nikon of Radonezh, named on the icon",
    artist: "Simon Ushakov, as Commons gives it",
    workDate: "17th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Nikon_of_Radonej.jpg",
  },
  "prophet-obadiah.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of an old man with curly grey hair and a short grey beard, half-length in a red mantle over a blue-green tunic, his right hand raised and his left holding a long unrolled scroll of Slavonic writing, under a red-ringed halo on a pale worn gold ground, with his name in red letters at the top.",
    work: "Prophet-row icon of the Prophet Obadiah from the iconostasis of the Church of the Transfiguration, Kizhi, named on the icon",
    artist: "Unknown icon painter",
    workDate: "first quarter of the 18th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Obadiah_(%D0%9E%D0%B2%D0%B4%D0%B8%D0%B9).jpg",
  },
  "barlaam-and-josaphat.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon detail of two haloed figures facing each other before red and ochre buildings: on the left a young prince with dark curly hair and a tall gold crown, in a red cloak, a finger raised to his lips; on the right an old monk with a long beard in a dark hooded mantle, holding up a small cross toward him.",
    work: "The conversation of St Barlaam and Prince Ioasaph, icon of the Russian North, Andrei Rublev Museum: the two saints, heads to waists",
    artist: "Unknown icon painter",
    workDate: "17th century",
    source: "Wikimedia Commons (the uploader's photograph in the museum)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Barlaam_and_Josaphat_(icon).jpg",
  },
  "gregory-of-decapolis.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A manuscript miniature of an elderly monk with grey hair and a full grey beard under a gold halo, in a brown mantle over a dark tunic, his right hand at his chest and a small white scroll in his left, before a band of red ornament and a pale stone wall under a dark blue-green sky.",
    work: "St Gregory of Decapolis, his miniature in the Menologion of Basil II (Vat. gr. 1613): the saint alone",
    artist: "The illuminators of the Menologion of Basil II, Constantinople",
    workDate: "c. 985",
    source: "Wikimedia Commons (from a printed reproduction, via days.pravoslavie.ru, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Gregory_Decapolites_the_Righteous_(Menologion_of_Basil_II).jpg",
  },
  "michael-of-tver.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon detail of a balding man with dark hair and a dark beard, his face turned up and to the left, his right hand raised before him and his left at his chest, in a long orange-red cloak with a dark fur collar over a dark green robe sewn with gold dots, under a thin halo on an ochre ground pitted with small losses.",
    work: "Russian icon of Prince Michael Yaroslavich of Tver praying to Christ, named at its head: the prince alone",
    artist: "Unknown icon painter",
    workDate: "17th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:S._Michael_of_Tver.jpg",
  },
  "alexander-nevsky.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A half-length icon of a young prince with long brown hair curling at the ears and a short brown beard, his head tilted, in a fur-collared red robe patterned with flowers over a red tunic, his right hand on his chest and a small relic case set into the panel at his waist, under a thin red-ringed halo on a pale gold ground; red Slavonic lettering either side names him Alexander Nevsky.",
    work: "Half-length Russian icon of St Alexander Nevsky, named on the icon, with a relic set into the panel",
    artist: "Unknown icon painter",
    workDate: "before the 19th century, as Commons dates it",
    source: "Wikimedia Commons (reproduced in Varlaam (Karabashev), Nit Ariadny, 2014, p. 257)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Alexander_Newski.jpg",
  },
  "clement-of-rome.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic bust of a man with short curled grey hair and a short grey beard, wide dark eyes looking straight out, within a red-ringed halo on a ground of gold tesserae; a white omophorion with large black crosses lies over his shoulders, and at the lower edge his hand holds a dark book marked with a cross.",
    work: "Mosaic of St Clement of Rome in the Cathedral of St Sophia, Kyiv",
    artist: "Unknown mosaicist",
    workDate: "11th century",
    source: "Wikimedia Commons (the Google Art Project's photograph)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Clemens_Romanus.jpg",
  },
  "peter-of-alexandria.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco detail of a grey-haired bishop with a short grey beard, turned to the right with his right hand raised, in a white omophorion with large red crosses over a chequered phelonion, within a gold halo on a dark green ground under a red patterned arch; white Greek letters at the left name him Peter of Alexandria.",
    work: "Fresco of the vision of St Peter of Alexandria, named in Greek beside him: the saint alone",
    artist: "Georgios Foukas",
    workDate: "1547",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Peter_of_Alexandria.jpg",
  },
  "catherine-of-alexandria.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A worn icon of a crowned young woman seen to the chest against a dark grey-brown ground, her pale oval face with large dark eyes framed by long strings of pearls hanging from a tall jewelled crown, in a red and gold patterned robe studded with pearls, holding a small dark cross before her.",
    work: "Icon of St Catherine from the church of St Demetrios, Veria, now in the Byzantine Museum of Veria: head and shoulders",
    artist: "Unknown icon painter",
    workDate: "mid-14th century",
    source: "Wikimedia Commons (as the Byzantine Museum of Veria names it)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%CE%97_%CE%91%CE%B3%CE%AF%CE%B1_%CE%91%CE%B9%CE%BA%CE%B1%CF%84%CE%B5%CF%81%CE%AF%CE%BD%CE%B7_%CE%9C%CE%AD%CF%83%CE%B1_14%CE%BF%CF%85._%CE%B1%CE%B9._%CE%99%CE%B5%CF%81%CF%8C%CF%82_%CE%BD%CE%B1%CF%8C%CF%82_%CE%91%CE%B3%CE%AF%CE%BF%CF%85_%CE%94%CE%B7%CE%BC%CE%B7%CF%84%CF%81%CE%AF%CE%BF%CF%85.jpg",
  },
  "mercurius-of-caesarea.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco of a young soldier with curly brown hair and a light beard, in a white crested helmet with a wide brim, a striped scarf knotted at his neck over a red-brown cloak and ornate armour, a sword blade crossing the lower right, within a large orange halo on a blue-grey ground; white letters at the upper right begin his name.",
    work: "Fresco of St Mercurius in the Protaton church, Karyes, Mount Athos: head and shoulders",
    artist: "Manuel Panselinos, as Commons gives it",
    workDate: "c. 1290 to 1310",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Mercure.jpg",
  },
  "innocent-of-irkutsk.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a grey-bearded bishop seen to the waist in a black monastic veil and a black mantle with red, white and black bands, holding a large wooden cross against his shoulder, a pectoral cross on a chain and a prayer rope in his other hand, under a gold halo on a dark red-brown ground, with an icon of the Mother of God between two angels at the upper left and a line of Slavonic writing along the foot.",
    work: "Icon of St Innocent, first bishop of Irkutsk, named in its inscription, from the St Nicholas chapel of the Saviour-Vlakherna monastery, Dedenevo",
    artist: "Unknown icon painter",
    workDate: "19th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Innocent_of_Irkutsk.jpg",
  },
  "james-the-persian.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon detail of a bearded man with dark curling hair, his eyes raised, within a thin red halo on a dark red-brown ground; a hand reaching down from above sets a jewelled crown on his head, and his bare shoulder is pale.",
    work: "Icon of St James Intercisus, Sinai: his head and shoulder as a hand from above crowns him",
    artist: "Unrecorded",
    workDate: "12th to 13th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_James_Intercisus_Sinai(12th-13th_Century).jpg",
  },
  "stephen-the-new.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic medallion on a gold ground of a monk with brown hair and a long brown beard in a dark brown mantle, within a dark blue ring, holding a small white cross in his right hand and turning his left palm outward; dark Greek letters either side of his head name him Stephen the New.",
    work: "Mosaic medallion of St Stephen the New in the nave of Hosios Loukas, named in the mosaic",
    artist: "Unknown mosaicist",
    workDate: "early 11th century",
    source: "Wikimedia Commons (from Chatzidakis, Byzantine Art in Greece)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Hosios_Loukas_(nave,_south_west_bay)_-_S.Stephen_the_Younger.jpg",
  },
  "acacius-of-sinai.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A wall painting of an old monk with a long tapering brown beard reaching his chest, a white cowl marked with black crosses framing his face, within a large orange-gold halo on a dark ground, his mantle in brown folds.",
    work: "Wall painting of St Acacius of Sinai in the church of St Symeon, Zverin monastery, Veliky Novgorod: head and upper body",
    artist: "Unknown painter",
    workDate: "1468",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%9F%D1%80%D0%B5%D0%BF%D0%BE%D0%B4%D0%BE%D0%B1%D0%BD%D1%8B%D0%B9_%D0%90%D0%BA%D0%B0%D0%BA%D0%B8%D0%B9_%D0%A1%D0%B8%D0%BD%D0%B0%D0%B9%D1%81%D0%BA%D0%B8%D0%B9._%D0%A4%D1%80%D0%B5%D1%81%D0%BA%D0%B0_%D1%86%D0%B5%D1%80%D0%BA%D0%B2%D0%B8_%D0%A1%D0%B2._%D0%A1%D0%B8%D0%BC%D0%B5%D0%BE%D0%BD%D0%B0_%D0%91%D0%BE%D0%B3%D0%BE%D0%BF%D1%80%D0%B8%D0%B8%D0%BC%D1%86%D0%B0_%D0%B2_%D0%97%D0%B2%D0%B5%D1%80%D0%B8%D0%BD%D0%BE%D0%BC_%D0%BC%D0%BE%D0%BD%D0%B0%D1%81%D1%82%D1%8B%D1%80%D0%B5_%D0%B2_%D0%9D%D0%BE%D0%B2%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%D0%B5._1468_%D0%B3%D0%BE%D0%B4.jpg",
  },
  // November's saints, the thirteen older icons (1.9, 2026-11-10; the
  // arbiter's word: each opened and checked, an icon that fails gives way to
  // the plate). The Theotokos's is the Vladimir icon, found on Commons (its
  // page's Russian title calls it the Iverskaya by mistake). St Andrew's and
  // the Archangel's are cut from their pages' large pictures, St Matthew's,
  // St Philip's and St Gregory Palamas's from their books' covers, so a
  // saint wears one picture everywhere; St Nikon's is the Hosios Loukas
  // mosaic, St Nektarios's a photograph taken before 1908. St Gabriel, St
  // Arsenie, St Iakovos and St Philoumenos keep the plate: no picture of them
  // is in the public domain, and their files are gone. So does St Paisius,
  // on the arbiter's word: the one old portrait of him on Commons
  // (File:Paisius.jpg) names no painter or date, so it waits until they are
  // found. Every file was opened.
  "theotokos.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "The Mother of God in a dark maphorion edged with gold, a star on her shoulder, her face inclined to the Child, who presses his cheek to hers and holds her neck, in ochre robes streaked with gold, against a worn gold ground.",
    work: "The Theotokos of Vladimir, the Tretyakov Gallery, Moscow",
    artist: "Unknown icon painter",
    workDate: "12th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Vladimirskaya.jpg",
  },
  "apostle-andrew.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An apostle with tousled grey-brown hair and a long beard, bowing to the left in a blue-green cloak, holding a rolled scroll, on a worn yellow-gold ground: a cut of the Kirillo-Belozersky board, below its red letters.",
    work: "Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: St Andrew the Apostle (his page's large picture, lib/saints/heroes.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_15_-_Andrew.jpg",
  },
  "archangel-michael.v3.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "The Archangel Michael with curly brown hair bound by a blue ribbon, his head bowed, dark wings behind him, in a red cloak over a jewelled tunic, holding a staff and a sphere marked with the name of Christ, on a gold ground.",
    work: "Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: the Archangel Michael (his page's large picture, lib/saints/heroes.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_09_-_Michael.jpg",
  },
  "apostle-matthew.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An apostle with dark hair and a long grey-brown beard, in a brown mantle, turning the pages of an open Gospel bound in red and gold, under red Greek letters naming him Matthew, on a pale ground streaked with old paint loss.",
    work: "The Apostle Matthew, icon (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown icon painter",
    workDate: "Not given on its page",
    source: "Wikimedia Commons",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:The_Apostle_Matthew.jpg",
  },
  "apostle-philip.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco of a young beardless apostle with short brown hair in a gold halo, in a white tunic under a plum-purple cloak, holding a rolled white scroll, on a deep blue ground with Greek letters naming him Philip.",
    work: "Fresco of the Apostle Philip, the church of the Theotokos Peribleptos, Ohrid (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Michael and Eutychios",
    workDate: "14th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Paintings_in_the_Church_of_the_Theotokos_Peribleptos_of_Ohrid_037.jpg",
  },
  "gregory-palamas.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A bishop with dark hair and a full dark beard under a halo, in a white omophorion with black crosses over a vestment of gold-ringed crosses, blessing and holding a red and gold Gospel, with red Greek letters naming him Gregory of Thessalonica.",
    work: "Icon of St Gregory Palamas, Archbishop of Thessalonica, the Pushkin Museum, Moscow (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown icon painter",
    workDate: "15th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%93%D1%80%D0%B8%D0%B3%D0%BE%D1%80%D0%B8%D0%B9_%D0%9F%D0%B0%D0%BB%D0%B0%D0%BC%D0%B0_14%D0%B2.jpg",
  },
  "nikon-metanoeite.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic of a monk with dark hair and a long dark beard under a halo, in a black mantle, both hands raised in prayer, on a gold ground, with Greek letters naming him St Nikon the Metanoeite.",
    work: "Mosaic of St Nikon the Metanoeite, lunette in the south-west bay of the nave, Hosios Loukas monastery, Boeotia, named in the mosaic",
    artist: "Unknown mosaicist",
    workDate: "Early 11th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Hosios_Loukas_(nave,_lunette_in_south-west_bay_of_nave)_-_Nikon_Metanoeite.jpg",
  },
  "nektarios-of-aegina.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white photograph of an old bishop with a long white beard, in a black veil over his kalimavkion and a dark cassock, a chain at his chest, looking a little to one side.",
    work: "Photograph of St Nektarios of Aegina, \"taken in Greece before 1908\" as its page says",
    artist: "Unknown photographer",
    workDate: "Before 1908",
    source: "Wikimedia Commons (from OrthodoxWiki)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Nektarios_of_Aegina_at_Rizario.jpg",
  },
};

/**
 * Permission rows with no named iconographer. Attribution to nobody is weaker
 * than the rows around it. Blocked on the owner. MAY ONLY SHRINK.
 */
export const MISSING_ATTRIBUTION: readonly string[] = ["john-the-baptist.jpg"];

/**
 * An icon whose source was found but which needs the owner's decision before
 * its row can be written: a living iconographer's work, a watermark, a picture
 * that may not be the saint. The admin's list of icons to clear shows these
 * first, as "Needs you" (lib/saints/iconDebt.ts). His answer comes back through
 * the arbiter, and the row is then written by a person who looked
 * (scripts/fetch-saint-icons.mjs, promote), never from here.
 *
 * Keyed on the bare filename, as the maps above are. A file stays in its
 * current map (usually UNVERIFIED_ICONS) while its question is open.
 */
export type IconQuestion = {
  /** The decision, in a sentence he can answer. */
  question: string;
  /** Where the candidate source is, when one was found. */
  candidateUrl?: string;
};

export const ICON_QUESTIONS: Record<string, IconQuestion> = {
  // Build 90 note 3 (2026-11-10), found opening the councils' Fathers' icons.
  "memnon-of-ephesus.v2.jpg": {
    question:
      "St Memnon of Ephesus's icon is a fresco of 1547 at Dionysiou on Mount Athos, public domain, but our copy came from iconsv.ru and carries its mark, \"IconSV.ru\", in the lower right corner. Commons has its own copy of the same fresco with no mark, a little smaller than ours (375 by 248). Take Commons' copy and settle it (recommended: his saint page and his council then show his face, and no one's mark is cut away), or keep him on the plate?",
    candidateUrl: "https://commons.wikimedia.org/wiki/File:Agios_Memnon_Ephesou_Dionysiou.jpg",
  },
  "adrian-of-rome.jpg": {
    question:
      "St Adrian I of Rome's page showed an icon of a young martyr in a red cloak holding a cross (by its look St Adrian of Nicomedia), not the pope; it is off his page since 2026-11-10, on the arbiter's word, and he stands on the plate. Give him the Nuremberg Chronicle's woodcut of Pope Adrian I (1493, public domain on Commons; a woodcut, not an icon), or keep him on the plate until an icon of him is found?",
    candidateUrl: "https://commons.wikimedia.org/wiki/File:Paus_Adrianus_I_Hadrianus_primus_(titel_op_object)_Liber_Chronicarum_(serietitel),_RP-P-2016-49-58-8.jpg",
  },
};

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
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by no registry since 2026-11-10 (it was SAINTS.iconUrl for adrian-of-rome). 321x420 JPG, 22 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon of a young man with a short beard in a red cloak holding a cross, his name in Greek: a martyr's icon by its look, not Pope Adrian I of Rome, whose page shows it: a question for the owner (ICON_QUESTIONS).",
  "alexander-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for alexander-of-alexandria. 336x420 JPG, 32 KB. Opened 2026-11-10 (build 90 note 3): a contemporary painted icon, a grey-bearded bishop in a purple phelonion and white omophorion with a red Gospel book, his name in Latin letters on a gold ground. Not found on Commons by search and picture hash (nearest 22 of 64 bits apart; the Commons pictures of him are other works).",
  "anatolius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anatolius-of-constantinople. 382x420 JPG, 42 KB. Opened 2026-11-10 (build 90 note 3): a wall painting on a worn grey ground, a brown-bearded bishop with a yellow halo, a white omophorion with large black crosses and a Gospel book, his name in Greek beside him. Not found on Commons by search and picture hash (nearest 25 of 64 bits apart).",
  "anianus-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anianus-of-alexandria and AUTHOR_ICONS. 400x400 JPG, 32 KB. Not yet opened and inspected.",
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
  "apostle-matthias.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-matthias and AUTHOR_ICONS. 304x420 JPG, 33 KB. Not yet opened and inspected.",
  "apostle-paul.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-paul and AUTHOR_ICONS. 268x420 JPG, 28 KB. Not yet opened and inspected.",
  "apostle-peter.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-peter and AUTHOR_ICONS. 281x420 JPG, 25 KB. Not yet opened and inspected.",
  "apostle-simon-zealot.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-simon-zealot and AUTHOR_ICONS. 281x420 JPG, 24 KB. Not yet opened and inspected.",
  "apostle-thomas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-thomas and AUTHOR_ICONS. 300x420 JPG, 33 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon with a workshop's red seal, a cross in a ring, in its lower right corner.",
  "athanasius-the-great.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for athanasius-the-great and AUTHOR_ICONS. 243x402 JPG, 32 KB, cut on 2026-10-17 from the 302x420 file, inside the worn edge of the panel, off the white ground it was photographed on (1.7.1). Its source is not yet looked into.",
  "augustine-of-hippo.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for augustine-of-hippo and AUTHOR_ICONS. 292x420 JPG, 34 KB. Not yet opened and inspected.",
  "basil-of-ostrog.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for basil-of-ostrog. 322x420 JPG, 36 KB. Not yet opened and inspected.",
  "basil-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for basil-the-great and AUTHOR_ICONS. 308x420 JPG, 55 KB. Not yet opened and inspected.",
  "celestine-of-rome.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for celestine-of-rome. 118x420 JPG, 15 KB. Opened 2026-11-10 (build 90 note 3): a narrow cut of a wall painting of a standing grey-bearded bishop in a chequered sakkos with a Gospel book and a scroll, his name in Greek above him. Not found on Commons by search and picture hash (none of the files found has its shape).",
  "cleopa-ilie.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cleopas-of-sihastria. 340x420 JPG, 22 KB. Not yet opened and inspected.",
  "constantine-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for constantine-the-great. 322x420 JPG, 30 KB. Not yet opened and inspected.",
  "cyril-and-methodius.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-and-methodius. 336x420 JPG, 33 KB. Not yet opened and inspected.",
  "cyril-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-of-alexandria and AUTHOR_ICONS. 316x420 JPG, 21 KB. Not yet opened and inspected.",
  "dumitru-staniloae.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for dumitru-staniloae. 336x420 JPG, 38 KB. Not yet opened and inspected.",
  "ephraim-the-syrian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for ephraim-the-syrian. 305x420 JPG, 26 KB. Not yet opened and inspected.",
  "epiphanius-of-salamis.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for epiphanius-of-salamis. 312x420 JPG, 27 KB. Not yet opened and inspected.",
  "eustathius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for eustathius-of-antioch. 353x420 JPG, 34 KB. Not yet opened and inspected.",
  "eutychius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for eutychius-of-constantinople. 314x420 JPG, 33 KB. Opened 2026-11-10 (build 90 note 3): a contemporary panel icon of a white-bearded bishop with a red Gospel book, his name in Greek on a gold ground, a painter's small inscription at its foot. Not found on Commons by search and picture hash (nearest 28 of 64 bits apart).",
  "florian-of-lorch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for florian-of-lorch. 332x420 JPG, 32 KB. Not yet opened and inspected.",
  "gregory-of-nyssa.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-of-nyssa and AUTHOR_ICONS. 258x420 JPG, 28 KB, cut on 2026-10-17 from the 266x420 file, inside the white at its top left (1.7.1). Its source is not yet looked into.",
  "gregory-theologian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-theologian and AUTHOR_ICONS. 300x420 JPG, 30 KB. Not yet opened and inspected.",
  "hermione-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for hermione-of-ephesus. 322x420 JPG, 22 KB. Not yet opened and inspected.",
  "hosius-of-cordova.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for hosius-of-cordova. 273x416 JPG, 21 KB, cut on 2026-10-17 from the 275x420 file, inside the white line along its foot (1.7.1). Its source is not yet looked into.",
  "ignatius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for ignatius-of-antioch and AUTHOR_ICONS. 299x420 JPG, 31 KB. Not yet opened and inspected.",
  "irenaeus-of-lyons.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for irenaeus-of-lyons and AUTHOR_ICONS. 212x420 JPG, 23 KB. Not yet opened and inspected.",
  "irene-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for irene-the-empress. 300x420 JPG, 32 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon of a crowned empress in a jewelled robe holding a scroll, her name in Latin letters on a gold ground. Not found on Commons by search and picture hash (nearest 21 of 64 bits apart, a coin of hers).",
  "isaac-the-syrian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for isaac-the-syrian. 293x420 JPG, 24 KB. Not yet opened and inspected.",
  "isidora-of-tabenna.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for isidora-of-tabenna. 274x420 JPG, 23 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon, signed and dated in the paint by its painter at the lower left.",
  "john-cassian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-cassian. 313x420 JPG, 28 KB. Not yet opened and inspected.",
  "john-of-damascus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-of-damascus and AUTHOR_ICONS. 364x420 JPG, 47 KB. Not yet opened and inspected.",
  "john-the-wonderworker.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-of-shanghai. 268x420 JPG, 23 KB. Not yet opened and inspected.",
  "justin-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justin-martyr. 275x420 JPG, 28 KB. Not yet opened and inspected.",
  "justin-popovic.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justin-popovic. 316x420 JPG, 14 KB. Not yet opened and inspected.",
  "juvenal-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for juvenal-of-jerusalem. 281x400 JPG, 27 KB. Opened 2026-11-10 (build 90 note 3): a contemporary panel icon, a dark-haired, grey-bearded bishop in a red and black chequered phelonion with a red Gospel book, his name in Greek on a gold ground. Not found on Commons by search and picture hash (three files found, none of its shape).",
  "kosmos-aitolia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cosmas-of-aetolia. 297x420 JPG, 24 KB. Not yet opened and inspected.",
  "lazar-of-serbia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for lazar-of-serbia. 292x420 JPG, 32 KB. Not yet opened and inspected.",
  "leo-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for leo-the-great. 328x420 JPG, 34 KB. Not yet opened and inspected.",
  "marcian-the-emperor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marcian-the-emperor. 235x420 JPG, 21 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon of a standing emperor in a crown and red cloak under a painted arch, holding a scroll written in English, his name in Latin letters. Not found on Commons by search and picture hash (nearest 29 of 64 bits apart).",
  "marina-the-great-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marina-the-great-martyr. 305x420 JPG, 31 KB. Not yet opened and inspected.",
  "mark-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mark-of-ephesus. 337x420 JPG, 30 KB. Not yet opened and inspected.",
  "martin-the-confessor.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for martin-the-confessor. 319x390 JPG, 28 KB, cut on 2026-10-17 from the 329x400 file, inside the white lines at its edges (1.7.1). Its source is not yet looked into. Opened 2026-11-10 (build 90 note 3): a contemporary icon in the Russian manner, a white-bearded pope in a white mitre holding the Image Not Made by Hands, his name in Church Slavonic. Not found on Commons by search and picture hash of the file it was cut from (nearest 24 of 64 bits apart).",
  "mary-magdalene.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mary-magdalene and AUTHOR_ICONS. 310x420 JPG, 34 KB. Not yet opened and inspected.",
  "mary-of-egypt.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mary-of-egypt and AUTHOR_ICONS. 350x410 JPG, 27 KB. Not yet opened and inspected.",
  "maximus-the-confessor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for maximus-the-confessor and AUTHOR_ICONS. 286x420 JPG, 23 KB. Not yet opened and inspected.",
  "meletius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for meletius-of-antioch. 297x420 JPG, 30 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon, and a faint signature laid over the picture low on the left.",
  "memnon-of-ephesus.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for memnon-of-ephesus. 415x280 JPG, 24 KB, cut on 2026-10-17 from the 420x286 file, inside the white lines at its edges; a website's watermark is still at its foot, right (1.7.1). Its source is not yet looked into. Opened 2026-11-10 (build 90 note 3): a bust of a dark-bearded bishop in a fresco, his name in Greek on a blue ground; the same picture as two Commons files of the fresco at Dionysiou (1 and 3 of 64 bits apart, through the file it was cut from), but it carries a website's mark, \"IconSV.ru\", in its lower right corner: a question for the owner (ICON_QUESTIONS).",
  "nicholas-of-cabasilas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nicholas-cabasilas. 315x420 JPG, 36 KB. Not yet opened and inspected.",
  "nicholas-the-wonderworker.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nicholas-the-wonderworker and AUTHOR_ICONS. 302x420 JPG, 29 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon, signed in the paint by its painter at the lower left.",
  "niketas-the-goth.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for niketas-the-goth. 315x420 JPG, 36 KB. Not yet opened and inspected.",
  "nikodemos-the-hagiorite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nikodemos-the-hagiorite. 336x420 JPG, 33 KB. Not yet opened and inspected.",
  "nino-nina-of-georiga.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nino-of-georgia. 322x420 JPG, 24 KB. Not yet opened and inspected.",
  "olympias-the-deaconess.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for olympias-the-deaconess. 315x420 JPG, 17 KB. Not yet opened and inspected.",
  "paisios-the-athonite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for paisios-the-athonite and AUTHOR_ICONS. 301x420 JPG, 23 KB. Not yet opened and inspected.",
  "papias-of-hierapolis.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for papias-of-hierapolis and AUTHOR_ICONS. 279x420 JPG, 22 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon, signed in the paint by its painter at the lower left, with the words \"Holy Mountain\" in Greek.",
  "polycarp-of-smyrna.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for polycarp-of-smyrna and AUTHOR_ICONS. 276x420 JPG, 20 KB. Not yet opened and inspected.",
  "praying.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by the prayer slideshow. 420x230 JPG, 27 KB. Not yet opened and inspected.",
  "praying2.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by the prayer slideshow. 416x333 JPG, 26 KB, cut on 2026-10-17 from the 420x335 file, inside the white line down its right side (1.7.1). Its source is not yet looked into.",
  "prochorus-the-deacon.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for prochorus-the-deacon and AUTHOR_ICONS. 280x420 JPG, 27 KB. Not yet opened and inspected.",
  "pulcheria-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for pulcheria-the-empress. 336x420 JPG, 28 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon of a crowned empress holding a cross, her name in Latin letters on a gold ground. Not found on Commons by search and picture hash (nearest 19 of 64 bits apart, another picture).",
  "quadratus-the-apologist.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for quadratus-the-apologist. 330x404 JPG, 22 KB, cut on 2026-10-17 from the 351x420 file, inside the white border it was scanned on (1.7.1). Its source is not yet looked into.",
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
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sophronius-of-jerusalem. 288x420 JPG, 33 KB. Opened 2026-11-10 (build 90 note 3): a contemporary panel icon of a brown-bearded bishop in a chequered phelonion with a blue omophorion and a red Gospel book, his name in Greek on a gold ground. Not found on Commons by search and picture hash (nearest 19 of 64 bits apart, another picture).",
  "sophrony-of-essex.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sophrony-of-essex. 300x420 JPG, 24 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon with a workshop's red round seal in its lower right corner.",
  "spyridon-of-trimythous.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for spyridon-of-trimythous. 288x420 JPG, 24 KB. Not yet opened and inspected.",
  "st-porphyrios-of-kavsokalyvia-324.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for porphyrios-of-kavsokalyvia. 291x420 JPG, 24 KB. Not yet opened and inspected.",
  "symeon-the-new-theologian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for symeon-the-new-theologian and AUTHOR_ICONS. 256x420 JPG, 28 KB. Not yet opened and inspected.",
  "tarasius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for tarasius-of-constantinople. 315x420 JPG, 38 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon on a board made to look old, a white-bearded bishop with a Gospel book, his name in Church Slavonic. Not found on Commons by search and picture hash (nearest 30 of 64 bits apart). His cover portrait (carried in the apps since note 5) is his face on the councils.",
  "theodosius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theodosius-the-great. 336x420 JPG, 25 KB. Not yet opened and inspected.",
  "theophan-the-recluse.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theophan-the-recluse. 301x420 JPG, 24 KB. Not yet opened and inspected.",
  "theophylact-of-ohrid.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theophylact-of-ohrid and AUTHOR_ICONS. 336x420 JPG, 26 KB. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): a contemporary painted icon, and laid over its foot at the right, a painter's name with the words \"painter of sacred icons\": a website's copy of a painter's work.",
  "xenia-of-petersburg.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for xenia-of-petersburg. 278x376 JPG, 18 KB, cut on 2026-10-17 from the 303x420 file, to the icon itself, off the white wall it was photographed on; small writing is at its foot, right (1.7.1). Its source is not yet looked into. Opened 2026-11-10 (the survey of the saints' pages for the arbiter): the small writing at its foot is a seller's line laid over the picture, beginning \"Hand made\": a website's copy.",};

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

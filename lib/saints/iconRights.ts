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
  /**
   * A CC BY or CC BY-SA picture only: whom its page asks to be credited, the
   * photographer of an old work, or (`creditAs: "icon"`) the painter who
   * published the icon under that licence themselves. The credits page names
   * every one (lib/credits/photos.ts), and so does a line under the picture
   * on the saint's page; a public-domain or CC0 picture carries none.
   */
  credit?: string;
  /** "icon" where `credit` is the icon's own painter (St Mark of Ephesus, 2026-11-11); else the photographer. */
  creditAs?: "icon";
  /**
   * The maker's own page for the picture, where the licence was given, which
   * the credit links to where it is not `evidenceUrl` (the workshop's Flickr
   * page for St Mark of Ephesus's icon).
   */
  creditPage?: string;
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
  // Cut on 2026-11-11 above the bare plaster at the mosaic's foot, which the
  // edge check found at the bottom and the lower right (scripts/
  // check-picture-edges.mjs): his face, his name and the roundel stay, his
  // hand does not. The cut of 2026-11-10 was theodore-the-studite.jpg.
  "theodore-the-studite.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A mosaic roundel of an old monk with a bald crown, a fringe of white hair and a long white beard, in a dark blue habit under a brown mantle, on a gold ground with his Greek name in black letters at either side; at the lower right a little of the mosaic is lost to bare plaster.",
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
  // is in the public domain, and their files are gone. So did St Paisius,
  // on the arbiter's word: the one old portrait of him on Commons
  // (File:Paisius.jpg) names no painter or date, so it waited until a dated
  // printing was found (his row below, paisius-velichkovsky.v3.jpg, from
  // 1886). Every file was opened.
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
  // Build 90 note 3 (2026-11-10): the answer to St Memnon's question. Commons'
  // unmarked photograph of the fresco our marked copy showed (3 of 64 bits
  // apart from it by difference hash: one picture), at its own 375 by 248,
  // promoted by scripts/fetch-saint-icons.mjs. A new name, v3: his old files
  // were shipped under the names before it.
  "memnon-of-ephesus.v3.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A wall painting of a bishop with short dark hair and a long dark beard streaked with grey, within a gold halo on a deep blue ground under a red arch, in a white omophorion with large black crosses; his name in Greek in white letters at either side of the halo, a raised hand at the lower left edge and the corner of a red book at the lower right.",
    work: "Fresco of St Memnon of Ephesus, Dionysiou Monastery, Mount Athos, inscribed with his name",
    artist: "Theophanes the Cretan, as the Commons page names the painter",
    workDate: "1547",
    source: "Wikimedia Commons (from icoana.wordpress.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Memnon_Ephesou_Dionysiou.jpg",
  },
  "basil-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic of a bishop with dark hair and a dark beard, within a halo on a gold ground, his name in Greek in dark letters down either side; in a white omophorion with black crosses over a dark robe, holding a jewelled Gospel book before him.",
    work: "Mosaic of St Basil the Great, St Sophia Cathedral, Kyiv, as the Commons page describes it",
    artist: "Unknown",
    workDate: "11th century",
    source: "Wikimedia Commons (from sedmitza.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Basil_of_Caesarea.jpg",
  },
  // In place of an unsourced modern Greek icon (2026-11-10). Commons holds the
  // file at 300 pixels wide; this is its 250-pixel standard thumbnail, kept at
  // its own size (scripts/fetch-saint-icons.mjs asks for no original).
  "gregory-theologian.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A painted icon of a balding bishop with a long brown beard, his head inclined, within a gold halo, his name lettered at the top left; in a white phelonion covered with red crosses and an omophorion with blue crosses, blessing with one hand and holding a jewelled red and gold Gospel book.",
    work: "Icon of St Gregory the Theologian, Russian, as the Commons page describes it",
    artist: "Unknown",
    workDate: "16th century",
    source: "Wikimedia Commons (from days.pravoslavie.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Gregory_of_Nazianzus.jpg",
  },
  // In place of a 2018 Commons upload naming no author, on terms the icon
  // tool's gate does not take (2026-11-10). Cut from his books' cover, as
  // November's St Philip's and St Matthew's are, so he wears one picture
  // everywhere: the reading room, Today and his own page. The arbiter's rule:
  // a public-domain icon of him with a known date, or the portrait.
  "seraphim-of-sarov.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A painted icon of an old monk with long white hair and a full white beard, in a dark mantle and a pale stole with gold crosses, his right hand on his chest, within a halo of painted flowers on chased gold.",
    work: "Icon of St Seraphim of Sarov, perhaps from the workshop of the Diveyevo monastery, oil on panel (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown Russian icon painter",
    workDate: "After 1903",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Seraphim_of_Sarov_(after_1903,_priv.coll).jpg",
  },
  // Four more in place of unsourced files (2026-11-10), each cut from the
  // picture his books already wear, as St Seraphim's above: St Cyril's from
  // the Cretan icon, St Maximus's and St Ephraim's from the Nea Moni mosaics,
  // the Apostle Peter's from the Kirillo-Belozersky board that is also his
  // page's large picture. Nothing new was fetched: the pictures and their
  // rights were settled with the covers. Each is the cover trimmed at both
  // sides to the carried icons' 3 by 4, at 315 by 420.
  "cyril-of-alexandria.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A painted icon of a bishop with a long dark beard, in a white cowl with a black cross and an omophorion with large black crosses, blessing and holding a red jewelled Gospel, on a gold ground with his name in red.",
    work: "Cretan icon of St Cyril and St Athanasius of Alexandria: St Cyril alone, under his name (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown Cretan painter",
    workDate: "16th to 17th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Cretan_Icon_of_Saint_Kyrillos_and_Saint_Athanasios_of_Alexandria.jpg",
  },
  "maximus-the-confessor.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic of a monk with short brown hair and a full beard in a blue-grey mantle, holding a small cross and raising his open palm, in a gold medallion edged with a beaded border, his name in dark letters on either side.",
    work: "Mosaic medallion of St Maximus the Confessor, Nea Moni, Chios (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "11th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Maximus_the_Confessor_(mosaic).jpg",
  },
  "ephraim-the-syrian.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A mosaic of a monk with short grey hair and a short grey beard in a dark olive cloak, on a field of gold tesserae with parts of dark Greek letters at both edges.",
    work: "Mosaic of St Ephraim the Syrian, Nea Moni, Chios (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "11th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Ephrem_the_Syrian_(mosaic_in_Nea_Moni).jpg",
  },
  "apostle-peter.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An apostle with curly grey hair and a short beard, bowing to the right in a dark blue tunic and an ochre cloak, holding an unrolled scroll written in Slavonic, on a gold ground: a cut of the Kirillo-Belozersky board.",
    work: "Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: St Peter the Apostle (his page's large picture, lib/saints/heroes.ts, and his books' cover)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_08_-_Peter.jpg",
  },
  // Seventeen more in place of unsourced files (2026-11-10), the same way: each
  // the picture the saint's books already wear (or, for the Apostles John and
  // Paul, the Kirillo-Belozersky board that is also his page's large picture),
  // trimmed at both sides to 315 by 420. Nothing new was fetched; the rights
  // are the covers' own. The ten saints whose books wear a Western painting
  // (El Greco, Simone Martini, Champaigne, Herrera, Barcia, del Cossa, Van
  // Dyck) are below, on the arbiter's word: on a page with no large picture
  // the carried icon is the page's picture.
  "apostle-bartholomew.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An apostle with short wavy brown hair and a short brown beard in a gold halo, in a pale blue tunic under a deep red cloak, holding a small white scroll, on a dark ground with his name in white.",
    work: "Fresco of the Apostle Bartholomew, the church of St Nicholas, Stavronikita monastery, Mount Athos (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Theophanes the Cretan and Symeon",
    workDate: "1546",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Apostle_Bartholomew._Fresco_of_the_Church_of_Agios_Nikolaos._Stavronikita_Monastery._Athos.jpg",
  },
  "apostle-john.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "The Apostle John, bald with a long white beard, bowing, in a dark green tunic and a red cloak, holding a jewelled Gospel, his name in red at the top left, on a gold ground.",
    work: "Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: St John the Theologian (his page's large picture, lib/saints/heroes.ts, and his books' cover)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_07_-_John_Evangelist.jpg",
  },
  "apostle-paul.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "The Apostle Paul with a high bald forehead and a long dark beard, bowing, in a dark tunic and a grey-brown cloak, holding a red jewelled book, on a gold ground.",
    work: "Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: St Paul the Apostle (his page's large picture, lib/saints/heroes.ts, and his books' cover)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_14_-_Paul.jpg",
  },
  "athanasius-the-great.v3.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A bishop with a high balding forehead and a long grey forked beard, in a white omophorion with black crosses, blessing and holding a red Gospel, on a worn gold and red ground with his name in red.",
    work: "Icon of St Athanasius from Sozopol, Bulgaria, tempera on wood, the National Art Gallery, Sofia (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "End of the 17th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg",
  },
  "constantine-the-great.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A crowned emperor with dark curly hair and a short beard, in a jewelled gold collar over a red robe, holding a sceptre, with an ornamented halo on a gold ground and his name in red.",
    work: "Icon of St Constantine and St Helen by Emmanuel Tzanes, the Loverdos collection, Athens: St Constantine alone, under his name (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Emmanuel Tzanes",
    workDate: "1669",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Constantine_and_Helen.png",
  },
  "epiphanius-of-salamis.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An old bishop with a long white beard and a balding head, in a white omophorion with large black and red crosses, holding an open scroll of Slavonic writing, under a gold halo on a blue ground.",
    work: "Fresco of St Epiphanius of Cyprus, Gračanica monastery (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "Not given on its page (the page names the fresco at Gračanica)",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Epiphanius-Kosovo.jpg",
  },
  "eustathius-of-antioch.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An old bishop with thick white hair and a long white beard in a large ochre halo, in a white omophorion with dark crosses, holding a jewelled book, on a deep blue ground with white Greek letters.",
    work: "Fresco of St Eustathius of Antioch, named on its page as from the church of the Theotokos Peribleptos, Ohrid (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "14th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Eustathios_of_Antioch_Fresco_Peribleptos.jpg",
  },
  "gregory-of-nyssa.v3.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A grey-bearded bishop in an olive phelonion and a white omophorion with black crosses, raising his right hand and holding a gold Gospel, before a gabled building with a blue frieze and arched windows.",
    work: "St Gregory of Nyssa, a miniature of the Menologion of Basil II, the Vatican Library (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "The painters of the Menologion of Basil II, Constantinople",
    workDate: "c. 985",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Gregory_of_Nyssa_(Menologion_of_Basil_II).jpg",
  },
  "ignatius-of-antioch.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A bishop with brown hair and a long brown beard in a gold halo, in white vestments patterned with dark red crosses, his right hand raised and a red Gospel under his arm, on a dark ground with his name in white.",
    work: "Fresco of St Ignatius the God-bearer, Stavronikita monastery, Mount Athos (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Theophanes the Cretan",
    workDate: "1545",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Ignatios_Theophoros_Stavronikita.webp",
  },
  "john-of-damascus.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An old man with a long white beard and a grey-violet turban wrapped over his head and shoulders, in an olive mantle, raising his right hand, under a gold halo on a dark ground with white letters.",
    work: "Fresco of St John of Damascus, the Protaton church, Mount Athos (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "14th to 15th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Athonite_Fresco_Icon_of_Saint_John_of_Damascus_2.jpg",
  },
  "justin-martyr.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A man with short dark curly hair and a dark beard in a gold halo, in an orange-red tunic with gold-embroidered shoulders under a pale mauve cloak, holding a small cross and a closed book, on a dark ground.",
    work: "Fresco of St Justin the Philosopher, Stavronikita monastery, Mount Athos (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Theophanes the Cretan",
    workDate: "c. 1546",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%98%D1%83%D1%81%D1%82%D0%B8%D0%BD_%D0%A4%D0%B8%D0%BB%D0%BE%D1%81%D0%BE%D1%84,_%D0%90%D1%84%D0%BE%D0%BD.jpg",
  },
  "mary-magdalene.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A woman in an orange veil and a blue-green cloak holding a small silver myrrh vessel, with a radiant gold halo and Slavonic name plates on a chased gold ground.",
    work: "Icon of St Mary Magdalene, the Museum of Russian Icons, Clinton (the picture on her books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown Russian icon painter",
    workDate: "c. 1890",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Mary_Magdalene_(Russia,_c._1890,_Clinton).jpg",
  },
  "mary-of-egypt.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A thin, sun-darkened woman with long grey hair, kneeling in profile with her hands raised and her mouth open to receive Communion, a brown mantle about her, under a faint halo on a cracked gold ground.",
    work: "The Communion of St Mary of Egypt, a Serbian icon, the Musée des Beaux-Arts de la Ville de Paris: St Mary alone (the picture on her books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown Serbian icon painter",
    workDate: "1723",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Ecole_de_(Ecole_serbe)_Serbie_-_La_Communion_de_sainte_Marie_l'Egyptienne_-_PPP4884_-_Mus%C3%A9e_des_Beaux-Arts_de_la_ville_de_Paris.jpg",
  },
  "polycarp-of-smyrna.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An old bishop with a high bald forehead and a long white beard in a large orange halo, in a white omophorion with dark red crosses, holding a jewelled Gospel, on a deep blue ground with his name in white.",
    work: "Fresco of St Polycarp of Smyrna, the church of St George, Staro Nagoričane (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown (the photograph is the uploader's, CC0)",
    workDate: "14th century, as its page's categories give it",
    source: "Wikimedia Commons",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Polycarp_of_Smyrna2.jpg",
  },
  "prochorus-the-deacon.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A young, beardless scribe with short brown curly hair in a gold halo, his head bowed as he writes with a reed pen, in a blue tunic under an olive cloak, before the dark cave of Patmos.",
    work: "Icon of St John the Theologian and St Prochorus by Emmanuel Lambardos: St Prochorus alone, under his name (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Emmanuel Lambardos",
    workDate: "1602",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:John_the_Evangelist_and_Prochorus_by_E.Lambardos_(1602).jpg",
  },
  "spyridon-of-trimythous.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An old bishop with a long grey beard in his woven shepherd's hat, red phelonion and white omophorion, blessing and holding a jewelled Gospel, seated on a gold throne with his name in red across the top.",
    work: "Icon of St Spyridon enthroned, from the Levant (Icônes arabes, Institut du monde arabe, 2003) (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "17th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Spyridon_icon.jpg",
  },
  "tarasius-of-constantinople.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A grey-haired bishop with a long grey-brown beard in a gold halo, in a white omophorion with large black crosses, blessing and holding a jewelled Gospel, on a deep blue ground with his name in white.",
    work: "Fresco of St Tarasius of Constantinople, the church of the Theotokos Peribleptos, Ohrid (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "14th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Tarasios_Peribleptos.jpg",
  },
  // The ten whose books wear a Western painting (2026-11-11), on the arbiter's
  // word under the covers' rule (build-89.md note 1: the old Orthodox icon,
  // fresco or mosaic first; an old Western painting only where the East has
  // none). The apostles: an Orthodox icon where Commons has one that passes
  // (St Simon's of 1720, lettered with his name; St James son of Alphaeus's
  // from a Mstyora deesis row), else Simone Martini's gold-ground panel that
  // their books wear (St Jude, St James son of Zebedee, St Matthias). A
  // Cretan icon filed on Commons as St Simon's was set aside: its letters
  // read as St Jude's, and its source is a page about him. St Augustine:
  // the Lateran fresco, the oldest portrait of him. St Leo: a Greek fresco
  // lettered with his name and see. St Florian: del Cossa's panel of 1473,
  // the oldest on Commons and his books' own. St Theodosius has no old icon,
  // fresco or mosaic on Commons and keeps the plate; his file is gone. St
  // Hosius had none either and kept the plate until the arbiter's word of
  // 2026-11-11 (build 93 note 1): one picture everywhere, his books' own
  // painting of about 1879 on his page as on his round at Nicaea, by the same
  // rule for a Western saint the East did not paint. Where a page's icon and
  // the books' cover now differ, the pairs are listed in
  // docs/1.9-build/notes/build-90.md for a later pass.
  "apostle-simon-zealot.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A painted icon of an apostle with dark curly hair and a short beard in a gold halo, in a dark tunic under a red cloak, raising his right hand and holding a red book, on a blue-green ground with his name in pale letters at the top.",
    work: "Icon of the Apostle Simon the Zealot, Russian, as the Commons page describes it",
    artist: "Unknown Russian icon painter",
    workDate: "1720",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Simon_the_Zealot_-_Apostle.jpeg",
  },
  "apostle-james-alphaeus.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A painted icon of an apostle with dark hair and a long dark beard within a thin halo, in a green tunic under an ochre cloak, holding a jewelled Gospel book, on a pale gold ground with his name in red at the top.",
    work: "Icon of the Apostle James son of Alphaeus from the deesis row of an iconostasis, painted at Mstyora, as the Commons page describes it",
    artist: "Mstyora icon painters",
    workDate: "19th century",
    source: "Wikimedia Commons (from a private collection)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Apostle_James,_son_of_Alphaeus.jpeg",
  },
  "augustine-of-hippo.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A fresco of a man in a white robe seated in a high-backed chair, reading a large open book on a stand, on a worn red and ochre ground, much of the paint lost.",
    work: "Fresco of St Augustine, the chapel of the Sancta Sanctorum, the Lateran, Rome, as the Commons page describes it",
    artist: "Unknown",
    workDate: "About 550 to 600",
    source: "Wikimedia Commons (from priorijthabor.nl)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Rome,_Lateran,_Capella_Sancta_Sanctorum,_Fresco_of_Augustine_(cropped).jpg",
  },
  "leo-the-great.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A fresco of an old bishop with short grey hair and a grey beard in a large gold halo, in a white omophorion with dark crosses, holding a jewelled Gospel, on a blue-grey ground with his name and see in dark Greek letters.",
    work: "Greek fresco of St Leo, Pope of Rome, as the Commons page describes it",
    artist: "Unknown",
    workDate: "14th to 15th century",
    source: "Wikimedia Commons (from johnsanidopoulos.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Greek_Fresco_of_Saint_Leo_I_Pope_of_Rome.jpg",
  },
  "apostle-james-zebedee.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A man with brown hair and a full beard in an orange mantle over a dark tunic with an embroidered collar, looking aside, under a tooled gold halo on a gold ground with parts of his Latin name.",
    work: "Saint James Major by Simone Martini, the National Gallery of Art, Washington (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Simone Martini",
    workDate: "c. 1315 to 1320",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_James_Major_A17835.jpg",
  },
  "apostle-jude.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A young beardless man with short auburn hair in an orange mantle over a dark embroidered tunic, looking aside, under a tooled gold halo on a gold ground with parts of his Latin name.",
    work: "Saint Judas Thaddeus by Simone Martini, the National Gallery of Art, Washington (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Simone Martini",
    workDate: "c. 1315 to 1320",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Judas_Thaddeus_A17829.jpg",
  },
  "apostle-matthias.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A bearded man with short brown hair in a rose mantle over a gold tunic, looking down to one side, under a tooled gold halo on a gold ground with part of his Latin name.",
    work: "Saint Matthias by Simone Martini and his workshop, the Metropolitan Museum of Art, New York (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Simone Martini and workshop",
    workDate: "c. 1317 to 1319",
    source: "Wikimedia Commons",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Matthias_MET_DP168805.jpg",
  },
  "florian-of-lorch.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A young man with shoulder-length curly brown hair under a tooled gold halo, in a red cloak over a dark blue tunic, holding a red rose, on a gold ground.",
    work: "Saint Florian by Francesco del Cossa, the National Gallery of Art, Washington (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Francesco del Cossa",
    workDate: "c. 1473 to 1474",
    source: "Wikimedia Commons",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Francesco_del_Cossa,_Saint_Florian,_c._1473-1474,_NGA_368.jpg",
  },
  // On the arbiter's word of 2026-11-11 under his "a free icon or the plate":
  // each saint's oldest picture where no old icon of him exists, public domain.
  // Found through Wikidata's main image of him and read on its own Commons
  // page while Commons' search refused automated asking. St Papias: the
  // Nuremberg Chronicle's woodcut named for him, 1493 (its figures were cut
  // from a few blocks used for many). St Paisius Velichkovsky's Commons
  // portrait (File:Paisius.jpg) names no source but "English Wikipedia", and
  // no painter or date, so the arbiter turned it down a second time
  // (2026-11-11: "the oldest public-domain picture whose freedom can be shown
  // in its row"); the cut made of it is kept in
  // docs/1.9-build/kept/paisius-velichkovsky/, and he wears a dated printing
  // instead (his row below).
  // Four Western Fathers (1.9, build 93's gate, part 3): old printed books and
  // a manuscript held outside Commons, each opened and read on its own leaf.
  // The cuts were made by hand from the holders' scans, since
  // scripts/fetch-saint-icons.mjs reads Commons alone.
  "bede-the-venerable.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of an old bearded monk in a skullcap, seen from the side, writing with a quill at a sloping desk.",
    work: "Bede, le Venerable, the engraving of chapter 56 in André Thevet's Les vrais pourtraits et vies des hommes illustres (Paris, 1584), leaf 120, the Boston Public Library's copy",
    artist: "Unknown engraver, for André Thevet",
    workDate: "1584",
    source: "Internet Archive (Boston Public Library)",
    license: "Public domain",
    evidenceUrl: "https://archive.org/details/lesvraispourtrai01thev/page/n278",
  },
  "hilary-of-poitiers.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of a clean-shaven man in a cloak, seen from the side, a pen raised in one hand and the other resting on open books.",
    work: "S. Hilaire, evesque de Poictiers, the engraving of chapter 51 in André Thevet's Les vrais pourtraits et vies des hommes illustres (Paris, 1584), leaf 110, the Boston Public Library's copy",
    artist: "Unknown engraver, for André Thevet",
    workDate: "1584",
    source: "Internet Archive (Boston Public Library)",
    license: "Public domain",
    evidenceUrl: "https://archive.org/details/lesvraispourtrai01thev/page/n258",
  },
  "isidore-of-seville.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A bishop with a halo and a low mitre, seated at a writing desk with an open book, his hand raised, on green and blue grounds with his name lettered above him.",
    work: "St Isidore, a detail of the opening picture of his Etymologies, where he and Bishop Braulio sit facing each other (Munich, Bavarian State Library, Clm 13031, leaf 1 recto, from Prüfening Abbey)",
    artist: "Unknown illuminator of Prüfening Abbey",
    workDate: "c. 1160 to 1165",
    source: "Bavarian State Library, Munich (Münchener DigitalisierungsZentrum)",
    license: "Public domain",
    evidenceUrl: "https://www.digitale-sammlungen.de/en/view/bsb00072196?page=5",
  },
  "peter-chrysologus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of a bearded bishop with a halo, looking up, in a vestment worked with leaves, a small view of a town in the corner.",
    work: "S. Petrus Chrisologus, the engraving on page 352 of Donald Lupton's The Glory of Their Times, or the Lives of the Primitive Fathers (London, 1640), the Pitts Theology Library's copy",
    artist: "Unknown engraver, for Donald Lupton",
    workDate: "1640",
    source: "Pitts Theology Library, Emory University (Digital Image Archive)",
    license: "Public domain",
    evidenceUrl: "https://dia.pitts.emory.edu/image_details.cfm?ID=130281",
  },
  "irenaeus-of-lyons.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of a bearded man with a high forehead and a halo, in a hooded cloak, within an oval frame.",
    work: "S. Irenaeus Episcopus Lugdunensis, an engraved portrait in Gottlieb Spitzel's Vetus academia Jesu Christi (1671), the Pitts Theology Library's copy",
    artist: "Unknown engraver, for Gottlieb Spitzel",
    workDate: "1671",
    source: "Pitts Theology Library, Emory University (Digital Image Archive)",
    license: "Public domain",
    evidenceUrl: "https://dia.pitts.emory.edu/image_details.cfm?ID=133339",
  },
  "irene-the-empress.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A gold coin with the bust of an empress facing, in a crown with a cross and strings of pearls and a jewelled robe, an orb and a sceptre in her hands, her name in Greek around her.",
    work: "Solidus of the Empress Irene, struck at Constantinople in her sole reign and lettered Eirene Basilissa (the Art Institute of Chicago, 2014.9)",
    artist: "The mint of Constantinople",
    workDate: "797 to 802",
    source: "The Art Institute of Chicago",
    license: "CC0",
    evidenceUrl: "https://www.artic.edu/artworks/221685/solidus-coin-of-empress-irene",
  },
  "juvenal-of-jerusalem.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A wall painting of a brown-bearded bishop with a gold halo, in a white robe chequered with dark red crosses, holding a Gospel book, on a blue ground with his name in Slavonic beside him.",
    work: "St Juvenal, one of the bishops painted in the vault of the prothesis of the Church of Christ Pantocrator, Visoki Dečani Monastery (a detail), photographed for the BLAGO Fund",
    artist: "Unknown painters of Dečani (the wall painting); the BLAGO Fund (the photograph, its photographer not named)",
    workDate: "c. 1350",
    source: "BLAGO Fund, the Dečani archive",
    license: "CC BY 4.0",
    evidenceUrl: "https://www.blagofund.org/Archives/Decani/Church/Pictures/Frescoes/Prothesis/Vault/CX4K3164.html",
    credit: "BLAGO Fund",
  },
  "lazar-of-serbia.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A worn wall painting of a prince with dark curling hair and beard, crowned and haloed in gold, in a red mantle over a jewelled robe, on a blue ground with a Slavonic inscription beside him.",
    work: "Prince Lazar, the founders' portrait in the narthex of Ljubostinja Monastery (a detail), photographed by Branko Jovanović for the BLAGO Fund",
    artist: "Unknown painter of Ljubostinja (the wall painting); Branko Jovanović (the photograph)",
    workDate: "c. 1402 to 1405",
    source: "BLAGO Fund, the Ljubostinja archive",
    license: "CC BY 4.0",
    evidenceUrl: "https://www.blagofund.org/Archives/Ljubostinja/Pictures/Interior/Narthex/Portraits_of_rulers/LJUBOSTINJA_1_080A1394.html",
    credit: "Branko Jovanović, BLAGO Fund",
  },
  "cosmas-of-aetolia.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A wall painting of a monk in a dark habit and hood with a long grey beard, his right hand raised in blessing and a staff and prayer rope in his left, on a pale ground with his name in Greek, Kosmas the hieromonk, beside him.",
    work: "St Kosmas the hieromonk, the wall painting from over his tomb at the Monastery of St Kosmas, Kolkondas, Albania (a detail)",
    artist: "Unknown painter",
    workDate: "19th century, soon after the monastery was built in 1814 to 1815",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Fresco_of_Saint_Kosmas_Aitolos,_Kolikontasi,_Great_Mouzaki,_Northern_Epeiros.jpg",
  },
  "anatolius-of-constantinople.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A wall painting of a grey-bearded bishop with an orange-gold halo, in a white omophorion with dark crosses, on a dark blue ground with his name in Greek beside him.",
    work: "St Anatolius, from the wall painting of Sts Anatolius and Gennadius on the south-east column of the Church of St George, Staro Nagoričane (a detail), photographed by Branko Jovanović for the BLAGO Fund",
    artist: "Unknown painters of Staro Nagoričane, usually given to Michael Astrapas and Eutychios (the wall painting); Branko Jovanović (the photograph)",
    workDate: "c. 1316 to 1318",
    source: "BLAGO Fund, the Staro Nagoričane archive",
    license: "CC BY 4.0",
    evidenceUrl: "https://www.blagofund.org/Archives/StaroNagorichane/Pictures/Interior/Nave/East_columns/SNAGORICANE_1_080A5498.html",
    credit: "Branko Jovanović, BLAGO Fund",
  },
  "basil-of-ostrog.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A worn painted panel of a bishop with a long dark beard, in a jewelled crown and a gold halo, blessing and holding a Gospel book, in green and rose vestments on a red ground with his name in Slavonic.",
    work: "St Basil of Ostrog, a painted panel kept at Ostrog Monastery, dated to the 18th century by the caption under it in the Orthodox Encyclopedia and by nothing else found (a detail). The photograph is a faithful copy of a flat old work and adds no rights; its photographer is not named",
    artist: "Unknown painter",
    workDate: "18th century",
    source: "The Orthodox Encyclopedia (pravenc.ru), its article on him",
    license: "Public domain",
    evidenceUrl: "https://www.pravenc.ru/text/149759.html",
  },
  "celestine-of-rome.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of a tonsured old man with a halo, seen from the side, in a cope worked with scrolling leaves, a small papal shield behind him.",
    work: "Celestinus I Papa Romanus, the engraved portrait on page 45 of Antonio Ciccarelli's Le vite de pontefici (Rome, 1588), the Getty Research Institute's copy",
    artist: "Giovanni Battista de' Cavalieri",
    workDate: "1588",
    source: "Internet Archive (Getty Research Institute)",
    license: "Public domain",
    evidenceUrl: "https://archive.org/details/levitedepontefic00cicc/page/n104",
  },
  "eutychius-of-constantinople.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A worn icon of a dark-bearded bishop in a robe chequered black and white, his right hand raised in blessing and a red Gospel book in his left, on a rubbed gold ground with his name in Greek.",
    work: "St Eutychius, an icon of Hilandar Monastery, Mount Athos, printed by the Orthodox Encyclopedia in its article on the Patriarch of Constantinople (a detail)",
    artist: "Unknown painter",
    workDate: "Late 16th or early 17th century",
    source: "Wikimedia Commons; this copy from the Orthodox Encyclopedia (pravenc.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Eutychius_of_Constantinople.jpg",
  },
  "anianus-of-alexandria.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A painting of a cobbler in a white turban seated at his bench, holding out his hurt hand to a dark-haired man in a blue mantle who bends to him, with turbaned men watching.",
    work: "St Mark healing Anianus, the cobbler of Alexandria who became its bishop after him (the Gemäldegalerie, Berlin; a detail)",
    artist: "Giovanni Battista Cima da Conegliano",
    workDate: "c. 1497 to 1499",
    source: "Wikimedia Commons (from the Web Gallery of Art)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Cima_da_conegliano,_guarigione_di_anania.jpg",
  },
  "cyril-and-methodius.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A wall painting of two grey-bearded monks with gold haloes, each holding a cross, with a scroll of the Slavonic alphabet between them and an eye in a burst of light above.",
    work: "Sts Cyril and Methodius, a wall painting at Troyan Monastery, Bulgaria",
    artist: "Zahari Zograf",
    workDate: "1848",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Sv_Kiril_Metodij_Zahari_Zograf_Trojanski_mon_1848.jpg",
  },
  "papias-of-hierapolis.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A woodcut of an old bishop in a white mitre and a red cope, holding a gilded crozier and pointing, his name printed over him, hand-coloured on cream paper.",
    work: "Papias, a woodcut of the Nuremberg Chronicle (Hartmann Schedel's Liber chronicarum)",
    artist: "Michael Wolgemut and Wilhelm Pleydenwurff",
    workDate: "1493",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Papias.png",
  },
  "hosius-of-cordova.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A bishop with a long white beard in a white mitre and a red chasuble, a crozier in his hand and an open book lettered in Latin with words of the Creed, before a dark niche.",
    work: "El obispo Osio by Ángel María de Barcia, the Museo de Bellas Artes, Córdoba (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Ángel María de Barcia Pavón",
    workDate: "c. 1879",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:El_obispo_Osio_-_%C3%81ngel_Mar%C3%ADa_de_Barcia_Pav%C3%B3n.jpg",
  },
  // Seven modern saints keep the plate, on the owner's word (2026-11-10, "rec
  // yes to all": "modern saints on the plate until a painter or monastery
  // gives written permission"): St Paisios the Athonite, St Porphyrios of
  // Kavsokalyvia, St Silouan the Athonite, St Justin Popović, St Cleopas of
  // Sihăstria, St Sofian of Antim and St Dumitru Stăniloae. Their icons are
  // living painters' work and their photographs are recent, so none is in
  // the public domain. Their files are gone (2026-11-11). St John of Shanghai
  // joined them the same day (call 14, the December chat): the icon his page
  // carried had no source and is a modern painting. He now wears a photograph
  // whose freedom can be shown (john-of-shanghai.jpg, below with Kronstadt's).
  // Fathers from Commons (2026-11-11), the rule as above: an old icon, fresco
  // or mosaic, or the plate. St Isaac's is a miniature dated 1802, clear where
  // the older one of 1518 (Kirillo-Belozersky) is worn past his face; it is
  // kept whole at its own size, so its painted border is not cut. St John
  // Cassian's is the centre of an 18th-century Russian icon, kept at its own
  // size (the file is 277 pixels wide; the 9th-century Paris Sacra Parallela
  // medallion is smaller still). St Sophronius's is an Athonite fresco. St
  // Mark of Ephesus and St Symeon the New Theologian keep the plate: Commons
  // has no old icon of either that passes (St Mark's is lettered in English,
  // so modern; St Symeon's are undated, modern, or set in rays).
  "isaac-the-syrian.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A manuscript miniature of a grey-bearded monk in a brown habit and a dark cowl, seated at a writing desk and writing in an open book, before pink and gold buildings, within a blue border of painted flowers.",
    work: "Miniature of St Isaac the Syrian writing at his desk, as the Commons page dates it",
    artist: "Unknown",
    workDate: "1802",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Isaac_Sirin.jpg",
  },
  "john-cassian.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A painted icon of an old monk with a long grey beard in a striped brown habit over a gold robe, his right hand raised in blessing and an open scroll in his left, on a pale ground with his name in white letters at the top.",
    work: "Icon of St John Cassian the Roman, the centre of a Russian icon, as the Commons page describes it",
    artist: "Unknown Russian icon painter",
    workDate: "18th century",
    source: "Wikimedia Commons (from cirota.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%98%D0%BE%D0%B0%D0%BD%D0%BD_%D0%9A%D0%B0%D1%81%D1%81%D0%B8%D0%B0%D0%BD_%D0%A0%D0%B8%D0%BC%D0%BB%D1%8F%D0%BD%D0%B8%D0%BD_%E2%80%93_%D0%A1%D1%80%D0%B5%D0%B4%D0%BD%D0%B8%D0%BA.jpg",
  },
  "sophronius-of-jerusalem.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A fresco of an old bishop with grey hair and a long grey beard in a gold halo, in white vestments patterned with black crosses, holding a jewelled red and gold Gospel, on a dark blue ground with his name and see in white Greek letters.",
    work: "Athonite fresco of St Sophronius of Jerusalem, as the Commons page describes it",
    artist: "Unknown",
    workDate: "14th to 15th century",
    source: "Wikimedia Commons (from johnsanidopoulos.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Athonite_Fresco_Icon_of_Saint_Sophronios_of_Jerusalem.jpg",
  },
  // December's saints (1.9, push 2b, docs/1.9-build/notes/december-saints.md).
  // The five prophets are cut from their read-aloud covers, the Kirillo-
  // Belozersky prophets row (lib/readAloud/covers.ts): who each figure is
  // there is the Church's tradition, as that file's review: "clergy" says.
  "prophet-nahum.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a man with light brown hair and a short beard, his face turned a little to the left, in a red-brown mantle over a green tunic, holding open a tall scroll of Slavonic writing, on a worn pale gold ground: a cut of the Kirillo-Belozersky board.",
    work: "Prophets row of the Kirillo-Belozersky iconostasis, the Prophet Nahum (his read-aloud cover, lib/readAloud/covers.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_08._Malachi,_Naum.jpg",
  },
  "prophet-habakkuk.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a young beardless man with curly brown hair, looking up and pointing upward with his right hand, in a dark blue tunic and a blue-grey mantle, a scroll of Slavonic writing at his side, on a worn gold ground: a cut of the Kirillo-Belozersky board.",
    work: "Prophets row of the Kirillo-Belozersky iconostasis, the Prophet Habakkuk (his read-aloud cover, lib/readAloud/covers.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_01._Habakkuk,_Jeremiah,_Jonah.jpg",
  },
  "prophet-zephaniah.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a man with curly brown hair and a full brown beard under a pale halo, in a dark green tunic and an ochre mantle, holding a long scroll of Slavonic writing, with his name in red letters at the upper right: a cut of the Kirillo-Belozersky board.",
    work: "Prophets row of the Kirillo-Belozersky iconostasis, the Prophet Zephaniah (his read-aloud cover, lib/readAloud/covers.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_06._Hosea,_Amos,_Zephaniah.jpg",
  },
  "prophet-haggai.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a man with long dark brown hair and a long brown beard, looking straight out, in a dark green tunic and a dark red mantle, on a worn white ground with the faint ring of a halo: a cut of the Kirillo-Belozersky board.",
    work: "Prophets row of the Kirillo-Belozersky iconostasis, the Prophet Haggai (his read-aloud cover, lib/readAloud/covers.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_02._Nathan,_Haggai,_Samuel.jpg",
  },
  "prophet-daniel.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a young man with thick curly brown hair and a small dark cap, his head tilted, in a red cloak over a jewelled tunic, one hand raised in blessing beside a scroll of Slavonic writing, on a worn gold ground: a cut of the Kirillo-Belozersky board.",
    work: "Prophets row of the Kirillo-Belozersky iconostasis, the Prophet Daniel (his read-aloud cover, lib/readAloud/covers.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_04._Daniel,_David,_Solomon.jpg",
  },
  // St Nicholas's new icon (his old file carried a contemporary painter's mark
  // and is off the app): cut from his page's large picture, as the Archangel's.
  "nicholas-the-wonderworker.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of a bald bishop with a short grey beard, his head bowed to the left, in a white omophorion with large red crosses over a robe patterned with black crosses, before an embossed silver halo and ground: a cut of the Kirillo-Belozersky board.",
    work: "Deesis row of the iconostasis of the Dormition cathedral, Kirillo-Belozersky monastery: St Nicholas the Wonderworker (his page's large picture, lib/saints/heroes.ts)",
    artist: "Anonymous Russian icon painters",
    workDate: "1497",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Kirillo-Belozersky_iconostasis_17_-_Nicholas.jpg",
  },
  // Build 93 note 12 ("no killing on a first picture"): the miniature shows
  // their church in flames, so the icon is a detail of its arcade, the
  // martyrs' faces above the parapet, clear of the fire (2026-11-11). The
  // whole miniature stays History's picture of the Great Persecution.
  // The second cut (January's push 2, the arbiter's word of 2026-11-11 that
  // a soft picture is a fault): the same detail from Commons' larger copy, with
  // scripts/fetch-saint-icons.mjs --detail; the first was cut from a 1200px staging, 252 by 187.
  "martyrs-of-nicomedia.v3.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A detail of a manuscript miniature: the faces of a crowd of men and one woman in a dark blue veil, looking out from under the arches of a church above its stone parapet.",
    work: "The twenty thousand martyrs of Nicomedia, the Menologion of Basil II (Vat. gr. 1613): a detail, the martyrs in the arcade of their church (History's picture of the Great Persecution, lib/history/events.ts)",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (days.pravoslavie.ru's copy, which carries no watermark), its 1920px copy",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:20,000_martyrs_of_Nicomedia_(Menologion_of_Basil_II).jpg",
  },
  // December's saints, push 2b: the icons found on Wikimedia Commons, each
  // opened on its own page and cut at its own pixels (2026-11-10).
  "philaret-the-merciful.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "The centre of a life icon: a man with a long white beard in a fur-trimmed red cap, in a dark green robe patterned with gold over a red tunic, holding a small white cross and an open scroll, under a gold halo on a pale orange ground, with red letters naming him Philaret the Merciful and a small figure of Christ at the upper left.",
    work: "Icon of St Philaret the Merciful with scenes of his life, Russian (its centre)",
    artist: "Anonymous Russian icon painter",
    workDate: "19th century",
    source: "Wikimedia Commons (from pravicon.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Icon_Filaret_Milostiviy.jpg",
  },
  "savva-of-storozhevsk.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "The centre of a life icon: a bald monk with a long brown beard, in a dark mantle over a schema sewn with crosses, his right hand raised and his left holding an open scroll of Slavonic writing, under a gold halo on a gold ground, with red letters naming him the Venerable Savva of Storozhevsk.",
    work: "Icon of St Savva of Storozhevsk with his life in twelve scenes, tempera on wood, State Russian Museum, St Petersburg (its centre)",
    artist: "Unknown",
    workDate: "1835",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Savva_Storozhevsky.jpg",
  },
  "barbara-the-great-martyr.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A worn icon of a young woman with long brown ringlets and large dark eyes, wearing a small jewelled crown, a white veil over her shoulders and a red robe with round gold ornaments and a jewelled band, holding a small cross before her and her other hand raised, within a large pale halo on a dark blue ground, white letters at the right naming her Barbara.",
    work: "Icon of St Barbara, Novgorod",
    artist: "Unknown",
    workDate: "15th century",
    source: "Wikimedia Commons (from drevo.pravbeseda.ru and icon-art.info)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Varvara_icon.jpg",
  },
  "sabbas-the-sanctified.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A worn wall painting of a monk with short dark hair and a short pointed beard, looking out within a large ochre halo, in a red-brown mantle over a pale tunic, one hand raised before his chest, on a blue-grey ground flaked with losses.",
    work: "Fresco of St Sabbas the Sanctified, Church of the Nativity in the Cemetery, Veliky Novgorod (named by the file's page; no inscription can be read)",
    artist: "Unknown Novgorod painter",
    workDate: "14th century",
    source: "Wikimedia Commons (reproduced from Sarabyanov and Smirnova, A History of Old Russian Painting, 2007)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%A1%D0%B0%D0%B2%D0%B2%D0%B0_%D0%9E%D1%81%D0%B2%D1%8F%D1%89%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9.jpg",
  },
  "nilus-of-stolobny.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "An icon of an old monk with a long grey beard in a dark green cowl marked with a cross, in a brown mantle over a dark schema embroidered with a Golgotha cross, his hands folded over a small scroll, within a gold halo on a dark ground, red letters either side naming him the Venerable Nilus of Stolobny.",
    work: "Old Believer icon of St Nilus of Stolobny, private collection (sold by MacDougall's)",
    artist: "Anonymous Russian icon painter",
    workDate: "19th century",
    source: "Wikimedia Commons (from MacDougall's Fine Art Auctions)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Nil_of_Stolbensk_(Old_believers,_19_c,_priv.coll).jpg",
  },
  "patapius-of-egypt.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A dark, worn wall painting of a man with dark hair and a full dark beard looking out from a large ochre halo, in a dark mantle, with faint Greek letters at the right beginning his name.",
    work: "Wall painting of St Patapius in his cave at Loutraki, Greece",
    artist: "Unknown",
    workDate: "Probably 15th century",
    source: "Wikimedia Commons (from globalusers.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Patapios_icon.jpg",
  },
  // The prints of November: the icon printed for each day in the Russian Lives
  // of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, 1903 to
  // 1911, the November volume), anonymous, public domain by age; used as
  // December's are, on the arbiter's word under the owner's "a free icon or
  // the plate" (2026-11-10). Each was looked at on 2026-11-11: the saints
  // standing, named in Slavonic beneath, no death shown. Each is cut inside its
  // own frame line, with none of the page or the caption below it; the light
  // at their edges is the print's own ground (scripts/check-picture-edges.mjs,
  // ACCEPTED). Where a day's print shows some of a page's saints and not all,
  // the row says which.
  "acindynus-and-companions.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of three men standing side by side, each within a plain halo: an old man with a long beard and his hand on his breast, and two younger bearded men each holding a small cross, in long robes and cloaks on a pale ground.",
    work: "Sts Acindynus, Pegasius and Anempodistus: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03021: the three figures whole",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03021_%D0%90%D0%BA%D0%B8%D0%BD%D0%B4%D0%B8%D0%BD,_%D0%9F%D0%B8%D0%B3%D0%B0%D1%81%D0%B8%D0%B9_%D0%B8_%D0%90%D0%BD%D0%B5%D0%BC%D0%BF%D0%BE%D0%B4%D0%B8%D1%81%D1%82.png",
  },
  "acepsimas-joseph-and-aithalas.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of three men standing side by side, each within a plain halo: an old bishop in an omophorion with crosses, an old priest in a dark phelonion, and a younger deacon in a light sticharion, on a pale ground.",
    work: "Sts Acepsimas, Joseph and Aithalas: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03031: the three figures whole",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03031_%D0%90%D0%BA%D0%B5%D0%BF%D1%81%D0%B8%D0%BC,_%D0%98%D0%BE%D1%81%D0%B8%D1%84_%D0%B8_%D0%90%D0%B8%D1%84%D0%B0%D0%BB.png",
  },
  "galaction-and-episteme.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a young man and a young woman standing side by side in dark monastic habits and schemas, each within a plain halo, she with a small cross in her hand, on a pale ground.",
    work: "Sts Galaction and Episteme: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03051: a detail, the two figures to the knee",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03051_%D0%93%D0%B0%D0%BB%D0%B0%D0%BA%D1%82%D0%B8%D0%BE%D0%BD_%D0%B8_%D0%95%D0%BF%D0%B8%D1%81%D1%82%D0%B8%D0%BC%D0%B0.png",
  },
  "patrobas-hermas-linus-gaius-and-philologus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of three old bearded bishops standing side by side in omophoria marked with crosses, each within a plain halo, the third holding a book, on a pale ground with grass at their feet.",
    work: "Sts Patrobas, Hermas and Linus, three of the five apostles of the day: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03053: the three figures whole",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03053_%D0%9F%D0%B0%D1%82%D1%80%D0%BE%D0%B2,_%D0%95%D1%80%D0%BC_%D0%B8_%D0%9B%D0%B8%D0%BD.png",
  },
  "martyrs-of-melitene.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a beardless young man with curling hair within a plain halo, in a long tunic and a cloak fastened at the shoulder, holding a small cross against his breast.",
    work: "St Hieron, the first of the thirty-three martyrs of Melitene: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03071: a detail, his figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03071_%D0%98%D0%B5%D1%80%D0%BE%D0%BD.png",
  },
  "matrona-of-constantinople.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a woman in a dark monastic veil and mantle within a plain halo, her right hand raised open before her breast.",
    work: "St Matrona of Constantinople: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03091: a detail, her figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03091_%D0%9C%D0%B0%D1%82%D1%80%D0%BE%D0%BD%D0%B0.png",
  },
  "erastus-olympas-rodion-sosipater-quartus-and-tertius.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of two old bearded bishops standing side by side in omophoria marked with crosses, each within a plain halo, one bald with a long beard, the other holding a small cross.",
    work: "Sts Erastus and Quartus, two of the six apostles of the day: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03103: a detail, the two figures to the knee",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03103_%D0%95%D1%80%D0%B0%D1%81%D1%82_%D0%B8_%D0%9A%D1%83%D0%B0%D1%80%D1%82.png",
  },
  "plato-and-romanus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a beardless youth with short hair within a plain halo, in a tunic and a patterned cloak, holding up a cross in his right hand.",
    work: "St Plato of Ancyra, the first of the two martyrs of the day: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03181: a detail, his figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03181_%D0%9F%D0%BB%D0%B0%D1%82%D0%BE%D0%BD.png",
  },
  "proclus-of-constantinople.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a bishop with thick hair and a long forked beard within a plain halo, in a patterned sakkos and an omophorion marked with crosses, holding a Gospel book before him in both hands.",
    work: "St Proclus of Constantinople: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03202: a detail, his figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03202_%D0%9F%D1%80%D0%BE%D0%BA%D0%BB.png",
  },
  "philemon-and-apphia.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of three figures standing side by side, each within a plain halo: an old bald bishop in an omophorion, a bearded man holding a tall cross and a book, and a woman in a veil and mantle holding a small cross.",
    work: "Sts Philemon, Archippus and Apphia: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03223: the three figures whole",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03223_%D0%A4%D0%B8%D0%BB%D0%B8%D0%BC%D0%BE%D0%BD,_%D0%90%D1%80%D1%85%D0%B8%D0%BF%D0%BF_%D0%B8_%D0%90%D0%BF%D1%84%D0%B8%D1%8F.png",
  },
  "amphilochius-of-iconium.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of an old bishop with a long beard within a plain halo, in a patterned phelonion and an omophorion marked with crosses, his right hand raised in blessing and a Gospel book in his left.",
    work: "St Amphilochius of Iconium: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03231: a detail, his figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03231_%D0%90%D0%BC%D1%84%D0%B8%D0%BB%D0%BE%D1%85%D0%B8%D0%B9.png",
  },
  "paramonus-and-the-370.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a man with short dark hair and a short beard within a plain halo, in a light tunic and a dark cloak, holding a small cross before his breast.",
    work: "St Paramon, the first of the 371 martyrs of the day: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03292: a detail, his figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03292_%D0%9F%D0%B0%D1%80%D0%B0%D0%BC%D0%BE%D0%BD.png",
  },
  "frumentius-of-axum.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a bishop with dark hair and a full dark beard within a plain halo, in a phelonion and an omophorion marked with crosses, his right hand raised in blessing and a book in his left.",
    work: "St Frumentius of Axum: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03302: a detail, his figure to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03302_%D0%A4%D1%80%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B8%D0%B9.png",
  },
  // Not a page's icon: the cover of the Martyrdom of Romanus alone, whose
  // page (Sts Plato and Romanus) wears St Plato's print (the arbiter,
  // 2026-11-11). The child is Barulas, who is in his martyrdom.
  "romanus-and-barulas.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a bearded man within a plain halo, in a tunic and a cloak, holding a small cross against his breast, and beside him a curly-haired child within a halo of his own, whose hand he holds.",
    work: "Sts Romanus and Barulas: the icon printed for the day in the Russian Lives of the Saints after St Demetrius of Rostov (Moscow, Synodal Press, the November volume), no. 03182: a detail, the two figures, the man to the waist",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_03182_%D0%A0%D0%BE%D0%BC%D0%B0%D0%BD_%D0%B8_%D0%92%D0%B0%D1%80%D1%83%D0%BB.png",
  },
  // The 1904 prints: Russian Lives of the Saints, December volume (Moscow,
  // 1904), anonymous, public domain by age; used on the arbiter's word under
  // the owner's "a free icon or the plate" (2026-11-10). Each is cut inside
  // its own frame line, with none of the page or the caption below it
  // (2026-11-11); the light left at their edges is the print's own stippled
  // ground (scripts/check-picture-edges.mjs, ACCEPTED).
  "sosthenes-apollos-cephas-and-tychicus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of three bearded bishops standing side by side in vestments with crossed omophoria, each within a plain halo, the first two with a hand raised and the third holding a book against his chest, on a stippled grey ground.",
    work: "Sts Sosthenes, Cephas and Tychicus, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04082_%D0%A1%D0%BE%D1%81%D1%84%D0%B5%D0%BD,_%D0%9A%D0%B8%D1%84%D0%B0_%D0%B8_%D0%A2%D0%B8%D1%85%D0%B8%D0%BA.png",
  },
  "menas-hermogenes-and-eugraphus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco of a man with grey hair and a long grey beard under a gold halo, in a green tunic with a jewelled collar and a red cloak, holding a small cross and a gold-covered book, Greek letters either side of his head naming him Menas the sweet-voiced, on a dark blue ground.",
    work: "Fresco of St Menas the Sweet-voiced, Dionysiou Monastery, Mount Athos",
    artist: "Tzortzis Phouka (some give the cycle to Theophanes the Cretan)",
    workDate: "1547",
    source: "Wikimedia Commons (from icoana.wordpress.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Menas_Kallikelados_Dionysiou.jpg",
  },
  "luke-the-new-stylite.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A manuscript miniature of a monk in a dark hood and mantle standing in the railed platform on top of a tall pink column that rises from blue waves, a wooden bridge at the foot of the column and brown hills on a gold ground behind.",
    work: "St Luke the Stylite of Chalcedon, the Menologion of Basil II (Vat. gr. 1613, p. 238); turned the right way round, as the file's own page says it should be (the copy on Commons is mirrored)",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (days.pravoslavie.ru's copy, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Luke_the_Stylites_(Menologion_of_Basil_II).jpg",
  },
  "lucia-of-syracuse.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of a young woman with long dark hair falling over her shoulders, her hands crossed on her breast, in a dark mantle over a light robe, within a plain halo, on a stippled grey ground showing faint letters through the page.",
    work: "St Lucia (Lucy) of Syracuse, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04133_%D0%9B%D1%83%D0%BA%D0%B8%D1%8F.png",
  },
  "thyrsus-leucius-and-callinicus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of three young men standing side by side in long robes and mantles, each within a plain halo, the first two bearded, the first and the third holding a small cross, on a stippled grey ground.",
    work: "Sts Thyrsus, Leucius and Callinicus, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04141_%D0%A4%D0%B8%D1%80%D1%81,_%D0%9B%D0%B5%D0%B2%D0%BA%D0%B8%D0%B9_%D0%B8_%D0%9A%D0%B0%D0%BB%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA.png",
  },
  "philemon-apollonius-and-arrianus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of two young men standing side by side, each within a plain halo, the first in a light robe and dark mantle holding a small axe, the second in a dark mantle holding a small cross and a book, on a stippled grey ground.",
    work: "Sts Philemon and Apollonius, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04142_%D0%A4%D0%B8%D0%BB%D0%B8%D0%BC%D0%BE%D0%BD_%D0%B8_%D0%90%D0%BF%D0%BE%D0%BB%D0%BB%D0%BE%D0%BD%D0%B8%D0%B9.png",
  },
  "stephen-of-surozh.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of an old bishop with a long white beard, within a plain halo, in a dark mantle over vestments with a crossed omophorion, holding a book, on a stippled grey ground.",
    work: "St Stephen of Surozh, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04151_%D0%A1%D1%82%D0%B5%D1%84%D0%B0%D0%BD.png",
  },
  "eleutherius-of-illyria.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco of a young bishop with short brown hair and a short brown beard under a gold halo, in a pale omophorion with black crosses over a green phelonion, holding a red and gold book, Greek letters either side of his head naming him Eleutherius, on a dark blue ground framed in red.",
    work: "Fresco of St Eleutherius of Illyria, Dionysiou Monastery, Mount Athos",
    artist: "Tzortzis Phouka (some give the cycle to Theophanes the Cretan)",
    workDate: "1547",
    source: "Wikimedia Commons (from johnsanidopoulos.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Agios_Eleutherios_Dionysious.jpg",
  },
  "juliana-of-nicomedia.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of a young woman in a veil and a long mantle, within a plain halo, holding a small cross before her chest, on a stippled grey ground.",
    work: "St Juliana of Nicomedia, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04211_%D0%98%D1%83%D0%BB%D0%B8%D0%B0%D0%BD%D0%B8%D1%8F.png",
  },
  // Call 30, the owner's word of 2026-11-11 ("rec for all"): the quiet
  // pictures, in place of the scenes of their deaths. St Sebastian's print
  // is cut inside its frame line like the others.
  "sebastian-and-companions.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a young man with dark curly hair and a short beard, within a plain halo, in a soldier's short tunic and a cloak, holding a small cross before his chest, on a stippled grey ground.",
    work: "St Sebastian, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04181_%D0%A1%D0%B5%D0%B2%D0%B0%D1%81%D1%82%D0%B8%D0%B0%D0%BD.png",
  },
  "anastasia-the-pharmakolytria.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A worn icon of a woman with a long oval face in a red cap and a dark green veil and mantle, holding a red cross in her right hand and a small red jar in her left, on a gold ground with flaking edges.",
    work: "Icon of St Anastasia the Deliverer from Poisons, wood, State Hermitage Museum (from the Russian Archaeological Institute in Constantinople)",
    artist: "Unknown",
    workDate: "Late 14th to early 15th century",
    source: "Wikimedia Commons (from icon-art.info)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%92%D0%BC%D1%87_%D0%90%D0%BD%D0%B0%D1%81%D1%82%D0%B0%D1%81%D0%B8%D1%8F_%D0%A3%D0%B7%D0%BE%D1%80%D0%B5%D1%88%D0%B8%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D0%B8%D1%86%D0%B0.jpg",
  },
  "theophano-the-empress.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A manuscript miniature of a crowned empress standing with both hands raised in prayer, in a long purple and gold robe set with round medallions and a red cloak, between the walls and towers of two buildings on a gold ground, with plants at her feet.",
    work: "St Theophano, wife of the emperor Leo VI, the Menologion of Basil II (Vat. gr. 1613, p. 249)",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (from a printed reproduction, via vatopaidi.wordpress.com; no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_050.jpg",
  },
  "modestus-of-jerusalem.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A painted icon of an old bishop with a long white beard in a gold crown-shaped mitre, his right hand raised in blessing and his left holding a book, in a gold and white vestment with an omophorion, under a gold halo on a blue-green sky, worn Greek letters at the top naming him Modestus.",
    work: "Icon of St Modestus from the village of Zidarovo, Burgas Art Gallery, Bulgaria",
    artist: "Unknown (the photograph is Spiritia's, given into the public domain)",
    workDate: "1851",
    source: "Wikimedia Commons",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Modestus_1851_Zidarovo.jpg",
  },
  "boniface-of-tarsus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A painted icon of a beardless young man with short curly brown hair and large dark eyes, in a green cloak over a red tunic, his right hand holding a tall cross and his left on his breast, before a gold ground tooled with ornament, blue panels either side of his head bearing his name.",
    work: "Icon of St Boniface the martyr, Palekh, signed by Dmitry Korin, the hereditary Palekh icon painter, private collection (sold by MacDougall's)",
    artist: "Dmitry Korin",
    workDate: "1887, as the sale dated it (with a question mark)",
    source: "Wikimedia Commons (from MacDougall's Fine Art Auctions)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Bonifatius_by_Dm.Korin_(1887_%3F_priv.coll).jpg",
  },
  "chrysogonus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of an old man with curly grey hair and a long grey beard, within a plain halo, in a light robe and a dark mantle, holding a small cross and a book, on a stippled grey ground.",
    work: "St Chrysogonus, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04222_%D0%A5%D1%80%D0%B8%D1%81%D0%BE%D0%B3%D0%BE%D0%BD.png",
  },
  "niphon-of-cyprus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of a balding bishop with a short beard, within a plain halo, in a dark mantle over vestments with a crossed omophorion, his right hand raised and his left holding a book, before a low wall.",
    work: "St Niphon of Cyprus, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04231_%D0%9D%D0%B8%D1%84%D0%BE%D0%BD%D1%82.png",
  },
  "eugenia-of-rome.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of a young woman in a dark veil and a long dark mantle, within a plain halo, holding a small cross and a scroll, on a stippled grey ground.",
    work: "St Eugenia of Rome, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04241_%D0%95%D0%B2%D0%B3%D0%B5%D0%BD%D0%B8%D1%8F.png",
  },
  "marcellus-of-the-unsleeping-ones.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A black and white print of an old monk with a long white beard, within a plain halo, in a dark mantle over a schema embroidered with a Golgotha cross, his left hand raised, on a stippled grey ground.",
    work: "St Marcellus of the Unsleeping Ones, a print in the Russian Lives of the Saints after St Demetrius of Rostov, December volume",
    artist: "Unknown",
    workDate: "1904",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_04291_%D0%9C%D0%B0%D1%80%D0%BA%D0%B5%D0%BB%D0%BB.png",
  },
  "theodore-the-branded.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco of an old monk with grey hair and a long grey beard under a gold halo, in a purple mantle over an ochre tunic, holding an unrolled scroll of Greek writing, on a dark ground with Greek letters at the left naming him Theodore the Branded.",
    work: "Sts Theodore and Theophanes the Branded, fresco, Dionysiou Monastery, Mount Athos: St Theodore, the right-hand figure",
    artist: "Unrecorded",
    workDate: "1547",
    source: "Wikimedia Commons (from pravicon.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%A4%D0%B5%D0%BE%D0%B4%D0%BE%D1%80_%D0%B8_%D0%A4%D0%B5%D0%BE%D1%84%D0%B0%D0%BD_%D0%9D%D0%B0%D1%87%D0%B5%D1%80%D1%82%D0%B0%D0%BD%D0%BD%D1%8B%D0%B5.jpg",
  },
  "zoticus-the-orphanmaster.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A manuscript miniature of a man with short dark hair and a dark beard under a gold halo, in a long ochre robe and blue tunic, one hand raised and a scroll in the other, before a long arcaded building with blue arches and red roofs on a gold ground.",
    work: "St Zoticus, Keeper of Orphans, the Menologion of Basil II (Vat. gr. 1613, p. 286; its heading is too faded to read, so the name is the file's and days.pravoslavie.ru's)",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (days.pravoslavie.ru's copy, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Zoticus,_Keeper_of_Orphans_(Menologion_of_Basil_II).jpg",
  },
  "melania-the-younger.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A manuscript miniature of a nun in a dark green veil and mantle over a brown robe, standing with both hands raised in prayer, between the pale grey walls of a building and slender blue columns on a gold ground, red cloths hanging from the walls.",
    work: "St Melania the Younger, the Menologion of Basil II (Vat. gr. 1613, p. 285)",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (days.pravoslavie.ru's copy, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Melania_the_Younger,_nun_of_Rome_(Menologion_of_Basil_II).jpg",
  },
  "ambrose-of-milan.jpg": {
    status: "verified",
    inspectedOn: "2026-11-10",
    alt: "A fresco of an old bishop with grey hair and a long grey beard under a gold halo, in a white omophorion with large red crosses over a phelonion checked in black and white, holding a red and gold book, Greek letters either side of his head naming him Ambrose of Milan, on a dark blue ground under a red arch.",
    work: "Fresco of St Ambrose of Milan, Dionysiou Monastery, Mount Athos",
    artist: "Unknown (the cycle is given to Tzortzis Phouka, by some to Theophanes the Cretan)",
    workDate: "1547",
    source: "Wikimedia Commons (from icoana.wordpress.com)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Athonite_Fresco_Icon_of_Saint_Ambrose_of_Milan.jpg",
  },
  // 1.9, build 93 note 12 (the owner: "Ensure every single saint has a icon
  // photo"): four saints off the plate, each cut from the picture his books
  // already wear (lib/reading/authorCovers.ts, its rights recorded there), as
  // the seventeen of 2026-11-10 were: three wide by four tall about the
  // middle, at the house's 315 by 420, never enlarged.
  "apostle-thomas.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A beardless young apostle with short dark hair in an ornate gold halo, in a black tunic under a red cloak, holding an unrolled scroll beside a carved gold throne, on a bright gold ground with his name in red Greek letters.",
    work: "Icon of St Thomas the Apostle, signed by Konstantinos Tzanes (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Konstantinos Tzanes",
    workDate: "1670",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Thomas_K._Tzanes.png",
  },
  "gregory-the-dialogist.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A bishop with a grey forked beard in a tall gold headdress and a white omophorion with black crosses, holding a long unrolled scroll of Greek text, on a gold ground with seams in its boards.",
    work: "Icon of St Gregory the Dialogist, from the Savvathiana monastery, the collection of St Catherine, Heraklion (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown Cretan painter (the photograph is C. Messier's, CC0)",
    workDate: "Second half of the 17th century",
    source: "Wikimedia Commons",
    license: "CC0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%CE%86%CE%B3%CE%B9%CE%BF%CF%82_%CE%93%CF%81%CE%B7%CE%B3%CF%8C%CF%81%CE%B9%CE%BF%CF%82_%CE%BF_%CE%94%CE%B9%CE%AC%CE%BB%CE%BF%CE%B3%CE%BF%CF%82_0633.jpg",
  },
  "meletius-of-antioch.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A balding bishop with a long dark forked beard in a large ochre halo, in a white omophorion with large dark crosses, holding a jewelled Gospel, on a deep blue ground with white Greek letters.",
    work: "Fresco of St Meletius of Antioch, the church of St George, Staro Nagoričane (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "Unknown",
    workDate: "1317",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Meletios_of_Antioch_Staro_Nagori%C4%8Dane.jpg",
  },
  // A Western Father, by the arbiter's rule for the Western ten (2026-11-11):
  // the oldest image first, otherwise the painting his books wear.
  "jerome-of-stridon.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An old man with short white hair and a long white beard falling to his chest, in a crimson cape over a red cassock, against a plain black ground.",
    work: "Saint Jerome as Scholar by El Greco, the Metropolitan Museum of Art (the picture on his books' covers, lib/reading/authorCovers.ts)",
    artist: "El Greco",
    workDate: "c. 1610",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Jerome_as_Scholar_MET_DT3103.jpg",
  },
  // On the arbiter's word of 2026-11-11 under his "a free icon or the plate":
  // each saint's oldest picture where no old icon of him exists, public domain
  // by its age, the date in its row.
  "theophan-the-recluse.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A photograph of a monk with long dark hair parted in the middle and a long full beard, in a dark cassock with a cross on a chain, against a pale ground.",
    work: "Photograph of St Theophan, Bishop of Tambov, later the Recluse of Vysha (a photograph, not an icon: he was canonized in 1988, and no icon of him is old enough to be free)",
    artist: "Unknown photographer",
    workDate: "19th century",
    source: "Wikimedia Commons (from acmus.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%95%D0%BF%D0%B8%D1%81%D0%BA%D0%BE%D0%BF_%D0%A2%D0%B0%D0%BC%D0%B1%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%A4%D0%B5%D0%BE%D1%84%D0%B0%D0%BD.jpg",
  },
  "nikodemos-the-hagiorite.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of a bearded monk in a tall cap, writing with a quill in an open book before shelves of books, inside an oval of Greek letters.",
    work: "Engraved portrait of St Nikodemos the Hagiorite, signed by Antonios Zoulianis, Venice (an engraving, his oldest picture; the oval names him and his repose)",
    artist: "Antonios Zoulianis",
    workDate: "1818 (published 1819)",
    source: "Wikimedia Commons (from saint.gr)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%CE%86%CE%B3%CE%B9%CE%BF%CF%82_%CE%9D%CE%B9%CE%BA%CF%8C%CE%B4%CE%B7%CE%BC%CE%BF%CF%82_%CE%BF_%CE%91%CE%B3%CE%B9%CE%BF%CF%81%CE%B5%CE%AF%CF%84%CE%B7%CF%82.jpg",
  },
  // Call 30 and build 93 note 12 (the owner's words of 2026-11-11, "quiet or
  // plate" and then "Ensure every single saint has a icon photo"): the four
  // whose only pictures show their deaths take a detail of their own picture
  // that shows the saints and not the killing. Each is cut at its own pixels,
  // never enlarged, so these are small; the Ten Martyrs' is from Commons'
  // 1920px copy of the same file, which a detail needed.
  // The second cut (January's push 2, the arbiter's word of 2026-11-11 that
  // a soft picture is a fault): the same detail from Commons' larger copy, with
  // scripts/fetch-saint-icons.mjs --detail; the first was cut from the 800px staging, 138 by 184.
  "holy-innocents.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A detail of a wall painting: a woman in a yellow robe with long fair hair, kneeling and looking up and away, holding a small child behind her back, beside the folds of another woman's dark green mantle.",
    work: "The Massacre of the Innocents (He Brephoktonia), fresco, Dionysiou Monastery, Mount Athos: a detail, a mother sheltering her child",
    artist: "Tzortzis Phouka (some give the cycle to Theophanes the Cretan)",
    workDate: "1547",
    source: "Wikimedia Commons, its 960px copy, the largest Commons serves of it",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Brephoktonia_Dionysiou.jpg",
  },
  // The second cut (January's push 2, the arbiter's word of 2026-11-11 that
  // a soft picture is a fault): the same detail from Commons' larger copy, with
  // scripts/fetch-saint-icons.mjs --detail; the first was cut from the 800px staging, 140 by 187.
  "eustratius-and-companions.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A detail of a wall painting: a young man with brown hair and a short beard under a gold halo, seated in a red cloak clasped at the breast over a grey tunic, his name in Greek letters either side of his head, on a dark blue ground with a pale rock behind him.",
    work: "The Martyrdom of Sts Eugene, Eustratius and Orestes, fresco, Dionysiou Monastery, Mount Athos: a detail, St Eugene, named beside him",
    artist: "Theophanes the Cretan, as the file's page gives it (the Dionysiou cycle of 1547 is usually given to Tzortzis Phouka)",
    workDate: "1547",
    source: "Wikimedia Commons, its 960px copy, the largest Commons serves of it",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Martyrion_Agion_Eugeniou_Eustratiou_Orestou_Dionysiou.jpg",
  },
  // The second cut (January's push 2, the arbiter's word of 2026-11-11 that
  // a soft picture is a fault): the same detail from Commons' larger copy, with
  // scripts/fetch-saint-icons.mjs --detail; the first was cut from the 1920px copy, 192 by 256.
  "ten-martyrs-of-crete.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A detail of an icon: two men standing side by side on a gold ground, one older with a dark beard in a dark robe, the other young and beardless in a red tunic with a black sash, looking up.",
    work: "The Ten Martyrs of Crete, Cretan school, Petit Palais, Musée des Beaux-Arts de la Ville de Paris (PPP4887): a detail, two of the martyrs standing above the scene of their deaths",
    artist: "School of Crete",
    workDate: "Between 1668 and 1800",
    source: "Wikimedia Commons (from Paris Musées), its 3840px copy",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Ecole_cr%C3%A9toise_-_Les_dix_martyrs_de_Cr%C3%A8te_-_PPP4887_-_Mus%C3%A9e_des_Beaux-Arts_de_la_ville_de_Paris.jpg",
  },
  // The second cut (January's push 2, the arbiter's note of 2026-11-11 that
  // the first was soft at page size): the same detail, cut from Commons'
  // 1920px copy with scripts/fetch-saint-icons.mjs --detail, where the first
  // was cut from the 800px staging and came out 218 by 190.
  "anysia-of-thessaloniki.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A detail of a manuscript miniature: a woman's face under a red veil over a blue-green cap, in a red mantle, inside the fine outline of a halo on a gold ground.",
    work: "St Anysia at Thessalonica, the Menologion of Basil II (Vat. gr. 1613, p. 337): a detail, her head and shoulders",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons, its 1920px copy",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Anysia_at_Thessaloniki_(Menologion_of_Basil_II).jpg",
  },
  // Build 93 note 18 ("every work wears a picture"): the panel of the three
  // martyrs, whole, cut inside the board's edge. On 2026-11-10 it was turned
  // down only because three standing figures would not cut to a portrait of
  // three by four; a whole panel needs no such cut.
  "gurias-samonas-and-habib.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An icon of three saints standing side by side on a dark olive ground under red Slavonic letters naming each: an old man with a long grey beard in a green mantle raising his hand, a younger bearded man in a red cloak holding a small cross, and a beardless deacon in a patterned silver vestment holding a censer, with Christ in a ring of cloud above them.",
    work: "Icon of the holy martyrs Gurias, Samonas and Habib (Aviv), tempera on wood, 31 by 26 cm, Russian",
    artist: "Unknown Russian icon painter",
    workDate: "Late 19th century",
    source: "Wikimedia Commons (from Bukowskis)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:The_holy_martyres_Gurias,_Samonas_and_Aviv.jpg",
  },
  // Under his "Ensure every single saint has a icon photo" (build 93 note 12),
  // on the arbiter's word of 2026-11-11: where no old icon of a saint is free,
  // a photograph or a portrait made in his time, recorded plainly as such.
  "john-of-kronstadt.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A sepia photograph of a priest with long hair and a long dark beard, in a dark cassock with a large pectoral cross on a chain and the small cross of an order on his breast, looking out, on a pale studio ground.",
    work: "A photograph, not an icon: St John of Kronstadt, taken by Alfred Fedecki in Kharkov in 1890 (the year is printed on it)",
    artist: "Alfred Fedecki (died 1902)",
    workDate: "1890",
    source: "Wikimedia Commons (scanned by its uploader)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%A4%D0%B5%D0%B4%D0%B5%D1%86%D0%BA%D0%B8%D0%B9_%D0%98%D0%BE%D0%B0%D0%BD%D0%BD_%D0%9A%D1%80%D0%BE%D0%BD%D1%88%D1%82%D0%B0%D0%B4%D1%82%D1%81%D0%BA%D0%B8%D0%B9_%D0%A5%D0%B0%D1%80%D1%8C%D0%BA%D0%BE%D0%B2_1890.jpg",
  },
  "joasaph-of-belgorod.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A detail of a painted portrait: a bishop with a greying beard in a black klobuk, a red omophorion marked with crosses over a green mantle and a jewelled panagia, holding a staff, inside an oval band of Slavonic letters.",
    work: "A portrait, not an icon: St Joasaph (Gorlenko), Bishop of Belgorod and Oboyan, State Historical Museum, Moscow, painted after his death in 1754 and before his glorification in 1911, so without a halo (a detail, inside its oval)",
    artist: "Unknown",
    workDate: "18th to 19th century",
    source: "Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Joasaph_of_Belgorod_(GIM).jpg",
  },
  // St John of Shanghai, a reader's own ask, on the arbiter's word of
  // 2026-11-11: a photograph of him whose public domain status can be shown.
  // First published: the Russian book «Бэйгуань» (Tianjin, 1939), pp. 72 and
  // 73, a page headed "The vicar bishops of the Russian Ecclesiastical
  // Mission in China", his portrait captioned "His Grace John, Bishop of
  // Shanghai", no photographer named (orthodox.cn cites the same book, Tianjin
  // 1939, for its photographs of the Mission). Why it is free: China protected
  // a photograph for fifty years from its first publication (Copyright Law of
  // 1990, art. 21, for every term that ended before the law of 2020 took
  // effect in 2021), so this one has been free there since the end of 1989.
  // It was therefore free on 1 January 1996, the date the United States
  // restored works still protected in China (17 U.S.C. 104A), and was not
  // restored: public domain in the United States too.
  "john-of-shanghai.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white photograph of a bishop with a dark beard and moustache, in a tall black klobuk and veil, wearing a panagia with the face of Christ and a jewelled pectoral cross on two chains, looking straight out, on a grey studio ground.",
    work: "A photograph, not an icon: St John of Shanghai as Bishop of Shanghai, first printed in 1939 (a detail: his portrait, the left of the two on its page, cut inside its frame line)",
    artist: "Photographer not named",
    workDate: "1939 or before",
    source: "«Бэйгуань» (Tianjin, 1939), pp. 72 and 73, its first printing; scanned on Wikimedia Commons",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%98%D0%BE%D0%B0%D0%BD%D0%BD_(%D0%9C%D0%B0%D0%BA%D1%81%D0%B8%D0%BC%D0%BE%D0%B2%D0%B8%D1%87)_%D0%B8_%D0%AE%D0%B2%D0%B5%D0%BD%D0%B0%D0%BB%D0%B8%D0%B9_(%D0%9A%D0%B8%D0%BB%D0%B8%D0%BD)._1939.jpg",
  },
  // St Theophylact of Ohrid, on the arbiter's word of 2026-11-11: his
  // 17th-century Russian miniature, lettered with his name and see. Its
  // original on Commons is 341 by 600, the whole figure, so his head and
  // shoulders are cut at the miniature's own pixels, 222 by 296, never
  // enlarged (St John Cassian's, above, is 250 wide; the house's cut is 315
  // by 420 where the source allows). The gold ornament inside his halo is
  // part of a miniature of that century, not a burst of beams behind him,
  // which is what the owner's rule against rays forbids (that rule is about
  // our own design); St Symeon's icon was set in rays around the whole
  // figure, so that call stands.
  "theophylact-of-ohrid.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A manuscript miniature of a grey-bearded bishop with dark hair to his shoulders, in a patterned red and gold sakkos and a white omophorion with red crosses, under a gold halo ringed in pink, his name lettered above in Church Slavonic.",
    work: "Miniature of St Theophylact, Archbishop of Bulgaria, from a Russian manuscript, as its Commons page gives it (a detail: his head and shoulders)",
    artist: "Unknown (anonymous, as its Commons page gives it)",
    workDate: "17th century",
    source: "Wikimedia Commons (from biblia.okis.ru)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Theophylact_the_Bulgarian.jpg",
  },
  // St Paisius Velichkovsky, on the arbiter's word of 2026-11-11: the oldest
  // printing of his portrait whose date can be shown. First printed as the
  // frontispiece of «Житие и писания молдавского старца Паисия
  // Величковского» (Odessa, 1886), published for the New Neamț monastery of
  // the Ascension in Bessarabia: a lithograph of him with his staff and his
  // prayer rope, captioned in Romanian in Cyrillic letters with the day of
  // his repose, 15 November 1794, no artist named. The first printing of his
  // Life (Optina, Moscow, 1847), in the scan read, has no portrait, and the
  // portrait in a reprint of it is the reprint's (Optina, 2001), so not used.
  // Why it is free: printed in 1886 with no artist named, so free in Russia
  // (seventy years from publication for an anonymous work, Civil Code art.
  // 1281) and, published before 1931, in the United States. The scan is the
  // Russian State Library's copy, on the Internet Archive, page n4.
  "paisius-velichkovsky.v3.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A lithograph of an old monk with a long white beard and long white hair, in a tall black kamilavka and veil and a pleated black mantle, one hand on his staff and the other holding a prayer rope, on a stippled grey ground.",
    work: "A lithograph, not an icon: St Paisius Velichkovsky, the frontispiece of his Life, first printed in 1886 (a detail: his head and shoulders, cut inside its frame line)",
    artist: "Not named",
    workDate: "1886 or before",
    source: "«Житие и писания молдавского старца Паисия Величковского» (Odessa, 1886), its frontispiece; scanned on the Internet Archive",
    license: "Public domain",
    evidenceUrl: "https://archive.org/details/zhitieipisanijamoldavskogostartsapaisija37/page/n4/mode/1up",
  },
  // January's saints (1.9, push 2): each picture staged and looked at with
  // scripts/fetch-saint-icons.mjs, a detail cut where the picture holds more
  // than the saint, and no first picture showing a killing (call 30).
  "paul-of-thebes.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A fresco of an aged hermit with long grey hair and a white beard falling below his waist, in a garment of woven palm leaves, his right hand on his chest, in a gold halo on a dark blue ground, Greek letters beside his head naming him Paul of Thebes.",
    work: "St Paul of Thebes and St John the Hut-Dweller, a fresco of Mount Athos: a detail, St Paul under his name",
    artist: "An Athonite fresco painter, not named",
    workDate: "14th to 15th century",
    source: "Wikimedia Commons (a photograph of the fresco first put online by prayerrope.co, with no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint-Paul-of-Thebes-and-Saint-John-the-Hut-Dweller-Athonite.jpg",
  },
  "john-the-hut-dweller.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A fresco of a young monk with short dark hair in a gold halo, in a dark green mantle, holding a small gold cross before him and a red book at his side, on a dark blue ground, Greek letters beside his head naming him John.",
    work: "St Paul of Thebes and St John the Hut-Dweller, a fresco of Mount Athos: a detail, St John under his name",
    artist: "An Athonite fresco painter, not named",
    workDate: "14th to 15th century",
    source: "Wikimedia Commons (a photograph of the fresco first put online by prayerrope.co, with no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint-Paul-of-Thebes-and-Saint-John-the-Hut-Dweller-Athonite.jpg",
  },
  "domnica-of-constantinople.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A manuscript miniature of a woman in a dark green veil and mantle over a brown robe, standing with her hands raised toward heaven, in a pale halo on a gold ground, a grey mountain behind her and the door of a white building at her side.",
    work: "St Domnica of Constantinople, the Menologion of Basil II (Vat. gr. 1613): a detail, the saint at prayer",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (days.pravoslavie.ru's copy, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Domnica_of_Constantinople_(Menologion_of_Basil_II).jpg",
  },
  "dometian-of-melitene.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A manuscript miniature of an old bishop with grey hair and a grey beard, in a white robe, a brown phelonion and a white omophorion with black crosses, standing with his hands raised in prayer, on a gold ground with a small tree and a bare brown hill.",
    work: "St Dometian of Melitene at prayer, from the miniature of his burial, the Menologion of Basil II (Vat. gr. 1613, p. 306): a detail, the bishop alone",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (pravenc.ru's copy, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_032.jpg",
  },
  "xenophon-and-mary.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A manuscript miniature of an old monk with a white beard in a dark mantle over a golden robe, his right hand raised before him under a white arch, and beside him a young man in a pale gold habit with his hands at his breast, under a green and gold canopy on a gold ground.",
    work: "Sts Xenophon and Mary with their sons Arcadius and John, the Menologion of Basil II (Vat. gr. 1613): a detail, St Xenophon and one of his sons",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (days.pravoslavie.ru's copy, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Xenophon_and_his_wife,_Saint_Mary,_and_their_two_sons,_Arcadius_and_John,_of_Constantinople_(Menologion_of_Basil_II).jpg",
  },
  "cyrus-and-john.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A manuscript miniature of a young man with dark curly hair and a short beard in a gold halo, in a long grey-green robe with a gold collar, his hands behind his back, standing before an orange hill with a small tree at his side.",
    work: "Sts Cyrus and John with St Athanasia and her daughters, the Menologion of Basil II (Vat. gr. 1613): a detail, the younger of the two saints, standing apart",
    artist: "Byzantine illuminators of the Menologion of Basil II",
    workDate: "circa 985",
    source: "Wikimedia Commons (a copy first put online on Yandex.Fotki, which carries no watermark)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Cyrus_and_John_of_Alexandria_(Menologion_of_Basil_II).jpeg",
  },
  "philip-of-moscow.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An icon of a metropolitan with a darkened face and a short dark beard, in a white mitre and a silver halo, wearing a red phelonion with gold crosses and a white omophorion with black crosses, his right hand raised and a red Gospel book in his left, on a ground of chased gilt metal.",
    work: "St Philip, Metropolitan of Moscow, an icon by Simon Ushakov, 1653, egg tempera and basma on wood (Kaluga Art Museum): a detail, his figure",
    artist: "Simon Ushakov",
    workDate: "1653",
    source: "Wikimedia Commons (the Kaluga Art Museum's photograph)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Simon_Ushakov._Metropolitan_Philipp_(1653).jpg",
  },
  "sylvester-of-rome.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of an old bishop with short grey hair and a grey beard inside the outline of a halo, in a patterned phelonion and a white omophorion with crosses, his right hand at his breast and a Gospel book in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05022: a detail, St Sylvester, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05022_%D0%A1%D0%B8%D0%BB%D1%8C%D0%B2%D0%B5%D1%81%D1%82%D1%80.png",
  },
  "gordius-of-caesarea.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a man with long hair and a long beard inside the outline of a halo, in a rough belted robe, holding a small cross in his right hand and a tall staff in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05031: a detail, St Gordius, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05031_%D0%93%D0%BE%D1%80%D0%B4%D0%B8%D0%B9.png",
  },
  "prophet-malachi.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a young man with short curly hair inside the outline of a halo, in a robe and a wide mantle, his right hand raised in blessing and an open scroll of writing in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05032: a detail, the Prophet Malachi, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05032_%D0%9C%D0%B0%D0%BB%D0%B0%D1%85%D0%B8%D1%8F.png",
  },
  "polyeuctus-of-melitene.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a bearded man with curly hair inside the outline of a halo, in a long tunic and a mantle, holding a slender cross in his right hand and a tall spear in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05091: a detail, St Polyeuctus, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05091_%D0%9F%D0%BE%D0%BB%D0%B8%D0%B5%D0%B2%D0%BA%D1%82.png",
  },
  "theodosius-the-cenobiarch.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of an old monk with a long white beard inside the outline of a halo, in a dark monastic mantle, his right hand raised in blessing and an open scroll of writing in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05111: a detail, St Theodosius the Cenobiarch, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05111_%D0%A4%D0%B5%D0%BE%D0%B4%D0%BE%D1%81%D0%B8%D0%B9_%D0%92%D0%B5%D0%BB%D0%B8%D0%BA%D0%B8%D0%B9.png",
  },
  "tatiana-of-rome.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a young woman in a veil inside the outline of a halo, in a long white robe and a dark mantle, holding a slender cross and a small censer.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05121: a detail, St Tatiana, her figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05121_%D0%A2%D0%B0%D1%82%D0%B8%D0%B0%D0%BD%D0%B0.png",
  },
  "hermylas-and-stratonicus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of two young men side by side, each inside the outline of a halo: one in a deacon's robe holding a censer, the other in a tunic and mantle holding a cross and a tall spear.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05131: a detail, Sts Hermylas and Stratonicus side by side",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05131_%D0%95%D1%80%D0%BC%D0%B8%D0%BB_%D0%B8_%D0%A1%D1%82%D1%80%D0%B0%D1%82%D0%BE%D0%BD%D0%B8%D0%BA.png",
  },
  "euthymius-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of an old monk with a long white beard inside the outline of a halo, in a dark monastic mantle with the cross of the great schema, his right hand raised in blessing and an open scroll of writing in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05201: a detail, St Euthymius the Great, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05201_%D0%95%D0%B2%D1%84%D0%B8%D0%BC%D0%B8%D0%B9_%D0%92%D0%B5%D0%BB%D0%B8%D0%BA%D0%B8%D0%B9.png",
  },
  "apostle-timothy.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a bearded man with short curly hair inside the outline of a halo, in a dark phelonion and a white omophorion with crosses, his right hand at his breast and a Gospel book and a scroll in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05221: a detail, the Apostle Timothy, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05221_%D0%A2%D0%B8%D0%BC%D0%BE%D1%84%D0%B5%D0%B9.png",
  },
  "anastasius-the-persian.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a monk with grey hair and a long grey beard inside the outline of a halo, in a dark monastic mantle, holding a small cross in his right hand.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05222: a detail, St Anastasius the Persian, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05222_%D0%90%D0%BD%D0%B0%D1%81%D1%82%D0%B0%D1%81%D0%B8%D0%B9.png",
  },
  "clement-of-ancyra.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of an old bishop with a white beard inside the outline of a halo, in a dark phelonion and a white omophorion with crosses, his right hand raised in blessing and a Gospel book in his left.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05231: a detail, St Clement of Ancyra, his figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05231_%D0%9A%D0%BB%D0%B8%D0%BC%D0%B5%D0%BD%D1%82.png",
  },
  "xenia-of-rome.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of an icon of a nun in a dark veil and mantle inside the outline of a halo, her right hand laid on her breast.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05241: a detail, St Xenia, her figure",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05241_%D0%9A%D1%81%D0%B5%D0%BD%D0%B8%D1%8F.png",
  },
  // The second picture (the arbiter's word of 2026-11-11, 13:39 UTC, on a
  // still of the two at 390, notes/january-saints/04-sinai-fathers-two-ways.png):
  // the whole print, cut inside its frame and above its Slavonic caption, in
  // place of the first cut's close detail of three faces, which showed the
  // scan's grain.
  "fathers-of-sinai-and-raithu.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black-and-white print of a domed church with its buildings on a hilltop, and on the rocky slope below it a row of monks with haloes lying at rest, one beside another, their eyes closed, in heavy robes.",
    work: "The icon printed for the day in the Russian Lives of the Saints after St Dimitry of Rostov (Moscow, Synodal Press, the January volume), no. 05141: the whole print inside its frame, above its Slavonic caption, the Fathers lying at rest on the slope below their monastery",
    artist: "Not named",
    workDate: "Before 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_05141_%D0%9F%D1%80%D0%B5%D0%BF%D0%BE%D0%B4%D0%BE%D0%B1%D0%BD%D1%8B%D0%B5_%D0%BE%D1%82%D1%86%D1%8B,_%D0%B2_%D0%A1%D0%B8%D0%BD%D0%B0%D0%B8_%D0%B8_%D0%A0%D0%B0%D0%B8%D1%84%D0%B5_%D0%B8%D0%B7%D0%B1%D0%B8%D0%B5%D0%BD%D0%BD%D1%8B%D0%B5.png",
  },
  // The Prophet Micaiah (the arbiter's word of 2026-11-11, 15:04 UTC,
  // "Luyken"): no icon of him with a maker to write to exists, and every old
  // picture of him found shows Zedekiah's blow, his death, or the other Micah
  // (docs/1.9-build/notes/january-saints.md, "The Prophet Micaiah: the last
  // search"). This one shows no blow: the scene of his witness, Micaiah before
  // Ahab and Jehoshaphat with his arm held out to them, Zedekiah beside him in
  // his horns, not striking. There is no face because the etcher drew him from
  // behind, turned to the kings; the scene, not a portrait, is what stands for
  // him, so it is cut wide enough to read as his story at a card's size.
  "prophet-micaiah.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An etching of a crowded palace hall: two crowned kings sit enthroned on stepped daises, and before them a robed man seen from behind holds out his arm to them, while a man in a horned headdress stands at his side and a crowd looks on.",
    work: "Jan Luyken, De Propheet Micha, voor Achab, en Josaphat (1 Kings 22), an etching for Christoph Weigel's Historiae Celebriores Veteris Testamenti (Nuremberg, 1708), the Rijksmuseum's proof: a detail, the prophet before the two kings, Zedekiah beside him",
    artist: "Jan Luyken",
    workDate: "Before 1708",
    source: "Rijksmuseum, Amsterdam (RP-P-OB-45.373), its IIIF image, under CC0 1.0 and the Public Domain Mark",
    license: "Public domain",
    evidenceUrl: "https://id.rijksmuseum.nl/200226269",
  },
  // Two of Updates 2's search (build 93 note 12), from the woodcuts of the
  // Nuremberg Chronicle (1493), as St Papias's: each the oldest picture of him
  // found whose freedom can be shown, his name over him on the block, the
  // whole woodcut cut inside its frame lines (Theodosius's a detail, so that
  // his name, written over him by an early hand, stands whole). Why they are
  // free: printed in 1493, and the Rijksmuseum, which holds these sheets and
  // serves them itself, marks each Public Domain (Mark 1.0) on its own page.
  // None was found older and free for St Adrian or for Theodosius. St Adrian
  // is Pope Adrian I, whom the block names "Hadrianus primus"; the file his
  // page once showed was not he (build 90).
  "adrian-of-rome.v2.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A woodcut of a pope in the triple tiara and a hooded cope, holding a tall cross with three crossbars, his name printed over him in black letter, on cream paper.",
    work: "Hadrianus primus, a woodcut of the Nuremberg Chronicle (Hartmann Schedel's Liber chronicarum), the Rijksmuseum's sheet RP-P-2016-49-58-8",
    artist: "Michael Wolgemut and Wilhelm Pleydenwurff",
    workDate: "1493",
    source: "Rijksmuseum, Amsterdam",
    license: "Public domain",
    evidenceUrl: "https://www.rijksmuseum.nl/en/collection/RP-P-2016-49-58-8",
  },
  "theodosius-the-great.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A woodcut of a bearded emperor in a crown, an orb with a cross in one hand and a long sceptre in the other, his name written over him by hand, on cream paper.",
    work: "Theodosius, a woodcut of the Nuremberg Chronicle (Hartmann Schedel's Liber chronicarum), the Rijksmuseum's sheet RP-P-2016-49-46-4 (a detail: his head, his orb and his sceptre)",
    artist: "Michael Wolgemut and Wilhelm Pleydenwurff",
    workDate: "1493",
    source: "Rijksmuseum, Amsterdam",
    license: "Public domain",
    evidenceUrl: "https://www.rijksmuseum.nl/en/collection/RP-P-2016-49-46-4",
  },
  // St Isidora: the three older-looking icons of her on Commons give no
  // maker, place or date, only their uploader's word that they are several
  // hundred years old; this print's date and its freedom are shown by the
  // volume it is cut from. Public domain by age, as the December volume's
  // prints above are; cut about her inside the page, at its own pixels (the
  // copy Commons serves is 500 pixels wide).
  "isidora-of-tabenna.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A black and white print of a young woman in a veil drawn over her head and falling about her shoulders, her hands folded at her breast under her mantle, within a plain halo, on the page's white ground.",
    work: "St Isidora, a print in the Russian Lives of the Saints after St Demetrius of Rostov, May volume",
    artist: "Unknown",
    workDate: "1903 to 1911",
    source: "Wikimedia Commons (from the volume's scan)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%96%D0%B8%D1%82%D0%B8%D1%8F_%D0%A1%D0%B2%D1%8F%D1%82%D1%8B%D1%85_(1903-1911)_-_%D0%B8%D0%BA%D0%BE%D0%BD%D0%B0_09102_%D0%98%D1%81%D0%B8%D0%B4%D0%BE%D1%80%D0%B0.png",
  },
  // St Alexander: the oldest picture of him found, a fresco of the Veljusa
  // monastery (11th to 14th century), is on Commons only as a small
  // photograph taken from a university website and put under the Free Art
  // License by whoever uploaded it, which shows nothing of who took it; the
  // Russian Lives of the Saints have no print of him on his day, 29 May. So
  // this engraving, from a Hungarian Lives of the Saints printed in Budapest
  // about 1899: public domain by age, its engraver unnamed and the book's
  // author dead since 1933. Its file page tags the 2012 scan CC BY-SA 3.0,
  // which a faithful scan of a flat public-domain print cannot add to (the
  // house's rule, docs/licensing/SHARE_FLOWERS.md). Cut inside the
  // engraving's oval, so none of the page shows.
  "alexander-of-alexandria.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "An engraving of an old bishop with a short white beard and thinning hair, a fine halo about his head and a pallium marked with a cross over his shoulders, on a ground of fine engraved lines.",
    work: "St Alexander of Alexandria, an engraving in Lajos Dedek Crescens's Lives of the Saints (Szentek élete), Budapest (a detail inside its oval: his head and shoulders)",
    artist: "Unknown",
    workDate: "About 1899",
    source: "Wikimedia Commons (a scan of the book)",
    license: "Public domain",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Alexander-Alexandria.JPG",
  },
  // St Victorinus: the oldest picture of him whose freedom can be shown,
  // Giacomo Brollo's fresco of 1886 in the parish church of St Leonard at
  // Nova Cerkev, Slovenia. The fresco is public domain (Brollo died in
  // 1918), and a faithful photograph of a wall painting adds no rights of
  // its own, as with St Alexander's engraving above (the arbiter,
  // 2026-11-11). Its photographer shares the photograph of 2010 under CC
  // BY-SA 3.0 all the same, so the photographer is named as its page asks,
  // and Purify's cut is shared under the same licence. Left: an 1888 Life
  // of him whose cover has no picture of him;
  // the photographs of St Aloysius's church in Maribor and St George's in
  // Ptuj, whose pages name no painter or date for the picture of him they
  // show; a statue of 2003 in Ptuj, too new to be free.
  "victorinus-of-pettau.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A wall painting of a bearded bishop in a small mitre and a golden chasuble with a pale band down its front, holding a book marked with a cross, a crozier and the hilt of a sword beside him, against a pale sky.",
    work: "St Victorinus of Pettau, fresco in the parish church of St Leonard, Nova Cerkev, Slovenia (a detail: his head and body to the knees)",
    artist: "Giacomo Brollo",
    workDate: "1886",
    source: "Wikimedia Commons (a photograph of 2010)",
    license: "CC BY-SA 3.0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:Victorinus.jpg",
    credit: "Urharec",
  },
  // St Mark of Ephesus: no clean picture of him whose freedom can be shown is
  // older. The Illustrated Chronicle's two miniatures of the Council of
  // Florence (1568 to 1576) show him small among other men, his face half
  // behind another's; Commons' "Mark of Ephesus.jpg" is a signed
  // 20th-century Greek icon wrongly tagged public domain; the Russian Lives
  // of the Saints have no print of him on 19 January. So, by the owner's
  // word of 2026-11-11 ("Yes to both", relayed by the arbiter at 14:54 UTC),
  // the Eleon icon-painting workshop's icon of St Mark with St Macarius the
  // Great, which the workshop photographed and published itself, on its own
  // Flickr account, under CC BY 2.0
  // (https://www.flickr.com/photos/107233269@N08/20781338902/; the licence
  // read there by Commons' review bot on 2016-10-10, and still there on
  // 2026-11-11). It is not public domain: the painter's own free licence
  // stands in for a letter, and the workshop is named as that licence asks,
  // under his picture on his page and on the credits page, with the licence
  // and the photograph's page. Cut to St Mark alone, his name lettered
  // beside his halo, from the workshop's own 955 by 1200 file; never on a
  // journal banner or a shared picture, which cannot name the workshop.
  "mark-of-ephesus.jpg": {
    status: "verified",
    inspectedOn: "2026-11-11",
    alt: "A painted icon of a bishop with a long white beard in a black monastic veil, a red halo about his head, blessing with his right hand and holding a red Gospel book with a jewelled cover, in a green vestment over a white stole marked with dark crosses, his name lettered in red on the gold ground.",
    work: "Sts Mark of Ephesus and Macarius the Great, an icon by the Eleon icon-painting workshop (a detail: St Mark alone, his head and body to the waist)",
    artist: "Eleon icon-painting workshop (Иконописная мастерская Елеон)",
    workDate: "Contemporary (photographed by the workshop in 2015)",
    source: "The workshop's own Flickr account, by way of Wikimedia Commons",
    license: "CC BY 2.0",
    evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%9C%D0%B0%D1%80%D0%BA_%D0%B8_%D0%9C%D0%B0%D0%BA%D0%B0%D1%80%D0%B8%D0%B9_%28%D0%B8%D0%BA%D0%BE%D0%BD%D0%BE%D0%BF%D0%B8%D1%81%D0%BD%D0%B0%D1%8F_%D0%BC%D0%B0%D1%81%D1%82%D0%B5%D1%80%D1%81%D0%BA%D0%B0%D1%8F_%D0%95%D0%BB%D0%B5%D0%BE%D0%BD%29.jpg",
    credit: "Eleon icon-painting workshop (Иконописная мастерская Елеон)",
    creditAs: "icon",
    creditPage: "https://www.flickr.com/photos/107233269@N08/20781338902/",
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
  // None open. The two of build 90 note 3 (2026-11-10) were answered the same
  // day and their files are out of the app: St Memnon's marked copy, whose
  // place Commons' unmarked copy of the Dionysiou fresco took
  // (memnon-of-ephesus.v3.jpg, its row in ICON_RIGHTS), and St Adrian's
  // picture of another saint, on the plate until a true icon of him is found.
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
  "marcian-the-emperor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marcian-the-emperor. 235x420 JPG, 21 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon of a standing emperor in a crown and red cloak under a painted arch, holding a scroll written in English, his name in Latin letters. Not found on Commons by search and picture hash (nearest 29 of 64 bits apart).",
  "marina-the-great-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marina-the-great-martyr. 305x420 JPG, 31 KB. Not yet opened and inspected.",
  "martin-the-confessor.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for martin-the-confessor. 319x390 JPG, 28 KB, cut on 2026-10-17 from the 329x400 file, inside the white lines at its edges (1.7.1). Its source is not yet looked into. Opened 2026-11-10 (build 90 note 3): a contemporary icon in the Russian manner, a white-bearded pope in a white mitre holding the Image Not Made by Hands, his name in Church Slavonic. Not found on Commons by search and picture hash of the file it was cut from (nearest 24 of 64 bits apart).",
  "niketas-the-goth.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for niketas-the-goth. 315x420 JPG, 36 KB. Not yet opened and inspected.",
  "nino-nina-of-georiga.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nino-of-georgia. 322x420 JPG, 24 KB. Not yet opened and inspected.",
  "olympias-the-deaconess.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for olympias-the-deaconess. 315x420 JPG, 17 KB. Not yet opened and inspected.",
  "pulcheria-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for pulcheria-the-empress. 336x420 JPG, 28 KB. Opened 2026-11-10 (build 90 note 3): a contemporary icon of a crowned empress holding a cross, her name in Latin letters on a gold ground. Not found on Commons by search and picture hash (nearest 19 of 64 bits apart, another picture).",
  "quadratus-the-apologist.v2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for quadratus-the-apologist. 330x404 JPG, 22 KB, cut on 2026-10-17 from the 351x420 file, inside the white border it was scanned on (1.7.1). Its source is not yet looked into.",
  "sava-of-serbia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sava-of-serbia. 322x420 JPG, 31 KB. Not yet opened and inspected.",
  "sergius-of-radonezh.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sergius-of-radonezh. 345x420 JPG, 24 KB. Not yet opened and inspected.",
  "simeon-streaming-myrrh.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for simeon-the-myrrh-streaming. 315x420 JPG, 26 KB. Not yet opened and inspected.",
};

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

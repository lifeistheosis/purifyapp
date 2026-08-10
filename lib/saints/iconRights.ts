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
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for adrian-of-rome. 458x600 JPG, 66 KB. Not yet opened and inspected.",
  "agatho-of-rome.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for agatho-of-rome. 250x410 JPG, 50 KB. Not yet opened and inspected.",
  "alexander-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for alexander-of-alexandria. 800x1000 JPG, 312 KB. Not yet opened and inspected.",
  "anatolius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anatolius-of-constantinople. 768x844 JPG, 341 KB. Not yet opened and inspected.",
  "anianus-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anianus-of-alexandria and AUTHOR_ICONS. 400x400 JPG, 35 KB. Not yet opened and inspected.",
  "anthony-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for anthony-the-great. 290x800 JPG, 76 KB. Not yet opened and inspected.",
  "apostle-andrew.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-andrew and AUTHOR_ICONS. 903x1200 JPG, 155 KB. Not yet opened and inspected.",
  "apostle-bartholomew.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-bartholomew and AUTHOR_ICONS. 690x1000 JPG, 83 KB. Not yet opened and inspected.",
  "apostle-james-alphaeus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-james-alphaeus and AUTHOR_ICONS. 434x648 JPG, 105 KB. Not yet opened and inspected.",
  "apostle-james-zebedee.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-james-zebedee and AUTHOR_ICONS. 434x648 JPG, 113 KB. Not yet opened and inspected.",
  "apostle-john.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-john and AUTHOR_ICONS. 735x1000 JPG, 77 KB. Not yet opened and inspected.",
  "apostle-jude.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-jude and AUTHOR_ICONS. 434x648 JPG, 118 KB. Not yet opened and inspected.",
  "apostle-matthew.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-matthew and AUTHOR_ICONS. 311x400 JPG, 53 KB. Not yet opened and inspected.",
  "apostle-matthias.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-matthias and AUTHOR_ICONS. 615x849 JPG, 235 KB. Not yet opened and inspected.",
  "apostle-paul.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-paul and AUTHOR_ICONS. 510x800 JPG, 101 KB. Not yet opened and inspected.",
  "apostle-peter.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-peter and AUTHOR_ICONS. 434x648 JPG, 105 KB. Not yet opened and inspected.",
  "apostle-philip.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-philip and AUTHOR_ICONS. 320x400 JPG, 69 KB. Not yet opened and inspected.",
  "apostle-simon-zealot.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-simon-zealot and AUTHOR_ICONS. 434x648 JPG, 108 KB. Not yet opened and inspected.",
  "apostle-thomas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for apostle-thomas and AUTHOR_ICONS. 857x1200 JPG, 209 KB. Not yet opened and inspected.",
  "archangel-michael.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for archangel-michael. 733x1024 JPG, 257 KB. Not yet opened and inspected.",
  "arsenios-prislop.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for arsenius-of-prislop. 801x1200 JPG, 140 KB. Not yet opened and inspected.",
  "athanasius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for athanasius-the-great and AUTHOR_ICONS. 575x800 JPG, 154 KB. Not yet opened and inspected.",
  "augustine-of-hippo.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for augustine-of-hippo and AUTHOR_ICONS. 557x800 JPG, 101 KB. Not yet opened and inspected.",
  "basil-of-ostrog.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for basil-of-ostrog. 720x940 JPG, 279 KB. Not yet opened and inspected.",
  "basil-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for basil-the-great and AUTHOR_ICONS. 350x478 JPG, 81 KB. Not yet opened and inspected.",
  "celestine-of-rome.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for celestine-of-rome. 228x809 JPG, 86 KB. Not yet opened and inspected.",
  "cleopa-ilie.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cleopas-of-sihastria. 500x618 JPG, 84 KB. Not yet opened and inspected.",
  "constantine-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for constantine-the-great. 720x940 JPG, 237 KB. Not yet opened and inspected.",
  "cyril-and-methodius.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-and-methodius. 800x1000 JPG, 392 KB. Not yet opened and inspected.",
  "cyril-of-alexandria.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-of-alexandria and AUTHOR_ICONS. 601x800 JPG, 62 KB. Not yet opened and inspected.",
  "cyril-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cyril-of-jerusalem. 363x450 JPG, 67 KB. Not yet opened and inspected.",
  "dumitru-staniloae.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for dumitru-staniloae. 576x720 JPG, 242 KB. Not yet opened and inspected.",
  "ephraim-the-syrian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for ephraim-the-syrian. 327x450 JPG, 28 KB. Not yet opened and inspected.",
  "epiphanius-of-salamis.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for epiphanius-of-salamis. 742x1000 JPG, 91 KB. Not yet opened and inspected.",
  "eustathius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for eustathius-of-antioch. 736x875 JPG, 262 KB. Not yet opened and inspected.",
  "eutychius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for eutychius-of-constantinople. 896x1200 JPG, 248 KB. Not yet opened and inspected.",
  "florian-of-lorch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for florian-of-lorch. 770x975 JPG, 218 KB. Not yet opened and inspected.",
  "gabriel-of-georgia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gabriel-of-georgia. 720x940 JPG, 175 KB. Not yet opened and inspected.",
  "gregory-of-nyssa.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-of-nyssa and AUTHOR_ICONS. 507x800 JPG, 81 KB. Not yet opened and inspected.",
  "gregory-palamas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-palamas. 711x960 JPG, 233 KB. Not yet opened and inspected.",
  "gregory-theologian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for gregory-theologian and AUTHOR_ICONS. 857x1200 JPG, 152 KB. Not yet opened and inspected.",
  "hermione-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for hermione-of-ephesus. 613x800 JPG, 67 KB. Not yet opened and inspected.",
  "hosius-of-cordova.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for hosius-of-cordova. 432x659 JPG, 103 KB. Not yet opened and inspected.",
  "iakovos-of-evia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for iakovos-of-evia. 853x1200 JPG, 109 KB. Not yet opened and inspected.",
  "ignatius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for ignatius-of-antioch and AUTHOR_ICONS. 711x1000 JPG, 108 KB. Not yet opened and inspected.",
  "irenaeus-of-lyons.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for irenaeus-of-lyons and AUTHOR_ICONS. 404x800 JPG, 66 KB. Not yet opened and inspected.",
  "irene-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for irene-the-empress. 857x1200 JPG, 198 KB. Not yet opened and inspected.",
  "isaac-the-syrian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for isaac-the-syrian. 714x1024 JPG, 94 KB. Not yet opened and inspected.",
  "isidora-of-tabenna.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for isidora-of-tabenna. 522x800 JPG, 68 KB. Not yet opened and inspected.",
  "john-cassian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-cassian. 900x1206 JPG, 247 KB. Not yet opened and inspected.",
  "john-chrysostom.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-chrysostom and AUTHOR_ICONS. 266x800 JPG, 58 KB. Not yet opened and inspected.",
  "john-of-damascus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-of-damascus and AUTHOR_ICONS. 390x450 JPG, 63 KB. Not yet opened and inspected.",
  "john-the-wonderworker.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for john-of-shanghai. 612x960 JPG, 156 KB. Not yet opened and inspected.",
  "justin-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justin-martyr. 432x659 JPG, 123 KB. Not yet opened and inspected.",
  "justin-popovic.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justin-popovic. 602x800 JPG, 46 KB. Not yet opened and inspected.",
  "justinian-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for justinian-the-great. 195x259 JPG, 23 KB. Not yet opened and inspected.",
  "juvenal-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for juvenal-of-jerusalem. 281x400 JPG, 51 KB. Not yet opened and inspected.",
  "kosmos-aitolia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for cosmas-of-aetolia. 720x1018 JPG, 237 KB. Not yet opened and inspected.",
  "lazar-of-serbia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for lazar-of-serbia. 794x1141 JPG, 385 KB. Not yet opened and inspected.",
  "leo-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for leo-the-great. 540x692 JPG, 159 KB. Not yet opened and inspected.",
  "marcian-the-emperor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marcian-the-emperor. 362x648 JPG, 96 KB. Not yet opened and inspected.",
  "marina-the-great-martyr.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for marina-the-great-martyr. 581x800 JPG, 109 KB. Not yet opened and inspected.",
  "mark-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mark-of-ephesus. 1418x1768 JPG, 267 KB. Not yet opened and inspected.",
  "martin-the-confessor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for martin-the-confessor. 329x400 JPG, 56 KB. Not yet opened and inspected.",
  "mary-magdalene.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mary-magdalene and AUTHOR_ICONS. 640x866 JPG, 199 KB. Not yet opened and inspected.",
  "mary-of-egypt.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for mary-of-egypt and AUTHOR_ICONS. 350x410 JPG, 28 KB. Not yet opened and inspected.",
  "maximus-the-confessor.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for maximus-the-confessor and AUTHOR_ICONS. 545x800 JPG, 63 KB. Not yet opened and inspected.",
  "meletius-of-antioch.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for meletius-of-antioch. 354x500 JPG, 181 KB. Not yet opened and inspected.",
  "memnon-of-ephesus.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for memnon-of-ephesus. 600x408 JPG, 53 KB. Not yet opened and inspected.",
  "moses-the-black.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for moses-the-ethiopian. 540x742 JPG, 170 KB. Not yet opened and inspected.",
  "nectarius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nectarius-of-constantinople. 250x364 JPG, 47 KB. Not yet opened and inspected.",
  "nektarios-of-aegina.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nektarios-of-aegina. 959x1200 JPG, 224 KB. Not yet opened and inspected.",
  "nicholas-of-cabasilas.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nicholas-cabasilas. 900x1200 JPG, 217 KB. Not yet opened and inspected.",
  "nicholas-the-wonderworker.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nicholas-the-wonderworker and AUTHOR_ICONS. 736x1024 JPG, 241 KB. Not yet opened and inspected.",
  "niketas-the-goth.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for niketas-the-goth. 1408x1877 JPG, 314 KB. Not yet opened and inspected.",
  "nikodemos-the-hagiorite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nikodemos-the-hagiorite. 640x800 JPG, 92 KB. Not yet opened and inspected.",
  "nikon-metanoeite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nikon-metanoeite. 1440x1920 JPG, 319 KB. Not yet opened and inspected.",
  "nino-nina-of-georiga.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for nino-of-georgia. 980x1280 JPG, 354 KB. Not yet opened and inspected.",
  "olympias-the-deaconess.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for olympias-the-deaconess. 600x800 JPG, 54 KB. Not yet opened and inspected.",
  "paisios-the-athonite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for paisios-the-athonite and AUTHOR_ICONS. 734x1024 JPG, 224 KB. Not yet opened and inspected.",
  "paisius-velichkovsky.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for paisius-velichkovsky. 1080x1540 JPG, 131 KB. Not yet opened and inspected.",
  "papias-of-hierapolis.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for papias-of-hierapolis and AUTHOR_ICONS. 750x1128 JPG, 158 KB. Not yet opened and inspected.",
  "philoumenos-of-jacobs-well.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for philoumenos-of-jacobs-well. 640x548 JPG, 95 KB. Not yet opened and inspected.",
  "photius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for photius-the-great. 794x1071 JPG, 262 KB. Not yet opened and inspected.",
  "polycarp-of-smyrna.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for polycarp-of-smyrna and AUTHOR_ICONS. 433x659 JPG, 386 KB. Not yet opened and inspected.",
  "praying.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by the prayer slideshow. 750x410 JPG, 128 KB. Not yet opened and inspected.",
  "praying2.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by the prayer slideshow. 1200x958 JPG, 120 KB. Not yet opened and inspected.",
  "prochorus-the-deacon.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for prochorus-the-deacon and AUTHOR_ICONS. 434x650 JPG, 350 KB. Not yet opened and inspected.",
  "pulcheria-the-empress.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for pulcheria-the-empress. 960x1200 JPG, 130 KB. Not yet opened and inspected.",
  "quadratus-the-apologist.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for quadratus-the-apologist. 1670x2000 JPG, 333 KB. Not yet opened and inspected.",
  "sava-of-serbia.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sava-of-serbia. 864x1128 JPG, 335 KB. Not yet opened and inspected.",
  "seraphim-of-sarov.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for seraphim-of-sarov and AUTHOR_ICONS. 563x664 JPG, 41 KB. Not yet opened and inspected.",
  "sergius-of-radonezh.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sergius-of-radonezh. 864x1051 JPG, 295 KB. Not yet opened and inspected.",
  "silouan-the-athonite.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for silouan-the-athonite. 576x720 JPG, 70 KB. Not yet opened and inspected.",
  "simeon-streaming-myrrh.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for simeon-the-myrrh-streaming. 900x1200 JPG, 144 KB. Not yet opened and inspected.",
  "sofian-antim.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sofian-of-antim. 576x720 JPG, 249 KB. Not yet opened and inspected.",
  "sophronius-of-jerusalem.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sophronius-of-jerusalem. 500x729 JPG, 163 KB. Not yet opened and inspected.",
  "sophrony-of-essex.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for sophrony-of-essex. 900x1260 JPG, 322 KB. Not yet opened and inspected.",
  "spyridon-of-trimythous.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for spyridon-of-trimythous. 878x1280 JPG, 373 KB. Not yet opened and inspected.",
  "st-porphyrios-of-kavsokalyvia-324.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for porphyrios-of-kavsokalyvia. 555x800 JPG, 134 KB. Not yet opened and inspected.",
  "symeon-the-new-theologian.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for symeon-the-new-theologian and AUTHOR_ICONS. 487x800 JPG, 86 KB. Not yet opened and inspected.",
  "tarasius-of-constantinople.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for tarasius-of-constantinople. 480x640 JPG, 247 KB. Not yet opened and inspected.",
  "theodosius-the-great.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theodosius-the-great. 512x640 JPG, 103 KB. Not yet opened and inspected.",
  "theophan-the-recluse.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theophan-the-recluse. 472x659 JPG, 106 KB. Not yet opened and inspected.",
  "theophylact-of-ohrid.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theophylact-of-ohrid and AUTHOR_ICONS. 1638x2048 JPG, 241 KB. Not yet opened and inspected.",
  "theotokos.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for theotokos. 456x681 JPG, 89 KB. Not yet opened and inspected.",
  "xenia-of-petersburg.jpg":
    "No source, licence or attribution recorded. Fetched before scripts/fetch-missing-icons.mjs had a licence gate. Referenced by SAINTS.iconUrl for xenia-of-petersburg. 925x1280 JPG, 265 KB. Not yet opened and inspected.",};

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

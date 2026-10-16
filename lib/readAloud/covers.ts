import { streamedUrl } from "@/lib/media/streamed";

/**
 * The read-aloud covers (1.7): an icon of each book's saint or prophet on
 * Now Playing, the mini player and the lock screen, for all 78 books. The
 * owner's note 9 of 2026-10-16 ("John shows the Apostle John ... clear,
 * high-quality icons tied to the book") and his answer the same day: the Old
 * Testament too, Moses, David and the prophets.
 *
 * WHO IS SHOWN, in this order:
 *   A. A book named for a holy person shows that person: Ruth, Job, Tobit,
 *      the Samuel books, the Maccabees, each prophet, each Gospel.
 *   B. Otherwise the person its "by" line names in Before you read
 *      (data/bible/intros/facts.json), or the one it says tradition names:
 *      Moses for the Law, David for the Psalms, Solomon for Proverbs,
 *      Jeremiah for Kings and Lamentations, Ezra for Chronicles, Luke for
 *      Acts, Paul for his letters and Hebrews.
 *   C. Where neither gives a holy person, or no public-domain icon of them
 *      passed (below), the book has the manuscript plate, the Codex
 *      Sinaiticus page the Bible section already carries.
 * lib/readAloud/__tests__/covers.test.ts holds the map to these rules. The
 * attributions are the Church's tradition as Before you read gives it, and
 * every one is marked for the future clergy review: no priest reviews Purify
 * yet (the owner, 2026-10-16), so nothing waits on one.
 *
 * THE PICTURES. Public domain only, each read on its own Commons page, and
 * each opened and looked at before it was cut: the right saint, read from
 * the icon's inscription where it has one, sharp, the whole head and halo,
 * nothing outside the painted panel. docs/licensing/READ_COVERS.md records
 * the source of each, and scripts/fetch-read-covers.mjs how it was cut.
 * Most are from one set, the iconostasis of the Dormition cathedral of the
 * Kirillo-Belozersky monastery (about 1497), so the covers read
 * as one family.
 *
 * WHERE THEY ARE. On the website, never in the apps (the bundle is at its
 * ceiling): /covers/ is set aside by the native build and asked of the
 * website in the apps (lib/media/streamed.ts). With no signal the player
 * shows the plate, which the apps carry (components/player/CoverArt.tsx).
 * A file's name carries its version (moses.v1.jpg): a new picture is a new
 * name, never a stale copy.
 *
 * One registry, so the reading room and the saints' pages can use the same
 * icons later (the owner's pattern 6: one cover system).
 */

export type FigureId =
  | "moses"
  | "joshua"
  | "samuel"
  | "ruth"
  | "jeremiah"
  | "ezra"
  | "nehemiah"
  | "tobit"
  | "judith"
  | "esther"
  | "maccabees"
  | "job"
  | "david"
  | "solomon"
  | "sirach"
  | "hosea"
  | "amos"
  | "micah"
  | "joel"
  | "obadiah"
  | "jonah"
  | "nahum"
  | "habakkuk"
  | "zephaniah"
  | "haggai"
  | "zechariah"
  | "malachi"
  | "isaiah"
  | "ezekiel"
  | "daniel"
  | "baruch"
  | "matthew"
  | "mark"
  | "luke"
  | "john"
  | "johnPatmos"
  | "paul"
  | "james"
  | "peter"
  | "jude";

export type Figure = {
  /** The figure's name under the title: "St John the Theologian". */
  nameKey: string;
  /** The cover on the website: /covers/<id>.v<n>.jpg, 1024px square. */
  file: string;
  /** What the picture shows, written while looking at the crop. */
  alt: string;
  /** The icon it is cut from. */
  work: string;
  artist: string;
  workDate: string;
  /** The Commons file. */
  source: string;
  /** As the file's Commons page states it. */
  license: string;
  /** The Commons page the licence was read on. */
  evidenceUrl: string;
  /** The day the picture was opened and looked at. */
  inspectedOn: string;
  /** Who the figure is for the book is the Church's tradition: for the clergy review. */
  review: "clergy";
};

/** The iconostasis of the Dormition Cathedral, Kirillo-Belozersky Monastery. */
const KIRILLO = {
  artist: "Anonymous Russian icon painters",
  workDate: "1497",
  license: "Public domain",
  inspectedOn: "2026-10-16",
  review: "clergy",
} as const;

const PROPHETS_ROW = "Prophets row of the Kirillo-Belozersky iconostasis";

function commons(title: string): string {
  return `https://commons.wikimedia.org/wiki/${encodeURI(title.replace(/ /g, "_"))}`;
}

const K01 = "File:Kirillo-Belozersky iconostasis 01. Habakkuk, Jeremiah, Jonah.jpg";
const K02 = "File:Kirillo-Belozersky iconostasis 02. Nathan, Haggai, Samuel.jpg";
const K03 = "File:Kirillo-Belozersky iconostasis 03. Micah, Elijah, Gideon.jpg";
const K04 = "File:Kirillo-Belozersky iconostasis 04. Daniel, David, Solomon.jpg";
const K05 = "File:Kirillo-Belozersky iconostasis 05. Ezekiel, Isaiah, Jacob.jpg";
const K06 = "File:Kirillo-Belozersky iconostasis 06. Hosea, Amos, Zephaniah.jpg";
const K07 = "File:Kirillo-Belozersky iconostasis 07. Elisha, Zechariah, Joel.jpg";
const K08 = "File:Kirillo-Belozersky iconostasis 08. Malachi, Naum.jpg";

/** A figure from one board of the prophets row: three to a board, named by
 *  the inscription or, where it has worn away, by the scroll. */
function prophet(id: FigureId, source: string, panel: string, alt: string): Figure {
  return {
    ...KIRILLO,
    nameKey: `readAloud.cover.${id}`,
    file: `/covers/${id}.v1.jpg`,
    alt,
    work: `${PROPHETS_ROW}, ${panel}`,
    source,
    evidenceUrl: commons(source),
  };
}

/** Every figure with a picture that passed. Opened and looked at on the day
 *  in `inspectedOn`; scripts/fetch-read-covers.mjs holds each square. */
export const FIGURES: Partial<Record<FigureId, Figure>> = {
  moses: {
    nameKey: "readAloud.cover.moses",
    file: "/covers/moses.v1.jpg",
    alt: "The face of the Prophet Moses, dark hair and a short beard, inside a thin red halo on a burnished orange ground.",
    work: "Moses, detail of an icon at St Catherine's Monastery, Sinai",
    artist: "Unknown",
    workDate: "Third quarter of the 13th century",
    source: "File:Moses Icon Sinai 13th century detail.jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Moses Icon Sinai 13th century detail.jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  joshua: {
    nameKey: "readAloud.cover.joshua",
    file: "/covers/joshua.v1.jpg",
    alt: "Joshua in a silver helmet and scale armour, his arm stretched out, his name in Greek above him and an ochre halo behind.",
    work: "Joshua, fresco, Hosios Loukas Monastery, Boeotia",
    artist: "Unknown",
    workDate: "10th century, as its page gives it",
    source: "File:Byzantine fresca from St-Lucas.jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Byzantine fresca from St-Lucas.jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  samuel: prophet("samuel", K02, "the Prophet Samuel", "The Prophet Samuel in a red cap, with a long brown beard and a green cloak, holding the horn of anointing oil, his name in red beside him."),
  jeremiah: prophet("jeremiah", K01, "the Prophet Jeremiah", "The Prophet Jeremiah, his fair hair in a long braid and his beard forked, in dark green, beside his unrolled scroll."),
  job: {
    nameKey: "readAloud.cover.job",
    file: "/covers/job.v1.jpg",
    alt: "Righteous Job crowned as a king, with a curled grey beard and a pearl collar, in a gold halo, his name written above him.",
    work: "The Righteous Job, icon, northern Russia",
    artist: "Russian (Mstera), as its page names it",
    workDate: "Late 17th century by its description; circa 1800 by its date field",
    source: "File:Icon of Job (North Russia, 17 c.).jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Icon of Job (North Russia, 17 c.).jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  david: prophet("david", K04, "the Prophet and King David", "King David, bearded, in a tall jewelled crown and a dark blue mantle over red and gold robes, beside his scroll."),
  solomon: prophet("solomon", K04, "King Solomon", "King Solomon, young and beardless, in a jewelled crown and a red cloak, his hand raised in blessing."),
  hosea: prophet("hosea", K06, "the Prophet Hosea", "The Prophet Hosea, with long dark hair and beard, in a red cloak over green, blessing, beside his scroll."),
  amos: prophet("amos", K06, "the Prophet Amos", "The Prophet Amos, balding, with a long grey-brown beard and a dark green cloak, beside his scroll, his name in red."),
  micah: prophet("micah", K03, "the Prophet Micah", "The Prophet Micah, with wavy fair hair and beard, an ochre cloak flying behind him, beside his scroll."),
  joel: prophet("joel", K07, "the Prophet Joel", "The Prophet Joel, with long brown hair and beard, in green and brown, holding his scroll open in one hand."),
  jonah: prophet("jonah", K01, "the Prophet Jonah", "The Prophet Jonah, balding, with curly hair and a short beard, in blue and ochre, beside his scroll."),
  nahum: prophet("nahum", K08, "the Prophet Nahum", "The Prophet Nahum, grey-haired with a short beard, in a red-brown cloak, holding his scroll open."),
  habakkuk: prophet("habakkuk", K01, "the Prophet Habakkuk", "The Prophet Habakkuk, young and beardless, pointing upward, in blue and red, beside his scroll."),
  zephaniah: prophet("zephaniah", K06, "the Prophet Zephaniah", "The Prophet Zephaniah, with curly brown hair and beard, in green and ochre, beside his scroll, his name in red."),
  haggai: prophet("haggai", K02, "the Prophet Haggai", "The Prophet Haggai, with long brown hair and beard, in green and dark red, on the icon's worn white ground."),
  malachi: prophet("malachi", K08, "the Prophet Malachi", "The Prophet Malachi, with long dark hair and beard, in red over green, beside his scroll, his name in red."),
  isaiah: prophet("isaiah", K05, "the Prophet Isaiah", "The Prophet Isaiah, with long dark hair and beard, in blue and red, one hand raised, beside his scroll."),
  ezekiel: prophet("ezekiel", K05, "the Prophet Ezekiel", "The Prophet Ezekiel, with long fair hair and beard, in dark blue and green, beside his scroll."),
  daniel: prophet("daniel", K04, "the Prophet Daniel", "The Prophet Daniel, young, with curly hair and a small dark cap, in a red cloak over a jewelled tunic, beside his scroll."),
  matthew: {
    nameKey: "readAloud.cover.matthew",
    file: "/covers/matthew.v1.jpg",
    alt: "St Matthew, dark-haired with a long grey-streaked beard, looking down, the faint ring of a halo behind him.",
    work: "The Apostle Matthew, icon",
    artist: "Unknown",
    workDate: "Not given on its page",
    source: "File:The Apostle Matthew.jpg",
    license: "CC0",
    evidenceUrl: commons("File:The Apostle Matthew.jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  mark: {
    nameKey: "readAloud.cover.mark",
    file: "/covers/mark.v1.jpg",
    alt: "St Mark, curly-haired and bearded, looking up, in a red tunic and a dark blue mantle, inside a gilded halo.",
    work: "St Mark the Evangelist",
    artist: "Emmanuel Tzanes",
    workDate: "1657",
    source: "File:Tzanes Emmanuel - St Mark the Evangelist - Google Art Project.jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Tzanes Emmanuel - St Mark the Evangelist - Google Art Project.jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  luke: {
    nameKey: "readAloud.cover.luke",
    file: "/covers/luke.v1.jpg",
    alt: "St Luke with curly hair and a short beard inside a blue halo, his hands raised, in a green robe, his name above him.",
    work: "St Luke, miniature in the Ostromir Gospels",
    artist: "Unknown",
    workDate: "1050s",
    source: "File:Ostromir luke.jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Ostromir luke.jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  john: {
    ...KIRILLO,
    nameKey: "readAloud.cover.john",
    file: "/covers/john.v1.jpg",
    alt: "St John the Theologian, bald with a long white beard, bowing, in green and red, holding the jewelled Gospel, his name above.",
    work: "Deesis row of the Kirillo-Belozersky iconostasis, St John the Theologian",
    source: "File:Kirillo-Belozersky iconostasis 07 - John Evangelist.jpg",
    evidenceUrl: commons("File:Kirillo-Belozersky iconostasis 07 - John Evangelist.jpg"),
  },
  johnPatmos: {
    nameKey: "readAloud.cover.johnPatmos",
    file: "/covers/johnPatmos.v1.jpg",
    alt: "St John the Theologian in the cave on Patmos, white-bearded in a red cloak, looking up, the scroll of the Revelation beside him.",
    work: "St John the Evangelist and Prochorus on Patmos",
    artist: "Emmanuel Lambardos",
    workDate: "1602",
    source: "File:John the Evangelist and Prochorus by E.Lambardos (1602).jpg",
    license: "Public domain",
    evidenceUrl: commons("File:John the Evangelist and Prochorus by E.Lambardos (1602).jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  paul: {
    ...KIRILLO,
    nameKey: "readAloud.cover.paul",
    file: "/covers/paul.v1.jpg",
    alt: "St Paul, with a high bald forehead and a long dark beard, bowing, in a grey-brown cloak, holding a jewelled book.",
    work: "Deesis row of the Kirillo-Belozersky iconostasis, St Paul",
    source: "File:Kirillo-Belozersky iconostasis 14 - Paul.jpg",
    evidenceUrl: commons("File:Kirillo-Belozersky iconostasis 14 - Paul.jpg"),
  },
  james: {
    nameKey: "readAloud.cover.james",
    file: "/covers/james.v1.jpg",
    alt: "St James, brother of the Lord, with long dark hair and beard, his head bowed, in a white bishop's omophorion with red flowers.",
    work: "St James the Brother of the Lord",
    artist: "Stephanos Tzangarolas",
    workDate: "1688",
    source: "File:Tzangarolas Stephanos - St James the Brother of the Lord - Google Art Project.jpg",
    license: "Public domain",
    evidenceUrl: commons("File:Tzangarolas Stephanos - St James the Brother of the Lord - Google Art Project.jpg"),
    inspectedOn: "2026-10-16",
    review: "clergy",
  },
  peter: {
    ...KIRILLO,
    nameKey: "readAloud.cover.peter",
    file: "/covers/peter.v1.jpg",
    alt: "St Peter, with short curly grey hair and beard, bowing, in dark blue and ochre, holding a small scroll with his confession.",
    work: "Deesis row of the Kirillo-Belozersky iconostasis, St Peter",
    source: "File:Kirillo-Belozersky iconostasis 08 - Peter.jpg",
    evidenceUrl: commons("File:Kirillo-Belozersky iconostasis 08 - Peter.jpg"),
  },
};

/** The manuscript plate: the Bible section's own picture, inside the apps. */
export const COVER_PLATE = "/sections/bible.jpg";
/** Every cover's size, for the lock screen. */
export const COVER_SIZE = "1024x1024";

/**
 * Each book's cover: a figure, or the plate. Every book of
 * data/bible/books.json. Where the rule's first figure has no picture that
 * passed, the book takes the next by the rule (Ruth, Samuel), or the plate.
 * No public-domain icon passed for Ezra, Nehemiah, Tobit, Judith, Esther,
 * the Maccabees, Jesus son of Sirach, Obadiah, Baruch or Jude, nor for the
 * prophet Zechariah (the Zechariah of the Kirillo boards is the priest, the
 * Forerunner's father); docs/licensing/READ_COVERS.md says why for each.
 */
export const BOOK_COVERS: Record<string, FigureId | "plate"> = {
  genesis: "moses",
  exodus: "moses",
  leviticus: "moses",
  numbers: "moses",
  deuteronomy: "moses",
  joshua: "joshua",
  judges: "samuel",
  // Ruth herself has no public-domain icon large enough; her by-line names Samuel.
  ruth: "samuel",
  "1-samuel": "samuel",
  "2-samuel": "samuel",
  "1-kings": "jeremiah",
  "2-kings": "jeremiah",
  "1-chronicles": "plate",
  "2-chronicles": "plate",
  "1-esdras": "plate",
  ezra: "plate",
  nehemiah: "plate",
  tobit: "plate",
  judith: "plate",
  esther: "plate",
  "1-maccabees": "plate",
  "2-maccabees": "plate",
  "3-maccabees": "plate",
  job: "job",
  psalms: "david",
  proverbs: "solomon",
  ecclesiastes: "solomon",
  "song-of-solomon": "solomon",
  wisdom: "solomon",
  sirach: "plate",
  hosea: "hosea",
  amos: "amos",
  micah: "micah",
  joel: "joel",
  obadiah: "plate",
  jonah: "jonah",
  nahum: "nahum",
  habakkuk: "habakkuk",
  zephaniah: "zephaniah",
  haggai: "haggai",
  zechariah: "plate",
  malachi: "malachi",
  isaiah: "isaiah",
  jeremiah: "jeremiah",
  baruch: "plate",
  lamentations: "jeremiah",
  "epistle-of-jeremiah": "jeremiah",
  ezekiel: "ezekiel",
  daniel: "daniel",
  "prayer-of-manasseh": "plate",
  "2-esdras": "plate",
  matthew: "matthew",
  mark: "mark",
  luke: "luke",
  john: "john",
  acts: "luke",
  romans: "paul",
  "1-corinthians": "paul",
  "2-corinthians": "paul",
  galatians: "paul",
  ephesians: "paul",
  philippians: "paul",
  colossians: "paul",
  "1-thessalonians": "paul",
  "2-thessalonians": "paul",
  "1-timothy": "paul",
  "2-timothy": "paul",
  titus: "paul",
  philemon: "paul",
  hebrews: "paul",
  james: "james",
  "1-peter": "peter",
  "2-peter": "peter",
  "1-john": "john",
  "2-john": "john",
  "3-john": "john",
  jude: "plate",
  revelation: "johnPatmos",
};

export type ReadAloudCover = {
  /** The picture to show: the website's cover, or the plate. */
  src: string;
  /** What to show when `src` cannot load: the plate, which the apps carry. */
  fallback: string;
  /** The figure's name, or null for the plate. */
  nameKey: string | null;
  /** The picture's size for the lock screen, when it is a cover. */
  size: string | null;
};

export function readAloudCover(book: string): ReadAloudCover {
  const id = BOOK_COVERS[book];
  const figure = id && id !== "plate" ? FIGURES[id] : undefined;
  if (!figure) return { src: COVER_PLATE, fallback: COVER_PLATE, nameKey: null, size: null };
  return { src: streamedUrl(figure.file), fallback: COVER_PLATE, nameKey: figure.nameKey, size: COVER_SIZE };
}

// Orthodox History, the interactive timeline's index.
//
// This registry is the single source of truth for the event *metadata* the
// timeline, search, sitemap, On This Day, and validation all consume. The
// long-form narrative for each event lives in data/history/<slug>.json and
// is loaded server-side by lib/history/load.ts (same registry/body split as
// theology: topics.ts + load.ts).
//
// Pure data + pure helpers, no fs, no "use client", and no imports beyond
// types, so scripts/emit-registries.mjs can load it with
// --experimental-strip-types exactly like lib/saints/saints.ts.
//
// Historical integrity rules (enforced by lib/history/__tests__):
// - every published event's body must cite at least one real source;
// - dates are never invented: `precision` + `certainty` say exactly how firm
//   a date or account is, and the UI shows it;
// - `calendar` (the On This Day key) is allowed only when precision is
//   "exact", an approximate year never becomes a fake calendar date;
// - relationship slugs must resolve against the saints/councils/theology/
//   heresies registries and other events.

/** Era ids, chronological. Boundaries are documented on HISTORY_ERAS. */
export type Era =
  | "apostolic"
  | "persecution"
  | "imperial-conciliar"
  | "christological"
  | "iconoclasm"
  | "byzantine-expansion"
  | "estrangement"
  | "late-byzantine"
  | "ottoman"
  | "global-missions"
  | "modern";

export type EventCategory =
  | "apostolic"
  | "saints"
  | "martyrs"
  | "councils"
  | "doctrine"
  | "heresies"
  | "schisms"
  | "missions"
  | "monasticism"
  | "liturgics"
  | "scripture"
  | "writings"
  | "persecutions"
  | "iconography"
  | "patriarchates"
  | "autocephaly"
  | "modern";

/** How firm the historical claim behind the event is. Displayed on cards
 *  and event pages whenever it materially affects interpretation. */
export type Certainty =
  | "historically-attested"
  | "strongly-supported"
  | "approximate-date"
  | "traditional-account"
  | "disputed"
  | "local-tradition"
  | "jurisdiction-specific"
  | "conciliar-definition"
  | "dogmatic-teaching"
  | "editorial-synthesis";

/** How precise the *date* is (independent of how certain the event is). */
export type DatePrecision =
  | "exact"
  | "year"
  | "approximate"
  | "traditional"
  | "disputed";

export type HistoryEventMeta = {
  /** Stable id; never changes even if the slug is polished. */
  id: string;
  /** Canonical slug → /history/<slug>. */
  slug: string;
  title: string;
  /** Compact title for markers, chips, and rails. */
  shortTitle?: string;
  /** Alternate titles / spellings, used by search. */
  aliases?: string[];
  /** First year of the event (AD). Approximate years still pick one anchor
   *  year for placement; `precision` says how to read it. */
  yearStart: number;
  /** Last year for multi-year developments; omit for point events. */
  yearEnd?: number;
  /** Human date line, e.g. "May 29, 1453" or "c. 49–50". */
  displayDate: string;
  precision: DatePrecision;
  /** On This Day key. Only allowed when precision is "exact". `basis`
   *  distinguishes a firm civil date from a Church commemoration date; the
   *  UI says "commemorated on" unless the basis is a plain historical date. */
  calendar?: { month: number; day: number; basis: "julian" | "gregorian" | "conventional" };
  era: Era;
  categories: EventCategory[];
  /** Broad region label, e.g. "Asia Minor", "Constantinople". */
  region?: string;
  /** 1 = era-defining, 2 = major, 3 = notable. Drives marker weight. */
  importance: 1 | 2 | 3;
  /** One line for markers and previews. */
  preview: string;
  /** Short paragraph for the expanded card / context rail. */
  summary: string;
  certainty: Certainty;
  /** Drafts exist in the registry but are never routed, packaged, listed,
   *  or searched. */
  status: "published" | "draft";
  /** Editorial accountability, mirrors theology's curatedBy. */
  reviewedBy?: string;
  rel?: {
    saints?: string[];
    councils?: string[];
    theology?: string[];
    heresies?: string[];
    /** Human-readable scripture refs, e.g. "Acts 2:1-41". */
    scripture?: string[];
    /** Event slugs that led into this one. Must be earlier or same year. */
    precededBy?: string[];
    /** Event slugs that flowed out of this one. Must be same year or later. */
    resultedIn?: string[];
  };
  /** "full" marks an event written to the 1.7 standard: the four parts,
   *  its people, two primary sources or more, a picture, and the marker for
   *  a future clergy review (lib/history/__tests__/events.integrity.test.ts
   *  holds each one to it). Absent: the shorter account of before. */
  depth?: "full";
  /** The event's picture, one for every reader (1.7: the owner wants photos
   *  for History, and a picture is part of an event's structure the way an
   *  icon is part of a saint's page). It lives on the website, under
   *  /history/media/, and the apps ask the website for it
   *  (lib/history/media.ts); the apps carry none of these files.
   *
   *  Every field is required by the integrity suite; the licence must be
   *  public domain, CC0, or a commercial-compatible CC, and evidenceUrl
   *  records where that was verified. The facts stay free with or without
   *  a picture. */
  media?: {
    /** The file on the website, under /history/media/. */
    hero: string;
    /** "wide": a 16:9 plate the picture fills. "whole": an icon, a
     *  miniature or a tall painting, shown whole at its own proportions and
     *  never cut through a face. */
    shape: "wide" | "whole";
    /** The file's own pixels, so the plate holds its place before it loads. */
    width: number;
    height: number;
    /** CSS object-position for a wide plate, when the subject is off centre. */
    focus?: string;
    alt: string;
    /** The work depicted. */
    work: string;
    artist: string;
    /** When the artwork was made, e.g. "1840" or "15th century". */
    workDate: string;
    source: string;
    license: string;
    evidenceUrl: string;
    /** More pictures of the event, for Immersive History (Purify Plus).
     *  Same rights bar as the hero; validated by the integrity suite. */
    gallery?: {
      /** The file on the website, under /history/media/. */
      src: string;
      width: number;
      height: number;
      alt: string;
      work: string;
      artist: string;
      workDate: string;
      source: string;
      license: string;
      evidenceUrl: string;
    }[];
  };
};

/** Era index. Boundaries are conventional and documented here rather than
 *  invented per event: each era runs [from, to] inclusive and adjacent eras
 *  meet at the boundary year (a boundary event belongs to whichever era its
 *  registry entry declares).
 *
 *  Boundary rationale:
 *  33 Pentecost · 100 repose of the last apostle · 313 Edict of Milan ·
 *  431 Ephesus opens the great christological cycle · 726 Leo III's first
 *  iconoclast measures · 843 Triumph of Orthodoxy · 1054 the mutual
 *  excommunications · 1261 recovery of Constantinople from the Latins ·
 *  1453 fall of Constantinople · 1794 the Kodiak mission opens the modern
 *  missionary expansion · 1917 the Russian Revolution opens the modern era.
 */
export const HISTORY_ERAS: {
  id: Era;
  label: string;
  shortLabel: string;
  from: number;
  to: number;
  blurb: string;
}[] = [
  {
    id: "apostolic",
    label: "Apostolic age",
    shortLabel: "Apostolic",
    from: 33,
    to: 100,
    blurb:
      "From Pentecost to the repose of the last apostle: the Church is founded, the Gospel crosses the empire, and the apostolic writings are set down.",
  },
  {
    id: "persecution",
    label: "Age of persecution",
    shortLabel: "Persecution",
    from: 100,
    to: 313,
    blurb:
      "The Church of the martyrs. Under intermittent and then empire-wide persecution, the faith spreads, the episcopate takes shape, and the blood of the martyrs becomes seed.",
  },
  {
    id: "imperial-conciliar",
    label: "Imperial and conciliar Church",
    shortLabel: "Imperial",
    from: 313,
    to: 431,
    blurb:
      "Legalization, the founding of Constantinople, the rise of the desert, and the first two Ecumenical Councils confessing the Son and the Spirit.",
  },
  {
    id: "christological",
    label: "Christological controversies",
    shortLabel: "Christological",
    from: 431,
    to: 726,
    blurb:
      "Four councils on the one Christ in two natures, and the long, sorrowful estrangements that followed each definition.",
  },
  {
    id: "iconoclasm",
    label: "Iconoclasm and restoration",
    shortLabel: "Iconoclasm",
    from: 726,
    to: 843,
    blurb:
      "The images are smashed, defended, restored, smashed again, and restored for good: the theology of the icon is hammered out under persecution.",
  },
  {
    id: "byzantine-expansion",
    label: "Missionary and Byzantine expansion",
    shortLabel: "Expansion",
    from: 843,
    to: 1054,
    blurb:
      "Orthodoxy's great missionary century and a half: Cyril and Methodius, the Slavonic tongue, and the baptism of Rus.",
  },
  {
    id: "estrangement",
    label: "Estrangement of East and West",
    shortLabel: "Estrangement",
    from: 1054,
    to: 1261,
    blurb:
      "Not one date but a widening separation: the excommunications of 1054, the Crusades, and the catastrophe of 1204.",
  },
  {
    id: "late-byzantine",
    label: "Late Byzantine period",
    shortLabel: "Late Byzantine",
    from: 1261,
    to: 1453,
    blurb:
      "The empire shrinks while theology deepens: hesychasm, St Gregory Palamas, the failed unions, and the last night of the City.",
  },
  {
    id: "ottoman",
    label: "Ottoman and post-Byzantine period",
    shortLabel: "Ottoman",
    from: 1453,
    to: 1794,
    blurb:
      "The Church under the Turkocracy: survival, new martyrs, the rise of Moscow, and the quiet revival that produced the Philokalia.",
  },
  {
    id: "global-missions",
    label: "Global Orthodox missions",
    shortLabel: "Missions",
    from: 1794,
    to: 1917,
    blurb:
      "From Kodiak Island onward, Orthodoxy becomes a global communion, Alaska, Japan, and the parishes of the new world.",
  },
  {
    id: "modern",
    label: "Modern Orthodox history",
    shortLabel: "Modern",
    from: 1917,
    to: 2026,
    blurb:
      "The century of the new martyrs and of Orthodoxy's worldwide presence: persecution under communism, diaspora, and new autocephalies.",
  },
];

export const EVENT_CATEGORIES: {
  id: EventCategory;
  label: string;
  /** Accessible one-line description (filters, tooltips, screen readers). */
  description: string;
}[] = [
  { id: "apostolic", label: "Apostolic", description: "The apostles and the founding generation of the Church." },
  { id: "saints", label: "Saints", description: "Lives and repose of the saints." },
  { id: "martyrs", label: "Martyrs", description: "Witness unto death, ancient and modern." },
  { id: "councils", label: "Councils", description: "Ecumenical and local councils of the Church." },
  { id: "doctrine", label: "Doctrine", description: "Definitions and developments of Orthodox teaching." },
  { id: "heresies", label: "Heresies", description: "Teachings the Church examined and rejected." },
  { id: "schisms", label: "Schisms", description: "Separations and estrangements within Christendom." },
  { id: "missions", label: "Missions", description: "The Gospel carried to new peoples and tongues." },
  { id: "monasticism", label: "Monasticism", description: "The desert, the lavra, and the monastic traditions." },
  { id: "liturgics", label: "Liturgics", description: "The development of Orthodox worship." },
  { id: "scripture", label: "Scripture", description: "The text, canon, and translation of the Bible." },
  { id: "writings", label: "Writings", description: "Landmark works of the Fathers and teachers." },
  { id: "persecutions", label: "Persecutions", description: "Seasons of suffering for the faith." },
  { id: "iconography", label: "Iconography", description: "The holy images: their theology and defense." },
  { id: "patriarchates", label: "Patriarchates", description: "The great sees and their histories." },
  { id: "autocephaly", label: "Autocephaly", description: "Self-governing local Churches and how they emerged." },
  { id: "modern", label: "Modern history", description: "Orthodoxy in the twentieth century and beyond." },
];

export const CERTAINTY_LEVELS: {
  id: Certainty;
  label: string;
  /** Short explanation surfaced in the UI next to the label. */
  gloss: string;
}[] = [
  { id: "historically-attested", label: "Historically attested", gloss: "Documented by contemporary or near-contemporary sources." },
  { id: "strongly-supported", label: "Strongly supported", gloss: "The consensus of historians on good evidence." },
  { id: "approximate-date", label: "Approximate date", gloss: "The event is firm; the exact date is not." },
  { id: "traditional-account", label: "Traditional account", gloss: "Received in the Church's tradition; not independently documented." },
  { id: "disputed", label: "Disputed", gloss: "Historians or traditions materially disagree." },
  { id: "local-tradition", label: "Local tradition", gloss: "Attested within one local Church's tradition." },
  { id: "jurisdiction-specific", label: "Jurisdiction-specific", gloss: "Recognized differently across Orthodox jurisdictions." },
  { id: "conciliar-definition", label: "Conciliar definition", gloss: "Defined by a council received by the Church." },
  { id: "dogmatic-teaching", label: "Dogmatic teaching", gloss: "The Church's dogmatic faith, not merely an event." },
  { id: "editorial-synthesis", label: "Editorial synthesis", gloss: "Purify's summary of a long development; see sources." },
];

export const HISTORY_EVENTS: HistoryEventMeta[] = [
  {
    id: "he-pentecost",
    slug: "pentecost",
    title: "Pentecost: the Descent of the Holy Spirit",
    shortTitle: "Pentecost",
    aliases: ["Birthday of the Church", "Descent of the Holy Spirit"],
    yearStart: 33,
    displayDate: "c. 33",
    precision: "traditional",
    era: "apostolic",
    categories: ["apostolic", "doctrine", "liturgics"],
    region: "Jerusalem",
    importance: 1,
    preview: "The Holy Spirit descends on the disciples at Jerusalem; Peter preaches, and about three thousand are baptized.",
    summary:
      "On the fiftieth day after Pascha the Holy Spirit came upon the disciples gathered in Jerusalem, with a sound as of a rushing mighty wind and tongues as of fire. Peter preached Christ crucified and risen, about three thousand were baptized that day, and the common life of the Church began: the apostles' teaching and fellowship, the breaking of bread and the prayers.",
    certainty: "traditional-account",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-peter", "theotokos", "apostle-john", "apostle-matthias"],
      scripture: ["Acts 1:1-26", "Acts 2:1-47", "Joel 2:28-32", "Leviticus 23:15-16", "John 15:26"],
      resultedIn: ["council-of-jerusalem", "missions-of-apostle-paul"],
    },
    media: {
      hero: "/history/media/pentecost.v1.jpg",
      shape: "whole",
      width: 848,
      height: 1200,
      alt: "Icon of Pentecost: the twelve apostles seated in a semicircle under rays of light from heaven, and below them, in a dark arch, a crowned old man holding a cloth, the figure of the world.",
      work: "Pentecost, icon from the Dormition cathedral of the Kirillo-Belozersky monastery",
      artist: "Anonymous Russian icon painters",
      workDate: "circa 1497",
      source: "File:Pentecost (Kirillo-Belozersk).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Pentecost_(Kirillo-Belozersk).jpg",
    },
  },
  {
    id: "he-council-of-jerusalem",
    slug: "council-of-jerusalem",
    title: "The Council of Jerusalem",
    shortTitle: "Jerusalem, c. 49",
    aliases: ["Apostolic Council"],
    yearStart: 49,
    displayDate: "c. 49–50",
    precision: "approximate",
    era: "apostolic",
    categories: ["apostolic", "councils", "doctrine"],
    region: "Jerusalem",
    importance: 1,
    preview: "The apostles and elders rule at Jerusalem that Gentile believers need not keep the law of Moses.",
    summary:
      "When teachers from Judaea told the Gentile believers at Antioch that they must be circumcised and keep the law of Moses, the apostles and elders met at Jerusalem. Peter, Paul and Barnabas spoke, James gave the judgment, and their letter, beginning \"it seemed good to the Holy Ghost, and to us\", freed the Gentiles from the Law, the pattern the Church's councils have followed since.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-peter", "apostle-paul", "titus-of-crete", "apostle-john"],
      scripture: ["Acts 15:1-35", "Galatians 2:1-10", "Acts 10:44-48", "Acts 16:4-5"],
      precededBy: ["pentecost"],
    },
    media: {
      hero: "/history/media/council-of-jerusalem.v2.jpg",
      shape: "whole",
      width: 900,
      height: 1076,
      alt: "Icon of the Synaxis of the Twelve Apostles: the apostles standing close together on a gold ground, four of them in front with haloes holding scrolls and books, their Greek title written above them.",
      work: "The Synaxis of the Twelve Apostles, the Pushkin Museum, Moscow",
      artist: "Anonymous master of Constantinople",
      workDate: "early 14th century",
      source: "File:Synaxis of the Twelve Apostles by Constantinople master (early 14th c., Pushkin museum).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Synaxis_of_the_Twelve_Apostles_by_Constantinople_master_(early_14th_c.,_Pushkin_museum).jpg",
    },
  },
  {
    id: "he-missions-of-paul",
    slug: "missions-of-apostle-paul",
    title: "The Missionary Journeys of the Apostle Paul",
    shortTitle: "Paul's missions",
    aliases: ["Pauline missions"],
    yearStart: 46,
    yearEnd: 62,
    displayDate: "c. 46–62",
    precision: "approximate",
    era: "apostolic",
    categories: ["apostolic", "missions", "scripture"],
    region: "Asia Minor & Greece",
    importance: 1,
    preview: "From Antioch to Rome, the Gospel crosses the empire in one apostolic generation.",
    summary:
      "In three great journeys and a final voyage to Rome under guard, Paul carries the Gospel through Cyprus, Asia Minor, Macedonia, and Greece, founding the churches to which he would write the epistles the Church still reads at every Liturgy.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-paul"],
      scripture: ["Acts 13:1-28:31", "Romans 15:19"],
      precededBy: ["pentecost"],
      resultedIn: ["neronian-persecution"],
    },
    media: {
      hero: "/history/media/missions-of-apostle-paul.v1.jpg",
      shape: "whole",
      width: 742,
      height: 1200,
      alt: "Icon of the holy apostles Peter and Paul standing side by side, Peter with a scroll and Paul with a book of his letters, Christ blessing from a small circle above them.",
      work: "The Holy Apostles Peter and Paul, Novgorod school, from Belozersk",
      artist: "unknown",
      workDate: "12th to 13th century",
      source: "File:The Holy Apostles Peter and Paul. Novgorod School of Icon Painting, 12th-13th centuries. Belozersk.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:The_Holy_Apostles_Peter_and_Paul._Novgorod_School_of_Icon_Painting,_12th-13th_centuries._Belozersk.jpg",
    },
  },
  {
    id: "he-neronian-persecution",
    slug: "neronian-persecution",
    title: "The Neronian Persecution and the Martyrdom of Peter and Paul",
    shortTitle: "Nero's persecution",
    aliases: ["First Roman persecution", "Martyrdom of Peter and Paul"],
    yearStart: 64,
    yearEnd: 68,
    displayDate: "64–c. 68",
    precision: "approximate",
    era: "apostolic",
    categories: ["persecutions", "martyrs", "apostolic"],
    region: "Rome",
    importance: 1,
    preview: "After the great fire of Rome, Nero turns on the Christians; the chief apostles are martyred.",
    summary:
      "Blamed by Nero for the great fire of 64, the Christians of Rome are tortured and executed in the first imperial persecution. Tradition, already firm by the end of the first century, places the martyrdoms of Peter, crucified, and Paul, beheaded, at Rome in these years.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-peter", "apostle-paul"],
      precededBy: ["missions-of-apostle-paul"],
    },
    media: {
      hero: "/history/media/neronian-persecution.v1.jpg",
      shape: "whole",
      width: 1200,
      height: 584,
      alt: "Three scenes from an icon: St Peter nailed to a cross head downward, Christ crucified between the Theotokos and St John, and St Paul kneeling as a soldier raises his sword, his severed head on the ground.",
      work: "The Apostle Peter with scenes of the lives of Peter and Paul (the top row), Pskov",
      artist: "unknown",
      workDate: "late 17th century",
      source: "File:Икона Апостол Пётр XVII Псков.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%98%D0%BA%D0%BE%D0%BD%D0%B0_%D0%90%D0%BF%D0%BE%D1%81%D1%82%D0%BE%D0%BB_%D0%9F%D1%91%D1%82%D1%80_XVII_%D0%9F%D1%81%D0%BA%D0%BE%D0%B2.jpg",
    },
  },
  {
    id: "he-martyrdom-of-ignatius",
    slug: "martyrdom-of-ignatius",
    title: "The Martyrdom of St Ignatius of Antioch",
    shortTitle: "St Ignatius",
    aliases: ["Ignatius the God-bearer"],
    yearStart: 107,
    displayDate: "c. 107–110",
    precision: "traditional",
    era: "persecution",
    categories: ["martyrs", "writings", "patriarchates"],
    region: "Antioch → Rome",
    importance: 2,
    preview: "Condemned to the beasts, the bishop of Antioch writes seven letters that reveal the early Church's mind.",
    summary:
      "Ignatius, second bishop of Antioch after the apostles, is condemned under Trajan and taken in chains to Rome to die in the arena. On the road he writes seven letters, on the Eucharist, the bishop, the unity of the Church, and his longing 'to be ground by the teeth of beasts into the pure bread of Christ', among the most precious windows into the Church of the first generation after the apostles.",
    certainty: "traditional-account",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["ignatius-of-antioch"],
    },
    media: {
      hero: "/history/media/martyrdom-of-ignatius.v1.jpg",
      shape: "whole",
      width: 1200,
      height: 800,
      alt: "Miniature from the Menologion of Basil II: St Ignatius's relics carried in a casket on the shoulders of two men, a bishop with the Gospel and others with candles following, towards the gate of a walled city.",
      work: "The translation of the relics of St Ignatius, Menologion of Basil II (Vat. gr. 1613)",
      artist: "The Menologion's illuminators",
      workDate: "about 985",
      source: "File:Ignatius of Antioch (Menologion of Basil II).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Ignatius_of_Antioch_(Menologion_of_Basil_II).jpg",
    },
  },
  {
    id: "he-martyrdom-of-polycarp",
    slug: "martyrdom-of-polycarp",
    title: "The Martyrdom of St Polycarp of Smyrna",
    shortTitle: "St Polycarp",
    yearStart: 155,
    displayDate: "c. 155–156",
    precision: "approximate",
    era: "persecution",
    categories: ["martyrs", "writings"],
    region: "Smyrna, Asia Minor",
    importance: 2,
    preview: "'Eighty-six years I have served Him.' The disciple of the apostle John is burned in the Smyrna stadium.",
    summary:
      "Polycarp, bishop of Smyrna and a disciple of the apostle John, is arrested in old age and ordered to curse Christ. His answer, 'eighty-six years have I served Him, and He never did me wrong', and his death at the stake are recorded in the Martyrdom of Polycarp, the earliest detailed account of a martyr's death outside the New Testament.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["polycarp-of-smyrna", "apostle-john"],
    },
    media: {
      hero: "/history/media/martyrdom-of-polycarp.v1.jpg",
      shape: "whole",
      width: 360,
      height: 1180,
      alt: "Mosaic of St Polycarp in white, a gold halo behind him and his martyr's crown in his hands, between palm trees, his name above him in Latin.",
      work: "St Polycarp in the procession of martyrs, Sant'Apollinare Nuovo, Ravenna",
      artist: "The Master of Sant'Apollinare",
      workDate: "about 526",
      source: "File:St Polycarp-ApollinareNuovoRavenna.JPG",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:St_Polycarp-ApollinareNuovoRavenna.JPG",
    },
  },
  {
    id: "he-apologists",
    slug: "apologies-of-justin-martyr",
    title: "St Justin Martyr and the First Apologists",
    shortTitle: "The Apologists",
    yearStart: 155,
    displayDate: "c. 150–165",
    precision: "approximate",
    era: "persecution",
    categories: ["writings", "martyrs", "doctrine"],
    region: "Rome",
    importance: 3,
    preview: "A philosopher in the cloak of the schools defends the faith to the emperor, and describes the Sunday Eucharist.",
    summary:
      "Justin, a converted philosopher teaching at Rome, addresses two Apologies to the emperor defending Christians against the charge of atheism and describing, for the first time in surviving literature, how the Church actually celebrated Baptism and the Sunday Eucharist. He is beheaded with his companions around 165.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["justin-martyr"],
    },
    media: {
      hero: "/history/media/apologies-of-justin-martyr.v1.jpg",
      shape: "whole",
      width: 490,
      height: 616,
      alt: "Fresco of St Justin the Philosopher, dark-haired and bearded, holding a cross and a book, his name and title painted in Greek beside his halo.",
      work: "St Justin the Philosopher, Stavronikita Monastery, Mount Athos",
      artist: "Theophanes the Cretan",
      workDate: "1545 to 1546",
      source: "File:Saint Justin Martyr by Theophanes the Cretan.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Justin_Martyr_by_Theophanes_the_Cretan.jpg",
    },
  },
  {
    id: "he-irenaeus-against-heresies",
    slug: "irenaeus-against-heresies",
    title: "St Irenaeus Writes Against Heresies",
    shortTitle: "Against Heresies",
    yearStart: 180,
    displayDate: "c. 180",
    precision: "approximate",
    era: "persecution",
    categories: ["writings", "heresies", "doctrine", "scripture"],
    region: "Lyons, Gaul",
    importance: 2,
    preview: "Against the Gnostics, the bishop of Lyons appeals to apostolic succession and the rule of faith.",
    summary:
      "Irenaeus of Lyons, who as a boy had heard Polycarp, who had heard John, answers the Gnostic systems with five books Against Heresies: the faith is one, received from the apostles, preserved publicly in the churches they founded, and read in the fourfold Gospel. It is the first great work of Orthodox theology after the apostles.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["irenaeus-of-lyons", "polycarp-of-smyrna"],
    },
    media: {
      hero: "/history/media/irenaeus-against-heresies.v1.jpg",
      shape: "whole",
      width: 921,
      height: 1200,
      alt: "Engraved portrait of St Irenaeus, bearded and haloed, in a dark cloak, inside an oval whose border reads S. Irenaeus Episcopus Lugdunensis.",
      work: "St Irenaeus, bishop of Lyons, engraving, Rijksmuseum RP-P-1907-47",
      artist: "anonymous (Rijksmuseum)",
      workDate: "17th century",
      source: "File:H. Ireneüs van Lyon, RP-P-1907-47.jpg",
      license: "CC0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:H._Irene%C3%BCs_van_Lyon,_RP-P-1907-47.jpg",
    },
  },
  {
    id: "he-anthony-desert",
    slug: "anthony-and-the-desert",
    title: "St Anthony and the Rise of Desert Monasticism",
    shortTitle: "The Desert",
    aliases: ["Desert Fathers", "rise of monasticism"],
    yearStart: 270,
    yearEnd: 356,
    displayDate: "c. 270–356",
    precision: "approximate",
    era: "persecution",
    categories: ["monasticism", "saints"],
    region: "Egypt",
    importance: 1,
    preview: "A young Egyptian hears the Gospel in church, gives everything away, and the desert of Egypt fills with monks.",
    summary:
      "Hearing the Gospel's call to sell all and follow Christ, the young Egyptian Anthony gave away his inheritance around 270 and went step by step into the desert: the tombs, a ruined fort, then the inner mountain near the Red Sea. By his death in 356 the desert was filled with monks, and St Athanasius's Life of Antony carried his pattern across the Christian world.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Matthew 19:21", "Matthew 6:34"],
      saints: ["anthony-the-great", "athanasius-the-great", "augustine-of-hippo"],
    },
    media: {
      hero: "/history/media/anthony-and-the-desert.v1.jpg",
      shape: "whole",
      width: 915,
      height: 1200,
      alt: "Icon of St Anthony the Great: an old monk with a long white beard in a blue hood marked with a cross and a dark mantle, holding a small cross and an open scroll, on a gold ground, with a line of Arabic below.",
      work: "St Anthony the Great, an icon of the Arabic tradition (Lebanon)",
      artist: "Anonymous",
      workDate: "18th century",
      source: "File:Anthony the Great icon (lebanon).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Anthony_the_Great_icon_(lebanon).jpg",
    },
  },
  {
    id: "he-great-persecution",
    slug: "great-persecution",
    title: "The Great Persecution under Diocletian",
    shortTitle: "Great Persecution",
    aliases: ["Diocletianic persecution"],
    yearStart: 303,
    yearEnd: 313,
    displayDate: "303–313",
    precision: "year",
    era: "persecution",
    categories: ["persecutions", "martyrs"],
    region: "Roman Empire",
    importance: 1,
    preview: "From 303 to 313 the empire tries to destroy the Church by edict: churches razed, Scriptures burned, clergy imprisoned.",
    summary:
      "Beginning at Nicomedia in February 303, Diocletian and his colleagues ordered churches destroyed, the Scriptures burned and the clergy imprisoned, and from 304 commanded everyone to sacrifice. Fiercest in the East, the persecution outlasted Diocletian's abdication; the dying Galerius granted toleration in 311, and it ended with the agreement of Constantine and Licinius in 313.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["saint-george", "florian-of-lorch"],
      resultedIn: ["edict-of-milan"],
    },
    media: {
      hero: "/history/media/great-persecution.v1.jpg",
      shape: "wide",
      width: 1200,
      height: 675,
      alt: "Byzantine miniature: a church with a tiled roof stands in a ring of flames, the faces of the martyrs gathered inside looking out from its arches.",
      work: "The twenty thousand martyrs of Nicomedia, the Menologion of Basil II (Vat. gr. 1613)",
      artist: "Byzantine illuminators of the Menologion of Basil II",
      workDate: "circa 985",
      source: "File:20,000 martyrs of Nicomedia (Menologion of Basil II).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:20,000_martyrs_of_Nicomedia_(Menologion_of_Basil_II).jpg",
    },
  },
  {
    id: "he-edict-of-milan",
    slug: "edict-of-milan",
    title: "The Edict of Milan",
    shortTitle: "Edict of Milan",
    aliases: ["Legalization of Christianity"],
    yearStart: 313,
    displayDate: "313",
    precision: "year",
    era: "imperial-conciliar",
    categories: ["persecutions"],
    region: "Roman Empire",
    importance: 1,
    preview: "Constantine and Licinius agree that Christians and all others may worship freely, and order church property restored.",
    summary:
      "After his victory at the Milvian Bridge in October 312, Constantine met his colleague Licinius at Milan, and the two emperors agreed that Christians and all others should be free to follow the religion each thought best. In June 313 Licinius had the decision posted at Nicomedia, ordering churches and their property restored without payment. The great persecution was over.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["constantine-the-great"],
      precededBy: ["great-persecution"],
      resultedIn: ["first-council-of-nicaea"],
    },
    media: {
      hero: "/history/media/edict-of-milan.v1.jpg",
      shape: "whole",
      width: 790,
      height: 1200,
      alt: "Icon of Sts Constantine and Helena, crowned and in richly patterned robes, holding the Cross between them on a gold ground, each named in Arabic above.",
      work: "Sts Constantine and Helena with the Cross, an icon of the Arabic tradition",
      artist: "Saliba ibn Yuhanna (as its Commons page names him)",
      workDate: "14th century (as its Commons page dates it)",
      source: "File:Saint Constantin and Helena, mother of Constantine I icon, Syria (14th Century).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint_Constantin_and_Helena,_mother_of_Constantine_I_icon,_Syria_(14th_Century).jpg",
    },
  },
  {
    id: "he-arian-controversy",
    slug: "arian-controversy-begins",
    title: "Arius and the Outbreak of the Arian Controversy",
    shortTitle: "Arius",
    aliases: ["Arian crisis"],
    yearStart: 318,
    displayDate: "c. 318",
    precision: "approximate",
    era: "imperial-conciliar",
    categories: ["heresies", "doctrine"],
    region: "Alexandria",
    importance: 2,
    preview: "'There was when he was not.' A presbyter's slogan sets the East ablaze.",
    summary:
      "Arius, a presbyter of Alexandria, teaches that the Son of God is the first and highest of creatures, with a beginning. Condemned by his bishop Alexander, he wins allies across the East, and the dispute grows until it demands the first council of the whole Church.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["alexander-of-alexandria", "athanasius-the-great"],
      heresies: ["arianism"],
      councils: ["first-nicaea"],
      resultedIn: ["first-council-of-nicaea"],
    },
    media: {
      hero: "/history/media/arian-controversy-begins.v1.jpg",
      shape: "whole",
      width: 832,
      height: 1200,
      alt: "Icon of St Athanasius of Alexandria, white-bearded, in a bishop's vestments with crosses, blessing with his right hand and holding the Gospel, his name in Greek at the top.",
      work: "St Athanasius of Alexandria, from Sozopol, National Art Gallery, Sofia",
      artist: "unknown",
      workDate: "end of the 17th century",
      source: "File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Saint-Athanasius-of-Alexandria-icon-Sozopol-Bulgaria-17century.jpg",
    },
  },
  {
    id: "he-first-nicaea",
    slug: "first-council-of-nicaea",
    title: "The First Ecumenical Council at Nicaea",
    shortTitle: "Nicaea I",
    aliases: ["First Ecumenical Council", "Council of Nicaea"],
    yearStart: 325,
    displayDate: "Summer 325",
    precision: "year",
    era: "imperial-conciliar",
    categories: ["councils", "doctrine", "heresies"],
    region: "Nicaea, Asia Minor",
    importance: 1,
    preview: "The bishops confess the Son as of one substance with the Father; all but two sign the creed.",
    summary:
      "Summoned by Constantine in the summer of 325 to answer Arius, who taught that the Son of God was a creature with a beginning, the first council of the whole Church confessed the Son as of one substance with the Father. All but two bishops signed its creed. It also issued twenty canons and fixed a common date for Pascha, but made no ruling on the books of Scripture.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Galatians 6:17", "1 Corinthians 8:6"],
      saints: ["alexander-of-alexandria", "constantine-the-great", "athanasius-the-great", "hosius-of-cordova", "eustathius-of-antioch", "spyridon-of-trimythous", "nicholas-the-wonderworker"],
      councils: ["first-nicaea"],
      heresies: ["arianism"],
      precededBy: ["edict-of-milan", "arian-controversy-begins"],
      resultedIn: ["first-council-of-constantinople"],
    },
    media: {
      hero: "/history/media/first-council-of-nicaea.v1.jpg",
      shape: "whole",
      width: 941,
      height: 1200,
      alt: "Icon of the First Ecumenical Council: the emperor Constantine enthroned among the bishops in their patterned vestments, the Gospel on a throne at the centre, and Arius below, bowed under an arch.",
      work: "The First Ecumenical Council",
      artist: "Michael Damaskinos",
      workDate: "1591",
      source: "File:First Council of Nicaea Michael Damaskinos.png",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:First_Council_of_Nicaea_Michael_Damaskinos.png",
    },
  },
  {
    id: "he-foundation-constantinople",
    slug: "foundation-of-constantinople",
    title: "The Dedication of Constantinople",
    shortTitle: "New Rome",
    aliases: ["Founding of Constantinople", "New Rome"],
    yearStart: 330,
    displayDate: "May 11, 330",
    precision: "exact",
    calendar: { month: 5, day: 11, basis: "julian" },
    era: "imperial-conciliar",
    categories: ["patriarchates"],
    region: "Constantinople",
    importance: 1,
    preview: "Constantine dedicates New Rome on the Bosphorus, the city that will carry Orthodox history for eleven centuries.",
    summary:
      "On May 11, 330, Constantine solemnly dedicates his new capital on the site of old Byzantium. 'New Rome' becomes the political and, in time, the ecclesiastical center of the Christian East, its bishop ranked 'after the bishop of Rome' by the council of 381, its liturgy and learning shaping all later Orthodoxy.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["constantine-the-great"],
      precededBy: ["edict-of-milan"],
    },
    media: {
      hero: "/history/media/foundation-of-constantinople.v1.jpg",
      shape: "whole",
      width: 1200,
      height: 748,
      alt: "Mosaic of the Theotokos enthroned with Christ, St Constantine on her left offering a model of the walled city and St Justinian on her right offering a model of Hagia Sophia, their names in Greek beside them.",
      work: "The southwestern entrance mosaic, Hagia Sophia, Constantinople",
      artist: "Byzantine mosaicists; photograph by Myrabella",
      workDate: "about 1000 (photographed 2013)",
      source: "File:Hagia Sophia Southwestern entrance mosaics 2.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Hagia_Sophia_Southwestern_entrance_mosaics_2.jpg",
    },
  },
  {
    id: "he-first-constantinople",
    slug: "first-council-of-constantinople",
    title: "The Second Ecumenical Council at Constantinople",
    shortTitle: "Constantinople I",
    aliases: ["Second Ecumenical Council", "First Council of Constantinople"],
    yearStart: 381,
    displayDate: "May–July 381",
    precision: "year",
    era: "imperial-conciliar",
    categories: ["councils", "doctrine", "heresies", "liturgics"],
    region: "Constantinople",
    importance: 1,
    preview: "One hundred and fifty fathers confirm Nicaea and confess the Holy Spirit as Lord, worshipped with the Father and the Son.",
    summary:
      "Summoned by Theodosius in 381, about one hundred and fifty bishops of the East met at Constantinople to confirm the faith of Nicaea and give the capital a bishop. St Gregory the Theologian presided after St Meletius died, then resigned for the sake of peace. The council's creed, confessing the Holy Spirit as Lord and Giver of life, is the Symbol of Faith of the Orthodox Church.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["John 15:26"],
      saints: ["gregory-theologian", "theodosius-the-great", "meletius-of-antioch", "nectarius-of-constantinople", "gregory-of-nyssa", "cyril-of-jerusalem"],
      councils: ["first-constantinople"],
      heresies: ["arianism", "macedonianism"],
      theology: ["filioque"],
      precededBy: ["first-council-of-nicaea"],
    },
    media: {
      hero: "/history/media/first-council-of-constantinople.v1.jpg",
      shape: "whole",
      width: 947,
      height: 1200,
      alt: "Byzantine miniature of the Second Ecumenical Council: an open Gospel book on a jewelled throne between two towers, the emperor Theodosius seated beside it and the bishops on either side, much of the paint flaked away.",
      work: "The Second Ecumenical Council, the Homilies of St Gregory the Theologian (Paris gr. 510), folio 355",
      artist: "Byzantine illuminator",
      workDate: "circa 880",
      source: "File:CouncilOfConstantinople381BnFMSGr510.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:CouncilOfConstantinople381BnFMSGr510.jpg",
    },
  },
  {
    id: "he-chrysostom",
    slug: "chrysostom-at-constantinople",
    title: "St John Chrysostom, Archbishop of Constantinople",
    shortTitle: "Chrysostom",
    aliases: ["Golden Mouth"],
    yearStart: 398,
    yearEnd: 407,
    displayDate: "398–407",
    precision: "year",
    era: "imperial-conciliar",
    categories: ["saints", "liturgics", "writings"],
    region: "Constantinople",
    importance: 2,
    preview: "The greatest preacher of the Church is made archbishop, reforms the capital, and dies in exile.",
    summary:
      "Taken from Antioch to the capital in 398, John 'the golden-mouthed' preaches against luxury, feeds the poor, and reforms the clergy, and makes enemies of the court. Twice exiled, he dies on the road in 407 with the words 'Glory to God for all things.' The Liturgy most often served in Orthodox churches bears his name.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["john-chrysostom", "olympias-the-deaconess"],
    },
    media: {
      hero: "/history/media/chrysostom-at-constantinople.v1.jpg",
      shape: "whole",
      width: 1200,
      height: 1080,
      alt: "Byzantine mosaic of St John Chrysostom vested as archbishop, from Hagia Sophia",
      work: "Mosaic of St John Chrysostom, Hagia Sophia",
      artist: "Unknown Byzantine mosaicist",
      workDate: "late 9th century",
      source: "Wikimedia Commons",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Byzantinischer_Mosaizist_des_9._Jahrhunderts_003.jpg",
    },
  },
  {
    id: "he-ephesus",
    slug: "council-of-ephesus",
    title: "The Third Ecumenical Council at Ephesus",
    shortTitle: "Ephesus",
    aliases: ["Third Ecumenical Council"],
    yearStart: 431,
    displayDate: "June–July 431",
    precision: "year",
    era: "christological",
    categories: ["councils", "doctrine", "heresies"],
    region: "Ephesus, Asia Minor",
    importance: 1,
    preview: "The Virgin is confessed Theotokos, because the child she bore is God the Word himself, made man.",
    summary:
      "Against Nestorius, bishop of Constantinople, who refused the Virgin the title Theotokos, the council led by St Cyril of Alexandria met at Ephesus in June 431 and deposed him. It confessed that the child of Mary is God the Word himself, made man, and so that she is truly the Mother of God. Cyril and John of Antioch were reconciled on a common confession in 433.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["John 1:14", "Matthew 1:23"],
      saints: ["cyril-of-alexandria", "celestine-of-rome", "memnon-of-ephesus", "juvenal-of-jerusalem"],
      councils: ["ephesus"],
      heresies: ["nestorianism"],
      theology: ["the-theotokos"],
      precededBy: ["first-council-of-constantinople"],
      resultedIn: ["council-of-chalcedon"],
    },
    media: {
      hero: "/history/media/council-of-ephesus.v1.jpg",
      shape: "whole",
      width: 963,
      height: 1000,
      alt: "Oil sketch with an arched top: a bishop in white stands with his hand raised before the gathered bishops, a lectern with an open book beside him.",
      work: "Sketch for the mural of the Third Ecumenical Council, Cathedral of Christ the Saviour, Moscow",
      artist: "Vasily Surikov",
      workDate: "1876",
      source: "File:Third Ecumenical council by V.Surikov (1876).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Third_Ecumenical_council_by_V.Surikov_(1876).jpg",
    },
  },
  {
    id: "he-chalcedon",
    slug: "council-of-chalcedon",
    title: "The Fourth Ecumenical Council at Chalcedon",
    shortTitle: "Chalcedon",
    aliases: ["Fourth Ecumenical Council"],
    yearStart: 451,
    displayDate: "October 451",
    precision: "year",
    era: "christological",
    categories: ["councils", "doctrine", "heresies"],
    region: "Chalcedon, near Constantinople",
    importance: 1,
    preview: "One and the same Christ, perfect in Godhead and in manhood, confessed in two natures, unconfusedly and inseparably.",
    summary:
      "Called by Marcian and Pulcheria after the council of Ephesus in 449 had restored Eutyches, more than five hundred bishops met at Chalcedon in October 451. They received the letters of St Cyril and the Tome of St Leo as one faith, deposed Dioscorus, and confessed one and the same Christ, perfect in Godhead and in manhood, in two natures without confusion or division.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["John 1:14", "Hebrews 4:15", "John 14:27"],
      saints: ["leo-the-great", "marcian-the-emperor", "pulcheria-the-empress", "anatolius-of-constantinople", "juvenal-of-jerusalem"],
      councils: ["chalcedon"],
      heresies: ["eutychianism", "nestorianism"],
      precededBy: ["council-of-ephesus"],
      resultedIn: ["non-chalcedonian-estrangement"],
    },
    media: {
      hero: "/history/media/council-of-chalcedon.v1.jpg",
      shape: "whole",
      width: 706,
      height: 778,
      alt: "Fresco of the Fourth Ecumenical Council: the emperor enthroned among the seated bishops, a saint's relics lying in an open tomb before them, and a group of monks standing at the right.",
      work: "The Fourth Ecumenical Council, fresco in the cathedral of the Nativity of the Mother of God, Ferapontov monastery",
      artist: "Dionisius",
      workDate: "1502",
      source: "File:EcumenicalCouncil 4th 11-18.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:EcumenicalCouncil_4th_11-18.jpg",
    },
  },
  {
    id: "he-non-chalcedonian",
    slug: "non-chalcedonian-estrangement",
    title: "The Estrangement of the Non-Chalcedonian Churches",
    shortTitle: "After Chalcedon",
    aliases: ["Miaphysite separation", "Oriental Orthodox separation"],
    yearStart: 451,
    yearEnd: 553,
    displayDate: "after 451",
    precision: "approximate",
    era: "christological",
    categories: ["schisms", "doctrine"],
    region: "Egypt, Syria, Armenia",
    importance: 2,
    preview: "Egypt, Syria, and Armenia cannot receive Chalcedon, the Church's first lasting division begins.",
    summary:
      "Large parts of Egypt, Syria, and Armenia reject the Council of Chalcedon, holding with Cyril's language to 'one incarnate nature of God the Word', a miaphysite, not a Eutychian, confession. Imperial attempts at compromise fail, and the separation of the Oriental Orthodox churches from the imperial Church hardens across the following century, a division of terminology, politics, and grief as much as doctrine, and one that endures to this day.",
    certainty: "editorial-synthesis",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      councils: ["chalcedon", "second-constantinople"],
      precededBy: ["council-of-chalcedon"],
    },
  },
  {
    id: "he-second-constantinople",
    slug: "second-council-of-constantinople",
    title: "The Fifth Ecumenical Council at Constantinople",
    shortTitle: "Constantinople II",
    aliases: ["Fifth Ecumenical Council"],
    yearStart: 553,
    displayDate: "May–June 553",
    precision: "year",
    era: "christological",
    categories: ["councils", "doctrine", "heresies"],
    region: "Constantinople",
    importance: 2,
    preview: "Justinian's council reads Chalcedon through Cyril and condemns the Three Chapters.",
    summary:
      "Under Justinian, the fifth council condemns the 'Three Chapters', writings tainted with Nestorianism, and certain Origenist teachings, confessing that the one hypostasis of Christ is the divine Word himself. It binds Chalcedon firmly to Cyril's theology, partly in hope (unfulfilled) of winning back the non-Chalcedonians.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["justinian-the-great", "eutychius-of-constantinople"],
      councils: ["second-constantinople"],
      heresies: ["origenism", "nestorianism"],
      precededBy: ["council-of-chalcedon"],
    },
    media: {
      hero: "/history/media/second-council-of-constantinople.v1.jpg",
      shape: "whole",
      width: 772,
      height: 726,
      alt: "Fresco of the Fifth Ecumenical Council: the emperor Justinian enthroned at the centre, the bishops in white vestments with crosses on either side, and the condemned bowed in coloured robes at the right.",
      work: "The Fifth Ecumenical Council, fresco of the Cathedral of the Nativity of the Theotokos, Ferapontov Monastery",
      artist: "Dionisius",
      workDate: "about 1502",
      source: "File:Пятый Вселенский Собор.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:%D0%9F%D1%8F%D1%82%D1%8B%D0%B9_%D0%92%D1%81%D0%B5%D0%BB%D0%B5%D0%BD%D1%81%D0%BA%D0%B8%D0%B9_%D0%A1%D0%BE%D0%B1%D0%BE%D1%80.jpg",
    },
  },
  {
    id: "he-third-constantinople",
    slug: "third-council-of-constantinople",
    title: "The Sixth Ecumenical Council at Constantinople",
    shortTitle: "Constantinople III",
    aliases: ["Sixth Ecumenical Council"],
    yearStart: 680,
    yearEnd: 681,
    displayDate: "680–681",
    precision: "year",
    era: "christological",
    categories: ["councils", "doctrine", "heresies"],
    region: "Constantinople",
    importance: 2,
    preview: "Two wills in Christ: what he assumed, he heals, vindicating St Maximus after his death.",
    summary:
      "Against monothelitism, the imperial compromise that gave Christ two natures but a single will, the sixth council confesses two natural wills and operations, the human will freely following the divine. It vindicates Maximus the Confessor and Martin of Rome, who had died mutilated and exiled for this confession.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["maximus-the-confessor", "martin-the-confessor", "agatho-of-rome", "sophronius-of-jerusalem"],
      councils: ["third-constantinople"],
      heresies: ["monothelitism"],
    },
    media: {
      hero: "/history/media/third-council-of-constantinople.v1.jpg",
      shape: "whole",
      width: 727,
      height: 790,
      alt: "Fresco of the Sixth Ecumenical Council: the emperor enthroned among the seated bishops, more bishops standing before him, and monks in dark mantles gathered at the right.",
      work: "The Sixth Ecumenical Council, fresco of the Cathedral of the Nativity of the Theotokos, Ferapontov Monastery",
      artist: "Dionisius",
      workDate: "1502",
      source: "File:EcumenicalCouncil 6th 07-07.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:EcumenicalCouncil_6th_07-07.jpg",
    },
  },
  {
    id: "he-first-iconoclasm",
    slug: "first-iconoclasm",
    title: "The First Iconoclasm",
    shortTitle: "Iconoclasm begins",
    aliases: ["Iconoclast controversy"],
    yearStart: 726,
    yearEnd: 787,
    displayDate: "726–787",
    precision: "year",
    era: "iconoclasm",
    categories: ["iconography", "persecutions", "doctrine"],
    region: "Byzantine Empire",
    importance: 1,
    preview: "Leo III orders the images destroyed; monks and faithful die defending them.",
    summary:
      "Emperor Leo III moves against the holy images from 726, and his son Constantine V enforces iconoclasm with synods and persecution, monks are its fiercest opponents and chief victims. From the caliphate, John of Damascus writes the classic defense: the Word became visible flesh, and what may be seen may be depicted.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["john-of-damascus"],
      heresies: ["iconoclasm"],
      resultedIn: ["second-council-of-nicaea"],
    },
    media: {
      hero: "/history/media/first-iconoclasm.v1.jpg",
      shape: "whole",
      width: 588,
      height: 786,
      alt: "Page of the Chludov Psalter: beside the Crucifixion, where a soldier offers Christ vinegar on a sponge, an iconoclast below whitewashes a round image of Christ with a sponge on a pole.",
      work: "The Chludov Psalter, folio 67r, State Historical Museum, Moscow",
      artist: "unknown Byzantine illuminator",
      workDate: "mid-9th century",
      source: "File:Clasm Chludov.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Clasm_Chludov.jpg",
    },
  },
  {
    id: "he-second-nicaea",
    slug: "second-council-of-nicaea",
    title: "The Seventh Ecumenical Council at Nicaea",
    shortTitle: "Nicaea II",
    aliases: ["Seventh Ecumenical Council"],
    yearStart: 787,
    displayDate: "September–October 787",
    precision: "year",
    era: "iconoclasm",
    categories: ["councils", "iconography", "doctrine"],
    region: "Nicaea, Asia Minor",
    importance: 1,
    preview: "The holy icons are restored: honour paid to the image passes to the one it shows, worship belongs to God alone.",
    summary:
      "After sixty years of imperial iconoclasm, the empress Irene and the patriarch Tarasius gathered more than three hundred bishops at Nicaea in 787. The council defined that the holy images are to be set up and venerated, given honourable reverence but never the worship due to God alone, because the honour paid to an image passes to the one it represents and the Incarnation is real.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Exodus 25:17-22", "Numbers 7:88-89", "Ezekiel 41:18-19"],
      saints: ["tarasius-of-constantinople", "irene-the-empress", "adrian-of-rome", "john-of-damascus"],
      councils: ["second-nicaea"],
      heresies: ["iconoclasm"],
      precededBy: ["first-iconoclasm"],
      resultedIn: ["second-iconoclasm"],
    },
    media: {
      hero: "/history/media/second-council-of-nicaea.v1.jpg",
      shape: "whole",
      width: 974,
      height: 638,
      alt: "Byzantine miniature of the Seventh Ecumenical Council: the young emperor enthroned beside the Cross, bishops with haloes seated on either side, and below them a man lying prostrate beside a scroll.",
      work: "The Seventh Ecumenical Council, the Menologion of Basil II (Vat. gr. 1613), folio 108",
      artist: "Byzantine illuminators of the Menologion of Basil II",
      workDate: "circa 985",
      source: "File:Menologion of Basil 024.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_024.jpg",
    },
  },
  {
    id: "he-second-iconoclasm",
    slug: "second-iconoclasm",
    title: "The Second Iconoclasm",
    shortTitle: "Second Iconoclasm",
    yearStart: 815,
    yearEnd: 842,
    displayDate: "815–842",
    precision: "year",
    era: "iconoclasm",
    categories: ["iconography", "persecutions"],
    region: "Byzantine Empire",
    importance: 2,
    preview: "The images fall again under Leo V, a generation of confessors holds the line.",
    summary:
      "Military disasters revive the iconoclast party, and Leo V reimposes the ban in 815. For a generation the defenders of the icons, Theodore the Studite and his monks chief among them, endure prison, flogging, and exile, until the death of the emperor Theophilus opens the way for restoration.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      heresies: ["iconoclasm"],
      precededBy: ["second-council-of-nicaea"],
      resultedIn: ["triumph-of-orthodoxy"],
    },
    media: {
      hero: "/history/media/second-iconoclasm.v1.jpg",
      shape: "whole",
      width: 1058,
      height: 654,
      alt: "Miniature from the Menologion of Basil II: a haloed monk prays on a rocky shore as a boat carries St Theodore the Studite's relics across the sea to the walls and church of the Studion monastery.",
      work: "St Theodore the Studite, Menologion of Basil II (Vat. gr. 1613)",
      artist: "The Menologion's illuminators",
      workDate: "about 985",
      source: "File:Theodore Studite (Menologion of Basil II) page.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Theodore_Studite_(Menologion_of_Basil_II)_page.jpg",
    },
  },
  {
    id: "he-triumph-of-orthodoxy",
    slug: "triumph-of-orthodoxy",
    title: "The Triumph of Orthodoxy",
    shortTitle: "Triumph of Orthodoxy",
    aliases: ["Restoration of the icons", "Sunday of Orthodoxy"],
    yearStart: 843,
    displayDate: "March 11, 843",
    precision: "exact",
    era: "iconoclasm",
    categories: ["iconography", "liturgics", "doctrine"],
    region: "Constantinople",
    importance: 1,
    preview: "The icons return in procession to Hagia Sophia in March 843; the Church keeps the day as the Sunday of Orthodoxy.",
    summary:
      "After the death of the iconoclast emperor Theophilos in 842, the empress Theodora, ruling for her young son Michael III, was persuaded to restore the holy icons. A council in March 843 deposed Patriarch John the Grammarian, made Methodios patriarch and confirmed the Seventh Ecumenical Council. On the first Sunday of Lent the icons were carried into Hagia Sophia, and the day is still kept as the Sunday of Orthodoxy.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["John 1:14"],
      saints: ["aemilian-of-cyzicus"],
      heresies: ["iconoclasm"],
      precededBy: ["second-iconoclasm"],
    },
    media: {
      hero: "/history/media/triumph-of-orthodoxy.v1.jpg",
      shape: "whole",
      width: 943,
      height: 1200,
      alt: "Icon of the Triumph of Orthodoxy: the Hodegetria icon of the Mother of God held up on a red cloth, the empress Theodora and her son at the left, Patriarch Methodios and monks at the right, and below them the saints who suffered for the icons.",
      work: "The Triumph of Orthodoxy, the British Museum",
      artist: "Anonymous, Constantinople",
      workDate: "circa 1400",
      source: "File:Triumph orthodoxy.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Triumph_orthodoxy.jpg",
    },
  },
  {
    id: "he-cyril-methodius",
    slug: "mission-of-cyril-and-methodius",
    title: "The Mission of Saints Cyril and Methodius to the Slavs",
    shortTitle: "Cyril & Methodius",
    aliases: ["Moravian mission", "Apostles to the Slavs"],
    yearStart: 863,
    displayDate: "c. 863",
    precision: "approximate",
    era: "byzantine-expansion",
    categories: ["missions", "scripture", "liturgics"],
    region: "Great Moravia",
    importance: 1,
    preview: "Two brothers from Thessalonica give the Slavs letters, Scriptures and a Liturgy in their own tongue.",
    summary:
      "In 861 or 862 Prince Rastislav of Moravia asked Constantinople for a teacher, and the emperor sent the brothers Constantine and Methodius of Thessalonica. Constantine made the Slavonic letters, and with Methodius translated the Scriptures and services. Despite Frankish opposition, popes approved their books; Constantine died in Rome as the monk Cyril in 869, Methodius as archbishop in 885, and their disciples carried the work to Bulgaria.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Acts 2:1-11"],
      saints: ["cyril-and-methodius", "photius-the-great"],
      resultedIn: ["conversion-of-kievan-rus"],
    },
    media: {
      hero: "/history/media/mission-of-cyril-and-methodius.v2.jpg",
      shape: "whole",
      width: 876,
      height: 1190,
      alt: "Icon of Sts Cyril and Methodius: Methodius as a bishop in a crown-like mitre holding a Gospel, Cyril as a monk holding a scroll of the Slavonic alphabet, and Christ blessing from the clouds above them.",
      work: "Sts Cyril and Methodius, the Enlighteners of the Slavs",
      artist: "Avram Dichov",
      workDate: "1892",
      source: "File:Sts. Cyril and Methodius Bulgarian Enlighteners Icon by Avram Dichov, 1892.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Sts._Cyril_and_Methodius_Bulgarian_Enlighteners_Icon_by_Avram_Dichov,_1892.jpg",
    },
  },
  {
    id: "he-photian-council",
    slug: "photian-council",
    title: "The Photian Controversy and the Council of 879–880",
    shortTitle: "Photian council",
    aliases: ["Council of Constantinople 879-880", "Photian schism"],
    yearStart: 879,
    yearEnd: 880,
    displayDate: "879–880",
    precision: "year",
    era: "byzantine-expansion",
    categories: ["councils", "schisms", "doctrine", "patriarchates"],
    region: "Constantinople",
    importance: 2,
    preview: "Rome and Constantinople clash over Photius and the filioque, then make peace at a great council.",
    summary:
      "The disputed elevation of Photius, rival missions in Bulgaria, and the Frankish addition to the Creed bring Rome and Constantinople into open conflict. The council of 879–880, with Roman legates present, restores communion and confirms the Creed without the filioque, for the East, a standing witness of how the two sees once resolved their quarrel.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["photius-the-great"],
      theology: ["filioque", "papacy"],
      resultedIn: ["great-schism-1054"],
    },
    media: {
      hero: "/history/media/photian-council.v1.jpg",
      shape: "wide",
      width: 734,
      height: 412,
      alt: "Russian chronicle miniature: St Photius, haloed and in green vestments, reads from a book as a crowned ruler and his people stand bare-chested in the water to be baptized, clergy behind him.",
      work: "St Photius baptizes the Bulgarians, Illustrated Chronicle of Ivan the Terrible, book 13, page 414",
      artist: "Russian manuscript illuminators",
      workDate: "1560s to 1570s",
      source: "File:Facial Chronicle - b.13, p.414 - Photios baptising king of Bulgars.gif",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Facial_Chronicle_-_b.13,_p.414_-_Photios_baptising_king_of_Bulgars.gif",
    },
  },
  {
    id: "he-conversion-of-rus",
    slug: "conversion-of-kievan-rus",
    title: "The Baptism of Kievan Rus",
    shortTitle: "Baptism of Rus",
    aliases: ["Conversion of Rus", "Baptism of Vladimir"],
    yearStart: 988,
    displayDate: "988",
    precision: "year",
    era: "byzantine-expansion",
    categories: ["missions", "autocephaly"],
    region: "Kyiv",
    importance: 1,
    preview: "Vladimir's envoys marvel at the Greek Liturgy, and Kyiv is baptized in the Dnieper, the shared beginning of three peoples.",
    summary:
      "Prince Vladimir of Kyiv began as a pagan, though Christianity had reached Rus before him and his grandmother Olga had been baptized at Constantinople. About 988, allied with the emperor Basil II, he was baptized, married the emperor's sister Anna and had the people of Kyiv baptized in the Dnieper, the shared beginning of Ukrainian, Russian and Belarusian Christianity.",
    certainty: "strongly-supported",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["cyril-and-methodius"],
      precededBy: ["mission-of-cyril-and-methodius"],
    },
    media: {
      hero: "/history/media/conversion-of-kievan-rus.v1.jpg",
      shape: "whole",
      width: 945,
      height: 1170,
      alt: "Painting: in a domed church Prince Vladimir stands in a stone font while a white-bearded bishop baptizes him, his warriors and his people gathered round.",
      work: "The Baptism of Prince Vladimir, sketch for the fresco in St Volodymyr's Cathedral, Kyiv",
      artist: "Viktor Vasnetsov",
      workDate: "1890",
      source: "File:Vasnetsov Bapt Vladimir.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Vasnetsov_Bapt_Vladimir.jpg",
    },
  },
  {
    id: "he-great-schism",
    slug: "great-schism-1054",
    title: "The Excommunications of 1054",
    shortTitle: "1054",
    aliases: ["Great Schism", "East-West Schism"],
    yearStart: 1054,
    displayDate: "July 16, 1054",
    precision: "exact",
    calendar: { month: 7, day: 16, basis: "julian" },
    era: "estrangement",
    categories: ["schisms", "doctrine", "patriarchates"],
    region: "Constantinople",
    importance: 1,
    preview: "Cardinal Humbert lays a bull on the altar of Hagia Sophia; the patriarch's synod answers four days later.",
    summary:
      "On 16 July 1054 the papal legates led by Cardinal Humbert laid a bull excommunicating Patriarch Michael Keroularios on the altar of Hagia Sophia, and four days later the patriarch's synod anathematized the bull and its authors. Both sentences were aimed at persons, not Churches. The date marks, by convention, a long estrangement over the filioque and papal claims; in 1965 the excommunications were withdrawn.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Matthew 10:14", "John 15:26"],
      theology: ["filioque", "papacy"],
      saints: ["photius-the-great"],
      precededBy: ["photian-council"],
      resultedIn: ["sack-of-constantinople-1204"],
    },
    media: {
      hero: "/history/media/great-schism-1054.v1.jpg",
      shape: "whole",
      width: 1200,
      height: 1000,
      alt: "Mosaic of Christ enthroned with a Gospel book, the emperor Constantine IX Monomachos offering a purse at his right and the Empress Zoe holding a scroll at his left, their names in Greek on the gold.",
      work: "Christ between Constantine IX Monomachos and the Empress Zoe, Hagia Sophia, Constantinople",
      artist: "Byzantine mosaicists (photograph by Myrabella, CC0)",
      workDate: "11th century",
      source: "File:Empress Zoe mosaic Hagia Sophia.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Empress_Zoe_mosaic_Hagia_Sophia.jpg",
    },
  },
  {
    id: "he-sack-1204",
    slug: "sack-of-constantinople-1204",
    title: "The Sack of Constantinople by the Fourth Crusade",
    shortTitle: "1204",
    aliases: ["Fourth Crusade"],
    yearStart: 1204,
    displayDate: "April 12–13, 1204",
    precision: "exact",
    calendar: { month: 4, day: 12, basis: "julian" },
    era: "estrangement",
    categories: ["schisms", "persecutions", "patriarchates"],
    region: "Constantinople",
    importance: 1,
    preview: "A crusade bound for Egypt takes and plunders the greatest Christian city instead, in April 1204.",
    summary:
      "Diverted by debt to Venice and by the promises of the young Alexios Angelos, the Fourth Crusade took Constantinople on 12 April 1204 and plundered it for three days, stripping its churches and carrying their relics west. A Latin emperor was crowned in Hagia Sophia and a Venetian made patriarch; to the Orthodox the sack made the estrangement a lasting wound.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      theology: ["papacy"],
      precededBy: ["great-schism-1054"],
    },
    media: {
      hero: "/history/media/sack-of-constantinople-1204.v1.jpg",
      shape: "whole",
      width: 1200,
      height: 747,
      alt: "Medieval miniature: crusaders in armour climb ladders from their ships against the white towers of Constantinople while the defenders throw stones down from the walls.",
      work: "The crusaders' assault on Constantinople, in David Aubert's Croniques abregies",
      artist: "Loyset Liédet",
      workDate: "15th century",
      source: "File:ConquestOfConstantinopleByTheCrusadersIn1204.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:ConquestOfConstantinopleByTheCrusadersIn1204.jpg",
    },
  },
  {
    id: "he-hesychast-councils",
    slug: "hesychast-councils",
    title: "St Gregory Palamas and the Hesychast Councils",
    shortTitle: "Hesychast councils",
    aliases: ["Palamite councils", "Hesychast controversy"],
    yearStart: 1341,
    yearEnd: 1351,
    displayDate: "1341–1351",
    precision: "year",
    era: "late-byzantine",
    categories: ["councils", "doctrine", "monasticism"],
    region: "Constantinople & Mount Athos",
    importance: 1,
    preview: "Councils at Constantinople uphold St Gregory Palamas: the light of Tabor is uncreated, and God truly gives Himself in His energies.",
    summary:
      "When Barlaam of Calabria attacked the hesychast monks of Mount Athos and their claim to see a divine light, Gregory Palamas answered that God, beyond all participation in His essence, truly gives Himself in His uncreated energies, and that the light of Tabor is His own glory. Councils at Constantinople in 1341, 1347 and 1351 upheld his teaching, and in 1368 he was numbered among the saints.",
    certainty: "conciliar-definition",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Matthew 17:1-9", "2 Peter 1:4"],
      saints: ["gregory-palamas"],
      theology: ["theosis"],
      resultedIn: ["philokalia-published"],
    },
    media: {
      hero: "/history/media/hesychast-councils.v1.jpg",
      shape: "whole",
      width: 908,
      height: 1200,
      alt: "Icon of St Gregory Palamas, Archbishop of Thessalonica: a dark-bearded bishop in a vestment patterned with crosses, blessing and holding a jewelled Gospel, his name in Greek on the gold.",
      work: "St Gregory Palamas, the Pushkin Museum, Moscow",
      artist: "Anonymous master of northern Greece",
      workDate: "early 15th century",
      source: "File:Gregor Palamas by North Greece anonym (15th c., Pushkin museum).jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Gregor_Palamas_by_North_Greece_anonym_(15th_c.,_Pushkin_museum).jpg",
    },
  },
  {
    id: "he-council-of-florence",
    slug: "council-of-florence",
    title: "The Council of Ferrara–Florence and St Mark of Ephesus",
    shortTitle: "Florence",
    aliases: [
      "Council of Ferrara-Florence",
      "Union of Florence",
      "Laetentur Caeli",
      "Union of 1439",
    ],
    yearStart: 1438,
    yearEnd: 1439,
    displayDate: "1438–1439",
    precision: "year",
    era: "late-byzantine",
    categories: ["councils", "schisms", "doctrine"],
    region: "Ferrara & Florence, Italy",
    // Raised from 2 on 2026-08-02. Every neighbouring event in this era is
    // era-defining, and Florence is where the Orthodox doctrine of reception
    // was stated in its sharpest form: it belongs at the same weight.
    importance: 1,
    preview: "A union signed under the shadow of the Turks, and refused by the Orthodox people.",
    summary:
      "With Constantinople desperate for Western aid, emperor and patriarch lead a delegation to Italy and accept a union on Rome's terms, the filioque, purgatory, papal primacy. Mark, metropolitan of Ephesus, alone refuses to sign; when the delegates come home, the people side with Mark, and the union dies before the City does.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["mark-of-ephesus"],
      theology: ["filioque", "papacy", "council-of-florence"],
      precededBy: ["great-schism-1054", "sack-of-constantinople-1204"],
      resultedIn: ["fall-of-constantinople"],
    },
    media: {
      hero: "/history/media/council-of-florence.jpg",
      shape: "whole",
      width: 760,
      height: 1200,
      alt: "A crowned and bearded king in a plumed hat and gold-embroidered green robe, riding in procession through a green landscape",
      work: "The Journey of the Magi (detail traditionally identified as John VIII Palaiologos)",
      artist: "Benozzo Gozzoli",
      workDate: "1459–1461",
      source: "Wikimedia Commons",
      license: "Public domain",
      evidenceUrl:
        "https://commons.wikimedia.org/wiki/File:Gozzoli,_Benozzo_-_Cavalcata_dei_Re_Magi_-_Ioannes_VIII_Palaiologus.jpg",
      gallery: [
        {
          src: "/history/media/council-of-florence-pisanello.jpg",
          width: 1280,
          height: 886,
          alt: "A sheet of pen studies: the emperor on horseback, two horses' heads, a standing figure from behind, and lines of Arabic script",
          work: "Studies of John VIII Palaiologos and his retinue, drawn at the council",
          artist: "Pisanello",
          workDate: "1438–1439",
          source: "Wikimedia Commons",
          license: "Public domain",
          evidenceUrl:
            "https://commons.wikimedia.org/wiki/File:Sketches_of_John_VIII_Palaiologos_during_his_visit_at_the_council_of_Florence_in_1438_by_Pisanello.jpg",
        },
        {
          src: "/history/media/council-of-florence-decree.jpg",
          width: 1144,
          height: 922,
          alt: "The parchment of the union decree, two columns of Latin and Greek text above a long block of subscriptions, with the emperor's signature in the margin and two lead seals on cords",
          work: "The bull of union Laetentur Caeli, with the subscriptions and the emperor's signature",
          artist: "Papal chancery of Eugenius IV",
          workDate: "6 July 1439",
          source: "Wikimedia Commons",
          license: "Public domain",
          evidenceUrl: "https://commons.wikimedia.org/wiki/File:Union_1439.jpg",
        },
        {
          src: "/history/media/council-of-florence-woodcut.v2.jpg",
          width: 987,
          height: 1035,
          alt: "Woodcut of the council: a tiara-crowned pope surrounded by mitred bishops, the dove of the Holy Spirit above, titled Concilium Florentinum 1439",
          work: "Concilium Florentinum, from the Nuremberg Chronicle",
          artist: "Michael Wolgemut workshop, published by Hartmann Schedel",
          workDate: "1493",
          source: "Rijksmuseum via Wikimedia Commons",
          license: "CC0",
          evidenceUrl:
            "https://commons.wikimedia.org/wiki/File:Concilie_van_Ferrara-Florence_Concilium_florentinum_(titel_op_object)_Liber_Chronicarum_(serietitel),_RP-P-2016-49-72-4.jpg",
        },
      ],
    },
  },
  {
    id: "he-fall-of-constantinople",
    slug: "fall-of-constantinople",
    title: "The Fall of Constantinople",
    shortTitle: "1453",
    aliases: ["Conquest of Constantinople", "Fall of the City"],
    yearStart: 1453,
    displayDate: "May 29, 1453",
    precision: "exact",
    calendar: { month: 5, day: 29, basis: "julian" },
    era: "late-byzantine",
    categories: ["patriarchates", "persecutions"],
    region: "Constantinople",
    importance: 1,
    preview: "After a siege of nearly eight weeks Mehmed II takes the City; the last emperor dies in the final assault.",
    summary:
      "On Tuesday 29 May 1453, after a siege of nearly eight weeks, the army of Sultan Mehmed II broke into Constantinople. Emperor Constantine XI died in the fighting, and Hagia Sophia, where the last Christian service had been held the evening before, became a mosque. The sultan had Gennadios Scholarios, leader of the opponents of the union with Rome, chosen patriarch, and the Church entered its life under Ottoman rule.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Hebrews 13:14"],
      precededBy: ["council-of-florence"],
      resultedIn: ["moscow-patriarchate-established"],
    },
    media: {
      hero: "/history/media/fall-of-constantinople.v1.jpg",
      shape: "whole",
      width: 809,
      height: 1200,
      alt: "Late medieval miniature of the siege of Constantinople: the walled city on its peninsula, ships in the water around it, and the Ottoman camp with its tents in the foreground.",
      work: "The siege of Constantinople, in Bertrandon de la Broquière's Voyage d'Outremer (BnF fr. 9087), folio 207v",
      artist: "Jean Le Tavernier",
      workDate: "after 1455",
      source: "File:Le siège de Constantinople (1453) by Jean Le Tavernier after 1455.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Le_si%C3%A8ge_de_Constantinople_(1453)_by_Jean_Le_Tavernier_after_1455.jpg",
    },
  },
  {
    id: "he-moscow-patriarchate",
    slug: "moscow-patriarchate-established",
    title: "The Establishment of the Moscow Patriarchate",
    shortTitle: "Moscow Patriarchate",
    aliases: ["Patriarchate of Moscow"],
    yearStart: 1589,
    displayDate: "January 1589",
    precision: "year",
    era: "ottoman",
    categories: ["patriarchates", "autocephaly"],
    region: "Moscow",
    importance: 2,
    preview: "Patriarch Jeremiah II of Constantinople raises the see of Moscow to a patriarchate, the first new one in a millennium.",
    summary:
      "Visiting Moscow in search of support for his impoverished Church, Ecumenical Patriarch Jeremiah II consecrates Job as the first Patriarch of Moscow in January 1589, a rank confirmed by councils at Constantinople in 1590 and 1593. The Russian Church, autocephalous in practice since 1448, becomes the fifth patriarchate of the Orthodox world.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      precededBy: ["fall-of-constantinople", "conversion-of-kievan-rus"],
    },
  },
  {
    id: "he-philokalia",
    slug: "philokalia-published",
    title: "The Publication of the Philokalia",
    shortTitle: "Philokalia",
    aliases: ["Philokalia of the Neptic Fathers"],
    yearStart: 1782,
    displayDate: "1782",
    precision: "year",
    era: "ottoman",
    categories: ["writings", "monasticism"],
    region: "Venice & Mount Athos",
    importance: 2,
    preview: "Two monks publish at Venice the Fathers' writings on unceasing prayer; Slavonic and Russian translations carry them north.",
    summary:
      "In 1782 St Makarios of Corinth and St Nikodemos the Hagiorite published at Venice the Philokalia, a great collection of the Fathers' writings on watchfulness and unceasing prayer, from St Antony the Great to St Gregory Palamas. St Paisius Velichkovsky's Slavonic translation was printed at Moscow in 1793, and St Theophan the Recluse's Russian version followed from 1877, carrying the prayer of the heart far beyond the monasteries.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["1 Thessalonians 5:16-18"],
      saints: ["nikodemos-the-hagiorite", "paisius-velichkovsky", "theophan-the-recluse"],
      theology: ["theosis"],
      precededBy: ["hesychast-councils"],
      resultedIn: ["alaska-mission"],
    },
    media: {
      hero: "/history/media/philokalia-published.v2.jpg",
      shape: "whole",
      width: 850,
      height: 1167,
      alt: "Engraved portrait of St Nikodemos of the Holy Mountain, a bearded monk writing with a quill at a desk of open books before shelves, framed by a Greek inscription, with verses below.",
      work: "St Nikodemos the Hagiorite",
      artist: "Antonios Zoulianis, engraver",
      workDate: "1818",
      source: "File:Άγιος Νικόδημος ο Αγιορείτης.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:%CE%86%CE%B3%CE%B9%CE%BF%CF%82_%CE%9D%CE%B9%CE%BA%CF%8C%CE%B4%CE%B7%CE%BC%CE%BF%CF%82_%CE%BF_%CE%91%CE%B3%CE%B9%CE%BF%CF%81%CE%B5%CE%AF%CF%84%CE%B7%CF%82.jpg",
    },
  },
  {
    id: "he-alaska-mission",
    slug: "alaska-mission",
    title: "The Orthodox Mission to Alaska",
    shortTitle: "Alaska, 1794",
    aliases: ["Kodiak mission", "Russian-American mission"],
    yearStart: 1794,
    displayDate: "September 24, 1794",
    precision: "exact",
    calendar: { month: 9, day: 24, basis: "julian" },
    era: "global-missions",
    categories: ["missions", "modern"],
    region: "Kodiak, Alaska",
    importance: 1,
    preview: "Monks from Valaam land on Kodiak to preach to the Alaskan peoples; St Herman stays on to serve them for four decades.",
    summary:
      "On 24 September 1794 eight monks from Valaam and other Russian monasteries, led by Archimandrite Ioasaf, landed on Kodiak Island after crossing Siberia and the sea. They baptized thousands of the Alutiiq and Unangan peoples and took their part against the fur company. Within a few years most had died or left; St Herman stayed on Spruce Island until his death in 1837 and was glorified in 1970.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Matthew 28:19-20"],
      saints: ["herman-of-alaska"],
      precededBy: ["philokalia-published"],
      resultedIn: ["oca-autocephaly"],
    },
    media: {
      hero: "/history/media/alaska-mission.v1.jpg",
      shape: "whole",
      width: 760,
      height: 1200,
      alt: "Black and white photograph of a small white wooden chapel with a pointed roof and a cross, wooden steps up to its door, among tall spruce trees.",
      work: "The chapel of Sts Sergius and Herman of Valaam on Spruce Island, Alaska, over the place of St Herman's first grave",
      artist: "Historic American Buildings Survey, National Park Service",
      workDate: "undated on its page",
      source: "File:WEST FRONT - Saints Sergius and Herman of Valaam Russian Orthodox Chapel, Spruce Island, Ouzinkie, Kodiak Island Borough, AK HABS AK,12-MOLA,1-2.tif",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:WEST_FRONT_-_Saints_Sergius_and_Herman_of_Valaam_Russian_Orthodox_Chapel,_Spruce_Island,_Ouzinkie,_Kodiak_Island_Borough,_AK_HABS_AK,12-MOLA,1-2.tif",
    },
  },
  {
    id: "he-russian-persecution",
    slug: "bolshevik-persecution",
    title: "The Persecution of the Church under Communism",
    shortTitle: "New Martyrs",
    aliases: ["Soviet persecution", "New Martyrs of Russia"],
    yearStart: 1917,
    yearEnd: 1991,
    displayDate: "1917–1991",
    precision: "year",
    era: "modern",
    categories: ["persecutions", "martyrs", "modern"],
    region: "Russia",
    importance: 1,
    preview: "From 1917 the Russian Church is stripped of its property and persecuted; bishops, priests and faithful die as new martyrs.",
    summary:
      "In 1917 the Local Council of the Russian Church restored the patriarchate and chose St Tikhon by lot, days after the Bolsheviks took power. Their decree of 1918 took all church property, the seizure of valuables in 1922 brought trials and executions, and in 1937 and 1938 clergy and faithful were shot or sent to the camps in great numbers. The new martyrs were glorified in 1981 and 2000.",
    certainty: "historically-attested",
    status: "published",
    depth: "full",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      scripture: ["Romans 8:35"],
      precededBy: ["conversion-of-kievan-rus"],
    },
    media: {
      hero: "/history/media/bolshevik-persecution.v1.jpg",
      shape: "wide",
      width: 1200,
      height: 675,
      alt: "Photograph of the Local Council of the Russian Church in 1917: bearded metropolitans and bishops in white and black cowls seated at a long table, clergy and council members behind them.",
      work: "The Local Council of the Russian Orthodox Church, Moscow, after the election of Patriarch Tikhon",
      artist: "Unknown photographer",
      workDate: "1917",
      source: "File:Highest authority of Russian Orthodox Church in 1917.jpg",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Highest_authority_of_Russian_Orthodox_Church_in_1917.jpg",
    },
  },
  {
    id: "he-oca-autocephaly",
    slug: "oca-autocephaly",
    title: "The Autocephaly of the Orthodox Church in America",
    shortTitle: "OCA, 1970",
    aliases: ["OCA tomos", "American autocephaly"],
    yearStart: 1970,
    displayDate: "April 10, 1970",
    precision: "exact",
    calendar: { month: 4, day: 10, basis: "gregorian" },
    era: "modern",
    categories: ["autocephaly", "modern", "patriarchates"],
    region: "North America",
    importance: 2,
    preview: "Moscow grants a tomos of autocephaly to its American daughter church, recognized by some churches, not by others.",
    summary:
      "On April 10, 1970, the Patriarchate of Moscow grants autocephaly to its former American metropolia, which becomes the Orthodox Church in America, heir of the Alaskan mission. The grant is received by some Orthodox churches and not recognized by others, the Ecumenical Patriarchate among them; American Orthodoxy's canonical organization remains an open question.",
    certainty: "jurisdiction-specific",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      precededBy: ["alaska-mission", "bolshevik-persecution"],
    },
  },
  {
    id: "he-ukrainian-autocephaly",
    slug: "ukrainian-autocephaly",
    title: "Ukrainian Autocephaly: the OCU and the UOC",
    shortTitle: "Ukraine, 2019",
    aliases: [
      "Orthodox Church of Ukraine",
      "OCU",
      "UOC",
      "Tomos for Ukraine",
      "Unification council of 2018",
      "Ukrainian church question",
    ],
    yearStart: 2018,
    yearEnd: 2019,
    displayDate: "2018–2019",
    precision: "year",
    era: "modern",
    categories: ["autocephaly", "schisms", "patriarchates", "modern"],
    region: "Kyiv & Constantinople",
    importance: 2,
    preview:
      "Constantinople grants Ukraine a tomos of autocephaly; the Ukrainian church remains divided between the OCU and the UOC.",
    summary:
      "In December 2018 a unification council at St Sophia in Kyiv forms the Orthodox Church of Ukraine from the previously unrecognized Ukrainian bodies, and on January 5–6, 2019 Patriarch Bartholomew signs and hands over its tomos of autocephaly. The Ukrainian Orthodox Church under Metropolitan Onufriy declines to take part, and Ukraine is left with two large rival churches, each holding the other's foundation illegitimate. Recognition of the OCU divides the Orthodox world along the same line as the Moscow–Constantinople schism.",
    certainty: "jurisdiction-specific",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      precededBy: ["conversion-of-kievan-rus", "moscow-patriarchate-established"],
      resultedIn: ["moscow-constantinople-schism-2018"],
    },
    media: {
      hero: "/history/media/ukrainian-autocephaly.jpg",
      shape: "whole",
      width: 1280,
      height: 951,
      alt: "Patriarch Bartholomew hands the tomos of autocephaly to Metropolitan Epifaniy at the Phanar",
      work: "The handing over of the tomos of autocephaly",
      artist: "Presidential Administration of Ukraine",
      workDate: "January 6, 2019",
      source: "Wikimedia Commons",
      license: "CC BY 4.0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Batholomew_handing_tomos_to_Epiphanius.jpg",
      gallery: [
        {
          src: "/history/media/ukrainian-autocephaly-signing.jpg",
          width: 932,
          height: 1200,
          alt: "Patriarch Bartholomew signs the tomos of autocephaly of the Orthodox Church of Ukraine",
          work: "The signing of the tomos at the Phanar",
          artist: "Presidential Administration of Ukraine",
          workDate: "January 5, 2019",
          source: "Wikimedia Commons",
          license: "CC BY 4.0",
          evidenceUrl: "https://commons.wikimedia.org/wiki/File:Signing_of_the_tomos_of_autocephaly_of_the_Orthodox_Church_of_Ukraine_15.jpeg",
        },
        {
          src: "/history/media/ukrainian-autocephaly-sophia.jpg",
          width: 803,
          height: 1200,
          alt: "The bell tower of the cathedral of Holy Wisdom, St Sophia, in Kyiv",
          work: "St Sophia bell tower, Kyiv, site of the unification council",
          artist: "Photograph by George Chernilevsky",
          workDate: "2018",
          source: "Wikimedia Commons",
          license: "Public domain",
          evidenceUrl: "https://commons.wikimedia.org/wiki/File:St_Sophia_bell_tower_Kiev_2018_G01.jpg",
        },
      ],
    },
  },
  {
    id: "he-moscow-constantinople-2018",
    slug: "moscow-constantinople-schism-2018",
    title: "The Moscow–Constantinople Schism",
    shortTitle: "2018 schism",
    aliases: [
      "Break of communion of 2018",
      "Moscow breaks with Constantinople",
      "2018 schism",
    ],
    yearStart: 2018,
    displayDate: "October 15, 2018",
    precision: "exact",
    calendar: { month: 10, day: 15, basis: "gregorian" },
    era: "modern",
    categories: ["schisms", "patriarchates", "autocephaly", "modern"],
    region: "Constantinople & Moscow",
    importance: 2,
    preview:
      "Over Ukraine, Moscow breaks eucharistic communion with Constantinople, the widest rupture inside Orthodoxy since 1054.",
    summary:
      "On October 15, 2018, meeting at Minsk, the Holy Synod of the Russian Orthodox Church declares eucharistic communion with the Patriarchate of Constantinople broken, in answer to Constantinople's decisions of October 11 on Ukraine: to proceed to autocephaly, to receive the appeals of the leaders of the Ukrainian bodies Moscow had deposed, and to revoke the letter of 1686. Neither side declares the other's sacraments void; the rupture is jurisdictional, not doctrinal, and it still stands.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      precededBy: ["ukrainian-autocephaly", "moscow-patriarchate-established"],
    },
    media: {
      hero: "/history/media/moscow-constantinople-schism-2018.jpg",
      shape: "whole",
      width: 1280,
      height: 849,
      alt: "Divine Liturgy served in the church of St George at the Ecumenical Patriarchate in Istanbul",
      work: "Divine Liturgy at the church of St George, Ecumenical Patriarchate",
      artist: "Photograph by Andrew Gould",
      workDate: "May 2010",
      source: "Wikimedia Commons",
      license: "CC BY-SA 2.0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_St_George_during_liturgy.jpg",
      gallery: [
        {
          src: "/history/media/moscow-constantinople-schism-2018-phanar.jpg",
          width: 1280,
          height: 853,
          alt: "The church of St George at the Phanar, seat of the Ecumenical Patriarchate",
          work: "The church of St George at the Patriarchate of Constantinople",
          artist: "Photograph by Klearchos Kapoutsis",
          workDate: "August 2010",
          source: "Wikimedia Commons",
          license: "CC BY 2.0",
          evidenceUrl: "https://commons.wikimedia.org/wiki/File:Church_of_St._George,_Istanbul_(August_2010).jpg",
        },
        {
          src: "/history/media/moscow-constantinople-schism-2018-moscow.jpg",
          width: 1280,
          height: 1170,
          alt: "The Cathedral of Christ the Saviour in Moscow seen from the southeast",
          work: "Cathedral of Christ the Saviour, Moscow",
          artist: "Photograph by Alvesgaspar",
          workDate: "July 2011",
          source: "Wikimedia Commons",
          license: "CC BY-SA 3.0",
          evidenceUrl: "https://commons.wikimedia.org/wiki/File:Moscow_July_2011-7a.jpg",
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function publishedEvents(): HistoryEventMeta[] {
  return HISTORY_EVENTS.filter((e) => e.status === "published").sort(
    (a, b) => a.yearStart - b.yearStart || a.slug.localeCompare(b.slug),
  );
}

export function eventBySlug(slug: string): HistoryEventMeta | undefined {
  return HISTORY_EVENTS.find((e) => e.slug === slug && e.status === "published");
}

export function eventsForSaint(saintSlug: string): HistoryEventMeta[] {
  return publishedEvents().filter((e) => e.rel?.saints?.includes(saintSlug));
}

export function eventsForCouncil(councilSlug: string): HistoryEventMeta[] {
  return publishedEvents().filter((e) => e.rel?.councils?.includes(councilSlug));
}

export function eventsForTheologyTopic(topicSlug: string): HistoryEventMeta[] {
  return publishedEvents().filter((e) => e.rel?.theology?.includes(topicSlug));
}

export function eventsForHeresy(heresySlug: string): HistoryEventMeta[] {
  return publishedEvents().filter((e) => e.rel?.heresies?.includes(heresySlug));
}

/** Events with a firm calendar date matching MM-DD (On This Day). */
export function historyEventsOn(mmdd: string): HistoryEventMeta[] {
  const [m, d] = mmdd.split("-").map((n) => parseInt(n, 10));
  return publishedEvents().filter(
    (e) => e.calendar && e.calendar.month === m && e.calendar.day === d,
  );
}

export function eraById(id: Era) {
  return HISTORY_ERAS.find((e) => e.id === id)!;
}

export function eraForYear(year: number) {
  return (
    HISTORY_ERAS.find((e) => year >= e.from && year < e.to) ??
    HISTORY_ERAS[HISTORY_ERAS.length - 1]
  );
}

/** Century number for a year: 325 → 4. Mirrors lib/saints centuryFor. */
export function centuryOf(year: number): number {
  return Math.ceil(year / 100);
}

/** "4th c.", same formatting as lib/saints centuryLabel. */
export function centuryLabelOf(c: number): string {
  const mod100 = c % 100;
  const mod10 = c % 10;
  const ord =
    mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${c}${ord} c.`;
}

/** Centuries spanned by the published dataset, ascending. */
export function centuriesInDataset(): number[] {
  const set = new Set<number>();
  for (const e of publishedEvents()) {
    set.add(centuryOf(e.yearStart));
    if (e.yearEnd) set.add(centuryOf(e.yearEnd));
  }
  return [...set].sort((a, b) => a - b);
}

export function categoryById(id: EventCategory) {
  return EVENT_CATEGORIES.find((c) => c.id === id)!;
}

export function certaintyById(id: Certainty) {
  return CERTAINTY_LEVELS.find((c) => c.id === id)!;
}

/** Static params for /history/[slug], published events only. */
export function eventParams(): { slug: string }[] {
  return publishedEvents().map((e) => ({ slug: e.slug }));
}

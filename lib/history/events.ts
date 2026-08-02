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
  /** Rights-verified historical artwork for the Plus cinematic mode. Every
   *  field is required by the integrity suite when media is present; the
   *  license must be public domain, CC0, or a commercial-compatible CC, and
   *  evidenceUrl records where that was verified. The facts stay free with
   *  or without these layers. */
  media?: {
    /** Bundled path under /history/media/. */
    hero: string;
    alt: string;
    /** The work depicted. */
    work: string;
    artist: string;
    /** When the artwork was made, e.g. "1840" or "15th century". */
    workDate: string;
    source: string;
    license: string;
    evidenceUrl: string;
    /** Additional rights-verified images for the account-page slideshow.
     *  Same rights bar as the hero; validated by the integrity suite. */
    gallery?: {
      /** Bundled path under /history/media/. */
      src: string;
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
    label: "Apostolic Age",
    shortLabel: "Apostolic",
    from: 33,
    to: 100,
    blurb:
      "From Pentecost to the repose of the last apostle: the Church is founded, the Gospel crosses the empire, and the apostolic writings are set down.",
  },
  {
    id: "persecution",
    label: "Age of Persecution",
    shortLabel: "Persecution",
    from: 100,
    to: 313,
    blurb:
      "The Church of the martyrs. Under intermittent and then empire-wide persecution, the faith spreads, the episcopate takes shape, and the blood of the martyrs becomes seed.",
  },
  {
    id: "imperial-conciliar",
    label: "Imperial & Conciliar Church",
    shortLabel: "Imperial",
    from: 313,
    to: 431,
    blurb:
      "Legalization, the founding of Constantinople, the rise of the desert, and the first two Ecumenical Councils confessing the Son and the Spirit.",
  },
  {
    id: "christological",
    label: "Christological Controversies",
    shortLabel: "Christological",
    from: 431,
    to: 726,
    blurb:
      "Four councils on the one Christ in two natures, and the long, sorrowful estrangements that followed each definition.",
  },
  {
    id: "iconoclasm",
    label: "Iconoclasm & Restoration",
    shortLabel: "Iconoclasm",
    from: 726,
    to: 843,
    blurb:
      "The images are smashed, defended, restored, smashed again, and restored for good: the theology of the icon is hammered out under persecution.",
  },
  {
    id: "byzantine-expansion",
    label: "Missionary & Byzantine Expansion",
    shortLabel: "Expansion",
    from: 843,
    to: 1054,
    blurb:
      "Orthodoxy's great missionary century and a half: Cyril and Methodius, the Slavonic tongue, and the baptism of Rus.",
  },
  {
    id: "estrangement",
    label: "Estrangement of East & West",
    shortLabel: "Estrangement",
    from: 1054,
    to: 1261,
    blurb:
      "Not one date but a widening separation: the excommunications of 1054, the Crusades, and the catastrophe of 1204.",
  },
  {
    id: "late-byzantine",
    label: "Late Byzantine Period",
    shortLabel: "Late Byzantine",
    from: 1261,
    to: 1453,
    blurb:
      "The empire shrinks while theology deepens: hesychasm, St Gregory Palamas, the failed unions, and the last night of the City.",
  },
  {
    id: "ottoman",
    label: "Ottoman & Post-Byzantine Period",
    shortLabel: "Ottoman",
    from: 1453,
    to: 1794,
    blurb:
      "The Church under the Turkocracy: survival, new martyrs, the rise of Moscow, and the quiet revival that produced the Philokalia.",
  },
  {
    id: "global-missions",
    label: "Global Orthodox Missions",
    shortLabel: "Missions",
    from: 1794,
    to: 1917,
    blurb:
      "From Kodiak Island onward, Orthodoxy becomes a global communion, Alaska, Japan, and the parishes of the new world.",
  },
  {
    id: "modern",
    label: "Modern Orthodox History",
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
  { id: "modern", label: "Modern History", description: "Orthodoxy in the twentieth century and beyond." },
];

export const CERTAINTY_LEVELS: {
  id: Certainty;
  label: string;
  /** Short explanation surfaced in the UI next to the label. */
  gloss: string;
}[] = [
  { id: "historically-attested", label: "Historically Attested", gloss: "Documented by contemporary or near-contemporary sources." },
  { id: "strongly-supported", label: "Strongly Supported", gloss: "The consensus of historians on good evidence." },
  { id: "approximate-date", label: "Approximate Date", gloss: "The event is firm; the exact date is not." },
  { id: "traditional-account", label: "Traditional Account", gloss: "Received in the Church's tradition; not independently documented." },
  { id: "disputed", label: "Disputed", gloss: "Historians or traditions materially disagree." },
  { id: "local-tradition", label: "Local Tradition", gloss: "Attested within one local Church's tradition." },
  { id: "jurisdiction-specific", label: "Jurisdiction-Specific", gloss: "Recognized differently across Orthodox jurisdictions." },
  { id: "conciliar-definition", label: "Conciliar Definition", gloss: "Defined by a council received by the Church." },
  { id: "dogmatic-teaching", label: "Dogmatic Teaching", gloss: "The Church's dogmatic faith, not merely an event." },
  { id: "editorial-synthesis", label: "Editorial Synthesis", gloss: "Purify's summary of a long development; see sources." },
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
    preview: "The Holy Spirit descends on the apostles; three thousand are baptized in one day.",
    summary:
      "Fifty days after the Resurrection, the Holy Spirit descends upon the apostles gathered in Jerusalem. Peter preaches, about three thousand are baptized, and the Church's public life begins, the event Orthodox tradition calls the birthday of the Church.",
    certainty: "traditional-account",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-peter", "apostle-john", "theotokos"],
      scripture: ["Acts 2:1-41", "Joel 2:28-32", "John 15:26"],
      resultedIn: ["council-of-jerusalem", "missions-of-apostle-paul"],
    },
    media: {
      hero: "/history/media/pentecost.jpg",
      alt: "Icon of the Descent of the Holy Spirit: the apostles enthroned in a semicircle with tongues of fire descending",
      work: "The Descent of the Holy Spirit",
      artist: "Unknown iconographer, Novgorod school",
      workDate: "circa 1500",
      source: "Wikimedia Commons",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:The_Descent_of_the_Holy_Spirit_Novgorod.jpeg",
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
    preview: "The apostles rule that Gentile converts need not keep the Mosaic law, the pattern of every later council.",
    summary:
      "Facing the question of whether Gentile converts must be circumcised and keep the law of Moses, the apostles and elders gather at Jerusalem with Peter, Paul, Barnabas, and James. Their letter, 'it seemed good to the Holy Spirit and to us', frees the Gentiles from the Mosaic yoke and sets the conciliar pattern the Church has followed ever since.",
    certainty: "strongly-supported",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-peter", "apostle-paul"],
      scripture: ["Acts 15:1-29", "Galatians 2:1-10"],
      precededBy: ["pentecost"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-paul"],
      scripture: ["Acts 13:1-28:31", "Romans 15:19"],
      precededBy: ["pentecost"],
      resultedIn: ["neronian-persecution"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["apostle-peter", "apostle-paul"],
      precededBy: ["missions-of-apostle-paul"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["ignatius-of-antioch"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["polycarp-of-smyrna", "apostle-john"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["justin-martyr"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["irenaeus-of-lyons", "polycarp-of-smyrna"],
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
    preview: "'Go, sell what you have.' One Egyptian's obedience empties into the desert and fills it with prayer.",
    summary:
      "Hearing the Gospel's call to sell everything, Anthony of Egypt withdraws to the desert around 270 and remains there some eighty-five years. By his death in 356 the deserts of Egypt are a city of monks, Athanasius's Life of Antony carries the movement across the empire, and monasticism becomes Orthodoxy's beating heart.",
    certainty: "strongly-supported",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["anthony-the-great", "athanasius-the-great"],
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
    preview: "The empire's last, most systematic attempt to destroy the Church.",
    summary:
      "Beginning with an edict at Nicomedia in February 303, Diocletian and his colleagues order churches razed, Scriptures burned, clergy imprisoned, and sacrifice to the gods enforced on pain of death. Fierce in the East for a decade, it is the last and greatest of the persecutions, ended only by Galerius's edict of toleration in 311 and the Milan agreement of 313.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["florian-of-lorch", "marina-the-great-martyr"],
      resultedIn: ["edict-of-milan"],
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
    preview: "Constantine and Licinius grant Christians freedom of worship across the empire.",
    summary:
      "Meeting at Milan, the emperors Constantine and Licinius agree to grant Christians, and all others, freedom of religion, and to restore confiscated church property. The age of the martyrs gives way to the age of the councils.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["constantine-the-great"],
      precededBy: ["great-persecution"],
      resultedIn: ["first-council-of-nicaea"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["alexander-of-alexandria", "athanasius-the-great"],
      heresies: ["arianism"],
      councils: ["first-nicaea"],
      resultedIn: ["first-council-of-nicaea"],
    },
  },
  {
    id: "he-first-nicaea",
    slug: "first-council-of-nicaea",
    title: "The First Ecumenical Council at Nicaea",
    shortTitle: "Nicaea I",
    aliases: ["First Ecumenical Council", "Council of Nicaea"],
    yearStart: 325,
    displayDate: "May–July 325",
    precision: "year",
    era: "imperial-conciliar",
    categories: ["councils", "doctrine", "heresies"],
    region: "Nicaea, Asia Minor",
    importance: 1,
    preview: "318 fathers confess the Son as homoousios, of one essence with the Father.",
    summary:
      "Summoned by Constantine to answer Arius, the first Ecumenical Council confesses the Son of God as 'of one essence with the Father' (homoousios), issues the first form of the Creed, and sets the reckoning of Pascha.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["athanasius-the-great", "alexander-of-alexandria", "nicholas-the-wonderworker", "spyridon-of-trimythous", "constantine-the-great", "hosius-of-cordova", "eustathius-of-antioch"],
      councils: ["first-nicaea"],
      heresies: ["arianism"],
      theology: ["filioque"],
      precededBy: ["edict-of-milan", "arian-controversy-begins"],
      resultedIn: ["first-council-of-constantinople"],
    },
    media: {
      hero: "/history/media/first-council-of-nicaea.jpg",
      alt: "Fresco of the First Ecumenical Council: the emperor and the assembled fathers with the condemned Arius below",
      work: "Fresco of the First Ecumenical Council, Megalo Meteoron monastery",
      artist: "Photograph by Jjensen",
      workDate: "16th century fresco, photographed 2008",
      source: "Wikimedia Commons",
      license: "CC BY-SA 3.0",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Nikea-arius.png",
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["constantine-the-great"],
      precededBy: ["edict-of-milan"],
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
    preview: "The Creed is completed: 'and in the Holy Spirit, the Lord, the Giver of life.'",
    summary:
      "Summoned by Theodosius after fifty years of Arian reaction, one hundred fifty fathers reaffirm Nicaea and confess the divinity of the Holy Spirit, 'who proceeds from the Father, who with the Father and the Son together is worshipped and glorified.' The Niceno-Constantinopolitan Creed they complete is the creed of every Orthodox Liturgy to this day.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["gregory-theologian", "gregory-of-nyssa", "meletius-of-antioch", "nectarius-of-constantinople", "theodosius-the-great", "cyril-of-jerusalem"],
      councils: ["first-constantinople"],
      heresies: ["arianism", "macedonianism"],
      theology: ["filioque"],
      precededBy: ["first-council-of-nicaea"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["john-chrysostom", "olympias-the-deaconess"],
    },
    media: {
      hero: "/history/media/chrysostom-at-constantinople.jpg",
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
    preview: "Mary is confessed Theotokos: the one born of her is God the Word himself.",
    summary:
      "Against Nestorius, who would divide Christ and call Mary only 'Christotokos,' the council led by Cyril of Alexandria confesses one Christ, and therefore Mary as Theotokos, God-bearer. The title guards not Mary's honor first but the unity of her Son.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["cyril-of-alexandria", "celestine-of-rome", "memnon-of-ephesus", "juvenal-of-jerusalem"],
      councils: ["ephesus"],
      heresies: ["nestorianism"],
      theology: ["the-theotokos"],
      precededBy: ["first-council-of-constantinople"],
      resultedIn: ["council-of-chalcedon"],
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
    preview: "One Christ in two natures, 'without confusion, without change, without division, without separation.'",
    summary:
      "The largest council of antiquity answers Eutyches, for whom Christ's humanity was swallowed in his divinity, with the Definition every Orthodox christology rests on: one and the same Christ, perfect in Godhead and perfect in manhood, made known in two natures without confusion or separation.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["leo-the-great", "anatolius-of-constantinople", "marcian-the-emperor", "pulcheria-the-empress", "juvenal-of-jerusalem"],
      councils: ["chalcedon"],
      heresies: ["eutychianism", "nestorianism"],
      precededBy: ["council-of-ephesus"],
      resultedIn: ["non-chalcedonian-estrangement"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["justinian-the-great", "eutychius-of-constantinople"],
      councils: ["second-constantinople"],
      heresies: ["origenism", "nestorianism"],
      precededBy: ["council-of-chalcedon"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["maximus-the-confessor", "martin-the-confessor", "agatho-of-rome", "sophronius-of-jerusalem"],
      councils: ["third-constantinople"],
      heresies: ["monothelitism"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["john-of-damascus"],
      heresies: ["iconoclasm"],
      resultedIn: ["second-council-of-nicaea"],
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
    preview: "The icons are restored: honor passes to the prototype, and worship belongs to God alone.",
    summary:
      "Under the empress Irene and Patriarch Tarasius, the seventh council distinguishes veneration (proskynesis) from worship (latreia): the honor given an icon passes to the one depicted, while worship belongs to the divine nature alone. The making of icons is not permitted but required, because the Incarnation is real.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["tarasius-of-constantinople", "irene-the-empress", "adrian-of-rome", "john-of-damascus"],
      councils: ["second-nicaea"],
      heresies: ["iconoclasm"],
      precededBy: ["first-iconoclasm"],
      resultedIn: ["second-iconoclasm"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      heresies: ["iconoclasm"],
      precededBy: ["second-council-of-nicaea"],
      resultedIn: ["triumph-of-orthodoxy"],
    },
  },
  {
    id: "he-triumph-of-orthodoxy",
    slug: "triumph-of-orthodoxy",
    title: "The Triumph of Orthodoxy",
    shortTitle: "Triumph of Orthodoxy",
    aliases: ["Restoration of the icons", "Sunday of Orthodoxy"],
    yearStart: 843,
    displayDate: "March 843",
    precision: "traditional",
    era: "iconoclasm",
    categories: ["iconography", "liturgics", "doctrine"],
    region: "Constantinople",
    importance: 1,
    preview: "The icons return in procession to Hagia Sophia; the Church still keeps the feast every first Sunday of Lent.",
    summary:
      "Under the empress Theodora and Patriarch Methodius, a council restores the veneration of the icons, and on the first Sunday of Lent 843 the images are carried in procession into Hagia Sophia. The Church has kept that Sunday ever since as the Sunday of Orthodoxy, reading the Synodikon's memory eternal for the defenders of the faith.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      heresies: ["iconoclasm"],
      precededBy: ["second-iconoclasm"],
    },
    media: {
      hero: "/history/media/triumph-of-orthodoxy.jpg",
      alt: "Icon of the Triumph of Orthodoxy: the Hodegetria icon enthroned with the empress Theodora and the defenders of the icons",
      work: "Icon of the Triumph of Orthodoxy",
      artist: "Unknown iconographer, Constantinople",
      workDate: "circa 1400",
      source: "Wikimedia Commons",
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
    displayDate: "863",
    precision: "year",
    era: "byzantine-expansion",
    categories: ["missions", "scripture", "liturgics"],
    region: "Great Moravia",
    importance: 1,
    preview: "Two brothers from Thessalonica give the Slavs an alphabet, the Scriptures, and the Liturgy in their own tongue.",
    summary:
      "Sent from Constantinople to Great Moravia in 863, the brothers Constantine (Cyril) and Methodius create an alphabet for the Slavonic tongue and translate the Gospels and the services. Their conviction, that every people may praise God in its own language, becomes the charter of all Orthodox mission.",
    certainty: "strongly-supported",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["cyril-and-methodius", "photius-the-great"],
      resultedIn: ["conversion-of-kievan-rus"],
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
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["photius-the-great"],
      theology: ["filioque", "papacy"],
      resultedIn: ["great-schism-1054"],
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
    precision: "traditional",
    era: "byzantine-expansion",
    categories: ["missions", "autocephaly"],
    region: "Kiev",
    importance: 1,
    preview: "'We knew not whether we were in heaven or on earth.' Vladimir's envoys in Hagia Sophia, and a nation is baptized.",
    summary:
      "Prince Vladimir of Kiev, whose envoys reported of the Liturgy in Hagia Sophia that they knew not whether they were in heaven or on earth, is baptized and leads his people into the Dnieper in 988. From that baptism grows the Orthodoxy of the Rus lands, in time the largest of the Orthodox churches.",
    certainty: "traditional-account",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["cyril-and-methodius"],
      precededBy: ["mission-of-cyril-and-methodius"],
    },
  },
  {
    id: "he-great-schism",
    slug: "great-schism-1054",
    title: "The Excommunications of 1054",
    shortTitle: "1054",
    aliases: ["Great Schism", "East–West Schism"],
    yearStart: 1054,
    displayDate: "July 16, 1054",
    precision: "exact",
    calendar: { month: 7, day: 16, basis: "julian" },
    era: "estrangement",
    categories: ["schisms", "doctrine", "patriarchates"],
    region: "Constantinople & Rome",
    importance: 1,
    preview: "Cardinal Humbert lays a bull of excommunication on the altar of Hagia Sophia.",
    summary:
      "Cardinal Humbert deposits a bull excommunicating Patriarch Michael Cerularius on the altar of Hagia Sophia; a Constantinopolitan synod answers in kind. 1054 did not end communion everywhere at once, it is the conventional marker within a centuries-long estrangement over the filioque, papal claims, and diverging practice.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      theology: ["filioque", "papacy"],
      saints: ["photius-the-great"],
      precededBy: ["photian-council"],
      resultedIn: ["sack-of-constantinople-1204"],
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
    preview: "A crusade bound for Egypt takes and plunders the greatest Christian city instead.",
    summary:
      "Diverted from its crusading goal, the Fourth Crusade storms Constantinople on April 12–13, 1204, and sacks it for three days, altars stripped, relics carried west, a Latin empire and patriarchate imposed for half a century. More than any document or anathema, 1204 fixed the schism in the heart of the East.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      theology: ["papacy"],
      precededBy: ["great-schism-1054"],
    },
    media: {
      hero: "/history/media/sack-of-constantinople-1204.jpg",
      alt: "Romantic painting of mounted crusaders entering Constantinople amid smoke and pleading citizens",
      work: "The Entry of the Crusaders into Constantinople",
      artist: "Eugene Delacroix",
      workDate: "1840",
      source: "Wikimedia Commons",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Eug%C3%A8ne_Delacroix_-_Prise_de_Constantinople_par_les_crois%C3%A9s_(12_avril_1204).jpg",
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
    preview: "The councils confirm it: the light of Tabor is uncreated, and man may truly share the life of God.",
    summary:
      "When Barlaam of Calabria mocks the Athonite monks' prayer and their claim to see the divine light, Gregory Palamas answers with the distinction between God's essence, forever beyond participation, and his uncreated energies, in which man really shares. Councils at Constantinople in 1341, 1347, and 1351 receive this as the Church's faith: theosis is real.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["gregory-palamas", "nicholas-cabasilas", "symeon-the-new-theologian"],
      theology: ["theosis"],
      resultedIn: ["philokalia-published"],
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
          alt: "The parchment of the union decree, two columns of Latin and Greek text above a long block of subscriptions, with the emperor's signature in the margin and two lead seals on cords",
          work: "The bull of union Laetentur Caeli, with the subscriptions and the emperor's signature",
          artist: "Papal chancery of Eugenius IV",
          workDate: "6 July 1439",
          source: "Wikimedia Commons",
          license: "Public domain",
          evidenceUrl: "https://commons.wikimedia.org/wiki/File:Union_1439.jpg",
        },
        {
          src: "/history/media/council-of-florence-woodcut.jpg",
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
    preview: "After a fifty-three-day siege, the City falls to Mehmed II; the last emperor dies at the walls.",
    summary:
      "On Tuesday, May 29, 1453, after a siege of fifty-three days, the armies of Sultan Mehmed II break through the Theodosian walls. Emperor Constantine XI dies fighting; Hagia Sophia becomes a mosque; eleven centuries of the Christian Roman Empire end, and the long Ottoman period of Orthodox history begins.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      precededBy: ["council-of-florence"],
      resultedIn: ["moscow-patriarchate-established"],
    },
    media: {
      hero: "/history/media/fall-of-constantinople.jpg",
      alt: "Painting of Mehmed II riding into fallen Constantinople over the bodies of its defenders",
      work: "The Entry of Mehmet II into Constantinople",
      artist: "Jean-Joseph Benjamin-Constant",
      workDate: "1876",
      source: "Wikimedia Commons",
      license: "Public domain",
      evidenceUrl: "https://commons.wikimedia.org/wiki/File:Benjamin-Constant-The_Entry_of_Mahomet_II_into_Constantinople-1876.jpg",
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
    preview: "A thousand years of teaching on prayer of the heart, gathered in one book that quietly renews the Orthodox world.",
    summary:
      "Nikodemos the Hagiorite and Makarios of Corinth gather the great texts on watchfulness and the Jesus Prayer, from the fourth century to Palamas, and publish them at Venice in 1782. Through Paisius Velichkovsky's Slavonic translation the collection kindles the startsy of Optina and a spiritual revival that reaches to the present.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["nikodemos-the-hagiorite", "paisius-velichkovsky"],
      theology: ["theosis"],
      precededBy: ["hesychast-councils"],
      resultedIn: ["alaska-mission"],
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
    preview: "Eight monks from Valaam land on Kodiak Island, Orthodoxy comes to the American continent.",
    summary:
      "On September 24, 1794, a band of monks from the Valaam and Konevits monasteries, the humble Herman among them, lands on Kodiak Island. They catechize in native tongues and defend the Aleut people against the fur company's abuses; from this mission descends all of Orthodoxy in North America.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["paisius-velichkovsky"],
      precededBy: ["philokalia-published"],
      resultedIn: ["oca-autocephaly"],
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
    region: "Russia & Eastern Europe",
    importance: 1,
    preview: "The largest persecution in Christian history: bishops, priests, monastics, and faithful beyond counting.",
    summary:
      "From the Bolshevik revolution of 1917, the Church in Russia, and after 1945 across Eastern Europe, endures confiscation, show trials, the destruction of tens of thousands of churches, and the killing or imprisonment of clergy and faithful on a scale exceeding all the ancient persecutions together. The Church survives, and in 1988 the millennium of the Baptism of Rus is kept openly; the new martyrs are now glorified across the Orthodox world.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial, pending review",
    rel: {
      saints: ["john-of-shanghai", "silouan-the-athonite"],
      precededBy: ["conversion-of-kievan-rus"],
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

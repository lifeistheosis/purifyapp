// Orthodox History — the interactive timeline's index.
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
//   "exact" — an approximate year never becomes a fake calendar date;
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
      "Four councils on the one Christ in two natures — and the long, sorrowful estrangements that followed each definition.",
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
      "From Kodiak Island onward, Orthodoxy becomes a global communion — Alaska, Japan, and the parishes of the new world.",
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
      "Fifty days after the Resurrection, the Holy Spirit descends upon the apostles gathered in Jerusalem. Peter preaches, about three thousand are baptized, and the Church's public life begins — the event Orthodox tradition calls the birthday of the Church.",
    certainty: "traditional-account",
    status: "published",
    reviewedBy: "Purify editorial — pending review",
    rel: {
      saints: ["apostle-peter", "apostle-john", "theotokos"],
      scripture: ["Acts 2:1-41", "Joel 2:28-32", "John 15:26"],
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
      "Meeting at Milan, the emperors Constantine and Licinius agree to grant Christians — and all others — freedom of religion, and to restore confiscated church property. The age of the martyrs gives way to the age of the councils.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial — pending review",
    rel: {
      saints: ["constantine-the-great"],
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
    preview: "318 fathers confess the Son as homoousios — of one essence with the Father.",
    summary:
      "Summoned by Constantine to answer Arius, the first Ecumenical Council confesses the Son of God as 'of one essence with the Father' (homoousios), issues the first form of the Creed, and sets the reckoning of Pascha.",
    certainty: "conciliar-definition",
    status: "published",
    reviewedBy: "Purify editorial — pending review",
    rel: {
      saints: ["athanasius-the-great", "alexander-of-alexandria", "nicholas-the-wonderworker", "spyridon-of-trimythous", "constantine-the-great", "hosius-of-cordova", "eustathius-of-antioch"],
      councils: ["first-nicaea"],
      heresies: ["arianism"],
      theology: ["filioque"],
      precededBy: ["edict-of-milan"],
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
      "Cardinal Humbert deposits a bull excommunicating Patriarch Michael Cerularius on the altar of Hagia Sophia; a Constantinopolitan synod answers in kind. 1054 did not end communion everywhere at once — it is the conventional marker within a centuries-long estrangement over the filioque, papal claims, and diverging practice.",
    certainty: "historically-attested",
    status: "published",
    reviewedBy: "Purify editorial — pending review",
    rel: {
      theology: ["filioque", "papacy"],
      saints: ["photius-the-great"],
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
    reviewedBy: "Purify editorial — pending review",
    rel: {},
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

/** "4th c." — same formatting as lib/saints centuryLabel. */
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

/** Static params for /history/[slug] — published events only. */
export function eventParams(): { slug: string }[] {
  return publishedEvents().map((e) => ({ slug: e.slug }));
}

// Addressable population by market, for the owner dashboard's projection model.
//
// WHY THIS IS A FILE AND NOT A TABLE. It is reference data one person edits a
// few times a year, and every edit is an assumption that later projections
// rest on. In git, changing Greece from 9.5M to 10M is a diff with a date and
// a reason attached. In a table it is an UPDATE nobody can reconstruct. The
// same argument the repo already makes for data/support/support.ts, and the
// reason a projection that cannot show its inputs is worthless.
//
// THREE THINGS THIS MODEL REFUSES TO BLUR.
//
// 1. Eastern Orthodox is not the same communion as Oriental Orthodox. Ethiopia
//    alone is ~36M Tewahedo Christians and Egypt ~9M Copts. Adding them to an
//    Eastern Orthodox total would nearly double the headline number and would
//    be wrong: they are not in communion, their calendar and liturgical books
//    differ, and Purify's corpus is not theirs. They are carried here with
//    their own communion tag and excluded from the primary model by default,
//    because pretending otherwise is the kind of flattering arithmetic that
//    makes a projection useless.
//
// 2. Population is not addressable market. Purify ships in English. A hundred
//    million Russian Orthodox are not reachable by an English-only app, and
//    saying so is the whole point of the international module: each
//    localization converts a blocked pool into an addressable one. That is
//    what `englishReach` encodes, and why the projection multiplies by it.
//
// 3. Nominal affiliation is not practice. Census-style figures count everyone
//    who names the tradition; a prayer app is bought by people who actually
//    pray. `practisingRate` is the haircut, and it is deliberately the crudest
//    number here, which is why it is a slider in the UI rather than a constant.
//
// SOURCES. Population figures are the widely cited Pew Research Center
// estimates (Global Christianity, 2011; Orthodox Christianity in the 21st
// Century, 2017), which remain the standard published baseline. They are a
// decade old and every row says so. Replace any of them the moment better
// sourcing exists; that is what the `source` and `year` fields are for.

export type Communion =
  | "eastern-orthodox"
  | "oriental-orthodox"
  | "roman-catholic";

export type Market = {
  id: string;
  /** Country or diaspora grouping, as it should read in the UI. */
  name: string;
  communion: Communion;
  /** People who identify with the tradition. Not users, not buyers. */
  population: number;
  /**
   * Share reachable by an English-language app today, before any
   * localization. A judgement, not a measurement, and the number the
   * international module exists to move.
   */
  englishReach: number;
  /** Share who practise rather than merely identify. The crudest input here. */
  practisingRate: number;
  /** BCP-47 tag a localization would need. null where English already serves. */
  localeNeeded: string | null;
  source: string;
  year: number;
  /** How much weight the figure itself deserves, separate from the model. */
  confidence: "high" | "medium" | "low";
  note?: string;
};

export const MARKETS: Market[] = [
  // ── English-native, addressable today ────────────────────────────────────
  {
    id: "us-orthodox",
    name: "United States, Orthodox",
    communion: "eastern-orthodox",
    population: 1_800_000,
    englishReach: 0.95,
    practisingRate: 0.35,
    localeNeeded: null,
    source: "Pew Research Center, Orthodox Christianity in the 21st Century",
    year: 2017,
    confidence: "medium",
    note: "Estimates range from about 1.0M to 1.8M depending on whether jurisdictional rolls or self-identification are counted. The higher figure is used and should be treated as the optimistic end.",
  },
  {
    id: "uk-au-ca-orthodox",
    name: "UK, Canada, Australia diaspora",
    communion: "eastern-orthodox",
    population: 1_200_000,
    englishReach: 0.9,
    practisingRate: 0.35,
    localeNeeded: null,
    source: "National census aggregates, various",
    year: 2021,
    confidence: "low",
    note: "Assembled from separate national censuses with different questions. The weakest figure in this table.",
  },

  // ── Large, blocked on language ───────────────────────────────────────────
  {
    id: "russia",
    name: "Russia",
    communion: "eastern-orthodox",
    population: 101_000_000,
    englishReach: 0.05,
    practisingRate: 0.06,
    localeNeeded: "ru",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "medium",
    note: "Largest Orthodox population by a wide margin and the lowest practising rate in this table. Pew's own 2017 work put weekly attendance in Russia at roughly 6%, so nominal affiliation badly overstates the reachable audience here.",
  },
  {
    id: "ukraine",
    name: "Ukraine",
    communion: "eastern-orthodox",
    population: 35_000_000,
    englishReach: 0.08,
    practisingRate: 0.12,
    localeNeeded: "uk",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "low",
    note: "Pre-2022 figure. Displacement since makes both the population and its distribution materially uncertain.",
  },
  {
    id: "romania",
    name: "Romania",
    communion: "eastern-orthodox",
    population: 19_000_000,
    englishReach: 0.12,
    practisingRate: 0.25,
    localeNeeded: "ro",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "medium",
  },
  {
    id: "greece",
    name: "Greece",
    communion: "eastern-orthodox",
    population: 10_000_000,
    englishReach: 0.25,
    practisingRate: 0.3,
    localeNeeded: "el",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "high",
  },
  {
    id: "serbia",
    name: "Serbia",
    communion: "eastern-orthodox",
    population: 6_700_000,
    englishReach: 0.15,
    practisingRate: 0.2,
    localeNeeded: "sr",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "medium",
  },
  {
    id: "bulgaria",
    name: "Bulgaria",
    communion: "eastern-orthodox",
    population: 6_000_000,
    englishReach: 0.15,
    practisingRate: 0.15,
    localeNeeded: "bg",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "medium",
  },
  {
    id: "georgia",
    name: "Georgia",
    communion: "eastern-orthodox",
    population: 3_800_000,
    englishReach: 0.1,
    practisingRate: 0.3,
    localeNeeded: "ka",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "medium",
    note: "High practising rate relative to population. Georgia consistently reports among the highest religiosity in Europe.",
  },
  {
    id: "levant",
    name: "Antiochian / Levant",
    communion: "eastern-orthodox",
    population: 2_000_000,
    englishReach: 0.2,
    practisingRate: 0.3,
    localeNeeded: "ar",
    source: "Patriarchate estimates, various",
    year: 2015,
    confidence: "low",
    note: "Dispersed across Syria, Lebanon, Jordan, Palestine and a large emigrant population. Poorly enumerated everywhere.",
  },

  // ── Secondary / spillover ────────────────────────────────────────────────
  {
    id: "us-catholic",
    name: "United States, Roman Catholic",
    communion: "roman-catholic",
    population: 52_000_000,
    englishReach: 0.85,
    practisingRate: 0.2,
    localeNeeded: null,
    source: "Pew Research Center, Religious Landscape Study",
    year: 2015,
    confidence: "high",
    note: "The market Hallow actually serves. Carried here as spillover, not as a target: a Catholic user of an Orthodox app is a curious minority, not a segment.",
  },

  // ── Different communion. Never in the primary model. ─────────────────────
  {
    id: "ethiopia",
    name: "Ethiopia, Tewahedo",
    communion: "oriental-orthodox",
    population: 36_000_000,
    englishReach: 0.1,
    practisingRate: 0.4,
    localeNeeded: "am",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "medium",
    note: "Oriental Orthodox, not in communion with the Eastern Orthodox churches. Excluded from the primary model by default. Purify's corpus, calendar and liturgical books are not theirs.",
  },
  {
    id: "egypt",
    name: "Egypt, Coptic",
    communion: "oriental-orthodox",
    population: 9_000_000,
    englishReach: 0.15,
    practisingRate: 0.4,
    localeNeeded: "ar",
    source: "Pew Research Center, Global Christianity",
    year: 2011,
    confidence: "low",
    note: "Oriental Orthodox. Same exclusion as Ethiopia. Egyptian Coptic figures are politically contested and range from 5M to 15M.",
  },
];

/**
 * The comparable the whole exercise is measured against.
 *
 * Hallow is the reason a revenue question gets asked at all, and the wrong way
 * to use it is to assume Purify is some fraction of it. The right way is the
 * one this dashboard computes: Hallow serves a market roughly thirty times the
 * size, so equal execution should show up as a far HIGHER penetration rate in
 * a far smaller pool, not as a smaller slice of the same pie.
 */
export const COMPARABLE = {
  name: "Hallow",
  /** Public reporting is a range, not a figure. Both ends are carried. */
  annualRevenueLowUsd: 50_000_000,
  annualRevenueHighUsd: 70_000_000,
  /**
   * Hallow's OWN annual revenue per subscriber, and it has to be its own
   * number rather than a reuse of Purify's.
   *
   * The first version of this model divided Hallow's revenue by whatever
   * Purify's price slider happened to say, which meant Hallow's penetration
   * moved every time Purify changed its own pricing: 14.4% at $40, 10.5% at
   * $55, 8.2% at $70. Hallow's share of its market is a fact about Hallow.
   * Nothing Purify does can move it.
   */
  annualRevenuePerSubscriberUsd: 70,
  /** The pool it sells into: practising US Roman Catholics. */
  addressablePopulation: 52_000_000 * 0.2,
  source: "Press reporting and disclosed funding rounds, 2024 to 2025",
  confidence: "low" as const,
  note: "Hallow is private and does not publish revenue. Treat this as an order of magnitude, and never as the denominator of a precise ratio.",
};

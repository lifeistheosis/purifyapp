// Find a parish (/parishes): the parish directories the Orthodox
// jurisdictions keep themselves, as links out.
//
// Purify has many inquirers and catechumens with no parish yet, and the
// honest help is to send them to the lists the jurisdictions publish. So
// this file is addresses and nothing else. The page draws no map, asks for no
// location, and loads nothing from any of these sites: a reader taps a row
// and the directory opens outside Purify.
//
// WHICH BODIES ARE LISTED IS THE OWNER'S JUDGEMENT, not an engineering one.
// The first list is conservative on purpose: official sites only, of
// canonical Eastern Orthodox churches and the bodies they recognise, and
// nothing whose standing is disputed. In the United States the yardstick was
// membership of the Assembly of Canonical Orthodox Bishops. Do not add a row
// without the owner's word.
//
// EVERY ADDRESS HERE WAS LOADED, never written from memory. `verifiedOn` is
// the day the page was opened and seen to be a parish list or a parish
// search, not a home page. Two directories are missing for that reason and
// not for any other: the Greek Orthodox Archdiocese of America and the
// Antiochian Archdiocese of Australia both refused the request on 2026-10-10
// (a bot check and a block page), so nobody saw what their addresses serve.
// They belong here once someone has opened them by hand.
//
// Names follow each body's own usage where it has an English one. Eight are
// composed and wait on the owner's word: a diocese shown under its mother
// church (the Patriarchal Parishes in the USA, Sourozh, the two dioceses of
// the Church Outside of Russia, the OCA's Archdiocese of Canada, the Serbian
// Metropolitanate of Australia and New Zealand), and the German and Romanian
// metropolises, whose own names are not in English. Within a group the order
// is alphabetical, after any directory several jurisdictions share, so the
// order says nothing about rank.

export type ParishRegionId =
  | "north-america"
  | "uk-ireland"
  | "western-europe"
  | "australia-nz";

export type ParishRegion = {
  id: ParishRegionId;
  /**
   * Catalog key of the group's heading. The page renders it through a
   * computed key, which lib/i18n/__tests__/keysExist.test.ts cannot read, so
   * the closed list lives here and this folder's own test holds it to en.json.
   */
  labelKey: string;
};

export type ParishFinder = {
  /** The body that keeps the directory. See the note on names above. */
  name: string;
  /** The group it is listed under. */
  region: ParishRegionId;
  /** Where its parishes are, in a few plain words. Shown under the name. */
  serves: string;
  /** The directory itself: a parish list or search. https only. */
  url: string;
  /** The day the address was last loaded and looked at, YYYY-MM-DD. */
  verifiedOn: string;
};

/** The groups, in the order the page shows them. */
export const PARISH_REGIONS: ParishRegion[] = [
  { id: "north-america", labelKey: "parishes.region.northAmerica" },
  { id: "uk-ireland", labelKey: "parishes.region.ukIreland" },
  { id: "western-europe", labelKey: "parishes.region.westernEurope" },
  { id: "australia-nz", labelKey: "parishes.region.australiaNz" },
];

export const PARISH_FINDERS: ParishFinder[] = [
  // North America. The Assembly's directory leads because it is the one
  // search that covers every member jurisdiction at once.
  //
  // Canada is in this group and has no heading of its own. Half of these
  // bodies list their Canadian parishes in the same directory as their
  // American ones, so a Canada group holding only the three that keep a
  // directory for Canada alone would hide the rest from a reader there. The
  // line under each name says which countries it covers.
  {
    name: "Assembly of Canonical Orthodox Bishops of the United States of America",
    region: "north-america",
    serves: "United States, every member jurisdiction in one search",
    url: "https://www.assemblyofbishops.org/directories/parishes/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Albanian Orthodox Diocese of the Americas",
    region: "north-america",
    serves: "United States",
    url: "https://albaniandiocese-ep.org/who-we-are/parishes",
    verifiedOn: "2026-10-10",
  },
  {
    name: "American Carpatho-Russian Orthodox Diocese of North America",
    region: "north-america",
    serves: "United States and Canada",
    url: "https://www.acrod.org/directories/search/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Antiochian Orthodox Christian Archdiocese of North America",
    region: "north-america",
    serves: "United States and Canada",
    url: "https://www.antiochian.org/parishes",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Bulgarian Eastern Orthodox Diocese of the USA, Canada and Australia",
    region: "north-america",
    serves: "United States, Canada and Australia",
    url: "https://www.bulgariandiocese.org/parishdirectory",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Greek Orthodox Archdiocese of Canada",
    region: "north-america",
    serves: "Canada",
    url: "https://goarchdiocese.ca/parishes/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Orthodox Church in America",
    region: "north-america",
    serves: "United States, Canada and Mexico",
    url: "https://www.oca.org/parishes",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Orthodox Church in America, Archdiocese of Canada",
    region: "north-america",
    serves: "Canada",
    url: "https://www.archdiocese.ca/communities",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Romanian Orthodox Episcopate of America",
    region: "north-america",
    serves: "United States and Canada",
    url: "https://roea.org/parish-directory/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Romanian Orthodox Metropolia of the Americas",
    region: "north-america",
    serves: "United States and Canada",
    url: "https://www.mitropolia.us/index.php/en/structure/parish-directory",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Russian Orthodox Church Outside of Russia",
    region: "north-america",
    serves: "Worldwide, by country",
    url: "https://directory.synod.com/listings/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Russian Orthodox Church, Patriarchal Parishes in the USA",
    region: "north-america",
    serves: "United States",
    url: "https://mospatusa.com/parishdirectory.html",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Serbian Orthodox Church in North, Central and South America",
    region: "north-america",
    serves: "North, Central and South America",
    url: "https://www.serborth.org/parishes",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Ukrainian Orthodox Church of Canada",
    region: "north-america",
    serves: "Canada",
    url: "https://www.uocc.ca/about/parishes/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Ukrainian Orthodox Church of the USA",
    region: "north-america",
    serves: "United States",
    url: "https://www.uocofusa.org/directories_parishes",
    verifiedOn: "2026-10-10",
  },

  // The United Kingdom and Ireland.
  {
    name: "Antiochian Orthodox Christian Archdiocese of the British Isles and Ireland",
    region: "uk-ireland",
    serves: "United Kingdom and Ireland",
    url: "https://www.antiochian-orthodox.com/parish-directory",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Greek Orthodox Archdiocese of Thyateira and Great Britain",
    region: "uk-ireland",
    serves: "United Kingdom",
    url: "https://www.thyateira.org.uk/category/archdiocese/communities/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Russian Orthodox Church, Diocese of Sourozh",
    region: "uk-ireland",
    serves: "United Kingdom and Ireland",
    url: "https://www.sourozh.org/parishes-eng/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Russian Orthodox Church Outside of Russia, Diocese of Great Britain and Western Europe",
    region: "uk-ireland",
    serves: "United Kingdom and Western Europe",
    url: "https://orthodox-europe.org/english/parishes/",
    verifiedOn: "2026-10-10",
  },

  // Western Europe. Thin by design: most directories here are kept country
  // by country and in the local language, and each one is a judgement.
  {
    name: "Archdiocese of Orthodox Churches of Russian Tradition in Western Europe",
    region: "western-europe",
    serves: "France and Western Europe",
    url: "https://archeveche.eu/en/lieu_type/perishes-and-communities/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Greek Orthodox Metropolis of Germany",
    region: "western-europe",
    serves: "Germany, page in German",
    url: "https://www.orthodoxie.net/kirchengemeinden",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Romanian Orthodox Metropolis of Western and Southern Europe",
    region: "western-europe",
    serves: "Western and Southern Europe, page in Romanian",
    url: "https://www.mitropolia.eu/ro/site/53/",
    verifiedOn: "2026-10-10",
  },

  // Australia and New Zealand.
  {
    name: "Greek Orthodox Archdiocese of Australia",
    region: "australia-nz",
    serves: "Australia",
    url: "https://greekorthodox.org.au/churches/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Russian Orthodox Church Outside of Russia, Diocese of Australia and New Zealand",
    region: "australia-nz",
    serves: "Australia and New Zealand",
    url: "https://rocor.org.au/2-directories/directory/",
    verifiedOn: "2026-10-10",
  },
  {
    name: "Serbian Orthodox Church, Metropolitanate of Australia and New Zealand",
    region: "australia-nz",
    serves: "Australia and New Zealand",
    url: "https://soc.org.au/state/",
    verifiedOn: "2026-10-10",
  },
];

/** The directories grouped for the page, groups and rows in file order. */
export function findersByRegion(): { region: ParishRegion; finders: ParishFinder[] }[] {
  return PARISH_REGIONS.map((region) => ({
    region,
    finders: PARISH_FINDERS.filter((f) => f.region === region.id),
  }));
}

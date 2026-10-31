// The parishes of the United States that a priest or deacon searches in the
// welcome questions (the owner's note 54, 2026-10-31: "a search for the
// parishes in America, and they could pick any in America").
//
// THIS IS A SAMPLE, AND READERS NEVER SEE IT. ./listSwitch.ts keeps the list
// and its search off until a list is permitted; until then the parish screen
// asks readers to write their parish, and this file is never loaded. Should
// the switch be turned on with this sample still here, the screen would mark
// it SAMPLE, and a test refuses that state. No list of every parish is ours
// to copy yet. The Assembly of Canonical Orthodox Bishops keeps the one
// directory of every member jurisdiction (assemblyofbishops.org/directories/
// parishes), but it publishes no terms that let anyone reuse it, and its
// robots.txt shuts automated readers out of /directorycore/, where that
// directory's data is served, so it is not to be scraped. The jurisdictions'
// own directories either reserve every right (the OCA's footer: "All rights
// reserved") or refuse automated readers outright (the Greek Orthodox
// Archdiocese's site answered 403). A parish's name, city and state are facts
// and free to state, but the clean way to a whole list is a yes from whoever
// keeps it; that question is the owner's (Homebase/boards/purify-master/r18/
// BUILD-80-NOTES.md, note 54).
//
// Kept so the search is built and tested: twelve parishes, a cathedral or a
// parish of most of the Assembly's jurisdictions, each read on the parish's
// or its diocese's own website on the day given (`from`). When a permitted
// list arrives it replaces `parishes`, `sample` turns false and `source` names
// who gave it, and the switch is set true; the screen and its search do not
// change. It is imported only by the parish screen, on demand and only with
// the switch on, so it never rides in any other page.
//
// Size: this sample is about 2.5 KB. A full list in this shape (about 70
// bytes a parish, a few thousand parishes at most: the 2020 census of
// American Orthodox parishes counted over 3,000 of every kind, Oriental
// included) would be about 200 KB, in one chunk loaded only by this screen.

export type UsParish = {
  id: string;
  name: string;
  city: string;
  /** The two-letter postal code. */
  state: string;
  /** An id from US_JURISDICTIONS (lib/onboarding/clergy.ts). */
  jurisdiction: string;
  /** Where the name and place were read, for a sample entry. */
  from?: string;
};

export type UsParishList = {
  /** True while this is not the whole list: the screen marks it SAMPLE. */
  sample: boolean;
  /** Where a whole list came from, once there is one. */
  source: string | null;
  checkedOn: string;
  parishes: readonly UsParish[];
};

export const US_PARISH_LIST: UsParishList = {
  sample: true,
  source: null,
  checkedOn: "2026-10-31",
  parishes: [
    {
      id: "oca-washington-st-nicholas",
      name: "St. Nicholas Orthodox Cathedral and National War Memorial Shrine",
      city: "Washington",
      state: "DC",
      jurisdiction: "oca",
      from: "https://www.stnicholasdc.org/",
    },
    {
      id: "goa-new-york-holy-trinity",
      name: "Greek Orthodox Archdiocesan Cathedral of the Holy Trinity",
      city: "New York",
      state: "NY",
      jurisdiction: "goa",
      from: "https://www.thecathedralnyc.org/",
    },
    {
      id: "antiochian-brooklyn-st-nicholas",
      name: "St. Nicholas Antiochian Orthodox Cathedral",
      city: "Brooklyn",
      state: "NY",
      jurisdiction: "antiochian",
      from: "https://stnicholascathedral.org/administration",
    },
    {
      id: "mospat-new-york-st-nicholas",
      name: "St. Nicholas Patriarchal Cathedral",
      city: "New York",
      state: "NY",
      jurisdiction: "mospat",
      from: "https://mospatusa.com/",
    },
    {
      id: "rocor-san-francisco-holy-virgin",
      name: "Holy Virgin “Joy of All Who Sorrow” Cathedral",
      city: "San Francisco",
      state: "CA",
      jurisdiction: "rocor",
      from: "https://www.sfsobor.com/",
    },
    {
      id: "acrod-johnstown-christ-the-saviour",
      name: "Christ The Saviour Orthodox Cathedral",
      city: "Johnstown",
      state: "PA",
      jurisdiction: "acrod",
      from: "https://acrod.org/directories/cathedral",
    },
    {
      id: "serbian-chicago-holy-resurrection",
      name: "Holy Resurrection Serbian Orthodox Cathedral",
      city: "Chicago",
      state: "IL",
      jurisdiction: "serbian-new-gracanica",
      from: "https://newgracanica.org/news/holy-resurrection-serbian-orthodox-cathedral-in-chicago-celebrates-easter-and-cathedral-feast/",
    },
    {
      id: "romanian-chicago-constantine-helen",
      name: "Ss. Constantine and Helen Cathedral",
      city: "Chicago",
      state: "IL",
      jurisdiction: "romanian",
      from: "https://www.mitropolia.us/index.php/en/",
    },
    {
      id: "romanian-andover-st-parascheva",
      name: "St. Parascheva Parish",
      city: "Andover",
      state: "MA",
      jurisdiction: "romanian",
      from: "https://www.mitropolia.us/index.php/en/",
    },
    {
      id: "bulgarian-des-plaines-st-sophia",
      name: "St. Sophia",
      city: "Des Plaines",
      state: "IL",
      jurisdiction: "bulgarian",
      from: "http://www.bulgariandiocese.org/",
    },
    {
      id: "albanian-south-boston-holy-trinity",
      name: "Holy Trinity Albanian Orthodox Church",
      city: "South Boston",
      state: "MA",
      jurisdiction: "albanian",
      from: "https://albaniandiocese-ep.org/who-we-are/parishes",
    },
    {
      id: "albanian-chicago-st-nicholas",
      name: "St. Nicholas Albanian Orthodox Church",
      city: "Chicago",
      state: "IL",
      jurisdiction: "albanian",
      from: "https://albaniandiocese-ep.org/who-we-are/parishes",
    },
  ],
};

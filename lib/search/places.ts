// The places search can be turned to (1.8, the owner's pick of r3-12: "C,
// with the mix of B").
//
// C draws search as one full screen, the same from anywhere, and before
// anything is typed it shows "Look in": the library's doors in the app's own
// pictures, each narrowing the search to its part of the library, Everything
// first. B gave each place its own kinds as an underlined strip to narrow
// further. His mix: opened from inside a place, the screen starts turned to
// that place's door, with that place's kinds under the doors.
//
// A door is a part of the library and its picture (the one Discover's band or
// the section's own head wears). Its kinds are the strip under it. A place is
// the name a caller gives (lib/search/open.ts): most are a door, and one is a
// door with a kind already chosen (the dictionary is Theology's Dictionary).
//
// Pure: no React, no catalog. The screen says the keys in the reader's
// language; lib/search/__tests__/places.test.ts holds the keys to en.json.

import type { SearchGroup } from "./types";

export type DoorId = "all" | "bible" | "saints" | "prayers" | "reading" | "theology" | "councils" | "history" | "shop";

export type Door = {
  id: DoorId;
  /** The catalog line that names it. */
  labelKey: string;
  /** Its picture, a path under public/. Everything has none: it wears the Purify mark. */
  picture?: string;
  /** Where the picture's square sits (CSS object-position), when its middle misses the faces. */
  focus?: string;
};

/**
 * The doors, in the order "Look in" lists them before anything is typed.
 * Each picture is the one the app already shows for the place: Discover's
 * bands (public/discover/tiles), and for the Bible and Prayers, which have no
 * band, their sections' own heads (public/sections).
 */
export const DOORS: readonly Door[] = [
  { id: "all", labelKey: "shop.everything" },
  { id: "bible", labelKey: "nav.bible", picture: "/sections/bible.jpg" },
  { id: "saints", labelKey: "nav.saints", picture: "/discover/tiles/saints.webp", focus: "50% 20%" },
  { id: "prayers", labelKey: "nav.prayers", picture: "/sections/prayers.v4.jpg", focus: "50% 22%" },
  { id: "reading", labelKey: "nav.reading", picture: "/discover/tiles/reading.v2.webp" },
  { id: "theology", labelKey: "discover.tile.theology", picture: "/discover/tiles/theology.v2.webp" },
  { id: "councils", labelKey: "nav.councils", picture: "/discover/tiles/councils.v2.webp", focus: "50% 15%" },
  { id: "history", labelKey: "search.group.history", picture: "/discover/tiles/history.v2.webp" },
  { id: "shop", labelKey: "nav.shop", picture: "/discover/tiles/shop.v2.webp", focus: "50% 10%" },
];

export function doorOf(id: DoorId): Door {
  return DOORS.find((d) => d.id === id) ?? DOORS[0];
}

/** The kinds a door's strip can narrow to. */
export type KindId =
  | "doctrine"
  | "topics"
  | "heresies"
  | "apologetics"
  | "councils"
  | "fathers"
  | "dictionary"
  | "saints"
  | "writings"
  | "rules"
  | "akathists"
  | "chants"
  | "lessons"
  | "plans"
  | "walkthroughs";

/** Each kind under the name the app already gives it. */
export const KIND_LABEL: Readonly<Record<KindId, string>> = {
  doctrine: "study.doctrine",
  topics: "discover.tile.topics",
  heresies: "discover.tile.heresies",
  apologetics: "discover.tile.apologetics",
  councils: "nav.councils",
  fathers: "bible.fathersTag",
  dictionary: "dictionary.title",
  saints: "nav.saints",
  writings: "saints.writings",
  rules: "prayers.bookTitle",
  akathists: "prayers.akathists",
  chants: "chants.title",
  lessons: "ui.learnToPray",
  plans: "plans.title",
  walkthroughs: "nav.discoverMenu.walkthroughs",
};

/**
 * B's strip, door by door. Theology's are the library's own kinds, in the
 * order its search listed them (lib/theology/searchKinds.ts), with the
 * dictionary after them. A door with one kind (the Bible, History, the Shop)
 * has no strip.
 */
export const DOOR_KINDS: Readonly<Partial<Record<DoorId, readonly KindId[]>>> = {
  theology: ["doctrine", "topics", "heresies", "apologetics", "councils", "fathers", "dictionary"],
  saints: ["saints", "writings"],
  prayers: ["rules", "akathists", "chants", "lessons"],
  reading: ["writings", "plans", "walkthroughs"],
  councils: ["councils", "heresies"],
};

/** Where the search starts: a door, and a kind on its strip or none. */
export type Turn = { door: DoorId; kind: KindId | null };

/**
 * The names a caller may give `openSearch` (lib/search/open.ts). Each door is
 * a place under its own name; the dictionary opens Theology at its
 * Dictionary. Another surface rebuilt later calls one of these, never a door
 * id it made up: a name not here opens on Everything.
 */
export const PLACES: Readonly<Record<string, Turn>> = {
  all: { door: "all", kind: null },
  bible: { door: "bible", kind: null },
  saints: { door: "saints", kind: null },
  prayers: { door: "prayers", kind: null },
  reading: { door: "reading", kind: null },
  theology: { door: "theology", kind: null },
  councils: { door: "councils", kind: null },
  history: { door: "history", kind: null },
  shop: { door: "shop", kind: null },
  dictionary: { door: "theology", kind: "dictionary" },
};

export const EVERYTHING: Turn = PLACES.all;

/** The turn a place's name gives, or Everything for a name the search does not know. */
export function turnFor(place: string | undefined): Turn {
  if (!place) return EVERYTHING;
  return PLACES[place.toLowerCase()] ?? EVERYTHING;
}

/**
 * The place an address is in, for an opening that names none (the bar's
 * magnifier). The first segment decides: /heresies/arianism is Theology, as
 * its pill says, and /chants is in Prayers, where the tab bar lights it.
 */
const PATH_PLACE: Readonly<Record<string, string>> = {
  bible: "bible",
  saints: "saints",
  prayers: "prayers",
  chants: "prayers",
  reading: "reading",
  plans: "reading",
  florilegium: "reading",
  walkthroughs: "reading",
  theology: "theology",
  topics: "theology",
  heresies: "theology",
  apologetics: "theology",
  "fathers-on": "theology",
  "who-said-it": "theology",
  dictionary: "dictionary",
  councils: "councils",
  history: "history",
  shop: "shop",
};

export function placeForPath(pathname: string | null | undefined): string {
  const first = (pathname ?? "").split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? "";
  return PATH_PLACE[first] ?? "all";
}

/**
 * Catalog key per result group in Everything. The group values are stable
 * English identifiers in the list, so the heading is looked up rather than
 * printed, and those that already exist in the nav are reused.
 */
export const GROUP_LABEL: Readonly<Record<SearchGroup, string>> = {
  Bible: "nav.bible",
  Saints: "nav.saints",
  Reading: "nav.reading",
  Prayers: "nav.prayers",
  "Councils & Heresies": "search.group.councilsHeresies",
  History: "search.group.history",
  Topics: "nav.topics",
  Settings: "nav.settings",
  Other: "search.group.other",
};

/** The door a group's rows live behind, for a picture when a row has none of its own. */
export const GROUP_DOOR: Readonly<Record<SearchGroup, DoorId | null>> = {
  Bible: "bible",
  Saints: "saints",
  Reading: "reading",
  Prayers: "prayers",
  "Councils & Heresies": "councils",
  History: "history",
  Topics: "theology",
  Settings: null,
  Other: null,
};

/**
 * Each door's own line before anything is typed, where it has one the app
 * already says: the Bible's examples of a reference, History's of a name, a
 * place or a year.
 */
export const DOOR_HINT: Readonly<Partial<Record<DoorId, string>>> = {
  bible: "bible.tryExamples",
  history: "study.searchByNamePlaceYear",
};

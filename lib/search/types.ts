// Client-safe types and constants for the command palette. Kept separate
// from buildCorpus.ts so the client component can import the shape and group
// order without pulling the server-only corpus builder (and its fs-backed
// topic loader) into the browser bundle.

export type SearchGroup =
  | "Bible"
  | "Saints"
  | "Reading"
  | "Prayers"
  | "Councils & Heresies"
  | "History"
  | "Topics"
  | "Settings"
  | "Other";

export type SearchItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  group: SearchGroup;
  /** Extra terms folded into matching (bynames, alternate names). */
  keywords?: string;
  /**
   * The catalog key `label` was read from, where it was read from one. The
   * list is written in English for every language; with the key the palette
   * can show the row as the reader's own catalog says it
   * (lib/search/match.ts, inReadersLanguage).
   */
  labelKey?: string;
  /** The same for `sublabel`. */
  sublabelKey?: string;
  /**
   * When the sublabel counts something ("21 chapters"), the count: the key
   * is then a plural one, and each language says the number its own way.
   */
  sublabelCount?: number;
};

/** The order result groups render in. Bible first, as the spec asks. */
export const GROUP_ORDER: SearchGroup[] = [
  "Bible",
  "Saints",
  // The works of the Fathers, under the name the Reading hub gives them.
  "Reading",
  "Prayers",
  "Councils & Heresies",
  "History",
  "Topics",
  // Screens, then settings: "calendar" should offer the Church calendar
  // before the setting that picks its reckoning.
  "Other",
  "Settings",
];

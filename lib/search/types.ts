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

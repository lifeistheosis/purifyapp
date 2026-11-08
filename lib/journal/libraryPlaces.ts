// Where held words are Purify's library (1.9, Quote in journal,
// docs/1.9-build/JOURNAL.md): a prayer, a saint's life, a Father's work, a
// chant, a council, the catechism, history, a topic, a plan's guide, the
// Bible's commentary. Words held anywhere else (a Community post, the shop, an
// account screen, a reader's own gatherings) are not the library's, and are
// never offered as a quote marked "Quoted from Purify's library".
//
// Pure, so the test reads the same list the pill does.

/** The first segment of every page whose words are the library's. */
export const LIBRARY_PLACES: readonly string[] = [
  "prayers",
  "saints",
  "chants",
  "councils",
  "catechism",
  "theology",
  "apologetics",
  "heresies",
  "history",
  "topics",
  "fathers-on",
  "reading",
  "calendar",
  "plans",
  "bible",
];

/** Is a page at `pathname` one of the library's? */
export function isLibraryPlace(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return LIBRARY_PLACES.includes(first);
}

type Cited = { closest?: (selector: string) => { id?: string; getAttribute?: (name: string) => string | null } | null };

/**
 * The way back to a held block: the page, and the nearest place on it with an
 * id, so the journal's Open lands on the words.
 */
export function heldHref(pathname: string, held: Cited | null): string {
  const anchor = held?.closest?.("[id]")?.id;
  return anchor && /^[A-Za-z0-9\-_]{1,80}$/.test(anchor) ? `${pathname}#${anchor}` : pathname;
}

/**
 * The name a held block's quote is cited by: what the page says it is
 * (`data-cite` on the page, or the block's own), else the page's heading.
 */
export function heldCite(held: Cited | null, doc: { querySelector: (s: string) => { textContent?: string | null; getAttribute?: (name: string) => string | null } | null }): string {
  const own = held?.closest?.("[data-cite]")?.getAttribute?.("data-cite");
  if (own) return own.trim();
  const page = doc.querySelector("[data-cite]")?.getAttribute?.("data-cite");
  if (page) return page.trim();
  return (doc.querySelector("main h1")?.textContent ?? doc.querySelector("h1")?.textContent ?? "").replace(/\s+/g, " ").trim();
}

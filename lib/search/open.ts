// The one way the app opens its search (1.8, the owner's pick of r3-12: "C,
// with the mix of B").
//
// Search is one full screen, the same from anywhere (components/search/
// CommandPalette.tsx, mounted once in the root frame). Opened from inside a
// place it starts turned to that place, so a caller names the place it stands
// in: `openSearch("theology")` from Theology, `openSearch("bible")` from the
// Bible. With no place named, the screen reads the place from the address
// the reader is on, so the bar's magnifier on Theology opens on Theology too,
// and anywhere that is not a place opens on Everything. `openSearch("all")`
// opens on Everything wherever the reader is.
//
// A CustomEvent on window rather than context, because the callers and the
// screen are mounted in different trees (a page's own field, the bar, a
// sheet) and the screen renders nothing until it is opened. The names a place
// may take are in ./places.ts (PLACES); a name it does not know opens on
// Everything rather than failing.

/** Dispatched on window to open the search from anywhere. */
export const SEARCH_OPEN_EVENT = "purify:search-open";

/** What an opening says: the place it was opened from, when it names one. */
export type SearchOpenDetail = { place?: string };

/** Open the one search, turned to `place` when one is given. */
export function openSearch(place?: string): void {
  if (typeof window === "undefined") return;
  const detail: SearchOpenDetail = place ? { place } : {};
  window.dispatchEvent(new CustomEvent<SearchOpenDetail>(SEARCH_OPEN_EVENT, { detail }));
}

/** The place an opening named, read safely from any event that arrives under the name. */
export function placeOf(event: Event): string | undefined {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!detail || typeof detail !== "object") return undefined;
  const place = (detail as { place?: unknown }).place;
  return typeof place === "string" && place.trim() ? place.trim() : undefined;
}

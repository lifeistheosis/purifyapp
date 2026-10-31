/**
 * Open Purify's one search (1.8, the owner's pick of r3-12, "C with B mixed
 * in"): from inside a place it opens turned to that place, so Theology asks
 * with openSearch("theology"). The search listens for the event on window,
 * so a screen reaches it without importing it.
 */
export function openSearch(place?: string): void {
  window.dispatchEvent(new CustomEvent("purify:search-open", { detail: { place } }));
}

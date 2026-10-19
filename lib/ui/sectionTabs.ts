/**
 * Which part of a page with parts is open (1.7): the phone page frame's
 * switch (components/layout/SectionTabs.tsx), first worn by a saint's page.
 *
 * The open part is kept in the address's # (a saint's #writings), written
 * with history.replaceState, so going back to the page opens the part the
 * reader left, and back still leaves the page. Read in the page's first
 * render on the device, so a reader coming back from a work finds Writings
 * already open when lib/ui/returnPlace.ts looks for the row they tapped.
 *
 * No element on such a page may have the part's name as its id: a browser
 * scrolls a #name in the address to that element, and the router does too.
 */

/** The part a # names, if the page has it, else the page's first part. */
export function tabFromHash<T extends string>(hash: string, tabs: readonly T[]): T {
  let name = hash.replace(/^#/, "");
  try {
    name = decodeURIComponent(name);
  } catch {
    // A # that is not valid percent-encoding names no part.
  }
  name = name.trim().toLowerCase();
  return (tabs as readonly string[]).includes(name) ? (name as T) : tabs[0];
}

/** The # for a part: none for the first, so the page's plain address stays plain. */
export function hashFor<T extends string>(tab: T, tabs: readonly T[]): string {
  return tab === tabs[0] ? "" : `#${tab}`;
}

/**
 * The next part for a key on the switch, or null for any other key. Arrows
 * follow the reading direction: in Arabic and Urdu the next part is to the
 * left. Home and End go to the ends, and the arrows wrap.
 */
export function tabForKey(key: string, current: number, count: number, rtl: boolean): number | null {
  if (count < 1) return null;
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const backward = rtl ? "ArrowRight" : "ArrowLeft";
  if (key === forward) return (current + 1) % count;
  if (key === backward) return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

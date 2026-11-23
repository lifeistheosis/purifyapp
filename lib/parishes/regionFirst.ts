// Find a parish: the reader's own region first (the owner's yes of 2026-11-23,
// docs/plans/onboarding-2.0.md, "Where the roads end").
//
// The page's four regions stood in one order for everyone, so a reader in
// Britain or Australia scrolled past fifteen American and Canadian
// directories to reach their own. The region a reader's phone is set to now
// stands first. It is told from the device's own time zone, on the device:
// nothing is asked, nothing is kept and nothing leaves. It is not a location
// (the page still asks for none): a time zone names a part of the world the
// size of a country or a continent, and it is a setting the app reads already
// for the calendar's day.
//
// Only the regions move. The bodies in a region, their names and their order
// inside it stay as lib/parishes/finders.ts has them, so the order still says
// nothing of rank. A zone this file does not know leaves the page's own order.
//
// Pure, so the rule is tested directly (./__tests__/regionFirst.test.ts).

import type { ParishRegionId } from "./finders";

/** The British Isles' zones, which "Europe/" alone would send to Western Europe. */
const UK_IRELAND = new Set(["Europe/London", "Europe/Dublin", "Europe/Belfast", "Europe/Jersey", "Europe/Guernsey", "Europe/Isle_of_Man"]);
const NEW_ZEALAND = new Set(["Pacific/Auckland", "Pacific/Chatham", "Antarctica/McMurdo"]);

/**
 * The region of the page a time zone belongs to, or null for one the page has
 * no region for (Asia, Africa, the rest of the Pacific), which keeps the
 * page's own order. The Americas are one region on the page, as the Serbian
 * diocese of North, Central and South America is listed there.
 */
export function regionOfTimeZone(zone: string | null | undefined): ParishRegionId | null {
  if (!zone) return null;
  if (UK_IRELAND.has(zone)) return "uk-ireland";
  if (zone.startsWith("Australia/") || NEW_ZEALAND.has(zone)) return "australia-nz";
  if (zone.startsWith("Europe/")) return "western-europe";
  if (zone.startsWith("America/") || zone.startsWith("US/") || zone.startsWith("Canada/")) return "north-america";
  return null;
}

/**
 * The regions' places with `first` moved to the front and the rest as they
 * stood: the indexes of `ids` in the order to draw them. With no region, or
 * one that is not on the page, the order is untouched.
 */
export function regionOrder(ids: readonly ParishRegionId[], first: ParishRegionId | null): number[] {
  const all = ids.map((_, i) => i);
  const at = first ? ids.indexOf(first) : -1;
  return at <= 0 ? all : [at, ...all.filter((i) => i !== at)];
}

const bare = (pathname: string) => pathname.replace(/\/+$/, "") || "/";

/**
 * Whether the page now showing is the one the document itself was loaded on:
 * a page opened from outside (a search engine, a link, the app waking on it),
 * which the server drew before any script ran. `loaded` is the address the
 * browser recorded for the document's own load; with no record, the page is
 * taken for one opened from outside, which is the side that never reorders.
 */
export function loadedOn(loaded: string | null | undefined, now: string): boolean {
  if (!loaded) return true;
  try {
    return bare(new URL(loaded, now).pathname) === bare(new URL(now).pathname);
  } catch {
    return true;
  }
}

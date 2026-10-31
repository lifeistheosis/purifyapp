/**
 * Visits counted by country and by region, with the few things the map's
 * card says about each: where its readers are, how they arrived, and what
 * they read on.
 *
 * Sheet r3-15, Traffic A with C's zoom (the owner's pick, 2026-10-30): "Do A,
 * but allow you to zoom in like how C's mobile has it. So zoom into a
 * specific country." And his note 31: a heat map of where readers are, a card
 * with all of a country's numbers, and a tap into its states or provinces.
 * Sessions keep the country, the region and the city (lib/analytics/geo.ts),
 * so the regions are there from the first row.
 *
 * Every visit comes in already put into words (lib/admin/arrivals.ts): the
 * route does that on the server for a window of sessions, and the stats route
 * already sends the words for the readers on the site now, so the same tally
 * draws Now and a month alike.
 *
 * Pure.
 */

export type Visit = {
  /** ISO alpha-2, upper case, or null when the lookup found no country. */
  code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  /** Where from, in the panel's words: "Google", "Direct", "Opened the app". */
  from: string;
  /** What on: "Android app", "Website, phone". */
  on: string;
};

export type Count = { name: string; count: number };

export type Place = {
  /** The country's code, or the region's name inside a country. */
  key: string;
  name: string;
  visits: number;
  /** The country's regions, or the region's cities: the most first. */
  places: Count[];
  from: Count[];
  on: Count[];
};

function top(m: Map<string, number>, keep: number): Count[] {
  return [...m.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, keep);
}

function bump(m: Map<string, number>, key: string | null | undefined) {
  const k = key?.trim();
  if (!k) return;
  m.set(k, (m.get(k) ?? 0) + 1);
}

type Acc = { name: Map<string, number>; visits: number; places: Map<string, number>; from: Map<string, number>; on: Map<string, number> };

function fold(acc: Map<string, Acc>, key: string, name: string | null, place: string | null, v: Visit) {
  const a = acc.get(key) ?? { name: new Map(), visits: 0, places: new Map(), from: new Map(), on: new Map() };
  a.visits += 1;
  bump(a.name, name);
  bump(a.places, place);
  bump(a.from, v.from);
  bump(a.on, v.on);
  acc.set(key, a);
}

function finish(acc: Map<string, Acc>, keep: number, fallbackName: (key: string) => string): Place[] {
  return [...acc.entries()]
    .map(([key, a]) => ({
      key,
      name: top(a.name, 1)[0]?.name ?? fallbackName(key),
      visits: a.visits,
      places: top(a.places, keep),
      from: top(a.from, keep),
      on: top(a.on, keep),
    }))
    .sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));
}

/** Every country with a visit, the most visited first. A visit with no country is left out and counted in `unplaced`. */
export function tallyCountries(visits: readonly Visit[], keep = 3): { countries: Place[]; unplaced: number } {
  const acc = new Map<string, Acc>();
  let unplaced = 0;
  for (const v of visits) {
    const code = v.code?.trim().toUpperCase();
    if (!code || !/^[A-Z]{2}$/.test(code)) {
      unplaced += 1;
      continue;
    }
    fold(acc, code, v.country, v.region, v);
  }
  return { countries: finish(acc, keep, (k) => k), unplaced };
}

/**
 * One country's regions, the most visited first, each with its cities. A
 * visit in the country with no region is counted in `unplaced`.
 */
export function tallyRegions(visits: readonly Visit[], code: string, keep = 4): { regions: Place[]; unplaced: number; total: number } {
  const want = code.trim().toUpperCase();
  const acc = new Map<string, Acc>();
  let unplaced = 0;
  let total = 0;
  for (const v of visits) {
    if (v.code?.trim().toUpperCase() !== want) continue;
    total += 1;
    const region = v.region?.trim();
    if (!region) {
      unplaced += 1;
      continue;
    }
    fold(acc, region, region, v.city, v);
  }
  return { regions: finish(acc, keep, (k) => k), unplaced, total };
}

/** A count list as the card reads it: "Bucuresti 54, Iasi 22, Cluj 17". */
export function countsLine(counts: readonly Count[]): string {
  return counts.map((c) => `${c.name} ${c.count.toLocaleString("en-US")}`).join(", ");
}

/** Region names compared the way the shapes and the lookups both write them. */
export function sameRegion(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/^state of /, "")
      .replace(/[^a-z]/g, "");
  return norm(a) === norm(b);
}

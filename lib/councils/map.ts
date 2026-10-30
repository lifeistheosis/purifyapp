import outline from "@/data/maps/mediterranean.json";
import { eraForYear, publishedEvents, type Era, type HistoryEventMeta } from "@/lib/history/events";
import { EVENT_PLACES } from "@/lib/history/places";

import { COUNCILS, type Council } from "./councils";
import { placeOf } from "./page";

/**
 * The councils on a map (1.8, the owner's word of 2026-10-24). Each council
 * where it met, by the place's own coordinates, on Natural Earth's coastline
 * of the Mediterranean and Asia Minor (data/maps/mediterranean.json, public
 * domain). Councils that met in one city share one mark, and the list under
 * the map names them all, so a mark is never a guess at which council it is.
 * The history page draws the same marks with its events beside them, on a
 * taller cut that reaches Kyiv and Moscow (lib/history/map.ts).
 *
 * From 1.8's round 3 (the owner's pick C of r3-10, "the atlas") the map is a
 * door on the page and a screen of its own: its steps are the rows of the
 * atlas's wheel, one for each council (and on History each event), in order
 * of time, each with what led to it (MapStep below).
 */

export type Side = "left" | "right" | "up" | "down";

/** Where each council met: latitude, longitude of the city, and its name on the map. */
export const COUNCIL_PLACES: Readonly<Record<string, { place: string; lat: number; lon: number; side?: Side }>> = {
  "first-nicaea": { place: "Nicaea", lat: 40.429, lon: 29.721 },
  "second-nicaea": { place: "Nicaea", lat: 40.429, lon: 29.721 },
  "first-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "second-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "third-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "constantinople-394": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // Across the Bosphorus from the city: one mark on a map this size.
  chalcedon: { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  ephesus: { place: "Ephesus", side: "left", lat: 37.941, lon: 27.342 },
  "ancyra-314": { place: "Ancyra", side: "down", lat: 39.933, lon: 32.859 },
  "neocaesarea-315": { place: "Neocaesarea", lat: 40.585, lon: 36.951 },
  gangra: { place: "Gangra", side: "up", lat: 40.601, lon: 33.614 },
  laodicea: { place: "Laodicea", lat: 37.835, lon: 29.107 },
  "antioch-268": { place: "Antioch", lat: 36.202, lon: 36.16 },
  "antioch-341": { place: "Antioch", lat: 36.202, lon: 36.16 },
  sardica: { place: "Sardica", lat: 42.698, lon: 23.322 },
  "carthage-256": { place: "Carthage", lat: 36.853, lon: 10.323 },
  "carthage-419": { place: "Carthage", lat: 36.853, lon: 10.323 },
  "orange-529": { place: "Orange", lat: 44.138, lon: 4.807 },
  "jerusalem-1672": { place: "Jerusalem", lat: 31.778, lon: 35.235 },
};

type Outline = { view: number[]; box: number[]; land: string };

/** The sums that put a latitude and longitude on an outline (data/maps): equirectangular, scaled for latitude 37. */
export function projectorFor(cut: Outline): (lat: number, lon: number) => { x: number; y: number } {
  const [lon0, lon1, , lat1] = cut.box;
  const cos = Math.cos((37 * Math.PI) / 180);
  const k = cut.view[0] / ((lon1 - lon0) * cos);
  return (lat, lon) => ({ x: (lon - lon0) * cos * k, y: (lat1 - lat) * k });
}

/** A point on the councils' map, by the outline's own sums. */
export const project = projectorFor(outline);

/** One thing listed under a mark: a council or an event, where it opens, and its year. */
export type MapItem = { href: string; name: string; year: number };

export type MapPlace = {
  id: string;
  /** The place's name over its items in the list. */
  place: string;
  /** A shorter name on the map itself, where two places share a mark. */
  label?: string;
  x: number;
  y: number;
  side: Side;
  items: MapItem[];
};

/**
 * One row of the atlas's wheel: a council, or on History an event, at its
 * place in time. Every word is the registry's own English, as the rest of an
 * account is; the screen looks up only its own words (the eras' names).
 */
export type MapStep = {
  href: string;
  /** The row's name: a council's byname, an event's short title (its title when that is only a year, "1054"). */
  name: string;
  year: number;
  /** Its date where that says more than the year ("Summer 325", "c. 46–62"). */
  date?: string;
  /** Where, as its account says it ("Nicaea in Bithynia", "Asia Minor & Greece"). */
  where: string;
  era: Era;
  /** Its mark on this map, or null for an event beyond it (Alaska, America). */
  mark: string | null;
  /** The name its mark carries while this is the latest thing lit there, where that is not the mark's own (Nicomedia, then Nicaea). */
  at?: string;
  /** The marks of what led here, the app's own "What led here" (rel.precededBy): a thread is drawn from each, never from anywhere else. */
  from: string[];
  council?: true;
};

export function placeId(place: string): string {
  return place.toLowerCase().replace(/[^a-z]+/g, "-");
}

/** Put an item under its place's mark, making the mark on first use. */
export function addToMark(
  marks: Map<string, MapPlace>,
  at: { place: string; side?: Side; x: number; y: number },
  item: MapItem,
): void {
  const id = placeId(at.place);
  if (!marks.has(id)) marks.set(id, { id, place: at.place, side: at.side ?? "right", x: at.x, y: at.y, items: [] });
  marks.get(id)!.items.push(item);
}

/**
 * A council's own account among History's events: the event that names it,
 * happened where it met, over years that hold its year. The Sixth Council sat
 * from November 680 to September 681, so its account starts in 680 and the
 * council is dated 681; until 1.8's round 3 only the same year counted, and
 * History's map listed that council twice. An event that names a council but
 * happened elsewhere (Arius at Alexandria, the estrangement after Chalcedon)
 * is not its account.
 */
export function councilAccount(c: Pick<Council, "slug" | "year">, events: HistoryEventMeta[] = publishedEvents()): HistoryEventMeta | undefined {
  const met = COUNCIL_PLACES[c.slug]?.place;
  if (!met) return undefined;
  return events.find((e) => {
    if (!e.rel?.councils?.includes(c.slug)) return false;
    const at = EVENT_PLACES[e.slug];
    return at !== undefined && at !== "beyond" && at.place === met && c.year >= e.yearStart && c.year <= (e.yearEnd ?? e.yearStart);
  });
}

/** A step before its threads are known: the events it stands for on the map, and what led to them. */
export type StepSource = MapStep & { stands: string[]; ledBy: string[] };

/** A council as a row of the wheel: its account's date and age where it has one, else its year's. */
export function councilSource(c: Council, mark: string, account: HistoryEventMeta | undefined): StepSource {
  return {
    href: `/councils/${c.slug}`,
    name: c.byname,
    year: c.year,
    ...(account && account.displayDate !== String(c.year) ? { date: account.displayDate } : {}),
    where: placeOf(c.location),
    era: account?.era ?? eraForYear(c.year).id,
    mark,
    at: COUNCIL_PLACES[c.slug]?.place,
    from: [],
    council: true,
    stands: account ? [account.slug] : [],
    ledBy: account?.rel?.precededBy ?? [],
  };
}

/**
 * The steps in order of time, each with its threads: from the mark of every
 * step that stands for an event in its "What led here", never its own mark.
 * In one year what led to a step comes first (Ukraine's autocephaly, then
 * the schism it led to); otherwise the order given holds.
 */
export function stepsFrom(sources: StepSource[], places: MapPlace[]): MapStep[] {
  const named = new Map(places.map((p) => [p.id, p.label ?? p.place]));
  const standsFor = new Map<string, StepSource>();
  for (const s of sources) for (const slug of s.stands) standsFor.set(slug, s);
  const depth = new Map<StepSource, number>();
  const depthOf = (s: StepSource, path: Set<StepSource>): number => {
    const known = depth.get(s);
    if (known !== undefined) return known;
    let d = 0;
    for (const slug of s.ledBy) {
      const before = standsFor.get(slug);
      if (before && before !== s && before.year === s.year && !path.has(before)) {
        d = Math.max(d, depthOf(before, new Set(path).add(s)) + 1);
      }
    }
    depth.set(s, d);
    return d;
  };
  const ordered = sources
    .map((s, i) => ({ s, i, d: depthOf(s, new Set()) }))
    .sort((a, b) => a.s.year - b.s.year || a.d - b.d || a.i - b.i)
    .map((o) => o.s);
  return ordered.map((s) => {
    const from = [...new Set(s.ledBy.map((slug) => standsFor.get(slug)?.mark ?? null))].filter(
      (m): m is string => m !== null && m !== s.mark,
    );
    const own = s.mark ? named.get(s.mark) : undefined;
    const step: MapStep = { href: s.href, name: s.name, year: s.year, where: s.where, era: s.era, mark: s.mark, from };
    if (s.date) step.date = s.date;
    if (s.at && s.mark && s.at !== own) step.at = s.at;
    if (s.council) step.council = true;
    return step;
  });
}

/** The marks: one per city, its councils in order of year; and the councils as the atlas's steps. */
export function councilMap(): { view: [number, number]; land: string; places: MapPlace[]; steps: MapStep[] } {
  const marks = new Map<string, MapPlace>();
  const events = publishedEvents();
  const sources: StepSource[] = [];
  for (const c of [...COUNCILS].sort((a, b) => a.year - b.year)) {
    const at = COUNCIL_PLACES[c.slug];
    if (!at) continue;
    addToMark(marks, { ...at, ...project(at.lat, at.lon) }, { href: `/councils/${c.slug}`, name: c.byname, year: c.year });
    sources.push(councilSource(c, placeId(at.place), councilAccount(c, events)));
  }
  const places = [...marks.values()];
  return { view: outline.view as [number, number], land: outline.land, places, steps: stepsFrom(sources, places) };
}

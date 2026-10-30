import outline from "@/data/maps/church-history.json";
import { COUNCILS } from "@/lib/councils/councils";
import {
  COUNCIL_PLACES,
  addToMark,
  councilAccount,
  councilSource,
  placeId,
  projectorFor,
  stepsFrom,
  type MapItem,
  type MapPlace,
  type MapStep,
  type Side,
  type StepSource,
} from "@/lib/councils/map";

import { publishedEvents, type HistoryEventMeta } from "./events";
import { EVENT_PLACES } from "./places";

/**
 * History on the map (1.8, the owner's yes of 2026-10-24): every event of the
 * timeline at the place where it happened, with the councils, on one year
 * slider. The cut is taller than the councils' own map, latitude 28 to 57,
 * so the Baptism of Rus' and Moscow are on it (data/maps/church-history.json).
 * Where each event happened is ./places.ts. Alaska and America are off this
 * map, so they are listed under it.
 */
export { EVENT_PLACES };

const project = projectorFor(outline);
/** Marks closer than this, in the map's own units, are drawn as one. */
const NEAR = 14;

export type HistoryMap = { view: [number, number]; land: string; places: MapPlace[]; beyond: MapItem[]; steps: MapStep[] };

/** An event as a row of the atlas's wheel. */
function eventSource(e: HistoryEventMeta, mark: string | null, place: string | undefined): StepSource {
  const short = e.shortTitle ?? e.title;
  return {
    href: `/history/${e.slug}`,
    // "1054" beside the year 1054 says nothing: the title says what happened.
    name: /^\d+$/.test(short) ? e.title : short,
    year: e.yearStart,
    ...(e.displayDate !== String(e.yearStart) ? { date: e.displayDate } : {}),
    where: e.region ?? place ?? "",
    era: e.era,
    mark,
    at: place,
    from: [],
    stands: [e.slug],
    ledBy: e.rel?.precededBy ?? [],
  };
}

/**
 * The marks, councils and events together, each place's items in order of
 * year, and the same as the atlas's steps. An event that is a council's own
 * account (lib/councils/map.ts, councilAccount: it names the council,
 * happened where it met, over years that hold the council's) is not listed
 * twice: the council stands for it, with the account's date and what led to
 * it. Two places too close to tell apart share one mark: both names head its
 * list, and the map carries the one with more to it (a council's city on a
 * tie), so the label stays short in a crowded corner.
 */
export function historyMap(): HistoryMap {
  type Entry = { at: { place: string; side?: Side; x: number; y: number }; item: MapItem; source: StepSource };
  const events = publishedEvents();
  const entries: Entry[] = [];
  const accounts = new Set<string>();
  for (const c of COUNCILS) {
    const at = COUNCIL_PLACES[c.slug];
    if (!at) continue;
    const account = councilAccount(c, events);
    if (account) accounts.add(account.slug);
    entries.push({
      at: { ...at, ...project(at.lat, at.lon) },
      item: { href: `/councils/${c.slug}`, name: c.byname, year: c.year },
      source: councilSource(c, placeId(at.place), account),
    });
  }
  const beyond: MapItem[] = [];
  const beyondSources: StepSource[] = [];
  for (const e of events) {
    const at = EVENT_PLACES[e.slug];
    const item = { href: `/history/${e.slug}`, name: e.shortTitle ?? e.title, year: e.yearStart };
    if (!at || accounts.has(e.slug)) continue;
    if (at === "beyond") {
      beyond.push(item);
      beyondSources.push(eventSource(e, null, undefined));
      continue;
    }
    entries.push({ at: { ...at, ...project(at.lat, at.lon) }, item, source: eventSource(e, placeId(at.place), at.place) });
  }
  entries.sort((a, b) => a.item.year - b.item.year);

  // One mark per place, then places too near one another drawn as one.
  const marks = new Map<string, MapPlace>();
  for (const { at, item } of entries) addToMark(marks, at, item);
  const merged: MapPlace[] = [];
  /** The mark each place's own ended up in (its id changes as names join it). */
  const into = new Map<string, MapPlace>();
  for (const mark of marks.values()) {
    const near = merged.find((m) => Math.hypot(m.x - mark.x, m.y - mark.y) < NEAR);
    if (!near) {
      const own = { ...mark, items: [...mark.items] };
      merged.push(own);
      into.set(mark.id, own);
      continue;
    }
    const weight = (m: MapPlace) => m.items.length + (m.items.some((i) => i.href.startsWith("/councils/")) ? 0.5 : 0);
    near.label = weight(mark) > weight(near) ? mark.place : near.place;
    near.place = `${near.place} and ${mark.place}`;
    near.id = placeId(near.place);
    near.items = [...near.items, ...mark.items].sort((a, b) => a.year - b.year);
    into.set(mark.id, near);
  }
  beyond.sort((a, b) => a.year - b.year);

  const sources = [
    ...entries.map(({ source }) => (source.mark ? { ...source, mark: into.get(source.mark)?.id ?? source.mark } : source)),
    ...beyondSources,
  ].sort((a, b) => a.year - b.year);
  return { view: outline.view as [number, number], land: outline.land, places: merged, beyond, steps: stepsFrom(sources, merged) };
}

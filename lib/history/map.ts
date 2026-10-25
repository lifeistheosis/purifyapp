import outline from "@/data/maps/church-history.json";
import { COUNCILS } from "@/lib/councils/councils";
import { COUNCIL_PLACES, addToMark, placeId, projectorFor, type MapItem, type MapPlace, type Side } from "@/lib/councils/map";

import { publishedEvents } from "./events";

/**
 * History on the map (1.8, the owner's yes of 2026-10-24): every event of the
 * timeline at the place where it happened, with the councils, on one year
 * slider. The cut is taller than the councils' own map, latitude 28 to 57,
 * so the Baptism of Rus' and Moscow are on it (data/maps/church-history.json).
 * Each place is set by hand from the event's own account; an event that
 * spans an empire is placed where it began (the Great Persecution at
 * Nicomedia, where the first edict was posted). Alaska and America are off
 * this map, so they are listed under it.
 */
export const EVENT_PLACES: Readonly<Record<string, { place: string; lat: number; lon: number; side?: Side } | "beyond">> = {
  pentecost: { place: "Jerusalem", lat: 31.778, lon: 35.235 },
  "council-of-jerusalem": { place: "Jerusalem", lat: 31.778, lon: 35.235 },
  // The journeys set out from Antioch (Acts 13:1-3) and came back to it.
  "missions-of-apostle-paul": { place: "Antioch", lat: 36.202, lon: 36.16 },
  "neronian-persecution": { place: "Rome", lat: 41.902, lon: 12.496 },
  // Taken from Antioch to die in Rome.
  "martyrdom-of-ignatius": { place: "Rome", lat: 41.902, lon: 12.496 },
  "martyrdom-of-polycarp": { place: "Smyrna", side: "left", lat: 38.419, lon: 27.129 },
  "apologies-of-justin-martyr": { place: "Rome", lat: 41.902, lon: 12.496 },
  "irenaeus-against-heresies": { place: "Lyons", lat: 45.764, lon: 4.836 },
  // The Inner Mountain by the Red Sea, where St Anthony's monastery stands.
  "anthony-and-the-desert": { place: "The desert of Egypt", lat: 28.924, lon: 32.348 },
  // Above its mark: Nicaea's mark is the same one, between Constantinople's
  // name and Gangra's.
  "great-persecution": { place: "Nicomedia", side: "up", lat: 40.767, lon: 29.917 },
  "edict-of-milan": { place: "Milan", lat: 45.464, lon: 9.19 },
  "arian-controversy-begins": { place: "Alexandria", lat: 31.2, lon: 29.918 },
  "first-council-of-nicaea": { place: "Nicaea", lat: 40.429, lon: 29.721 },
  "foundation-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "first-council-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "chrysostom-at-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "council-of-ephesus": { place: "Ephesus", side: "left", lat: 37.941, lon: 27.342 },
  "council-of-chalcedon": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // Egypt, Syria and Armenia: placed at Alexandria, the see of the first to part.
  "non-chalcedonian-estrangement": { place: "Alexandria", lat: 31.2, lon: 29.918 },
  "second-council-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "third-council-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "first-iconoclasm": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "second-council-of-nicaea": { place: "Nicaea", lat: 40.429, lon: 29.721 },
  "second-iconoclasm": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "triumph-of-orthodoxy": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // Velehrad, the seat of St Methodius in Great Moravia.
  "mission-of-cyril-and-methodius": { place: "Great Moravia", lat: 49.104, lon: 17.394 },
  "photian-council": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "conversion-of-kievan-rus": { place: "Kyiv", lat: 50.45, lon: 30.523 },
  "great-schism-1054": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "sack-of-constantinople-1204": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  // The councils of 1341 to 1351 met in the city.
  "hesychast-councils": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "council-of-florence": { place: "Florence", lat: 43.77, lon: 11.256 },
  "fall-of-constantinople": { place: "Constantinople and Chalcedon", side: "left", lat: 41.008, lon: 28.978 },
  "moscow-patriarchate-established": { place: "Moscow", lat: 55.756, lon: 37.617 },
  // Gathered on the Holy Mountain, printed in Venice: the Mountain's.
  "philokalia-published": { place: "Mount Athos", lat: 40.157, lon: 24.326 },
  "alaska-mission": "beyond",
  "bolshevik-persecution": { place: "Moscow", lat: 55.756, lon: 37.617 },
  "oca-autocephaly": "beyond",
  "ukrainian-autocephaly": { place: "Kyiv", lat: 50.45, lon: 30.523 },
  "moscow-constantinople-schism-2018": { place: "Moscow", lat: 55.756, lon: 37.617 },
};

const project = projectorFor(outline);
/** Marks closer than this, in the map's own units, are drawn as one. */
const NEAR = 14;

export type HistoryMap = { view: [number, number]; land: string; places: MapPlace[]; beyond: MapItem[] };

/**
 * The marks, councils and events together, each place's items in order of
 * year. An event that is the account of a council (it names the council, met
 * where it met, the same year) is not listed twice: the council stands for
 * it. Two places too close to tell apart share one mark: both names head its
 * list, and the map carries the one with more to it (a council's city on a
 * tie), so the label stays short in a crowded corner.
 */
export function historyMap(): HistoryMap {
  type Entry = { at: { place: string; side?: Side; x: number; y: number }; item: MapItem; council?: string };
  const entries: Entry[] = [];
  for (const c of COUNCILS) {
    const at = COUNCIL_PLACES[c.slug];
    if (at) entries.push({ at: { ...at, ...project(at.lat, at.lon) }, item: { href: `/councils/${c.slug}`, name: c.byname, year: c.year }, council: c.slug });
  }
  const beyond: MapItem[] = [];
  for (const e of publishedEvents()) {
    const at = EVENT_PLACES[e.slug];
    const item = { href: `/history/${e.slug}`, name: e.shortTitle ?? e.title, year: e.yearStart };
    if (!at) continue;
    if (at === "beyond") {
      beyond.push(item);
      continue;
    }
    const sameAsCouncil = (e.rel?.councils ?? []).some((slug) => {
      const c = COUNCILS.find((x) => x.slug === slug);
      return c && c.year === e.yearStart && COUNCIL_PLACES[slug]?.place === at.place;
    });
    if (!sameAsCouncil) entries.push({ at: { ...at, ...project(at.lat, at.lon) }, item });
  }
  entries.sort((a, b) => a.item.year - b.item.year);

  // One mark per place, then places too near one another drawn as one.
  const marks = new Map<string, MapPlace>();
  for (const { at, item } of entries) addToMark(marks, at, item);
  const merged: MapPlace[] = [];
  for (const mark of marks.values()) {
    const near = merged.find((m) => Math.hypot(m.x - mark.x, m.y - mark.y) < NEAR);
    if (!near) {
      merged.push({ ...mark, items: [...mark.items] });
      continue;
    }
    const weight = (m: MapPlace) => m.items.length + (m.items.some((i) => i.href.startsWith("/councils/")) ? 0.5 : 0);
    near.label = weight(mark) > weight(near) ? mark.place : near.place;
    near.place = `${near.place} and ${mark.place}`;
    near.id = placeId(near.place);
    near.items = [...near.items, ...mark.items].sort((a, b) => a.year - b.year);
  }
  beyond.sort((a, b) => a.year - b.year);
  return { view: outline.view as [number, number], land: outline.land, places: merged, beyond };
}

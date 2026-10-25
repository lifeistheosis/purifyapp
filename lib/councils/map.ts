import outline from "@/data/maps/mediterranean.json";

import { COUNCILS } from "./councils";

/**
 * The councils on a map (1.8, the owner's word of 2026-10-24). Each council
 * where it met, by the place's own coordinates, on Natural Earth's coastline
 * of the Mediterranean and Asia Minor (data/maps/mediterranean.json, public
 * domain). Councils that met in one city share one mark, and the list under
 * the map names them all, so a mark is never a guess at which council it is.
 * The history page draws the same marks with its events beside them, on a
 * taller cut that reaches Kyiv and Moscow (lib/history/map.ts).
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

/** The marks: one per city, its councils in order of year. */
export function councilMap(): { view: [number, number]; land: string; places: MapPlace[] } {
  const marks = new Map<string, MapPlace>();
  for (const c of [...COUNCILS].sort((a, b) => a.year - b.year)) {
    const at = COUNCIL_PLACES[c.slug];
    if (!at) continue;
    addToMark(marks, { ...at, ...project(at.lat, at.lon) }, { href: `/councils/${c.slug}`, name: c.byname, year: c.year });
  }
  return { view: outline.view as [number, number], land: outline.land, places: [...marks.values()] };
}

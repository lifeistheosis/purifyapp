import outline from "@/data/maps/mediterranean.json";

import { COUNCILS, type Council } from "./councils";

/**
 * The councils on a map (1.8, the owner's word of 2026-10-24). Each council
 * where it met, by the place's own coordinates, on Natural Earth's coastline
 * of the Mediterranean and Asia Minor (data/maps/mediterranean.json, public
 * domain). Councils that met in one city share one mark, and the list under
 * the map names them all, so a mark is never a guess at which council it is.
 */

/** Where each council met: latitude, longitude of the city, and its name on the map. */
export const COUNCIL_PLACES: Readonly<Record<string, { place: string; lat: number; lon: number; side?: "left" | "up" | "down" }>> = {
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

const [LON0, , , LAT1] = outline.box as [number, number, number, number];
const [W, H] = outline.view as [number, number];
const COS = Math.cos((37 * Math.PI) / 180);
const LON_SPAN = (outline.box[1] - LON0);
const K = W / (LON_SPAN * COS);

/** A point on the map, by the outline's own sums. */
export function project(lat: number, lon: number): { x: number; y: number } {
  return { x: (lon - LON0) * COS * K, y: (LAT1 - lat) * K };
}

export type MapPlace = { id: string; place: string; x: number; y: number; side: "left" | "right" | "up" | "down"; councils: Pick<Council, "slug" | "byname" | "year">[] };

/** The marks: one per city, its councils in order of year. */
export function councilMap(): { view: [number, number]; land: string; places: MapPlace[] } {
  const byPlace = new Map<string, MapPlace>();
  for (const c of [...COUNCILS].sort((a, b) => a.year - b.year)) {
    const at = COUNCIL_PLACES[c.slug];
    if (!at) continue;
    const id = at.place.toLowerCase().replace(/[^a-z]+/g, "-");
    if (!byPlace.has(id)) byPlace.set(id, { id, place: at.place, side: at.side ?? "right", ...project(at.lat, at.lon), councils: [] });
    byPlace.get(id)!.councils.push({ slug: c.slug, byname: c.byname, year: c.year });
  }
  return { view: [W, H], land: outline.land, places: [...byPlace.values()] };
}

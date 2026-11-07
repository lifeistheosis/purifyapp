import outline from "@/data/maps/church-history.json";
import { projectorFor } from "@/lib/councils/map";

import type { ChronologyEntry } from "./load";
import { EVENT_PLACES } from "./places";

/**
 * The Thread (1.9, Purify Plus; the owner's words of 2026-11-06: "for plus
 * users ... they get the timeline ... the same timeline that we have on a
 * saint's life ... more immersive", and his extras of 2026-11-07: a map that
 * follows, and each quote opening its source).
 *
 * An event's own steps (its chronology, data/history/<slug>.json), each with
 * its year and the place where it happened, placed on the history map's own
 * outline (data/maps/church-history.json) so the Thread's small map can move
 * to it. A step's place is the one its own words name, from a list being
 * drawn up step by step (STEP_PLACES below, empty until it is checked); a
 * step that names none happened at the event's own place
 * (lib/history/places.ts). The steps themselves stay free as the article's
 * plain list; the Thread is how Plus follows them.
 */

export type ThreadPlace = { name: string; x: number; y: number };
export type ThreadStep = ChronologyEntry & {
  /** The step's first year, for the Thread's year column, or null if its date has none. */
  year: string | null;
  /** Where the step happened, only when its own words name it; never the event's place lent to it. */
  place: ThreadPlace | null;
};

/** An event's Thread: its steps, and its own place, where the map stands for a step that names none. */
export type EventThreadData = { home: ThreadPlace | null; steps: ThreadStep[] };

type StepPlaces = {
  places: Record<string, { name: string; lat: number; lon: number }>;
  steps: Record<string, (string | null)[]>;
};

/** Each step's own place where its words name one. Empty: every step stands at its event's place. */
const PLACES: StepPlaces = { places: {}, steps: {} };
const project = projectorFor(outline);

/** The first year a step's date line names: "6 July 1439" is 1439, "March–July 1794" is 1794. */
export function stepYear(date: string): string | null {
  return /\b(\d{3,4})\b/.exec(date)?.[1] ?? null;
}

function at(name: string, lat: number, lon: number): ThreadPlace {
  const { x, y } = project(lat, lon);
  return { name, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/**
 * An event's Thread: each step with its year and, where its own words name
 * one, its place; and the event's own place, where the map stands for a step
 * that names none. A step is never given the event's place as its own: the
 * Council of Lyons did not meet at Florence.
 */
export function eventThread(slug: string, entries: readonly ChronologyEntry[]): EventThreadData {
  const own = EVENT_PLACES[slug];
  const home = own && own !== "beyond" ? at(own.place, own.lat, own.lon) : null;
  const keys = PLACES.steps[slug] ?? [];
  const steps = entries.map((e, i) => {
    const key = keys[i];
    const named = key ? PLACES.places[key] : undefined;
    return { ...e, year: stepYear(e.date), place: named ? at(named.name, named.lat, named.lon) : null };
  });
  return { home, steps };
}

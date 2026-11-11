import STEP_PLACES from "@/data/maps/history-step-places.json";
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
 * to it. A step's place is the one its own words name
 * (data/maps/history-step-places.json: 67 of the 183 steps; a region, a title or
 * a place off the map's edge names none). A step that names none has none;
 * the map then stays where it was, unnamed (components/history/EventThread.tsx).
 * The steps themselves stay free as the article's plain list; the Thread is
 * how Plus follows them.
 */

export type ThreadPlace = { name: string; x: number; y: number };
export type ThreadStep = ChronologyEntry & {
  /** The step's first year, or null if its date has none. */
  year: string | null;
  /** Where the step happened, only when its own words name it; never the event's place lent to it. */
  place: ThreadPlace | null;
} & StepWhen;

/** An event's Thread: its steps, and its own place, where the map stands for a step that names none. */
export type EventThreadData = { home: ThreadPlace | null; steps: ThreadStep[] };

type StepPlaces = {
  places: Record<string, { name: string; lat: number; lon: number }>;
  steps: Record<string, (string | null)[]>;
};

/** Each step's own place, where its words name one. */
const PLACES = STEP_PLACES as StepPlaces;
const project = projectorFor(outline);

/** The first year a step's date line names: "6 July 1439" is 1439, "March–July 1794" is 1794. */
export function stepYear(date: string): string | null {
  return /\b(\d{3,4})\b/.exec(date)?.[1] ?? null;
}

/** What a step says of when and where, beside it and over its words. */
export type StepWhen = {
  /** The year column: the step's year where the years change, else nothing. */
  mark: string | null;
  /** The line over the step's words: what its year does not say, and its place. */
  line: string;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CALENDAR_WORD = /^(?:\d{1,2}|January|February|March|April|May|June|July|August|September|October|November|December|Spring|Summer|Autumn|Winter|Early|Mid|Late|to|or|and)$/;

/** Whether words before a year only name its days, months or season ("19 April", "Late April", "8 October to 13 December"). */
function onlyDaysAndMonths(words: string): boolean {
  const parts = words.split(/[\s/,\u2013-]+/).filter(Boolean);
  return parts.length > 0 && parts.every((w) => CALENDAR_WORD.test(w));
}

/**
 * Each step's year said once (build 93 note 5: each step's year stood twice,
 * "867" beside it and "867" again over its words). The year column marks the
 * year where it changes, and the line over the words says what the year does
 * not: "19 April 1054" is 1054 in the column and "19 April" over the words,
 * and the steps after it in 1054 say only their day. A date that is its year
 * alone, or "c." and its year, stands in the column. A date whose words do
 * more than name a day, a month or a season before the year ("About 150",
 * "Between 356 and 362", "1937–1938", "988, by the Chronicle") keeps its
 * words whole over the step, and the column leaves that step blank, so no
 * date is cut into pieces and none is said twice. The place the step's own
 * words name follows, after a middle dot.
 */
export function stepWhen(steps: readonly { date: string; year: string | null; place: ThreadPlace | null }[]): StepWhen[] {
  let said: string | null = null;
  return steps.map(({ date, year, place }) => {
    let mark: string | null = null;
    let rest = date;
    if (year) {
      const y = escape(year);
      const before = new RegExp(`^(.*\\S)\\s+${y}$`).exec(date);
      if (date === year) {
        mark = year;
        rest = "";
      } else if (new RegExp(`^c\\.\\s*${y}$`).test(date)) {
        mark = `c. ${year}`;
        rest = "";
      } else if (before && onlyDaysAndMonths(before[1])) {
        mark = year;
        rest = before[1];
      }
    }
    if (mark !== null) {
      if (mark === said) mark = null;
      else said = mark;
    } else if (year) {
      // Said whole over the step: the next step of the same year marks nothing.
      said = year;
    }
    return { mark, line: [rest, place?.name].filter(Boolean).join(" · ") };
  });
}

/**
 * The history map draws one mark for Constantinople and Chalcedon, the two
 * cities facing each other across the Bosporus, and names it for both
 * (lib/history/places.ts). A Thread's map names its event's own city in its
 * corner (build 93 note 5): every event placed there happened in
 * Constantinople, but for the council of 451.
 */
const BOSPORUS = "Constantinople and Chalcedon";
export function ownCity(slug: string, place: string): string {
  if (place !== BOSPORUS) return place;
  return slug === "council-of-chalcedon" ? "Chalcedon" : "Constantinople";
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
  const home = own && own !== "beyond" ? at(ownCity(slug, own.place), own.lat, own.lon) : null;
  const keys = PLACES.steps[slug] ?? [];
  const placed = entries.map((e, i) => {
    const key = keys[i];
    const named = key ? PLACES.places[key] : undefined;
    return { ...e, year: stepYear(e.date), place: named ? at(named.name, named.lat, named.lon) : null };
  });
  const when = stepWhen(placed);
  return { home, steps: placed.map((s, i) => ({ ...s, ...when[i] })) };
}

// Shared search/filter semantics for the Orthodox History timeline.
// Pure functions over the registry, the same logic drives the native
// Android shell, mobile web, tablet, and desktop, so results never diverge
// across platforms. UI shells differ; this file does not.

import {
  HISTORY_ERAS,
  centuryOf,
  type Certainty,
  type Era,
  type EventCategory,
  type HistoryEventMeta,
} from "./events";

export type TimelineFilterState = {
  era?: Era;
  categories: EventCategory[];
  certainty?: Certainty;
  century?: number;
  query: string;
};

export const EMPTY_FILTERS: TimelineFilterState = {
  categories: [],
  query: "",
};

export function hasActiveFilters(f: TimelineFilterState): boolean {
  return Boolean(f.era || f.categories.length || f.certainty || f.century || f.query.trim());
}

/** Case-insensitive match across title, aliases, preview, summary, region,
 *  year, and display date. Mirrors the LIKE semantics of the device index. */
export function matchesQuery(e: HistoryEventMeta, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    e.title,
    e.shortTitle ?? "",
    ...(e.aliases ?? []),
    e.preview,
    e.summary,
    e.region ?? "",
    e.displayDate,
    String(e.yearStart),
    e.yearEnd ? String(e.yearEnd) : "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

export function applyFilters(
  events: HistoryEventMeta[],
  f: TimelineFilterState,
): HistoryEventMeta[] {
  return events.filter((e) => {
    if (f.era && e.era !== f.era) return false;
    if (f.categories.length && !f.categories.some((c) => e.categories.includes(c))) return false;
    if (f.certainty && e.certainty !== f.certainty) return false;
    if (f.century) {
      const start = centuryOf(e.yearStart);
      const end = centuryOf(e.yearEnd ?? e.yearStart);
      if (f.century < start || f.century > end) return false;
    }
    if (!matchesQuery(e, f.query)) return false;
    return true;
  });
}

/** Title-first ranking for the search surfaces (same scoring idea as the
 *  command palette: title hit beats body hit). */
export function searchEvents(
  events: HistoryEventMeta[],
  query: string,
  limit = 20,
): HistoryEventMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { e: HistoryEventMeta; score: number }[] = [];
  for (const e of events) {
    const title = e.title.toLowerCase();
    const aliases = (e.aliases ?? []).join(" ").toLowerCase();
    let score: number | null = null;
    if (title.startsWith(q)) score = 0;
    else if (title.includes(q) || aliases.includes(q)) score = 1;
    else if (matchesQuery(e, q)) score = 2;
    if (score !== null) scored.push({ e, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.e.yearStart - b.e.yearStart)
    .slice(0, limit)
    .map((s) => s.e);
}

export type EraGroup = {
  era: (typeof HISTORY_ERAS)[number];
  events: HistoryEventMeta[];
};

/** Chronological era groups, skipping eras emptied by the active filters. */
export function groupByEra(events: HistoryEventMeta[]): EraGroup[] {
  const groups: EraGroup[] = [];
  for (const era of HISTORY_ERAS) {
    const inEra = events.filter((e) => e.era === era.id);
    if (inEra.length) groups.push({ era, events: inEra });
  }
  return groups;
}

// The events either side of one on the line, for the foot of its page
// (components/history/EventRelations.tsx, "Earlier" and "Later").
//
// Each thing once on a screen (the owner's word, 2026-11-22): an event already
// standing in the page's chain of events, under "What led here" or "What flowed
// from it", is not named again as the one before or after it. The nearest event
// on that side that the chain does not hold stands there instead, so every page
// keeps a way along the line. Pentecost showed "Paul's missions" twice, under
// "What flowed from it" and under "Later" (found 2026-11-23).

import type { HistoryEventMeta } from "./events";

export type AlongTheLine = { prev: HistoryEventMeta | null; next: HistoryEventMeta | null };

/** `line` is the published events in their order; `meta` the event whose page this is. */
export function alongTheLine(line: readonly HistoryEventMeta[], meta: HistoryEventMeta): AlongTheLine {
  const at = line.findIndex((e) => e.slug === meta.slug);
  if (at < 0) return { prev: null, next: null };
  const shown = new Set([...(meta.rel?.precededBy ?? []), ...(meta.rel?.resultedIn ?? [])]);
  let p = at - 1;
  while (p >= 0 && shown.has(line[p].slug)) p--;
  let n = at + 1;
  while (n < line.length && shown.has(line[n].slug)) n++;
  return { prev: p >= 0 ? line[p] : null, next: n < line.length ? line[n] : null };
}

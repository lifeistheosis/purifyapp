// The date-keyed window the page bakes, in the VerseOfDayCard pattern.
//
// WHY A WINDOW. The native app is a static export: a server component
// renders once, at build time, and whatever it resolved for "today" is
// frozen into the bundle for the life of that install. So the page does not
// resolve today. It bakes one entry per civil date for a run of days, both
// reckonings each, and the client picks its own day out of the table after
// mount. Web renders per request and needs only a few days to cover either
// side of UTC; the export carries a long runway.
//
// Pure given a bank. bank.ts is the server-only caller that supplies the
// questions and the source resolver; a test supplies a fixture.

import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

import { addDaysIso, isoFromDate } from "./dates";
import { pickDaily, type CalendarLookup } from "./select";
import type { ClientQuestion, DailyWindow, Question, Reckoning } from "./types";

const RECKONINGS: Reckoning[] = ["new", "old"];

/** How many days the window carries: a long runway for the export, a few for the web. */
export function windowDaysFor(staticExport: boolean): number {
  return staticExport ? 400 : 3;
}

export const WINDOW_DAYS = windowDaysFor(IS_STATIC_EXPORT);

/**
 * The first key of a window built now. A day back, so a reader behind UTC
 * still finds their local day in the table.
 */
export function windowStart(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
  return addDaysIso(isoFromDate(d), -1);
}

/** `days` consecutive "YYYY-MM-DD" keys from `start` inclusive. */
export function windowKeys(start: string, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) out.push(addDaysIso(start, i));
  return out;
}

/**
 * The window for `keys`: five ids per reckoning per day, and every question
 * those ids name, resolved once. A question `toClient` cannot resolve (a
 * source that no longer exists) is dropped from every set it was drawn
 * into rather than shipped with a dead link.
 */
export function buildDailyWindow(
  bank: readonly Question[],
  keys: readonly string[],
  toClient: (q: Question) => ClientQuestion | null,
  calendar?: CalendarLookup,
): DailyWindow {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const questions: Record<string, ClientQuestion> = {};
  const unresolvable = new Set<string>();
  const days: DailyWindow["days"] = {};

  const resolve = (id: string): boolean => {
    if (questions[id]) return true;
    if (unresolvable.has(id)) return false;
    const q = byId.get(id);
    const client = q ? toClient(q) : null;
    if (!client) {
      unresolvable.add(id);
      return false;
    }
    questions[id] = client;
    return true;
  };

  for (const key of keys) {
    const entry: Record<Reckoning, string[]> = { new: [], old: [] };
    for (const reckoning of RECKONINGS) {
      entry[reckoning] = pickDaily(bank, key, reckoning, calendar).filter(resolve);
    }
    days[key] = entry;
  }
  return { days, questions };
}

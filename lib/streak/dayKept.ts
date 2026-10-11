// The moment a day is kept: the one mark that lights today's flame.
//
// The streak store (./useStreak.ts) hears every change to the ledger, and most
// of them are not that moment: the second thing a reader does in a day, a
// single prayer marked inside a rule, the sync bringing in what another device
// did this morning. The phone gives its soft tick (lib/ui/softTick.ts) for one
// of them only: the mark made here, just now, that turns the flame from
// pending to lit.
//
// Pure, so it is tested with plain values (__tests__/dayKept.test.ts).

import type { DayKey } from "@/lib/rhythm/dayKey";

/**
 * Whether a ledger event is a mark this device has just made for `today`.
 *
 * A mark made here says which rule and which day: markRuleCompletedToday in
 * lib/prayers/storage.ts names today, and write in lib/rhythm/marks.ts names
 * the latest day in that strand's list, which is today for a mark made today.
 * (If the list already holds a later day, from a clock set back or a flight
 * west across midnight, that mark is not taken for today's: a tick missed,
 * never a wrong one.) The sync merging
 * another device's marks (lib/prayers/sync.ts), and a single prayer marked
 * inside a rule, send the bare event with nothing in it.
 */
export function isOwnMark(detail: unknown, today: DayKey): boolean {
  return typeof detail === "object" && detail !== null && (detail as { date?: unknown }).date === today;
}

/**
 * Judge one change to the ledger.
 *
 * `litOn` is the day the flame was last known lit, `kept` is whether today
 * is kept now that the change has landed, and `own` is whether the change is
 * a mark made here. Answers the day to remember, and whether to tick.
 *
 * A change that is not the reader's own still lights the flame, silently, so
 * nothing they do afterwards the same day is taken for the mark that kept it.
 */
export function dayKept(
  litOn: DayKey | null,
  today: DayKey,
  kept: boolean,
  own: boolean,
): { litOn: DayKey | null; tick: boolean } {
  if (!kept || litOn === today) return { litOn, tick: false };
  return { litOn: today, tick: own };
}

import boardJson from "@/data/changelog/board.json";

/**
 * The board message at the top of /whats-new.
 *
 * This used to be hand-written prose living inside the page component, and it
 * was only rewritten when a large patch shipped. That meant it went stale
 * between big releases: it was still introducing Beta 1.7 and the history
 * timeline while the app had moved on to Beta 2.5, eight releases later.
 *
 * From 2026-07-26 it is a WEEKLY message instead, kept as data so writing one
 * is editing a JSON file rather than editing a page. Patch notes are unchanged
 * and still live in `data/changelog/patches.json`: notes say what shipped, the
 * board says how the week went. The two are deliberately different jobs.
 *
 * Add a new entry to the TOP of `data/changelog/board.json` each week. The
 * newest by date wins, so an out-of-order entry cannot quietly take over.
 *
 * Pure data, no fs, so it works in the static export the Android app bundles.
 */

export type BoardMessage = {
  /** ISO week label, e.g. "2026-W31". Human bookkeeping, not used for sorting. */
  week: string;
  /** YYYY-MM-DD. This is what sorts. */
  date: string;
  eyebrow: string;
  headline: string;
  /** One string per paragraph. */
  body: string[];
};

export const BOARD_MESSAGES: BoardMessage[] = (boardJson as BoardMessage[])
  .slice()
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/** The message to show. Newest by date; undefined when none are written. */
export function currentBoardMessage(): BoardMessage | undefined {
  return BOARD_MESSAGES[0];
}

/** How many days old the current message is, for staleness checks in tests. */
export function boardMessageAgeDays(now: Date = new Date()): number | null {
  const m = currentBoardMessage();
  if (!m) return null;
  const then = Date.parse(`${m.date}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  return Math.floor((now.getTime() - then) / 86_400_000);
}

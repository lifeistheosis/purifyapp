/**
 * The one figure each Daily page carries in the rail.
 *
 * The owner's pick A on sheet r3-15 (2026-10-30, "do A for the rail"): "each
 * Daily page carries the one figure he opens it for (37 now, $96 today)", so
 * the numbers he opens pages for are on the rail before he opens one. Home
 * says how many things wait on him, Traffic who is on the site now, Money
 * what came in today, Users how many readers joined today.
 *
 * A figure that could not be read is no figure at all: the row shows its
 * name alone, never a zero it cannot stand behind (null in, null out).
 *
 * Pure: the readings come in, the words go out.
 */

import type { AdminFigure } from "./pages";

export type RailFigure = {
  text: string;
  /** The tooltip: what the figure counts. */
  title: string;
  /** Money, hidden under streamer mode. */
  sensitive?: boolean;
};

export type RailReadings = {
  /** Things that need him: the Home's to-do (faults and queues). */
  waiting: number | null;
  /** On the site in the last 90 seconds. */
  live: number | null;
  /** Today's net takings in cents, or null when the books could not be read. */
  revenueTodayCents: number | null;
  /** Accounts made today. */
  signupsToday: number | null;
};

const ok = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

/** Whole dollars, as the rail draws them: "$96", "$1,204". Cents round half up. */
export function railMoney(cents: number): string {
  const dollars = Math.round(cents / 100);
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${Math.abs(dollars).toLocaleString("en-US")}`;
}

export function railFigure(kind: AdminFigure, r: RailReadings): RailFigure | null {
  switch (kind) {
    case "waiting":
      // Nothing waiting is said by the row having no figure, not by "0".
      return ok(r.waiting) && r.waiting > 0
        ? { text: `${r.waiting} waiting`, title: r.waiting === 1 ? "1 thing needs you" : `${r.waiting} things need you` }
        : null;
    case "live":
      return ok(r.live) ? { text: `${r.live.toLocaleString("en-US")} now`, title: "On the site in the last 90 seconds" } : null;
    case "revenue":
      return ok(r.revenueTodayCents)
        ? { text: railMoney(r.revenueTodayCents), title: "Came in today, net, UTC day", sensitive: true }
        : null;
    case "signups":
      return ok(r.signupsToday)
        ? { text: `+${r.signupsToday.toLocaleString("en-US")}`, title: r.signupsToday === 1 ? "1 new reader today" : `${r.signupsToday} new readers today` }
        : null;
  }
}

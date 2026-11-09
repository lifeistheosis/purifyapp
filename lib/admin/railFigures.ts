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
  /**
   * Which books stand behind it (the overview route's revenueSource): Stripe,
   * which holds the shop and Plus bought on the website but never Plus bought
   * through Google Play or the App Store, or the shop's own orders.
   */
  revenueSource?: "stripe" | "shop";
  /**
   * True when Plus bought through Google Play and the App Store is in the
   * figure too (from the kept RevenueCat events, admin item A2).
   */
  storePlus?: boolean;
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

/**
 * What "today" holds, said on the figure itself. It used to say "Came in
 * today, net" whichever books it came from, so a day of Plus bought on Google
 * Play read as a day with nothing in it (found 2026-11-09).
 */
export function revenueTitle(source: RailReadings["revenueSource"], storePlus = false): string {
  if (storePlus) {
    return source === "stripe"
      ? "Came in today: through Stripe (the shop and Plus on the website) after Stripe's fees and refunds, and Plus bought through Google Play and the App Store after the store's share. UTC day."
      : "Came in today: the shop's paid orders less refunds, and Plus bought through Google Play and the App Store after the store's share. UTC day. Plus on the website is not in it.";
  }
  return source === "stripe"
    ? "Came in today through Stripe (the shop and Plus on the website), after Stripe's fees and refunds, UTC day. Plus bought through Google Play or the App Store is not in it."
    : "Came in today: the shop's paid orders, less refunds, UTC day. Plus is not in it.";
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
        ? { text: railMoney(r.revenueTodayCents), title: revenueTitle(r.revenueSource, r.storePlus), sensitive: true }
        : null;
    case "signups":
      return ok(r.signupsToday)
        ? { text: `+${r.signupsToday.toLocaleString("en-US")}`, title: r.signupsToday === 1 ? "1 new reader today" : `${r.signupsToday} new readers today` }
        : null;
  }
}

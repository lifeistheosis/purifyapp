import { STRIPE_STANDARD, unitEconomics, type FeeSchedule } from "./pricing";

/**
 * The cart deal, the "deal sniper": something that has waited in a cart for a
 * few days unlocks a discount for a short, real window.
 *
 * Pure. The clock, the cart and the settings are all inputs, which is what
 * lets the three places that must agree about a deal (the cart's banner, the
 * checkout that charges it, the email that announces it) share one answer.
 *
 * ── WHOSE CLOCK ─────────────────────────────────────────────────────────
 *
 * The SERVER's. The client never sends a time: the sync route stamps each line
 * with the moment the server first saw that slug in that cart and carries the
 * stamp forward on every later sync (stampCartItems). A client that wanted an
 * older date would have nothing to put it in, because cartSyncSchema has no
 * field for it and zod drops keys it does not know.
 *
 * ── WHAT IT WILL NOT DO ─────────────────────────────────────────────────
 *
 * - Discount a product whose supplier cost is unknown. The floor below needs
 *   the cost, and a deal with no floor is a deal that can sell at a loss.
 * - Go below cost + processing + the owner's minimum margin. When the asked
 *   percentage would, the deal shrinks to what the floor allows and says the
 *   smaller number; when nothing is left, there is no deal.
 * - Pretend to expire. The window is the window: the countdown the buyer sees
 *   is the moment checkout stops honouring it.
 */

export type CartDealConfig = {
  enabled: boolean;
  /** Days a line must sit in the cart before its deal unlocks. */
  afterDays: number;
  /** Percent off, 1..50. */
  percent: number;
  /** How long the unlocked deal lasts. */
  windowHours: number;
  /** Contribution a discounted unit must still leave, after fees and cost. */
  minMarginCents: number;
};

export type CartLine = { slug: string; title: string; quantity: number; unitPriceCents: number };
export type StampedCartLine = CartLine & { addedAt: string };

/**
 * Carry each line's first-seen time forward from the row already stored.
 *
 * A slug new to this cart is stamped `now`. A stored stamp in the future, or
 * one that does not parse, is replaced with `now` rather than trusted.
 */
export function stampCartItems(previous: unknown, next: readonly CartLine[], nowIso: string): StampedCartLine[] {
  const now = Date.parse(nowIso);
  const seen = new Map<string, string>();
  if (Array.isArray(previous)) {
    for (const it of previous) {
      const slug = (it as { slug?: unknown } | null)?.slug;
      const at = (it as { addedAt?: unknown } | null)?.addedAt;
      if (typeof slug !== "string" || typeof at !== "string") continue;
      const t = Date.parse(at);
      if (!Number.isFinite(t) || t > now) continue;
      const prior = seen.get(slug);
      if (!prior || Date.parse(prior) > t) seen.set(slug, new Date(t).toISOString());
    }
  }
  return next.map((line) => ({ ...line, addedAt: seen.get(line.slug) ?? nowIso }));
}

/** When a stored line was added, or null when it carries no usable stamp. */
export function addedAtOf(items: unknown, slug: string): string | null {
  if (!Array.isArray(items)) return null;
  for (const it of items) {
    if ((it as { slug?: unknown } | null)?.slug !== slug) continue;
    const at = (it as { addedAt?: unknown }).addedAt;
    return typeof at === "string" && Number.isFinite(Date.parse(at)) ? at : null;
  }
  return null;
}

export type DealWindow =
  | { status: "off" }
  | { status: "waiting"; unlocksAt: number; endsAt: number }
  | { status: "active"; unlocksAt: number; endsAt: number }
  | { status: "expired"; unlocksAt: number; endsAt: number };

/** Where a line stands against the deal clock. */
export function dealWindow(addedAt: string | null, cfg: CartDealConfig, now: number): DealWindow {
  if (!cfg.enabled || !addedAt) return { status: "off" };
  const added = Date.parse(addedAt);
  if (!Number.isFinite(added)) return { status: "off" };
  const unlocksAt = added + cfg.afterDays * 86_400_000;
  const endsAt = unlocksAt + cfg.windowHours * 3_600_000;
  if (now < unlocksAt) return { status: "waiting", unlocksAt, endsAt };
  if (now < endsAt) return { status: "active", unlocksAt, endsAt };
  return { status: "expired", unlocksAt, endsAt };
}

/**
 * The lowest unit price that still leaves `minMarginCents` after processing
 * and cost. Closed form first, then walked to the exact cent, because the
 * processor rounds its fee and the rounding can land either side.
 */
export function floorPriceCents(costCents: number, minMarginCents: number, fees: FeeSchedule = STRIPE_STANDARD): number {
  const cost = Math.max(0, Math.round(costCents));
  const margin = Math.max(0, Math.round(minMarginCents));
  let p = Math.max(1, Math.ceil((margin + cost + fees.fixedCents) / (1 - fees.rate)));
  while (unitEconomics(p, cost, fees).contributionCents < margin) p += 1;
  while (p > 1 && unitEconomics(p - 1, cost, fees).contributionCents >= margin) p -= 1;
  return p;
}

export type DealPrice = {
  /** What one unit is charged. */
  unitCents: number;
  /** Off each unit. */
  discountCents: number;
  /** The percentage actually given, which the floor may have made smaller. */
  percent: number;
};

/**
 * The discounted unit price, or null when there is no deal to give.
 *
 * Null for an unknown cost (see the header), and null when the floor leaves
 * nothing off: a "0% off" banner is worse than none.
 */
export function dealPrice(
  priceCents: number,
  percent: number,
  costCents: number | null | undefined,
  minMarginCents: number,
): DealPrice | null {
  if (typeof costCents !== "number" || !Number.isFinite(costCents)) return null;
  if (!(priceCents > 0) || !(percent > 0)) return null;
  const asked = Math.round((priceCents * (100 - Math.min(percent, 90))) / 100);
  const unitCents = Math.max(asked, floorPriceCents(costCents, minMarginCents));
  if (unitCents >= priceCents) return null;
  const discountCents = priceCents - unitCents;
  // The asked percentage when that is what was charged (cent rounding aside),
  // otherwise the real share, rounded DOWN so the banner never claims more
  // than the floor let through.
  const given = unitCents === asked ? Math.min(percent, 90) : Math.floor((discountCents / priceCents) * 100);
  // A floor can leave a cent or two off, which rounds to 0%. Not a deal.
  if (given < 1) return null;
  return { unitCents, discountCents, percent: given };
}

/** "47:59:05": a countdown that reads the same in every language. */
export function countdownLabel(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

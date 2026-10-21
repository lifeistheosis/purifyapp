import { formatPrice } from "./format";
import type { SetRole } from "./sets";

/**
 * The shop's two standing offers, and how a cart is priced with them (the
 * owner, 2026-10-01: "if you add more, it's free shipping, or if you add one
 * more, it's discounted", and fifteen or twenty percent off the prayer corner
 * set "when you buy it in a bundle").
 *
 *   THE SET     an icon, a prayer rope and a cross together in one order take
 *               the set's percentage off those three pieces. Any icon, rope
 *               and cross, not only the three the set card picked: the pick
 *               follows the stock and the reviews (lib/shop/sets.ts), and a
 *               set a reader built on Monday must still be a set on Tuesday.
 *   MULTI-BUY   at minItems pieces or more, every piece takes the multi-buy
 *               percentage off. From 1.8 it can climb in steps (the owner:
 *               "20%, 25%, maybe 30% if they add a bunch more"): each step is
 *               a larger order and a larger percentage, and an order takes the
 *               highest step it has reached, never two at once.
 *   CART DEAL   the existing per-line deal (lib/shop/cartDeals.ts). The
 *               server computes it and it arrives here as a unit price.
 *
 * ── THEY DO NOT STACK ───────────────────────────────────────────────────
 *
 * Each piece is charged the lowest single price it qualifies for, never a
 * discount on a discount. A set piece in a four-piece order takes the set's
 * percentage, not the set's and then the multi-buy's.
 *
 * ── WHY THE CLIENT RUNS THIS TOO ────────────────────────────────────────
 *
 * Every input is public: list prices, what kind of piece each one is, which
 * store sells it, and the owner's percentages (the public config route). So
 * the cart, the drawer and the set card show exactly what checkout charges.
 * Checkout runs the same function against database prices and never reads a
 * number from the client (lib/shop/checkout.ts).
 *
 * ── NO COST FLOOR, ON PURPOSE ───────────────────────────────────────────
 *
 * The cart deal stops at cost + fees + margin because it discounts whatever a
 * shopper happened to leave in a cart. These two are the owner's own standing
 * prices, like the price on a product, and a floor would need the supplier
 * cost, which never leaves the server: checkout would then charge more than
 * the cart had said. The admin's Deals panel lists, at the chosen
 * percentages, every piece that would sell under the margin floor, which is
 * where a thin margin is caught.
 *
 * Pure.
 */

export type PromoConfig = {
  /** Percent off the three pieces of a prayer corner set. Null is off. */
  setPercent: number | null;
  /** Percent off every piece once an order holds minItems. Null is off. */
  multiBuy: MultiBuyConfig | null;
};

export type MultiBuyStep = { minItems: number; percent: number };

/** The first step, and any higher ones (1.8). */
export type MultiBuyConfig = MultiBuyStep & { steps?: readonly MultiBuyStep[] | null };

/**
 * The multi-buy's steps, lowest first. A step counts only when it asks for
 * more pieces AND gives more off than the one below it, so a step set lower
 * by mistake can never make a bigger order cheaper per piece by less.
 */
export function multiBuyTiers(m: MultiBuyConfig | null | undefined): MultiBuyStep[] {
  if (!m) return [];
  const all = [m, ...(m.steps ?? [])]
    .map((t) => ({ minItems: Math.max(2, Math.round(t.minItems)), percent: validPercent(t.percent) }))
    .filter((t): t is MultiBuyStep => t.percent != null && Number.isFinite(t.minItems))
    .sort((a, b) => a.minItems - b.minItems);
  const out: MultiBuyStep[] = [];
  for (const t of all) {
    const last = out[out.length - 1];
    if (!last || (t.minItems > last.minItems && t.percent > last.percent)) out.push(t);
  }
  return out;
}

/** The step an order of `units` pieces has reached, and the next one up. */
export function multiBuyStepAt(
  m: MultiBuyConfig | null | undefined,
  units: number,
): { at: MultiBuyStep | null; next: MultiBuyStep | null } {
  const tiers = multiBuyTiers(m);
  let at: MultiBuyStep | null = null;
  for (const t of tiers) if (units >= t.minItems) at = t;
  return { at, next: tiers.find((t) => t.minItems > units) ?? null };
}

/** The pieces a multi-buy percentage asks for, for its label. */
export function multiBuyMinFor(m: MultiBuyConfig | null | undefined, percent: number | null | undefined): number | null {
  return multiBuyTiers(m).find((t) => t.percent === percent)?.minItems ?? null;
}

export const NO_PROMOTIONS: PromoConfig = { setPercent: null, multiBuy: null };

export type DiscountKind = "cart_deal" | "set_bundle" | "multi_buy";

export type PromoLine = {
  slug: string;
  quantity: number;
  /** One unit at full price. */
  listCents: number;
  /** The place the piece can take in a set (roleOf in lib/shop/sets.ts). */
  role: SetRole | null;
  /**
   * Sold by Purify's own store. On a connected store the money is the
   * seller's, and an offer there would spend somebody else's margin.
   */
  eligible: boolean;
  /** A live cart deal's unit price, as the server computed it. */
  dealUnitCents?: number | null;
  /** That deal's percentage, for its label. */
  dealPercent?: number | null;
};

/** Some or all of one line's units, at one price. */
export type PricedSegment = {
  slug: string;
  /** Index of the input line this came from. */
  line: number;
  quantity: number;
  unitCents: number;
  listCents: number;
  /** Why it costs less than list. Null at full price. */
  kind: DiscountKind | null;
  /** The percentage a label states. Null at full price. */
  percent: number | null;
};

export type PricedCart = {
  /** In line order; a line splits only when some of its units are in a set. */
  segments: PricedSegment[];
  /** What is charged for the items. */
  itemsCents: number;
  /** What the items come to at list price. */
  listCents: number;
  savingsCents: number;
  /** Complete sets (an icon, a rope and a cross, each from Purify's store). */
  sets: number;
  /** Pieces from Purify's store, counted by unit: what multi-buy counts. */
  units: number;
  /** The order holds enough pieces for multi-buy. */
  multiBuyActive: boolean;
  /** The multi-buy step's percentage the order has reached, or null. */
  multiPercent: number | null;
};

const ROLES: readonly SetRole[] = ["icon", "rope", "cross"];

/** Percent off a unit price, to the nearest cent. The cart deal rounds the same way. */
export function percentOff(listCents: number, percent: number): number {
  return Math.round((listCents * (100 - percent)) / 100);
}

function validPercent(p: number | null | undefined): number | null {
  return typeof p === "number" && Number.isFinite(p) && p >= 1 && p <= 90 ? Math.round(p) : null;
}

/** On a tie the standing offers win over the timed one, for the label's sake. */
const PREFERENCE: Record<DiscountKind, number> = { set_bundle: 0, multi_buy: 1, cart_deal: 2 };

type Unit = {
  line: number;
  list: number;
  eligible: boolean;
  role: SetRole | null;
  deal: number | null;
  dealPercent: number | null;
  inSet: boolean;
};

export function priceCart(lines: readonly PromoLine[], cfg: PromoConfig): PricedCart {
  const setPercent = validPercent(cfg.setPercent);
  const units: Unit[] = [];
  lines.forEach((l, line) => {
    const quantity = Number.isFinite(l.quantity) ? Math.max(0, Math.floor(l.quantity)) : 0;
    const list = Number.isFinite(l.listCents) ? Math.max(0, Math.round(l.listCents)) : 0;
    const deal =
      typeof l.dealUnitCents === "number" && Number.isFinite(l.dealUnitCents) && l.dealUnitCents >= 0
        ? Math.round(l.dealUnitCents)
        : null;
    for (let k = 0; k < quantity; k++) {
      units.push({
        line,
        list,
        eligible: l.eligible,
        role: l.eligible ? l.role : null,
        deal,
        dealPercent: l.dealPercent ?? null,
        inSet: false,
      });
    }
  });

  // Sets: as many as the scarcest kind allows. Within each kind the dearest
  // pieces take the set price first, which is the larger saving, and ties go
  // to the earlier line so the same cart always splits the same way.
  let sets = 0;
  if (setPercent != null) {
    const byRole = new Map<SetRole, Unit[]>(ROLES.map((r) => [r, []]));
    for (const u of units) if (u.role) byRole.get(u.role)!.push(u);
    sets = Math.min(...ROLES.map((r) => byRole.get(r)!.length));
    for (const r of ROLES) {
      byRole
        .get(r)!
        .sort((a, b) => b.list - a.list || a.line - b.line)
        .slice(0, sets)
        .forEach((u) => {
          u.inSet = true;
        });
    }
  }

  const eligibleUnits = units.filter((u) => u.eligible).length;
  const multiPercent = multiBuyStepAt(cfg.multiBuy, eligibleUnits).at?.percent ?? null;
  const multiBuyActive = multiPercent != null;

  type Choice = { cents: number; kind: DiscountKind | null; percent: number | null };
  const choose = (u: Unit): Choice => {
    let best: Choice = { cents: u.list, kind: null, percent: null };
    const consider = (c: Choice) => {
      if (c.cents > best.cents) return;
      if (c.cents === best.cents) {
        // Never label a piece "discounted" when it costs its list price.
        if (best.kind === null || !c.kind || PREFERENCE[c.kind] >= PREFERENCE[best.kind]) return;
      }
      best = c;
    };
    if (u.deal != null && u.deal < u.list) consider({ cents: u.deal, kind: "cart_deal", percent: u.dealPercent });
    if (u.inSet && setPercent != null) consider({ cents: percentOff(u.list, setPercent), kind: "set_bundle", percent: setPercent });
    if (multiBuyActive && u.eligible && multiPercent != null) {
      consider({ cents: percentOff(u.list, multiPercent), kind: "multi_buy", percent: multiPercent });
    }
    // A percentage that rounds to nothing on a very cheap piece is not a deal.
    return best.cents < u.list ? best : { cents: u.list, kind: null, percent: null };
  };

  const segments: PricedSegment[] = [];
  lines.forEach((l, line) => {
    const mine = units.filter((u) => u.line === line);
    // Set units first, so a split line reads "1 at the set price, 1 at ...".
    mine.sort((a, b) => Number(b.inSet) - Number(a.inSet));
    const groups: PricedSegment[] = [];
    for (const u of mine) {
      const c = choose(u);
      const same = groups.find((g) => g.unitCents === c.cents && g.kind === c.kind);
      if (same) {
        same.quantity += 1;
      } else {
        groups.push({ slug: l.slug, line, quantity: 1, unitCents: c.cents, listCents: u.list, kind: c.kind, percent: c.percent });
      }
    }
    segments.push(...groups);
  });

  const itemsCents = segments.reduce((n, s) => n + s.unitCents * s.quantity, 0);
  const listCents = segments.reduce((n, s) => n + s.listCents * s.quantity, 0);
  return {
    segments,
    itemsCents,
    listCents,
    savingsCents: listCents - itemsCents,
    sets,
    units: eligibleUnits,
    multiBuyActive,
    multiPercent,
  };
}

/** The segments of one input line. */
export function segmentsOf(priced: PricedCart, line: number): PricedSegment[] {
  return priced.segments.filter((s) => s.line === line);
}

/**
 * What the Stripe page says under a discounted line, with the price it came
 * off, so the buyer reads the same saving they were shown in the cart. Stripe
 * shows it as given, in English, like the rest of the session.
 */
export function discountNote(
  segment: Pick<PricedSegment, "kind" | "percent" | "listCents">,
  currency: string,
  minItems?: number | null,
): string | null {
  if (!segment.kind || segment.percent == null) return null;
  const was = formatPrice(segment.listCents, currency);
  switch (segment.kind) {
    case "cart_deal":
      return `Cart deal: ${segment.percent}% off (was ${was})`;
    case "set_bundle":
      return `Prayer corner set: ${segment.percent}% off (was ${was})`;
    case "multi_buy":
      return minItems
        ? `${minItems} or more pieces: ${segment.percent}% off (was ${was})`
        : `Several pieces: ${segment.percent}% off (was ${was})`;
  }
}

// ── The ladder: where an order stands against each offer ──────────────────

export type ShippingRung =
  | { kind: "off" }
  | { kind: "pro" }
  | { kind: "free"; thresholdCents: number }
  | { kind: "away"; thresholdCents: number; awayCents: number; progress: number };

export type MultiBuyRung =
  | { kind: "off" }
  /** Toward the next step: `current` is the percentage already reached, or null. */
  | { kind: "away"; have: number; need: number; minItems: number; percent: number; current?: number | null }
  /** `applied` is false when every piece already has a better price, a set's. */
  | { kind: "on"; minItems: number; percent: number; applied: boolean };

export type SetRung =
  | { kind: "off" }
  | { kind: "none" }
  | { kind: "partial"; have: SetRole[]; missing: SetRole[]; percent: number }
  | { kind: "complete"; sets: number; percent: number };

export type Ladder = { shipping: ShippingRung; multiBuy: MultiBuyRung; set: SetRung };

export type ShippingRule = {
  /** Orders at or over this, after discounts, ship free. Null is off. */
  thresholdCents: number | null | undefined;
  /** Purify Pro ships free whatever the order comes to. */
  pro?: boolean | null;
};

export function cartLadder(
  lines: readonly PromoLine[],
  priced: PricedCart,
  cfg: PromoConfig,
  shipping: ShippingRule,
): Ladder {
  const threshold = typeof shipping.thresholdCents === "number" && shipping.thresholdCents > 0 ? shipping.thresholdCents : null;
  const ship: ShippingRung = shipping.pro
    ? { kind: "pro" }
    : threshold == null
      ? { kind: "off" }
      : priced.itemsCents >= threshold
        ? { kind: "free", thresholdCents: threshold }
        : {
            kind: "away",
            thresholdCents: threshold,
            awayCents: threshold - priced.itemsCents,
            progress: Math.max(0, Math.min(1, priced.itemsCents / threshold)),
          };

  let multiBuy: MultiBuyRung = { kind: "off" };
  // An order with nothing from Purify's store can never reach it (checkout
  // takes one store at a time), so it is not offered one. With steps, an
  // order counts up to the next step until it has reached the top one: the
  // bar the owner likes keeps filling.
  const { at, next } = multiBuyStepAt(cfg.multiBuy, priced.units);
  if ((at || next) && priced.units > 0) {
    multiBuy = next
      ? {
          kind: "away",
          have: priced.units,
          need: next.minItems - priced.units,
          minItems: next.minItems,
          percent: next.percent,
          ...(at ? { current: at.percent } : {}),
        }
      : { kind: "on", minItems: at!.minItems, percent: at!.percent, applied: priced.segments.some((s) => s.kind === "multi_buy") };
  }

  const setPercent = validPercent(cfg.setPercent);
  let set: SetRung = { kind: "off" };
  if (setPercent != null) {
    if (priced.sets > 0) {
      set = { kind: "complete", sets: priced.sets, percent: setPercent };
    } else {
      const have = ROLES.filter((r) => lines.some((l) => l.eligible && l.role === r && l.quantity > 0));
      set =
        have.length === 0
          ? { kind: "none" }
          : { kind: "partial", have, missing: ROLES.filter((r) => !have.includes(r)), percent: setPercent };
    }
  }

  return { shipping: ship, multiBuy, set };
}

/** What adding something newly gives an order, the most telling first. */
export type Unlock = "set" | "free_shipping" | "multi_buy";

export function unlocks(before: Ladder, after: Ladder): Unlock | null {
  const sets = (l: Ladder) => (l.set.kind === "complete" ? l.set.sets : 0);
  if (sets(after) > sets(before)) return "set";
  if (after.shipping.kind === "free" && before.shipping.kind !== "free") return "free_shipping";
  const multi = (l: Ladder) =>
    l.multiBuy.kind === "on" ? l.multiBuy.percent : l.multiBuy.kind === "away" ? (l.multiBuy.current ?? 0) : 0;
  if (multi(after) > multi(before)) return "multi_buy";
  return null;
}

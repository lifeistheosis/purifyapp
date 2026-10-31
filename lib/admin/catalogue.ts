/**
 * The Catalogue as a shelf: the owner's pick A for Catalogue (r3-16,
 * 2026-10-30, "Do A for a catalog"). Every piece is its photo card: the
 * price, what it keeps after Temu and the card fee as one bar, its stock,
 * and its state by shape (Live solid, Draft a ring, Paused grey, Hidden
 * dashed). A four-part switch replaces the status chips, and a card whose
 * Temu price moved is dashed.
 *
 * STOCK. The sheet draws two counts, shippable and quality control. The
 * shop keeps one count per piece today (shop_products.quantity_available),
 * and the owner's rule is that a piece kept for quality control is never
 * shipped (2026-10-29). Until a column holds the split, the card shows the
 * one count as general stock and says the split is not recorded, rather
 * than guessing it. The proposed column is
 * boards/purify-master/r18/admin-sql/shop-stock-split.sql, for his OK.
 *
 * Pure.
 */

import { gradePrice, unitEconomics } from "@/lib/shop/pricing";

export type ShelfState = "live" | "hidden" | "draft" | "paused" | "archived";

/** The four parts of the switch. Live holds the hidden ones too: they are published. */
export type ShelfView = "live" | "drafts" | "paused" | "all";

export const SHELF_VIEWS: readonly (readonly [ShelfView, string])[] = [
  ["live", "Live"],
  ["drafts", "Drafts"],
  ["paused", "Paused"],
  ["all", "All"],
];

/**
 * A piece's state. Published but hidden by the image-rights gate (its first
 * photo is the supplier's, lib/shop/imageRights.ts) is its own state, because
 * the shop does not show it however "published" it reads.
 */
export function shelfState(p: { status: string }, hiddenByRights: boolean): ShelfState {
  if (p.status === "published") return hiddenByRights ? "hidden" : "live";
  if (p.status === "draft") return "draft";
  if (p.status === "paused") return "paused";
  return "archived";
}

export const STATE_WORD: Record<ShelfState, string> = {
  live: "Live",
  hidden: "Hidden",
  draft: "Draft",
  paused: "Paused",
  archived: "Archived",
};

/** The shape each state is drawn as: solid, dashed, a ring, grey. */
export const STATE_MARK: Record<ShelfState, "done" | "late" | "wait" | "idle"> = {
  live: "done",
  hidden: "late",
  draft: "wait",
  paused: "idle",
  archived: "idle",
};

export function inShelfView(state: ShelfState, view: ShelfView): boolean {
  if (view === "all") return true;
  if (view === "live") return state === "live" || state === "hidden";
  if (view === "drafts") return state === "draft";
  return state === "paused";
}

export function shelfCounts(states: readonly ShelfState[]): Record<ShelfView, number> {
  const out: Record<ShelfView, number> = { live: 0, drafts: 0, paused: 0, all: states.length };
  for (const s of states) {
    if (inShelfView(s, "live")) out.live += 1;
    if (s === "draft") out.drafts += 1;
    if (s === "paused") out.paused += 1;
  }
  return out;
}

export type KeepBar = {
  /** Shares of the price, 0 to 100, summing to 100 when the cost is known. */
  costPct: number;
  feePct: number;
  keepPct: number;
  /** Whole percent kept, or null when no cost is recorded (a guess is not shown). */
  keeps: number | null;
  costKnown: boolean;
};

/**
 * What a sale keeps after Temu and the card fee, as one bar. A missing cost
 * is not a zero cost (lib/shop/pricing.ts), so a piece without one shows the
 * fee alone and no percentage.
 */
export function keepBar(priceCents: number, costCents: number | null | undefined): KeepBar {
  const e = unitEconomics(priceCents, costCents);
  if (e.priceCents <= 0) return { costPct: 0, feePct: 0, keepPct: 0, keeps: null, costKnown: e.costKnown };
  const pct = (n: number) => Math.max(0, Math.min(100, (n / e.priceCents) * 100));
  const costPct = e.costKnown ? pct(e.costCents) : 0;
  const feePct = pct(e.feeCents);
  return {
    costPct,
    feePct,
    keepPct: e.costKnown ? Math.max(0, 100 - costPct - feePct) : 0,
    keeps: e.costKnown && e.marginPct !== null ? Math.round(e.marginPct * 100) : null,
    costKnown: e.costKnown,
  };
}

export type LastCheck = {
  outcome: string;
  cost_cents: number | null;
  price_cents: number;
  created_at: string;
};

export type ShelfWarning = { kind: "moved" | "gone" | "loss"; text: string } | null;

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

/**
 * Why a card is dashed, or null. Temu's price moved at the last check and
 * the price has not been looked at since (the shop still asks what it asked
 * at the check); the last check found the listing gone; or the price loses
 * money now. Read from the cost checks the Sourcing list records
 * (shop_cost_checks), so nothing here guesses.
 */
export function shelfWarning(
  p: { price_cents: number },
  costCents: number | null | undefined,
  last: LastCheck | null | undefined,
): ShelfWarning {
  if (last && (last.outcome === "unavailable" || last.outcome === "not-found")) {
    return { kind: "gone", text: last.outcome === "not-found" ? "Temu listing gone" : "Temu: unavailable" };
  }
  if (last && last.outcome === "changed" && last.price_cents === p.price_cents && typeof last.cost_cents === "number") {
    return { kind: "moved", text: `Temu now ${dollars(last.cost_cents)}` };
  }
  const grade = gradePrice(unitEconomics(p.price_cents, costCents));
  if (grade.band === "loss") return { kind: "loss", text: "Loses money at this price" };
  return null;
}

/** The latest check per piece, from rows in any order. */
export function latestChecks<T extends LastCheck & { product_id: string }>(rows: readonly T[]): Record<string, LastCheck> {
  const out: Record<string, LastCheck> = {};
  for (const r of rows) {
    const prev = out[r.product_id];
    if (!prev || Date.parse(r.created_at) > Date.parse(prev.created_at)) {
      out[r.product_id] = { outcome: r.outcome, cost_cents: r.cost_cents, price_cents: r.price_cents, created_at: r.created_at };
    }
  }
  return out;
}

/** The stock line under a card: one count, honestly named. */
export function stockLine(quantity: number | null | undefined): { count: number | null; word: string } {
  if (typeof quantity !== "number" || !Number.isFinite(quantity)) return { count: null, word: "not counted" };
  return { count: quantity, word: "in stock" };
}

/** A photo cut out on a clear ground reads best whole on a light well; a photograph fills its box. */
export function isCutout(url: string | null | undefined): boolean {
  return !!url && /\.png(\?|#|$)/i.test(url);
}

/** Search across what a piece is known by. */
export function matchesPiece(
  p: { title: string; slug: string; category?: string | null },
  extra: readonly (string | null | undefined)[],
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.title, p.slug, p.category, ...extra].filter(Boolean).join(" ").toLowerCase().includes(q);
}

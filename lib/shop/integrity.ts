import type { ShopInventoryStatus } from "./types";

/**
 * The shop's own account of what is wrong with it.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * A scan of the live catalogue on 2026-08-28 turned up four faults, none of
 * which any screen in the app reported, and all of which were plainly visible
 * in data the admin panel already had in hand:
 *
 *   1. Two products, `frankincense-resin` at $12.99 and
 *      `frankincense-myrrh-resin-set` at $16.99, cited the SAME supplier
 *      listing. One source, two prices.
 *   2. `frankincense-myrrh-resin-set` was `published` and absent from the
 *      public catalogue, because catalog.ts joins the store with `!inner` and
 *      a store that is not live takes its listings with it. The operator sees
 *      "published" and a shopper sees nothing.
 *   3. `christ-pantocrator-mounted` and `theotokos-of-vladimir-mounted` were
 *      `out_of_stock` while carrying `quantity_available: 8`.
 *   4. Eight of eleven published listings could not be bought at all.
 *
 * Every one of these is a contradiction between two fields that are already
 * stored. Nothing here fetches, guesses, or judges taste: it compares the shop
 * against itself and reports where it disagrees.
 *
 * ── On markup ───────────────────────────────────────────────────────────
 *
 * Markup is REPORTED and never called wrong. What a thing should sell for is
 * the owner's decision, and a resale shop running six or seven times cost is
 * ordinary. The check exists so an outlier is visible next to its neighbours,
 * not so software can overrule a price.
 */

export type ShopIssueKind =
  | "duplicate-supplier-url"
  | "stock-contradiction"
  | "invisible-published"
  | "published-without-media"
  | "published-without-supplier"
  | "markup-outlier";

export type ShopIssueSeverity = "error" | "warning" | "note";

export type ShopIssue = {
  kind: ShopIssueKind;
  severity: ShopIssueSeverity;
  /** The listing this is about. Duplicates report every slug involved. */
  slugs: string[];
  detail: string;
};

export type IntegrityProduct = {
  id: string;
  slug: string;
  status: string;
  inventory_status: ShopInventoryStatus;
  quantity_available?: number | null;
  price_cents: number;
  store_id?: string | null;
  media?: unknown[] | null;
};

export type IntegritySourcing = {
  product_id: string;
  supplier_url?: string | null;
  supplier_cost_cents?: number | null;
};

export type IntegrityStore = { id: string; status: string };

/**
 * Above this multiple of supplier cost a listing is worth a second look.
 * Chosen from the live spread: the catalogue clusters at 4x to 7x, so 9x is
 * genuinely apart from its neighbours rather than merely the highest.
 */
export const MARKUP_OUTLIER = 9;

/** Supplier URLs carry per-session tracking, so identity is the path alone. */
export function supplierIdentity(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function findShopIssues(input: {
  products: IntegrityProduct[];
  sourcing: IntegritySourcing[];
  stores: IntegrityStore[];
}): ShopIssue[] {
  const { products, sourcing, stores } = input;
  const issues: ShopIssue[] = [];

  const sourceOf = new Map(sourcing.map((s) => [s.product_id, s]));
  const storeStatus = new Map(stores.map((s) => [s.id, s.status]));
  const published = products.filter((p) => p.status === "published");

  // 1. One supplier listing behind two products.
  const byIdentity = new Map<string, string[]>();
  for (const p of published) {
    const url = sourceOf.get(p.id)?.supplier_url;
    if (!url) continue;
    const key = supplierIdentity(url);
    byIdentity.set(key, [...(byIdentity.get(key) ?? []), p.slug]);
  }
  for (const [, slugs] of byIdentity) {
    if (slugs.length < 2) continue;
    issues.push({
      kind: "duplicate-supplier-url",
      severity: "error",
      slugs: [...slugs].sort(),
      detail:
        `${slugs.length} published listings resell the same supplier item. ` +
        `Either they are the same product listed twice, or one is mis-sourced.`,
    });
  }

  for (const p of published) {
    const src = sourceOf.get(p.id);

    // 2. Sold out, and yet.
    const qty = p.quantity_available;
    if (
      p.inventory_status === "out_of_stock" &&
      typeof qty === "number" &&
      qty > 0
    ) {
      issues.push({
        kind: "stock-contradiction",
        severity: "error",
        slugs: [p.slug],
        detail: `Marked out of stock while holding ${qty}. One of the two is wrong.`,
      });
    }

    // 3. Published to nobody.
    const status = p.store_id ? storeStatus.get(p.store_id) : undefined;
    if (status !== undefined && status !== "live") {
      issues.push({
        kind: "invisible-published",
        severity: "error",
        slugs: [p.slug],
        detail:
          `Published, but its store is "${status}", so catalog.ts's inner join ` +
          `hides it from every shopper. The panel says live and the shop does not.`,
      });
    }

    // 4. A listing with no picture is not a listing.
    if (!p.media || p.media.length === 0) {
      issues.push({
        kind: "published-without-media",
        severity: "warning",
        slugs: [p.slug],
        detail: "Published with no image.",
      });
    }

    // 5. Nothing records where to buy it again.
    if (!src?.supplier_url) {
      issues.push({
        kind: "published-without-supplier",
        severity: "warning",
        slugs: [p.slug],
        detail:
          "Published with no supplier link, so a restock means finding the source again.",
      });
    }

    // 6. Reported, never judged.
    const cost = src?.supplier_cost_cents;
    if (typeof cost === "number" && cost > 0) {
      const markup = p.price_cents / cost;
      if (markup >= MARKUP_OUTLIER) {
        issues.push({
          kind: "markup-outlier",
          severity: "note",
          slugs: [p.slug],
          detail:
            `Sells at ${markup.toFixed(1)}x supplier cost, against a catalogue ` +
            `that mostly sits below ${MARKUP_OUTLIER}x. Not a fault, just apart.`,
        });
      }
    }
  }

  const rank: Record<ShopIssueSeverity, number> = {
    error: 0,
    warning: 1,
    note: 2,
  };
  return issues.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.kind.localeCompare(b.kind),
  );
}

/** How many listings a shopper can actually buy today. */
export function buyableCount(products: IntegrityProduct[]): number {
  return products.filter(
    (p) => p.status === "published" && p.inventory_status === "ready_to_ship",
  ).length;
}

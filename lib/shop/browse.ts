// Client-side browse refinement for the shop: free-text search + facet
// filters applied over the already-fetched catalog page (max 60 rows), so
// refining feels instant — no network round-trip per keystroke. The server
// still owns the base query (category / inventory via /api/shop/catalog);
// this narrows what is on screen. Pure functions, unit-tested.

import type { ShopProductFull } from "./types";

export type PriceBand = "under_50" | "50_100" | "100_plus";

export type BrowseFilters = {
  /** Free text: matched against title, subject, category, classification. */
  q?: string;
  /** Availability facet. */
  readyOnly?: boolean;
  /** Classification facet (product make/type). */
  classification?: string | null;
  /** Price facet, in whole-dollar bands. */
  priceBand?: PriceBand | null;
};

export const PRICE_BAND_LABELS: Record<PriceBand, string> = {
  under_50: "Under $50",
  "50_100": "$50 to $100",
  "100_plus": "$100 and up",
};

function inBand(cents: number, band: PriceBand): boolean {
  if (band === "under_50") return cents < 50_00;
  if (band === "50_100") return cents >= 50_00 && cents <= 100_00;
  return cents > 100_00;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Case/diacritic-insensitive haystack for one product. */
function haystack(p: ShopProductFull): string {
  return normalize(
    [
      p.title,
      p.subtitle ?? "",
      ...p.subjects.map((s) => s.subject_slug.replaceAll("-", " ")),
      p.category,
      p.classification.replaceAll("_", " "),
      p.store.public_name,
    ].join(" "),
  );
}

export function filterProducts(
  products: ShopProductFull[],
  f: BrowseFilters,
): ShopProductFull[] {
  const terms = f.q ? normalize(f.q).split(/\s+/).filter(Boolean) : [];
  return products.filter((p) => {
    if (f.readyOnly && p.inventory_status !== "ready_to_ship") return false;
    if (f.classification && p.classification !== f.classification) return false;
    if (f.priceBand && !inBand(p.price_cents, f.priceBand)) return false;
    if (terms.length > 0) {
      const hay = haystack(p);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

/** How many facet filters are active (search text not counted — it has its
 * own visible input). Drives the badge on the Filters button. */
export function activeFilterCount(f: BrowseFilters): number {
  return (f.readyOnly ? 1 : 0) + (f.classification ? 1 : 0) + (f.priceBand ? 1 : 0);
}

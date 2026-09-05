/**
 * The product as /api/admin/shop/products GET returns it and as the two
 * /admin/shop pages read it with the service role: the row with `*`, media
 * with `*`, subjects, and the sourcing row when there is one.
 *
 * Deliberately a local shape rather than lib/shop/types.ts: that file mirrors
 * the PUBLIC columns only, and sourcing must never be typed there.
 */

export type AdminMediaRow = {
  id?: string;
  media_url: string;
  alt_text: string;
  thumb_url?: string | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
};

export type AdminSubjectRow = { subject_type: string; subject_slug: string };

export type AdminSourcingRow = {
  product_id: string;
  supplier_id: string | null;
  supplier_sku: string | null;
  supplier_cost_cents: number | null;
  supplier_url: string | null;
  lead_time_days: number | null;
  stock_status: string | null;
  attribution_required: boolean;
  resale_rights_confirmed: boolean;
  packaging_notes: string | null;
  internal_notes: string | null;
  /** Joined by the edit page; the list does not need it. */
  supplier_name?: string | null;
};

export type AdminProductRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description_md: string | null;
  price_cents: number;
  currency?: string;
  category: string;
  classification: string;
  inventory_status: string;
  quantity_available: number | null;
  dispatch_min_days: number;
  dispatch_max_days: number;
  materials: string | null;
  dimensions: string | null;
  production_method: string | null;
  maker_name: string | null;
  country_of_origin: string | null;
  image_is_representative: boolean;
  status: string;
  /** Absent until 20260905_shop_simple.sql is applied. */
  blessing_available?: boolean | null;
  deleted_at?: string | null;
  view_count?: number | null;
  units_sold?: number | null;
  created_at?: string;
  updated_at?: string;
  media: AdminMediaRow[];
  subjects: AdminSubjectRow[];
};

/** The seven categories the CHECK constraint accepts, with their labels. */
export const PRODUCT_CATEGORIES: readonly [string, string][] = [
  ["christ", "Christ"],
  ["theotokos", "Theotokos"],
  ["saints", "Saints"],
  ["feasts", "Feasts"],
  ["prayer_corner", "Prayer corner"],
  ["crosses", "Crosses"],
  ["sets", "Sets and collections"],
];

export const INVENTORY_STATUSES: readonly [string, string][] = [
  ["ready_to_ship", "Ready to ship"],
  ["special_order", "Special order"],
  ["coming_soon", "Coming soon"],
  ["out_of_stock", "Out of stock"],
];

export const SUBJECT_TYPES = ["saint", "christ", "theotokos", "feast", "event", "council"] as const;

/** What the list shows in its Stock column. */
export function stockLabel(p: Pick<AdminProductRow, "quantity_available" | "inventory_status">): string {
  if (p.quantity_available == null) {
    const label = INVENTORY_STATUSES.find(([id]) => id === p.inventory_status)?.[1];
    return p.inventory_status === "ready_to_ship" ? "Unlimited" : (label ?? p.inventory_status);
  }
  return String(p.quantity_available);
}

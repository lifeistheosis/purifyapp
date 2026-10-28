// "Shop by saint" (round 11 of the 1.8 designs, the owner's pick B, locked
// 2026-10-27): the saints the shop's pieces carry, read from the catalogue
// itself, never typed in.
//
// A piece names its saint as a product subject of type "saint" whose slug is
// the saint's profile in the library (shop_product_subjects; the same link the
// product page follows to "Read the life" and, since 1.8, to his own words).
// So this row is the shop and the reading room meeting: each saint here is a
// saint the app has a page for, and the shop has a piece of.
//
// The name and the picture are the library's, from the saints in brief
// (data/calendar/profiled-saints.json, lib/saints/brief.ts), never the
// registry: that file is every saint's whole life and stays out of the shop's
// script. The briefs are already on every screen through the calendar.
//
// A saint the library has no profile of is left out rather than given a name
// made up from his slug. His pieces are still in the shop, under search and
// their kind.

import profiledSaints from "@/data/calendar/profiled-saints.json";
import type { SaintBrief } from "@/lib/saints/brief";
import { KNOWN_FORMS, nameCore } from "@/lib/saints/nameForms";
import type { ShopProductFull } from "@/lib/shop/types";

const BRIEFS = new Map((profiledSaints as SaintBrief[]).map((s) => [s.slug, s]));

/** A saint as the shop shows him. */
export type ShopSaint = {
  slug: string;
  /** The library's name: "Holy Apostle Peter". */
  name: string;
  /** The name as the row writes it, honorific off: "Apostle Peter". */
  shortName: string;
  /** His icon in the library, when it has one. */
  iconUrl: string | null;
};

/** A saint in the row, with how many of the shop's pieces carry him. */
export type ShopSaintRow = ShopSaint & { pieces: number };

/** Past this many letters a name runs to a third line under its picture. */
const LONG = 22;

/**
 * The name under a saint's picture: the library's name without its "St." or
 * "Holy" (lib/saints/nameForms.ts), "Apostle Peter". A name with a comma in
 * it carries a title ("Prophet, Forerunner, and Baptist John"), and a long one
 * will not fit two lines, so either gives way to the shortest form the texts
 * know the saint by ("John the Baptist", "Apostle Matthew") when there is a
 * shorter one. Never a bare first name, never a form made up here.
 */
export function shortSaintName(slug: string, name: string): string {
  const core = nameCore(name);
  if (!core.includes(",") && core.length <= LONG) return core;
  const shorter = (KNOWN_FORMS[slug] ?? [])
    .map(nameCore)
    .filter((form) => form.length < core.length)
    .sort((a, b) => a.length - b.length)[0];
  return shorter ?? core;
}

/** The library's saint for a slug, or null when it has no profile of him. */
export function shopSaint(slug: string): ShopSaint | null {
  const brief = BRIEFS.get(slug);
  if (!brief) return null;
  return {
    slug,
    name: brief.name,
    shortName: shortSaintName(slug, brief.name),
    iconUrl: brief.iconUrl ?? null,
  };
}

/** Whether a piece carries this saint. */
export function carriesSaint(product: ShopProductFull, slug: string): boolean {
  return (product.subjects ?? []).some((s) => s.subject_type === "saint" && s.subject_slug === slug);
}

/**
 * Every saint the catalogue's pieces carry, the saint with the most pieces
 * first, then by name. A sold-out piece does not count: a saint whose only
 * piece is gone is not offered. A piece that carries two saints counts for
 * each of them.
 */
export function shopSaints(products: readonly ShopProductFull[]): ShopSaintRow[] {
  const pieces = new Map<string, Set<string>>();
  for (const p of products) {
    if (p.inventory_status === "out_of_stock") continue;
    for (const s of p.subjects ?? []) {
      if (s.subject_type !== "saint") continue;
      const held = pieces.get(s.subject_slug) ?? new Set<string>();
      held.add(p.slug);
      pieces.set(s.subject_slug, held);
    }
  }
  const rows: ShopSaintRow[] = [];
  for (const [slug, held] of pieces) {
    const saint = shopSaint(slug);
    if (saint) rows.push({ ...saint, pieces: held.size });
  }
  return rows.sort((a, b) => b.pieces - a.pieces || a.shortName.localeCompare(b.shortName, "en"));
}

/** Where a saint in the row leads: the shop's pieces of him. */
export function saintShopHref(slug: string): string {
  return `/shop/category/all?saint=${encodeURIComponent(slug)}`;
}
